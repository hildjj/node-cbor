import {Commented} from './commented.js'
import {Decoder} from './decoder.js'
import {Diagnose} from './diagnose.js'
import {Encoder} from './encoder.js'
export {Simple} from './simple.js'
import {Tagged} from './tagged.js'
export {CborMap as Map} from './map.js'
export {SharedValueEncoder} from './sharedValueEncoder.js'

const {decodeAll, decodeAllSync, decodeFirst, decodeFirstSync} = Decoder
const {comment} = Commented
const {diagnose} = Diagnose
const {encode, encodeAsync, encodeCanonical, encodeOne} = Encoder
const decode = decodeFirstSync

/**
 * The codec information for
 * {@link https://github.com/Level/encoding-down encoding-down}, which is a
 * codec framework for leveldb.  CBOR is a particularly convenient format for
 * both keys and values, as it can deal with a lot of types that JSON can't
 * handle without losing type information.
 *
 * @example
 * const level = require('level')
 * const cbor = require('cbor')
 *
 * async function putget() {
 *   const db = level('./db', {
 *     keyEncoding: cbor.leveldb,
 *     valueEncoding: cbor.leveldb,
 *   })
 *
 *   await db.put({a: 1}, 9857298342094820394820394820398234092834n)
 *   const val = await db.get({a: 1})
 * }
 */
const leveldb = {
  decode: Decoder.decodeFirstSync,
  encode: Encoder.encode,
  buffer: true,
  name: 'cbor',
}

export {
  Decoder,
  decode,
  decodeAll,
  decodeAllSync,
  decodeFirst,
  decodeFirstSync,
  Commented,
  comment,
  Diagnose,
  diagnose,
  Encoder,
  encode,
  encodeAsync,
  encodeCanonical,
  encodeOne,
  Tagged,
  leveldb,
}

/**
 * Reset all CBOR state information.
 */
export function reset() {
  Encoder.reset()
  Tagged.reset()
}
