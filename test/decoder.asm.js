'use strict'

const cases = require('./cases')
const asm = require('../lib/decoder.asm')
const assert = require('assert')
const bignumber = require('bignumber.js')
const SHIFT16 = Math.pow(2, 16)
const SHIFT32 = Math.pow(2, 32)
const MAX_SAFE_HIGH = 0x1fffff

const buffer = new ArrayBuffer(0x10000)
const buffer8 = new Uint8Array(buffer)

let res = []

function buildInt32 (f, g) {
  return f * SHIFT16 + g
}

const foreign = {
  pushInt (val) {
    res.push(val)
  },
  pushInt32 (f, g) {
    res.push(buildInt32(f, g))
  },
  pushInt64 (f1, f2, g1, g2) {
    const f = buildInt32(f1, f2)
    const g = buildInt32(g1, g2)
    console.log('int64', f, g)
    if (f > MAX_SAFE_HIGH) {
      res.push(new bignumber(f).times(SHIFT32).plus(g))
    } else {
      res.push((f * SHIFT32) + g)
    }
  },
  log (val, val2) {
    console.log('--', val, val2)
  }
}


const parser = asm(global, foreign, buffer)

for (var i = 0; i < cases.good.length; i++) {
  res = []
  var c = cases.good[i]
  buffer8.set(cases.toBuffer(c))

  console.log('input: ', buffer8.slice(0, 20))
  console.log('details:', c[2])
  const code = parser.parse(1)
  console.log('output: ', res)

  if (code > 0) {
    throw new Error('Errored')
  }

  assert.deepEqual(res[0], c[1])
}
