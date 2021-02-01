'use strict'

const path = require('path')
const test = require('ava')
const constants = require('../lib/constants')

// simulate bignumber.js not being installed all the way through the constants
// load path
async function monkeyPatch(fn) {
  const cp = require.resolve('../lib/constants')
  const bp = require.resolve('bignumber.js')
  const oldc = require.cache[cp]
  const oldb = require.cache[bp]
  require.cache[bp] = {
    loaded: true,
    get exports() {
      // see @node/lib/internal/modules/cjs/loader.js#tryPackage()
      const err = new Error(
        `Cannot find module '${bp}'. ` +
        'Please verify that the package.json has a valid "main" entry'
      )
      err.code = 'MODULE_NOT_FOUND'
      err.path = path.resolve('bignumber.js', 'package.json')
      err.requestPath = __filename
    }
  }
  delete require.cache[cp]
  await fn()
  require.cache[cp] = oldc
  require.cache[bp] = oldb
}

test('create', async t => {
  await monkeyPatch(() => {
    const cnst = require('../lib/constants')
    t.falsy(cnst.BigNumber)
    t.falsy(cnst.BN)
  })
})
