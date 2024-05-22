#!/usr/bin/env node

let RADIUS = require('.');

RADIUS.Dictionary.load('dictionary.rfc2865');

let client = new RADIUS.Client({host: '127.0.0.1', secret: 'secret'});

client.request('Accounting-Request').then(function(p) {
	console.log('-- response --');
	console.log(p);
}).catch(function(e) {
	console.error(e);
});
