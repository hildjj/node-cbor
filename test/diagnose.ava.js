'use strict'

const NoFilter = require('nofilter')
const cbor = require('../')
const test = require('ava')
const cases = require('./cases')

function testAll(t, list) {
  t.plan(list.length)
  return Promise.all(list.map(c => {
    return cbor.diagnose(cases.toBuffer(c))
      .then(d => {
        return t.is(d, c[1] + '\n')
      })
  }))
}

function failAll(t, list) {
  t.plan(list.length)
  return Promise.all(list.map(c => t.throws(cbor.diagnose(cases.toBuffer(c)))))
}

test('diagnose', t => testAll(t, cases.good))
test('decode', t => testAll(t, cases.decodeGood))
test('edges', t => failAll(t, cases.decodeBad))

test.cb('construct', t => {
  const d = new cbor.Diagnose()
  t.is(d.stream_errors, false)
  d.stream_errors = true
  const bs = new NoFilter()
  d.pipe(bs)
  d.on('end', () => {
    t.is(bs.toString('utf8'), 'Error: unexpected end of input')
    t.end()
  })
  d.end(new Buffer([0x18]))
})

test.cb('stream', t => {
  const dt = new cbor.Diagnose({
    separator: '-'
  })
  const bs = new NoFilter()

  dt.on('end', () => {
    t.is(bs.toString('utf8'), '1-')
    t.end()
  })
  dt.on('error', (er) => t.ifError(er))
  dt.pipe(bs)
  dt.end(new Buffer('01', 'hex'))
})

test.cb('inputs', t => {
  t.throws(() => {
    cbor.diagnose()
  })
  cbor.diagnose('01', (er, d) => {
    t.ifError(er)
    t.truthy(d)
    cbor.diagnose('AQ==', {encoding: 'base64'})
      .then((d) => {
        t.truthy(d)
        cbor.diagnose('AQ==', {encoding: 'base64'}, (er, d) => {
          t.ifError(er)
          t.truthy(d)
          t.end()
        })
      })
  })
})
