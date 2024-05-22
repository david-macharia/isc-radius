const assert = require('assert').strict;

const Dictionary = require('../lib/dictionary.js');
Dictionary.load(__dirname + '/dictionary/dictionary.rfc2865');
Dictionary.load(__dirname + '/dictionary/dictionary.lucent');

describe('Dictionary', () => {
	describe('get', () => {

		it('should throw if the parameter is of the wrong type', () => {
			assert.throws(() => Dictionary.get(), TypeError);
			assert.throws(() => Dictionary.get(true), TypeError);
			assert.throws(() => Dictionary.get({}), TypeError);
			assert.throws(() => Dictionary.get(() => {}, TypeError));
		});

		it('should throw if a passed number is invalid', () => {
			assert.throws(() => Dictionary.get(1.5), TypeError);
			assert.throws(() => Dictionary.get(0), RangeError);
			assert.throws(() => Dictionary.get(256), RangeError);
		});

		it('should correctly return an attribute by name', () => {
			assert.equal(Dictionary.get('User-Name').id, 1);
			assert.equal(Dictionary.get('User-Password').id, 2);
			assert.equal(Dictionary.get('Vendor-Specific').id, 26);
		});

		it('should throw if an attribute name is unrecognized', () => {
			assert.throws(() => Dictionary.get('XYZZY'), RangeError);
		});

		it('should correctly return an attribute by number', () => {
			assert.equal(Dictionary.get(1).name, 'User-Name');
			assert.equal(Dictionary.get(2).name, 'User-Password');
			assert.equal(Dictionary.get(26).name, 'Vendor-Specific');
			assert.equal(Dictionary.get(254).name, 'Unknown-Attribute-254');
		});

		it('should correctly return a VSA by name', () => {
			assert.equal(Dictionary.get('Lucent-User-Priority').id, 26);
			assert.equal(Dictionary.get('Lucent-User-Priority').sub_id, 8);
		});

		it('should return the same entry if an unknown ID is requested twice', () => {
			assert.equal(Dictionary.get(254), Dictionary.get(254));
		});

		it('should be able to parse attribute flags', () => {
			assert.equal(Dictionary.get('User-Password').flags.encrypt, 1);
		});
	});

	describe('vendor', () => {
		it('should throw if the parameter is of the wrong type', () => {
			assert.throws(() => Dictionary.vendor(), TypeError);
			assert.throws(() => Dictionary.vendor(''), TypeError);
			assert.throws(() => Dictionary.vendor(true), TypeError);
			assert.throws(() => Dictionary.vendor({}), TypeError);
			assert.throws(() => Dictionary.vendor(() => {}, TypeError));
		});

		it('should return expected values for a known Vendor', () => {
			let v = Dictionary.vendor(4846);
			assert.equal(v.name, 'Lucent');
			assert.equal(v.typeSize, 2);
			assert.equal(v.lengthSize, 1);
		});

		it('should return expected values for an unknown Vendor', () => {
			let v = Dictionary.vendor(100);
			assert.equal(v.name, 'Vendor100');
			assert.equal(v.id, 100);
			assert.equal(v.typeSize, 1);
			assert.equal(v.lengthSize, 1);
		});

		it('should return the same vendor if an unknown value is requested twice', () => {
			assert.equal(Dictionary.vendor(100), Dictionary.vendor(100));
		});

	});

	describe('vsa', () => {

		it('should throw if a VSA lookup uses the wrong type for parameter 1', () => {
			assert.throws(() => Dictionary.vsa(undefined, 1), TypeError);
			assert.throws(() => Dictionary.vsa('', 1), TypeError);
			assert.throws(() => Dictionary.vsa(true, 1), TypeError);
			assert.throws(() => Dictionary.vsa({}, 1), TypeError);
			assert.throws(() => Dictionary.vsa(() => {}, 1), TypeError);
		});

		it('should throw if a VSA lookup uses the wrong type for parameter 2', () => {
			assert.throws(() => Dictionary.vsa(1, undefined), TypeError);
			assert.throws(() => Dictionary.vsa(1, ''), TypeError);
			assert.throws(() => Dictionary.vsa(1, true), TypeError);
			assert.throws(() => Dictionary.vsa(1, {}), TypeError);
			assert.throws(() => Dictionary.vsa(1, () => {}), TypeError);
		});

		it('should correctly return a VSA by id', () => {
			assert.equal(Dictionary.vsa(4846, 18).name, 'Lucent-Session-Type');
			assert.equal(Dictionary.vsa(4846, 2000).name, 'Lucent-Unknown-Attribute-2000');
			assert.equal(Dictionary.vsa(100, 200).name, 'Vendor100-Unknown-Attribute-200');
		});

		it('should return the same entry if an unknown value is requested twice', () => {
			assert.equal(Dictionary.vsa(100, 10), Dictionary.vsa(100, 10));
		});

	});
});
