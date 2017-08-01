'use strict'

const test = require('ava')
const cbor = require('../lib/cbor')

test('create', t => {
  const tag = new cbor.Tagged(1, 'one')
  t.truthy(tag)
  t.deepEqual(tag.tag, 1)
  t.deepEqual(tag.value, 'one')
  t.deepEqual(tag.toString(), '1("one")')

  t.deepEqual(cbor.encode(tag), new Buffer('c1636f6e65', 'hex'))
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
