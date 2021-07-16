# cbor-web

This package bundles the [cbor](../cbor) package for easy use on the web.  The following packages are bundled in as well, to reduce the degree of difficulty:

 - [buffer](https://github.com/feross/buffer)
 - [nofilter](https://github.com/hildjj/nofilter)
 - [process](https://github.com/shtylman/node-process)
 - [stream-browserify](https://github.com/browserify/stream-browserify)

## Examples

You can see `cbor-web` in action on the web [here](https://hildjj.github.io/node-cbor/example/).

## Ways to use this

 - you can load this in a script tag, which puts a `cbor` property on the
   window object:

```html
<script src='https://unpkg.com/bignumber.js'></script> <!-- optional -->

<script src='https://unpkg.com/cbor-web'></script>
```

 - You can bundle this with [parcel](https://github.com/parcel-bundler/parcel), [webpack](https://github.com/webpack/webpack), [browserify](https://github.com/browserify/browserify), etc.
 - You can `require('cbor-web')` from node.js, but I wouldn't recommend that unless you're trying to use the exact same paths for backend and frontend codebases, for example.
 - You can `import cbor from 'cbor-web'` in either node or in some web contexts.  Caveats to using in node are the same as above, but someimes you might *really* want an ES6 module, and be willing to deal with the downsides.  Note that as soon as Node 10 is no longer supported, the make `cbor` package will work toward becoming a native ES6 module.
