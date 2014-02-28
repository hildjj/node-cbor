Encode and parse [CBOR](http://tools.ietf.org/html/draft-bormann-coap-misc-24#appendix-D.6.2) documents.

Installation:

```
$ npm install node-cbor
```

Example:
```javascript
var cbor = require('cbor');
var encoded = cbor.encode(true); // returns <Buffer d9>
cbor.decode(encoded, function(error, obj) {
  // error != null if there was an error
  // obj is the unpacked object
  assert.ok(obj === true);
});
```

Allows streaming as well:

```javascript
var cbor = require('cbor');
var fs = require('fs');

var d = new cbor.Decoder();
d.on('complete', function(obj){
  console.log(obj);
});

var s = fs.createReadStream('foo');
d.unpack(s); // TODO: make Decoder a WritableStream so pipe works
```

And also a SAX-type mode (which the streaming mode wraps):

```javascript
var cbor = require('cbor');
parser.on('value', on_value);
parser.on('array start', on_array_start);
parser.on('array stop', on_array_stop);
parser.on('map start', on_map_start);
parser.on('map stop', on_map_stop);
parser.on('stream start', on_stream_start);
parser.on('stream stop', on_stream_stop);
parser.on('end', on_end);
parser.on('error', on_eror);
```

(documentation coming for the event callbacks)

Test coverage is currently about 95%.