'use strict'

const createHafas = require('hafas-client')
const vbbProfile = require('hafas-client/p/vbb')
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

const transformReq = (ctx, req) => {
	req.headers['user-agent'] = 'App/4.5.1 (iPhone; iOS 14.8.1; Scale/3.00)'
	return req
}
const hafas = createHafas({
	...vbbProfile,
	transformReq,
}, 'overwritten-anyways')

const db = new sqlite3.Database('example-cache.sqlite')
const client = withCaching(hafas, sqliteStore(db))

const server = createServer(BASE_URL, client, BBOX)
server.listen(3000)
