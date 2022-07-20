'use strict'

const test = require('tape')
const {createServer, request} = require('http')
const {strictEqual} = require('assert')
const {promisify} = require('util')
const createLCServer = require('.')

const PORT = 30000
const BASE_URL = `http://localhost:${PORT}`
const BBOX = {
	north: 52.53,
	west: 13.355,
	south: 52.5,
	east: 13.43
}

const CONNECTION_CONTEXT = {
	xsd: 'http://www.w3.org/2001/XMLSchema#',
	lc: 'http://semweb.mmlab.be/ns/linkedconnections#',
	hydra: 'http://www.w3.org/ns/hydra/core#',
	gtfs: 'http://vocab.gtfs.org/terms#',
	Connection: 'lc:Connection',
	CancelledConnection: 'lc:CancelledConnection',
	arrivalTime: {'@id': 'lc:arrivalTime', '@type': 'xsd:dateTime'},
	departureTime: {'@id': 'lc:departureTime', '@type': 'xsd:dateTime'},
	arrivalStop: {'@type': '@id', '@id': 'lc:arrivalStop'},
	departureStop: {'@type': '@id', '@id': 'lc:departureStop'},
	departureDelay: {'@id': 'lc:departureDelay', '@type': 'xsd:integer'},
	arrivalDelay: {'@id': 'lc:arrivalDelay', '@type': 'xsd:integer'},
	trip: {'@id': 'gtfs:Trip', '@type': '@id'},
}

const runWithMockHafas = async (mockedHafasMethods, bbox) => {
	const app = createLCServer(BASE_URL, mockedHafasMethods, bbox)
	const server = createServer(app)
	const stop = promisify(server.close.bind(server))
	await new Promise((resolve, reject) => {
		server.listen(PORT, (err) => {
			if (err) reject(err)
			else resolve()
		})
	})
	return stop
}

const fetchJSON = async (url) => {
	let body = null
	try {
		const res = await new Promise((resolve, reject) => {
			const req = request(url, {
				headers: {
					'accept': 'application/ld+json; charset=utf-8',
				},
			}, resolve)
			req.once('error', reject)
			req.end()
		})

		body = await new Promise((resolve, reject) => {
			let body = ''
			res.once('error', reject)
			res.on('data', chunk => body += chunk)
			res.once('end', () => resolve(body))
		})

		strictEqual(
			res.headers['content-type'],
			'application/ld+json; charset=utf-8',
			url + ': invalid content-type header',
		)

		return JSON.parse(body)
	} catch (err) {
		err.url = url
		err.body = body
		console.error(err)
		throw err
	}
}

const TRIP_ID = 'trip$1'
const B = {
	id: 'stop$B',
	name: 'B',
	location: {type: 'location', latitude: 3.3, longitude: 4.4},
}
const SECOND_STOPOVER_AT_B = {
	stop: B,
	arrival: '2011-11-11T17:17:33+01:00',
	arrivalDelay: 33,
	plannedArrival: '2011-11-11T17:17:00+01:00',
	arrivalPlatform: '10',
	departure: '2011-11-11T19:18:10+01:00',
	departureDelay: 60 * 60 + 10,
	plannedDeparture: '2011-11-11T18:18:00+01:00',
	departurePlatform: '1',
}
const TRIP1 = {
	id: TRIP_ID,
	directions: 'Foo Bar',
	stopovers: [{
		stop: {
			id: 'stop$A',
			name: 'A',
			location: {type: 'location', latitude: 1.1, longitude: 2.2},
		},
		arrival: '2011-11-11T11:13:00+01:00',
		arrivalDelay: 2 * 60,
		plannedArrival: '2011-11-11T11:11:00+01:00',
		arrivalPlatform: '2a',
		departure: '2011-11-11T12:11:30+01:00',
		departureDelay: -30,
		plannedDeparture: '2011-11-11T12:12:00+01:00',
		departurePlatform: null,
	}, {
		stop: B,
		arrival: '2011-11-11T13:13:00+01:00',
		arrivalDelay: 17,
		plannedArrival: '2011-11-11T13:13:00+01:00',
		arrivalPlatform: null,
		departure: '2011-11-11T15:14:10+01:00',
		departureDelay: 60 * 60 + 10,
		plannedDeparture: '2011-11-11T14:14:00+01:00',
		departurePlatform: null,
	}, {
		stop: {
			id: 'stop$C',
			name: 'Cee',
			location: {type: 'location', latitude: 5.5, longitude: 6.6},
		},
		arrival: '2011-11-11T15:15:00+01:00',
		arrivalDelay: 0,
		plannedArrival: '2011-11-11T15:15:00+01:00',
		arrivalPlatform: null,
		departure: '2011-11-11T16:16:00+01:00',
		departureDelay: 0,
		plannedDeparture: '2011-11-11T16:16:00+01:00',
		departurePlatform: null,
	}, SECOND_STOPOVER_AT_B, {
		stop: {
			id: 'stop$D',
			name: 'D station',
			location: {type: 'location', latitude: 5.5, longitude: 6.6},
		},
		arrival: '2011-11-11T20:20:20+01:00',
		arrivalDelay: 20,
		plannedArrival: '2011-11-11T20:20:00+01:00',
		arrivalPlatform: '2-0',
		departure: null,
		departureDelay: null,
		plannedDeparture: null,
		departurePlatform: null,
	}],
}

test('/connections/:tripId/:fromStop/:plannedDeparture', async (t) => {
	const mockedTrip = async (tripId) => {
		t.equal(tripId, TRIP_ID, 'hafas.trip() called with invalid trip ID')
		return TRIP1
	}
	const stop = await runWithMockHafas({
		trip: mockedTrip,
	}, BBOX)

	const conUrl = [
		BASE_URL,
		'connections',
		TRIP_ID,
		B.id,
		Date.parse(SECOND_STOPOVER_AT_B.plannedDeparture),
	].join('/')

	const con = await fetchJSON(conUrl)
	t.deepEqual(con, {
		'@context': CONNECTION_CONTEXT,
		'@id': conUrl,
		'@type': 'Connection',
		departureStop: BASE_URL + '/stops/stop$B',
		arrivalStop: BASE_URL + '/stops/stop$D',
		departureTime: '2011-11-11T19:18:10+01:00',
		arrivalTime: '2011-11-11T20:20:20+01:00',
		departureDelay: 60 * 60 + 10,
		arrivalDelay: 20,
		trip: BASE_URL + '/trips/trip$1',
	}, 'invalid connection')

	await stop()
})
