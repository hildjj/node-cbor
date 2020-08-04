'use strict'

const cbor = require('../')
const test = require('ava')
const cases = require('./cases')
const NoFilter = require('nofilter')
const BigNum = require('bignumber.js').BigNumber
const url = require('url')

function testAll(t, list, opts=undefined) {
  t.plan(list.length)
  return Promise.all(list.map(c => {
    t.is(cbor.encodeOne(c[0], opts).toString('hex'), cases.toString(c), c[1])
  }))
}

test('good', t => testAll(t, cases.good))
test('encode', t => testAll(t, cases.encodeGood))

test('undefined', t => {
  t.is(cbor.Encoder.encode(), null)
  t.is(cbor.encode(undefined, 2).toString('hex'), 'f702')
})

test('badFunc', t => {
  t.throws(() => cbor.encode(() => 'hi'))
  t.throws(() => cbor.encode(Symbol('foo')))
  function foo() {}
  foo.toString = null
  t.throws(() => cbor.encode(foo))
})

test('addSemanticType', t => {
  // before the tag, this is an innocuous object:
  // {"value": "foo"}
  const tc = new cases.TempClass('foo')
  delete (cases.TempClass.prototype.encodeCBOR)
  t.is(cbor.Encoder.encode(tc).toString('hex'), 'a16576616c756563666f6f')
  const gen = new cbor.Encoder({
    genTypes: [cases.TempClass, cases.TempClass.toCBOR]
  })
  gen.write(tc)
  t.is(gen.read().toString('hex'), 'd9fffe63666f6f')

  function hexPackBuffer(gen, obj, bufs) {
    gen.write('0x' + obj.toString('hex'))
  // intentionally don't return
  }

  // replace Buffer serializer with hex strings
  gen.addSemanticType(Buffer, hexPackBuffer)
  gen.write(Buffer.from('010203', 'hex'))

  t.is(gen.read().toString('hex'), '683078303130323033')
})

test.cb('stream', t => {
  const bs = new NoFilter()
  const gen = new cbor.Encoder()
  gen.on('end', () => {
    t.deepEqual(bs.read(), Buffer.from([1, 2]))
    t.end()
  })
  gen.pipe(bs)
  gen.write(1)
  gen.end(2)
})

test.cb('streamNone', t => {
  const bs = new NoFilter()
  const gen = new cbor.Encoder()
  gen.on('end', () => {
    t.deepEqual(bs.read(), null)
    t.end()
  })
  gen.pipe(bs)
  gen.end()
})

test('pushFails', t => {
  cases.EncodeFailer.tryAll(t, [1, 2, 3])
  cases.EncodeFailer.tryAll(t, new Set([1, 2, 3]))
  cases.EncodeFailer.tryAll(t, new BigNum(0))
  cases.EncodeFailer.tryAll(t, new BigNum(1.1))
  cases.EncodeFailer.tryAll(t, new Map([[1, 2], ['a', null]]))
  cases.EncodeFailer.tryAll(t, {a: 1, b: null})
  cases.EncodeFailer.tryAll(t, undefined)
  cases.EncodeFailer.tryAll(t, cases.goodMap, true)
  cases.EncodeFailer.tryAll(t, {a: 1, b: null}, true)

  return new Promise((resolve, reject) => {
    const enc = new cbor.Encoder()
    const o = {
      encodeCBOR() {
        return false
      }
    }
    enc.on('error', e => {
      t.truthy(e instanceof Error)
      resolve(true)
    })
    enc.on('finish', reject)
    enc.end(o)
  })
})

test('_pushAny', t => {
  // Left this in for backward-compat.  This should be the only place it's
  // called.
  const enc = new cbor.Encoder()
  const bs = new NoFilter()
  enc.pipe(bs)
  enc._pushAny(0)
  t.deepEqual(bs.read(), Buffer.from('00', 'hex'))
})

test('canonical', t => {
  const enc = new cbor.Encoder({canonical: true})
  const bs = new NoFilter()
  enc.pipe(bs)
  enc.write(cases.goodMap)
  t.is(bs.read().toString('hex'),
    'ad0063626172613063666f6f616101616201626161026262620263616161036362626203806b656d7074792061727261798101656172726179a069656d707479206f626aa1613102636f626af6646e756c6c') // eslint-disable-line max-len
  enc.write({aa: 2, b:1})
  t.is(bs.read().toString('hex'),
    'a261620162616102')
})

