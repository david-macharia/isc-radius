/*
 * Copyright (C) Internet Systems Consortium, Inc. ("ISC")
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 */

const inspect = Symbol.for('nodejs.util.inspect.custom');

/**
 * An abstract wrapper class for RADIUS attribute values
 *
 * @abstract
 * @hideconstructor
 */
class AValue {

	// all AValue instances are actually created via Object.create()
	constructor() {
		throw new Error('attribute values cannot be constructed');
	}

	/**
	 * The length of the attribute data (in bytes)
	 * @type number
	 */
	get length() {
		return this.value.length;
	}

	/**
	 * The (immutable) value wrapped inside this object.
	 * @name AValue#value
	 * @const
	 */

	/**
	 * Create an AValue from its buffer representation
	 * @param {Uint8Array} buf - the input buffer
	 * @return {AValue} a new attribute value object
	 */
	static fromBuffer(buf) {
		throw new Error('AValue.fromBuffer cannot be directly invoked');
	}

	/**
	 * Create an AValue from its native representation
	 * @param {*} value - the input value
	 * @return {AValue} a new attribute value object
	 */
	static fromValue(value) {
		throw new Error('AValue.fromValue cannot be directly invoked');
	}

	/**
	 * For buffer-backed attributes, returns a copy of the buffer,
	 * otherwise returns the actual value of the attribute.
	 * @return {*} (a copy of) the value wrapped inside this object
	 */
	valueOf() {
		return this.value;
	}

	/**
	 * Converts an attribute value into presentation format
	 *
	 * @name AValue#[inspect]
	 * @function
	 * @return {string} - the value of the attribute in presentation format
	 */
	[inspect]() {
		throw new Error('AValue#[inspect] cannot be directly invoked');
	}
}

/**
 * A wrapper class for "octet valued" attributes, and also the concrete
 * base class for other attribute types, and the fallback when the specific
 * attribute type is unsupported.
 *
 * @hideconstructor
 * @extends AValue
 */
class ABuffer extends AValue {

	static bufferCheck(buf, min = 1, max = 253) {
		if (buf instanceof Buffer) {
			if (buf.length < min || buf.length > max) {
				throw new RangeError(`invalid buffer length for ${this.name}`);
			}
		} else {
			throw new TypeError(`invalid type for ${this.name}`);
		}
	}

	/**
	 * Create an attribute's value from its buffer representation
	 * @name ABuffer.fromBuffer
	 * @param {Uint8Array) buf - the input buffer
	 * @return {*} a new attribute value object
	 */
	static fromBuffer(buf) {
		this.bufferCheck(buf);

		// prevent changes to the original buf from propagating
		buf = buf.slice(0);

		const result = Object.create(this.prototype, {
			value: {
				get: () => buf.slice(0),
				enumerable: true
			}
		});
		Object.freeze(result);
		return result;
	}

	/**
	 * Create an attribute's value from its native representation
	 * @param {Uint8Array) value - the input value
	 * @return {AValue} a new attribute value object
	 */
	static fromValue(value) {
		return this.fromBuffer(value);
	}

	[inspect]() {
		let v = this.value[inspect]();
		if (typeof v === 'string' && v.substring(0, 8) === '<Buffer ' && v.length > 32) {
			v = v.substring(0, 32) + '... >';
        }
		return v;
	}

	/**
	 * Converts an attribute's value into buffer representation
	 * @return {Uint8array} a copy of the attribute value encoded in a buffer
	 */
	toBuffer() {
		return this.value.slice(0);
	}
};

/**
 * A wrapper for "string valued" attributes.
 *
 * @extends ABuffer
 * @hideconstructor
 */
class AString extends ABuffer {

	/**
	 * Creates a string value attribute
	 * @param {string} value - the value
	 */
	static fromValue(value) {
		// type checks
		if (typeof value === 'string') {
			value = Buffer.from(value, 'utf-8');
		}

		if (!(value instanceof Buffer)) {
			throw new TypeError('value must be a string or a buffer');
		}

		return this.fromBuffer(value);
	}

	/**
	 * The value of the attribute encoded as a UTF-8 string
	 */
	toString() {
		return this.value.toString('utf-8');
	}

	/**
	 * The value of the attribute encoded as a UTF-8 string (as
	 * returned by {@link AString#toString toString})
	 */
	valueOf() {
		return this.toString();
	}

	[inspect]() {
		return `"${this}"`;
	}
};


/**
 * The base class for attributes that have a fixed size
 *
 * @extends ABuffer
 * @hideconstructor
 */
class AFixed extends ABuffer {

	/**
	 * The (per-type) attribute length exposed as an instance property
	 * @name AFixed#length
	 */
	get length() {
		return this.constructor.length;
	}

