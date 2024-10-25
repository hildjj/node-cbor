'use strict';

const cbor_src = process.env.CBOR_PACKAGE || '../';
const cbor = require(cbor_src);
const test = require('ava');
const pEvent = require('p-event');
const util = require('util');
const cases = require('./cases');
const streams = require('./streams');
const BinaryParseStream = require('../vendor/binary-parse-stream');
const pdecodeFirst = util.promisify(cbor.decodeFirst);
// Use mangled versions
const Buffer = cbor.encode(0).constructor;
const NoFilter = new cbor.Commented().all.constructor;

function testAll(t, list, opts) {
  t.plan(list.length);
  return Promise.all(
    list.map(
      c => cbor.decodeFirst(cases.toBuffer(c), opts)
        .then(d => {
          if ((typeof c[0] === 'number') && isNaN(c[0])) {
            t.truthy(isNaN(d));
          } else {
            t.deepEqual(d, c[0], cases.toString(c));
          }
        })
    )
  );
}

function failAll(t, list) {
  t.plan(list.length);
  list.map(c => t.throws(() => cbor.decode(cases.toBuffer(c))));
}

function failFirstAll(t, list) {
  t.plan(list.length);
  return Promise.all(
    list.map(c => t.throwsAsync(cbor.decodeFirst(cases.toBuffer(c))))
  );
}

function failFirstAllCB(t, list) {
  t.plan(list.length);
  return Promise.all(
    list.map(c => new Promise((resolve, reject) => {
      cbor.decodeFirst(cases.toBuffer(c), (er, d) => {
        if (d == null) {
          t.truthy(er, c);
        } else {
          t.throws(() => cbor.Decoder.nullcheck(d), null, c);
        }
        resolve();
      });
    }))
  );
}

test('good', async t => {
  await testAll(t, cases.good);
});
test('decode', async t => {
  await testAll(t, cases.decodeGood);
});
test('edges', async t => {
  await failAll(t, cases.decodeBad);
});
test('bad first', async t => {
  await failFirstAll(t, cases.decodeBad);
});
test('bad first cb', async t => {
  await failFirstAllCB(t, cases.decodeBad);
});

test('decodeFirstSync', t => {
  t.is(cbor.decodeFirstSync('02'), 2);

  t.is(cbor.Decoder.decodeFirstSync('Ag==', 'base64'), 2);
  t.is(cbor.decode('02', {}), 2);
  t.is(cbor.decode('f6'), null);
  t.throws(() => cbor.decode());
  t.throws(() => cbor.decode(''));
  t.throws(() => cbor.decode('63666f'));
  t.throws(() => cbor.decodeFirstSync('0203')); // Fixed #111
  t.throws(() => cbor.decode('01', 12));

  t.is(cbor.decode('01', null), 1);

  // Decodefirstsync can take a ReadableStream as well.
  const nf = new NoFilter('010203', 'hex');
  try {
    cbor.decodeFirstSync(nf);
    t.fail();
  } catch (ex) {
    t.is(ex.value, 1);
    t.is(nf.length, 2);
  }

  t.throws(() => cbor.decodeFirstSync(1));
});

test('decodeAllSync', t => {
  t.deepEqual(cbor.Decoder.decodeAllSync(''), []);
  t.deepEqual(cbor.Decoder.decodeAllSync('0202'), [2, 2]);
  t.deepEqual(cbor.Decoder.decodeAllSync('AgI=', 'base64'), [2, 2]);
  t.deepEqual(cbor.Decoder.decodeAllSync('0202', {}), [2, 2]);
  t.deepEqual(cbor.Decoder.decodeAllSync('f6f6'), [null, null]);
  t.deepEqual(cbor.Decoder.decodeAllSync(''), []);
  t.throws(() => cbor.Decoder.decodeAllSync('63666f'));
  t.throws(() => cbor.Decoder.decodeAllSync());

  const nf = new NoFilter('010203', 'hex');
  t.deepEqual(cbor.Decoder.decodeAllSync(nf), [1, 2, 3]);
});

