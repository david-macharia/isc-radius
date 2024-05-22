/*
 * Copyright (C) Internet Systems Consortium, Inc. ("ISC")
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 */

/**
 * @fileOverview RADIUS Attribute List representation
 * @author [Ray Bellis]{@link mailto:ray@isc.org}
 */

const Attribute = require('./attribute');

const inspect = Symbol.for('nodejs.util.inspect.custom');

function addAttribute(list, attr, data)
{
	if (!(attr instanceof Attribute)) {
		attr = new Attribute(attr, data);
	}

	list.push(attr);
}

function parseAttributes(buf, offset, secret, authenticator)
{
	const attrs = [];
	let len = buf.length;
	let n = offset;
	while (n < len) {
		if (len - n > 2) {
			const id = buf[n];
			const len = buf[n + 1];
			const data = buf.slice(n, n + len);
			const attr = Attribute.fromWire(data, secret, authenticator);
			attrs.push(attr);
			n += len;

			// @TODO account for multiple sub-attributes in a single VSA
		}
	}
	return attrs;
}

/**
 * A container for lists of RADIUS Attributes
 */
class AttributeList {

	/**
	 * @param {Attribute[]} attrs - an array of attributes (default empty)
	 * @param {boolean} readonly - whether the list is read only (default false)
	 */
	constructor(attrs = [], readonly = false) {

		// check parameters
		if (!Array.isArray(attrs)) {
			throw new TypeError('attrs must be an array');
		}

		if (typeof readonly !== 'boolean') {
			throw new TypeError('readonly must be a boolean');
		}

		// check that element is an attribute
		if (!attrs.every(a => a instanceof Attribute)) {
			throw new TypeError('non-Attribute entry found in attrs array');
		}

		// copy the array
		const list = attrs.slice(0);

		/**
		 * Provides iteration access to the list of attributes.
		 *
		 * @name AttributeList#[Symbol.iterator]
		 * @function
		 * @generator
		 */
		Object.defineProperty(this, Symbol.iterator, {
			value: function*() {
				for (let attr of list) {
					yield attr;
				}
			},
		});

		/**
		 * Add an attribute to the list.   Called either with a pre-constructed
		 * {@link Attribute} as a single parameter, or with a key and value
		 * to construct and place a new attribute in the list.
		 *
		 * @name AttributeList#add
		 * @param {(Attribute|number|string|Dictionary.Entry)} attribute - either an
		 *  existing Attribute object, or a key for creating a new one
		 * @param value - for creating new Attributes, the associated value
		 * @function
		 * @throws if the list is read-only
		 */
		Object.defineProperty(this, 'add', {
			value: function(attr, value) {
				if (readonly) {
					throw new Error('AttributeList is read-only');
				}
				addAttribute(list, attr, value);
			}
		});
	}

	/**
	 * @param {string}
	 */
	toWire(buf, offset = 0, secret, authenticator) {
		for (const attr of this) {
			offset = attr.toWire(buf, offset, secret, authenticator);
		}
		return offset;
	}

	/**
	 * Renders an AttributeList into wire format.
	 *
	 * @param {Uint8Array} buf - a buffer containing a packet in wire format
	 * @param {number} offset - where in the buffer to start decoding from
	 * @param {string} secret - the shared secret with the client/server
	 * @param {string} authenticator - the inbound request authenticator
	 * @return {AttributeList} - a read-only {@link AttributeList}
	 * @throws if the buffer cannot be parsed
	 */
	static fromWire(buf, offset = 0, secret, authenticator) {
		const attrs = parseAttributes(buf, offset, secret, authenticator);
		return new AttributeList(attrs, true);
	}

	/**
	 * Convert an AttributeList to a formatted string for console display
	 *
	 * @name AttributeList#[inspect]
	 * @function
	 */
	[inspect]() {
		let s = this.constructor.name + ' {';
		let first = true;
		for (let attr of this) {
			if (first) {
				s += '\n';
				first = false;
			}
			s += '  ' + attr[inspect]() + '\n';
		}
		s += '}';
		return s;
	}
};

module.exports = AttributeList;
