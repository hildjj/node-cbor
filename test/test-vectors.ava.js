'use strict'
const BigNumber = require('bignumber.js')
const cbor = require('../')
const test = require('ava')
const util = require('util')
const fs = require('fs')
const path = require('path')

let vectors = null

test.before.cb(t => {
  // Read tests in.  Edit them to make the big integers come out correctly.
  fs.readFile(
    path.join(__dirname, '..', 'test-vectors', 'appendix_a.json'),
    {encoding: 'utf8'},
    (er, vecStr) => {
      if (er) {
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
      t.end()
    })
})

test('vectors', t => {
  t.truthy(Array.isArray(vectors))
  for (const v of vectors) {
    t.truthy(v.hex)
    const buffer = Buffer.from(v.hex, 'hex')

    const decoded = cbor.decode(buffer)
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
