#!/bin/sh

radclient -r 1 127.0.0.1:1813 acct secret <<__EOT__
User-Name = ray
Framed-Protocol = 1
NAS-IP-Address = 10.1.2.1
Proxy-State = testing
__EOT__
