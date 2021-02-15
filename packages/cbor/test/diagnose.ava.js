'use strict'

const cbor = require(process.env.CBOR_PACKAGE || '../')
const test = require('ava')
const cases = require('./cases')
// use mangled versions
const Buffer = cbor.encode(0).constructor
const NoFilter = new cbor.Commented().all.constructor

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
  return Promise.all(list.map(c => t.throwsAsync(
    cbor.diagnose(cases.toBuffer(c))
  )))
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
  d.end(Buffer.from([0x18]))
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
  dt.on('error', er => t.falsy(er))
  dt.pipe(bs)
  dt.end(Buffer.from('01', 'hex'))
})

test.cb('inputs', t => {
  t.throws(() => {
    cbor.diagnose()
  })
  cbor.diagnose('01', (er, d) => {
    t.falsy(er)
    t.truthy(d)
    cbor.diagnose('AQ==', {encoding: 'base64'})
      .then(d2 => {
        t.truthy(d2)
        cbor.diagnose('AQ==', {encoding: 'base64'}, (er2, d3) => {
          t.falsy(er2)
          t.truthy(d3)
          t.end()
        })
      })
  })
})

test('async', async t => {
  let d = await cbor.diagnose('01', {})
  t.is(d, '1\n')
  d = await cbor.diagnose('01', 'hex')
  t.is(d, '1\n')
})

test('stream errors', async t => {
  const d = await cbor.diagnose('01', {
    encoding: 'hex',
    stream_errors: true
  })
  t.is(d, '1\n')
})

test('static', async t => {
  t.throws(() => cbor.diagnose())
  t.throws(() => cbor.diagnose('01', 12))
  t.is(await cbor.diagnose('01', null), '1\n')
  t.is(await cbor.diagnose('01', {encoding: null}), '1\n')
  t.is(await cbor.diagnose('01', {encoding: undefined}), '1\n')
})
