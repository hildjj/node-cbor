/*jslint node: true */
"use strict";

var csrequire = require('covershot').require.bind(null, require);
var cbor = csrequire('../lib/cbor');
var BufferStream = csrequire('../lib/BufferStream');
var hex = csrequire('../lib/utils').hex;

function testDiag(test, hexString, expected) {
  var funky = (typeof expected === 'function');
  try {
    var bs = new BufferStream();
    cbor.diagnose(hex(hexString), bs);
    var s = bs.toString('utf8');
    if (funky) {
      expected.call(null, null, s);
    } else {
      test.ok(s);
      test.deepEqual(expected + "\n", s);
    }
  } catch (e) {
    if (funky) {
      expected(e);
    } else {
      throw(e);
    }
  }
}

exports.ints = function(test) {
  testDiag(test, '0x00', '0');
  testDiag(test, '0x01', '1');
  testDiag(test, '0x20', '-1');
  testDiag(test, '0x29', '-10');
  test.done();
};

exports.buffer = function(test) {
  testDiag(test, '0x450001020304', "h'0001020304'");
  testDiag(test, '0x62c3bc', '"\u00fc"');
  testDiag(test, '0x620d0a', '"\\r\\n"');
  test.done();
};

exports.array = function(test) {
  testDiag(test, '0x80', "[]");
  testDiag(test, '0x83010203', "[1, 2, 3]");
  test.done();
};

exports.object = function(test) {
  testDiag(test, '0xa0', "{}");
  testDiag(test, '0xa2613102613304', '{"1": 2, "3": 4}');
  testDiag(test, '0xa201020304', '{1: 2, 3: 4}');
  test.done();
};

exports.floats = function(test) {
  testDiag(test, '0xdf3ff199999999999a', "1.1");
  testDiag(test, '0xde47c35000', "100000");

  testDiag(test, '0xddc000', "-2");
  testDiag(test, '0xdd7c00', "Infinity");
  testDiag(test, '0xddfc00', "-Infinity");
  testDiag(test, '0xdd7c01', "NaN");

  test.done();
};

exports.simple = function(test) {
  testDiag(test, '0xc0', "simple(0)");
  testDiag(test, '0xdc1c', "simple(28)");

  testDiag(test, '0xd8', "false");
  testDiag(test, '0xd9', "true");
  testDiag(test, '0xda', "null");
  testDiag(test, '0xdb', "undefined");

  test.done();
};

exports.tagged = function(test) {
  testDiag(test, '0xeb00', "11(0)");
  testDiag(test, '0xeb78313937302d30312d30315430303a30303a30302e3030305a',
    '11("1970-01-01T00:00:00.000Z")');

  test.done();
};

exports.edges = function(test) {
  testDiag(test, '0xdc', "err{\"expected\": 1, \"left\": h'dc'}");
  testDiag(test, '0xeb7831393730',
    "11(\"err{\"expected\": 24, \"left\": h'31393730'}");
  testDiag(test, '0x830102', '[1, 2, err{"expected": 1}');

  test.throws(function() {
    cbor.diagnose(1);
  });
  test.done();
};
