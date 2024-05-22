const assert = require('assert').strict;

const RadiusPacket = require('../lib/packet.js');
// Dictionary.load(__dirname + '/dictionary/dictionary.rfc2865');

describe('Packet', () => {

	describe('#constructor', () => {
		it('should successfully construct a packet', () => {
			const auth = RadiusPacket.randomAuthenticator();
			const packet = new RadiusPacket(1, 10, auth);
			assert.equal(packet.code.valueOf(), 1);
			assert.equal(packet.identifier, 10);
			assert.deepEqual(packet.authenticator, auth);
			assert.notEqual(packet.authenticator, auth);	// must be a copy, not the original
		});

		it('should throw if the code parameter is the wrong type', () => {
			assert.throws(() => new RadiusPacket(undefined, 1, Buffer.alloc(16)));
			assert.throws(() => new RadiusPacket(null, 1, Buffer.alloc(16)));
			assert.throws(() => new RadiusPacket(true, 1, Buffer.alloc(16)));
			assert.throws(() => new RadiusPacket({}, 1, Buffer.alloc(16)));
			assert.throws(() => new RadiusPacket(() => {}, 1, Buffer.alloc(16)));
		});

		it('should throw if the id parameter is the wrong type', () => {
			assert.throws(() => new RadiusPacket(1, undefined, Buffer.alloc(16)));
			assert.throws(() => new RadiusPacket(1, null, Buffer.alloc(16)));
			assert.throws(() => new RadiusPacket(1, true, Buffer.alloc(16)));
			assert.throws(() => new RadiusPacket(1, "", Buffer.alloc(16)));
			assert.throws(() => new RadiusPacket(1, {}, Buffer.alloc(16)));
			assert.throws(() => new RadiusPacket(1, () => {}, Buffer.alloc(16)));
		});

		it('should throw if the authenticator parameter is the wrong type', () => {
			assert.throws(() => new RadiusPacket(1, 1, undefined));
			assert.throws(() => new RadiusPacket(1, 1, null));
			assert.throws(() => new RadiusPacket(1, 1, true));
			assert.throws(() => new RadiusPacket(1, 1, ""));
			assert.throws(() => new RadiusPacket(1, 1, {}));
			assert.throws(() => new RadiusPacket(1, 1, () => {}));
		});

		it('should throw if the authenticator parameter is of the wrong length', () => {
			assert.throws(() => new Attribute(1, 1, Buffer.alloc(15)));
			assert.throws(() => new Attribute(1, 1, Buffer.alloc(17)));
		});
	});

	describe('#add', () => {
	});

	describe('#has', () => {
	});

	describe('#get', () => {
	});

	describe('#getAll', () => {
	});

	describe('#fromWire', () => {
	});

	describe('#toWire', () => {
	});
});
