'use strict';

const test = require('ava');
const cbor = require('../packages/cbor-web/dist/cbor');
const bdec = require('../packages/cbor-bigdecimal/dist/cbor-bigdecimal');

test('exists', t => {
  t.truthy(cbor);
  t.is(typeof cbor.encode, 'function');
  t.is(typeof cbor.decode, 'function');
});

test('spot check', t => {
  t.is(cbor.encode({a: 1}).toString('hex'), 'a1616101');
  t.deepEqual(cbor.decode('a1616101'), {a: 1});
});

test('bigdecimal', t => {
  bdec(cbor);
  const pi3 = new bdec.BigNumber(Math.PI).pow(3);
  const pi3cbor = cbor.encode(pi3).toString('hex');
  t.is(
    pi3cbor,
    'c482382cc254056e5e99b1be81b6eefa3964490ac18c69399361'
  );
  t.deepEqual(cbor.decodeFirstSync(pi3cbor), pi3);
  cbor.reset();
});
