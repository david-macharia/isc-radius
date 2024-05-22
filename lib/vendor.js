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

/**
 * Describes a RADIUS Vendor and how their VSAs are constructed
 */
class Vendor {
	/**
	 * @param {string} name - the name of the vendor
	 * @param {number} id - the Enterprise ID of the vendor
	 * @param {string} extra - additional parameters specified in the Dictionary
	 * @throws if the parameters are illegal
	 */
	constructor(name, id, ...extra) {

		if (typeof name !== 'string') {
			throw new TypeError('Vendor name must be a string');
		}

		if (typeof id !== 'number') {
			throw new TypeError('Vendor id must be a number');
		}

		if (!Number.isInteger(id)) {
			throw new TypeError('Vendor id must be an integer');
		}

		if (id < 0 || id >= Math.pow(2, 32)) {
			throw new RangeError('Vendor id must be a 32 bit unsigned integer');
		}

		/**
		 * @name Vendor#name
		 * @type string
		 * @desc the name of the Vendor
		 */
		this.name = name;

		/**
		 * @name Vendor#id
		 * @type number
		 * @desc the Enterprise ID of the Vendor
		 */
		this.id = id;

		/**
		 * @name Vendor#typeSize
		 * @type number
		 * @desc the size of the type field of the Vendor's VSAs
		 */
		this.typeSize = 1;

		/**
		 * @name Vendor#lengthSize
		 * @type number
		 * @desc the size of the length field of the Vendor's VSAs
		 */
		this.lengthSize = 1;

		// parse format string
		for (let field of extra) {
			let r = field.match(/^format=(\d+),(\d+)(,(.*?))?$/);
			if (r) {
				this.typeSize = Number(r[1]);
				this.lengthSize = Number(r[2]);
			}
		}

		// check that format remains legal
		if ([1, 2, 4].indexOf(this.typeSize) < 0) {
			throw new Error('illegal VSA type size specified');
		}

		if ([0, 1, 2].indexOf(this.lengthSize) < 0) {
			throw new Error('illegal VSA type length specified');
		}

		Object.freeze(this);
	}
};

module.exports = Vendor;
