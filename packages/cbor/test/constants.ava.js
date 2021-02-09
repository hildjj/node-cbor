'use strict'

const test = require('ava')
const cases = require('./cases')

test('create', async t => {
  await cases.requireWithFailedDependency(
    '../lib/constants', 'bignumber.js', (cnst) => {
      t.falsy(cnst.BigNumber)
      t.falsy(cnst.BN)
    })
})
