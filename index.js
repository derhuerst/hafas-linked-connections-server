'use strict'

const {formatInTimeZone} = require('date-fns-tz')
const express = require('express')
const cors = require('cors')
const compression = require('compression')
const {inspect} = require('util')
const sortBy = require('lodash/sortBy')
const min = require('lodash/min')
const max = require('lodash/max')
const findStops = require('hafas-find-stations')
const createFetchConnections = require('./lib/network-wide-connections')
const connectionsContext = require('./lib/connections-context')
const stopContext = require('./lib/stop-context')
const hydraTemplate = require('./lib/hydra-template')

const depOf = c => new Date(c.departure || c.plannedDeparture) / 1000 | 0

const timezone = 'Europe/Berlin' // todo: make customisable
const isoWithTz = (t) => {
	return formatInTimeZone(new Date(t), timezone, `yyyy-MM-dd'T'HH:mm:ssXXX`)
}

const createServer = (baseUrl, hafas, bbox) => {
	baseUrl = baseUrl.replace(/\/$/g, '')
	const fetchConnections = createFetchConnections(hafas, bbox)

	const api = express()
	api.set('etag', 'strong')
	api.use(cors())
	api.use(compression())

	const stopUrl = stop => `${baseUrl}/stops/${encodeURIComponent(stop.id)}`

	const formatStop = (stop) => ({
		// todo: use some kind of canonical URL of the stop here
		'@id': stopUrl(stop),
		// todo: `dct:spatial`
		latitude: stop.location.latitude + '',
		longitude: stop.location.longitude + '',
		name: stop.name
	})

	api.get('/stops/:id', (req, res, next) => {
		const {id} = req.params

		hafas.stop(id)
		.then((stop) => {
			res.type('application/ld+json')
			res.json({
				'@context': stopContext,
				...formatStop(stop),
			})
		})
		.catch(next)
	})

	api.get('/stops', (req, res, next) => {
		const p = req.query
		const _bbox = {
			north: p.north ? parseFloat(p.north) : bbox.north,
			west: p.west ? parseFloat(p.west) : bbox.west,
			south: p.south ? parseFloat(p.south) : bbox.south,
			east: p.east ? parseFloat(p.east) : bbox.east
		}

		findStops(hafas, bbox, () => {})
		.then((stops) => {
			res.type('application/ld+json')
			res.json({
				'@context': stopContext,
				'@id': baseUrl + req.url,
				'@type': 'hydra:PartialCollectionView',
				// todo: `hydra:search`
				'@graph': sortBy(stops, ['id']).map(formatStop)
			})
		})
		.catch(next)
	})

	const formatConnection = (c) => {
		const normalizedDep = c.plannedDeparture
			? +Date.parse(c.plannedDeparture) // todo: tz
			: '-' // todo: fall back to stopovers[] index?
		return {
			'@id': [
				baseUrl,
				'connections', encodeURIComponent(c.tripId),
				encodeURIComponent(c.from.id),
				normalizedDep,
			].join('/'),
			'@type': 'Connection',
			'departureStop': stopUrl(c.from),
			'arrivalStop': stopUrl(c.to),
			'departureTime': isoWithTz(c.departure),
			'arrivalTime': isoWithTz(c.arrival),
			'departureDelay': c.departureDelay,
			'arrivalDelay': c.arrivalDelay,
			'trip': `${baseUrl}/trips/${encodeURIComponent(c.tripId)}`,
			// todo: `gtfs:trip`, `gtfs:route`
		}
	}

	// todo:
	// - /stops/:id
	// - /trip/:id
	api.get('/connections', (req, res, next) => {
		if (!('t' in req.query)) {
			res.redirect('/connections?t=' + encodeURIComponent(new Date().toISOString()))
			return;
		}
		const rawWhen = Date.parse(req.query.t)
		if (Number.isNaN(rawWhen)) {
			const err = new Error('invalid t')
			err.statusCode = 400
			return next(err)
		}
		const when = new Date(Math.round(rawWhen / 1000) * 1000)
		if (when.toISOString() !== req.query.t) {
			const whenIso = new Date(when).toISOString()
			res.redirect(301, '/connections?t=' + encodeURIComponent(whenIso))
			return;
		}

		// todo: caching headers (e.g. from cached-hafas-client)
		fetchConnections(when.getTime())
		.then((connections) => {
			if (connections.length === 0) {
				// todo: what to do in this case?
				res.status(404)
				res.json({})
			}

			const deps = connections.map(depOf).filter(t => !Number.isNaN(t))
			const tNext = max(deps)
			const tPrevious = min(deps) - 10 * 60 // todo: find sth better

			const self = `${baseUrl}/connections`
			res.type('application/ld+json')
			res.json({
				'@context': connectionsContext,
				'@id': `${self}?t=${encodeURIComponent(req.query.t)}`,
				'@type': 'hydra:PartialCollectionView',
				'hydra:next': `${self}?t=${new Date(tNext * 1000).toISOString()}`,
				'hydra:previous': `${self}?t=${new Date(tPrevious * 1000).toISOString()}`,
				'hydra:search': hydraTemplate(`${self}{?t}`, [
					['t', 'lc:departureTimeQuery', true],
				]),
				'@graph': sortBy(connections, depOf).map(formatConnection)
			})
		})
		.catch(next)
	})

	// todo: some trips visit a stop more than once, add planned departure time?
	api.get('/connections/:tripId/:fromStop/:plannedDeparture', (req, res, next) => {
		const {tripId, fromStop} = req.params
		const plannedDep = parseInt(req.params.plannedDeparture)

		hafas.trip(tripId, 'foo')
		.then((trip) => {
			const stI = trip.stopovers.findIndex(st => (
				(
					st.stop.id === fromStop ||
					(st.stop.station && st.stop.station.id === fromStop)
				) &&
				(st.plannedDeparture && Date.parse(st.plannedDeparture) === plannedDep)
			))
			if (stI < 0) {
				res.status(404)
				res.json({})
				return // todo: write error-log
			}
			const st = trip.stopovers[stI]
			const nSt = trip.stopovers[stI + 1]
			if (!nSt) {
				res.status(404)
				res.json({})
				return // todo: write error-log
			}

			const connection = formatConnection({
				tripId: trip.id,
				direction: trip.direction,
				from: st.stop,
				departure: st.departure,
				departureDelay: st.departureDelay,
				plannedDeparture: st.plannedDeparture,
				departurePlatform: st.departurePlatform,
				to: nSt.stop,
				arrival: nSt.arrival,
				arrivalDelay: nSt.arrivalDelay,
				plannedArrival: st.plannedArrival,
				arrivalPlatform: nSt.arrivalPlatform,
			})

			res.type('application/ld+json')
			res.json({
				'@context': connectionsContext,
				...connection,
			})
		})
		.catch(next)
	})

	api.use((err, req, res, next) => {
		console.error(err)
		if (!res.headersSent) {
			res.status(err.statusCode || 500)
			res.json({
				ok: false,
				message: err.message,
				stack: err.stack,
				raw: inspect(err)
			})
		}
		next()
	})

	return api
}

module.exports = createServer
