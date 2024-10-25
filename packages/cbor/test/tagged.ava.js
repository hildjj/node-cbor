'use strict';

const test = require('ava');
const cbor = require(process.env.CBOR_PACKAGE || '../');
const Buffer = cbor.encode(0).constructor;

test('create', t => {
  const tag = new cbor.Tagged(1, 'one');
  t.truthy(tag);
  t.is(tag.tag, 1);
  t.is(tag.value, 'one');
  t.is(tag.toString(), '1("one")');

  t.is(cbor.encode(tag).toString('hex'), 'c1636f6e65');
});

test('edges', t => {
  t.throws(() => new cbor.Tagged(-11, 'one'));
  t.throws(() => new cbor.Tagged(1.1, 'one'));
  t.throws(() => new cbor.Tagged('zero', 'one'));
});

test('convert', t => {
  const tag = new cbor.Tagged(2, Buffer.from([2]));
  t.deepEqual(tag.convert(), BigInt(2));
});

test('tag 21', t => {
  let tag = new cbor.Tagged(21, Buffer.from('foo')).convert();
  t.is(JSON.stringify(tag), '"Zm9v"');
  tag = new cbor.Tagged(21, [Buffer.from('fo')]).convert();
  t.is(JSON.stringify(tag), '{"tag":21,"value":["Zm8"]}');
  tag = new cbor.Tagged(21, [{a: Buffer.from('f')}]).convert();
  t.is(JSON.stringify(tag), '{"tag":21,"value":[{"a":"Zg"}]}');

  tag = new cbor.Tagged(21, [
    {a: new cbor.Tagged(22, Buffer.from('f')).convert()},
  ]).convert();
  t.is(JSON.stringify(tag), '{"tag":21,"value":[{"a":"Zg=="}]}');
  tag = new cbor.Tagged(21, 12).convert();
  t.is(JSON.stringify(tag), '{"tag":21,"value":12}');

  tag = new cbor.Tagged(1, 2, 'this is an error');
  t.is(JSON.stringify(tag), '{"tag":1,"value":2,"err":"this is an error"}');
});

test('tag 22', t => {
  let tag = new cbor.Tagged(22, Buffer.from('fo')).convert();
  t.is(JSON.stringify(tag), '"Zm8="');
  tag = new cbor.Tagged(22, [Buffer.from('fo')]).convert();
  t.is(JSON.stringify(tag), '{"tag":22,"value":["Zm8="]}');
  tag = new cbor.Tagged(22, [{a: Buffer.from('f')}]).convert();
  t.is(JSON.stringify(tag), '{"tag":22,"value":[{"a":"Zg=="}]}');
});

test('tag 23', t => {
  let tag = new cbor.Tagged(23, Buffer.from('fo')).convert();
  t.is(JSON.stringify(tag), '"666f"');
  tag = new cbor.Tagged(23, [Buffer.from('fo')]).convert();
  t.is(JSON.stringify(tag), '{"tag":23,"value":["666f"]}');
  tag = new cbor.Tagged(23, [{a: Buffer.from('f')}]).convert();
  t.is(JSON.stringify(tag), '{"tag":23,"value":[{"a":"66"}]}');
});

test('tag 33', t => {
  let tag = new cbor.Tagged(33, ';;').convert();
  t.truthy(tag.err);
  tag = new cbor.Tagged(33, 'A').convert();
  t.truthy(tag.err);
  tag = new cbor.Tagged(33, 'AB').convert();
  t.truthy(tag.err);
  tag = new cbor.Tagged(33, 'AA').convert();
  t.falsy(tag.err);
  tag = new cbor.Tagged(33, 'AAq').convert();
  t.truthy(tag.err);
  tag = new cbor.Tagged(33, 'AAA').convert();
  t.falsy(tag.err);
  tag = new cbor.Tagged(33, 'AAAA').convert();
  t.falsy(tag.err);
});

test('tag 34', t => {
  let tag = new cbor.Tagged(34, ';;').convert();
  t.truthy(tag.err);
  tag = new cbor.Tagged(34, '====').convert();
  t.truthy(tag.err);
  tag = new cbor.Tagged(34, 'A').convert();
  t.truthy(tag.err);
  tag = new cbor.Tagged(34, 'AB==').convert();
  t.truthy(tag.err);
  tag = new cbor.Tagged(34, 'AA==').convert();
  t.falsy(tag.err);
  tag = new cbor.Tagged(34, 'AAq=').convert();
  t.truthy(tag.err);
  tag = new cbor.Tagged(34, 'AAA=').convert();
  t.falsy(tag.err);
  tag = new cbor.Tagged(34, 'AAAA').convert();
  t.falsy(tag.err);
});

test('converters', t => {
  let res = new cbor.Tagged(1, 1).convert({
    1() {
      throw new Error();
    },
  });
  t.truthy(res.err instanceof Error);
  res = new cbor.Tagged(1, 1).convert({
    1() {
      const e = new Error();
      delete e.message;
      throw e;
    },
  });
  t.truthy(res.err instanceof Error);
});

test('Typed Arrays', t => {
  let tag = new cbor.Tagged(64, 'foo');
  tag.convert();
  t.is(tag.err, 'val not a buffer');
  tag = new cbor.Tagged(90, 'foo');

  const {64: _toTypedArray} = cbor.Tagged.TAGS;
  t.throws(() => _toTypedArray(tag.value, tag));
  tag = new cbor.Tagged(76, 'foo');
  t.throws(() => _toTypedArray(tag.value, tag));
  tag = new cbor.Tagged(90, Buffer.from('000100020003', 'hex'));
  t.throws(() => _toTypedArray(tag.value, tag));

  // Endian
  tag = new cbor.Tagged(65, Buffer.from('000100020003', 'hex'));
  t.deepEqual(_toTypedArray(tag.value, tag), new Uint16Array([1, 2, 3]));

  tag = new cbor.Tagged(68, Buffer.from('010203', 'hex'));
  t.deepEqual(_toTypedArray(tag.value, tag), new Uint8ClampedArray([1, 2, 3]));

  tag = new cbor.Tagged(73, Buffer.from('000100020003', 'hex'));
  t.deepEqual(_toTypedArray(tag.value, tag), new Int16Array([1, 2, 3]));
});

test('null converter', t => {
  const buf = Buffer.from('c100', 'hex');
  t.deepEqual(cbor.decode(buf), new Date(0));
  t.deepEqual(cbor.decode(buf, {tags: {1: null}}), new cbor.Tagged(1, 0));
});
