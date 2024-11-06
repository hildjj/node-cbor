# cbor-rn-prereqs

Make it easier to use the cbor package in React Native.

## MOVE TO CBOR2

**NOTE**

All users of this library should move to the
[cbor2](https://github.com/hildjj/cbor2) library.  It is where most
maintenance and support and all new features are happening.  This set of
workarounds has always been lightly-maintained, since React Native's JS
implementation is... not that similar to other modern runtimes.

*Only* catastrophic bugs will be fixed in this library going forward.

## Installation:

```bash
$ npm install --save cbor cbor-rn-prereqs
```

Ensure you have a file named `metro.config.js` in your project root, and that
it contains at least this:

```js
module.exports = {
  resolver: {
    extraNodeModules: {
      stream: require.resolve('stream-browserify'),
    },
  },
};
```

`require` this package *before* importing or requiring `cbor`:

```js
require('cbor-rn-prereqs');
const cbor = require('cbor');
```

## What this does

This package bundles up a few additions to the JavaScript-like environment
that React Native provides.  In particular:

- BigInt support using [big-integer](https://github.com/peterolson/BigInteger.js#readme), which gets installed globally if React Native's version of JSC is too old to have BigInt support.  IMO, this is fixing a React Native bug.
- process.nextTick() from [process](https://github.com/shtylman/node-process#readme).  If there is no `process` in your environment, all of the `process` package gets installed globally.  If there is, but it doesn't have `nextTick`, just `nextTick` will be added to the existing global `process` instance.
- A small and non-full-featured implementation of TextDecoder from [@cto.af/textdecoder](https://github.com/hildjj/ctoaf-textdecoder#readme), which gets installed globally.  IMO this is also a React Native bug.
- A few dependencies that replace functionality available in node, from [buffer](https://github.com/feross/buffer), [events](https://github.com/Gozala/events#readme), and [stream-browserify](https://github.com/browserify/stream-browserify)

`stream-browserify` needs to be made available when packages do `require('stream')`, which is enabled by the `metro.config.js` change above.

