'use strict';

const cbor_src = process.env.CBOR_PACKAGE || '../';
const cbor = require(cbor_src);
const test = require('ava');
const pEvent = require('p-event');
const cases = require('./cases');
// Use mangled versions
const Buffer = cbor.encode(0).constructor;
const NoFilter = new cbor.Commented().all.constructor;

function testAll(t, list, opts = undefined) {
  t.plan(list.length);
  return list.every(([orig, diag, commented]) => {
    const actual = cbor.encodeOne(orig, opts).toString('hex');
    const expected = cases.toString(commented);
    t.is(actual, expected, diag);
    return true;
  });
}

test('good', t => {
  testAll(t, cases.good);
});
test('encode', t => {
  testAll(t, cases.encodeGood);
});

test('undefined', t => {
  t.is(cbor.Encoder.encode(), null);
  t.is(cbor.encode(undefined, 2).toString('hex'), 'f702');
});

test('badFunc', t => {
  t.throws(() => cbor.encode(() => 'hi'));
  t.throws(() => cbor.encode(Symbol('foo')));
  function foo() {
    return null;
  }
  foo.toString = null;
  t.throws(() => cbor.encode(foo));
});

test('addSemanticType', t => {
  // Before the tag, this is an innocuous object:
  // {"value": "foo"}
  const tc = new cases.TempClass('foo');
  delete (cases.TempClass.prototype.encodeCBOR);
  t.is(cbor.Encoder.encode(tc).toString('hex'), 'a16576616c756563666f6f');
  const gen = new cbor.Encoder({
    genTypes: [cases.TempClass, cases.TempClass.toCBOR],
  });
  gen.write(tc);
  t.is(gen.read().toString('hex'), 'd9fffe63666f6f');

  function hexPackBuffer(gen2, obj, _bufs) {
    gen2.write(`0x${obj.toString('hex')}`);
  // Intentionally don't return
  }

  // Replace Buffer serializer with hex strings
  gen.addSemanticType(Buffer, hexPackBuffer);
  gen.write(Buffer.from('010203', 'hex'));

  t.is(gen.read().toString('hex'), '683078303130323033');

  t.throws(() => gen.addSemanticType('foo', 'bar'));
  t.is(gen.addSemanticType(Buffer), hexPackBuffer);
  t.is(gen.addSemanticType(Buffer), undefined);

  // As object
  const gen2 = new cbor.Encoder({
    genTypes: {
      TempClass: cases.TempClass.toCBOR,
    },
  });
  gen2.write(tc);
  t.is(gen2.read().toString('hex'), 'd9fffe63666f6f');
});

test('stream', async t => {
  const bs = new NoFilter();
  const gen = new cbor.Encoder();
  gen.pipe(bs);
  gen.write(1);
  gen.end(2);
  await pEvent(gen, 'end');
  t.deepEqual(bs.read(), Buffer.from([1, 2]));
});

test('streamNone', async t => {
  const bs = new NoFilter();
  const gen = new cbor.Encoder();
  gen.pipe(bs);
  gen.end();
  await pEvent(gen, 'end');
  t.is(bs.read(), null);
});

test('pushFails', t => {
  cases.EncodeFailer.tryAll(t, [1, 2, 3]);
  cases.EncodeFailer.tryAll(t, new Set([1, 2, 3]));
  cases.EncodeFailer.tryAll(t, new Map([[1, 2], ['a', null]]));
  cases.EncodeFailer.tryAll(t, {a: 1, b: null});
  cases.EncodeFailer.tryAll(t, undefined);
  cases.EncodeFailer.tryAll(t, cases.goodMap, true);
  cases.EncodeFailer.tryAll(t, {a: 1, b: null}, true);

  return new Promise((resolve, reject) => {
    const enc = new cbor.Encoder();
    const o = {
      encodeCBOR() {
        return false;
      },
    };
    enc.on('error', e => {
      t.truthy(e instanceof Error);
      resolve(true);
    });
    enc.on('finish', reject);
    enc.end(o);
  });
});

test('pushAny', t => {
  // Left this in for backward-compat.  This should be the only place it's
  // called.
  const enc = new cbor.Encoder();
  const bs = new NoFilter();
  enc.pipe(bs);
  enc.pushAny(0);
  t.is(bs.read().toString('hex'), '00');
});

test('canonical', t => {
  const enc = new cbor.Encoder({canonical: true});
  const bs = new NoFilter();
  enc.pipe(bs);
  enc.write(cases.goodMap);
  t.is(bs.read().toString('hex'),
    'ad0063626172613063666f6f616101616201626161026262620263616161036362626203806b656d7074792061727261798101656172726179a069656d707479206f626aa1613102636f626af6646e756c6c');
  enc.write({aa: 2, b: 1});
  t.is(bs.read().toString('hex'),
    'a261620162616102');
});

