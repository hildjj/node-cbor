/*jslint node: true */
"use strict";

var url = require('url');

var cbor = require('../lib/cbor');
var Decoder = cbor.Decoder;
var Simple = cbor.Simple;
var Tagged = cbor.Tagged;
var utils = require('../lib/utils');

var async = require('async');
var bignumber = require('bignumber.js');
var fs = require('fs');
var util = require('util');

function buildTest(test) {
  function isArrayNaN(arr) {
    return arr.length === 1 && typeof(arr[0]) === "number" && isNaN(arr[0]);
  }

  return function (hd, cb) {
    var expected = hd[0];
    var hex = hd[1].replace(/^0x/i, '');
    var oexpected = expected;
    expected = [expected];

    Decoder.decodeAll(hex, 'hex')
    .then(function(actual){
      var message = util.inspect(oexpected, {depth:null}) + " s| " + hex + " != " + util.inspect(actual, {depth:null});
      if (isArrayNaN(expected))
        test.ok(isArrayNaN(actual), message);
      else
        test.deepEqual(actual, expected, message);
      cb();
    }, function(er) {cb(er)});
  };
}

exports.decodeFirstSync = function(test) {
  test.deepEqual(Decoder.decodeFirstSync('02'), 2);
  test.deepEqual(Decoder.decodeFirstSync('Ag==', 'base64'), 2);
  test.deepEqual(Decoder.decodeFirstSync('02', {}), 2);
  test.deepEqual(Decoder.decodeFirstSync('f6'), null);
  test.throws(() => Decoder.decodeFirstSync(), Error);
  test.throws(() => Decoder.decodeFirstSync(''), Error);
  test.throws(() => Decoder.decodeFirstSync('63666f'), Error);
  test.done();
}

exports.decodeAllSync = function(test) {
  test.deepEqual(Decoder.decodeAllSync('0202'), [2,2]);
  test.deepEqual(Decoder.decodeAllSync('AgI=', 'base64'), [2,2]);
  test.deepEqual(Decoder.decodeAllSync('0202', {}), [2,2]);
  test.deepEqual(Decoder.decodeAllSync('f6f6'), [null, null]);
  test.deepEqual(Decoder.decodeAllSync(''), []);
  test.throws(() => Decoder.decodeAllSync('63666f'), Error);
  test.done();
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
    [NaN, '0xf97e00'],
    [-Infinity, '0xf9fc00'],
    [Infinity, '0xfa7f800000'],
    [NaN, '0xfa7fc00000'],
    [-Infinity, '0xfaff800000'],
    [Infinity, '0xfb7ff0000000000000'],
    [NaN, '0xfb7ff8000000000000'],
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
    [new Tagged(23, new Buffer('01020304', 'hex')), '0xd74401020304'],
    [new Tagged(24, new Buffer('6449455446', 'hex')), '0xd818456449455446'],

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
    [{}, '0xbfff'],
    // TODO: nodeunit doesn't check Maps correctly yet.
    [new Map([[1,2], [3,4]]), '0xa201020304'],
    [{"a": 1, "b": [2, 3]}, '0xa26161016162820203'],
    [["a", {"b": "c"}], '0x826161a161626163'],
    [{"a": "A", "b": "B", "c": "C", "d": "D", "e": "E"}, '0xa56161614161626142616361436164614461656145'],
    [new Buffer('0102030405', 'hex'), '0x5f42010243030405ff'],
    ["streaming", '0x7f657374726561646d696e67ff'],
    [[new Tagged(127,new Date(1363896240000))], '0x9fd87fc07f6a323031332d30332d323161546832303a30343a3030615affff'],
    [[], '0x9fff'],
    [[1, [2, 3], [4, 5]], '0x9f018202039f0405ffff'],
    [[1, [2, 3], [4, 5]], '0x9f01820203820405ff'],
    [[1, [2, 3], [4, 5]], '0x83018202039f0405ff'],
    [[1, [2, 3], [4, 5]], '0x83019f0203ff820405'],
    [[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25], '0x9f0102030405060708090a0b0c0d0e0f101112131415161718181819ff'],
    [{"a": 1, "b": [2, 3]}, '0xbf61610161629f0203ffff'],
    [["a", {"b": "c"}], '0x826161bf61626163ff']

  ], bt, function(er) {
    test.ifError(er);
    test.done();
  });
};

exports.others =  function(test) {
  var bt = buildTest(test);

  async.each([
    [NaN, '0xf97f00'],
    [NaN, '0xf9fe00'],
    [NaN, '0xf9ff00'],
    [NaN, '0xfa7fe00000'],
    [NaN, '0xfaffc00000'],
    [NaN, '0xfaffe00000'],
    [NaN, '0xfb7ffc000000000000'],
    [NaN, '0xfbfff8000000000000'],
    [NaN, '0xfbfffc000000000000'],
    [/^foo/, '0xd823645e666f6f'],
    [new bignumber(0.2), '0xc4822002'],
    [new bignumber(273.15), '0xc48221196ab3'],
    [new bignumber(0.25), '0xc5822101'],
    [new bignumber(1.5), '0xc5822003'],
    [new bignumber('-0x20000000000000'), '3b001fffffffffffff']
  ], bt, function(er) {
    test.ifError(er);
    test.done();
  });
};

