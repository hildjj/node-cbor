'use strict'

const cbor = require(process.env.CBOR_PACKAGE || '../')
const test = require('ava')
const pEvent = require('p-event')
const util = require('util')
const cases = require('./cases')
const pdiagnose = util.promisify(cbor.diagnose)
// Use mangled versions
const Buffer = cbor.encode(0).constructor
const NoFilter = new cbor.Commented().all.constructor

function testAll(t, list) {
  t.plan(list.length)
  return Promise.all(
    list.map(
      c => cbor.diagnose(cases.toBuffer(c)).then(d => t.is(d, `${c[1]}\n`))
    )
  )
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

test('construct', async t => {
  const d = new cbor.Diagnose()
  t.is(d.stream_errors, false)
  d.stream_errors = true
  const bs = new NoFilter()
  d.pipe(bs)
  d.end(Buffer.from([0x18]))
  await pEvent(d, 'end')
  t.is(bs.toString('utf8'), 'Error: unexpected end of input')
})

test('stream', async t => {
  const dt = new cbor.Diagnose({
    separator: '-',
  })
  const bs = new NoFilter()
  dt.pipe(bs)
  dt.end(Buffer.from('01', 'hex'))
  await pEvent(dt, 'end')
  t.is(bs.toString('utf8'), '1-')
})

test('inputs', async t => {
  t.throws(() => {
    cbor.diagnose()
  })
  const d = await pdiagnose('01')
  t.truthy(d)
  const d2 = await cbor.diagnose('AQ==', {encoding: 'base64'})
  t.truthy(d2)
  const d3 = await pdiagnose('AQ==', {encoding: 'base64'})
  t.truthy(d3)
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
    stream_errors: true,
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