test('canonical numbers', t => {
  const enc = new cbor.Encoder({canonical: true})
  const bs = new NoFilter()
  enc.pipe(bs)

  for (const numEnc of cases.canonNums) {
    enc.write(numEnc[0])
    t.is(bs.read().toString('hex'), numEnc[1])
  }
})

test('encodeCanonical', t => {
  t.deepEqual(cbor.encodeCanonical(-1.25), Buffer.from('f9bd00', 'hex'))
})

test('detect loops', t => {
  const enc = new cbor.Encoder({detectLoops: true})
  const bs = new NoFilter()
  enc.pipe(bs)

  const a = {c: false}
  const b = [a]
  enc.write(b)
  t.is(bs.read().toString('hex'), '81a16163f4')
  t.is(Object.getOwnPropertySymbols(a).length, 1)
  t.is(Object.getOwnPropertySymbols(b).length, 1)
  t.falsy(cbor.Encoder.removeLoopDetectors(b, Symbol()))
  t.truthy(enc.removeLoopDetectors(b))
  t.is(Object.getOwnPropertySymbols(a).length, 0)
  t.is(Object.getOwnPropertySymbols(b).length, 0)
  t.falsy(enc.removeLoopDetectors(b))
  t.is(Object.getOwnPropertySymbols(a).length, 0)
  t.is(Object.getOwnPropertySymbols(b).length, 0)
  a.a = a
  t.throws(() => enc.write(b))

  const noLoops = new cbor.Encoder({detectLoops: false})
  t.falsy(noLoops.removeLoopDetectors(a))
})

test('detect loops, own symbol', t => {
  const s = Symbol('MINE')
  const enc = new cbor.Encoder({detectLoops: s})
  const bs = new NoFilter()
  enc.pipe(bs)

  const a = {c: new Date()}
  enc.write(a)
  const a_syms = Object.getOwnPropertySymbols(a)
  const date_syms = Object.getOwnPropertySymbols(a.c)
  t.is(a_syms.length, 1)
  t.is(date_syms.length, 1)
  t.is(a[a_syms[0]], s)
  t.is(a.c[date_syms[0]], s)
})

test('date types', t => {
  const d = new Date('2018-06-05T14:36:20Z')

  t.is(
    cbor.encodeOne(d, {dateType: 'blorfff'}).toString('hex'),
    'c11a5b169fe4')

  t.is(
    cbor.encodeOne(d, {dateType: 'int'}).toString('hex'),
    'c11a5b169fe4')

  t.is(
    cbor.encodeOne(d, {dateType: 'float'}).toString('hex'),
    'c1fb41d6c5a7f9000000')

  t.is(
    cbor.encodeOne(d, {dateType: 'string'}).toString('hex'),
    'c07818323031382d30362d30355431343a33363a32302e3030305a')
})

test('js BigInt', t => {
  if (!cbor.hasBigInt) {
    return t.pass('No BigInt')
  }
  return testAll(t, cases.bigInts(cases.good))
})

test('BigNumber BigInt collapse', t => {
  return testAll(t, cases.collapseBigIntegers, {
    collapseBigIntegers: true
  })
})

test('js BigInt collapse', t => {
  if (!cbor.hasBigInt) {
    return t.pass('No BigInt')
  }
  return testAll(t, cases.bigInts(cases.collapseBigIntegers), {
    collapseBigIntegers: true
  })
})

