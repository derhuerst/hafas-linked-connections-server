# hafas-linked-connections-server

**Create a [Linked Connections](https://linkedconnections.org) endpoint from a [HAFAS client](https://github.com/public-transport/hafas-client).** Very hacky & slow.

[![npm version](https://img.shields.io/npm/v/hafas-linked-connections-server.svg)](https://www.npmjs.com/package/hafas-linked-connections-server)
[![build status](https://api.travis-ci.org/derhuerst/hafas-linked-connections-server.svg?branch=master)](https://travis-ci.org/derhuerst/hafas-linked-connections-server)
![ISC-licensed](https://img.shields.io/github/license/derhuerst/hafas-linked-connections-server.svg)
[![support me via GitHub Sponsors](https://img.shields.io/badge/support%20me-donate-fa7664.svg)](https://github.com/sponsors/derhuerst)
[![chat with me on Twitter](https://img.shields.io/badge/chat%20with%20me-on%20Twitter-1da1f2.svg)](https://twitter.com/derhuerst)


## Installation

```shell
npm install hafas-linked-connections-server
```


## Usage

```js
'use strict'

const createClient = require('vbb-hafas')
const createServer = require('hafas-linked-connections-server.')

const baseUrl = 'https://my-linked-connections-endpoint/'
const bbox = { // Berlin
	north: 52.53,
	west: 13.355,
	south: 52.5,
	east: 13.43
}

const client = createClient('my awesome program')
const server = createServer(baseUrl, client, bbox)
server.listen(3000)
```

*Note:* Because linked open data tools tend to re-fetch resources often, I strongly recommend to use `hafas-linked-connections-server` with [`cached-hafas-client`](https://github.com/public-transport/cached-hafas-client). [`example.js`](example.js) shows how to do it.


## Contributing

If you have a question or need support using `hafas-linked-connections-server`, please double-check your code and setup first. If you think you have found a bug or want to propose a feature, refer to [the issues page](https://github.com/derhuerst/hafas-linked-connections-server/issues).
