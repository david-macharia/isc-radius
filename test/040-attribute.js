const assert = require('assert').strict;

const Attribute = require('../lib/attribute.js');
const Dictionary = require('../lib/dictionary.js');
Dictionary.load(__dirname + '/dictionary/dictionary.rfc2865');
Dictionary.load(__dirname + '/dictionary/dictionary.cisco'); // required for some VSA tests

describe('Attribute', () => {

	describe('#constructor', () => {
		it('should throw if the id parameter is the wrong type', () => {
			assert.throws(() => new Attribute());
			assert.throws(() => new Attribute(null));
			assert.throws(() => new Attribute(true));
			assert.throws(() => new Attribute({}));
		});

		it('should throw if an integer attribute is passed the wrong type', () => {
			assert.throws(() => new Attribute('Framed-Protocol', 'xxx'));
		});

		it('should accept a numeric attribute', () => {
			const attr = new Attribute('Framed-Protocol', 1);
			assert.equal(attr.value, 1);
		});

		it('should accept a mixed-case string attribute', () => {
			const attr = new Attribute('filter-id', 'test-filter');
			assert.equal(attr.toString(), 'test-filter');
		});

		it('should accept an IP address attribute', () => {
			const attr = new Attribute('Framed-IP-Address', '10.0.0.1');
			assert.equal(attr.toString(), '10.0.0.1');
		});

		it('should accept an octet buffer attribute', () => {
			const attr = new Attribute('State', Buffer.from([1,2,3,4]));
			assert.deepStrictEqual(attr.valueOf(), Buffer.from([1,2,3,4]));
		});

		it('should accept a numeric VSA', () => {
			const attr = new Attribute('Cisco-Multilink-ID', 1);
			assert.equal(attr.valueOf(), 1);
		});
	});

	describe('fromWire', () => {

		it('should throw if the parameter is of the wrong type', () => {
			assert.throws(() => Attribute.fromWire(), TypeError);
			assert.throws(() => Attribute.fromWire(1), TypeError);
			assert.throws(() => Attribute.fromWire(''), TypeError);
			assert.throws(() => Attribute.fromWire(true), TypeError);
			assert.throws(() => Attribute.fromWire({}), TypeError);
			assert.throws(() => Attribute.fromWire(() => {}), TypeError);
		});

		it('should throw if the buffer is too short to be legal', () => {
			assert.throws(() => Attribute.fromWire(Buffer.from([])), RangeError);
			assert.throws(() => Attribute.fromWire(Buffer.from([0x00])), RangeError);
		});

		it('should throw if the buffer length doesn\'t match', () => {
			assert.throws(() => Attribute.fromWire(Buffer.from([0x01, 0x03])), RangeError);
		});

		it('should throw if a VSA buffer is too short to be legal', () => {
			const buf = Buffer.from([26, 7, 0, 0, 0, 9, 1]);
			assert.throws(() => Attribute.fromWire(buf), RangeError);
		});

		it('should throw if the buffer is too small for an integer', () => {
			const buf = Buffer.from([7, 5, 0, 0, 0]);
			assert.throws(() => Attribute.fromWire(buf), RangeError);
		});

		it('should throw if the buffer is too large for an integer', () => {
			const buf = Buffer.from([7, 7, 0, 0, 0, 1, 0]);
			assert.throws(() => Attribute.fromWire(buf), RangeError);
		});

	});
});
