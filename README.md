Encode and parse [CBOR](http://tools.ietf.org/html/draft-bormann-coap-misc-24#appendix-D.6.2) documents. 

Example:
```javascript
var cbor = require('cbor');
var packed = cbor.pack(true); // returns <Buffer d9>
cbor.unpack(packed, function(error, obj) {
  // error != null if there was an error
  // obj is the unpacked object
  assert.ok(obj === true);
});
```

More documentation to follow.