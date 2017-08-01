'use strict'

const test = require('ava')
const BigNum = require('bignumber.js')
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

test('extend', t => {
  t.deepEqual(utils.extend(), {})
  t.deepEqual(utils.extend({}, {foo: 1}), {foo: 1})
  t.deepEqual(utils.extend({foo: 2}, {foo: 1}), {foo: 1})
  t.deepEqual(utils.extend({foo: 2, bar: 2}, {foo: 1}), {foo: 1, bar: 2})
  t.deepEqual(utils.extend(
    {foo: 2, bar: 2},
    {foo: 1},
    {bar: 3}),
  {foo: 1, bar: 3})
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
  t.deepEqual(utils.bufferEqual(new Buffer(0)), false)
  t.deepEqual(utils.bufferEqual(new Buffer(0), new Buffer(0)), true)
  t.deepEqual(utils.bufferEqual(new Buffer([1]), new Buffer(0)), false)
  t.deepEqual(utils.bufferEqual(
    new Buffer([1, 2, 3]),
    new Buffer([1, 2, 3])), true)
  t.deepEqual(utils.bufferEqual(
    new Buffer([1, 2, 3]),
    new Buffer([1, 2, 4])), false)
})

test('bufferToBignumber', t => {
  const num = new BigNum(0x12345678).toString(16)
  const numbuf = new Buffer(num, 'hex')
  t.deepEqual(utils.bufferToBignumber(numbuf), new BigNum(0x12345678))
})

test('DeHexStream', t => {
  [
    ['6161', 'aa'],
    ['0x00', '\x00']
  ].map((hd) => {
    const d = new utils.DeHexStream(hd[0])
    t.deepEqual(d.read().toString(), hd[1])
  })
})

test.cb('HexStream', t => {
  const h = new utils.HexStream()
  const bs = new NoFilter()
  h.pipe(bs)
  h.on('end', () => {
    t.deepEqual(bs.toString('utf8'), '61')
    t.end()
  })
  h.end(new Buffer([0x61]))
})

test.cb('streamFilesNone', t => {
  utils.streamFiles([], () => {}, () => {
    utils.streamFiles(['/tmp/hopefully-does-not-exist'], () => {
      return new utils.HexStream()
    }, (er) => {
      t.truthy(er)
      t.end()
    })
  })
})

test.cb('streamFilesDash', t => {
  const u = new utils.HexStream()
  const bs = new NoFilter()
  u.pipe(bs)
  utils.streamFiles([new utils.DeHexStream('6161')], () => u, (er) => {
    t.ifError(er)
    t.deepEqual(bs.toString('utf8'), '6161')
    t.end()
  })
})

test.cb('streamFilesInputs', t => {
  // TODO: get error to fire
  utils.streamFiles([
    new utils.DeHexStream('48656c6c6f2c20576f726c64210a')
  ], (er) => {
    t.ifError(er)
    const hs = new utils.HexStream()
    t.end()
    return hs
  })
})

test.cb('guessEncoding', t => {
  try {
    utils.guessEncoding()
  } catch (er) {
    t.end()
  }
})
