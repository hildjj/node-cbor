'use strict'

const Benchmark = require('benchmark')
if (typeof window !== 'undefined') {
  window.Benchmark = Benchmark
}

const nodeCbor = require('cbor')
const cborJs = require('cbor-js')

const fastCbor = require('../')
const vectors = require('../test/fixtures/vectors.json')
const fastDecoder = require('../test/decoder.asm')

const parsed = vectors
      .filter((v) => v.hex && v.decoded)
      .map((v) => JSON.stringify(v.decoded))

const buffers = vectors
      .filter((v) => v.hex && v.decoded)
      .map((v) => new Buffer(v.hex, 'hex'))

const suite = new Benchmark.Suite('cbor')

let vecLength = vectors.length
let res = []

suite.add(`encode - node-cbor - ${vecLength}`, () => {
  for (let i = 0; i < vecLength; i++) {
    res.push(nodeCbor.encode(vectors[i].decoded)[0])
  }
})

suite.add(`encode - cbor-js - ${vecLength}`, () => {
  for (let i = 0; i < vecLength; i++) {
    res.push(cborJs.encode(vectors[i].decoded)[0])
  }
})

suite.add(`encode - fast-cbor - ${vecLength}`, () => {
  for (let i = 0; i < vecLength; i++) {
    res.push(fastCbor.encode(vectors[i].decoded)[0])
  }
})

suite.add(`encode - JSON.stringify - ${vecLength}`, () => {
  for (let i = 0; i < vecLength; i++) {
    res.push(JSON.stringify(vectors[i].decoded))
  }
})

suite.add(`decode - node-cbor - ${buffers.length}`, () => {
  for (let i = 0; i < vecLength; i++) {
    nodeCbor.decodeAllSync(buffers[i])
  }
})

suite.add(`encode - cbor-js - ${buffers.length}`, () => {
  for (let i = 0; i < buffers.length; i++) {
    res.push(cborJs.encode(buffers[i].buffer)[0])
  }
})

suite.add(`decode - fast-cbor - ${buffers.length}`, () => {
  for (let i = 0; i < buffers.length; i++) {
    res.push(fastDecoder(buffers[i]))
  }
})

suite.add(`decode - JSON.parse - ${parsed.length}`, () => {
  for (let i = 0; i < parsed.length; i++) {
    res.push(JSON.parse(parsed[i]))
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
