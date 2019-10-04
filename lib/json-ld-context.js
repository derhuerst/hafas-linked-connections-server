'use strict'

module.exports = {
	xsd: 'http://www.w3.org/2001/XMLSchema#',
	lc: 'http://semweb.mmlab.be/ns/linkedconnections#',
	hydra: 'http://www.w3.org/ns/hydra/core#',
	// gtfs: 'http://vocab.gtfs.org/terms#',
	Connection: 'lc:Connection',
	CancelledConnection: 'lc:CancelledConnection',
	arrivalTime: {
		'@id': 'lc:arrivalTime',
		'@type': 'xsd:dateTime'
	},
	departureTime: {
		'@id': 'lc:departureTime',
		'@type': 'xsd:dateTime'
	},
	arrivalStop: {
		'@type': '@id',
		'@id': 'lc:arrivalStop'
	},
	departureStop: {
		'@type': '@id',
		'@id': 'lc:departureStop'
	},
	departureDelay: {
		'@id': 'lc:departureDelay',
		'@type': 'xsd:integer'
	},
	arrivalDelay: {
		'@id': 'lc:arrivalDelay',
		'@type': 'xsd:integer'
	},
	// direction: {
	// 	@id: 'gtfs:headsign',
	// 	@type: 'xsd:string'
	// },
	// 'gtfs:trip': {'@type': '@id'},
	// 'gtfs:route': {'@type': '@id'},
	// 'gtfs:pickupType': {'@type': '@id'},
	// 'gtfs:dropOffType': {'@type': '@id'},
	// 'gtfs:Regular': {'@type': '@id'},
	// 'gtfs:NotAvailable': {'@type': '@id'},
	'hydra:next': {'@type': '@id'},
	'hydra:previous': {'@type': '@id'},
	'hydra:property': {'@type': '@id'},
	'hydra:variableRepresentation': {'@type': '@id'}
}
