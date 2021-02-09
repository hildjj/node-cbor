'use strict'
const cbor = require('../')
const {BigNumber} = cbor
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
  const vectorDir = path.resolve(
    __dirname, '..', '..', '..', 'test-vectors')
  const appendix_a = path.join(vectorDir, 'appendix_a.json')
  try {
    vecStr = await readFile(appendix_a, {encoding: 'utf8'})
  } catch (ignored) {
    t.fail(`"${appendix_a}" not found.
use command \`git submodule update --init\` to load test-vectors`)
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
        if (bn.eq(f)) {
          return f
        }
        if (bn.isInteger()) {
          return BigInt(bn.toString())
        }
        return bn
      default:
        return value
    }
  })

  let failStr = null
  const fail = path.join(vectorDir, 'fail.json')
  try {
    failStr = await readFile(fail, {encoding: 'utf8'})
  } catch (ignored) {
    t.fail(`"${fail}" not found.
use command \`git submodule update --init\` to load test-vectors`)
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

    if (decoded && (typeof decoded === 'object')) {
      delete decoded[cbor.Tagged.INTERNAL_JSON]
      delete redecoded[cbor.Tagged.INTERNAL_JSON]
    }
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
    await t.throwsAsync(async _ => {
      await cbor.decodeAll(f.hex, 'hex')
      console.log('NO THROW', f)
    })
  }
})
