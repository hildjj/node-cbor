/* eslint-env mocha */
'use strict'

const expect = require('chai').expect
const utils = require('../src/utils')

function bin (s) {
  let chunks
  let end
  let start

  s = s.replace(/\s/g, '')
  start = 0
  end = (s.length % 8) || 8
  chunks = []
  while (end <= s.length) {
    chunks.push(parseInt(s.slice(start, end), 2))
    start = end
    end += 8
  }

  return new Buffer(chunks)
}

describe('utils', () => {
  it('parseHalf', () => {
    expect(
      utils.parseHalf(bin('0011110000000000'))
    ).to.be.eql(1)
    expect(
      utils.parseHalf(bin('1100000000000000'))
    ).to.be.eql(-2)
    expect(
      utils.parseHalf(bin('0111101111111111'))
    ).to.be.eql(65504)
    expect(
      utils.parseHalf(bin('0000010000000000'))
    ).to.be.eql(0.00006103515625)
    expect(
      utils.parseHalf(bin('0000000000000000'))
    ).to.be.eql(0)
    expect(
      utils.parseHalf(bin('1000000000000000'))
    ).to.be.eql(-0)
    expect(
      utils.parseHalf(bin('0111110000000000'))
    ).to.be.eql(Infinity)
    expect(
      utils.parseHalf(bin('1111110000000000'))
    ).to.be.eql(-Infinity)
  })

  it('buildMap', () => {
    expect(
      Array.from(utils.buildMap({
        hello: 'world',
        1: 2,
        '/$)§)': 89
      }))
    ).to.be.eql([
      ['1', 2],
      ['hello', 'world'],
      ['/$)§)', 89]
    ])
  })

  it('isNegativeZero', () => {
    expect(utils.isNegativeZero(-0)).to.be.eql(true)
    expect(utils.isNegativeZero(0)).to.be.eql(false)
    expect(utils.isNegativeZero(-12)).to.be.eql(false)
    expect(utils.isNegativeZero(12)).to.be.eql(false)
    expect(utils.isNegativeZero(-12.3)).to.be.eql(false)
    expect(utils.isNegativeZero(12.5)).to.be.eql(false)
    expect(utils.isNegativeZero(-Infinity)).to.be.eql(false)
  })
})
