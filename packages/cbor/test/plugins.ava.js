'use strict'

const cbor_src = process.env.CBOR_PACKAGE || '../'
const cbor = require(cbor_src)
const test = require('ava')

test('reset', t => {
  cbor.Encoder.SEMANTIC_TYPES.UNKNOWN_TYPE = () => null
  cbor.reset()
  t.is(cbor.Encoder.SEMANTIC_TYPES.UNKNOWN_TYPE, undefined)
})
