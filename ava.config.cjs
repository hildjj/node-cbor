'use strict';

const path = require('node:path');
const config = {
  files: ['./packages/*/test/*.ava.js'],
  timeout: '5m',
};

if (process.env.CBOR_PACKAGE) {
  const NODE_PATH = [
    path.resolve(__dirname, 'packages', 'cbor', 'node_modules'),
  ];
  if (process.env.NODE_PATH) {
    NODE_PATH.push(...process.env.NODE_PATH.split(path.delimiter));
  }
  config.environmentVariables = {
    NODE_PATH: NODE_PATH.join(path.delimiter),
  };
}
module.exports = config;
