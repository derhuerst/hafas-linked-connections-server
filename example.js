'use strict'

const createClient = require('vbb-hafas')
const createServer = require('.')

const BASE_URL = 'http://localhost:3000/'
const BBOX = {
	north: 52.53,
	west: 13.355,
	south: 52.5,
	east: 13.43
}

const client = createClient('hafas-linked-connections-server')

const server = createServer(BASE_URL, client, BBOX)
server.listen(3000)
