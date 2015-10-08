/*jslint node: true */
"use strict";

var Diagnose = require('../lib/diagnose');
var utils = require('../lib/utils');

var async = require('async');
var fs = require('fs');
var NoFilter = require('nofilter');

function diagTest(test, max_depth) {
  return function (hd, cb) {
    var expected = hd[0];
    var hex = hd[1].replace(/^0x/, '');
    var aexpected = [expected];

    Diagnose.diagnose(hex, {
      encoding: 'hex',
      max_depth: max_depth || -1
    }).then(function(actual) {
      actual = actual.split('\n').slice(0,-1);
      if (typeof(expected) === 'function') {
        cb(expected(test, null, actual));
      } else {
        test.deepEqual(actual, aexpected, expected + " | " + hex + " != " + actual);
        cb();
      }
    },
    function(er) {
      if (typeof(expected) === 'function') {
        cb(expected(test, er));
      } else {
        cb(er);
      }
    });
  }
}

exports.from_spec =  function(test) {

  var dt = diagTest(test);

  async.each([
    ['0', '0x00'],
    ['1', '0x01'],
    ['10', '0x0a'],
    ['23', '0x17'],
    ['24', '0x1818'],
    ['25', '0x1819'],
    ['100', '0x1864'],
    ['1000', '0x1903e8'],
    ['1000000', '0x1a000f4240'],
    ['1000000000000', '0x1b000000e8d4a51000'],
    ['18446744073709551615', '0x1bffffffffffffffff'],

    // draft-03 says 18446744073709551616, incorrectly
    ["2(h'010000000000000000')", '0xc249010000000000000000'],
    ['-18446744073709551616', '0x3bffffffffffffffff'],

    // spec says -18446744073709551617, incorrectly
    ["3(h'010000000000000000')", '0xc349010000000000000000'],
    ['-1', '0x20'],
    ['-10', '0x29'],
    ['-100', '0x3863'],
    ['-1000', '0x3903e7'],

    // 0.0 is correct
    ['0_1', '0xf90000'],
    // -0.0 is correct
    ['-0_1', '0xf98000'],

    // 1.0 is correct
    ['1_1', '0xf93c00'],

    ['1.1_3', '0xfb3ff199999999999a'],
    ['1.5_1', '0xf93e00'],

    // 65504.0 is correct
    ['65504_1', '0xf97bff'],

    // 100000.0 is correct
    ['100000_2', '0xfa47c35000'],
    ['3.4028234663852886e+38_2', '0xfa7f7fffff'],

    // 1.0e+300 is correct
    ['1e+300_3', '0xfb7e37e43c8800759c'],

    ['5.960464477539063e-8_1', '0xf90001'],
    ['0.00006103515625_1', '0xf90400'],

    // -4.0 is correct
    ['-4_1', '0xf9c400'],

    ['-4.1_3', '0xfbc010666666666666'],
    ['Infinity_1', '0xf97c00'],
    ['NaN_1', '0xf97e00'],
    ['-Infinity_1', '0xf9fc00'],
    ['Infinity_2', '0xfa7f800000'],
    ['NaN_2', '0xfa7fc00000'],
    ['-Infinity_2', '0xfaff800000'],
    ['Infinity_3', '0xfb7ff0000000000000'],
    ['NaN_3', '0xfb7ff8000000000000'],
    ['-Infinity_3', '0xfbfff0000000000000'],
    ['false', '0xf4'],
    ['true', '0xf5'],
    ['null', '0xf6'],
    ['undefined', '0xf7'],
    ['simple(16)', '0xf0'],
    ['simple(24)', '0xf818'],
    ['simple(255)', '0xf8ff'],
    ['0("2013-03-21T20:04:00Z")', '0xc074323031332d30332d32315432303a30343a30305a'],
    ['1(1363896240)', '0xc11a514b67b0'],
    ['1(1363896240.5_3)', '0xc1fb41d452d9ec200000'],
    ["23(h'01020304')", '0xd74401020304'],
    ["24(h'6449455446')", '0xd818456449455446'],
    ['32("http://www.example.com")', '0xd82076687474703a2f2f7777772e6578616d706c652e636f6d'],
    ["h''", '0x40'],
    ["h'01020304'", '0x4401020304'],
    ['""', '0x60'],
    ['"a"', '0x6161'],
    ['"IETF"', '0x6449455446'],
    ['"\\"\\\\"', '0x62225c'],
    ['"\u00fc"', '0x62c3bc'],
    ['"\u6c34"', '0x63e6b0b4'],
    ['"\ud800\udd51"', '0x64f0908591'],
    ['[]', '0x80'],
    ['[1, 2, 3]', '0x83010203'],
    ['[1, [2, 3], [4, 5]]', '0x8301820203820405'],
    ['[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25]', '0x98190102030405060708090a0b0c0d0e0f101112131415161718181819'],
    ['{}', '0xa0'],
    ['{1: 2, 3: 4}', '0xa201020304'],
    ['{"a": 1, "b": [2, 3]}', '0xa26161016162820203'],
    ['["a", {"b": "c"}]', '0x826161a161626163'],
    ['{"a": "A", "b": "B", "c": "C", "d": "D", "e": "E"}', '0xa56161614161626142616361436164614461656145'],
    ["(_ h'0102', h'030405')", '0x5f42010243030405ff'],
    ['(_ "strea", "ming")', '0x7f657374726561646d696e67ff'],
    ['[_ ]', '0x9fff'],
    ['[_ 1, [2, 3], [_ 4, 5]]', '0x9f018202039f0405ffff'],
    ['[_ 1, [2, 3], [4, 5]]', '0x9f01820203820405ff'],
    ['[1, [2, 3], [_ 4, 5]]', '0x83018202039f0405ff'],
    ['[1, [_ 2, 3], [4, 5]]', '0x83019f0203ff820405'],
    ['[_ 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25]', '0x9f0102030405060708090a0b0c0d0e0f101112131415161718181819ff'],
    ['{_ "a": 1, "b": [_ 2, 3]}', '0xbf61610161629f0203ffff'],
    ['["a", {_ "b": "c"}]', '0x826161bf61626163ff'],
    ["1([1, 2, 3])", '0xc183010203'],
    ["1({1: 2})", '0xc1a10102'],
    ['1(1([_ ]))', '0xc1c19fff'],
    ['1((_ h\'aabbccdd\', h\'eeff99\'))', '0xc15f44aabbccdd43eeff99ff']
  ], dt, function(er) {
    test.equal(er, null);
    test.done();
  });
};

