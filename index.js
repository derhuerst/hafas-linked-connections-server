'use strict'

const {utcToZonedTime, format} = require('date-fns-tz')
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
const stopsContext = require('./lib/stops-context')

const depOf = c => new Date(c.departure || c.plannedDeparture) / 1000 | 0

const timezone = 'Europe/Berlin' // todo: make customisable
const isoWithTz = (t) => {
	return format(utcToZonedTime(new Date(t), timezone), `yyyy-MM-dd'T'HH:mm:ssXXX`)
}

const createServer = (baseUrl, hafas, bbox) => {
	baseUrl = baseUrl.replace(/\/$/g, '')
	const fetchConnections = createFetchConnections(hafas, bbox)

	const api = express()
	api.set('etag', 'strong')
	api.use(cors())
	api.use(compression())

	const stopUrl = stop => `${baseUrl}/stops/${stop.id}`

	const formatStop = (stop) => ({
		'@id': stopUrl(stop),
		// todo: `dct:spatial`
		latitude: stop.location.latitude + '',
		longitude: stop.location.longitude + '',
		name: stop.name
	})

	api.get('/stops', (req, res, next) => {
		const p = req.params
		const _bbox = {
			north: p.north ? parseFloat(p.north) : bbox.north,
			west: p.west ? parseFloat(p.west) : bbox.west,
			south: p.south ? parseFloat(p.south) : bbox.south,
			east: p.east ? parseFloat(p.east) : bbox.east
		}
		console.error('bbox', bbox)

		// todo: put caching
		findStops(hafas, bbox, () => {})
		.then((stops) => {
			res.json({
				'@context': stopsContext,
				'@id': baseUrl + req.url,
				'@type': 'hydra:PartialCollectionView',
				// todo: `hydra:search`
				'@graph': sortBy(stops, ['id']).map(formatStop)
			})
		})
		.catch(next)
	})

	const formatConnection = (c) => {
		return {
			// todo: url-encode
			'@id': `${baseUrl}/connections/${c.tripId}/${c.from.id}`,
			'@type': 'Connection',
			'departureStop': stopUrl(c.from),
			'arrivalStop': stopUrl(c.to),
			'departureTime': isoWithTz(c.departure),
			'arrivalTime': isoWithTz(c.arrival),
			'departureDelay': c.departureDelay,
			'arrivalDelay': c.arrivalDelay,
			'trip': `${baseUrl}/trips/${c.tripId}`,
			// todo: `gtfs:trip`, `gtfs:route`
		}
	}

	// todo:
	// - /connections/:trip-id/:from-stop
	// - /stops/:id
	// - /trip/:id
	api.get('/connections', (req, res, next) => {
		if (!('t' in req.query)) {
			res.redirect('/connections?t=' + new Date().toISOString())
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
			res.redirect(301, '/connections?t=' + whenIso)
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

			res.json({
				'@context': connectionsContext,
				'@id': `${baseUrl}/connections?t=${req.query.t}`,
				'@type': 'hydra:PartialCollectionView',
				'hydra:next': `${baseUrl}/connections?t=${new Date(tNext * 1000).toISOString()}`,
				'hydra:previous': `${baseUrl}/connections?t=${new Date(tPrevious * 1000).toISOString()}`,
				'hydra:search': {
					'@type': 'hydra:IriTemplate',
					'hydra:template': `${baseUrl}/connections{?t}`,
					'hydra:variableRepresentation': 'hydra:BasicRepresentation',
					'hydra:mapping': {
						'@type': 'IriTemplateMapping',
						'hydra:variable': 't',
						'hydra:required': true,
						'hydra:property': 'lc:departureTimeQuery'
					}
				},
				'@graph': sortBy(connections, depOf).map(formatConnection)
			})
		})
		.catch(next)
	})

	api.use((err, req, res, next) => {
		console.error(err)
		if (!res.headersSent) {
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
