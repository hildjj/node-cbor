'use strict'

const test = require('ava')
const ObjectRecorder = require('../lib/objectRecorder')

test('create', t => {
  const o = new ObjectRecorder()
  t.truthy(o)
  t.is(o.check({}), ObjectRecorder.NEVER)
  const a = {}
  const b = {}
  t.is(o.check(a), ObjectRecorder.NEVER)
  t.is(o.check(a), 0)
  t.is(o.check(b), ObjectRecorder.NEVER)
  o.stop()
  t.is(o.check(a), ObjectRecorder.FIRST)
  t.is(o.check(a), 0)
  t.is(o.check(b), ObjectRecorder.NEVER)
  t.throws(() => o.check({}))
  o.clear()
  t.is(o.check(a), ObjectRecorder.NEVER)
})
