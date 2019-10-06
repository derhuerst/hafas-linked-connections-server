'use strict'

const {utcToZonedTime, format} = require('date-fns-tz')
const express = require('express')
const cors = require('cors')
const {inspect} = require('util')
const min = require('lodash/min')
const max = require('lodash/max')
const createFetchConnections = require('./lib/network-wide-connections')
const jsonLdContext = require('./lib/json-ld-context')

const depOf = c => new Date(c.departure) / 1000 | 0

const timezone = 'Europe/Berlin' // todo: make customisable
const isoWithTz = (t) => {
	return format(utcToZonedTime(new Date(t), timezone), `yyyy-MM-dd'T'HH:mm:ssXXX`)
}

const createServer = (baseUrl, hafas, bbox) => {
	baseUrl = baseUrl.replace(/\/$/g, '')
	const fetchConnections = createFetchConnections(hafas, bbox)

	const api = express()
	api.use(cors())

	const formatConnection = (c) => {
		return {
			// todo: url-encode
			'@id': `${baseUrl}/connections/${c.tripId}/${c.from.id}`,
			'@type': 'Connection',
			'departureStop': `${baseUrl}/stops/${c.from.id}`,
			'arrivalStop': `${baseUrl}/stops/${c.to.id}`,
			'departureTime': isoWithTz(c.departure),
			'arrivalTime': isoWithTz(c.arrival),
			'departureDelay': c.departureDelay,
			'arrivalDelay': c.arrivalDelay
			// todo: `gtfs:trip`, `gtfs:route`
		}
	}

	// todo:
	// - /connections/:trip-id/:from-stop
	// - /stops/:id
	// - /trip/:id
	api.get('/connections', (req, res, next) => {
		if (!('t' in req.query)) {
			const now = (Date.now() / 1000 | 0)
			res.redirect('/connections?t=' + now)
			return;
		}

		const when = parseInt(req.query.t) * 1000
		// todo: caching headers
		fetchConnections(when)
		.then((connections) => {
			if (connections.length === 0) {
				// todo: what to do in this case?
				res.status(404)
				res.json({})
			}

			const deps = connections.filter(c => !!c.departure).map(depOf)
			const tNext = max(deps)
			const tPrevious = min(deps) - 10 * 60 // todo: find sth better

			res.json({
				'@context': jsonLdContext,
				'@id': `${baseUrl}/connections?t=${req.query.t}`,
				'@type': 'hydra:PartialCollectionView',
				'hydra:next': `${baseUrl}/connections?t=${tNext}`,
				'hydra:previous': `${baseUrl}/connections?t=${tPrevious}`,
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
				'@graph': connections.map(formatConnection)
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