test('canonical numbers', t => {
  const enc = new cbor.Encoder({canonical: true});
  const bs = new NoFilter();
  enc.pipe(bs);

  for (const numEnc of cases.canonNums) {
    enc.write(numEnc[0]);
    t.is(bs.read().toString('hex'), numEnc[1]);
  }
});

test('encodeCanonical', t => {
  t.deepEqual(cbor.encodeCanonical(-1.25), Buffer.from('f9bd00', 'hex'));
});

test('detect loops', t => {
  const enc = new cbor.Encoder({detectLoops: true});
  const bs = new NoFilter();
  enc.pipe(bs);

  const a = {c: false};
  const b = [a];
  enc.write(b);
  t.is(bs.read().toString('hex'), '81a16163f4');
  t.falsy(enc.detectLoops.has(a));
  t.truthy(enc.detectLoops.has(b));
  t.truthy(enc.removeLoopDetectors());
  t.falsy(enc.detectLoops.has(a));
  t.falsy(enc.detectLoops.has(b));
  a.a = a;
  t.throws(() => enc.write(b));

  const can = new cbor.Encoder({detectLoops: true, canonical: true});
  const c = {d: null};
  // This isn't a loop.
  const m = new Map([[c, c]]);
  can.write(m);

  const noLoops = new cbor.Encoder({detectLoops: false});
  t.falsy(noLoops.removeLoopDetectors());
});

test('detect loops, own symbol', t => {
  const s = Symbol('MINE');
  t.throws(() => new cbor.Encoder({detectLoops: s}));
  const ws = new WeakSet();
  const enc = new cbor.Encoder({detectLoops: ws});
  const bs = new NoFilter();
  enc.pipe(bs);

  const a = {c: new Date()};
  enc.write(a);
  t.falsy(ws.has(a));
  t.truthy(ws.has(a.c));
});

test('date types', t => {
  const d = new Date('2018-06-05T14:36:20Z');

  t.throws(() => {
    cbor.encodeOne(d, {dateType: 'blorfff'});
  }, {instanceOf: TypeError});

  t.is(
    cbor.encodeOne(d, {dateType: 'number'}).toString('hex'),
    'c11a5b169fe4'
  );

  t.is(
    cbor.encodeOne(d, {dateType: null}).toString('hex'),
    'c11a5b169fe4'
  );

  t.is(
    cbor.encodeOne(d, {dateType: 'int'}).toString('hex'),
    'c11a5b169fe4'
  );

  t.is(
    cbor.encodeOne(d, {dateType: 'float'}).toString('hex'),
    'c1fb41d6c5a7f9000000'
  );

  t.is(
    cbor.encodeOne(d, {dateType: 'string'}).toString('hex'),
    'c07818323031382d30362d30355431343a33363a32302e3030305a'
  );
});

test('BigInt collapse', t => {
  testAll(
    t,
    cases.collapseBigIntegers,
    {collapseBigIntegers: true}
  );
});

test('arraybuffer types', t => {
  t.is(
    cbor.encodeOne(Buffer.alloc(3)).toString('hex'),
    '43000000'
  );
  t.is(
    cbor.encodeOne(new Uint8Array([1, 2, 3])).toString('hex'),
    'd84043010203'
  );
  t.is(
    cbor.encodeOne(new Uint8ClampedArray([1, 2, 3])).toString('hex'),
    'd84443010203'
  );
  t.is(
    cbor.encodeOne(new ArrayBuffer(3)).toString('hex'),
    '43000000'
  );
  t.is(
    cbor.encodeOne(new Uint16Array([1, 2, 3])).toString('hex'),
    cases.lbe('d84546010002000300', 'd84146000100020003')
  );
  t.is(
    cbor.encodeOne(new Uint32Array([1, 2, 3])).toString('hex'),
    cases.lbe(
      'd8464c010000000200000003000000',
      'd8424c000000010000000200000003'
    )
  );
  t.is(
    cbor.encodeOne(new Int8Array([1, 2, 3])).toString('hex'),
    'd84843010203'
  );
  t.is(
    cbor.encodeOne(new Int16Array([1, 2, 3])).toString('hex'),
    cases.lbe('d84d46010002000300', 'd84946000100020003')
  );
  t.is(
    cbor.encodeOne(new Int32Array([1, 2, 3])).toString('hex'),
    cases.lbe(
      'd84e4c010000000200000003000000',
      'd84a4c000000010000000200000003'
    )
  );
  t.is(
    cbor.encodeOne(new Float32Array([1, 2, 3])).toString('hex'),
    cases.lbe(
      'd8554c0000803f0000004000004040',
      'd8514c3f8000004000000040400000'
    )
  );
  t.is(
    cbor.encodeOne(new Float64Array([1, 2, 3])).toString('hex'),
    cases.lbe(
      'd8565818000000000000f03f00000000000000400000000000000840',
      'd85258183ff000000000000040000000000000004008000000000000'
    )
  );

  t.is(
    cbor.encodeOne(new BigInt64Array([1n, 2n, 3n])).toString('hex'),
    cases.lbe(
      'd84f5818010000000000000002000000000000000300000000000000',
      'd84b5818000000000000000100000000000000020000000000000003'
    )
  );

  t.is(
    cbor.encodeOne(new BigUint64Array([1n, 2n, 3n])).toString('hex'),
    cases.lbe(
      'd8475818010000000000000002000000000000000300000000000000',
      'd8435818000000000000000100000000000000020000000000000003'
    )
  );

  cases.EncodeFailer.tryAll(t, new Float32Array(3));
  cases.EncodeFailer.tryAll(t, new Float64Array(3));
});

