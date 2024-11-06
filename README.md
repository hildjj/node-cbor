# CBOR

Encode and parse data in the Concise Binary Object Representation (CBOR) data
format ([RFC8949](https://www.rfc-editor.org/rfc/rfc8949.html)).

## MOVE TO CBOR2

**NOTE**

All new users and most existing users of these libraries should move to the
[cbor2](https://github.com/hildjj/cbor2) library.  It is where most
maintenance and support and all new features are happening.

*Only* catastrophic bugs will be fixed in these libraries going forward.

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

## Tooling

- Install with `pnpm install -r`, [see](https://pnpm.js.org/).  The important
   thing (for example) is that the `cbor-cli` package ends up depending on the
   local version of `cbor`.
- monorepo-wide scripts:
  - `install-global` (make available everywhere) or `install-local` (use
     `npx` if you want to us it outside a package script) install all of the
     tooling that might be needed locally, but isn't needed on CI
  - `deploy`: build and deploy `cbor-web` and all of the actions
  - `coverage`: run tests and report coverage; look in `coverage/lcov-report/index.html`.
  - `lint`: run eslint over all projects

## GitHub dependencies

If you really need to get at a specific rev from GitHub, you can no longer do
`npm install hildjj/node-cbor`.  Instead you need:

    npm install https://gitpkg.now.sh/hildjj/node-cbor/packages/cbor?main

## Supported Node.js versions

This project now only supports versions of Node that the Node team is [currently supporting](https://github.com/nodejs/Release#release-schedule).  Ava's [support statement](https://github.com/avajs/ava/blob/main/docs/support-statement.md) is what we will be using as well.  Currently, that means Node `16`+ is required.  If you need to support an older version of Node (back to version 6), use cbor version 5.2.x, which will get nothing but security updates from here on out.
