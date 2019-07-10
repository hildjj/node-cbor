/* eslint max-nested-callbacks: ["error", 8] */
/* eslint-env mocha */
'use strict'

const expect = require('chai').expect
const Bignum = require('bignumber.js').BigNumber

const cbor = require('../')
const cases = require('./fixtures/cases')
const vectors = require('./fixtures/vectors.js')

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
  describe('good', () => testAll(cases.good))
  describe('encode', () => testAll(cases.encodeGood))
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

    it('addSemanticType', () => {
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

      class HexBuffer {
        constructor (val, enc) {
          this.val = Buffer.from(val, enc)
        }

        toString (enc) {
          return this.val.toString(enc)
        }
      }

      // replace Buffer serializer with hex strings
      gen.addSemanticType(HexBuffer, hexPackBuffer)
      gen.pushAny(new HexBuffer('010203', 'hex'))

      expect(
        gen.finalize().toString('hex')
      ).to.be.eql(
        '683078303130323033'
      )
    })
  })

  it('streaming mode', () => {
    const chunks = []
    const enc = new cbor.Encoder({
      stream (chunk) {
        chunks.push(chunk)
      }
    })

    enc.write('hello')
    enc.write('world')
    enc.write({ a: 1 })
    enc.write(123456)

    expect(chunks).to.be.eql([
      Buffer.from('65', 'hex'),
      Buffer.from('68656c6c6f', 'hex'),
      Buffer.from('65', 'hex'),
      Buffer.from('776f726c64', 'hex'),
      Buffer.from('a1', 'hex'),
      Buffer.from('6161', 'hex'),
      Buffer.from('01', 'hex'),
      Buffer.from('1a', 'hex'),
      Buffer.from('0001e240', 'hex')
    ])
  })

  it('pushFails', () => {
    cases.EncodeFailer.tryAll([1, 2, 3])
    cases.EncodeFailer.tryAll(new Set([1, 2, 3]))
    cases.EncodeFailer.tryAll(new Bignum(0))
    cases.EncodeFailer.tryAll(new Bignum(1.1))
    cases.EncodeFailer.tryAll(new Map([[1, 2], ['a', null]]))
    cases.EncodeFailer.tryAll({ a: 1, b: null })
    cases.EncodeFailer.tryAll(undefined)
  })

  describe('canonical', () => {
    it('keys', () => {
      expect(
        cbor.Encoder.encode(cases.goodMap).toString('hex')
      ).to.be.eql(
        'ad0063626172806b656d707479206172726179a069656d707479206f626af6646e756c6c613063666f6f6161016162018101656172726179626161026262620263616161036362626203a1613102636f626a'
      )

      expect(
        cbor.Encoder.encode({ aa: 2, b: 1 }).toString('hex')
      ).to.be.eql(
        'a261620162616102'
      )
    })

    describe('numbers', () => {
      for (let numEnc of cases.canonNums) {
        it(`${numEnc[0]} -> ${numEnc[1]}`, () => {
          expect(
            cbor.Encoder.encode(numEnc[0]).toString('hex')
          ).to.be.eql(
            numEnc[1]
          )
        })
      }
    })
  })

  describe('nested classes', () => {
    class Serializable {
      serialize () {
        const encoder = new cbor.Encoder()
        const ret = this.encodeCBOR(encoder)
        if (!ret) {
          throw new Error('unable to serialize input')
        }
        return encoder.finalize()
      }

      static deserialize (serialized) {
        return cbor.decodeAll(serialized)
      }
    }

    class TestA extends Serializable {
      encodeCBOR (gen) {
        return gen.write(44)
      }
    }

    class TestB extends Serializable {
      encodeCBOR (gen) {
        return gen.write([
          new TestA(),
          true
        ])
      }
    }

    it('flat', () => {
      const a1 = new TestA()

      expect(a1.serialize()).to.be.eql(Buffer.from([24, 44]))
      expect(TestA.deserialize(a1.serialize())).to.be.eql([44])
    })

    it('nested', () => {
      const b1 = new TestB()
      const encoded = b1.serialize()
      expect(TestB.deserialize(encoded)).to.be.eql([[44, true]])
    })
  })
})
