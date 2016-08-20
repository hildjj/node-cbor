cbor
====

Encode and parse data in the Concise Binary Object Representation (CBOR) data format ([RFC7049](http://tools.ietf.org/html/rfc7049)).

Installation:
------------

```bash
$ npm install --save cbor
```

**NOTE**
This package now requires node.js 4.1 or higher.  If you want a version that
works with older node.js versions, you can install like this:

```bash
npm install 'hildjj/node-cbor#node0' --save
```

Documentation:
-------------
See the full API [documentation](http://hildjj.github.io/node-cbor/doc/).

From the command line:
```
$ bin/json2cbor package.json > package.cbor
$ bin/cbor2json package.cbor
$ bin/cbor2diag package.cbor
```

Example:
```javascript
var cbor = require('cbor');
var assert = require('assert');

var encoded = cbor.encode(true); // returns <Buffer f5>
cbor.decodeFirst(encoded, function(error, obj) {
  // error != null if there was an error
  // obj is the unpacked object
  assert.ok(obj === true);
});

// Use integers as keys?
var m = new Map();
m.set(1, 2);
encoded = cbor.encode(m); // <Buffer a1 01 02>
```

Allows streaming as well:

```javascript
var cbor = require('cbor');
var fs = require('fs');

var d = new cbor.Decoder();
d.on('data', function(obj){
  console.log(obj);
});

var s = fs.createReadStream('foo');
s.pipe(d);

var d2 = new cbor.Decoder({input: '00', encoding: 'hex'});
d.on('data', function(obj){
  console.log(obj);
});
```

There is also support for synchronous decodes:

```
try {
  console.log(cbor.decodeFirstSync('02')); // 2
  console.log(cbor.decodeAllSync('0202')); // [2, 2]
} catch (e) {
  // throws on invalid input
}
```

The sync encoding and decoding are exported as a
[leveldb encoding](https://github.com/Level/levelup#custom_encodings), as
`cbor.leveldb`.

Developers
----------

Get a list of build steps with `npm run`.  I use `npm run dev`, which rebuilds,
runs tests, and refreshes a browser window with coverage metrics every time I
save a `.coffee` file.  If you don't want to run the fuzz tests every time, set
a `NO_GARBAGE` environment variable:

```
env NO_GARBAGE=1 npm run dev
```

[![Build Status](https://api.travis-ci.org/hildjj/node-cbor.png)](https://travis-ci.org/hildjj/node-cbor)
[![Coverage Status](https://coveralls.io/repos/hildjj/node-cbor/badge.png?branch=master)](https://coveralls.io/r/hildjj/node-cbor?branch=master)
[![Dependency Status](https://david-dm.org/hildjj/node-cbor.png)](https://david-dm.org/hildjj/node-cbor)
