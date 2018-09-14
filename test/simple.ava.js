'use strict'

const test = require('ava')
const cbor = require('../lib/cbor')
const constants = require('../lib/constants')

test('create', t => {
  const u = new cbor.Simple(0)
  t.deepEqual(u.value, 0)

  t.deepEqual(cbor.Simple.isSimple(u), true)
  t.deepEqual(cbor.Simple.isSimple('foo'), false)
  t.deepEqual(u.toString(), 'simple(0)')

  t.throws(() => new cbor.Simple('0'))
  t.throws(() => new cbor.Simple(-1))
  t.throws(() => new cbor.Simple(256))
  t.throws(() => new cbor.Simple(1.1))
})

test('decode', t => {
  t.is(cbor.Simple.decode(constants.SIMPLE.NULL), null)
  t.is(typeof (cbor.Simple.decode(constants.SIMPLE.UNDEFINED)), 'undefined')
  t.throws(() => cbor.Simple.decode(-1, false))
})
