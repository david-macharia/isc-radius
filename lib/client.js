/*
 * Copyright (C) Internet Systems Consortium, Inc. ("ISC")
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 */

/**
 * @fileOverview RADIUS Server Framework (Client)
 * @author [Ray Bellis]{@link mailto:ray@isc.org}
 */

const RadiusPacket = require('./packet');
const Code = require('./code');

const dgram = require('dgram');
const crypto = require('crypto');

async function _request(client_state, code, attrs)
{
	// canonicalise the code value
	code = Code.from(code);

	// state to be remembered between attempts
	const state = [];
	let timer = undefined;

	// retrieves (or creates) the state for a retry
	function getState(n) {
		if (state[n] === undefined) {

			// round-robin server selection
			const server = client_state.servers[n];
			const address = server.server;
			const port = (code === Code.ACCOUNTING_REQUEST) ? server.acct : server.auth;
			const secret = server.secret;

			// server-specific packet content
			const identifier = (server.id++ & 0xff);
			const authenticator = RadiusPacket.randomAuthenticator();
			const req = new RadiusPacket(code, identifier, authenticator, attrs);
			const buffer = req.toWire(secret, response = false);

			state[n] = { code, identifier, authenticator, address, port, secret, buffer };
		}
		return state[n];
	}

	return new Promise((resolve, reject) => {

		const socket = dgram.createSocket('udp4');
		let current = {};

		socket.on('message', function(msg, rinfo) {

			// check it came from the original target
			if (rinfo.address !== current.address ||
			    rinfo.port !== current.port)
			{
				console.log(`ignoring packet from ${rinfo.address}:${rinfo.port}`);
				return;
			}

			// parse the response, ignoring any unparseable packets
			let res = undefined;
			try {
				res = RadiusPacket.fromWire(msg);
			} catch (e) {
				return;
			}

			// ignore packets whose identifier doesn't match
			if (res.identifier !== current.identifier) {
				return;
			}

			// validate packet signature (dropping invalid packets)
			const hash = crypto.createHash('md5');
			hash.update(Buffer.from(msg.buffer, 0, 4));
			hash.update(current.authenticator);
			hash.update(Buffer.from(msg.buffer, 20));
			hash.update(current.secret);

            const authen = Buffer.from(msg.buffer, 4, 16);
            const digest = hash.digest();
            if (Buffer.compare(authen, digest) !== 0) {
                console.log(`bad authenticator on packet from ${rinfo.address}:${rinfo.port}`);
                return;
            }

			// examine the response code and determine the action to take
			const req_code = code.toString();
			const res_code = res.code.toString();

			let action = undefined;
			if (req_code === 'Access-Request') {
				if (res_code === 'Access-Accept') {
					action = resolve;
				} else if (res_code === 'Access-Reject') {
					action = reject;
				}
			} else if (req_code === 'Accounting-Request') {
				if (res_code === 'Accounting-Response') {
					action = resolve;
				}
			}

			if (action) {
				clearTimeout(timer);
				socket.close();
				action(res);
			}
		});

		socket.on('error', (e) => {
			socket.close();
			reject(e);
		});

		socket.on('close', () => {
			// does nothing (yet)
		});

		let attempt = 0;
		const slen = client_state.servers.length;
		const max = client_state.retry * slen;
		const timeout = client_state.delay * 1000;

		// start sending packets
		(function send() {
			const n = attempt % slen;
			current = getState(n);

			timer = setTimeout(() => {
				timer = undefined;
				if (++attempt < max) {
					send();
				} else {
					socket.close();
					reject(new Error('timeout'));
				}
			}, timeout);

			socket.send(current.buffer, 0, current.buffer.length, current.port, current.address);
		})();

	});
}

/**
 * A class that encapsulates a client for the RADIUS protocol
 */
class RadiusClient {

	/**
 	 * @param {object} config
 	 * @param {string} config.host - the server to connect to
 	 * @param {string} config.secret - the shared secret
 	 * @param {number} [config.auth = 1812] - the UDP port for authorization
 	 * @param {number} [config.acct = 1813] - the UDP port for accounting
 	 * @param {number} [config.retry = 3] - how many attempts to make per server
 	 * @param {number} [config.delay = 1] - the delay between attempts
 	 */
	constructor({ host, secret, auth = 1812, acct = 1813, retry = 3, delay = 1 }) {

		// type and range checks
		if (typeof retry !== 'number') {
			throw new TypeError('RadiusClient retry must be a number');
		}

		if (typeof delay !== 'number') {
			throw new TypeError('RadiusClient delay must be a number');
		}

		if (!Number.isInteger(retry) || retry < 1) {
			throw new RangeError('RadiusClient retry must be a positive integer');
		}

		if (delay <= 0) {
			throw new RangeError('RadiusClient delay must be a positive number');
		}

		// client's persistent state
		const state = {
			servers: [],
			retry, delay
		};

		/**
		 * Adds a new server to the list of those that will be used by the client
		 *
		 * @name RadiusClient#addServer
		 * @function
		 * @param {string} server - the server to connect to
		 * @param {string} secret - the shared secret
		 * @param {number} [auth = 1812] - the UDP port for authorization
		 * @param {number} [acct = 1813] - the UDP port for accounting
		 * @return {RadiusClient} - the current client object
		 * @throws if the parameters are invalid
		 */
		function addServer(server, secret, auth = 1812, acct = 1813) {

			// type and range check for parameters
			if (typeof server !== 'string') {
				throw new TypeError('RadiusClient server must be a string');
			}

			if (typeof secret !== 'string') {
				throw new TypeError('RadiusClient secret must be a string');
			}

			if (typeof acct !== 'number') {
				throw new TypeError('RadiusClient acct port must be a number');
			}

			if (typeof auth !== 'number') {
				throw new TypeError('RadiusClient auth port must be a number');
			}

			if (!Number.isInteger(auth) || auth < 1 || auth > 65535) {
				throw new RangeError('RadiusClient auth port must be an integer between 1 and 65535');
			}

			if (!Number.isInteger(acct) || acct < 1 || acct > 65535) {
				throw new RangeError('RadiusClient acct port must be an integer between 1 and 65535');
			}

			// generate initial ID for queries sent to this client
			const id = Math.floor(Math.random() * 256);

			// push the (required) first configured server
			state.servers.push({ server, secret, auth, acct, id });
		}

		/**
		 * Creates a RADIUS request with the specified code and list of attributes,
		 * sending it to the configured servers, and returning a Promise that will
		 * be "resolved" for successful Access-Request or Accounting-Request packets
		 * or "rejected" for unsuccessful Access-Requests.
		 *
		 * @name RadiusClient#request
		 * @function
		 * @param {(Code|number|string)} code - the request type
		 * @param {(AttributeList|Array<Attribute>)} attrs - the attributes to send
		 */
		function request(code, attrs) {
			return _request(state, code, attrs);
		}

		/* add the locally defined instance methods / properties */
		Object.defineProperties(this, {
			addServer: { value: addServer },
			request: { value: request }
		});

		/* Add the server that was specified in the constructor call */
		this.addServer(host, secret, auth, acct);

		/* create the outbound socket */
	}
}

module.exports = RadiusClient;