	/**
	 * The size associated with this class.
	 * @name AFixed.length
	 * @type number
	 * @abstract
	 */
	static get length() {
		throw new Error('illegal call to AFixed.length');
	}

	static bufferCheck(buf) {
		super.bufferCheck(buf, this.length, this.length);
	}
}

/**
 * The base class for attributes that represent an unsigned integer
 * of various sizes
 *
 * @extends AFixed
 * @hideconstructor
 */
class ANumeric extends AFixed {

	/**
	 * Creates a numeric attribute value by decoding a buffer of the
	 * expected length that should contain that value in big-endian
	 * format.
	 */
	static fromBuffer(buf) {
		this.bufferCheck(buf);
		return this.fromValue(buf.readUIntBE(0, this.length));
	}

	/**
	 * Creates an attribute value representing a number within the
	 * expected range.
	 * @param {number} value - the value of the attribute.
	 */
	static fromValue(value) {
		if (typeof value !== 'number') {
			throw new TypeError('non-numeric parameter passed for attribute');
		}

		if (!Number.isInteger(value)) {
			throw new RangeError('non-integer parameter passed for attribute');
		}

		if (value < 0 || value >= Math.pow(2, 8 * this.length)) {
			throw new RangeError(`integer paramer out of range for ${this.name}`);
		}

		return Object.create(this.prototype, { value: { value, enumerable: true } } );
	}

	/**
	 * Convert the value into a string
	 */
	[inspect]() {
		return this.value.toString();
	}

	/**
	 * Converts the value into a buffer of the appropriate length
	 * @return {Uint8Array}
	 */
	toBuffer() {
		const buf = Buffer.alloc(this.length);
		buf.writeUIntBE(this.value, 0, this.length);
		return buf;
	}
};

/**
 * An attribute that represents an unsigned integer with range 0 .. 255
 *
 * @extends ANumeric
 * @hideconstructor
 */
class AByte extends ANumeric {

	/**
	 * Always 1
	 * @name AByte.length
	 * @type number
	 */
	static get length() { return 1; }

};

/**
 * An attribute that represents an unsigned integer with range 0 .. 65535
 *
 * @extends ANumeric
 * @hideconstructor
 */
class AShort extends ANumeric {

	/**
	 * Always 2
	 * @name AShort.length
	 * @type number
	 */
	static get length() { return 2; }

};

/**
 * An attribute that represents an unsigned integer with range 0 .. 2^32 - 1
 *
 * @extends ANumeric
 * @hideconstructor
 */
class AInteger extends ANumeric {

	/**
	 * Always 4
	 * @name AInteger.length
	 * @type number
	 */
	static get length() { return 4; }

}

/**
 * An attribute that represents an IPv4 address
 *
 * @extends AFixed
 * @hideconstructor
 */
class AInet4 extends AFixed {

	/**
	 * Always 4
	 * @name AInet4.length
	 * @type number
	 */
	static get length() { return 4; }

	/**
	 * Creates an {@link AInet4} attribute from a string in
	 * IPv4 dotted-quad  notation or from an array of four numbers
	 *
	 * @param {(string|Array<number>)} value - a dotted-quad string
	 * or number array (e.g. [192, 168, 1, 1])
	 * @return {AInet4}
	 * @throws if the value is invalid.
	 */
	static fromValue(value) {
		if (typeof value === 'string') {
			value = value.trim().split(/\./).map(Number);
		}

		if (value.length !== 4 || !value.every(x => (x >= 0 && x <= 255))) {
			throw new TypeError('illegal IP address string');
		}

		value = Buffer.from(value);
		return this.fromBuffer(value);
	}

	/**
	 * @return {string} the IPv4 address in dotted-quad format.
	 */
	toString() {
		return [].join.call(this.value, '.');
	}

	[inspect]() {
		return this.toString();
	}
};

/**
 * An attribute that represents a date/timestamp, represented
 * as a 32-bit integer value with the epoch at 1970/01/01
 * 00:00:00Z
 *
 * @extends AInteger
 * @hideconstructor
 */
class ADate extends AInteger {

	/**
	 * Always 4
	 * @name ADate.length
	 * @type number
	 */
	static get length() { return 4; }

	/**
	 * Returns the date in ISO-7816 format
	 * @name ADate#[inspect]
	 * @type string
	 */
	[inspect]() {
		return new Date(this.value).toISOString();
	}
};

class AVSA extends ABuffer {
};

module.exports = {
	Buffer: ABuffer,
	String: AString,
	Numeric: ANumeric,
	Integer: AInteger,
	Short: AShort,
	Byte: AByte,
	Inet4: AInet4,
	Date: ADate,
	VSA: AVSA
};
