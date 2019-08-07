'use strict'
const BigNumber = require('bignumber.js').BigNumber
const cbor = require('../')
const test = require('ava')
const util = require('util')
const fs = require('fs')
const path = require('path')
const readFile = util.promisify ? 
  util.promisify(fs.readFile) : 
  (...args) => new Promise((resolve, reject) => {
    fs.readFile(...args, (er, res) => er ? reject(er) : resolve(res))
  })

let vectors = null
let failures = null

test.before(async t => {
  // Read tests in.  Edit them to make the big integers come out correctly.
  let vecStr = null
  try {
    vecStr = await readFile(
      path.join(__dirname, '..', 'test-vectors', 'appendix_a.json'),
      {encoding: 'utf8'})
  } catch (er) {
    t.fail('use command `git submodule update --init` to load test-vectors')
    return t.end()
  }

  // HACK: don't lose data when JSON parsing
  vecStr = vecStr.replace(/"decoded":\s*(-?\d+(\.\d+)?(e[+-]\d+)?)\n/g,
    `"decoded": {
      "___TYPE___": "number",
      "___VALUE___": "$1"
    }
`)
  vectors = JSON.parse(vecStr, (key, value) => {
    if (!value) {
      return value
    }
    switch (value['___TYPE___']) {
      case 'number':
        const v = value['___VALUE___']
        const f = Number.parseFloat(v)
        const bn = new BigNumber(v)
        return bn.eq(f) ? f : bn
      default:
        return value
    }
  })

  let failStr = null
  try {
    failStr = await readFile(
      path.join(__dirname, '..', 'test-vectors', 'fail.json'),
      {encoding: 'utf8'})
  } catch (er) {
    t.fail('use command `git submodule update --init` to load test-vectors')
    return t.end()
  }
  failures = JSON.parse(failStr)
})

test('vectors', t => {
  t.truthy(Array.isArray(vectors))
  for (const v of vectors) {
    t.truthy(v.hex)
    const buffer = Buffer.from(v.hex, 'hex')

    let decoded
    try {
      decoded = cbor.decode(buffer)
    } catch (e) {
      console.log('DECODE ERROR', buffer.toString('hex'))
      throw e
    }
    const encoded = cbor.encodeCanonical(decoded)
    const redecoded = cbor.decode(encoded)

    t.truthy(v.hasOwnProperty('cbor'))
    t.deepEqual(
      Buffer.from(v.cbor, 'base64'),
      buffer,
      'base64 and hex encoded bytes mismatched ')

    t.deepEqual(
      decoded,
      redecoded,
      `round trip error: ${v.hex} -> ${encoded.toString('hex')}`)

    if (v.hasOwnProperty('diagnostic')) {
      cbor.diagnose(buffer)
        .then(d => t.deepEqual(
          d.trim().replace(/_\d+($|\))/, '$1'),
          v.diagnostic))
    }

    if (v.hasOwnProperty('decoded')) {
      t.deepEqual(decoded, v.decoded)

      if (v.roundtrip) {
        // TODO: Don't know how to make these round-trip.  See:
        // https://github.com/cbor/test-vectors/issues/3
        if ([
          '1bffffffffffffffff',
          '3bffffffffffffffff',
          'f90000',
          'f93c00',
          'f97bff',
          'fa47c35000',
          'f9c400'
        ].indexOf(v.hex) === -1) {
          t.deepEqual(encoded, buffer)
        } else {
          // Trigger if assumptions change
          t.notDeepEqual(encoded, buffer)
        }
      }
    }
  }
})

test('errors', async t => {
  t.plan(failures.length)
  for (const f of failures) {
    await t.throwsAsync(async () => {
      await cbor.decodeAll(f.hex, 'hex')
      console.log('NO THROW', f)
    })
  }
})
