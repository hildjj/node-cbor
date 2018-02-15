'use strict'

const encoder = require('./encoder')
const decoder = require('./decoder')
const constants = require('./constants')
const MT = constants.MT

/**
 * Wrapper around a JavaScript Map object that allows the keys to be
 * any complex type.  The base Map object allows this, but will only
 * compare the keys by identity, not by value.  CborMap translates keys
 * to CBOR first (and base64's them to ensure by-value comparison).
 *
 * This is not a subclass of Object, because it would be tough to get
 * the semantics to be an exact match.
 *
 * @class CborMap
 * @extends {Map}
 */
class CborMap extends Map {
  /**
   * Creates an instance of CborMap.
   * @param {Iterable<Array<any, any>>} args
   */
  constructor(iterable) {
    super(iterable)
  }
  static _encode(key) {
    return encoder.encodeCanonical(key).toString('base64')
  }
  static _decode(key) {
    return decoder.decodeFirstSync(key, 'base64')
  }
  get(key) {
    return super.get(CborMap._encode(key))
  }
  set(key, val) {
    return super.set(CborMap._encode(key), val)
  }
  delete(key) {
    return super.delete(CborMap._encode(key))
  }
  has(key) {
    return super.has(CborMap._encode(key))
  }
  *keys() {
    for (const k of super.keys()) {
      yield CborMap._decode(k)
    }
  }
  *entries() {
    for (const [k, v] of super.entries()) {
      yield [CborMap._decode(k), v]
    }
  }
  [Symbol.iterator]() {
    return this.entries()
  }
  forEach(fun) {
    if (typeof(fun) !== 'function') {
      throw new TypeError('Must be function')
    }
    for (const [k, v] of super.entries()) {
      fun.call(this, v, CborMap._decode(k), this)
    }
  }
  encodeCBOR(gen) {
    if (!gen._pushInt(this.size, MT.MAP)) {
      return false
    }
    if (gen.canonical) {
      const entries = Array.from(super.entries())
        .map(([k, v]) => [new Buffer(k, 'base64'), v])
      entries.sort((a, b) => a[0].compare(b[0]))
      for (const [k, v] of entries) {
        if (!(gen.push(k) && gen.pushAny(v))) {
          return false
        }
      }
    } else {
      for (const [k, v] of super.entries()) {
        if (!(gen.push(new Buffer(k, 'base64')) && gen.pushAny(v))) {
          return false
        }
      }
    }
    return true
  }
}

module.exports = CborMap