'use strict'

const stream = require('stream')
const url = require('url')
const bignumber = require('bignumber.js')
const NoFilter = require('nofilter')
const Tagged = require('./tagged')
const Simple = require('./simple')
const utils = require('./utils')

const constants = require('./constants')
const MT = constants.MT, NUMBYTES = constants.NUMBYTES, SHIFT32 = constants.SHIFT32, SYMS = constants.SYMS, TAG = constants.TAG
const HALF = (constants.MT.SIMPLE_FLOAT << 5) | constants.NUMBYTES.TWO
const FLOAT = (constants.MT.SIMPLE_FLOAT << 5) | constants.NUMBYTES.FOUR
const DOUBLE = (constants.MT.SIMPLE_FLOAT << 5) | constants.NUMBYTES.EIGHT
const TRUE = (constants.MT.SIMPLE_FLOAT << 5) | constants.SIMPLE.TRUE
const FALSE = (constants.MT.SIMPLE_FLOAT << 5) | constants.SIMPLE.FALSE
const UNDEFINED = (constants.MT.SIMPLE_FLOAT << 5) | constants.SIMPLE.UNDEFINED
const NULL = (constants.MT.SIMPLE_FLOAT << 5) | constants.SIMPLE.NULL

const MAXINT_BN = new bignumber('0x20000000000000')
const BUF_NAN = new Buffer('f97e00', 'hex')
const BUF_INF_NEG = new Buffer('f9fc00', 'hex')
const BUF_INF_POS = new Buffer('f97c00', 'hex')

/**
 * Transform JavaScript values into CBOR bytes.  The `Writable` side of
 * the stream is in object mode.
 *
 * @extends {stream.Transform}
 */
class Encoder extends stream.Transform {

  /**
   * Creates an instance of Encoder.
   *
   * @param {Object} [options={}] - options for the encoder
   * @param {any[]} [options.genTypes=[]] - array of pairs of `type`,
   *   `function(Encoder)` for semantic types to be encoded.  Not needed
   *   for Array, Date, Buffer, Map, RegExp, Set, Url, or bignumber.
   * @param {boolean} [options.canonical=false] - should the output be
   *   canonicalized
   */
  constructor (options) {
    options = options || {}
    options.readableObjectMode = false
    options.writableObjectMode = true
    super(options)

    this.canonical = options.canonical
    this.semanticTypes = [
      Array, this._pushArray,
      Date, this._pushDate,
      Buffer, this._pushBuffer,
      Map, this._pushMap,
      NoFilter, this._pushNoFilter,
      RegExp, this._pushRegexp,
      Set, this._pushSet,
      url.Url, this._pushUrl,
      bignumber, this._pushBigNumber
    ]

    const addTypes = options.genTypes || []
    for (let i = 0, len = addTypes.length; i < len; i += 2) {
      this.addSemanticType(addTypes[i], addTypes[i + 1])
    }
  }

  _transform (fresh, encoding, cb) {
    const ret = this.pushAny(fresh)
    // Old transformers might not return bool.  undefined !== false
    return cb((ret === false) ? new Error('Push Error') : undefined)
  }

  _flush (cb) {
    return cb()
  }

  /**
   * @callback encodeFunction
   * @param {Encoder} encoder - the encoder to serialize into.  Call "write"
   *   on the encoder as needed.
   * @return {bool} - true on success, else false
   */

  /**
   * Add an encoding function to the list of supported semantic types.  This is
   * useful for objects for which you can't add an encodeCBOR method
   *
   * @param {any} type
   * @param {any} fun
   * @returns {encodeFunction}
   */
  addSemanticType (type, fun) {
    for (let i = 0, len = this.semanticTypes.length; i < len; i += 2) {
      const typ = this.semanticTypes[i]
      if (typ === type) {
        const old = this.semanticTypes[i + 1]
        this.semanticTypes[i + 1] = fun
        return old
      }
    }
    this.semanticTypes.push(type, fun)
    return null
  }

  _pushUInt8 (val) {
    const b = new Buffer(1)
    b.writeUInt8(val)
    return this.push(b)
  }

  _pushUInt16BE (val) {
    const b = new Buffer(2)
    b.writeUInt16BE(val)
    return this.push(b)
  }

  _pushUInt32BE (val) {
    const b = new Buffer(4)
    b.writeUInt32BE(val)
    return this.push(b)
  }

  _pushDoubleBE (val) {
    const b = new Buffer(8)
    b.writeDoubleBE(val)
    return this.push(b)
  }

  _pushNaN () {
    return this.push(BUF_NAN)
  }

  _pushInfinity (obj) {
    const half = (obj < 0) ? BUF_INF_NEG : BUF_INF_POS
    return this.push(half)
  }

