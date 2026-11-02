'use strict';
const path = require('node:path');

module.exports = {
  entry: './bigdecimal.js',
  mode: 'production',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'cbor-bigdecimal.js',
    library: 'cborBigDecimal',
    libraryTarget: 'umd',
    globalObject: 'this',
  },
  target: 'web',
};
