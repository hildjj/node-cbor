import {Readable, Transform} from 'stream'
import {getMangled} from './cases.js'

const {Buffer} = getMangled()

export class DeHexStream extends Readable {
  constructor(hex) {
    super()
    hex = hex.replace(/^0x/, '')
    if (hex) {
      this.push(Buffer.from(hex, 'hex'))
    }
    this.push(null)
  }
}

export class HexStream extends Transform {
  constructor(options) {
    super(options)
  }

  _transform(fresh, encoding, cb) {
    this.push(fresh.toString('hex'))
    return cb()
  }
}