  _pushFloat (obj) {
    if (this.canonical) {
      // TODO: is this enough slower to hide behind canonical?
      // It's certainly enough of a hack (see utils.parseHalf)

      // From section 3.9:
      // If a protocol allows for IEEE floats, then additional canonicalization
      // rules might need to be added.  One example rule might be to have all
      // floats start as a 64-bit float, then do a test conversion to a 32-bit
      // float; if the result is the same numeric value, use the shorter value
      // and repeat the process with a test conversion to a 16-bit float.  (This
      // rule selects 16-bit float for positive and negative Infinity as well.)

      // which seems pretty much backwards to me.
      const b2 = new Buffer(2)
      if (utils.writeHalf(b2, obj)) {
        if (utils.parseHalf(b2) === obj) {
          return this._pushUInt8(HALF) && this.push(b2)
        }
      }
      const b4 = new Buffer(4)
      b4.writeFloatBE(obj)
      if (b4.readFloatBE() === obj) {
        return this._pushUInt8(FLOAT) && this.push(b4)
      }
    }

    return this._pushUInt8(DOUBLE) && this._pushDoubleBE(obj)
  }

  _pushInt (obj, mt, orig) {
    const m = mt << 5
    switch (false) {
      case !(obj < 24):
        return this._pushUInt8(m | obj)
      case !(obj <= 0xff):
        return this._pushUInt8(m | NUMBYTES.ONE) && this._pushUInt8(obj)
      case !(obj <= 0xffff):
        return this._pushUInt8(m | NUMBYTES.TWO) && this._pushUInt16BE(obj)
      case !(obj <= 0xffffffff):
        return this._pushUInt8(m | NUMBYTES.FOUR) && this._pushUInt32BE(obj)
      case !(obj <= Number.MAX_SAFE_INTEGER):
        return this._pushUInt8(m | NUMBYTES.EIGHT) &&
          this._pushUInt32BE(Math.floor(obj / SHIFT32)) &&
          this._pushUInt32BE(obj % SHIFT32)
      default:
        if (mt === MT.NEG_INT) {
          return this._pushFloat(orig)
        } else {
          return this._pushFloat(obj)
        }
    }
  }

  _pushIntNum (obj) {
    if (obj < 0) {
      return this._pushInt(-obj - 1, MT.NEG_INT, obj)
    } else {
      return this._pushInt(obj, MT.POS_INT)
    }
  }

  _pushNumber (obj) {
    switch (false) {
      case !isNaN(obj):
        return this._pushNaN(obj)
      case isFinite(obj):
        return this._pushInfinity(obj)
      case Math.round(obj) !== obj:
        return this._pushIntNum(obj)
      default:
        return this._pushFloat(obj)
    }
  }

  _pushString (obj) {
    const len = Buffer.byteLength(obj, 'utf8')
    return this._pushInt(len, MT.UTF8_STRING) && this.push(obj, 'utf8')
  }

  _pushBoolean (obj) {
    return this._pushUInt8(obj ? TRUE : FALSE)
  }

  _pushUndefined (obj) {
    return this._pushUInt8(UNDEFINED)
  }

  _pushNull (obj) {
    return this._pushUInt8(NULL)
  }

  _pushArray (gen, obj) {
    const len = obj.length
    if (!gen._pushInt(len, MT.ARRAY)) {
      return false
    }
    for (let j = 0; j < len; j++) {
      if (!gen.pushAny(obj[j])) {
        return false
      }
    }
    return true
  }

  _pushTag (tag) {
    return this._pushInt(tag, MT.TAG)
  }

  _pushDate (gen, obj) {
    return gen._pushTag(TAG.DATE_EPOCH) && gen.pushAny(obj / 1000)
  }

  _pushBuffer (gen, obj) {
    return gen._pushInt(obj.length, MT.BYTE_STRING) && gen.push(obj)
  }

  _pushNoFilter (gen, obj) {
    return gen._pushBuffer(gen, obj.slice())
  }

  _pushRegexp (gen, obj) {
    return gen._pushTag(TAG.REGEXP) && gen.pushAny(obj.source)
  }

  _pushSet (gen, obj) {
    if (!gen._pushInt(obj.size, MT.ARRAY)) {
      return false
    }
    for (let x of obj) {
      if (!gen.pushAny(x)) {
        return false
      }
    }
    return true
  }

  _pushUrl (gen, obj) {
    return gen._pushTag(TAG.URI) && gen.pushAny(obj.format())
  }

  _pushBigint (obj) {
    let tag = TAG.POS_BIGINT
    if (obj.isNegative()) {
      obj = obj.negated().minus(1)
      tag = TAG.NEG_BIGINT
    }
    let str = obj.toString(16)
    if (str.length % 2) {
      str = '0' + str
    }
    const buf = new Buffer(str, 'hex')
    return this._pushTag(tag) && this._pushBuffer(this, buf)
  }

  _pushBigNumber (gen, obj) {
    if (obj.isNaN()) {
      return gen._pushNaN()
    }
    if (!obj.isFinite()) {
      return gen._pushInfinity(obj.isNegative() ? -Infinity : Infinity)
    }
    if (obj.isInteger()) {
      return gen._pushBigint(obj)
    }
    if (!(gen._pushTag(TAG.DECIMAL_FRAC) &&
      gen._pushInt(2, MT.ARRAY))) {
      return false
    }

    const dec = obj.decimalPlaces()
    const slide = obj.mul(new bignumber(10).pow(dec))
    if (!gen._pushIntNum(-dec)) {
      return false
    }
    if (slide.abs().lessThan(MAXINT_BN)) {
      return gen._pushIntNum(slide.toNumber())
    } else {
      return gen._pushBigint(slide)
    }
  }