test('encoding "undefined"', t => {
  t.is(cbor.encodeOne(undefined).toString('hex'), 'f7');
  t.is(cbor.encodeOne(undefined, {encodeUndefined: null}).toString('hex'), 'f6');
  const undefStr = cbor.encode('undefined');
  t.is(cbor.encodeOne(undefined, {
    encodeUndefined: undefStr,
  }).toString('hex'), '69756e646566696e6564');
  t.throws(() => cbor.encodeOne(undefined, {encodeUndefined: () => {
    throw new Error('ha');
  }}));
  t.is(cbor.encodeOne(undefined, {
    encodeUndefined: () => undefStr,
  }).toString('hex'), '4a69756e646566696e6564');
  const m = new Map([[undefined, 1]]);
  t.throws(() => cbor.encodeOne(m, {
    disallowUndefinedKeys: true,
  }));
  t.throws(() => cbor.encodeOne(m, {
    disallowUndefinedKeys: true,
    canonical: true,
  }));
});

test('URL', t => {
  t.is(cbor.encodeOne(new URL('https://example.net')).toString('hex'),
    'd8207468747470733a2f2f6578616d706c652e6e65742f');
});

test('big', async t => {
  const buf = Buffer.alloc(16385);
  const bc = cbor.encodeOne([buf, buf], {highWaterMark: 50000});
  t.is(bc.length, 32777);
  const bd = await cbor.encodeAsync([buf, buf]);
  t.is(bd.length, 32777);
});

class IndefiniteClass {
  encodeCBOR(gen) {
    const b = Buffer.from('1234567890');
    const buf = new Uint8Array(b.buffer, b.byteOffset, b.byteLength);
    return cbor.Encoder.encodeIndefinite(gen, '1234567890', {chunkSize: 3}) &&
      cbor.Encoder.encodeIndefinite(gen, buf, {chunkSize: 3}) &&
      cbor.Encoder.encodeIndefinite(gen, this);
  }
}

test('indefinite', t => {
  const gen = new cbor.Encoder();

  t.throws(() => cbor.Encoder.encodeIndefinite.call(null, gen, null));
  t.throws(() => cbor.Encoder.encodeIndefinite.call(null, gen, true));
  const i = new IndefiniteClass();
  i.a = true;
  t.is(
    cbor.encodeOne(i).toString('hex'),
    '7f6331323363343536633738396130ff5f4331323343343536433738394130ffbf6161f5ff'
  );
  cases.EncodeFailer.tryAll(t, i);

  const m = new Map([['a', true]]);
  m.encodeCBOR = cbor.Encoder.encodeIndefinite;
  t.is(cbor.encodeOne(m).toString('hex'), 'bf6161f5ff');
  cases.EncodeFailer.tryAll(t, m);

  const a = [1, Infinity, null, undefined];
  a.encodeCBOR = cbor.Encoder.encodeIndefinite;
  t.is(cbor.encodeOne(a).toString('hex'), '9f01f97c00f6f7ff');
  cases.EncodeFailer.tryAll(t, a);

  const o = {
    a: true,
    encodeCBOR: cbor.Encoder.encodeIndefinite,
  };
  t.is(cbor.encodeOne(o, {detectLoops: true}).toString('hex'), 'bf6161f5ff');
});

test('Buffers', t => {
  // Sanity checks for mangled library
  const b = Buffer.from('0102', 'hex');
  t.is(b.toString('hex'), '0102');
  t.deepEqual(b, Buffer.from('0102', 'hex'));
});

test('boxed', t => {
  // eslint-disable-next-line no-new-wrappers
  t.is(cbor.encode(new Number(12)).toString('hex'), '0c');
  // eslint-disable-next-line no-new-wrappers
  t.is(cbor.encode(new String(12)).toString('hex'), '623132');
  // eslint-disable-next-line no-new-wrappers
  t.is(cbor.encode(new Boolean(12)).toString('hex'), 'f5');
});

test('omitUndefinedProperties', t => {
  let buf = cbor.encodeOne(
    {a: undefined, b: null, c: 0},
    {omitUndefinedProperties: true}
  );
  t.is(buf.toString('hex'), 'a26162f6616300');
  buf = cbor.encodeOne(
    new Map([['a', undefined], ['b', null], ['c', 0]]),
    {omitUndefinedProperties: true}
  );
  t.is(buf.toString('hex'), 'a26162f6616300');
});
