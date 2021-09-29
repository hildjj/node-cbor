'use strict'

const test = require('ava')
const {fixes, patchGlobal} = require('../')

test('node environment', t => {
  t.deepEqual(fixes, [])
})

test('some potential broken environments', t => {
  const fakeGlobal = {}
  const fakeFixes = patchGlobal(fakeGlobal)
  t.deepEqual(fakeFixes, ['BigInt', 'process', 'TextDecoder'])
  const fakeGlobal2 = {process: {}}
  const fakeFixes2 = patchGlobal(fakeGlobal2)
  t.deepEqual(fakeFixes2, ['BigInt', 'nextTick', 'TextDecoder'])
})

test('BigInt', t => {
  const fakeGlobal = {}
  patchGlobal(fakeGlobal)

  const hex = fakeGlobal.BigInt('0xffffffffffffffff')
  t.is(hex.toString(16), 'ffffffffffffffff')

  const oct = fakeGlobal.BigInt('0o7777777777777777')
  t.is(oct.toString(8), '7777777777777777')

  const i = fakeGlobal.BigInt(0xffffffff)
  t.is(i.toString(16), 'ffffffff')

  const j = fakeGlobal.BigInt('16')
  t.is(j.toString(), '16')
})
