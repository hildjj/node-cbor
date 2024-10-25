'use strict';

const test = require('ava');
const cbor = require(process.env.CBOR_PACKAGE || '../');
const constants = require('../lib/constants');

test('create', t => {
  const u = new cbor.Simple(0);
  t.is(u.value, 0);

  t.is(cbor.Simple.isSimple(u), true);
  t.is(cbor.Simple.isSimple('foo'), false);
  t.is(u.toString(), 'simple(0)');

  t.throws(() => new cbor.Simple('0'));
  t.throws(() => new cbor.Simple(-1));
  t.throws(() => new cbor.Simple(256));
  t.throws(() => new cbor.Simple(1.1));
});

test('decode', t => {
  t.is(cbor.Simple.decode(constants.SIMPLE.NULL), null);
  t.is(typeof (cbor.Simple.decode(constants.SIMPLE.UNDEFINED)), 'undefined');
  t.throws(() => cbor.Simple.decode(-1, false));
});

test('inspect', t => {
  const u = new cbor.Simple(0);
  t.is(u[Symbol.for('nodejs.util.inspect.custom')](), 'simple(0)');
});
