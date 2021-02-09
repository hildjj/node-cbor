'use strict'

const cbor = require('../')
const test = require('ava')
const cases = require('./cases')

test('create', t => {
  const m = new cbor.Map()
  t.truthy(m instanceof Map)
})

test('basic', t => {
  const m = new cbor.Map()
  t.is(m.size, 0)
  m.set(1, 2)
  m.set(3, 4)
  t.is(m.size, 2)
  t.is(m.get(1), 2)
  t.is(m.get(3), 4)
  t.truthy(m.has(1))
  t.truthy(m.has(3))
  t.falsy(m.has(8))
  t.deepEqual(Array.from(m.keys()), [1, 3])
  t.deepEqual(Array.from(m.entries()), [[1, 2], [3, 4]])

  t.is(m.delete(1), true)
  t.is(m.delete(1), false)
  t.is(m.size, 1)
  t.falsy(m.has(1))
  t.deepEqual(Array.from(m.keys()), [3])
  for (const [k, v] of m) { // [Symbol.iterator]
    t.is(k, 3)
    t.is(v, 4)
  }
  m.forEach((v, k, n) => {
    t.is(k, 3)
    t.is(v, 4)
    t.is(k, 3)
    t.is(n, m)
  })
})

test('errors', t => {
  const m = new cbor.Map([[1, 2], [3, 4]])
  t.is(m.size, 2)
  t.throws(() => {
    m.forEach()
  })
  t.throws(() => {
    m.forEach('boo')
  })
})

test('complex', t => {
  const m = new cbor.Map([[[], 2], [[], 4]])
  t.is(m.size, 1)
  t.is(m.get([]), 4)
})

test('encode', t => {
  const m = new cbor.Map([
    [false, true],
    [1, 'one'],
    [0, 'hi'],
    [-1, 'neg'],
    [[0, 1], 'array'],
    [{a: 1, b: 2}, 'map']
  ])
  const buf = cbor.encode(m)
  t.is(buf.toString('hex'),
    'a6f4f501636f6e650062686920636e6567820001656172726179a2616101616202636d6170') // eslint-disable-line max-len
  const bufCanon = cbor.encodeCanonical(m)
  t.is(bufCanon.toString('hex'),
    'a60062686901636f6e6520636e6567820001656172726179a2616101616202636d6170f4f5') // eslint-disable-line max-len
})

test('encodefail', t => {
  const m = new cbor.Map([
    [false, true],
    [1, 'one'],
    [0, 'hi'],
    [-1, 'neg'],
    [[0, 1], 'array'],
    [{a: 1, b: 2}, 'map']
  ])
  cases.EncodeFailer.tryAll(t, m)
  cases.EncodeFailer.tryAll(t, m, true)
})