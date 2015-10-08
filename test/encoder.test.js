/*jslint node: true */
"use strict";

var url = require('url');
var async = require('async');
var bignumber =  require('bignumber.js');
var NoFilter = require('nofilter');

var cbor = require('../lib/cbor');
var Encoder = cbor.Encoder;
var Simple = cbor.Simple;
var Tagged = cbor.Tagged;
var hex = require('../lib/utils').hex;
var SYMS = require('../lib/constants').SYMS;

// If you pass a function as expected, catch errors and pass them
// to the callback.  Avoids test.throws.
function testPack(test) {
  return function(objExpected, cb) {
    var obj = objExpected[0];
    var expected = objExpected[1];

    var funky = (typeof expected === 'function');
    try {
      var packed = Encoder.encode(obj);
      test.ok(packed);
      if (funky) {
        cb(expected(null, packed));
      } else {
        test.deepEqual(packed, hex(expected));
        cb();
      }
    } catch (e) {
      console.log(e);
      if (funky) {
        cb(expected(e));
      } else {
        cb(e);
      }
    }
  };
}

function test_all(test, arry) {
  var tp = testPack(test);
  async.each(arry, tp, function(er) {
    test.equal(er, null);
    test.done();
  });
}

exports.from_spec = function(test) {
  test_all(test, [
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
    //[0, '0xf90000'],
    // -0.0 is correct
    //[0, '0xf98000'],

    // 1.0 is correct
    //[1, '0xf93c00'],

    [1.1, '0xfb3ff199999999999a'],
    // 0xf93e00 is shorter
    [1.5, '0xfb3ff8000000000000'],

    // 65504.0 is correct
    //[65504, '0xf97bff'],

    // 100000.0 is correct
    //[100000, '0xfa47c35000'],

    // orig:0xfa7f7fffff
    [3.4028234663852886e+38, '0xfb47efffffe0000000'],

    // 1.0e+300 is correct
    [1e+300, '0xfb7e37e43c8800759c'],

    // orig: 0xf90001
    [5.960464477539063e-8, '0xfb3e70000000000000'],
    // orig: 0xf90400
    [0.00006103515625, '0xfb3f10000000000000'],

    // -4.0 is correct
    //[-4, '0xf9c400'],

    [-4.1, '0xfbc010666666666666'],
    [Infinity, '0xf97c00'],
    [NaN, '0xf97e00'],
    [-Infinity, '0xf9fc00'],
    [false, '0xf4'],
    [true, '0xf5'],
    [null, '0xf6'],
    [undefined, '0xf7'],

    [new Simple(16), '0xf0'],
    [new Simple(24), '0xf818'],
    [new Simple(255), '0xf8ff'],
    [new Date(1363896240000), '0xc11a514b67b0'],

    /*
    ["23(h'01020304')", '0xd74401020304'],
    ["24(h'6449455446')", '0xd818456449455446'],
    */

    [url.parse("http://www.example.com"), '0xd82077687474703a2f2f7777772e6578616d706c652e636f6d2f'],
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
    [{1: 2, 3: 4}, '0xa2613102613304'],
    [{"a": 1, "b": [2, 3]}, '0xa26161016162820203'],
    [["a", {"b": "c"}], '0x826161a161626163'],
    [{"a": "A", "b": "B", "c": "C", "d": "D", "e": "E"}, '0xa56161614161626142616361436164614461656145'],
    [new Buffer('0102030405', 'hex'), '0x450102030405'],
    ["streaming", '0x6973747265616d696e67'],
    [[], '0x80'],
    [[1, [2, 3], [4, 5]], '0x8301820203820405'],
    [[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25], '0x98190102030405060708090a0b0c0d0e0f101112131415161718181819'],
    [{"a": 1, "b": [2, 3]}, '0xa26161016162820203'],
    [["a", {"b": "c"}], '0x826161a161626163']
  ]);
};

