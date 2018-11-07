'use strict'

const test = require('ava')
const cbor = require('../lib/cbor')
const int64 = require('int64-buffer')
const Int64LE = int64.Int64LE
const Uint64LE = int64.Uint64LE
const Int64BE = int64.Int64BE
const Uint64BE = int64.Uint64BE

test('create', t => {
  const tag = new cbor.Tagged(1, 'one')
  t.truthy(tag)
  t.deepEqual(tag.tag, 1)
  t.deepEqual(tag.value, 'one')
  t.deepEqual(tag.toString(), '1("one")')

  t.deepEqual(cbor.encode(tag), Buffer.from('c1636f6e65', 'hex'))
})

test('edges', t => {
  t.throws(() => {
    new cbor.Tagged(-11, 'one') // eslint-disable-line
  })

  t.throws(() => {
    new cbor.Tagged(1.1, 'one') // eslint-disable-line
  })

  t.throws(() => {
    new cbor.Tagged('zero', 'one') // eslint-disable-line
  })
})

test('decode Uin8Clamped8Array', t => {
  const buf = Buffer.from('d84443010203', 'hex')
  const expected = new Uint8ClampedArray([1, 2, 3])

  t.deepEqual(cbor.decode(buf), expected)
})

test('decode Int8Array', t => {
  const buf = Buffer.from('d8484301fe03', 'hex')
  const expected = new Int8Array([1, -2, 3])

  t.deepEqual(cbor.decode(buf), expected)
})

test('decode Int16Array LE', t => {
  const buf = Buffer.from('d84d460100feff0300', 'hex')
  const expected = new Int16Array([1, -2, 3])

  t.deepEqual(cbor.decode(buf), expected)
})

test('decode Int32Array LE', t => {
  const buf = Buffer.from('d84e4c01000000feffffff03000000', 'hex')
  const expected = new Int32Array([1, -2, 3])

  t.deepEqual(cbor.decode(buf), expected)
})

test('decode Int64Array LE', t => {
  const buf = Buffer.from(
    'd84f58180100000000000000feffffffffffffff0300000000000000', 'hex')
  const exBuffer = Buffer.from(
    '0100000000000000feffffffffffffff0300000000000000', 'hex')
  const expected = new Int64LE(new Uint8Array(exBuffer))

  t.deepEqual(cbor.decode(buf), expected)
})

test('decode UInt16Array LE', t => {
  const buf = Buffer.from('d84546010002000300', 'hex')
  const expected = new Uint16Array([1, 2, 3])

  t.deepEqual(cbor.decode(buf), expected)
})

test('decode UInt32Array LE', t => {
  const buf = Buffer.from('d8464c010000000200000003000000', 'hex')
  const expected = new Uint32Array([1, 2, 3])

  t.deepEqual(cbor.decode(buf), expected)
})

test('decode Uint64Array LE', t => {
  const buf = Buffer.from(
    'd8475818010000000000000002000000000000000300000000000000', 'hex')
  const exBuffer = Buffer.from(
    '010000000000000002000000000000000300000000000000', 'hex')
  const expected = new Uint64LE(new Uint8Array(exBuffer))

  t.deepEqual(cbor.decode(buf), expected)
})

test('decode Float16Array LE', t => {
  const buf = Buffer.from('d85446663c66c09942', 'hex')
  const expected = [1.1, -2.2, 3.3]

  const result = cbor.decode(buf)
  for (let i = 0; i < expected.length; i++) {
    t.truthy(Math.abs(result[i] - expected[i]) < 1e-2)
  }
})

test('decode Float32Array LE', t => {
  const buf = Buffer.from('d8554ccdcc8c3fcdcc0cc033335340', 'hex')
  const expected = new Float32Array([1.1, -2.2, 3.3])

  t.deepEqual(cbor.decode(buf), expected)
})

test('decode Float64Array LE', t => {
  const buf = Buffer.from(
    'd85658189a9999999999f13f9a999999999901c06666666666660a40', 'hex')
  const expected = new Float64Array([1.1, -2.2, 3.3])

  t.deepEqual(cbor.decode(buf), expected)
})

test('decode Int16Array BE', t => {
  const buf = Buffer.from('d849460001fffe0003', 'hex')
  const expected = new Int16Array([1, -2, 3])

  t.deepEqual(cbor.decode(buf), expected)
})

test('decode Int32Array BE', t => {
  const buf = Buffer.from('d84a4c00000001fffffffe00000003', 'hex')
  const expected = new Int32Array([1, -2, 3])

  t.deepEqual(cbor.decode(buf), expected)
})

test('decode Int64Array BE', t => {
  const buf = Buffer.from(
    'd84b58180000000000000001fffffffffffffffe0000000000000003', 'hex')
  const exBuffer = Buffer.from(
    '0000000000000001fffffffffffffffe0000000000000003', 'hex')
  const expected = new Int64BE(new Uint8Array(exBuffer))

  t.deepEqual(cbor.decode(buf), expected)
})

test('decode UInt16Array BE', t => {
  const buf = Buffer.from('d84146000100020003', 'hex')
  const expected = new Uint16Array([1, 2, 3])

  t.deepEqual(cbor.decode(buf), expected)
})

test('decode UInt32Array BE', t => {
  const buf = Buffer.from('d8424c000000010000000200000003', 'hex')
  const expected = new Uint32Array([1, 2, 3])

  t.deepEqual(cbor.decode(buf), expected)
})

test('decode Uint64Array BE', t => {
  const buf = Buffer.from(
    'd8435818000000000000000100000000000000020000000000000003', 'hex')
  const exBuffer = Buffer.from(
    '000000000000000100000000000000020000000000000003', 'hex')
  const expected = new Uint64BE(new Uint8Array(exBuffer))

  t.deepEqual(cbor.decode(buf), expected)
})

test('decode Float16Array BE', t => {
  const buf = Buffer.from('d850463c66c0664299', 'hex')
  const expected = [1.1, -2.2, 3.3]

  const result = cbor.decode(buf)
  for (let i = 0; i < expected.length; i++) {
    t.truthy(Math.abs(result[i] - expected[i]) < 1e-2)
  }
})

test('decode Float32Array BE', t => {
  const buf = Buffer.from('d8514c3f8ccccdc00ccccd40533333', 'hex')
  const expected = new Float32Array([1.1, -2.2, 3.3])

  t.deepEqual(cbor.decode(buf), expected)
})

test('decode Float64Array BE', t => {
  const buf = Buffer.from(
    'd85258183ff199999999999ac00199999999999a400a666666666666', 'hex')
  const expected = new Float64Array([1.1, -2.2, 3.3])

  t.deepEqual(cbor.decode(buf), expected)
})
