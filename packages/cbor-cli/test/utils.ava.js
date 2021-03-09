'use strict'

const test = require('ava')
const NoFilter = require('nofilter')
const mockIo = require('mock-stdio')
const utils = require('../lib/utils')
const { Buffer } = require('buffer') // not the mangled version

const BAD_FILE = '/tmp/hopefully-does-not-exist'

test('DeHexStream', t => {
  ;[
    ['6161', 'aa'],
    ['0x00', '\x00']
  ].forEach(hd => {
    const d = new utils.DeHexStream(hd[0])
    t.deepEqual(d.read().toString(), hd[1])
  })
  ;[
    ['', null],
    ['0x', null]
  ].forEach(hd => {
    const d = new utils.DeHexStream(hd[0])
    t.deepEqual(d.read(), hd[1])
  })
})

test.cb('HexStream', t => {
  const h = new utils.HexStream()
  const bs = new NoFilter()
  h.pipe(bs)
  h.on('end', () => {
    t.is(bs.toString('utf8'), '61')
    t.end()
  })
  h.end(Buffer.from([0x61]))
})

test.cb('streamFilesNone', t => {
  utils.streamFiles([], () => {}, () => {
    utils.streamFiles([BAD_FILE], () => new utils.HexStream(), er => {
      t.truthy(er)
      t.end()
    })
  })
})

test.cb('streamFilesDash', t => {
  const u = new utils.HexStream()
  const bs = new NoFilter()
  u.pipe(bs)
  utils.streamFiles([new utils.DeHexStream('6161')], () => u, er => {
    t.falsy(er)
    t.is(bs.toString('utf8'), '6161')
    t.end()
  })
})

test.cb('streamFilesInputs', t => {
  const u = new utils.HexStream()
  const bs = new NoFilter()
  u.pipe(bs)
  utils.streamFiles([
    new utils.DeHexStream('48656c6c6f2c20576f726c64210a')
  ], () => u, er => {
    t.falsy(er)
    t.end()
  })
})

test('printError', t => {
  mockIo.start()
  utils.printError(null)
  t.deepEqual(mockIo.end(), {stderr: '', stdout: ''})
  mockIo.start()
  utils.printError(new Error('Fake error'))
  const res = mockIo.end()
  t.is(res.stdout, '')
  t.truthy(res.stderr.startsWith('Error: Fake error'))
})
