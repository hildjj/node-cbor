'use strict'

const {BigNumber} = require('bignumber.js')
let cbor = null

const MAXINT = new BigNumber('0x20000000000000')
const TWO = new BigNumber(2)

function pushBigNumber(gen, obj) {
  if (obj.isNaN()) {
    return gen._pushNaN()
  }
  if (!obj.isFinite()) {
    return gen._pushInfinity(obj.isNegative() ? -Infinity : Infinity)
  }
  if (obj.isInteger()) {
    return gen._pushJSBigint(BigInt(obj.toFixed()))
  }

  // Section 3.4.4, decimal fraction
  if (!(gen._pushTag(4) &&
    gen._pushInt(2, 4))) { // Array
    return false
  }

  const dec = obj.decimalPlaces()
  const slide = obj.shiftedBy(dec)
  if (!gen._pushIntNum(-dec)) {
    return false
  }
  if (slide.abs().isLessThan(MAXINT)) {
    return gen._pushIntNum(slide.toNumber())
  }
  return gen._pushJSBigint(BigInt(slide.toFixed()))
}

// Decimal fraction; see Section 3.4.4
function tag_4(v) {
  return new BigNumber(v[1]).shiftedBy(v[0])
}

// Bigfloat; see Section 3.4.4
function tag_5(v) {
  return TWO.pow(v[0]).times(v[1])
}

function addBigDecimal(inCBOR) {
  cbor = inCBOR
  cbor.Encoder.SEMANTIC_TYPES[BigNumber.name] = pushBigNumber
  cbor.Tagged.TAGS[4] = tag_4
  cbor.Tagged.TAGS[5] = tag_5
}

addBigDecimal.BigNumber = BigNumber
module.exports = addBigDecimal
