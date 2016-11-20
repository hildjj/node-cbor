'use strict'

const ieee754 = require('ieee754')
const Bignumber = require('bignumber.js')

const parser = require('./decoder.asm')
const utils = require('./utils')
const SHIFT32 = require('./constants').SHIFT32
const Simple = require('./simple')
const Tagged = require('./tagged')
const url = require('url')

const MAX_SAFE_HIGH = 0x1fffff
const NEG_ONE = new Bignumber(-1)
const TEN = new Bignumber(10)
const TWO = new Bignumber(2)

const PARENT_ARRAY = 0
const PARENT_OBJECT = 1
const PARENT_MAP = 2
const PARENT_TAG = 3
const PARENT_BYTE_STRING = 4
const PARENT_UTF8_STRING = 5

class Decoder {
  constructor (size) {
    if (!size || size < 0x10000) {
      size = 0x10000
    }

    // Heap use to share the input with the parser
    this._heap = new ArrayBuffer(size)
    this._heap8 = new Uint8Array(this._heap)

    this._reset()

    // Known tags
    this._knownTags = {
      0: (val) => new Date(val),
      1: (val) => new Date(val * 1000),
      2: (val) => utils.arrayBufferToBignumber(val),
      3: (val) => NEG_ONE.minus(utils.arrayBufferToBignumber(val)),
      4: (v) => {
        // const v = new Uint8Array(val)
        return TEN.pow(v[0]).times(v[1])
      },
      5: (v) => {
        // const v = new Uint8Array(val)
        return TWO.pow(v[0]).times(v[1])
      },
      32: (val) => url.parse(val),
      35: (val) => new RegExp(val)
    }

    // Initialize asm based parser
    this.parser = parser(global, {
      log: console.log.bind(console),
      pushInt: this.pushInt.bind(this),
      pushInt32: this.pushInt32.bind(this),
      pushInt32Neg: this.pushInt32Neg.bind(this),
      pushInt64: this.pushInt64.bind(this),
      pushInt64Neg: this.pushInt64Neg.bind(this),
      pushFloat: this.pushFloat.bind(this),
      pushFloatSingle: this.pushFloatSingle.bind(this),
      pushFloatDouble: this.pushFloatDouble.bind(this),
      pushTrue: this.pushTrue.bind(this),
      pushFalse: this.pushFalse.bind(this),
      pushUndefined: this.pushUndefined.bind(this),
      pushNull: this.pushNull.bind(this),
      pushInfinity: this.pushInfinity.bind(this),
      pushInfinityNeg: this.pushInfinityNeg.bind(this),
      pushNaN: this.pushNaN.bind(this),
      pushNaNNeg: this.pushNaNNeg.bind(this),
      pushArrayStart: this.pushArrayStart.bind(this),
      pushArrayStartFixed: this.pushArrayStartFixed.bind(this),
      pushArrayStartFixed32: this.pushArrayStartFixed32.bind(this),
      pushArrayStartFixed64: this.pushArrayStartFixed64.bind(this),
      pushObjectStart: this.pushObjectStart.bind(this),
      pushObjectStartFixed: this.pushObjectStartFixed.bind(this),
      pushObjectStartFixed32: this.pushObjectStartFixed32.bind(this),
      pushObjectStartFixed64: this.pushObjectStartFixed64.bind(this),
      pushByteString: this.pushByteString.bind(this),
      pushByteStringStart: this.pushByteStringStart.bind(this),
      pushUtf8String: this.pushUtf8String.bind(this),
      pushUtf8StringStart: this.pushUtf8StringStart.bind(this),
      pushSimpleUnassigned: this.pushSimpleUnassigned.bind(this),
      pushTagUnassigned: this.pushTagUnassigned.bind(this),
      pushTagStart: this.pushTagStart.bind(this),
      pushTagStart4: this.pushTagStart4.bind(this),
      pushTagStart8: this.pushTagStart8.bind(this),
      pushBreak: this.pushBreak.bind(this)
    }, this._heap)
  }

  get _depth () {
    return this._parents.length
  }

  get _currentParent () {
    return this._parents[this._depth - 1]
  }

  get _ref () {
    return this._currentParent.ref
  }

