/* eslint-env mocha */
'use strict'

const expect = require('chai').expect
const garbage = require('garbage')

const cbor = require('../src')

const CBOR_GARBAGE = process.env['NODE_CBOR_GARBAGE']
const NO_GARBAGE = process.env.NO_GARBAGE
const REPEATS = parseInt(CBOR_GARBAGE || 10000)

describe.skip('random data', () => {
  if (NO_GARBAGE) {
    it.skip('garbage', () => {})
    return
  }

  it('garbage', () => {
    for (let i = 0; i < REPEATS; i++) {
      const input = garbage(100)
      const binary = cbor.encode(input)
      const output = cbor.decodeFirst(binary)

      expect(output).to.be.eql(input)
    }
  })
})
