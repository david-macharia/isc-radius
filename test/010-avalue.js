const assert = require('assert').strict;

const AV = require('../lib/avalue.js');
const inspect = Symbol.for('nodejs.util.inspect.custom');

//
// generic Buffer attributes
//
describe('AV.Buffer', () => {

	const type = AV.Buffer;
	const buf1 = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]);
	const buf2 = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8, 9]);

	let attr1;
	let attr2;

	describe('.fromBuffer(buf)', () => {
		it('should accept a buffer parameter', () => {
			attr1 = type.fromBuffer(buf1);
			attr2 = type.fromBuffer(buf2);
		});
	});

	describe('.fromBuffer(buf)', () => {
		it('should throw if the parameter is not a buffer', () => {
			assert.throws(() => type.fromBuffer(undefined));
			assert.throws(() => type.fromBuffer(false));
			assert.throws(() => type.fromBuffer(null));
			assert.throws(() => type.fromBuffer(1));
			assert.throws(() => type.fromBuffer('foobar'));
			assert.throws(() => type.fromBuffer([]));
			assert.throws(() => type.fromBuffer({}));
			assert.throws(() => type.fromBuffer(() => {}));
		});
	});

	describe('.fromBuffer(buf)', () => {
		it('should throw if the buffer length is out of range', () => {
			assert.throws(() => type.fromBuffer(Buffer.alloc(0)));
			assert.throws(() => type.fromBuffer(Buffer.alloc(254)));
		});
	});

	describe('#[inspect](buf)', () => {
		it('should convert a buffer to string', () => {
			const actual = attr1[inspect]();
			assert.equal(actual, '<Buffer 01 02 03 04 05 06 07 08>');
		});

		it('should put ellipsis in long buffers', () => {
			const actual = attr2[inspect]();
			assert.equal(actual, '<Buffer 01 02 03 04 05 06 07 08 ... >');
		});
	});

	describe('#toBuffer()', () => {
		it('should match the original supplied data', () => {
			assert.deepEqual(attr1.toBuffer(), buf1);
			assert.deepEqual(attr2.toBuffer(), buf2);
		});
	});
});

//
// Generic string attribute
//
describe('AV.String', () => {

	const type = AV.String;
	const buf = Buffer.from([65, 66, 67]);
	let attr;

	describe('.fromBuffer(buf)', () => {
		it('should accept a buffer parameter', () => {
			attr = type.fromBuffer(buf);
		});
	});

	describe('.fromBuffer(buf)', () => {
		it('should throw if the parameter is not a buffer', () => {
			assert.throws(() => type.fromBuffer(undefined));
			assert.throws(() => type.fromBuffer(false));
			assert.throws(() => type.fromBuffer(null));
			assert.throws(() => type.fromBuffer(1));
			assert.throws(() => type.fromBuffer('foobar'));
			assert.throws(() => type.fromBuffer([]));
			assert.throws(() => type.fromBuffer({}));
			assert.throws(() => type.fromBuffer(() => {}));
		});
	});

	describe('.fromBuffer(buf)', () => {
		it('should throw if the buffer length is out of range', () => {
			assert.throws(() => type.fromBuffer(Buffer.alloc(0)));
			assert.throws(() => type.fromBuffer(Buffer.alloc(254)));
		});
	});

	describe('.fromValue(s)', () => {
		it('should accept a string parameter', () => {
			let attr = type.fromValue('ABC');
			assert.equal(attr.toString(), 'ABC');
		});
	});

	describe('#[inspect](buf)', () => {
		it('should convert a buffer to string', () => {
			const actual = attr[inspect]();
			assert.equal(actual, '"ABC"');
		});
	});

	describe('#toBuffer()', () => {
		it('should match the original supplied data', () => {
			assert.deepEqual(attr.toBuffer(), buf);
		});
	});
});

