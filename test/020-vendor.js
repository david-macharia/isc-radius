const assert = require('assert').strict;

const Vendor = require('../lib/vendor.js');

describe('Vendor', () => {
	describe('#constructor', () => {

		it('should throw if the name parameter is of the wrong type', () => {
			assert.throws(() => new Vendor(undefined, 1), TypeError);
			assert.throws(() => new Vendor(1, 1), TypeError);
			assert.throws(() => new Vendor(true, 1), TypeError);
			assert.throws(() => new Vendor({}, 1), TypeError);
			assert.throws(() => new Vendor(() => {}, 1), TypeError);
		});

		it('should throw if the id parameter is of the wrong type or out of range', () => {
			assert.throws(() => new Vendor('V', undefined), TypeError);
			assert.throws(() => new Vendor('V', 'X'), TypeError);
			assert.throws(() => new Vendor('V', true), TypeError);
			assert.throws(() => new Vendor('V', {}), TypeError);
			assert.throws(() => new Vendor('V', () => {}), TypeError);

			assert.throws(() => new Vendor('V', 0.5), TypeError);
			assert.throws(() => new Vendor('V', -1), RangeError);
			assert.throws(() => new Vendor('V', Math.pow(2, 32)), RangeError);
		});

		it('should create an object with correct defaults', () => {
			let v = new Vendor('Cisco', 9);
			assert.equal(v.name, 'Cisco');
			assert.equal(v.id, 9);
			assert.equal(v.typeSize, 1);
			assert.equal(v.lengthSize, 1);
		});

		it('should create an object contain the correct values', () => {
			let v = new Vendor('USR', 429, 'format=4,0');
			assert.equal(v.name, 'USR');
			assert.equal(v.id, 429);
			assert.equal(v.typeSize, 4);
			assert.equal(v.lengthSize, 0);
		});
	});
});
