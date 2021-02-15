'use strict'

const path = require('path')
const test = require('ava')
const cbor_modules = path.resolve(
  __dirname, '..', 'packages', 'cbor', 'node_modules'
)
const cbor_web = '../packages/cbor-web/dist/cbor'
let cbor = require(cbor_web)

test('exists', t => {
  // Loaded once with no BigNumber
  t.truthy(cbor)
  t.truthy(cbor.encode)
  t.truthy(cbor.decode)
  t.falsy(cbor.BigNumber)

  // Loaded again, with BigNumber hacked into the path.
  const src = require.resolve(cbor_web)
  delete require.cache[src]
  process.env.NODE_PATH = process.env.NODE_PATH ?
    process.env.NODE_PATH + path.delimiter + cbor_modules :
    cbor_modules
  require('module').Module._initPaths()
  t.truthy(require('bignumber.js'))
  cbor = require(cbor_web)
  t.truthy(cbor.BigNumber)
  t.is(new cbor.BigNumber(10).toString(16), 'a')
})

test('spot check', t => {
  t.is(cbor.encode({a: 1}).toString('hex'), 'a1616101')
  t.deepEqual(cbor.decode('a1616101'), {a: 1})
})
