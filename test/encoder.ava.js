'use strict'

const cbor = require('../')
const test = require('ava')
const cases = require('./cases')
const NoFilter = require('nofilter')
const BigNum = require('bignumber.js')

function testAll (t, list) {
  t.plan(list.length)
  return Promise.all(list.map(c => {
    t.is(cbor.encode(c[0]).toString('hex'), cases.toString(c), c[1])
  }))
}

test('good', t => testAll(t, cases.good))
test('encode', t => testAll(t, cases.encodeGood))

test('undefined', t => {
  t.is(cbor.Encoder.encode(), null)
  t.is(cbor.encode(undefined, 2).toString('hex'), 'f702')
})

test('badFunc', t => {
  t.throws(function () {
    cbor.encode(function () { return 'hi' })
  })
  t.throws(function () {
    cbor.encode(Symbol('foo'))
  })
})

test('addSemanticType', t => {
  // before the tag, this is an innocuous object:
  // {"value": "foo"}
  var tc = new cases.TempClass('foo')
  delete (cases.TempClass.prototype.encodeCBOR)
  t.is(cbor.Encoder.encode(tc).toString('hex'), 'a16576616c756563666f6f')
  var gen = new cbor.Encoder({genTypes: [cases.TempClass, cases.TempClass.toCBOR]})
  gen.write(tc)
  t.is(gen.read().toString('hex'), 'd9fffe63666f6f')

  function hexPackBuffer (gen, obj, bufs) {
    gen.write('0x' + obj.toString('hex'))
  // intentionally don't return
  }

  // replace Buffer serializer with hex strings
  gen.addSemanticType(Buffer, hexPackBuffer)
  gen.write(new Buffer('010203', 'hex'))

  t.is(gen.read().toString('hex'), '683078303130323033')
})

test.cb('stream', t => {
  var bs = new NoFilter()
  var gen = new cbor.Encoder()
  gen.on('end', function () {
    t.deepEqual(bs.read(), new Buffer([1, 2]))
    t.end()
  })
  gen.pipe(bs)
  gen.write(1)
  gen.end(2)
})

test.cb('streamNone', t => {
  var bs = new NoFilter()
  var gen = new cbor.Encoder()
  gen.on('end', function () {
    t.deepEqual(bs.read(), null)
    t.end()
  })
  gen.pipe(bs)
  gen.end()
})

test('pushFails', t => {
  cases.EncodeFailer.tryAll(t, [1, 2, 3])
  cases.EncodeFailer.tryAll(t, new Set([1, 2, 3]))
  cases.EncodeFailer.tryAll(t, new BigNum(0))
  cases.EncodeFailer.tryAll(t, new BigNum(1.1))
  cases.EncodeFailer.tryAll(t, new Map([[1, 2], ['a', null]]))
  cases.EncodeFailer.tryAll(t, {a: 1, b: null})
  cases.EncodeFailer.tryAll(t, undefined)
})