test('add_tag', async t => {
  function replaceTag(val) {
    return {foo: val};
  }
  function newTag(val) {
    throw new Error('Invalid tag');
  }
  const d = new cbor.Decoder({
    tags: {0: replaceTag, 127: newTag},
  });
  t.deepEqual(d.tags[0], replaceTag);
  t.deepEqual(d.tags[127], newTag);

  d.on('error', er => {
    t.fail(`Stream fail: ${er}`);
  });

  const b = Buffer.from('d87f01c001', 'hex');
  d.end(b);

  const ait = pEvent.iterator(d, 'data', {
    resolutionEvents: ['finish'],
  });

  let count = 0;
  for await (const val of ait) {
    switch (count++) {
      case 0:
        t.deepEqual(val, new cbor.Tagged(127, 1, 'Invalid tag'));
        break;
      case 1:
        t.deepEqual(val, {foo: 1});
        break;
    }
  }
});

test('parse_tag', async t => {
  const vals = await pdecodeFirst('d87f01', 'hex');
  t.deepEqual(vals, new cbor.Tagged(127, 1));
});

test('error', async t => {
  await t.throwsAsync(() => pdecodeFirst('d87f01c001', 'hex'));
  await t.throwsAsync(() => pdecodeFirst('', {required: true}));
});

test('stream', async t => {
  const dt = new cbor.Decoder();

  const d = new streams.DeHexStream('01');
  d.pipe(dt);

  const ait = pEvent.iterator(dt, 'data', {
    resolutionEvents: ['end'],
  });

  for await (const v of ait) {
    t.is(v, 1);
  }
});

test('decodeFirst', async t => {
  t.plan(9);
  t.is(await cbor.decodeFirst('01'), 1);
  t.is(await cbor.decodeFirst('AQ==', {
    encoding: 'base64',
  }), 1);
  t.is(cbor.Decoder.NOT_FOUND, await cbor.decodeFirst(''));
  t.throws(() => cbor.decodeFirst());
  await t.throwsAsync(() => cbor.decodeFirst('', {required: true}));
  await cbor.decodeFirst(Buffer.allocUnsafe(0), (er, v) => {
    t.falsy(er);
    t.is(cbor.Decoder.NOT_FOUND, v);
  });
  await t.throwsAsync(() => cbor.decodeFirst(
    Buffer.allocUnsafe(0),
    {required: true},
    (er, v) => {
      t.truthy(er);
    }
  ));
});

test('decodeAll', async t => {
  t.throws(() => cbor.decodeAll());
  t.deepEqual(await cbor.decodeAll('01'), [1]);
  await t.throwsAsync(() => cbor.decodeAll('7f'));
  t.deepEqual(await cbor.decodeAll('01', (er, v) => {
    t.falsy(er);
    t.deepEqual(v, [1]);
  }), [1]);
  await cbor.decodeAll('AQ==', {encoding: 'base64'}, (er, v) => {
    t.falsy(er);
    t.deepEqual(v, [1]);
  });
  await t.throwsAsync(() => cbor.decodeAll('7f', {}, (er, v) => {
    t.truthy(er);
  }));
  t.deepEqual(await cbor.decodeAll('AQ==', 'base64', (er, v) => {
    t.falsy(er);
    t.deepEqual(v, [1]);
  }), [1]);
});

test('depth', async t => {
  await t.throwsAsync(cbor.decodeFirst('818180', {max_depth: 1}));
});

test('typed arrays', t => {
  const buf = Buffer.from('c24720000000000000', 'hex');
  t.is(cbor.decode(buf), 9007199254740992n);
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length);
  t.is(cbor.decode(ab), 9007199254740992n);
  t.is(cbor.decode(new Uint8Array(ab)), 9007199254740992n);
  t.is(cbor.decode(new Uint8ClampedArray(ab)), 9007199254740992n);

  // Beware endian-ness
  const u8b = new Uint8ClampedArray([0x61, 0x62]);
  t.is(cbor.decode(new Uint16Array(u8b.buffer)), 'b');
  const u8abc = new Uint8ClampedArray([0x63, 0x61, 0x62, 0x63]);
  t.is(cbor.decode(new Uint32Array(u8abc.buffer)), 'abc');
  t.is(cbor.decode(new DataView(u8abc.buffer)), 'abc');
});

