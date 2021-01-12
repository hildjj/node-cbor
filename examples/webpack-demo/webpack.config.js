'use strict'

const path = require('path')
const NodePolyfillPlugin = require('node-polyfill-webpack-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')

module.exports = {
  entry: './src/index-wp.js',
  output: {
    filename: 'bundle-wp.js',
    path: path.resolve(__dirname, '..', '..', 'docs', 'example')
  },
  mode: 'development',

  plugins: [
    new NodePolyfillPlugin(),
    new HtmlWebpackPlugin({
      filename: 'index-wp.html',
      title: 'CBOR/web (webpack)',
      template: 'src/webpack.html'
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
