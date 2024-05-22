/*
 * Copyright (C) Internet Systems Consortium, Inc. ("ISC")
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 */

/**
 * @fileOverview RADIUS Packet representation
 * @author [Ray Bellis]{@link mailto:ray@isc.org}
 */

const Dictionary = require('./dictionary');
const AttributeList = require('./attrlist');
const Code = require('./code');

const crypto = require('crypto');
const inspect = Symbol.for('nodejs.util.inspect.custom');

function parseCode(code)
{
	if (code instanceof Code) {
		return code;
	} else {
		return Code.from(code);
	}
}

function parseId(id)
{
	if (typeof id !== 'number') {
		throw new TypeError('id must be a number');
	}

	if (!Number.isInteger(id) || id < 0 || id > 255) {
		throw new RangeError('id must be an 8-bit unsigned integer');
	}

	return id;
}

function parseAuthenticator(authenticator)
{
	if (! (authenticator instanceof Buffer)) {
		throw new TypeError('authenticator must be a Buffer');
	}

	if (authenticator.length != 16) {
		throw new RangeError('authenticator length incorrect');
	}

	return authenticator;
}

function parseAttributes(attributes) {
	if (attributes === undefined || attributes === null) {
		return new AttributeList();
	} else if (attributes instanceof AttributeList) {
		return attributes;
	} else if (typeof attributes[Symbol.iterator] === 'function') {
		const result = new AttributeList();
		for (let attr of attributes) {
			result.add(attr);
		}
		return result;
	} else {
		throw new TypeError('RadiusPacket attributes incorrect type');
	}
}

/**
 * A representation of a <a href="https://tools.ietf.org/html/rfc2865">RADIUS</a> packet.
 *
 * <p>Packets made with the constructor are intended to be immutable, generated
 * from parsing a wire-format buffer.<p>
 *
 * <p>Packets made with RadiusPacket.build are modifiable, i.e. for creating
 * Reply packets or outbound Request packets.</p>
 *
 * <p><strong>NB:</strong> The RADIUS protocol permits multiple sub-attributes
 * to be encoded within a single Vendor-Specific Attribute (VSA).  This code
 * will ignore any additional sub-attributes beyond the first.</p>
 *
 */
class RadiusPacket {

	constructor(code, id, authenticator, attrs) {

		// check and parse the parameters
		code = parseCode(code);
		id = parseId(id);
		authenticator = parseAuthenticator(authenticator);
		attrs = parseAttributes(attrs);

		/**
		 * @name RadiusPacket#attributes - the packet authenticator
		 * @type {Iterable.<Attribute>}
		 */
		// following properties are read only
		Object.defineProperties(this, {

			/**
			 * @name RadiusPacket#code - the packet code
			 * @type Code
			 */
			code: {
				get: () => code,
				set: (val) => code = parseCode(val),
				enumerable: true,
				configurable: true
			},

			/**
			 * @name RadiusPacket#identifier - the packet identifier
			 * @type number
			 */
			identifier: {
				value: id,
				enumerable: true
			},

			/**
			 * @name RadiusPacket#authenticator - the packet authenticator
			 * @type Buffer
			 */
			authenticator: {
				get: () => authenticator.slice(0),
				set: (val) => authenticator = parseAuthenticator(val),
				enumerable: true,
				configurable: true
			},

			/**
			 * @name RadiusPacket#authenticator - the packet's attributes
			 * @type AttributeList
			 */
			attributes: {
				value: attrs,
				enumerable: true
			}
		});
	}

    /**
     * Add an attribute to the packet.   Called either with a pre-constructed
     * {@link Attribute} as a single parameter, or with a key and value
     * to construct and place a new attribute in the packet.
     *
     * @param {(Attribute|number|string|Dictionary.Entry)} attribute - either
     *  an existing Attribute object, or a key for creating a new one
     * @param value - for creating new Attributes, the associated value
         * @function
     * @throws if the packet is read-only
     */
	add(id, value) {
		this.attributes.add(id, value);
		return this;
	}