  // Finish the current parent
  _closeParent () {
    let p = this._parents.pop()

    if (p.length > 0) {
      throw new Error(`Missing ${p.length} elements`)
    }

    switch (p.type) {
      case PARENT_TAG:
        this._push(
          this._createTag(p.ref[0], p.ref[1])
        )
        break
      case PARENT_BYTE_STRING:
        this._push(new Uint8Array(p.ref))
        break
      case PARENT_UTF8_STRING:
        this._push(new Buffer(p.ref))
        break
      case PARENT_MAP:
      case PARENT_OBJECT:
        if (p.values % 2 > 0) {
          throw new Error('Odd number of elements in the map')
        }
        break
      default:
        break
    }

    if (this._currentParent && this._currentParent.type === PARENT_TAG) {
      this._dec()
    }
  }

  _createTag (tagNumber, value) {
    const typ = this._knownTags[tagNumber]

    if (!typ) {
      return new Tagged(tagNumber, value)
    }

    return typ(value)
  }

  // Reduce the expected length of the current parent by one
  _dec () {
    const p = this._currentParent
    // The current parent does not know the epxected child length

    if (p.length < 0) {
      return
    }

    p.length --

    // All children were seen, we can close the current parent
    if (p.length === 0) {
      this._closeParent()
    }
  }

  // Push any value to the current parent
  _push (val, hasChildren) {
    const p = this._currentParent
    p.values ++

    switch (p.type) {
      case PARENT_ARRAY:
      case PARENT_BYTE_STRING:
      case PARENT_UTF8_STRING:
        if (p.length > -1) {
          this._ref[this._ref.length - p.length] = val
        } else {
          this._ref.push(val)
        }
        this._dec()
        break
      case PARENT_OBJECT:
        if (p.tmpKey) {
          this._ref[p.tmpKey] = val
          p.tmpKey = null
          this._dec()
        } else {
          p.tmpKey = val

          if (typeof p.tmpKey !== 'string') {
            // too bad, convert to a Map
            p.type = PARENT_MAP
            p.ref = utils.buildMap(p.ref)
          }
        }
        break
      case PARENT_MAP:
        if (p.tmpKey != null) {
          this._ref.set(p.tmpKey, val)
          p.tmpKey = null
          this._dec()
        } else {
          p.tmpKey = val
        }
        break
      case PARENT_TAG:
        this._ref.push(val)
        if (!hasChildren) {
          this._dec()
        }
        break
      default:
        throw new Error('Unknown parent type')
    }
  }

  // Create a new parent in the parents list
  _createParent (obj, type, len) {
    this._push(obj, true)
    this._parents[this._depth] = {
      type: type,
      length: len,
      ref: obj,
      values: 0,
      tmpKey: null
    }
  }

  // Reset all state back to the beginning, also used for initiatlization
  _reset () {
    this._res = []
    this._parents = [{
      type: PARENT_ARRAY,
      length: -1,
      ref: this._res,
      values: 0,
      tmpKey: null
    }]
  }

  // -- Interface to customize deoding behaviour

  pushInt (val) {
    this._push(val)
  }

  pushInt32 (f, g) {
    this._push(utils.buildInt32(f, g))
  }

  pushInt64 (f1, f2, g1, g2) {
    this._push(utils.buildInt64(f1, f2, g1, g2))
  }

  pushFloat (val) {
    this._push(val)
  }

  pushFloatSingle (a, b, c, d) {
    this._push(
      ieee754.read([a, b, c, d], 0, false, 23, 4)
    )
  }

  pushFloatDouble (a, b, c, d, e, f, g, h) {
    this._push(
      ieee754.read([a, b, c, d, e, f, g, h], 0, false, 52, 8)
    )
  }

  pushInt32Neg (f, g) {
    this._push(-1 - utils.buildInt32(f, g))
  }

  pushInt64Neg (f1, f2, g1, g2) {
    const f = utils.buildInt32(f1, f2)
    const g = utils.buildInt32(g1, g2)

    if (f > MAX_SAFE_HIGH) {
      this._push(
        NEG_ONE.sub(new Bignumber(f).times(SHIFT32).plus(g))
      )
    } else {
      this._push(-1 - ((f * SHIFT32) + g))
    }
  }

  pushTrue () {
    this._push(true)
  }

  pushFalse () {
    this._push(false)
  }

  pushNull () {
    this._push(null)
  }

  pushUndefined () {
    this._push(void 0)
  }

