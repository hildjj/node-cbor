'use strict';

const cbor = require(process.env.CBOR_PACKAGE || '../../cbor');
const bigdec = require('..');
const cases = require('../../cbor/test/cases');
const test = require('ava');
const {BigNumber} = bigdec;

function enc(t, n, expected) {
  t.is(cbor.encodeOne(new BigNumber(n)).toString('hex'), expected);
}

test.before(t => {
  bigdec(cbor);
});

test.after(t => {
  cbor.reset();
});

test('encode', t => {
  enc(t, NaN, 'f97e00');
  enc(t, Infinity, 'f97c00');
  enc(t, -Infinity, 'f9fc00');
  enc(t, 0, 'c24100');
  enc(t, 1, 'c24101');
  enc(t, -1, 'c34100');
  enc(t,
    new BigNumber(Number.MAX_SAFE_INTEGER).pow(2),
    'c24e03ffffffffffffc0000000000001');
  enc(t, 10.1, 'c482201865');
  enc(t, 100.1, 'c482201903e9');
  enc(t, 0.1, 'c4822001');
  enc(t, -0.1, 'c4822020');
  enc(t,
    new BigNumber(Math.PI).pow(3),
    'c482382cc254056e5e99b1be81b6eefa3964490ac18c69399361');
  enc(t,
    new BigNumber('18446744073709551615.1'),
    'c48220c24909fffffffffffffff7');
});

test('failures', t => {
  cases.EncodeFailer.tryAll(t, new BigNumber(-0.1));
});

test('decode', async t => {
  t.deepEqual(await cbor.decodeFirst('c4822001'), new BigNumber(0.1));
  t.deepEqual(await cbor.decodeFirst('c5822003'), new BigNumber(1.5));
});
