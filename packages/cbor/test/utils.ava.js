'use strict';

const test = require('ava');
const utils = require('../lib/utils');
const {lbe} = require('./cases');
const {hex, bin} = utils;
const {Buffer} = require('buffer'); // NOT the mangled version

test('bin', t => {
  t.deepEqual(utils.bin('1'), hex('01'));
  t.deepEqual(utils.bin('11'), hex('03'));
  t.deepEqual(utils.bin('1100 0000 0000'), hex('0c00'));
});

test('parseCBORint', t => {
  t.is(utils.parseCBORint(24, hex('ff')), 255);
  t.is(utils.parseCBORint(25, hex('ffff')), 65535);
  t.is(utils.parseCBORint(26, hex('00010000')), 65536);
  t.is(utils.parseCBORint(27, hex('0000000100000000')), 4294967296);
  t.throws(() => {
    utils.parseCBORint(28, hex('ff'));
  });
  t.throws(() => {
    utils.parseCBORint(27, hex('ff'));
  });
});

test('parseCBORfloat', t => {
  t.is(utils.parseCBORfloat(bin('0 00000 0000000000')), 0);
  t.is(utils.parseCBORfloat(bin('0 00000000 00000000000000000000000')),
    0);
  t.is(utils.parseCBORfloat(bin(
    '0 00000000000 0000000000000000000000000000000000000000000000000000'
  )), 0);
  t.throws(() => {
    utils.parseCBORfloat(hex('ff'));
  });
  t.throws(() => {
    utils.parseCBORfloat(hex('ff'));
  });
});

test('parseHalf', t => {
  t.is(utils.parseHalf(bin('0 01111 0000000000')), 1);
  t.deepEqual(utils.parseHalf(bin('1 10000 0000000000')), -2);
  t.is(utils.parseHalf(bin('0 11110 1111111111')), 65504);
  t.is(utils.parseHalf(bin('0 00001 0000000000')), 0.00006103515625);
  t.is(utils.parseHalf(bin('0 00000 0000000000')), 0);
  t.deepEqual(utils.parseHalf(bin('1 00000 0000000000')), -0);
  t.deepEqual(utils.parseHalf(bin('0 11111 0000000000')), Infinity);
  t.deepEqual(utils.parseHalf(bin('1 11111 0000000000')), -Infinity);
});

test('arrayEqual', t => {
  t.is(utils.arrayEqual(), true);
  t.is(utils.arrayEqual([]), false);
  t.is(utils.arrayEqual([], []), true);
  t.is(utils.arrayEqual([1], []), false);
  t.is(utils.arrayEqual([1, 2, 3], [1, 2, 3]), true);
  t.is(utils.arrayEqual([1, 2, 3], [1, 2, 4]), false);
});

test('guessEncoding', t => {
  const buf = Buffer.from('0102', 'hex');
  const nof = utils.guessEncoding(
    buf.buffer.slice(buf.offset, buf.offset + buf.length)
  );
  t.is(nof.read().toString('hex'), '0102');
  const ab = new ArrayBuffer(256);
  const u16 = new Uint16Array(ab, 100, 3);
  u16[0] = 512;
  u16[1] = 256;
  u16[2] = 1;
  const nof2 = utils.guessEncoding(u16);
  t.is(nof2.read().toString('hex'), lbe('000200010100', '020001000001'));
  t.throws(() => utils.guessEncoding());
});

test('cborValueToString', t => {
  // eslint-disable-next-line symbol-description
  t.is(utils.cborValueToString(Symbol()), 'Symbol');
  t.is(utils.cborValueToString(Symbol(')')), ')');
  t.is(utils.cborValueToString(Symbol('))')), '))');
  t.is(utils.cborValueToString(Symbol('(()')), '(()');
  t.is(utils.cborValueToString(Symbol('foo')), 'foo');
  t.is(utils.cborValueToString(Symbol('')), 'Symbol');
});
