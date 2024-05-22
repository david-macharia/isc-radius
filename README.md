ISC RADIUS Framework
====================

This package is a framework for writing RADIUS servers and for
implementing RADIUS clients in NodeJS.

It is not a full-featured server.  Users of the framework must supply
business logic functions, e.g.  to authenticate users or to save
accounting records, while the framework itself takes care of the
protocol implementation itself.

For the core RADIUS protocol specification, see [RFC
2865](https://tools.ietf.org/html/rfc2865) and [RFC
2866](https://tools.ietf.org/html/rfc2866).

This code has no third-party runtime dependencies.

NB: this is an early R&D release, not deployed in production.  It has
been tested for interopability by testing with the radclient package
included with FreeRADIUS.

Servers
-------

Framework users create business logic by writing and registering
callback functions with this signature:

    function handler(req, res)

where:

* `req` is a read-only `RadiusPacket` object containing the
   received RADIUS request

* `res` is a `RadiusPacket` object that may be modified (e.g.
   by overriding the response code or by adding additional
   Attributes)

and then registering them with the server with the `.use` method, e.g.:

    new RADIUS.Server()
        .loadDictionary('dictionary.rfc2865')
        .use({
            auth: myAuthenticationFunc,
            acct: myAccountingFunc
        })
        .start();

For an example server, see `test-server.js`.  This trivial server
accepts only one combination of valid username and password
(myuser/mypass) and will reject all others.  A second handler then adds
a default IP address and Subnet mask (e.g. for dynamic dialup) for any
successful login.

Callback functions are invoked _asynchronously_ and return a `Promise`.
If that Promise resolves to a "truthy" value the response is sent
immediately and no further handlers will be invoked.  If a callback
function throws an exception (resulting in a rejected Promise) then
processing is aborted and no response is sent.

The default behaviour with no callbacks registered is:

- `Access-Request` packets generate `Access-Reject`

- `Accounting-Request` packets generate `Accounting-Response`

- `Server-Status` packets are not passed to the callbacks but are handled
internally within the framework.   They generate either `Access-Accept`
or `Accounting-Response` depending upon which port the packet was
received.

- All other packet types are ignored

Clients
-------

The framework has support for making outbound RADIUS requests.  This was
primarily added to support the case where the framework is being used to
act as a proxy between a client and another server, but it can also be
used to add RADIUS client support to any NodeJS application.

See `test-auth-node.js` and `test-acct-node.js` for examples.

RADIUS Dictionaries
-------------------

Only the base RFC 2865 and 2866 dictionary files are included.   If you
need further dictionary files (e.g. for Vendor-Specific support) please
obtain those from the FreeRADIUS package (version 3.x).

Note that the framework does not (yet) support the RADIUS Extensions
described in [RFC 6929](https://tools.ietf.org/html/rfc6929).
Dictionary entries using those extensions are ignored.

Limitations
-----------

Only PAP authentication is supported in the current release.  There
is no EAP support.

Documentation
-------------

All API functions have documentation in jsdoc format in the docs/ folder.
To rebuild them (e.g. if building from git) run `npm install` from the
project folder and then `npm run docs`.

Design Goals
------------

Most objects within the framework are designed to be unmodifiable to
help prevent third party modules from changing the behaviour of the
system.

For example, a received `RadiusPacket` that is passed as the `request`
parameter to a callback function cannot be modified, although the
`response` packet can be modified by changing its response code or by
adding (but not removing) attributes.

Support
-------

This software is provided free-of-charge and without warranty of any
kind, although issues may be reported on the [project's ISC Gitlab page]
(https://gitlab.isc.org/isc-projects/isc-radius).
# isc-radius
