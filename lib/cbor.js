'use strict'

exports.Commented = require('./commented')
exports.Diagnose = require('./diagnose')
exports.Decoder = require('./decoder')
exports.Encoder = require('./encoder')
exports.Simple = require('./simple')
exports.Tagged = require('./tagged')

exports.comment = exports.Commented.comment
exports.decodeAll = exports.Decoder.decodeAll
exports.decodeFirst = exports.Decoder.decodeFirst
exports.decodeAllSync = exports.Decoder.decodeAllSync
exports.decodeFirstSync = exports.Decoder.decodeFirstSync
exports.diagnose = exports.Diagnose.diagnose
exports.encode = exports.Encoder.encode
exports.encodeCanonical = exports.Encoder.encodeCanonical
exports.decode = exports.Decoder.decodeFirstSync

exports.leveldb = {
  decode: exports.Decoder.decodeAllSync,
  encode: exports.Encoder.encode,
  buffer: true,
  name: 'cbor'
}
