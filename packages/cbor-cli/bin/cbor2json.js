#!/usr/bin/env node
'use strict'

const cbor = require('cbor')
const utils = require('../lib/utils')
const pkg = require('../package.json')

const {program} = require('commander')

program
  .version(pkg.version)
  .usage('[options] <file ...>')
  .option('-x, --hex <STRING>', 'Hex string input')
  .parse(process.argv)

const opts = program.opts()
const argv = program.args
if (opts.hex) {
  argv.push(new utils.DeHexStream(opts.hex))
}

if (argv.length === 0) {
  argv.push('-')
}

utils.streamFiles(argv, () => {
  const d = new cbor.Decoder()
  d.on('data', v => {
    console.log(JSON.stringify(v))
  })
  return d
}, utils.printError)