//
// Generic numeric attributes of various lengths
//
describe('AV.Byte', () => {

	const type = AV.Byte;
	const buf = Buffer.from([128]);
	let attr;

	describe('.fromBuffer(buf)', () => {
		it('should accept a buffer parameter', () => {
			attr = type.fromBuffer(buf);
		});
	});

	describe('.fromBuffer(buf)', () => {
		it('should throw if the parameter is not a buffer', () => {
			assert.throws(() => type.fromBuffer(undefined));
			assert.throws(() => type.fromBuffer(false));
			assert.throws(() => type.fromBuffer(null));
			assert.throws(() => type.fromBuffer(1));
			assert.throws(() => type.fromBuffer('foobar'));
			assert.throws(() => type.fromBuffer([]));
			assert.throws(() => type.fromBuffer({}));
			assert.throws(() => type.fromBuffer(() => {}));
		});
	});

	describe('.fromBuffer(buf)', () => {
		it('should throw if the buffer length is out of range', () => {
			assert.throws(() => type.fromBuffer(Buffer.alloc(0)));
			assert.throws(() => type.fromBuffer(Buffer.alloc(2)));
		});
	});

	describe('.fromValue(value)', () => {
		it('should throw if the parameter is not an 8 bit unsigned number', () => {
			assert.throws(() => type.toBuffer(null));
			assert.throws(() => type.toBuffer(-1));
			assert.throws(() => type.toBuffer(4.2));
			assert.throws(() => type.toBuffer(Math.pow(2, 8)));
		});
	});

	describe('#[inspect](buf)', () => {
		it('should convert a buffer to string', () => {
			const actual = attr[inspect]();
			assert.equal(actual, '128');
		});
	});

	describe('#toBuffer()', () => {
		it('should match the original supplied data', () => {
			assert.deepEqual(attr.toBuffer(), buf);
		});
	});
});

describe('AV.Integer', () => {

	const type = AV.Integer;
	const buf = Buffer.from([1, 2, 3, 4]);
	let attr;

	describe('.fromBuffer(buf)', () => {
		it('should accept a buffer parameter', () => {
			attr = type.fromBuffer(buf);
		});
	});

	describe('.fromBuffer(buf)', () => {
		it('should throw if the parameter is not a buffer', () => {
			assert.throws(() => type.fromBuffer(undefined));
			assert.throws(() => type.fromBuffer(false));
			assert.throws(() => type.fromBuffer(null));
			assert.throws(() => type.fromBuffer(1));
			assert.throws(() => type.fromBuffer('foobar'));
			assert.throws(() => type.fromBuffer([]));
			assert.throws(() => type.fromBuffer({}));
			assert.throws(() => type.fromBuffer(() => {}));
		});
	});

	describe('.fromBuffer(buf)', () => {
		it('should throw if the buffer length is out of range', () => {
			assert.throws(() => type.fromBuffer(Buffer.alloc(3)));
			assert.throws(() => type.fromBuffer(Buffer.alloc(5)));
		});
	});

	describe('.fromValue(value)', () => {
		it('should throw if the parameter is not a 32 bit unsigned number', () => {
			assert.throws(() => type.toBuffer(null));
			assert.throws(() => type.toBuffer(-1));
			assert.throws(() => type.toBuffer(4.2));
			assert.throws(() => type.toBuffer(Math.pow(2, 32)));
		});
	});

	describe('#[inspect](buf)', () => {
		it('should convert a buffer to string', () => {
			const actual = attr[inspect]();
			assert.equal(actual, '16909060');
		});
	});

	describe('#toBuffer()', () => {
		it('should match the original supplied data', () => {
			assert.deepEqual(attr.toBuffer(), buf);
		});
	});
});


