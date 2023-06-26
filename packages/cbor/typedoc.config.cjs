'use strict'

// eslint-disable-next-line jsdoc/imports-as-dependencies
/** @type {import('typedoc').TypeDocOptions} */
module.exports = {
  entryPoints: [
    './lib/cbor.js',
    './lib/commented.js',
    './lib/decoder.js',
    './lib/diagnose.js',
    './lib/encoder.js',
  ],
  out: '../../docs',
  cleanOutputDir: true,
  sidebarLinks: {
    GitHub: 'https://github.com/hildjj/node-cbor',
    Documentation: 'http://hildjj.github.io/node-cbor/',
    Playground: 'http://hildjj.github.io/node-cbor/example/',
    Spec: 'http://cbor.io/',
  },
  navigation: {
    includeCategories: false,
    includeGroups: false,
  },
  categorizeByGroup: false,
  sort: ['static-first', 'alphabetical'],
}
