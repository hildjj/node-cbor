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
  externals: {
    'bignumber.js': {
      root: 'BigNumber',
      commonjs: 'bignumber.js',
      commonjs2: 'bignumber.js',
    },
  },
  target: 'web',
};
