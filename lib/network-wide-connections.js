'use strict'

const computeTiles = require('hafas-monitor-trips/lib/compute-tiles')
const {default: Queue} = require('p-queue')
const flatten = require('lodash/flatten')
const pick = require('lodash/pick')

const createFetchNetworkWideConnections = (hafas, bbox) => {
	const tiles = computeTiles(bbox)
	const queue = new Queue({concurrency: 4}) // todo: make customisable

	const fetchNetworkWideConnections = async (when) => {
		// https://github.com/derhuerst/hafas-monitor-trips/blob/6781933ddb8537ff126079697c9dadbb533f0fc8/index.js#L61-L63
		const results = await Promise.all(tiles.map((tile) => queue.add(() => {
			return hafas.radar(tile, {
				when,
				results: 1000,
				duration: 0,
				frames: 0,
				polylines: false
				// todo: `language`
			})
		})))
		const movements = flatten(results)

		return movements.map(m => {
			const stI = m.nextStopovers.findIndex(st => new Date(st.departure) >= when)
			if (stI < 0) return null // todo: write error-log
			const st = m.nextStopovers[stI]
			const nSt = m.nextStopovers[stI + 1]
			if (!nSt) return null // todo: use `hafas.trip()` as fallback

			// todo: DRY this with /connections/:tripId/:fromStop
			return {
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
				...pick(m, ['tripId', 'direction'])
			}
		})
		.filter(c => c !== null)
	}
	return fetchNetworkWideConnections
}

module.exports = createFetchNetworkWideConnections
