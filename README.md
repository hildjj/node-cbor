# CBOR

Encode and parse data in the Concise Binary Object Representation (CBOR) data format ([RFC7049](http://tools.ietf.org/html/rfc7049)).

## Pointers

This is a monorepo that holds a few related packages:

 - [cbor](packages/cbor): a node-centric CBOR processor
 - [cbor-web](packages/cbor-web): the `cbor` package compiled for use on the
   web, including all of its non-optional dependencies
 - [cbor-cli](packages/cbor-cli): a set of command-line tools for working with
   the `cbor` package
 - Examples:
   - [webpack-demo](packages/webpack-demo): bundle `cbor` using [webpack](https://webpack.js.org/)
   - [parcel-demo](packages/parcel-demo): bundle `cbor` using [parcel](https://parceljs.org/)
   - [browserify-demo](packages/browserify-demo): bundle `cbor` using [browserify](http://browserify.org/)
   - [plain-demo](packages/plain-demo): bundle `cbor` by just using `cbor-web` directly

## Supported Node.js versions

This project now only supports versions of Node that the Node team is [currently supporting](https://github.com/nodejs/Release#release-schedule).  Ava's [support statement](https://github.com/avajs/ava/blob/master/docs/support-statement.md) is what we will be using as well.  Currently, that means Node `10`+ is required.  If you need to support an older version of Node (back to version 6), use cbor version 5.2.x, which will get nothing but security updates from here on out.
