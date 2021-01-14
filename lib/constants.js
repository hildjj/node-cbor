'use strict'

// Let's get consistent first, then we can think about feature testing
// for BigNumber support
const {BigNumber} = require('bignumber.js')

exports.BigNumber = BigNumber

/**
 * @enum {number}
 */
exports.MT = {
  POS_INT: 0,
  NEG_INT: 1,
  BYTE_STRING: 2,
  UTF8_STRING: 3,
  ARRAY: 4,
  MAP: 5,
  TAG: 6,
  SIMPLE_FLOAT: 7
}

/**
 * @enum {number}
 */
exports.TAG = {
  DATE_STRING: 0,
  DATE_EPOCH: 1,
  POS_BIGINT: 2,
  NEG_BIGINT: 3,
  DECIMAL_FRAC: 4,
  BIGFLOAT: 5,
  BASE64URL_EXPECTED: 21,
  BASE64_EXPECTED: 22,
  BASE16_EXPECTED: 23,
  CBOR: 24,
  URI: 32,
  BASE64URL: 33,
  BASE64: 34,
  REGEXP: 35,
  MIME: 36
}

/**
 * @enum {number}
 */
exports.NUMBYTES = {
  ZERO: 0,
  ONE: 24,
  TWO: 25,
  FOUR: 26,
  EIGHT: 27,
  INDEFINITE: 31
}

/**
 * @enum {number}
 */
exports.SIMPLE = {
  FALSE: 20,
  TRUE: 21,
  NULL: 22,
  UNDEFINED: 23
}

exports.SYMS = {
  NULL: Symbol('null'),
  UNDEFINED: Symbol('undef'),
  PARENT: Symbol('parent'),
  BREAK: Symbol('break'),
  STREAM: Symbol('stream')
}

exports.SHIFT32 = 0x100000000

exports.BI = {
  MINUS_ONE: BigInt(-1),
  NEG_MAX: BigInt(-1) - BigInt(Number.MAX_SAFE_INTEGER),
  MAXINT32: BigInt('0xffffffff'),
  MAXINT64: BigInt('0xffffffffffffffff'),
  SHIFT32: BigInt(exports.SHIFT32)
}

const MINUS_ONE = new BigNumber(-1)
exports.BN = {
  MINUS_ONE,
  NEG_MAX: MINUS_ONE.minus(
    new BigNumber(Number.MAX_SAFE_INTEGER.toString(16), 16)),
  TWO: new BigNumber(2),
  MAXINT: new BigNumber('0x20000000000000'),
  MAXINT32: new BigNumber(0xffffffff),
  MAXINT64: new BigNumber('0xffffffffffffffff'),
  SHIFT32: new BigNumber(exports.SHIFT32)
}
