'use strict'

const Benchmark = require('benchmark')
if (typeof window !== 'undefined') {
  window.Benchmark = Benchmark
}
const cbor = require('cbor')

const fastCbor = require('../')
const vectors = require('../test/fixtures/vectors.json')
const fastDecoder = require('../test/decoder.asm')

const parsed = vectors.map((v) => {
  if (v.decoded) {
    return JSON.stringify(v.decoded)
  }
})
const buffers = vectors.map((v) => {
  if (v.hex) {
    return new Buffer(v.hex, 'hex')
  }
})
const suite = new Benchmark.Suite('cbor')

let vecLength = vectors.length
let res = []

suite.add(`encode vectors - node-cbor - ${vecLength}`, () => {
  for (let i = 0; i < vecLength; i++) {
    res.push(cbor.encode(vectors[i].decoded)[0])
  }
})

suite.add(`encode vectors - fast-cbor - ${vecLength}`, () => {
  for (let i = 0; i < vecLength; i++) {
    res.push(fastCbor.encode(vectors[i].decoded)[0])
  }
})

suite.add(`encode vectors - JSON.stringify - ${vecLength}`, () => {
  for (let i = 0; i < vecLength; i++) {
    res.push(JSON.stringify(vectors[i].decoded))
  }
})

suite.add(`decode vectors - ${vecLength}`, () => {
  for (let i = 0; i < vecLength; i++) {
    cbor.decodeAllSync(vectors[i].hex)
  }
})

suite.add(`decode vectors - fast-cbor - ${vecLength}`, () => {
  for (let i = 0; i < vecLength; i++) {
    // fastCbor.decodeAllSync(vectors[i].hex)
    if (vectors[i].hex) {
      res.push(fastDecoder(buffers[i]))
    }
  }
})

suite.add(`decode vectors - JSON.parse - ${vecLength}`, () => {
  for (let i = 0; i < vecLength; i++) {
    if (parsed[i]) {
      res.push(JSON.parse(parsed[i]))
    }
  }
})

suite
  .on('cycle', (event) => {
    res = []
    console.log(String(event.target))
  })
  .run({
    async: true
  })
