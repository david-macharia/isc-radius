#!/usr/bin/env node

const RADIUS = require('.');

RADIUS.Dictionary.load('dictionary.rfc2865');

let client = new RADIUS.Client({host: '127.0.0.1', secret: 'secret'});

let attrs = new RADIUS.AttributeList();
attrs.add('User-Name', 'myuser');
attrs.add('User-Password', 'mypass');

client.request('Access-Request', attrs).then(function(p) {
	console.log('-- auth succeeded --');
	console.log(p);
}).catch(function(e) {
	if (e instanceof RADIUS.Packet) {
		console.log('-- auth failed --');
		console.log(e);
	} else {
		console.error(e);
	}
});