exports.decimal = function(test) {
  test_all(test,[
    [new bignumber(10.1), '0xc482201865'],
    [new bignumber(100.1), '0xc482201903e9'],
    [new bignumber(.1), '0xc4822001'],
    [new bignumber(-0.1), '0xc4822020'],
    [new bignumber(0), '0xc24100'],
    [new bignumber(-0), '0xc340'],
    [new bignumber('18446744073709551615.1'), 'c48220c24909fffffffffffffff7'],
    [new bignumber(NaN), '0xf97e00'],
    [new bignumber(Infinity), '0xf97c00'],
    [new bignumber(-Infinity), '0xf9fc00']
  ]);
};

exports.ints = function(test) {
  test_all(test, [
    [0xff, '0x18ff'],
    [0x100, '0x190100'],
    [0xffff, '0x19ffff'],
    [0x10000, '0x1a00010000'],
    [0xffffffff, '0x1affffffff'],
    [0x1ffffffff, '0x1b00000001ffffffff'],
    [0x1fffffffffffff, '0x1b001fffffffffffff'],
    [0x20000000000000, '0xfb4340000000000000'], // switch to float
    [-0x7fffffffffffffff, '0xfbc3e0000000000000']
  ]);
};

exports.negativeInts = function(test) {
  test_all(test, [
    [-0x80000000, '0x3a7fffffff']
  ]);
};

exports.specialObjects = function(test) {
  var m = new Map();
  m.set(1,2);
  var s = new Set();
  s.add(1);
  s.add(2);
  test_all(test, [
    [new Date(0), '0xc100'],
    [new Buffer(0), '0x40'],
    [new Buffer([0,1,2,3,4]), '0x450001020304'],
    [new Simple(0xff), 'f8ff'],
    [/a/, '0xd8236161'],
    [SYMS.NULL, 'f6'],
    [SYMS.UNDEFINED, 'f7'],
    [m, '0xa10102'],
    [s, '0x820102']
  ]);
};

exports.undef = function(test) {
  test.deepEqual(cbor.encode(undefined, 2).toString('hex'), 'f702');
  test.done();
}

exports.badFunc = function(test) {
  test.throws(function() {
    cbor.encode(function() {return 'hi';});
  });
  test.throws(function() {
    cbor.encode(Symbol('foo'));
  })
  test.done();
}

exports.addSemanticType = function(test) {
  function TempClass(val) {
    // render as the string tempClass with the tag 0xffff
    this.value = val || "tempClass";
  }

  // before the tag, this is an innocuous object:
  // {"value": "foo"}
  var t = new TempClass('foo');
  test.deepEqual(Encoder.encode(t), hex('0xa16576616c756563666f6f'));
  test.deepEqual(Encoder.encode(), null);

  TempClass.prototype.encodeCBOR = function(gen) {
    gen._pushTag(0xffff);
    gen._pushAny(this.value);
  };

  function TempClassToCBOR(gen, obj){
    gen._pushTag(0xfffe);
    gen._pushAny(obj.value);
  }

  test.deepEqual(Encoder.encode(t), hex('0xd9ffff63666f6f'));

  var gen = new Encoder({genTypes: [TempClass, TempClassToCBOR]});
  gen.write(t);
  test.deepEqual(gen.read(), hex('0xd9fffe63666f6f'));

  function hexPackBuffer(gen, obj, bufs) {
    gen.write('0x' + obj.toString('hex'));
  }

  // replace Buffer serializer with hex strings
  gen.addSemanticType(Buffer, hexPackBuffer);
  gen.write(new Buffer('010203', 'hex'));

  test.deepEqual(gen.read(), hex('0x683078303130323033'));

  test.done();
};

exports.internalTypes = function(test) {
  test_all(test, [
    [new NoFilter(new Buffer([1,2,3,4])), '0x4401020304'],
    [new Tagged(256, 1), '0xd9010001']
  ]);
};

exports.stream = function(test) {
  var bs = new NoFilter();
  var gen = new Encoder();
  gen.on('end', function() {
    test.deepEqual(bs.read(), new Buffer([1, 2]));
    test.done();
  });
  gen.pipe(bs);
  gen.write(1);
  gen.end(2);
};

exports.streamNone = function(test) {
  var bs = new NoFilter();
  var gen = new Encoder();
  gen.on('end', function() {
    test.deepEqual(bs.read(), null);
    test.done();
  });
  gen.pipe(bs);
  gen.end();
};
