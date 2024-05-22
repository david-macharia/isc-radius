/*
 * Copyright (C) Internet Systems Consortium, Inc. ("ISC")
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 */

/**
 * @fileOverview RADIUS Attribute representation
 * @author <a href="mailto:ray@isc.org">Ray Bellis</a>
 */

const Dictionary = require('./dictionary');
const inspect = Symbol.for('nodejs.util.inspect.custom');

function md5(secret, chunk)
{
		const hash = require('crypto').createHash('md5');
		hash.update(secret);
		hash.update(chunk);
		return hash.digest();
}

function xorBlock(i, d, s, b)
{
	for (let j = 0; j < 16; ++j) {
		d[i + j] = s[i + j] ^ b[j];
	}
}

function stripTrailingNULs(b)
{
	let n = b.length;
	while (n && b[n - 1] === 0) {
		n--;
	}
	return b.slice(0, n);
}

function encodeMD5(password, secret, authenticator)
{
	const n = (password.length + 15) & 0xf0;
	const p = Buffer.alloc(n);
	const c = Buffer.alloc(n);
	password.copy(p);

	for (let i = 0; i < n; i += 16) {
		const chunk = (i === 0) ? authenticator : c.slice(i - 16, i);
		const b = md5(secret, chunk);
		xorBlock(i, c, p, b);
	}

	return c;
}

function decodeMD5(cipher, secret, authenticator)
{
	const n = cipher.length;
	if (n % 16 !== 0 || n > 128) {
		throw new Error('illegal encrypted password length');
	}

	const p = Buffer.alloc(n);
	const c = Buffer.from(cipher);

	for (let i = 0; i < n; i += 16) {
		const chunk = (i === 0) ? authenticator : c.slice(i - 16, i);
		const b = md5(secret, chunk);
		xorBlock(i, p, c, b);
	}

	return stripTrailingNULs(p).toString();
}

/**
 * The representation of a RADIUS attribute.   Once created an Attribute
 * is immutable.
 */
class Attribute {

	/**
	 * @param {(number|string|DictionaryEntry)} id - the attribute identifier
	 * @param value - the attribute's value, as a buffer or in native format
	 */
	constructor(id, value) {

		/**
		 * The descriptor for this type of Attribute.
		 *
		 * @name Attribute#dict
		 * @type {DictionaryEntry}
		 */
		if (typeof id === 'string' || typeof id === 'number') {
			this.dict = Dictionary.get(id);
		} else if (id instanceof Dictionary.Entry) {
			this.dict = id;
		} else {
			throw new TypeError('attribute ID must be a string, number or dictionary entry');
		}

		// convert the value into a wrapped value
		const type = this.dict.realType;
		if (value instanceof Buffer) {
			this.avalue = type.fromBuffer(value);
		} else {
			this.avalue = type.fromValue(value);
		}

		// prevent modification
		Object.freeze(this);
	}

	/**
	 * @type {string}
	 * @desc The name of this attribute
	 */
	get name() {
		return this.dict.name;
	}

	/**
	 * @desc The value of the attribute in its native form
	 */
	get value() {
		return this.avalue.value;
	}

	/**
	 * @return {*} The value of this attribute in its native form.
	 */
	valueOf() {
		return this.value;
	}

	/**
	 * @return {string} The value of this attribute as a string.
	 */
	toString() {
		return this.avalue.toString();
	}

	/**
	 * @name Attribute#[inspect]
	 * @function
	 * @return {string} The attribute key and value as a presentation string.
	 */
	[inspect]() {
		// get the display value
		const v = this.avalue[inspect]();

		// get string mapped value if available
		let m = this.dict.values;
		if (m && m.has(this.value)) {
			const s = m.get(this.value);
			return `${this.name}: ${s} (${v})`;
		}

		return `${this.name}: ${v}`;
	}

