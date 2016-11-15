/* eslint-env mocha */
'use strict'

const cases = require('./cases')
const asm = require('../lib/decoder.asm')
const assert = require('power-assert')
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
  pushFloat (val) {
    res.push(val)
  },
  log (val, val2) {
    console.log('--', val, val2)
  }
}


const parser = asm(global, foreign, buffer)

describe('asm.js decoder', function () {
  describe('good', () => {
    for (var i = 0; i < cases.good.length; i++) {
      testGood(i, cases.good[i])
    }
  })
})

function testGood (i, c) {
  it(`[${i}] - ${c[1]}`, () => {
    res = []

    const input = cases.toBuffer(c)
    buffer8.set(input)

    const code = parser.parse(input.byteLength)

    if (code > 0) {
      console.log('input: ', buffer8.slice(0, 20))
      console.log('output: ', res)
      console.log('expected: ', c[0])
      console.log('\n\n')
      console.log('details: ', c[2])

      throw new Error('Errored')
    }

    assert.deepEqual(res[0], c[1])
  })
}
