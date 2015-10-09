cbor
====

Encode and parse data in the Concise Binary Object Representation (CBOR) data format ([RFC7049](http://tools.ietf.org/html/rfc7049)).

Installation:
------------

```
$ npm install cbor
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
  assert.ok(obj[0] === true);
});
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
d2.start(); // needed when you don't use the stream interface
```

Developers
----------

For the moment, you'll need to manually install istanbul, nodeunit, and grunt-cli:

```
$ npm install -g grunt-cli nodeunit istanbul
$ grunt
Running "coffee:compile" (coffee) task

Running "nodeunit:all" (nodeunit) task
Testing decoder.test.....OK
Testing diagnose.test...OK
Testing encoder.test.......OK
Testing evented.test....OK
Testing simple.test.OK
Testing tagged.test..OK
Testing utils.test.......OK
>> 459 assertions passed (129ms)

Done, without errors.
```


[![Build Status](https://api.travis-ci.org/hildjj/node-cbor.png)](https://travis-ci.org/hildjj/node-cbor)
[![Coverage Status](https://coveralls.io/repos/hildjj/node-cbor/badge.png?branch=master)](https://coveralls.io/r/hildjj/node-cbor?branch=master)
[![Dependency Status](https://david-dm.org/hildjj/node-cbor.png)](https://david-dm.org/hildjj/node-cbor)
