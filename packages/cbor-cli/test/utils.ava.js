'use strict';

const test = require('ava');
const NoFilter = require('nofilter');
const pEvent = require('p-event');
const mockIo = require('mock-stdio');
const utils = require('../lib/utils');
const {Buffer} = require('node:buffer'); // Not the mangled version

const BAD_FILE = '/tmp/hopefully-does-not-exist';

test('DeHexStream', t => {
  [
    ['6161', 'aa'],
    ['0x00', '\x00'],
  ].forEach(hd => {
    const d = new utils.DeHexStream(hd[0]);
    t.deepEqual(d.read().toString(), hd[1]);
  });
  [
    ['', null],
    ['0x', null],
  ].forEach(hd => {
    const d = new utils.DeHexStream(hd[0]);
    t.deepEqual(d.read(), hd[1]);
  });
});

test('HexStream', async t => {
  const h = new utils.HexStream();
  const bs = new NoFilter();
  h.pipe(bs);
  h.end(Buffer.from([0x61]));
  await pEvent(h, 'end');
  t.is(bs.toString('utf8'), '61');
});

test('streamFilesNone', async t => {
  await utils.streamFiles([], () => null);
  await t.throwsAsync(() => utils.streamFiles(
    [BAD_FILE], () => new utils.HexStream()
  ));
});

test('streamFilesDash', async t => {
  const u = new utils.HexStream();
  const bs = new NoFilter();
  u.pipe(bs);
  await utils.streamFiles([new utils.DeHexStream('6161')], () => u);
  t.is(bs.toString('utf8'), '6161');
});

test('streamFilesInputs', async t => {
  t.plan(1);
  const u = new utils.HexStream();
  const bs = new NoFilter();
  u.pipe(bs);

  await utils.streamFiles([
    new utils.DeHexStream('48656c6c6f2c20576f726c64210a'),
  ], () => u);
  t.is(bs.read().toString(), '48656c6c6f2c20576f726c64210a');
});

test('printError', t => {
  mockIo.start();
  utils.printError(null);
  t.deepEqual(mockIo.end(), {stderr: '', stdout: ''});
  mockIo.start();
  utils.printError(new Error('Fake error'));
  const res = mockIo.end();
  t.is(res.stdout, '');
  t.truthy(res.stderr.startsWith('Error: Fake error'));
});
