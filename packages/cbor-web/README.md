# cbor-web

This package bundles the [cbor](../cbor) package for easy use on the web.  The following packages are bundled in as well, to reduce the degree of difficulty:

 - [buffer](https://github.com/feross/buffer)
 - [node-inspect-extracted](https://github.com/hildjj/node-inspect-extracted)
 - [nofilter](https://github.com/hildjj/nofilter)
 - [process](https://github.com/shtylman/node-process)
 - [stream-browserify](https://github.com/browserify/stream-browserify)

In addition, if you want support for big decimal and big float numbers, you'll
need your own version of
[bignumber.js](https://github.com/MikeMcl/bignumber.js).  Decoding `c4820a0a`
(hex) will give you a BigNumber if you have everything installed correctly.

## Ways to use this

 - you can load this in a script tag, which puts a `cbor` property on the
   window object:
    <script src='https://unpkg.com/cbor-web'>
