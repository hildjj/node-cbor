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

const PARENT_ARRAY = 0
const PARENT_OBJECT = 1
const PARENT_MAP = 2
const PARENT_TAG = 3

// List of parsed cbor objects
let res = []

// Reference to the latest parent
function ref () {
  return currentParent().ref
}

// List of currently open parents
let parents = [{
  type: PARENT_ARRAY,
  len: -1,
  ref: res
}]


function reset () {
  res = []
  parents = [{
    type: PARENT_ARRAY,
    len: -1,
    ref: res
  }]
}

// Current parsing depth
function depth () {
  return parents.length
}

function currentParent () {
  return parents[depth() - 1]
}

function closeParent () {
  parents.pop()
}

let tmpKey

function dec () {
  const p = currentParent()
  if (p.length < 0) {
    return
  }

  p.length --

  if (p.length === 0) {
    closeParent()
  }
}

// convert an Object into a Map
function buildMap (obj) {
  const res = new Map()
  const keys = Object.keys(obj)
  const length = keys.length
  for (let i = 0; i < length; i++) {
    res.set(keys[i], obj[keys[i]])
  }
  return res
}

function push (val) {
  const p = currentParent()
  switch (p.type) {
  case PARENT_ARRAY:
    ref().push(val)
    dec()
    break
  case PARENT_OBJECT:
    if (tmpKey) {
      ref()[tmpKey] = val
      tmpKey = null
      dec()
    } else {
      tmpKey = val
      if (typeof tmpKey !== 'string') {
        // too bad, convert to a Map
        p.type = PARENT_MAP
        p.ref = buildMap(p.ref)
      }
    }
  case PARENT_MAP:
    if (tmpKey) {
      ref().set(tmpKey, val)
      tmpKey = null
      dec()
    } else {
      tmpKey = val
    }
    break
  case PARENT_TAG:
    // TODO:
    break
  }
}

// create a new parent
function createParent (obj, type, len) {
  push(obj)

  parents[depth()] = {
    type: type,
    left: len,
    ref: obj
  }
}

function buildInt32 (f, g) {
  return f * SHIFT16 + g
}

function buildInt64 (f1, f2, g1, g2) {
  const f = buildInt32(f1, f2)
  const g = buildInt32(g1, g2)

  if (f > MAX_SAFE_HIGH) {
    return new bignumber(f).times(SHIFT32).plus(g)
  } else {
    return (f * SHIFT32) + g
  }
}

function createArrayStartFixed (len) {
  createParent(new Array(len), PARENT_ARRAY, len)
}

function createObjectStartFixed (len) {
  createParent({}, PARENT_OBJECT, len)
}

const foreign = {
  pushInt (val) {
    push(val)
  },
  pushInt32 (f, g) {
    push(buildInt32(f, g))
  },
  pushInt64 (f1, f2, g1, g2) {
    push(buildInt64(f1, f2, g1, g2))
  },
  pushFloat (val) {
    push(val)
  },
  pushFloatSingle (a, b, c, d) {
    push(
      ieee754.read([a, b, c, d], 0, false, 23, 4)
    )
  },
  pushFloatDouble (a, b, c, d, e, f, g, h) {
    push(
      ieee754.read([a, b, c, d, e, f, g, h], 0, false, 52, 8)
    )
  },
  pushInt32Neg (f, g) {
    push(-1 - buildInt32(f, g))
  },
  pushInt64Neg (f1, f2, g1, g2) {
    const f = buildInt32(f1, f2)
    const g = buildInt32(g1, g2)

    if (f > MAX_SAFE_HIGH) {
      push(
        NEG_ONE.sub(new bignumber(f).times(SHIFT32).plus(g))
      )
    } else {
      push(-1 - ((f * SHIFT32) + g))
    }
  },
  pushTrue () {
    push(true)
  },
  pushFalse () {
    push(false)
  },
  pushNull () {
    push(null)
  },
  pushUndefined () {
    push(void 0)
  },
  pushInfinity () {
    push(Infinity)
  },
  pushInfinityNeg () {
    push(-Infinity)
  },
  pushNaN () {
    push(NaN)
  },
  pushNaNNeg () {
    push(-NaN)
  },
  pushArrayStartFixed (len) {
    createArrayStartFixed(len)
  },
  pushArrayStartFixed32 (len1, len2) {
    const len = buildInt32(len1, len2)
    createArrayStartFixed(len)
  },
  pushArrayStartFixed64 (len1, len2, len3, len4) {
    const len = buildInt64(len1, len2, len3, len4)
    createArrayStartFixed(len)
  },
  pushObjectStartFixed (len) {
    createObjectStartFixed(len)
  },
  pushObjectStartFixed32 (len1, len2) {
    const len = buildInt32(len1, len2)
    createObjectStartFixed(len)
  },
  pushObjectStartFixed64 (len1, len2, len3, len4) {
    const len = buildInt64(len1, len2, len3, len4)
    createObjectStartFixed(len)
  },
  pushByteString (start, end) {
    push(buffer.slice(start, end + 1))
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
    reset()

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
