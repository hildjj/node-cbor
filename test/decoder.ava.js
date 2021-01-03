'use strict'

const cbor = require('../')
const test = require('ava')
const NoFilter = require('nofilter')
const cases = require('./cases')
const streams = require('./streams')
const utils = require('../lib/utils')
const BigNumber = require('bignumber.js').BigNumber

function testAll(t, list, opts) {
  t.plan(list.length)
  return Promise.all(list.map(c => {
    return cbor.decodeFirst(cases.toBuffer(c), opts)
      .then(d => {
        if ((typeof(c[0]) === 'number') && isNaN(c[0])) {
          t.truthy(isNaN(d))
        } else {
          t.deepEqual(d, c[0], cases.toString(c))
        }
      })
  }))
}

function failAll(t, list) {
  t.plan(list.length)
  list.map(c => t.throws(() => cbor.decode(cases.toBuffer(c))))
}

function failFirstAll(t, list) {
  t.plan(list.length)
  return Promise.all(
    list.map(c => t.throwsAsync(cbor.decodeFirst(cases.toBuffer(c)))))
}

function failFirstAllCB(t, list) {
  t.plan(list.length)
  return Promise.all(list.map(c => {
    return new Promise((resolve, reject) => {
      cbor.decodeFirst(cases.toBuffer(c), (er, d) => {
        if (d == null) {
          t.truthy(er, c)
        } else {
          t.throws(() => cbor.Decoder.nullcheck(d), null, c)
        }
        resolve()
      })
    })
  }))
}

test('good', t => testAll(t, cases.bigInts(cases.good)))
test('decode', t => testAll(t, cases.bigInts(cases.decodeGood)))
test('edges', t => failAll(t, cases.decodeBad))
test('bad first', t => failFirstAll(t, cases.decodeBad))
test('bad first cb', t => failFirstAllCB(t, cases.decodeBad))

test('decodeFirstSync', t => {
  t.deepEqual(cbor.decodeFirstSync('02'), 2)

  t.deepEqual(cbor.Decoder.decodeFirstSync('Ag==', 'base64'), 2)
  t.deepEqual(cbor.decode('02', {}), 2)
  t.deepEqual(cbor.decode('f6'), null)
  t.throws(() => cbor.decode())
  t.throws(() => cbor.decode(''))
  t.throws(() => cbor.decode('63666f'))
  t.throws(() => cbor.decodeFirstSync('0203')) // fixed #111

  // decodeFirstSync can take a ReadableStream as well.
  const nf = new NoFilter('010203', 'hex')
  try {
    cbor.decodeFirstSync(nf)
    t.fail()
  } catch (ex) {
    t.deepEqual(ex.value, 1)
    t.is(nf.length, 2)
  }
})

test('decodeAllSync', t => {
  t.deepEqual(cbor.Decoder.decodeAllSync(''), [])
  t.deepEqual(cbor.Decoder.decodeAllSync('0202'), [2, 2])
  t.deepEqual(cbor.Decoder.decodeAllSync('AgI=', 'base64'), [2, 2])
  t.deepEqual(cbor.Decoder.decodeAllSync('0202', {}), [2, 2])
  t.deepEqual(cbor.Decoder.decodeAllSync('f6f6'), [null, null])
  t.deepEqual(cbor.Decoder.decodeAllSync(''), [])
  t.throws(() => cbor.Decoder.decodeAllSync('63666f'))

  const nf = new NoFilter('010203', 'hex')
  t.deepEqual(cbor.Decoder.decodeAllSync(nf), [1, 2, 3])
})

test.cb('add_tag', t => {
  function replaceTag(val) {
    return {foo: val}
  }
  function newTag(val) {
    throw new Error('Invalid tag')
  }
  const d = new cbor.Decoder({
    tags: {0: replaceTag, 127: newTag}
  })
  t.deepEqual(d.tags[0], replaceTag)
  t.deepEqual(d.tags[127], newTag)

  d.on('error', (er) => {
    t.truthy(false, er)
  })
  let count = 0
  d.on('data', (val) => {
    switch (count++) {
      case 0:
        t.deepEqual(val, new cbor.Tagged(127, 1, new Error('Invalid tag')))
        break
      case 1:
        t.deepEqual(val, {foo: 1})
        t.end()
        break
    }
  })
  const b = Buffer.from('d87f01c001', 'hex')
  d.end(b)
})

