const assert = require('assert').strict;

const Code = require('../lib/code.js');

describe('Code', () => {

	describe('#constructor()', () => {
		it('should throw', () => {
			assert.throws(() => new Code());
			assert.throws(() => new Code(1));
			assert.throws(() => new Code('x'));
		});
	});

	describe('.from()', () => {
		it('should allow lookup by number', () => {
			assert.equal(Code.from(1), Code.ACCESS_REQUEST);
		});

		it('should allow lookup by canonical string', () => {
			assert.equal(Code.from('Access-Request'), Code.ACCESS_REQUEST);
		});

		it('should allow lookup by lower case string', () => {
			assert.equal(Code.from('access-request'), Code.ACCESS_REQUEST);
		});

		it('should allow lookup by keyname', () => {
			assert.equal(Code.from('ACCESS_REQUEST'), Code.ACCESS_REQUEST);
		});

		it('should allow lookup by code', () => {
			assert.equal(Code.from(Code.ACCESS_REQUEST), Code.ACCESS_REQUEST);
		});

		it('should throw if an unassigned value is passed', () => {
			assert.throws(() => Code.from(255));
			assert.throws(() => Code.from('xyzzy'));
			assert.throws(() => Code.from());
		});
	});

	describe('[]', () => {
		it('should allow lookup by number', () => {
			assert.equal(Code[1], Code.ACCESS_REQUEST);
		});
	});

	describe('.code', () => {
		it('should not permit codes to be modified', () => {
			let c = Code.from(1);
			c.code = 2;
			assert.equal(c, Code.ACCESS_REQUEST);
			assert.equal(c.toString(), 'Access-Request');
		});
	});
});
