#!/usr/bin/env node

const RADIUS = require('.');

const logic = {
	auth: function(req, res) {
		if (req.get('User-Name') == 'myuser' &&
			req.get('User-Password') == 'mypass')
		{
			res.code = 'Access-Accept';
		}
	}
};

const defaults = {
	auth: function(req, res) {
		if (res.code.toString() === 'Access-Accept') {
			if (!res.has('Framed-IP-Address')) {
				res.add('Framed-IP-Address', '255.255.255.254');
			}
			if (!res.has('Framed-IP-Netmask')) {
				res.add('Framed-IP-Netmask', [255, 255, 255, 255]);
			}
		}
	}
};

new RADIUS.Server()
	.loadDictionary('dictionary.rfc2865')
	.loadDictionary('./test/dictionary/dictionary.cisco')
	.addClient('127.0.0.1', 'secret')
	.use(logic)
	.use(defaults)
	.start();
