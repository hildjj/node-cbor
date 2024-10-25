/* eslint-disable no-console */
'use strict';

// Data to fill out:
// https://github.com/cbor-wg/CBORbis/wiki/Implementation-matrix
const cbor = require(process.env.CBOR_PACKAGE || '../');
const Buffer = cbor.encode(0).constructor;
const assert = require('assert');

const all = [
  ['Major type 0 (uint)', 1, '01'],
  ['Major type 1 (nint)', -1, '20'],
  ['Major type 2 (bstr)', Buffer.from('0001', 'hex'), '420001'],
  ['Major type 3 (tstr)', 'foo', '63666f6f'],
  ['Major type 4 (array)', [0], '8100'],
  ['Major type 5 (map)', {a: 1}, 'a1616101'],
  ['Major type 6 (tag)', new cbor.Tagged(0xaa, 0), 'd8aa00'],
  ['Major type 7 (simple)', new cbor.Simple(0xaa), 'f8aa'],
  ['Float16', 0.5, 'f93800', true],
  ['Float32', 3.4028234663852886e+38, 'fa7f7fffff', true],
  ['Float64', 3002399751580330.5, 'fb4325555555555555'],
  // ['Indefinite length array/map', [], '9fff'],
  // ['Indefinite length string', 'streaming', '7f657374726561646d696e67ff'],
  ['Canonical CBOR', {b: 1, a: 2}, 'a2616102616201', true], // Note: re-ordering
  ['Tag 0',
    new Date(1500000000000), // 2017-07-14T02:40:00.000Z
    'c07818323031372d30372d31345430323a34303a30302e3030305a',
    false,
    'string'],
  ['Tag 1', new Date(1500000000000), 'c11a59682f00', false, 'number'],
  ['Tag 2', 18446744073709551616n, 'c249010000000000000000'],
  ['Tag 3', -18446744073709551617n, 'c349010000000000000000'],
  // Didn't implement because I continue to think they're not useful
  ['Tag 21', 0, ''],
  ['Tag 22', 0, ''],
  ['Tag 23', 0, ''],
  // This one is only useful in certain circumstances
  ['Tag 24', 0, ''],
  ['Tag 32',
    new URL('https://mozilla.com/'),
    'd8207468747470733a2f2f6d6f7a696c6c612e636f6d2f'],
  ['Tag 33', 0, ''],
  ['Tag 34', 0, ''],
  ['Tag 35', /foo/, 'd82363666f6f'],
  ['Tag 36', 0, ''],
  ['Tag 55799', 0, ''],
];

function deepEqual(actual, expected) {
  assert.deepEqual(actual, expected);
  return true;
}

function markdownOut(title, decode, encode) {
  const DE = (decode ? 'D' : ' ') + (encode ? 'E' : ' ');
  console.log(
    `| ${title.padEnd(28)}|          | ${DE}        |           |       |`
  );
}

// eslint-disable-next-line max-params
function test(title, native, encoded, canonical, dateType) {
  if (encoded.length > 0) {
    const e = cbor.Encoder.encodeOne(native, {
      canonical,
      dateType,
    });
    const d = cbor.decodeFirstSync(encoded);
    markdownOut(
      title,
      deepEqual(native, d),
      deepEqual(e, Buffer.from(encoded, 'hex'))
    );
  } else {
    markdownOut(title);
  }
}

for (const t of all) {
  test(...t);
}
