/*jslint node: true */
"use strict";

var url = require('url');

var csrequire = require('covershot').require.bind(null, require);
var cbor = csrequire('../lib/cbor');
var Builder = cbor.Builder;
var Simple = cbor.Simple;
var Tagged = cbor.Tagged;

var async = require('async');
var bignumber = require('bignumber.js');

function buildTest(test) {
  return function (hd, cb) {
    var expected = hd[0];
    var hex = hd[1];
    var d = new Builder();
    var actual = [];
    var oexpected = expected;
    expected = [expected];

    d.on('complete', function(v) {
      actual.push(v);
    });

    d.on('end', function() {
      test.deepEqual(actual, expected, oexpected + " | " + hex + " != " + actual);
      cb();
    });

    d.on('error', cb);

    d.unpack(hex);
  };
}

exports.from_spec =  function(test) {
  var bt = buildTest(test);

  async.each([
    [0, '0x00'],
    [1, '0x01'],
    [10, '0x0a'],
    [23, '0x17'],
    [24, '0x1818'],
    [25, '0x1819'],
    [100, '0x1864'],
    [1000, '0x1903e8'],
    [1000000, '0x1a000f4240'],
    [1000000000000, '0x1b000000e8d4a51000'],

    // JS rounding: 18446744073709552000
    //['18446744073709551615', '0x1bffffffffffffffff'],

    // draft-03 says 18446744073709551616 incorrectly
    [new bignumber("18446744073709551616"), '0xc249010000000000000000'],

    // JS rounding: -18446744073709552000
    //['-18446744073709551616', '0x3bffffffffffffffff'],

    // draft-03 says -18446744073709551617
    [new bignumber("-18446744073709551617"), '0xc349010000000000000000'],

    [-1, '0x20'],
    [-10, '0x29'],
    [-100, '0x3863'],
    [-1000, '0x3903e7'],

    // 0.0 is correct
    [0, '0xf90000'],
    // -0.0 is correct
    [0, '0xf98000'],

    // 1.0 is correct
    [1, '0xf93c00'],

    [1.1, '0xfb3ff199999999999a'],
    [1.5, '0xf93e00'],

    // 65504.0 is correct
    [65504, '0xf97bff'],

    // 100000.0 is correct
    [100000, '0xfa47c35000'],
    [3.4028234663852886e+38, '0xfa7f7fffff'],

    // 1.0e+300 is correct
    [1e+300, '0xfb7e37e43c8800759c'],

    [5.960464477539063e-8, '0xf90001'],
    [0.00006103515625, '0xf90400'],

    // -4.0 is correct
    [-4, '0xf9c400'],

    [-4.1, '0xfbc010666666666666'],
    [Infinity, '0xf97c00'],
    //[NaN, '0xf97e00'],
    [-Infinity, '0xf9fc00'],
    [Infinity, '0xfa7f800000'],
    //[NaN, '0xfa7fc00000'],
    [-Infinity, '0xfaff800000'],
    [Infinity, '0xfb7ff0000000000000'],
    //[NaN, '0xfb7ff8000000000000'],
    [-Infinity, '0xfbfff0000000000000'],
    [false, '0xf4'],
    [true, '0xf5'],
    [null, '0xf6'],
    [undefined, '0xf7'],

    [new Simple(16), '0xf0'],
    [new Simple(24), '0xf818'],
    [new Simple(255), '0xf8ff'],
    [new Date(1363896240000), '0xc074323031332d30332d32315432303a30343a30305a'],
    [new Date(1363896240000), '0xc11a514b67b0'],
    [new Date(1363896240500), '0xc1fb41d452d9ec200000'],

    /*
    ["23(h'01020304')", '0xd74401020304'],
    ["24(h'6449455446')", '0xd818456449455446'],
    */

    [url.parse("http://www.example.com"), '0xd82076687474703a2f2f7777772e6578616d706c652e636f6d'],
    [new Buffer(0), '0x40'],
    [new Buffer('01020304', 'hex'), '0x4401020304'],
    ["", '0x60'],
    ["a", '0x6161'],
    ["IETF", '0x6449455446'],
    ['"\\', '0x62225c'],
    ["\u00fc", '0x62c3bc'],
    ["\u6c34", '0x63e6b0b4'],
    ["\ud800\udd51", '0x64f0908591'],
    [[], '0x80'],
    [[1, 2, 3], '0x83010203'],
    [[1, [2, 3], [4, 5]], '0x8301820203820405'],
    [[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25], '0x98190102030405060708090a0b0c0d0e0f101112131415161718181819'],
    [{}, '0xa0'],
    [{1: 2, 3: 4}, '0xa201020304'],
    [{"a": 1, "b": [2, 3]}, '0xa26161016162820203'],
    [["a", {"b": "c"}], '0x826161a161626163'],
    [{"a": "A", "b": "B", "c": "C", "d": "D", "e": "E"}, '0xa56161614161626142616361436164614461656145'],
    [new Buffer('0102030405', 'hex'), '0x5f42010243030405ff'],
    ["streaming", '0x7f657374726561646d696e67ff'],
    [[], '0x9fff'],
    [[1, [2, 3], [4, 5]], '0x9f018202039f0405ffff'],
    [[1, [2, 3], [4, 5]], '0x9f01820203820405ff'],
    [[1, [2, 3], [4, 5]], '0x83018202039f0405ff'],
    [[1, [2, 3], [4, 5]], '0x83019f0203ff820405'],
    [[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25], '0x9f0102030405060708090a0b0c0d0e0f101112131415161718181819ff'],
    [{"a": 1, "b": [2, 3]}, '0xbf61610161629f0203ffff'],
    [["a", {"b": "c"}], '0x826161bf61626163ff']

  ], bt, function(er) {
    test.equal(er, null);
    test.done();
  });
};

exports.others =  function(test) {
  var bt = buildTest(test);

  async.each([
    [/^foo/, '0xd823645e666f6f'],
    [new bignumber(0.2), '0xc4822002'],
    [new bignumber(273.15), '0xc48221196ab3'],
    [new bignumber(0.25), '0xc5822101'],
    [new bignumber(1.5), '0xc5822003']
  ], bt, function(er) {
    test.equal(er, null);
    test.done();
  });
};

function buildInvalidTest(test) {
  return function (hd, cb) {
    Builder.parse(hd, function(er, v) {
      test.notEqual(er, null);
      cb();
    });
  }
}

exports.invalid = function(test) {
  var bt = buildInvalidTest(test);

  async.each([
    '0xFE',
    '0x64494554',
    '0x7f657374726561646d696e',
    '0x44010203',
    '0xa20102'
  ], bt, function(er) {
    test.equal(er, null);
    test.done();
  });
};
