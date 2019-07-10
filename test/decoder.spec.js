/* eslint-env mocha */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect
const Bignumber = require('bignumber.js').BigNumber

const cases = require('./fixtures/cases')
const vectors = require('./fixtures/vectors.js')
const cbor = require('../')

const decoder = new cbor.Decoder()

describe('Decoder', function () {
  describe('vectors', () => {
    for (var i = 0; i < vectors.length; i++) {
      if (vectors[i].diagnostic) {
        continue
      }
      testGood(
        Buffer.from(vectors[i].hex, 'hex'),
        vectors[i].decoded,
        vectors[i].hex
      )
    }
  })

  describe('good', () => testAll(cases.good))
  describe('decode', () => testAll(cases.decodeGood))
  describe('edges', () => failAll(cases.decodeBad))
  describe('bad first', () => failFirstAll(cases.decodeBad))

  describe('misc', () => {
    it('custom tags', () => {
      function replaceTag (val) {
        return { foo: val }
      }

      function newTag (val) {
        return 'cool'
      }

      const d = new cbor.Decoder({
        tags: { 0: replaceTag, 127: newTag }
      })

      const input = Buffer.from('d87f01c001', 'hex')

      expect(
        d.decodeAll(input)
      ).to.be.eql([
        'cool', { foo: 1 }
      ])
    })

    it('parse tag', () => {
      const vals = cbor.decodeFirst('d87f01', 'hex')
      expect(vals).to.be.eql(new cbor.Tagged(127, 1))
    })

    it('decodeFirst', () => {
      expect(
        cbor.decodeFirst('01')
      ).to.be.eql(1)

      expect(
        cbor.decodeFirst('AQ==', 'base64')
      ).to.be.eql(1)

      expect(
        () => cbor.decodeFirst('')
      ).to.throw()

      expect(
        () => cbor.decodeFirst(Buffer.from(0))
      ).to.throw()
    })

    it('decodeAll', () => {
      expect(
        cbor.decodeAll('0101')
      ).to.be.eql(
        [1, 1]
      )

      expect(
        cbor.decodeAll('AQ==', 'base64')
      ).to.be.eql(
        [1]
      )

      expect(
        () => cbor.decodeAll('7f')
      ).to.throw()

      expect(cbor.Decoder.decodeAll('0202')).to.be.eql([2, 2])
      expect(cbor.Decoder.decodeAll('AgI=', 'base64')).to.be.eql([2, 2])
      expect(cbor.Decoder.decodeAll('0202')).to.be.eql([2, 2])
      expect(cbor.Decoder.decodeAll('f6f6')).to.be.eql([null, null])
      expect(
        () => cbor.Decoder.decodeAll('63666fj')
      ).to.throw()
    })

    it('decodeFirst large input', () => {
      const largeInput = []
      for (let i = 0; i < 0x10000; i++) {
        largeInput.push('hi')
      }

      expect(
        cbor.decodeFirst(cbor.encode(largeInput))
      ).to.be.eql(
        largeInput
      )
    })

    it('decodeAll large input', () => {
      const largeInput = []
      for (let i = 0; i < 0x10000; i++) {
        largeInput.push('hi')
      }

      expect(
        cbor.decodeAll(cbor.encode(largeInput))
      ).to.be.eql(
        [largeInput]
      )
    })

    it('decode large arrays', () => {
      const input = new Array(256).fill(1)

      expect(
        cbor.decode(cbor.encode(input))
      ).to.be.eql(
        input
      )
    })

    // TODO: implement depth limit
    it.skip('depth', () => {
      expect(
        () => cbor.decodeFirst('818180', { max_depth: 1 })
      ).to.throw()
    })
  })

  describe('large', () => {
    const sizes = [
      1024,
      1024 * 63,
      1024 * 64,
      1024 * 128
    ]

    sizes.forEach((size) => it(`decodes buffer of size ${size} bytes`, () => {
      const input = Buffer.alloc(size)
      input.fill('A')

      expect(
        cbor.decode(cbor.encode(input))
      ).to.be.eql(
        input
      )

      const strRes = cbor.decode(cbor.encode(input.toString('utf8')))
      expect(strRes.length).to.be.eql(size)
      expect(strRes[0]).to.be.eql('A')
    }))
  })
})

function testGood (input, expected, desc) {
  it(desc, () => {
    const res = decoder.decodeFirst(input)

    if (Number.isNaN(expected)) {
      expect(Number.isNaN(res)).to.be.true()
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
      if (Number.isNaN(c[0]) ||
          // Bignum.js needs num.isNaN()
          (c[0] && c[0].isNaN && c[0].isNaN())) {
        expect(Number.isNaN(res)).to.be.true()
      } else {
        expect(res).to.be.eql(c[0])
      }
    })
  })
}

function failAll (list) {
  list.forEach((c) => {
    it(`fails - ${c}`, () => {
      expect(
        () => cbor.decode(cases.toBuffer(c))
      ).to.throw()
    })
  })
}

function failFirstAll (list) {
  list.forEach((c) => {
    it(`fails - ${c}`, () => {
      expect(
        () => cbor.decodeFirst(cases.toBuffer(c))
      ).to.throw()
    })
  })
}
