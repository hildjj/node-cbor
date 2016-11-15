/* eslint-env mocha */
'use strict'

const ieee754 = require('ieee754')

const cases = require('./cases')
const vectors = require('./vectors')
const asm = require('../lib/decoder.asm')
const assert = require('power-assert')
const bignumber = require('bignumber.js')
const SHIFT16 = Math.pow(2, 16)
const SHIFT32 = Math.pow(2, 32)
const MAX_SAFE_HIGH = 0x1fffff
const NEG_ONE = new bignumber(-1)

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
  pushFloatSingle (a, b, c, d) {
    res.push(
      ieee754.read([a, b, c, d], 0, false, 23, 4)
    )
  },
  pushFloatDouble (a, b, c, d, e, f, g, h) {
    res.push(
      ieee754.read([a, b, c, d, e, f, g, h], 0, false, 52, 8)
    )
  },
  pushInt32Neg (f, g) {
    res.push(-1 - buildInt32(f, g))
  },
  pushInt64Neg (f1, f2, g1, g2) {
    const f = buildInt32(f1, f2)
    const g = buildInt32(g1, g2)
    console.log('int64', f, g)
    if (f > MAX_SAFE_HIGH) {
      res.push(
        NEG_ONE.sub(new bignumber(f).times(SHIFT32).plus(g))
      )
    } else {
      res.push(-1 - ((f * SHIFT32) + g))
    }
  },
  pushTrue () {
    res.push(true)
  },
  pushFalse () {
    res.push(false)
  },
  pushNull () {
    res.push(null)
  },
  pushUndefined () {
    res.push(void 0)
  },
  pushInfinity () {
    res.push(Infinity)
  },
  pushInfinityNeg () {
    res.push(-Infinity)
  },
  pushNaN () {
    res.push(NaN)
  },
  pushNaNNeg () {
    res.push(-NaN)
  },
  log (val, val2) {
    console.log('--', val, val2)
  }
}


const parser = asm(global, foreign, buffer)

describe('asm.js decoder', function () {
  describe('vectors', () => {
    for (var i = 0; i < vectors.length; i++) {
      if (vectors[i].diagnostic) {
        continue
      }
      testGood(
        i,
        new Buffer(vectors[i].hex, 'hex'),
        vectors[i].decoded,
        vectors[i].hex
      )
    }
  })

  describe('good', () => {
    for (var i = 0; i < cases.good.length; i++) {
      testGood(
        i,
        cases.toBuffer(cases.good[i]),
        cases.good[i][0],
        cases.good[i][1],
        cases.good[i][2]
      )
    }
  })

  describe('decodeGood', () => {
    for (var i = 0; i < cases.decodeGood.length; i++) {
      testGood(
        i,
        cases.toBuffer(cases.good[i]),
        cases.good[i][0],
        cases.good[i][1],
        cases.good[i][2]
      )
    }
  })
})

function testGood (i, input, expected, desc, info) {
  it(desc, () => {
    res = []

    buffer8.set(input)

    const code = parser.parse(input.byteLength)

   // if (code > 0) {
    //   console.log('input: ', buffer8.slice(0, 20))
    //   console.log('output: ', res)
    //   console.log('expected: ', c[0])
    //   console.log('\n\n')
    //   console.log('details: ', c[2])
    // }

    if (isNaN(expected)) {
      assert.ok(isNaN(res[0]), info)
    } else {
      assert.deepEqual(res[0], expected, info)
    }

    assert.equal(code, 0, info)
  })
}

if (typeof window !== 'undefined') {
  window.mocha.checkLeaks()
  window.mocha.run()
}
