'use strict'

const fs = require('fs')
const stream = require('stream')
const { Buffer } = require('buffer') // not the mangled version

exports.DeHexStream = class DeHexStream extends stream.Readable {
  constructor(hex) {
    super()
    hex = hex.replace(/^0x/, '')
    if (hex) {
      this.push(Buffer.from(hex, 'hex'))
    }
    this.push(null)
  }
}

exports.HexStream = class HexStream extends stream.Transform {
  constructor(options) {
    super(options)
  }

  _transform(fresh, encoding, cb) {
    this.push(fresh.toString('hex'))
    return cb()
  }
}

exports.printError = function printError(er) {
  if (er != null) {
    console.error(er)
  }
}

exports.streamFiles = function streamFiles(files, streamFunc, cb) {
  const f = files.shift()
  if (!f) {
    return cb()
  }
  const sf = streamFunc(f)
  // go to the next file
  sf.on('end', () => exports.streamFiles(files, streamFunc, cb))
  sf.on('error', cb)
  const s = (f === '-') ?
    process.stdin :
    (f instanceof stream.Stream) ? f : fs.createReadStream(f)
  s.on('error', cb)
  return s.pipe(sf)
}
