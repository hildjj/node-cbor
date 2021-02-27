'use strict'

const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')

module.exports = {
  entry: './src/index-wp.js',
  output: {
    filename: 'bundle-wp.js',
    path: path.resolve(__dirname, 'dist')
  },
  mode: 'development',
  target: 'web',

  // this will be loaded from the .html file in a <script> tag
  externals: {
    util: '{}'
  },

  resolve: {
    // this causes things to work in a pnpm repo (with symlinks),
    // but means that the full set of dependencies of all dependencies
    // needs to be listed in package.json.
    symlinks: false
  },

  plugins: [
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
