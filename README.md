[![Build Status](https://api.travis-ci.org/hildjj/node-cbor.png)](https://travis-ci.org/hildjj/node-cbor)
[![Coverage Status](https://coveralls.io/repos/hildjj/node-cbor/badge.png?branch=master)](https://coveralls.io/r/hildjj/node-cbor?branch=master)
[![Dependency status](https://david-dm.org/hildjj/node-cbor/status.png)](https://david-dm.org/hildjj/node-cbor#info=dependencies&view=table)
[![Dev Dependency Status](https://david-dm.org/hildjj/node-cbor/dev-status.png)](https://david-dm.org/hildjj/node-cbor#info=devDependencies&view=table)

Encode and parse [CBOR](http://tools.ietf.org/html/draft-bormann-coap-misc-24#appendix-D.6.2) documents.

See the [documentation](http://hildjj.github.io/node-cbor/doc/) and [test results](http://hildjj.github.io/node-cbor/covershot/).

Installation:

```
$ npm install cbor
```

From the command line:
```
$ bin/json2cbor package.json > package.cbor
$ bin/cbor2json package.cbor
$ bin/cbor2diag package.cbor
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
s.pipe(d);

var d2 = new cbor.Decoder({input: '00', encoding: 'hex'});
d.on('complete', function(obj){
  console.log(obj);
});
d2.start(); // needed when you don't use the stream interface
```

And also a SAX-type mode (which the streaming mode wraps):

```javascript
var cbor = require('cbor');
var fs = require('fs');

var parser = new cbor.Evented();

// `kind` is one of the following strings:
// 'value': an atomic value was detected
// 'array-first': the first element of an array
// 'array': an item after the first in an array
// 'key-first': the first key in a map
// 'key': a key other than the first in a map
// 'stream-first': the first item in an indefinite encoding
// 'stream': an item other than the first in an indefinite encoding
// null: the end of a top-level CBOR item

parser.on('value',function(val,tags,kind) {
  // An atomic item (not a map or array) was detected
  // `val`: the value
  // `tags`: an array of tags that preceded the list
  // `kind`: see above
  console.log(val);
});
parser.on('array-start', function(count,tags,kind) {
  // `count`: The number of items in the array.  -1 if indefinite length.
  // `tags`: An array of tags that preceded the list
  // `kind`: see above
});
parser.on('array-stop', function(count,tags,kind) {
  // `count`: The actual number of items in the array.
  // `tags`: An array of tags that preceded the list
  // `kind`: see above
});
parser.on('map-start', function(count,tags,kind) {
  // `count`: The number of pairs in the map.  -1 if indefinite length.
  // `tags`: An array of tags that preceded the list
  // `kind`: see above
});
parser.on('map-stop', function(count,tags,kind) {
  // `count`: The actual number of pairs in the map.
  // `tags`: An array of tags that preceded the list
  // `kind`: see above
});
parser.on('stream-start', function(mt,tags,kind) {
  // The start of a CBOR indefinite length bytestring or utf8-string.
  // `mt`: The major type for all of the items
  // `tags`: An array of tags that preceded the list
  // `kind`: see above
});
parser.on('stream-stop', function(count,mt,tags,kind) {
  // We got to the end of a CBOR indefinite length bytestring or utf8-string.
  // `count`: The number of constituent items
  // `mt`: The major type for all of the items
  // `tags`: An array of tags that preceded the list
  // `kind`: see above
});
parser.on('end', function() {
  // the end of the input
});
parser.on('error', function(er) {
  // parse error such as invalid input
});

var s = fs.createReadStream('foo');
s.pipe(parser);
```

Test coverage is currently above 95%.