Encode and parse [CBOR](http://tools.ietf.org/html/draft-bormann-coap-misc-24#appendix-D.6.2) documents. 

Example:
	var cbor = require('cbor');
	var packed = cbor.pack(true); # returns <Buffer 58>
	cbor.unpack(packed); # returns true