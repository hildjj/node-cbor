'use strict'

const test = require('ava')
const BigNum = require('bignumber.js').BigNumber
const NoFilter = require('nofilter')
const utils = require('../lib/utils')
const hex = utils.hex
const bin = utils.bin

test('bin', t => {
  t.deepEqual(utils.bin('1'), hex('01'))
  t.deepEqual(utils.bin('11'), hex('03'))
  t.deepEqual(utils.bin('1100 0000 0000'), hex('0c00'))
})

test('parseCBORint', t => {
  t.deepEqual(utils.parseCBORint(24, hex('ff')), 255)
  t.deepEqual(utils.parseCBORint(25, hex('ffff')), 65535)
  t.deepEqual(utils.parseCBORint(26, hex('00010000')), 65536)
  t.deepEqual(utils.parseCBORint(27, hex('0000000100000000')), 4294967296)
  t.throws(() => {
    utils.parseCBORint(28, hex('ff'))
  })
  t.throws(() => {
    utils.parseCBORint(27, hex('ff'))
  })
})

test('parseCBORfloat', t => {
  t.deepEqual(utils.parseCBORfloat(bin('0 00000 0000000000')), 0)
  t.deepEqual(utils.parseCBORfloat(bin('0 00000000 00000000000000000000000')),
    0)
  t.deepEqual(utils.parseCBORfloat(bin('0 00000000000 0000000000000000000000000000000000000000000000000000')), 0) // eslint-disable-line max-len
  t.throws(() => {
    utils.parseCBORfloat(hex('ff'))
  })
  t.throws(() => {
    utils.parseCBORfloat(hex('ff'))
  })
})

test('parseHalf', t => {
  t.deepEqual(utils.parseHalf(bin('0 01111 0000000000')), 1)
  t.deepEqual(utils.parseHalf(bin('1 10000 0000000000')), -2)
  t.deepEqual(utils.parseHalf(bin('0 11110 1111111111')), 65504)
  t.deepEqual(utils.parseHalf(bin('0 00001 0000000000')), 0.00006103515625)
  t.deepEqual(utils.parseHalf(bin('0 00000 0000000000')), 0)
  t.deepEqual(utils.parseHalf(bin('1 00000 0000000000')), -0)
  t.deepEqual(utils.parseHalf(bin('0 11111 0000000000')), Infinity)
  t.deepEqual(utils.parseHalf(bin('1 11111 0000000000')), -Infinity)
})

test('arrayEqual', t => {
  t.deepEqual(utils.arrayEqual(), true)
  t.deepEqual(utils.arrayEqual([]), false)
  t.deepEqual(utils.arrayEqual([], []), true)
  t.deepEqual(utils.arrayEqual([1], []), false)
  t.deepEqual(utils.arrayEqual([1, 2, 3], [1, 2, 3]), true)
  t.deepEqual(utils.arrayEqual([1, 2, 3], [1, 2, 4]), false)
})

test('bufferEqual', t => {
  t.deepEqual(utils.bufferEqual(), true)
  t.deepEqual(utils.bufferEqual(Buffer.allocUnsafe(0)), false)
  t.deepEqual(
    utils.bufferEqual(
      Buffer.allocUnsafe(0),
      Buffer.allocUnsafe(0)),
    true)
  t.deepEqual(utils.bufferEqual(Buffer.from([1]), Buffer.allocUnsafe(0)), false)
  t.deepEqual(utils.bufferEqual(
    Buffer.from([1, 2, 3]),
    Buffer.from([1, 2, 3])), true)
  t.deepEqual(utils.bufferEqual(
    Buffer.from([1, 2, 3]),
    Buffer.from([1, 2, 4])), false)
})

test('bufferToBignumber', t => {
  const num = new BigNum(0x12345678).toString(16)
  const numbuf = Buffer.from(num, 'hex')
  t.deepEqual(utils.bufferToBignumber(numbuf), new BigNum(0x12345678))
})

test.cb('guessEncoding', t => {
  const buf = Buffer.from('0102', 'hex')
  const nof = utils.guessEncoding(
    buf.buffer.slice(buf.offset, buf.offset+buf.length))
  t.deepEqual(nof.read().toString('hex'), '0102')
  const ab = new ArrayBuffer(256)
  const u16 = new Uint16Array(ab, 100, 3)
  u16[0] = 512
  u16[1] = 256
  u16[2] = 1
  const nof2 = utils.guessEncoding(u16)
  t.deepEqual(nof2.read().toString('hex'), '000200010100')
  try {
    utils.guessEncoding()
  } catch (er) {
    t.end()
  }
})

test('cborValueToString', t => {
  t.is(utils.cborValueToString(Symbol()), 'Symbol')
  t.is(utils.cborValueToString(Symbol(')')), ')')
  t.is(utils.cborValueToString(Symbol('))')), '))')
  t.is(utils.cborValueToString(Symbol('(()')), '(()')
  t.is(utils.cborValueToString(Symbol('foo')), 'foo')
  t.is(utils.cborValueToString(Symbol('')), 'Symbol')
  t.is(utils.cborValueToString(new BigNum(-4)), '-4')
})
