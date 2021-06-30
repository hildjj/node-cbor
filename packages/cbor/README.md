# cbor

Encode and parse data in the Concise Binary Object Representation (CBOR) data format ([RFC7049](http://tools.ietf.org/html/rfc7049)).

## Supported Node.js versions

This project now only supports versions of Node that the Node team is
[currently supporting](https://github.com/nodejs/Release#release-schedule).
Ava's [support
statement](https://github.com/avajs/ava/blob/main/docs/support-statement.md)
is what we will be using as well.  Currently, that means Node `10`+ is
required.  If you need to support an older version of Node (back to version
6), use cbor version 5.2.x, which will get nothing but security updates from
here on out.

## Installation:

```bash
$ npm install --save cbor
# optional, if you need big floats or big decimals:
$ npm install --save bignumber.js
```

**NOTE**
If you are going to use this on the web, use [cbor-web](../cbor-web) instead.

## Documentation:

See the full API [documentation](http://hildjj.github.io/node-cbor/).

For a command-line interface, see [cbor-cli](../cbor-cli).

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

```javascript
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

## highWaterMark

The synchronous routines for encoding and decoding will have problems with
objects that are larger than 16kB, which the default buffer size for Node
streams.  There are a few ways to fix this:

1) pass in a `highWaterMark` option with the value of the largest buffer size you think you will need:

```javascript
cbor.encodeOne(Buffer.alloc(40000), {highWaterMark: 65535})
```

2) use stream mode.  Catch the `data`, `finish`, and `error` events.  Make sure to call `end()` when you're done.

```javascript
const enc = new cbor.Encoder()
enc.on('data', buf => /* send the data somewhere */)
enc.on('error', console.error)
enc.on('finish', () => /* tell the consumer we are finished */)

enc.end(['foo', 1, false])
```

3) use `encodeAsync()`, which uses the approach from approach 2 to return a memory-inefficient promise for a Buffer.

## Supported types

The following types are supported for encoding:

* boolean
* number (including -0, NaN, and ±Infinity)
* string
* Array, Set (encoded as Array)
* Object (including null), Map
* undefined
* Buffer
* Date,
* RegExp
* URL
* TypedArrays, ArrayBuffer, DataView
* Map, Set
* BigInt
* [bignumber](https://github.com/MikeMcl/bignumber.js) (If you install it.  It is needed for big float and big decimal types)

Decoding supports the above types, including the following CBOR tag numbers:

| Tag | Generated Type      |
|-----|---------------------|
| 0   | Date                |
| 1   | Date                |
| 2   | BigInt              |
| 3   | BigInt              |
| 4   | bignumber           |
| 5   | bignumber           |
| 21  | Tagged, with toJSON |
| 22  | Tagged, with toJSON |
| 23  | Tagged, with toJSON |
| 32  | URL                 |
| 33  | Tagged              |
| 34  | Tagged              |
| 35  | RegExp              |
| 64  | Uint8Array          |
| 65  | Uint16Array         |
| 66  | Uint32Array         |
| 67  | BigUint64Array      |
| 68  | Uint8ClampedArray   |
| 69  | Uint16Array         |
| 70  | Uint32Array         |
| 71  | BigUint64Array      |
| 72  | Int8Array           |
| 73  | Int16Array          |
| 74  | Int32Array          |
| 75  | BigInt64Array       |
| 77  | Int16Array          |
| 78  | Int32Array          |
| 79  | BigInt64Array       |
| 81  | Float32Array        |
| 82  | Float64Array        |
| 85  | Float32Array        |
| 86  | Float64Array        |
| 258 | Set                 |

## Adding new Encoders

There are several ways to add a new encoder:

### `encodeCBOR` method

This is the easiest approach, if you can modify the class being encoded.  Add an
`encodeCBOR` method to your class, which takes a single parameter of the encoder
currently being used.  Your method should return `true` on success, else `false`.
Your method may call `encoder.push(buffer)` or `encoder.pushAny(any)` as needed.

For example:

```javascript
class Foo {
  constructor () {
    this.one = 1
    this.two = 2
  }
  encodeCBOR (encoder) {
    const tagged = new Tagged(64000, [this.one, this.two])
    return encoder.pushAny(tagged)
  }
}
```

You can also modify an existing type by monkey-patching an `encodeCBOR` function
onto its prototype, but this isn't recommended.

### `addSemanticType`

Sometimes, you want to support an existing type without modification to that
type.  In this case, call `addSemanticType(type, encodeFunction)` on an existing
`Encoder` instance. The `encodeFunction` takes an encoder and an object to
encode, for example:

```javascript
class Bar {
  constructor () {
    this.three = 3
  }
}
const enc = new Encoder()
enc.addSemanticType(Bar, (encoder, b) => {
  encoder.pushAny(b.three)
})
```

## Adding new decoders

Most of the time, you will want to add support for decoding a new tag type.  If
the Decoder class encounters a tag it doesn't support, it will generate a `Tagged`
instance that you can handle or ignore as needed.  To have a specific type
generated instead, pass a `tags` option to the `Decoder`'s constructor, consisting
of an object with tag number keys and function values.  The function will be
passed the decoded value associated with the tag, and should return the decoded
value.  For the `Foo` example above, this might look like:

```javascript
const d = new Decoder({tags: { 64000: (val) => {
  // check val to make sure it's an Array as expected, etc.
  const foo = new Foo()
  foo.one = val[0]
  foo.two = val[1]
  return foo
}}})
```

You can also replace the default decoders by passing in an appropriate tag
function.  For example:

```javascript
cbor.decodeFirstSync(input, {
  tags: {
    // Replace the Tag 0 (RFC3339 Date/Time string) decoder.
    // See https://tc39.es/proposal-temporal/docs/ for the upcoming
    // Temporal built-in, which supports nanosecond time:
    0: x => Temporal.Instant.from(x)
  }
})
```

Developers
----------

The tests for this package use a set of test vectors from RFC 7049 appendix A
by importing a machine readable version of them from
https://github.com/cbor/test-vectors. For these tests to work, you will need
to use the command `git submodule update --init` after cloning or pulling this
code.   See https://gist.github.com/gitaarik/8735255#file-git_submodules-md
for more information.

Get a list of build steps with `npm run`.  I use `npm run dev`, which rebuilds,
runs tests, and refreshes a browser window with coverage metrics every time I
save a `.js` file.  If you don't want to run the fuzz tests every time, set
a `NO_GARBAGE` environment variable:

```
env NO_GARBAGE=1 npm run dev
```

[![Build Status](https://github.com/hildjj/node-cbor/workflows/Tests/badge.svg)](https://github.com/hildjj/node-cbor/actions?query=workflow%3ATests)
[![Coverage Status](https://coveralls.io/repos/hildjj/node-cbor/badge.svg?branch=main)](https://coveralls.io/r/hildjj/node-cbor?branch=main)
