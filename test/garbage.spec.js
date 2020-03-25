/* eslint-env mocha */
'use strict'

const expect = require('chai').expect
const garbage = require('garbage')

const cbor = require('../src')

// const CBOR_GARBAGE = global.process.env.NODE_CBOR_GARBAGE
// const NO_GARBAGE = global.process.env.NO_GARBAGE
const REPEATS = parseInt(1000)

describe('random data', () => {
  // if (NO_GARBAGE) {
  //   it.skip('garbage', () => {})
  //   return
  // }

  it('garbage', function () {
    this.timeout(20 * 1000)
    for (let i = 0; i < REPEATS; i++) {
      const input = garbage(100)
      const binary = cbor.encode(input)
      const output = cbor.decodeFirst(binary)

      expect(output).to.be.eql(input)
    }
  })
})
