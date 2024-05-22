/*
 * Copyright (C) Internet Systems Consortium, Inc. ("ISC")
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 */

/**
 * @fileOverview RADIUS Dictionary Entry
 * @author [Ray Bellis]{@link mailto:ray@isc.org}
 */

const AV = require('./avalue');

const typeMap = new Map([
	[ 'string', AV.String ],
	[ 'octets', AV.Buffer ],
	[ 'uint8', AV.Byte ],
	[ 'byte', AV.Byte ],
	[ 'uint16', AV.Short ],
	[ 'short', AV.Short ],
	[ 'integer', AV.Integer ],
	[ 'uint64', AV.Buffer ],		// @TODO
	[ 'integer64', AV.Buffer ],		// @TODO
	[ 'signed', AV.Integer ],		// @TODO
	[ 'ipaddr', AV.Inet4 ],
	[ 'ipv4prefix', AV.Buffer ],	// @TODO
	[ 'ipv6addr', AV.Buffer ],		// @TODO
	[ 'ipv6prefix', AV.Buffer ],	// @TODO
	[ 'ifid', AV.Buffer ],			// @TODO
	[ 'date', AV.Date ],
	[ 'tlv', AV.Buffer ],			// @TODO
	[ 'combo-ip', AV.Buffer ],		// @TODO
	[ 'abinary', AV.Buffer ],		// @TODO
	[ 'ether', AV.Buffer ],			// @TODO
	[ 'struct', AV.Buffer ],		// @TODO
//	[ 'extended', AV.Buffer ],
//	[ 'long-extended', AV.Buffer ],
	[ 'vsa', AV.VSA ],
]);

class ParseError extends Error { };

/**
 * The representation of the meta-data and specification of an
 * individual RADIUS Attribute 
 *
 * @hideconstructor
 */
class DictionaryEntry {

	constructor(vendor, name, id, type, flags, ...extra) {

		type = type.toLowerCase();

		// ignore field width spec for octets[n]
		// @TODO - add support
		if (type.match(/^octets\[\d+\]$/)) {
			type = 'octets';
		}

		if (!typeMap.has(type)) {
			throw new ParseError(`unknown dictionary type entry "${type}"`);
		}

		/**
		 * @name DictionaryEntry#type
		 * @type AValue
		 */
		this.type = typeMap.get(type);

		/**
		 * @name DictionaryEntry#id
		 * @type number
		 */
		this.id = Number(id);
		if (!Number.isInteger(this.id)) {
			// throw new ParseError(`invalid id field (${id}) for dictionary entry`);
			return;
		}

		/**
		 * @name DictionaryEntry#name
		 * @type string
		 */
		this.name = name;

		// VSA properties
		if (vendor) {
			this.vendor = vendor;
			this.sub_id = this.id;
			this.id = 26;			// Vendor-Specific
			this.sub_type = this.type;
			this.type = AV.VSA;
		}

		// additional settings
		this.flags = {};
		if (flags) {
			const f = flags.split(',');
			for (let flag of f) {
				let [key, value] = flag.split('=');
				if (value === undefined) {
					value = 1;
				}
				this.flags[key] = +value;
			}
		}
		Object.freeze(this.flags);

		// additional tags from the Dictionary file
		if (extra.length) {
			this.extra = extra;
		}

		// allow numeric values to be string mapped
		if (this.isNumeric) {
			this.values = new Map();
		}

		// prevent modifications of the main object
		Object.freeze(this);
	}

	get isNumeric() {
		return this.realType.prototype instanceof AV.Numeric;
	}

	get isVSA() {
		return this.type.prototype === AV.VSA.prototype;
	}

	get realType() {
		return this.sub_type || this.type;
	}
}

module.exports = DictionaryEntry;