	/**
	 * Check whether an attribute with the given ID exists.
	 *
	 * @param {(number|string)} id - the attribute ID or name
	 * @return {boolean}
	 */
	has(id) {
		const dict = Dictionary.get(id);
		for (let attr of this.attributes) {
			if (attr.dict === dict) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Get an attribute's value out of the packet.  If multiple attributes
	 * with the same ID exist, only the first is returned.
	 *
	 * @param {(number|string)} id - the attribute ID or name
	 * @return {Attribute}
	 */
	get(id) {
		const dict = Dictionary.get(id);
		for (let attr of this.attributes) {
			if (attr.dict === dict) {
				return attr;
			}
		}
		return undefined;
	}

	/**
	 * Get an array of the packet's attributes that match the given ID.
	 *
	 * @param {(number|string)} id - the attribute ID or name
	 * @return {Array<Attribute>}
	 */
	getAll(id) {
		const dict = Dictionary.get(id);
		const results = [];
		for (let attr of this.attributes) {
			if (attr.dict === dict) {
				results.push(attr);
			}
		}
		return results;
	}

	[inspect]() {
		let s = 'RadiusPacket {\n';
		['code', 'identifier'].forEach(field => {
			s += `  ${field}: ${this[field]}\n`;
		});
		s += '  attributes: {';
		let first = true;
		for (let attr of this.attributes) {
			if (first) {
				s += '\n';
				first = false;
			}
			s += '    ' + attr[inspect]() + '\n';
		}
		if (!first) {
			s += '  ';
		}
		s += '}\n}';

		return s;
	}

	// generate a random Authenticator
	static randomAuthenticator() {
		const r = Buffer.alloc(16);
		for (let i = 0; i < 16; ++i) {
			r[i] = Math.floor(256 * Math.random());
		}
		return r;
	}

	/**
	 * Generates a buffer containing the packet in wire format.
	 * @param {string} secret - the shared secret
	 * @param {boolean} response - whether the packet is a response to a request, or a new request
	 * @return {Uint8Array}
	 */
	toWire(secret, response = true) {

		let buffer = Buffer.alloc(4096);
		let offset = 0;

		// write code and identifier
		offset = buffer.writeUInt8(this.code.valueOf(), offset);
		offset = buffer.writeUInt8(this.identifier, offset);

		// write a dummy length field
		const length_offset = offset;
		offset = buffer.writeUInt16BE(0, offset);

		// copy the authenticator (which should be a copy of
		// the request authenticator if this is a response packet)
		const authen_offset = offset;
		this.authenticator.copy(buffer, authen_offset);
		offset += 16;

		// add the attributes
		offset = this.attributes.toWire(buffer, offset, secret, this.authenticator);

		// find total length and re-write it to the header
		const length = offset;
		buffer.writeUInt16BE(length, length_offset);

		// truncate the buffer
		buffer = buffer.slice(0, length);

		// write out the response authenticator
		if (response) {
			const hash = crypto.createHash('md5');
			hash.update(buffer);
			hash.update(secret);
			hash.digest().copy(buffer, authen_offset);
		}

		return buffer;
	}

	/**
	 * Constructs a read-only {@link RadiusPacket} from a raw input buffer
	 *
	 * @param {Uint8Array} buf - a buffer containing a packet in wire format
	 * @param {string} secret - the secret shared with the sender
	 * @return {RadiusPacket} - the resulting (read-only) packet
	 * @throws if the buffer cannot be parsed
	 */
	static fromWire(buf, secret) {

		if (buf.length < 20) {
			throw new Error('RADIUS buffer too short');
		}

		const length = buf.readUInt16BE(2);
		if (buf.length < length) {
			throw new Error('RADIUS buffer length mismatch');
		}

		const code = Code[buf[0]];
		const id = buf[1];
		const authenticator = buf.slice(4, 20);
		const attrs = AttributeList.fromWire(buf, 20, secret, authenticator);

		const pkt = new RadiusPacket(code, id, authenticator, attrs);

		// make some of the properties read-only
		Object.defineProperties(pkt, {
			code: { set: undefined },
			authenticator: { set: undefined },
		});

		return pkt;
	}
};

module.exports = RadiusPacket;
