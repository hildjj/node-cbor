'use strict'

const path = require('path')
const webpack = require('webpack')

module.exports = {
  entry: './lib/cbor.js',
  mode: 'production',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'cbor.js',
    library: 'cbor',
    libraryTarget: 'umd',
    globalObject: 'this'
  },
  target: 'web',
  externals: {
    'bignumber.js': 'BigNumber'
  },
  resolve: {
    fallback: {
      stream: 'stream-browserify',
      util: 'node-inspect-extracted'
    }
  },
  plugins: [
    new webpack.ProvidePlugin({
      process: 'process/browser'
    })
  ]

}
