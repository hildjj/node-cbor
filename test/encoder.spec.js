/* eslint max-nested-callbacks: ["error", 8] */
/* eslint-env mocha */
'use strict'

const expect = require('chai').expect

const cbor = require('../')
const cases = require('./fixtures/cases')
const vectors = require('./fixtures/vectors.json')

function testAll (list) {
  list.forEach((c) => {
    it(c[1], () => {
      expect(
        cbor.encode(c[0]).toString('hex')
      ).to.be.eql(
        cases.toString(c)
      )
    })
  })
}

describe('encoder', () => {
  describe('good', () => {
    testAll(cases.good)
  })

  describe('encode', () => {
    testAll(cases.encodeGood)
  })

  describe('vectors', () => {
    // Test vectors from https://github.com/cbor/test-vectors
    vectors.forEach((v) => {
      if (v.decoded && v.roundtrip) {
        it(v.hex, () => {
          expect(
            cbor.encode(v.decoded).toString('hex')
          ).to.be.eql(
            v.hex
          )
        })
      }
    })
  })

  describe('misc', () => {
    it('undefined', () => {
      expect(
        cbor.encode(undefined).toString('hex')
      ).to.be.eql(
        'f7'
      )
    })

    it('badFunc', () => {
      expect(
        () => cbor.encode(() => 'hi')
      ).to.throw()

      expect(
        () => cbor.encode(Symbol('foo'))
      ).to.throw()
    })

    // TODO: reenable the ability to overwrite builtin encoders
    it.skip('addSemanticType', () => {
      // before the tag, this is an innocuous object:
      // {"value": "foo"}
      let tc = new cases.TempClass('foo')
      delete (cases.TempClass.prototype.encodeCBOR)
      expect(
        cbor.Encoder.encode(tc).toString('hex')
      ).to.be.eql(
        'a16576616c756563666f6f'
      )

      const gen = new cbor.Encoder({
        genTypes: [
          [cases.TempClass, cases.TempClass.toCBOR]
        ]
      })
      gen.pushAny(tc)

      expect(
        gen.finalize().toString('hex')
      ).to.be.eql(
        'd9fffe63666f6f'
      )

      function hexPackBuffer (gen, obj, bufs) {
        gen.pushAny('0x' + obj.toString('hex'))
        // intentionally don't return
      }

      // replace Buffer serializer with hex strings
      gen.addSemanticType(Buffer, hexPackBuffer)
      gen.pushAny(new Buffer('010203', 'hex'))

      expect(
        gen.finalize().toString('hex')
      ).to.be.eql(
        '683078303130323033'
      )
    })
  })

  // TODO: figure out a way to test failures
  it.skip('pushFails', () => {
    // cases.EncodeFailer.tryAll([1, 2, 3])
    // cases.EncodeFailer.tryAll(new Set([1, 2, 3]))
    // cases.EncodeFailer.tryAll(new BigNum(0))
    // cases.EncodeFailer.tryAll(new BigNum(1.1))
    // cases.EncodeFailer.tryAll(new Map([[1, 2], ['a', null]]))
    // cases.EncodeFailer.tryAll({a: 1, b: null})
    // cases.EncodeFailer.tryAll(undefined)
  })
})
