#!/usr/bin/env node
/* eslint-disable no-console */
'use strict'

const cbor = require('../src')
const utils = require('../src/utils')
const pkg = require('../package.json')

const opts = require('commander')
  .version(pkg.version)
  .usage('[options] <file ...>')
  .option('-x, --hex [STRING]', 'Hex string input')
  .parse(process.argv)

const argv = opts.args
if (opts.hex) {
  argv.push(new utils.DeHexStream(opts.hex))
}

if (argv.length === 0) {
  argv.push('-')
}

utils.streamFiles(argv, function () {
  const d = new cbor.Decoder()
  d.on('data', function (v) {
    console.log(JSON.stringify(v))
  })
  return d
})
