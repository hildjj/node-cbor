Encode and parse [CBOR](http://tools.ietf.org/html/rfc7049) documents.


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

parser.on('value',function(val,tags) {
  // An atomic item (not a map or array) was detected
  // `val`: the value
  // `tags`: an array of tags that preceded the list
  console.log(val);
});

// See the [docs](http://hildjj.github.io/node-cbor/doc/class/Evented.html) for a list of all of the events.

var s = fs.createReadStream('foo');
s.pipe(parser);
```

Developers
----------

For the moment, you'll need to manually install istanbul, nodeunit, and grunt-cli:

```
$ npm install -g grunt-cli nodeunit istanbul
$ grunt
Running "coffee:compile" (coffee) task

Running "nodeunit:all" (nodeunit) task
Testing BufferStream.test...............OK
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
