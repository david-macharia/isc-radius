/*
 * Copyright (C) Internet Systems Consortium, Inc. ("ISC")
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 */

/**
 * @fileOverview RADIUS Dictionary Support
 * @author [Ray Bellis]{@link mailto:ray@isc.org}
 */

/**
 * @typedef {Object} Dictionary
 * @class
 * @hideconstructor
 */

const AV = require('./avalue');
const Vendor = require('./vendor');
const DictionaryEntry = require('./dictent');

const fs = require('fs');
const path = require('path');

const inspect = Symbol.for('nodejs.util.inspect.custom');

class ParseError extends Error { };

// global state
const dict = new Map();
const vendors = new Map();
const vsas = new Map();

function readFile(file)
{
	return fs.readFileSync(file, 'ascii')
		.split(/\r?\n/)
		.map(line => line.replace(/\s*#.*$/, '').trim())
		.map((line, index) => [index + 1, line.split(/\s+/)])
		.filter(([_, line]) => line.length)
}

function addAttributeSpec(vendor, name, id, type, ...extra)
{
	const ent = new DictionaryEntry(vendor, name, id, type, ...extra);

	// store the entry in the appropriate table
	if (vendor) {
		if (vsas.has(vendor.id)) {
			vsas.get(vendor.id).set(ent.sub_id, ent);
		}
	} else {
		dict.set(ent.id, ent);
	}

	// store the entry by name, too, in the global dictionary
	dict.set(name.toLowerCase(), ent);
}

function addAttributeValue(vendor, attr, name, value)
{
	attr = attr.toLowerCase();

	const ent = dict.get(attr.toLowerCase());
	if (!ent) {
		throw new ParseError(`VALUE entry for unknown attribute name ${attr}`);
	}

	if (!ent.isNumeric) {
		throw new ParseError('VALUE entry for incorrect attribute type');
	}

	value = Number(value);
	if (!Number.isInteger(value)) {
		throw new ParseError('VALUE entry\'s value is not an integer');
	}

	let map = ent.values;
	map.set(value, name);
	map.set(name.toLowerCase(), value);
}

function addVendor(name, id, ...extra)
{
	id = Number(id);
	if (!Number.isInteger(id)) {
		throw new ParseError('VENDOR entry\'s id is not an integer');
	}

	if (vendors.has(id)) {
		throw new ParseError(`duplicate VENDOR entry for ID ${id}`);
	}

	// create table for holding this vendor's VSAs
	vsas.set(id, new Map());

	const vendor = new Vendor(name, id, ...extra);
	vendors.set(id, vendor);
	vendors.set(name.toLowerCase(), vendor);
}

function beginVendor(name)
{
	name = name.toLowerCase();
	if (!vendors.has(name)) {
		throw new ParseError('BEGIN-VENDOR entry for unknown name');
	}

	return vendors.get(name);
}

function include(stack, file)
{
	if (typeof file !== 'string') {
		throw new TypeError('$INCLUDE value is not a string');
	}

	if (!path.isAbsolute(file)) {
		let current = stack[stack.length - 1].file;
		file = path.join(path.dirname(current), file);
	}
	load_impl(stack, file);
}

function load_impl(stack, file)
{
	let vendor = undefined;
	for (let [lineno, [keyword, ...data]] of readFile(file)) {
		try {
			switch (keyword.toUpperCase()) {
				case 'ATTRIBUTE':
					addAttributeSpec(vendor, ...data);
					break;

				case 'VALUE':
					addAttributeValue(vendor, ...data);
					break;

				case 'VENDOR':
					addVendor(...data);
					break;

				case 'BEGIN-VENDOR':
					vendor = beginVendor(...data);
					break;

				case 'END-VENDOR':
					vendor = undefined;
					break;

				case '$INCLUDE':
					stack.push({ file, lineno });
					include(stack, ...data);
					stack.pop();
					break;
			}
		} catch (e) {
			if (e instanceof ParseError) {
				stack.push({ file, lineno });
				console.error(`parser error: ${e.message}`);
				while (stack.length) {
					let { file, lineno} = stack.pop();
					console.error(`    at ${file}:${lineno}`);
				}
				process.exit(1);
			}
			throw e;
		}
	}
}

function load(file)
{
	const stack = [];

	// if relative path isn't found, look relative to here
	if (!path.isAbsolute(file)) {
		try {
			fs.accessSync(file);
		} catch (e) {
			let p = path.parse(file);
			if (p.dir === '' || p.dir === '.') {
				file = path.join(__dirname, 'dictionary', file);
				fs.accessSync(file);
			} else {
				throw e;
			}
		}
	}

	load_impl(stack, file);
}

/**
 * @param {vendor_id} - a 32-bit Enterprise ID
 * @param {sub_id} - the vendor-specific attribute ID
 * @return {(DictionaryEntry|undefined)} - the matching Dictionary entry
 * @throws if any of the parameters are illegal
 * @function
 * @memberof Dictionary
 */
function vsa(vendor_id, sub_id)
{
	if (vendor_id === undefined) {
		throw new TypeError('dictionary VSA vendor id unspecified');
	}

	if (sub_id === undefined) {
		throw new TypeError('dictionary VSA attribute sub-id not specified');
	}

	if (!Number.isInteger(vendor_id)) {
		throw new TypeError(`dictionary VSA vendor id (${vendor_id}) not an integer`);
	}

	if (!Number.isInteger(sub_id)) {
		throw new TypeError('dictionary VSA attribute sub-id not an integer');
	}

	let v = vendor(vendor_id);	// ensure the Vendor is known (or created)
	let dict = vsas.get(v.id);
	if (!dict.has(sub_id)) {
		addAttributeSpec(v, `${v.name}-Unknown-Attribute-${sub_id}`, sub_id, 'octets');
	}
	return dict.get(sub_id);
}

/**
 * Gets the Dictionary entry for the specified ID
 *
 * @param {(string|number)} id - the name or ID of the required entry
 * @throws if the parameters are illegal
 * @return {DictionaryEntry}
 * @memberof Dictionary
 */

function get(id)
{
	if (typeof id === 'string') {
		let str = id.toLowerCase();
		if (dict.has(str)) {
			return dict.get(str);
		} else {
			throw new RangeError(`unrecognised attribute name: "${id}"`);
		}
	}

	if (typeof id !== 'number') {
		throw new TypeError('Dictionary.get requires an id or string');
	}

	if (!Number.isInteger(id)) {
		throw new TypeError(`dictionary lookup value not an integer: ${id}`);
	}

	if (id < 1 || id > 255) {
		throw new RangeError(`dictionary lookup value out of range: ${id}`);
	}

	if (!dict.has(id)) {
		addAttributeSpec(undefined, `Unknown-Attribute-${id}`, id, 'octets');
	}
	return dict.get(id);
}

/**
 * @param {number} - a 32-bit Enterprise ID
 * @return {Vendor} - the matching {@link Vendor} object
 * @throws if the parameter is illegal
 * @memberof Dictionary
 */
function vendor(id)
{
	if (typeof id !== 'number') {
		throw new TypeError('Dictionary.vendor requires a numeric ID');
	}

	if (!Number.isInteger(id)) {
		throw new TypeError(`Dictionary vendor value not an integer: ${id}`);
	}

	// create default Vendor object if not found
	if (!vendors.has(id)) {
		addVendor(`Vendor${id}`, id);
	}

	return vendors.get(id);
}

module.exports = { load, get, vendor, vsa, Entry: DictionaryEntry };
