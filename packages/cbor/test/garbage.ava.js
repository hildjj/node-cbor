'use strict';

const test = require('ava');
const cbor = require(process.env.CBOR_PACKAGE || '../');
const garbage = require('garbage');

const REPEATS = parseInt(process.env.NODE_CBOR_GARBAGE || 10000, 10);
test('garbage', t => {
  if (process.env.NO_GARBAGE) {
    t.pass();
    return null;
  }
  t.plan(REPEATS);
  const inp = [];
  for (let i = 0; i < REPEATS; i++) {
    inp.push(garbage(100));
  }
  return Promise.all(inp.map(async g => {
    const c = cbor.encode(g);
    const val = await cbor.decodeFirst(c);
    t.deepEqual(val, g);
  }));
});
