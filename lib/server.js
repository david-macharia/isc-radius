/*
 * Copyright (C) Internet Systems Consortium, Inc. ("ISC")
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 */

/**
 * @fileOverview RADIUS Server Framework
 * @author [Ray Bellis]{@link mailto:ray@isc.org}
 */

const dgram = require('dgram');
const RadiusPacket = require('./packet');
const Dictionary = require('./dictionary');
const Code = require('./code');

// generate default response packets (may be
// modified later by handlers)
function defaultResponse(type, req)
{
	let res_code;

	if (type === 'auth') {
		if (req.code === Code.ACCESS_REQUEST) {
			res_code = Code.ACCESS_REJECT;
		} else if (req.code === Code.SERVER_STATUS) {
			res_code = Code.ACCESS_ACCEPT;
		}
	} else if (type === 'acct') {
		if (req.code === Code.ACCOUNTING_REQUEST) {
			res_code = Code.ACCOUNTING_RESPONSE;
		}
	}

	// can't generate appropriate response
	if (!res_code) {
		return undefined;
	}

	// build default return packet (using request authenticator)
	const res = new RadiusPacket(res_code, req.identifier, req.authenticator);

	// RFC 2865 §2 - copy Proxy-State attributes from request to response
	const attrs = req.getAll('Proxy-State');
	for (let attr of attrs) {
		res.add(attr);
	}

	return res;
}

async function invokeHandlers(req, res, type, handlers)
{
	for (let handler of handlers) {
		if (handler[type]) {
			if (await handler[type](req, res)) {
				break;
			}
		}
	}
}

async function getResponse(type, req, handlers)
{
	const res = defaultResponse(type, req)
	if (!res) {
		// incorrect packet type - dump it on the floor
		console.log(`unexpected packet code ${req.code} received`);
		return;
	}

	try {
		// pass to handlers, unless it's a Status-Server packet
		if (req.code !== Code.STATUS_SERVER) {
			await invokeHandlers(req, res, type, handlers);
		}
		return res;
	} catch (e) {
		console.error(e);
	}
}

function startServer(type, port, state)
{
	const socket = dgram.createSocket('udp4');

	socket.on('error', (err) => {
		console.trace(`${type} socket error`);
		socket.close();
	});

	socket.on('listening', () => {
		const a = socket.address();
		console.log(`listening for ${type} on ${a.address}:${a.port}`);
	});

	socket.on('message', async (msg, rinfo) => {
		try {
			const client = rinfo.address;
			if (!state.clients.has(client)) {
				console.error(`${type} packet from unknown client ${client} ignored`);
				return;
			}

			const secret = state.clients.get(client);

			const req = RadiusPacket.fromWire(msg, secret);
			if (state.debug) {
				console.log(`-- ${type} request --`);
				console.log(req);
			}

			let res = await getResponse(type, req, state.handlers);
			if (res) {
				if (state.debug) {
					console.log(`-- ${type} response --`);
					console.log(res);
				}
				const buffer = res.toWire(secret);
				socket.send(buffer, rinfo.port, client);
			}

		} catch (e) {
			console.trace(e);
		}
	});

	socket.bind(port);
}

/**
 * @typedef {Function} Handler
 * @function
 * @async
 * @param {RadiusPacket} req - a received RADIUS Request packet
 * @param {RadiusPacket} res - a RADIUS Reply packet to be filled out
 * @return {boolean} - true to send the response without fall-through
 */

/**
 * A class that encapsulates the server portion of the baseline
 * RADIUS protocol network stack.
 */
class RadiusServer {

	/**
	 * @param {object} [conf] - the configuration object
	 * @param {number} [conf.auth=1812] the UDP port on which to listen for authentication requests
	 * @param {number} [conf.acct=1813] the UDP port on which to listen for accounting requests
	 */
	constructor({ auth = 1812, acct = 1813 } = {}) {

		// type checking
		if (!Number.isInteger(auth) || !Number.isInteger(acct)) {
			throw new TypeError('RadiusPacket ports must be integer values');
		}

		// range checking
		if (auth < 1 || acct < 1 || auth > 65535 || acct > 65535) {
			throw new RangeError('RadiusPacket ports must be between 1 and 65535');
		}

		// internal state for passing around
		const state = {
			clients: new Map(),
			handlers: [],
			debug: true
		};

		/**
		 * Adds a new client to the list of those accepted by the server.
		 *
		 * @param {string} client - the IP address of a valid client
		 * @param {string} secret - the shared secret for this client
		 * @return {RadiusServer} - the current server object
		 */
		this.addClient = function(client, secret) {

			// type checking
			if (typeof client !== 'string') {
				throw new TypeError('client parameter must be a string');
			}

			if (typeof secret !== 'string') {
				throw new TypeError('secret parameter must be a string');
			}

			state.clients.set(client, secret);
			return this;
		}

		/**
		 * @param {Object} handler - an object containing functions to be added to the request processing chain
		 * @param {Handler} [handler.auth] - the authentication handler
		 * @param {Handler} [handler.acct] - the accounting handler
		 * @return {RadiusServer} - the current server object
		 */
		this.use = function(handler) {

			// type checking
			if (typeof handler !== 'function' && typeof handler !== 'object') {
				return new TypeError('handler must be a function or object');
			}

			if (('auth' in handler) && typeof handler.auth !== 'function') {
				return new TypeError('handler.auth must be a function or undefined');
			}

			if (('acct' in handler) && typeof handler.acct !== 'function') {
				return new TypeError('handler.acct must be a function or undefined');
			}

			// remember the list
			state.handlers.push(handler);
			return this;
		}

		/**
		 * Creates the UDP sockets for the server and starts processing.
		 *
		 * @return {RadiusServer} - the current server object
		 */
		this.start = function() {
			startServer('auth', auth, state);
			startServer('acct', acct, state);
			return this;
		}

		/**
		 * Loads a RADIUS dictionary file into the server.
		 *
		 * @param {string} file - the file to load.  If a relative path is supplied but
		 * the file can't be found the server will look in lib/dictionary/ for the requested
		 * file.
		 * @return {RadiusServer} - the current server object
		 */
		this.loadDictionary = function(file) {
			Dictionary.load(file);
			return this;
		}
	}
};

module.exports = RadiusServer;
