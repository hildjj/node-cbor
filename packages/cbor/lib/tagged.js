'use strict'

const constants = require('./constants')
const utils = require('./utils')
const { Buffer } = require('buffer')

function setBuffersToJSON(obj, fn) {
  // The data item tagged can be a byte string or any other data item.  In the
  // latter case, the tag applies to all of the byte string data items
  // contained in the data item, except for those contained in a nested data
  // item tagged with an expected conversion.
  if (Buffer.isBuffer(obj)) {
    obj.toJSON = fn
  } else if (Array.isArray(obj)) {
    for (const v of obj) {
      setBuffersToJSON(v, fn)
    }
  } else if (obj && (typeof obj === 'object')) {
    // ffs, complexity in the protocol.
    if (!(obj instanceof Tagged) || (obj.tag < 21) || (obj.tag > 23)) {
      for (const v of Object.values(obj)) {
        setBuffersToJSON(v, fn)
      }
    }
  }
}

const INTERNAL_JSON = Symbol('INTERNAL_JSON')
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
   * @param {Error} [err] - the error that was thrown parsing the tag, or null
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

  toJSON() {
    if (this[INTERNAL_JSON]) {
      return this[INTERNAL_JSON]()
    }
    const ret = {
      tag: this.tag,
      value: this.value
    }
    if (this.err) {
      ret.err = this.err
    }
    return ret
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
   * @param {Object} gen The generator to push onto
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
      return f.call(this, this.value)
    } catch (error) {
      if (error && error.message && (error.message.length > 0)) {
        this.err = error.message
      } else {
        this.err = error
      }
      return this
    }
  }

  // Standard date/time string; see Section 3.4.1
  static _tag_0(v) {
    return new Date(v)
  }

  // Epoch-based date/time; see Section 3.4.2
  static _tag_1(v) {
    return new Date(v * 1000)
  }

  // Positive bignum; see Section 3.4.3
  static _tag_2(v) {
    // (note: replaced by bigint version in decoder.js when bigint on)
    return utils.bufferToBignumber(v) // throws if no BigNumber
  }

  // Negative bignum; see Section 3.4.3
  static _tag_3(v) {
    // (note: replaced by bigint version in decoder.js when bigint on)
    const pos = utils.bufferToBignumber(v) // throws if no BigNumber
    return constants.BN.MINUS_ONE.minus(pos)
  }

  // Decimal fraction; see Section 3.4.4
  static _tag_4(v) {
    if (!constants.BigNumber) {
      throw new Error('No bignumber.js')
    }
    return new constants.BigNumber(v[1]).shiftedBy(v[0])
  }

  // Bigfloat; see Section 3.4.4
  static _tag_5(v) {
    if (!constants.BigNumber) {
      throw new Error('No bignumber.js')
    }
    return constants.BN.TWO.pow(v[0]).times(v[1])
  }

  // Expected conversion to base64url encoding; see Section 3.4.5.2
  static _tag_21(v) {
    if (Buffer.isBuffer(v)) {
      this[INTERNAL_JSON] = () => utils.base64url(v)
    } else {
      setBuffersToJSON(v, function() { // no =>, honor `this`
        return utils.base64url(this)
      })
    }
    return this
  }

  // Expected conversion to base64 encoding; see Section 3.4.5.2
  static _tag_22(v) {
    if (Buffer.isBuffer(v)) {
      this[INTERNAL_JSON] = () => v.toString('base64')
    } else {
      setBuffersToJSON(v, function() { // no =>, honor `this`
        return this.toString('base64')
      })
    }
    return this
  }

  // Expected conversion to base16 encoding; see Section Section 3.4.5.2
  static _tag_23(v) {
    if (Buffer.isBuffer(v)) {
      this[INTERNAL_JSON] = () => v.toString('hex')
    } else {
      setBuffersToJSON(v, function() { // no =>, honor `this`
        return this.toString('hex')
      })
    }
    return this
  }

  // URI; see Section 3.4.5.3
  static _tag_32(v) {
    return new URL(v)
  }

  // base64url; see Section 3.4.5.3
  static _tag_33(v) {
    // If any of the following apply:
    // -  the encoded text string contains non-alphabet characters or
    //    only 1 alphabet character in the last block of 4 (where
    //    alphabet is defined by Section 5 of [RFC4648] for tag number 33
    //    and Section 4 of [RFC4648] for tag number 34), or
    if (!v.match(/^[a-zA-Z0-9_-]+$/)) {
      throw new Error('Invalid base64url characters')
    }
    const last = v.length % 4
    if (last === 1) {
      throw new Error('Invalid base64url length')
    }
    // -  the padding bits in a 2- or 3-character block are not 0, or
    if (last === 2) {
      // The last 4 bits of the last character need to be zero.
      if ('AQgw'.indexOf(v[v.length-1]) === -1) {
        throw new Error('Invalid base64 padding')
      }
    } else if (last === 3) {
      // The last 2 bits of the last character need to be zero.
      if ('AEIMQUYcgkosw048'.indexOf(v[v.length-1]) === -1) {
        throw new Error('Invalid base64 padding')
      }
    }

    //    or
    // -  the base64url encoding has padding characters,
    // (caught above)

    // the string is invalid.
    return this
  }

  // base64; see Section 3.4.5.3
  static _tag_34(v) {
    // If any of the following apply:
    // -  the encoded text string contains non-alphabet characters or
    //    only 1 alphabet character in the last block of 4 (where
    //    alphabet is defined by Section 5 of [RFC4648] for tag number 33
    //    and Section 4 of [RFC4648] for tag number 34), or
    const m = v.match(/^[a-zA-Z0-9+/]+(={0,2})$/)
    if (!m) {
      throw new Error('Invalid base64url characters')
    }
    if ((v.length % 4) !== 0) {
      throw new Error('Invalid base64url length')
    }
    // -  the padding bits in a 2- or 3-character block are not 0, or
    if (m[1] === '=') {
      // The last 4 bits of the last character need to be zero.
      if ('AQgw'.indexOf(v[v.length-2]) === -1) {
        throw new Error('Invalid base64 padding')
      }
    } else if (m[1] === '==') {
      // The last 2 bits of the last character need to be zero.
      if ('AEIMQUYcgkosw048'.indexOf(v[v.length-3]) === -1) {
        throw new Error('Invalid base64 padding')
      }
    }

    // -  the base64 encoding has the wrong number of padding characters,
    // (caught above)
    // the string is invalid.
    return this
  }

  // Regular expression; see Section 2.4.4.3
  static _tag_35(v) {
    return new RegExp(v)
  }
}
Tagged.INTERNAL_JSON = INTERNAL_JSON
module.exports = Tagged
