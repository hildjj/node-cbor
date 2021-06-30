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

exports.streamFiles = async function streamFiles(files, streamFunc) {
  for (const f of files) {
    await new Promise((resolve, reject) => {
      const sf = streamFunc(f)
      sf.on('end', resolve)
      sf.on('error', reject)

      const s = (f === '-') ?
        process.stdin :
        (f instanceof stream.Stream) ? f : fs.createReadStream(f)
      s.on('error', reject)
      s.pipe(sf)
    })
  }
}