  _pushMap (gen, obj) {
    if (!gen._pushInt(obj.size, MT.MAP)) {
      return false
    }
    // memoizing the cbor only helps in certain cases, and hurts in most
    // others.  Just avoid it.
    if (gen.canonical) {
      // keep the key/value pairs together, so we don't have to do odd
      // gets with object keys later
      const entries = []
      // iterator.  If we drop support for node4, use ...
      for (const e of obj.entries()) {
        entries.push(e)
      }
      entries.sort((a,b) => {
        // a, b are both entries of [key, value]
        const a_cbor = Encoder.encode(a[0])
        const b_cbor = Encoder.encode(b[0])
        return a_cbor.compare(b_cbor)
      })
      for (const kv of entries) {
        if (!(gen.pushAny(kv[0]) && gen.pushAny(kv[1]))) {
          return false
        }
      }
    } else {
      for (const kv of obj) {
        if (!(gen.pushAny(kv[0]) && gen.pushAny(kv[1]))) {
          return false
        }
      }
    }
    return true
  }

  _pushObject (obj) {
    if (!obj) {
      return this._pushNull(obj)
    }
    for (let i = 0, len1 = this.semanticTypes.length; i < len1; i += 2) {
      const typ = this.semanticTypes[i]
      if (obj instanceof typ) {
        return this.semanticTypes[i + 1].call(obj, this, obj)
      }
    }
    const f = obj.encodeCBOR
    if (typeof f === 'function') {
      return f.call(obj, this)
    }
    const keys = Object.keys(obj)
    const cbor_keys = {}
    if (this.canonical) {
      // note: this can't be a normal sort, because 'b' needs to sort before
      // 'aa'
      keys.sort((a, b) => {
        // Always strings, so don't bother to pass options.
        // hold on to the cbor versions, since there's no need
        // to encode more than once
        const a_cbor = cbor_keys[a] || (cbor_keys[a] = Encoder.encode(a))
        const b_cbor = cbor_keys[b] || (cbor_keys[b] = Encoder.encode(b))

        return a_cbor.compare(b_cbor)
      })
    }
    if (!this._pushInt(keys.length, MT.MAP)) {
      return false
    }
    let ck
    for (let j = 0, len2 = keys.length; j < len2; j++) {
      const k = keys[j]
      if (this.canonical && ((ck = cbor_keys[k]))) {
        if (!this.push(ck)) { // already a Buffer
          return false
        }
      } else {
        if (!this._pushString(k)) {
          return false
        }
      }
      if (!this.pushAny(obj[k])) {
        return false
      }
    }

    return true
  }

  /**
   * Push any supported type onto the encoded stream
   *
   * @param {any} obj
   * @returns {boolean} true on success
   */
  pushAny (obj) {
    switch (typeof obj) {
      case 'number':
        return this._pushNumber(obj)
      case 'string':
        return this._pushString(obj)
      case 'boolean':
        return this._pushBoolean(obj)
      case 'undefined':
        return this._pushUndefined(obj)
      case 'object':
        return this._pushObject(obj)
      case 'symbol':
        switch (obj) {
          case SYMS.NULL:
            return this._pushNull(null)
          case SYMS.UNDEFINED:
            return this._pushUndefined(void 0)
          // TODO: Add pluggable support for other symbols
          default:
            throw new Error('Unknown symbol: ' + obj.toString())
        }
      default:
        throw new Error('Unknown type: ' + typeof obj + ', ' + (!!obj ? obj.toString() : ''))
    }
  }

  /* backwards-compat wrapper */
  _pushAny (obj) {
    // TODO: write deprecation warning
    return this.pushAny(obj)
  }

  _encodeAll (objs) {
    const bs = new NoFilter()
    this.pipe(bs)
    for (let o of objs) {
      if (typeof o === 'undefined') {
        this._pushUndefined()
      } else if (o === null) {
        this._pushNull(null)
      } else {
        this.write(o)
      }
    }
    this.end()
    return bs.read()
  }

  /**
   * Encode one or more JavaScript objects, and return a Buffer containing the
   * CBOR bytes.
   *
   * @param {...any} objs - the objects to encode
   * @returns {Buffer} - the encoded objects
   */
  static encode () {
    const objs = Array.prototype.slice.apply(arguments)
    return new Encoder()._encodeAll(objs)
  }

  /**
   * Encode one or more JavaScript objects canonically (slower!), and return
   * a Buffer containing the CBOR bytes.
   *
   * @param {...any} objs - the objects to encode
   * @returns {Buffer} - the encoded objects
   */
  static encodeCanonical () {
    const objs = Array.prototype.slice.apply(arguments)
    return new Encoder({canonical: true})._encodeAll(objs)
  }
}

module.exports = Encoder
