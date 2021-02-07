'use strict'

const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const webpack = require('webpack')

module.exports = {
  entry: './src/index-wp.js',
  output: {
    filename: 'bundle-wp.js',
    path: path.resolve(__dirname, '..', '..', 'docs', 'example')
  },
  mode: 'development',
  target: 'web',

  resolve: {
    fallback: {
      process: 'process',
      stream: 'stream-browserify',
      util: 'node-inspect-extracted'
    }
  },

  plugins: [
    // new webpack.ProvidePlugin({
    //   process: 'process/browser'
    // }),
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
