#!/usr/bin/env node
'use strict'

const cbor = require('cbor')
const utils = require('../lib/utils')
const pkg = require('../package.json')
const {program} = require('commander')
const path = require('path')
const stream = require('stream')
const Module = require('module')
const { Buffer } = require('buffer') // Not the mangled version
const bdec = require('cbor-bigdecimal')
bdec(cbor)

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

// Overly-fancy `require`, so we can take modules on stdin.
// reads stream until it's done, then eval's the code and returns
// module.exports.
class ModuleStream extends stream.Transform {
  constructor(filename) {
    super({
      readableObjectMode: true,
    })
    this.bufs = []
    this.filename = filename
  }

  _transform(chunk, encoding, callback) {
    this.bufs.push(chunk)
    callback()
  }

  _flush() {
    const m = new Module(this.filename, module)
    m.filename = this.filename
    m.paths = Module._nodeModulePaths(path.dirname(this.filename))
    m._compile(Buffer.concat(this.bufs).toString('utf8'), this.filename)
    this.push(m.exports)
  }
}

utils.streamFiles(argv, f => {
  const m = new ModuleStream(f)
  const d = new cbor.Encoder({canonical: opts.canonical})
  m.on('data', mod => {
    if (typeof mod === 'function') {
      mod = mod(f)
    }
    d.end(mod)
  })
  let o = d
  if (opts.hex) {
    o = new utils.HexStream()
    d.pipe(o)
    o.on('end', () => process.stdout.write('\n'))
  }
  o.pipe(process.stdout)
  return m
}).catch(utils.printError)
