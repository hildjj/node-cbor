/* eslint-env mocha */
'use strict'

const expect = require('chai').expect
const Bignumber = require('bignumber.js')

const cases = require('./fixtures/cases')
const vectors = require('./fixtures/vectors.json')
const cbor = require('../')

const decoder = new cbor.Decoder()

describe('Decoder', function () {
  describe('vectors', () => {
    for (var i = 0; i < vectors.length; i++) {
      if (vectors[i].diagnostic) {
        continue
      }
      testGood(
        new Buffer(vectors[i].hex, 'hex'),
        vectors[i].decoded,
        vectors[i].hex
      )
    }
  })

  describe('good', () => testAll(cases.good))
  describe('decode', () => testAll(cases.decodeGood))
  describe('edges', () => failAll(cases.decodeBad))
  describe('bad first', () => failFirstAll(cases.decodeBad))

  it('decodeAll', () => {
    expect(cbor.Decoder.decodeAll('0202')).to.be.eql([2, 2])
    expect(cbor.Decoder.decodeAll('AgI=', 'base64')).to.be.eql([2, 2])
    expect(cbor.Decoder.decodeAll('0202', {}))([2, 2])
    expect(cbor.Decoder.decodeAll('f6f6')).to.be.eql([null, null])
    expect(cbor.Decoder.decodeAll('')).to.be.eql([])
    expect(
      () => cbor.Decoder.decodeAll('63666f')
    ).to.throw()
  })

  it.skip('custom tags', () => {
    function replaceTag (val) {
      return {foo: val}
    }
    function newTag (val) {
      throw new Error('Invalid tag')
    }

    const d = new cbor.Decoder({
      tags: {0: replaceTag, 127: newTag}
    })

    const input = new Buffer('d87f01c001', 'hex')

    // TODO: figure out how to test custom tags
    expect(
      d.decodeFirst(input)
    ).to.be.eql({
    })
  })

  it.skip('parse_tag', () => {
    const vals = cbor.decodeFirst('d87f01', 'hex')
    expect(vals).to.be.eql(new cbor.Tagged(127, 1))
  })

  it.skip('error', () => {
    expect(
      () => cbor.decodeFirst('d87f01c001', 'hex')
    ).to.throw()

    expect(
      () => cbor.Decoder.decodeFirst('', {required: true})
    ).to.throw()
  })

  it.skip('decodeFirst', () => {
    expect(
      cbor.decodeFirst('01')
    ).to.be.eql(1)

    expect(
      cbor.decodeFirst('AQ==', {
        encoding: 'base64'
      })
    ).to.be.eql(1)

    expect(
      cbor.decodeFirst('')
    ).to.be.eql(cbor.Decoder.NOT_FOUND)

    expect(
      () => cbor.decodeFirst('', {required: true})
    ).to.throw()

    expect(
      cbor.decodeFirst(new Buffer(0))
    ).to.be.eql(cbor.Decoder.NOT_FOUND)

    expect(
      () => cbor.decodeFirst(new Buffer(0), {required: true})
    ).to.throw()
  })

  it.skip('decodeAll', () => {
    expect(
      cbor.decodeAll('01')
    ).to.be.eql(
      [1]
    )

    expect(
      cbor.decodeAll('AQ==', {encoding: 'base64'})
    ).to.be.eql(
      [1]
    )

    expect(
      cbor.decodeAll('AQ==', 'base64')
    ).to.be.eql(
      [1]
    )

    expect(
      () => cbor.decodeAll('7f', {})
    ).to.throw()
  })

  it('depth', () => {
    expect(
      () => cbor.decodeFirst('818180', {max_depth: 1})
    ).to.throw()
  })
})

function testGood (input, expected, desc) {
  it(desc, () => {
    const res = decoder.decodeFirst(input)

    if (isNaN(expected)) {
      expect(isNaN(res)).to.be.true
    } else if (res instanceof Bignumber) {
      expect(res).be.eql(new Bignumber(String(expected)))
    } else {
      expect(res).to.be.eql(expected)
    }
  })
}

function testAll (list) {
  list.forEach((c) => {
    it(c[1], () => {
      const res = cbor.decodeFirst(cases.toBuffer(c))
      if (isNaN(c[0])) {
        expect(isNaN(res)).to.be.true
      } else {
        expect(res).to.be.eql(c[0])
      }
    })
  })
}

function failAll (list) {
  list.forEach((c) => {
    it(`fails - ${c[1]}`, () => {
      expect(
        () => cbor.decode(cases.toBuffer(c))
      ).to.throw()
    })
  })
}

function failFirstAll (list) {
  list.forEach((c) => {
    it(`fails - ${c[1]}`, () => {
      expect(
        () => cbor.decodeFirst(cases.toBuffer(c))
      ).to.throw()
    })
  })
}