test('preferWeb', t => {
  t.deepEqual(cbor.decodeFirstSync('40', {preferWeb: true}),
    new Uint8Array([]));
  t.deepEqual(cbor.decodeFirstSync('4141', {preferWeb: true}),
    new Uint8Array([0x41]));
  t.deepEqual(cbor.decodeFirstSync('5fff', {preferWeb: true}),
    new Uint8Array([]));
  t.deepEqual(cbor.decodeFirstSync('5f42010243030405ff', {preferWeb: true}),
    new Uint8Array([0x01, 0x02, 0x03, 0x04, 0x05]));
});

test('binary-parse-stream edge', t => {
  class BPS extends BinaryParseStream {
    // eslint-disable-next-line class-methods-use-this
    *_parse() {
      yield null;
      throw new Error('unreachable code');
    }
  }
  const b = new BPS();
  b.write('foo');
  t.is(b.read(), null);
});

test('extended results', async t => {
  t.deepEqual(cbor.decodeFirstSync('f663616263', {extendedResults: true}), {
    length: 1,
    bytes: Buffer.from('f6', 'hex'),
    value: null,
    unused: Buffer.from('63616263', 'hex'),
  });
  t.deepEqual(cbor.decodeAllSync('f663616263', {extendedResults: true}), [
    {
      length: 1,
      bytes: Buffer.from('f6', 'hex'),
      value: null,
    },
    {
      length: 4,
      bytes: Buffer.from('63616263', 'hex'),
      value: 'abc',
    },
  ]);
  t.deepEqual(await cbor.decodeFirst('f663616263', {extendedResults: true}), {
    length: 1,
    bytes: Buffer.from('f6', 'hex'),
    value: null,
    unused: Buffer.from('63616263', 'hex'),
  });
});

test('Buffers', t => {
  // Sanity checks for mangled library
  const b = Buffer.from('0102', 'hex');
  t.is(b.toString('hex'), '0102');
  t.deepEqual(b, Buffer.from('0102', 'hex'));
  t.deepEqual(cbor.decode('818181420102', {extendedResults: true}), {
    bytes: Buffer.from('818181420102', 'hex'),
    length: 6,
    unused: null,
    value: [
      [
        [
          Buffer.from('0102', 'hex'),
        ],
      ],
    ],
  });
});

test('duplicate map keys', t => {
  // Default behaviour is unchanged and allows parsing maps with duplicate keys
  t.deepEqual(
    cbor.decode(Buffer.from('a200010002', 'hex')),
    new Map([[0, 2]])
  );
  // When the new decoder option is set the decode will throw
  t.throws(() => cbor.decode(Buffer.from('a200010002', 'hex'), {preventDuplicateKeys: true}));

  // Default behaviour for maps with only string keys is also unchanged
  t.deepEqual(
    cbor.decode(Buffer.from('a268746f537472696e670068746f537472696e6701', 'hex')),
    {
      toString: 1,
    }
  );

  // When parsing a map with only strings as keys the result is an object and
  // we ignore keys from the object's prototype when checking for duplicates
  t.deepEqual(
    cbor.decode(Buffer.from('a268746f537472696e670063666f6f01', 'hex'), {preventDuplicateKeys: true}),
    {
      toString: 0,
      foo: 1,
    }
  );

  t.throws(() => cbor.decode(Buffer.from('a268746f537472696e670068746f537472696e6701', 'hex'), {preventDuplicateKeys: true}));
});

test('preferMap', t => {
  t.deepEqual(
    cbor.decode(Buffer.from('a0', 'hex'), {preferMap: false}),
    {}
  );

  t.deepEqual(
    cbor.decode(Buffer.from('a0', 'hex'), {preferMap: true}),
    new Map()
  );

  t.deepEqual(
    cbor.decode(Buffer.from('a161616161', 'hex'), {preferMap: false}),
    {a: 'a'}
  );

  t.deepEqual(
    cbor.decode(Buffer.from('a161616161', 'hex'), {preferMap: true}),
    new Map([['a', 'a']])
  );
});
