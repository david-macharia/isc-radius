/*
 * Copyright (C) Internet Systems Consortium, Inc. ("ISC")
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 */

/**
 * @fileOverview RADIUS Code Field Handling
 * @author [Ray Bellis]{@link mailto:ray@isc.org}
 */

const inspect = Symbol.for('nodejs.util.inspect.custom');

const codeTable = [
	// RFC 2865/2866
	[  1,	'Access-Request' ],
	[  2,	'Access-Accept' ],
	[  3,	'Access-Reject' ],
	[  4,	'Accounting-Request' ],
	[  5,	'Accounting-Response' ],
	[ 11,	'Access-Challenge' ],
	[ 12,	'Status-Server' ],		// updated by RFC 5997
	[ 13,	'Status-Client' ],

	// RFC 5176 - DAC to NAS only
	[ 40,	'Disconnect-Request' ],
	[ 41,	'Disconnect-ACK' ],
	[ 42,	'Disconnect-NAK' ],
	[ 43,	'CoA-Request' ],
	[ 44,	'CoA-ACK' ],
	[ 45,	'CoA-NAK' ],
];

const codeToName = new Map(codeTable);

/**
 * Encapsulates mapping of standard Request and Response types
 * for the RADIUS <tt>code</tt> field.
 */
class Code {

	// private constructor
	constructor() {
		throw new Error('Code constructor cannot be invoked');
	}

	/**
	 * @name Code#code
	 * @type number
	 * @desc the numeric value of the code
	 */

	/**
	 * @return {number} - the numeric value of the code
	 */
	valueOf() {
		return this.code;
	}

	/**
	 * @return {string} - the code in string format (e.g. "Access-Request")
	 */
	toString() {
		return codeToName.get(this.code);
	}

	/**
	 * @name Code#[inspect]
	 * @function
	 * @return {string} the Code object in string format (e.g. "Access-Request")
	 */
	[inspect]() {
		return "'" + this.toString() + "'";
	}

	static from(value) {
		if (value instanceof this) {
			return value;
		}

		if (typeof value === 'string') {
			value = value.toUpperCase().replace('-', '_');
		}

		if (this.hasOwnProperty(value) && this[value] instanceof this) {
			return this[value];
		} else {
			throw new RangeError('Code lookup for unknown value');
		}
	}
};

/**
 * A static object wrapping the RADIUS Access-Request code
 * @name Code.ACCESS_REQUEST
 */

/**
 * A static object wrapping the RADIUS Access-Accept code
 * @name Code.ACCESS_ACCEPT
 */

/**
 * A static object wrapping the RADIUS Access-Reject code
 * @name Code.ACCESS_REJECT
 */

/**
 * A static object wrapping the RADIUS Accounting-Request code
 * @name Code.ACCOUNTING_REQUEST
 */

/**
 * A static object wrapping the RADIUS Accounting-Response code
 * @name Code.ACCOUNTING_RESPONSE
 */


for (let [code, name] of codeTable) {

	const c = Object.create(Code.prototype, {
		code: {
			value: code,
			enumerable: true
		}
	});
	Object.freeze(c);

	Object.defineProperty(Code, code, {
		value: c,
		enumerable: true
	});

	const n = name.toUpperCase().replace('-', '_');
	Object.defineProperty(Code, n, {
		value: c
	});
}

Object.freeze(Code.prototype);

module.exports = Code;
