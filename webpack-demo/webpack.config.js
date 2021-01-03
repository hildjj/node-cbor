'use strict'

const path = require('path')
const NodePolyfillPlugin = require('node-polyfill-webpack-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')

module.exports = {
  entry: './src/index.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, '..', 'docs', 'example')
  },
  mode: 'development',

  plugins: [
    new NodePolyfillPlugin(),
    new HtmlWebpackPlugin({
      title: 'CBOR for the web',
      template: 'src/index.html'
    })
  ],

  module: {
    rules: [
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader']
      }
    ]
  }
}
