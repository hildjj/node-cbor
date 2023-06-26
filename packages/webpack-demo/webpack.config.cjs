'use strict'

const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')

module.exports = {
  entry: './src/index-wp.js',
  output: {
    filename: 'bundle-wp.js',
    path: path.resolve(__dirname, 'dist'),
  },
  mode: 'development',
  target: 'web',

  // For debugging
  // devtool: 'inline-source-map',
  // optimization: {
  //   minimize: false,
  //   mangleExports: false,
  // },

  resolve: {
    // This causes things to work in a pnpm repo (with symlinks),
    // but means that the full set of dependencies of all dependencies
    // needs to be listed in package.json.
    symlinks: false,
    fallback: {
      stream: 'stream-browserify',
    },
  },

  plugins: [
    new HtmlWebpackPlugin({
      filename: 'index-wp.html',
      title: 'CBOR/web (webpack)',
      template: 'src/webpack.html',
    }),
  ],

  module: {
    rules: [
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
}
