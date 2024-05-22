#!/bin/sh

radclient -r 1 127.0.0.1:1812 auth secret <<__EOT__
User-Name = myuser
User-Password = mypass
Framed-Protocol = 1
NAS-IP-Address = 10.1.2.1
Proxy-State = testing
Cisco-Call-Type = "VSA test"

__EOT__