test.cb('parse_tag', t => {
  cbor.decodeFirst('d87f01', 'hex', (er, vals) => {
    t.falsy(er)
    t.deepEqual(vals, new cbor.Tagged(127, 1))
    t.end()
  })
})

test.cb('error', t => {
  cbor.decodeFirst('d87f01c001', 'hex').catch((er) => {
    t.truthy(er)
    cbor.Decoder.decodeFirst('', {required: true}, (er, d) => {
      t.truthy(er)
      t.falsy(d)
      t.end()
    })
  })
})

test.cb('stream', t => {
  const dt = new cbor.Decoder()

  dt.on('data', (v) => t.deepEqual(v, 1))
  dt.on('end', () => t.end())
  dt.on('error', (er) => t.falsy(er))

  const d = new streams.DeHexStream('01')
  d.pipe(dt)
})

test('decodeFirst', async t => {
  t.plan(8)
  t.is(1, await cbor.decodeFirst('01'))
  t.is(1, await cbor.decodeFirst('AQ==', {
    encoding: 'base64'
  }))
  t.is(cbor.Decoder.NOT_FOUND, await cbor.decodeFirst(''))
  await t.throwsAsync(() => cbor.decodeFirst('', {required: true}))
  await cbor.decodeFirst(Buffer.allocUnsafe(0), (er, v) => {
    t.falsy(er)
    t.is(cbor.Decoder.NOT_FOUND, v)
  })
  await t.throwsAsync(() => cbor.decodeFirst(
    Buffer.allocUnsafe(0),
    {required: true},
    (er, v) => {
      t.truthy(er)
    }))
})

test('decodeAll', async t => {
  t.deepEqual([1], await cbor.decodeAll('01'))
  await t.throwsAsync(() => cbor.decodeAll('7f'))
  t.deepEqual([1], await cbor.decodeAll('01', (er, v) => {
    t.falsy(er)
    t.deepEqual([1], v)
  }))
  await cbor.decodeAll('AQ==', {encoding: 'base64'}, (er, v) => {
    t.falsy(er)
    t.deepEqual([1], v)
  })
  await t.throwsAsync(() => cbor.decodeAll('7f', {}, (er, v) => {
    t.truthy(er)
  }))
  t.deepEqual([1], await cbor.decodeAll('AQ==', 'base64', (er, v) => {
    t.falsy(er)
    t.deepEqual([1], v)
  }))
})

test('depth', t => {
  return t.throwsAsync(cbor.decodeFirst('818180', {max_depth: 1}))
})

test('js BigInt', t => {
  return testAll(t, cases.bigInts(cases.good), {bigint: true})
})

test('bigint option', t => {
  let d = new cbor.Decoder({
    bigint: true,
    tags: {}
  })
  t.is(typeof d.tags[2], 'function')
  d = new cbor.Decoder({
    bigint: true,
    tags: {
      2: () => 'foo',
      3: () => 'bar'
    }
  })
  t.is(d.tags[2](), 'foo')
  t.is(d.tags[3](), 'bar')

  t.deepEqual(cbor.decodeFirstSync('3b001fffffffffffff', { bigint: false}),
    new BigNumber('-9007199254740992'))

  t.deepEqual(cbor.decodeFirstSync('3b011fffffffffffff', { bigint: false}),
    new BigNumber('-81064793292668928'))

  t.deepEqual(cbor.decodeFirstSync('c34720000000000000', { bigint: false}),
    new BigNumber('-9007199254740993'))

  t.deepEqual(cbor.decodeFirstSync('c24720000000000000', { bigint: false}),
    new BigNumber('9007199254740992'))
})

test('typed arrays', t => {
  const buf = Buffer.from('c24720000000000000', 'hex')
  t.is(cbor.decode(buf), 9007199254740992n)
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length)
  t.is(cbor.decode(ab), 9007199254740992n)
  t.is(cbor.decode(new Uint8Array(ab)), 9007199254740992n)
  t.is(cbor.decode(new Uint8ClampedArray(ab)), 9007199254740992n)

  // beware endian-ness
  const u8b = new Uint8ClampedArray([0x61, 0x62])
  t.is(cbor.decode(new Uint16Array(u8b.buffer)), 'b')
  const u8abc = new Uint8ClampedArray([0x63, 0x61, 0x62, 0x63])
  t.is(cbor.decode(new Uint32Array(u8abc.buffer)), 'abc')
  t.is(cbor.decode(new DataView(u8abc.buffer)), 'abc')
})