  pushInfinity () {
    this._push(Infinity)
  }

  pushInfinityNeg () {
    this._push(-Infinity)
  }

  pushNaN () {
    this._push(NaN)
  }

  pushNaNNeg () {
    this._push(-NaN)
  }

  pushArrayStart () {
    this._createParent([], PARENT_ARRAY, -1)
  }

  pushArrayStartFixed (len) {
    this._createArrayStartFixed(len)
  }

  pushArrayStartFixed32 (len1, len2) {
    const len = utils.buildInt32(len1, len2)
    this._createArrayStartFixed(len)
  }

  pushArrayStartFixed64 (len1, len2, len3, len4) {
    const len = utils.buildInt64(len1, len2, len3, len4)
    this._createArrayStartFixed(len)
  }

  pushObjectStart () {
    this._createParent({}, PARENT_OBJECT, -1)
  }

  pushObjectStartFixed (len) {
    this._createObjectStartFixed(len)
  }

  pushObjectStartFixed32 (len1, len2) {
    const len = utils.buildInt32(len1, len2)
    this._createObjectStartFixed(len)
  }

  pushObjectStartFixed64 (len1, len2, len3, len4) {
    const len = utils.buildInt64(len1, len2, len3, len4)
    this._createObjectStartFixed(len)
  }

  pushByteStringStart () {
    this._parents[this._depth] = {
      type: PARENT_BYTE_STRING,
      length: -1,
      ref: [],
      values: 0,
      tmpKey: null
    }
  }

  pushByteString (start, end) {
    if (start === end) {
      this._push(new Buffer(0))
      return
    }

    this._push(new Uint8Array(this._heap.slice(start, end)))
  }

  pushUtf8StringStart () {
    this._parents[this._depth] = {
      type: PARENT_UTF8_STRING,
      length: -1,
      ref: [],
      values: 0,
      tmpKey: null
    }
  }

  pushUtf8String (start, end) {
    if (start === end) {
      this._push('')
      return
    }

    this._push(
      (new Buffer(this._heap.slice(start, end + 1))).toString('utf8')
    )
  }

  pushSimpleUnassigned (val) {
    this._push(new Simple(val))
  }

  pushTagStart (tag) {
    this._parents[this._depth] = {
      type: PARENT_TAG,
      length: 1,
      ref: [tag]
    }
  }

  pushTagStart4 (f, g) {
    this.pushTagStart(utils.buildInt32(f, g))
  }

  pushTagStart8 (f1, f2, g1, g2) {
    this.pushTagStart(utils.buildInt64(f1, f2, g1, g2))
  }

  pushTagUnassigned (tagNumber) {
    this._push(this._createTag(tagNumber))
  }

  pushBreak () {
    if (this._currentParent.length > -1) {
      throw new Error('Unexpected break')
    }

    this._closeParent()
  }

  _createObjectStartFixed (len) {
    this._createParent({}, PARENT_OBJECT, len)
  }

  _createArrayStartFixed (len) {
    this._createParent(new Array(len), PARENT_ARRAY, len)
  }

  _decode (input) {
    if (input.byteLength === 0) {
      throw new Error('Input too short')
    }

    this._reset()
    this._heap8.set(input)
    const code = this.parser.parse(input.byteLength)

    if (this._depth > 1) {
      while (this._currentParent.length === 0) {
        this._closeParent()
      }
      if (this._depth > 1) {
        throw new Error('Undeterminated nesting')
      }
    }

    if (code > 0) {
      throw new Error('Failed to parse')
    }

    if (this._res.length === 0) {
      throw new Error('No valid result')
    }
  }

  // -- Public Interface

  decodeFirst (input) {
    this._decode(input)

    return this._res[0]
  }

  decodeAll (input) {
    this._decode(input)

    return this._res
  }
}

Decoder.decode = function decode (input, enc) {
  if (typeof input === 'string') {
    input = new Buffer(input, enc || 'hex')
  }

  const dec = new Decoder()
  return dec.decodeFirst(input)
}

Decoder.decodeFirst = Decoder.decode

Decoder.decodeAll = function decode (input, enc) {
  if (typeof input === 'string') {
    input = new Buffer(input, enc || 'hex')
  }

  const dec = new Decoder()
  return dec.decodeAll(input)
}

module.exports = Decoder
