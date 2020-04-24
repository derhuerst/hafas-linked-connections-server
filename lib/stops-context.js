'use strict'

module.exports = {
    schema: 'http://schema.org/',
    name: 'http://xmlns.com/foaf/0.1/name',
    longitude: {
    	'@id': 'http://www.w3.org/2003/01/geo/wgs84_pos#long',
    	type: 'http://www.w3.org/2001/XMLSchema#float',
    },
    latitude: {
    	'@id': 'http://www.w3.org/2003/01/geo/wgs84_pos#lat',
    	type: 'http://www.w3.org/2001/XMLSchema#float',
    },
    // "alternative": "http://purl.org/dc/terms/alternative",
    // "avgStopTimes": "http://semweb.mmlab.be/ns/stoptimes#avgStopTimes",
}
