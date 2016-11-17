'use strict'

const fs = require('fs')
const stream = require('stream')
const Bignumber = require('bignumber.js')

const constants = require('./constants')
const NUMBYTES = constants.NUMBYTES
const SHIFT32 = constants.SHIFT32
const SHIFT16 = constants.SHIFT16
const MAX_SAFE_HIGH = 0x1fffff

exports.parseCBORint = function (ai, buf) {
  var f, g
  switch (ai) {
    case NUMBYTES.ONE:
      return buf.readUInt8(0, true)
    case NUMBYTES.TWO:
      return buf.readUInt16BE(0, true)
    case NUMBYTES.FOUR:
      return buf.readUInt32BE(0, true)
    case NUMBYTES.EIGHT:
      f = buf.readUInt32BE(0)
      g = buf.readUInt32BE(4)
      if (f > MAX_SAFE_HIGH) {
        return new Bignumber(f).times(SHIFT32).plus(g)
      } else {
        return (f * SHIFT32) + g
      }
    default:
      throw new Error('Invalid additional info for int: ' + ai)
  }
}

exports.parseHalf = function parseHalf (buf) {
  var exp, mant, sign
  sign = buf[0] & 0x80 ? -1 : 1
  exp = (buf[0] & 0x7C) >> 2
  mant = ((buf[0] & 0x03) << 8) | buf[1]
  if (!exp) {
    return sign * 5.9604644775390625e-8 * mant
  } else if (exp === 0x1f) {
    return sign * (mant ? 0 / 0 : 2e308)
  } else {
    return sign * Math.pow(2, exp - 25) * (1024 + mant)
  }
}

exports.parseCBORfloat = function (buf) {
  switch (buf.length) {
    case 2:
      return exports.parseHalf(buf)
    case 4:
      return buf.readFloatBE(0, true)
    case 8:
      return buf.readDoubleBE(0, true)
    default:
      throw new Error('Invalid float size: ' + buf.length)
  }
}

exports.hex = function (s) {
  return new Buffer(s.replace(/^0x/, ''), 'hex')
}

exports.bin = function (s) {
  var chunks, end, start
  s = s.replace(/\s/g, '')
  start = 0
  end = (s.length % 8) || 8
  chunks = []
  while (end <= s.length) {
    chunks.push(parseInt(s.slice(start, end), 2))
    start = end
    end += 8
  }
  return new Buffer(chunks)
}

exports.arrayEqual = function (a, b) {
  if ((a == null) && (b == null)) {
    return true
  }
  if ((a == null) || (b == null)) {
    return false
  }
  return (a.length === b.length) && a.every(function (elem, i) {
    return elem === b[i]
  })
}

exports.bufferEqual = function (a, b) {
  var byte
  var i
  var j
  var len
  var ret

  if ((a == null) && (b == null)) {
    return true
  }
  if ((a == null) || (b == null)) {
    return false
  }
  if (!(Buffer.isBuffer(a) && Buffer.isBuffer(b) && (a.length === b.length))) {
    return false
  }
  ret = true
  for (i = j = 0, len = a.length; j < len; i = ++j) {
    byte = a[i]
    ret &= b[i] === byte
  }
  return Boolean(ret)
}

exports.bufferToBignumber = function (buf) {
  return new Bignumber(buf.toString('hex'), 16)
}

exports.DeHexStream = class DeHexStream extends stream.Readable {
  constructor (hex) {
    super()
    hex = hex.replace(/^0x/, '')
    if (hex) {
      this.push(new Buffer(hex, 'hex'))
    }
    this.push(null)
  }
}

exports.HexStream = class HexStream extends stream.Transform {
  _transform (fresh, encoding, cb) {
    this.push(fresh.toString('hex'))
    return cb()
  }
}

function printError (er) {
  if (er != null) {
    return console.log(er)
  }
}

exports.streamFiles = function (files, streamFunc, cb) {
  if (cb == null) {
    cb = printError
  }
  const f = files.shift()
  if (!f) {
    return cb()
  }
  const sf = streamFunc()
  sf.on('end', function () {
    return exports.streamFiles(files, streamFunc, cb)
  })
  sf.on('error', cb)
  const s = (f === '-') ? process.stdin : (f instanceof stream.Stream) ? f : fs.createReadStream(f)
  s.on('error', cb)
  return s.pipe(sf)
}

exports.guessEncoding = function (input) {
  switch (false) {
    case typeof input !== 'string':
      return 'hex'
    case !Buffer.isBuffer(input):
      return undefined
    default:
      throw new Error('Unknown input type')
  }
}

// convert an Object into a Map
exports.buildMap = (obj) => {
  const res = new Map()
  const keys = Object.keys(obj)
  const length = keys.length
  for (let i = 0; i < length; i++) {
    res.set(keys[i], obj[keys[i]])
  }
  return res
}

exports.buildInt32 = (f, g) => {
  return f * SHIFT16 + g
}

exports.buildInt64 = (f1, f2, g1, g2) => {
  const f = exports.buildInt32(f1, f2)
  const g = exports.buildInt32(g1, g2)

  if (f > MAX_SAFE_HIGH) {
    return new Bignumber(f).times(SHIFT32).plus(g)
  } else {
    return (f * SHIFT32) + g
  }
}
