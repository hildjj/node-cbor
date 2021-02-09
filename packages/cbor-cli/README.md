cbor-cli
====

A command-line interface for encoding and parse data in the Concise Binary Object Representation (CBOR) data format ([RFC7049](http://tools.ietf.org/html/rfc7049)).

Installation:
------------

```bash
$ npm install -g cbor-cli
```

**NOTE**
This package now requires node.js 8.3 or higher.  It will work on node.js 6, in
a less-tested, less-featureful way.  Please start upgrading if it is possible
for you.

Documentation:
-------------
There is a full [API](http://github.com/hildjj/node-cbor/).

From the command line:
```
$ bin/json2cbor package.json > package.cbor
$ bin/cbor2json package.cbor
$ bin/cbor2diag package.cbor
```

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
* url.URL
* [bignumber](https://github.com/MikeMcl/bignumber.js)

Decoding supports the above types, including the following CBOR tag numbers:

| Tag | Generated Type |
|-----|----------------|
| 0   | Date           |
| 1   | Date           |
| 2   | bignumber      |
| 3   | bignumber      |
| 4   | bignumber      |
| 5   | bignumber      |
| 32  | url.URL        |
| 35  | RegExp         |