function expectError(test, er, val) {
  test.ok(er);
}

exports.edges = function(test) {
  var dt = diagTest(test,2);
  async.each([
    [expectError, '0x7432303133'],
    [expectError, '0x818181818100'],
    [expectError, '0x7f01ff']
  ], dt, function(er) {
    test.equal(er, null);

    Diagnose.diagnose(new Buffer(0), function(er) {
      test.ifError(er);
      try {
        Diagnose.diagnose();
      } catch (er) {
        test.ok(er);
        Diagnose.diagnose('01', function(er, out){
          test.ifError(er);
          test.deepEqual(out, '1\n');
          test.done();
        });
      }
    });
  });
};

exports.construct = function (test) {
  var d = new Diagnose();
  test.equal(false, d.stream_errors);
  d.stream_errors = true;
  var bs = new NoFilter();
  d.pipe(bs);
  d.on('end', function() {
    test.deepEqual('Error: unexpected end of input', bs.toString('utf8'));
    test.done();
  });
  d.end(new Buffer([0x18]));
};

exports.stream = function(test) {
  var dt = new Diagnose({
    separator: '-'
  });
  var bs = new NoFilter();

  dt.on('end', function() {
    test.deepEqual(bs.toString('utf8'), '1-');
    test.done();
  });
  dt.on('error', function(er) {
    test.ifError(er);
  });
  dt.pipe(bs);
  dt.end(new Buffer('01', 'hex'));
};
