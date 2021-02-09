#!/usr/bin/env node
'use strict'

const cbor = require('cbor')
const utils = require('../lib/utils')
const pkg = require('../package.json')
const {program} = require('commander')

program
  .version(pkg.version)
  .usage('[options] <file ...>')
  .option('-x, --hex', 'Hex string output')
  .option('-c, --canonical', 'Canonical output')
  .parse(process.argv)

const opts = program.opts()
const argv = program.args
if (argv.length === 0) {
  argv.push('-')
}

utils.streamFiles(argv, () => {
  const Parser = require('json-text-sequence').parser
  const p = new Parser()
  const d = new cbor.Encoder({canonical: opts.canonical})
  p.pipe(d)
  p.on('truncated', (b) => {
    try {
      d.write(JSON.parse(b))
    } catch (e) {
      e.message += ' for input ' + b.inspect()
      throw e
    }
  })
  let o = d
  if (opts.hex) {
    o = new utils.HexStream()
    d.pipe(o)
    o.on('end', () => process.stdout.write('\n'))
  }
  o.pipe(process.stdout)
  return p
}, utils.printError)