test('arraybuffer types', t => {
  t.is(
    cbor.encodeOne(Buffer.alloc(3)).toString('hex'),
    '43000000')
  t.is(
    cbor.encodeOne(new Uint8Array(3)).toString('hex'),
    '43000000')
  t.is(
    cbor.encodeOne(new Uint8ClampedArray(3)).toString('hex'),
    '43000000')
  t.is(
    cbor.encodeOne(new ArrayBuffer(3)).toString('hex'),
    '43000000')
  t.is(
    cbor.encodeOne(new Uint16Array(3)).toString('hex'),
    '83000000')
  t.is(
    cbor.encodeOne(new Uint32Array(3)).toString('hex'),
    '83000000')
  t.is(
    cbor.encodeOne(new Int8Array(3)).toString('hex'),
    '83000000')
  t.is(
    cbor.encodeOne(new Int16Array(3)).toString('hex'),
    '83000000')
  t.is(
    cbor.encodeOne(new Int32Array(3)).toString('hex'),
    '83000000')
  t.is(
    cbor.encodeOne(new Float32Array(3)).toString('hex'),
    '83fa00000000fa00000000fa00000000')
  t.is(
    cbor.encodeOne(new Float64Array(3)).toString('hex'),
    '83fb0000000000000000fb0000000000000000fb0000000000000000')

  cases.EncodeFailer.tryAll(t, new Float32Array(3))
  cases.EncodeFailer.tryAll(t, new Float64Array(3))
})

test('encoding "undefined"', t => {
  t.is(cbor.encodeOne(undefined).toString('hex'), 'f7')
  t.is(cbor.encodeOne(undefined, {encodeUndefined: null}).toString('hex'), 'f6')
  t.is(cbor.encodeOne(undefined, {
    encodeUndefined: Buffer.from('ff', 'hex')
  }).toString('hex'), 'ff')
  t.throws(() => cbor.encodeOne(undefined, {encodeUndefined: () => {
    throw new Error('ha')
  }}))
  t.is(cbor.encodeOne(undefined, {
    encodeUndefined: () => Buffer.from('ff', 'hex')
  }).toString('hex'), '41ff')
  const m = new Map([[undefined, 1]])
  t.throws(() => cbor.encodeOne(m, { 
    disallowUndefinedKeys: true 
  }))
  t.throws(() => cbor.encodeOne(m, { 
    disallowUndefinedKeys: true,
    canonical: true
  }))
})

test('URL', t => {
  if (url.URL) {
    t.is(cbor.encodeOne(new url.URL('https://example.net')).toString('hex'),
      'd8207468747470733a2f2f6578616d706c652e6e65742f')
  }
})

test('big', async t => {
  const buf = Buffer.alloc(16385)
  if (!process.version.startsWith('v6')) {
    const bc = cbor.encodeOne([buf, buf], {highWaterMark:50000})
    t.is(bc.length, 32777)
  }
  const bd = await cbor.encodeAsync([buf, buf])
  t.is(bd.length, 32777)
})

class IndefiniteClass {
  encodeCBOR(gen) {
    return cbor.Encoder.encodeIndefinite(gen, '1234567890', { chunkSize: 3 }) &&
      cbor.Encoder.encodeIndefinite(
        gen, Buffer.from('1234567890'), { chunkSize: 3 }) &&
      cbor.Encoder.encodeIndefinite(gen, this)
  }
}

test('indefinite', t => {
  const gen = new cbor.Encoder()

  t.throws(() => cbor.Encoder.encodeIndefinite.call(null, gen, null))
  t.throws(() => cbor.Encoder.encodeIndefinite.call(null, gen, true))
  const i = new IndefiniteClass()
  i.a = true
  t.is(
    cbor.encodeOne(i).toString('hex'),
    '7f6331323363343536633738396130ff5f4331323343343536433738394130ffbf6161f5ff'
  )
  cases.EncodeFailer.tryAll(t, i)

  const m = new Map([['a', true]])
  m.encodeCBOR = cbor.Encoder.encodeIndefinite
  t.is(cbor.encodeOne(m).toString('hex'), 'bf6161f5ff')
  cases.EncodeFailer.tryAll(t, m)

  const a = [1, Infinity, null, undefined]
  a.encodeCBOR = cbor.Encoder.encodeIndefinite
  t.is(cbor.encodeOne(a).toString('hex'), '9f01f97c00f6f7ff')
  cases.EncodeFailer.tryAll(t, a)

  const o = {
    a: true,
    encodeCBOR: cbor.Encoder.encodeIndefinite
  }
  t.is(cbor.encodeOne(o, { detectLoops: true }).toString('hex'), 'bf6161f5ff')
  t.truthy(cbor.Encoder.removeLoopDetectors(o))
})