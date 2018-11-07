'use strict'

const bignumber = require('bignumber.js')
const utils = require('./utils')
const url = require('url')
const int64 = require('int64-buffer')
const Int64LE = int64.Int64LE
const Uint64LE = int64.Uint64LE
const Int64BE = int64.Int64BE
const Uint64BE = int64.Uint64BE
const ieee754 = require('ieee754')

const MINUS_ONE = new bignumber(-1)
const TEN = new bignumber(10)
const TWO = new bignumber(2)

/**
 * A CBOR tagged item, where the tag does not have semantics specified at the
 * moment, or those semantics threw an error during parsing. Typically this will
 * be an extension point you're not yet expecting.
 */
class Tagged {

  /**
   * Creates an instance of Tagged.
   *
   * @param {number} tag - the number of the tag
   * @param {any} value - the value inside the tag
   * @param {Error} err - the error that was thrown parsing the tag, or null
   */
  constructor(tag, value, err) {
    this.tag = tag
    this.value = value
    this.err = err
    if (typeof this.tag !== 'number') {
      throw new Error('Invalid tag type (' + (typeof this.tag) + ')')
    }
    if ((this.tag < 0) || ((this.tag | 0) !== this.tag)) {
      throw new Error('Tag must be a positive integer: ' + this.tag)
    }
  }

  /**
   * Convert to a String
   *
   * @returns {string} string of the form '1(2)'
   */
  toString() {
    return `${this.tag}(${JSON.stringify(this.value)})`
  }

  /**
   * Push the simple value onto the CBOR stream
   *
   * @param {cbor.Encoder} gen The generator to push onto
   */
  encodeCBOR(gen) {
    gen._pushTag(this.tag)
    return gen.pushAny(this.value)
  }

  /**
   * If we have a converter for this type, do the conversion.  Some converters
   * are built-in.  Additional ones can be passed in.  If you want to remove
   * a built-in converter, pass a converter in whose value is 'null' instead
   * of a function.
   *
   * @param {Object} converters - keys in the object are a tag number, the value
   *   is a function that takes the decoded CBOR and returns a JavaScript value
   *   of the appropriate type.  Throw an exception in the function on errors.
   * @returns {any} - the converted item
   */
  convert(converters) {
    let f = converters != null ? converters[this.tag] : void 0
    if (typeof f !== 'function') {
      f = Tagged['_tag_' + this.tag]
      if (typeof f !== 'function') {
        return this
      }
    }
    try {
      return f.call(Tagged, this.value)
    } catch (error) {
      this.err = error
      return this
    }
  }

  static _tag_0(v) {
    return new Date(v)
  }

  static _tag_1(v) {
    return new Date(v * 1000)
  }

  static _tag_2(v) {
    return utils.bufferToBignumber(v)
  }

  static _tag_3(v) {
    return MINUS_ONE.minus(utils.bufferToBignumber(v))
  }

  static _tag_4(v) {
    return TEN.pow(v[0]).times(v[1])
  }

  static _tag_5(v) {
    return TWO.pow(v[0]).times(v[1])
  }

  static _tag_32(v) {
    return url.parse(v)
  }

  static _tag_35(v) {
    return new RegExp(v)
  }

  static _extract_native(v, ArrayType, extractor, bytesPer, littleEndian) {
    const bufOffset = v.byteOffset
    const len = v.byteLength / bytesPer
    const arr = new ArrayType(len)
    const dv = new DataView(v.buffer)
    for (let i = 0; i < len; i++) {
      const offset = (i * bytesPer) + bufOffset
      arr[i] = dv[extractor](offset, littleEndian)
    }
    return arr
  }

  static _extract_float16(v, littleEndian) {
    const len = v.byteLength / 2
    const arr = new Array(len)
    for (let i = 0; i < len; i++) {
      arr[i] = ieee754.read(v, i * 2, littleEndian, 10, 2)
    }
    return arr
  }

  static _tag_65(v) {
    return Tagged._extract_native(v, Uint16Array, 'getUint16', 2, false)
  }

  static _tag_66(v) {
    return Tagged._extract_native(v, Uint32Array, 'getUint32', 4, false)
  }

  static _tag_67(v) {
    const buf = v.buffer.slice(v.byteOffset, v.byteOffset + v.byteLength)
    return new Uint64BE(buf)
  }

  static _tag_68(v) {
    const buf = v.buffer.slice(v.byteOffset, v.byteOffset + v.byteLength)
    return new Uint8ClampedArray(buf)
  }

  static _tag_69(v) {
    return Tagged._extract_native(v, Uint16Array, 'getUint16', 2, true)
  }

  static _tag_70(v) {
    return Tagged._extract_native(v, Uint32Array, 'getUint32', 4, true)
  }

  static _tag_71(v) {
    const buf = v.buffer.slice(v.byteOffset, v.byteOffset + v.byteLength)
    return new Uint64LE(buf)
  }

  static _tag_72(v) {
    const buf = v.buffer.slice(v.byteOffset, v.byteOffset + v.byteLength)
    return new Int8Array(buf)
  }

  static _tag_73(v) {
    return Tagged._extract_native(v, Int16Array, 'getInt16', 2, false)
  }

  static _tag_74(v) {
    return Tagged._extract_native(v, Int32Array, 'getInt32', 4, false)
  }

  static _tag_75(v) {
    const buf = v.buffer.slice(v.byteOffset, v.byteOffset + v.byteLength)
    return new Int64BE(buf)
  }

  static _tag_77(v) {
    return Tagged._extract_native(v, Int16Array, 'getInt16', 2, true)
  }

  static _tag_78(v) {
    return Tagged._extract_native(v, Int32Array, 'getInt32', 4, true)
  }

  static _tag_79(v) {
    const buf = v.buffer.slice(v.byteOffset, v.byteOffset + v.byteLength)
    return new Int64LE(buf)
  }

  static _tag_80(v) {
    return Tagged._extract_float16(v, false)
  }

  static _tag_81(v) {
    return Tagged._extract_native(v, Float32Array, 'getFloat32', 4, false)
  }

  static _tag_82(v) {
    return Tagged._extract_native(v, Float64Array, 'getFloat64', 8, false)
  }

  static _tag_84(v) {
    return Tagged._extract_float16(v, true)
  }

  static _tag_85(v) {
    return Tagged._extract_native(v, Float32Array, 'getFloat32', 4, true)
  }

  static _tag_86(v) {
    return Tagged._extract_native(v, Float64Array, 'getFloat64', 8, true)
  }
}

module.exports = Tagged