function buildInvalidTest(test) {
  return function (hd, cb) {
    hd = hd.replace(/^0x/, '');
    Decoder.decodeFirst(hd, function(er, v) {
      test.ok(er);
      cb();
    });
  }
}

exports.invalid = function(test) {
  var bt = buildInvalidTest(test);

  async.each([
    '0x7f01ff', // indeterminite string includes a non-string chunk
    '0x5f01ff', // indeterminite bytestring includes a non-string chunk
    '0xFE', // reserved AI
    '0x81FE', // Array containaing invalid
    '0x9fFEff', // streamed array containing invalid
    '0xa1FE01', // Map containing invalid
    '0xbfFE01ff', // streamed map containing invalid
    '0x18', // missing the next byte for AI
    '0x1c', // invalid AI
    '0x1d', // invalid AI
    '0x1e', // invalid AI
    '0x64494554', // only 3 bytes, not 4, utf8
    '0x7f657374726561646d696e', // no BREAK
    '0x44010203', // only 3 bytes, not 4, bytestring
    '0xa20102', // only 1 pair, not 2, map
    '0x81', // no items in array, expected 1
    '0x8201', // 1 item in array, expected 2
    '0x9f',  // indeterminate array without end
    '0x9f01',  // indeterminate array without end
    '0xbf', // indeterminate map without end
    '0xbf6161', // indeterminate map without end
    '0xbf616101', // indeterminate map without end
    '0xa16161', // map without value
    '0xbf000103ff', // streaming map with odd number of items
  ], bt, function(er) {
    test.ifError(er);
    test.done();
  });
};

exports.add_tag = function(test) {
  function replace_tag(val) {
    return {foo: val};
  }
  function new_tag(val) {
    throw new Error('Invalid tag');
  }
  var d = new Decoder({
    tags: {0: replace_tag, 127: new_tag}
  });
  test.deepEqual(d.tags[0], replace_tag);
  test.deepEqual(d.tags[127], new_tag);

  d.on('error', function(er) {
    test.ok(false, er);
  });
  var count = 0;
  d.on('data', function(val) {
    switch(count++) {
    case 0:
      test.deepEqual(val, new Tagged(127, 1, new Error('Invalid tag')));
      break;
    case 1:
      test.deepEqual(val, {foo: 1});
      test.done();
      break;
    }
  });
  var b = new Buffer('d87f01c001', 'hex');
  d.end(b);
};

exports.parse_tag = function(test) {
  cbor.decodeFirst('d87f01', 'hex', function(er, vals){
    test.ifError(er);
    test.deepEqual(vals, new Tagged(127,1));
    test.done();
  });
};

exports.error = function(test) {
  cbor.decodeFirst('d87f01c001', 'hex').catch(function(er){
    test.ok(er);
    test.done();
  });
};

exports.stream = function(test) {
  var dt = new Decoder();

  dt.on('data', function(v) {
    test.deepEqual(v, 1);
  });
  dt.on('end', function() {
    test.done();
  });
  dt.on('error', function(er) {
    test.ifError(er);
  });

  var d = new utils.DeHexStream('01');
  d.pipe(dt);
}

exports.decodeFirst = function(test) {
  cbor.decodeFirst('01')
  .then(function(v) {
    test.equal(1, v);
    return cbor.decodeFirst('AQ==', {
      encoding: 'base64'
    });
  })
  .then(function(v) {
    test.equal(1, v);
    return cbor.decodeFirst('');
  })
  .then(function(v) {
    test.equal(cbor.Decoder.NOT_FOUND, v);
    return cbor.decodeFirst('', {required: true});
  })
  .catch(function(er) {
    test.ok(er);
    cbor.decodeFirst(new Buffer(0), function(er, v) {
      test.ifError(er);
      test.equal(cbor.Decoder.NOT_FOUND, v);
      cbor.decodeFirst(new Buffer(0), {required: true}, function(er, v) {
        test.ok(er);
        test.done();
      });
    });
  });
};

exports.decodeAll = function(test) {
  cbor.decodeAll('01')
  .then(function(v) {
    test.deepEqual([1], v);
    return cbor.decodeAll('7f');
  })
  .catch(function() {
    cbor.decodeAll('01', function(er, v){
      test.deepEqual([1], v);
      cbor.decodeAll('AQ==', {encoding:'base64'}, function(er, v) {
        test.deepEqual([1], v);
        cbor.decodeAll('7f', {}, function(er, v) {
          test.ok(er);
          test.done();
        });
      });
    });
  });
};