	/**
	 * Convert an Attribute into wire format.
	 *
	 * The secret and authenticator are only used for encrypted attributes.
	 *
	 * @param {Uint8Array} buf - where the attribute will be stored
	 * @param {number} offset - where in the buffer to store the attribute (default 0)
	 * @param {string} secret - The shared secret (for encrypted attributes)
	 * @param {Uint8Array} authenticator - The authenticator (for encrypted attributes)
	 * @return {number} The resulting buffer offset
	 */
	toWire(buf, offset = 0, secret, authenticator) {
		const dict = this.dict;
		const vendor = dict.vendor;

		let abuf = this.avalue.toBuffer();

		// convert encrypted attributes
		// @TODO: support additional algorithms
		if (dict.flags.encrypt === 1) {
			abuf = encodeMD5(abuf, secret, authenticator);
		}

		// assume standard length
		let length = 2 + abuf.length;

		// then allocate more space for VSA headers
		if (vendor) {
			length += 4 + vendor.typeSize + vendor.lengthSize;
		}

		// ensure there's room in the packet
		if (offset + length >= buf.length) {
			throw new RangeError('attributes will not fit in buffer');
		}

		// add standard headers
		offset = buf.writeUInt8(dict.id, offset);
		offset = buf.writeUInt8(length, offset);

		// add VSA headers
		if (vendor) {
			offset = buf.writeUInt32BE(vendor.id, offset);
			offset = buf.writeUIntBE(dict.sub_id, offset, vendor.typeSize);
			if (vendor.lengthSize) {
				offset = buf.writeUIntBE(Math.min(abuf.length, 255), offset, vendor.lengthSize);
			}
		}

		// add data
		abuf.copy(buf, offset);

		// return final buffer offset
		offset += abuf.length;
		return offset;
	}

	/**
	 * Construct an Attribute from a wire-encoded {@link Uint8Array}.
 	 *
 	 * @param {Uint8Array} buffer - the wire-encoded attribute
 	 * @return {Attribute} the constructed attribute
 	 * @throws if the buffer cannot be parsed
 	 */
	static fromWire(buffer, secret, authenticator) {

		if (! (buffer instanceof Uint8Array)) {
			throw new TypeError('invalid type for attribute buffer');
		}

		if (buffer.length < 2) {
			throw new RangeError('invalid length for attribute buffer');
		}

		const id = buffer[0];
		let length = buffer[1];

		if (buffer.length !== length) {
			throw new RangeError('length mismatch in attribute buffer');
		}

		let dict = Dictionary.get(id);
		let data = buffer.slice(2);
		if (dict.isVSA) {
			if (data.length < 4) {
				throw new RangeError('VSA buffer too short to encode vendor');
			}

			let vendor_id = data.readUInt32BE(0);
			let vendor = Dictionary.vendor(vendor_id);
			if (vendor) {
				let typeSize = vendor.typeSize;
				let lengthSize = vendor.lengthSize;

				let offset = 4;
				if (data.length < offset + typeSize + lengthSize) {
					throw new RangeError('VSA buffer too short to encode id and length');
				}

				let sub_id;
				sub_id = data.readUIntBE(offset, typeSize);
				offset += typeSize;

				let sub_length;
				if (lengthSize) {
					sub_length = data.readUIntBE(offset, lengthSize);
				} else { // no sub-length - consume whole VSA
					sub_length = buffer.length - offset;
				}
				offset += lengthSize;

				// replace the dict entry with the real one for this VSA
				dict = Dictionary.vsa(vendor_id, sub_id);

				// trim the whole VSA's record length to be that of
				// this attribute, to allow parser to cope with VSAs
				// that contain multiple sub-attributes
				length = offset + sub_length;
				buffer[1] = length;

				// strip the data down to the current subset
				data = data.slice(offset, length);
			}
		}

		if (data.length < dict.realType.minimumLength) {
			throw new RangeError('attribute value too short for type');
		}

		if (data.length > dict.realType.maximumLength) {
			throw new RangeError('attribute value too long for type');
		}

		// decrypt the value of encrypted attribues
		const encrypt = dict.flags.encrypt;
		if (encrypt !== undefined) {
			if (encrypt === 1) {
				data = decodeMD5(data, secret, authenticator);
			} else {
				// @TODO: support additional algorithms
				throw new Error('attribute uses unsupported encryption scheme');
			}
		}

		return new Attribute(dict, data);
	}
};

module.exports = Attribute;
