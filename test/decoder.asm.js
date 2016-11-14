'use strict'

const cases = require('./cases')
const asm = require('../lib/decoder.asm')
const assert = require('assert')

const buffer = new ArrayBuffer(0x10000)
const buffer8 = new Uint8Array(buffer)

let res = []

const foreign = {
  pushInt (val) {
    res.push(val)
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
