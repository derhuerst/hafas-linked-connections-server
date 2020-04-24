'use strict'

const createClient = require('vbb-hafas')
const sqlite3 = require('sqlite3')
const sqliteStore = require('cached-hafas-client/stores/sqlite')
const withCaching = require('cached-hafas-client')
const createServer = require('.')

const BASE_URL = 'http://localhost:3000/'
const BBOX = {
	north: 52.53,
	west: 13.355,
	south: 52.5,
	east: 13.43
}

const hafas = createClient('hafas-linked-connections-server')

const db = new sqlite3.Database('example-cache.sqlite')
const client = withCaching(hafas, sqliteStore(db))

const server = createServer(BASE_URL, client, BBOX)
server.listen(3000)