//
// Generic numeric attributes of various lengths
//
describe('AV.Byte', () => {

	const type = AV.Byte;
	const buf = Buffer.from([128]);
	let attr;

	describe('.fromBuffer(buf)', () => {
		it('should accept a buffer parameter', () => {
			attr = type.fromBuffer(buf);
		});
	});

	describe('.fromBuffer(buf)', () => {
		it('should throw if the parameter is not a buffer', () => {
			assert.throws(() => type.fromBuffer(undefined));
			assert.throws(() => type.fromBuffer(false));
			assert.throws(() => type.fromBuffer(null));
			assert.throws(() => type.fromBuffer(1));
			assert.throws(() => type.fromBuffer('foobar'));
			assert.throws(() => type.fromBuffer([]));
			assert.throws(() => type.fromBuffer({}));
			assert.throws(() => type.fromBuffer(() => {}));
		});
	});

	describe('.fromBuffer(buf)', () => {
		it('should throw if the buffer length is out of range', () => {
			assert.throws(() => type.fromBuffer(Buffer.alloc(0)));
			assert.throws(() => type.fromBuffer(Buffer.alloc(2)));
		});
	});

	describe('.fromValue(value)', () => {
		it('should throw if the parameter is not an 8 bit unsigned number', () => {
			assert.throws(() => type.toBuffer(null));
			assert.throws(() => type.toBuffer(-1));
			assert.throws(() => type.toBuffer(4.2));
			assert.throws(() => type.toBuffer(Math.pow(2, 8)));
		});
	});

	describe('#[inspect](buf)', () => {
		it('should convert a buffer to string', () => {
			const actual = attr[inspect]();
			assert.equal(actual, '128');
		});
	});

	describe('#toBuffer()', () => {
		it('should match the original supplied data', () => {
			assert.deepEqual(attr.toBuffer(), buf);
		});
	});
});

describe('AV.Inet4', () => {

	const type = AV.Inet4;
	const buf = Buffer.from([10, 1, 2, 4]);
	let attr1;
	let attr2;

	describe('.fromBuffer(buf)', () => {
		it('should accept a buffer parameter', () => {
			attr1 = type.fromBuffer(buf);
		});
	});

	describe('.fromBuffer(buf)', () => {
		it('should throw if the parameter is not a buffer', () => {
			assert.throws(() => type.fromBuffer(undefined));
			assert.throws(() => type.fromBuffer(false));
			assert.throws(() => type.fromBuffer(null));
			assert.throws(() => type.fromBuffer(1));
			assert.throws(() => type.fromBuffer('foobar'));
			assert.throws(() => type.fromBuffer([]));
			assert.throws(() => type.fromBuffer({}));
			assert.throws(() => type.fromBuffer(() => {}));
		});
	});

	describe('.fromBuffer(buf)', () => {
		it('should throw if the buffer length is out of range', () => {
			assert.throws(() => type.fromBuffer(Buffer.alloc(3)));
			assert.throws(() => type.fromBuffer(Buffer.alloc(5)));
		});
	});

	describe('.fromValue(str)', () => {
		it('show accept an IP address string literal', () => {
			attr2 = type.fromValue('10.1.2.4');
			assert.deepEqual(attr2.toBuffer(), buf);
		});
	});

	describe('.fromValue(str)', () => {
		it('should throw if the parameter is an invalid string', () => {
			assert.throws(() => type.toBuffer(''));
			assert.throws(() => type.toBuffer('256.1.1.1.1'));
			assert.throws(() => type.toBuffer('256.1.1.1'));
			assert.throws(() => type.toBuffer('256.1.1'));
			assert.throws(() => type.toBuffer('256.1.1'));
			assert.throws(() => type.toBuffer('-1.1.1.1'));
			assert.throws(() => type.toBuffer('1.1.1.-1'));
		});
	});

	describe('#[inspect]()', () => {
		it('should convert a value to an IPv4 string', () => {
			const actual = attr1[inspect]();
			assert.equal(actual, '10.1.2.4');
		});
	});

	describe('#toString()', () => {
		it('should convert a value to an IPv4 string', () => {
			assert.equal(attr1.toString(), '10.1.2.4');
		});
	});

	describe('#toBuffer()', () => {
		it('should match the original supplied data', () => {
			assert.deepEqual(attr1.toBuffer(), buf);
			assert.deepEqual(attr2.toBuffer(), buf);
		});
	});
});
