/*jslint node: true */
"use strict";

var csrequire = require('covershot').require.bind(null, require);
var cbor = csrequire('../lib/cbor');
var BufferStream = csrequire('../lib/BufferStream');
var url = require('url');

function hex(s) {
  return new Buffer(s.replace(/^0x/, ''), 'hex');
}

// If you pass a function as encoded, catch errors and pass them
// to the callback.  Avoids test.throws.
function testPack(test, obj, encoded) {
  var funky = (typeof encoded === 'function');
  try {
    var packed = cbor.pack(obj);
    test.ok(packed);
    if (funky) {
      encoded(null, packed);
    } else {
      test.deepEqual(packed, hex(encoded));
    }
  } catch (e) {
    if (funky) {
      encoded(e);
    } else {
      throw e;
    }
  }
}

exports.ints = function(test) {
  testPack(test, 0, '0x00');
  testPack(test, 1, '0x01');
  testPack(test, 10, '0x0a');
  testPack(test, 0x1b, '0x1b');
  testPack(test, 0x1c, '0x1c1c');
  testPack(test, 29, '0x1c1d');
  testPack(test, 100, '0x1c64');
  testPack(test, 0xff, '0x1cff');
  testPack(test, 0x1ff, '0x1d01ff');
  testPack(test, 1000, '0x1d03e8');
  testPack(test, 0xffff, '0x1dffff');
  testPack(test, 0x1ffff, '0x1e0001ffff');
  testPack(test, 1000000, '0x1e000f4240');
  testPack(test, 0x7fffffff, '0x1e7fffffff');
  test.done();
};

exports.negativeInts = function(test) {
  testPack(test, -1, '0x20');
  testPack(test, -10, '0x29');
  testPack(test, -100, '0x3c63');
  testPack(test, -1000, '0x3d03e7');
  testPack(test, -0x80000000, '0x3e7fffffff');
  test.done();
};

exports.floats = function(test) {
  testPack(test, 1.1, '0xdf3ff199999999999a');
  testPack(test, 1.0e+300, '0xdf7e37e43c8800759c');
  testPack(test, -4.1, '0xdfc010666666666666');
  test.done();
};

exports.specialNumbers = function(test) {
  testPack(test, Infinity, '0xdf7ff0000000000000');
  testPack(test, -Infinity, '0xdffff0000000000000');
  testPack(test, NaN, '0xdf7ff8000000000000');
  test.done();
};

exports.small = function(test) {
  testPack(test, false, '0xd8');
  testPack(test, true, '0xd9');
  testPack(test, null, '0xda');
  testPack(test, undefined, '0xdb');
  test.done();
};

exports.strings = function(test) {
  testPack(test, "", '0x60');
  testPack(test, "a", '0x6161');
  testPack(test, "\u00FC", '0x62c3bc');
  testPack(test, "IETF", '0x6449455446');
  test.done();
};

exports.arrays  = function(test) {
  testPack(test, [], '0x80');
  testPack(test, [1, 2, 3], '0x83010203');
  test.done();
};

exports.objects = function(test) {
  testPack(test, {}, '0xa0');
  testPack(test, {1: 2, 3: 4}, '0xa2613102613304');
  testPack(test, {"a": 1, "b": [2, 3]}, '0xa26161016162820203');
  testPack(test, ["a", {"b": "c"}], '0x826161a161626163');
  testPack(test, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
     17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30],
    '0x9c1e0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1c1c1d1c1e');
  testPack(test, {"a": "A", "b": "B", "c": "C", "d": "D", "e": "E"},
    '0xa56161614161626142616361436164614461656145');
  test.done();
};

exports.specialObjects = function(test) {
  testPack(test, new Date(0), '0xeb00');

  testPack(test, new Buffer(0), '0x40');
  testPack(test, new Buffer([0,1,2,3,4]), '0x450001020304');
  testPack(test, new BufferStream(), '0x40');
  testPack(test, new cbor.Unallocated(0), '0xc0');
  testPack(test, new cbor.Unallocated(255), '0xdcff');
  testPack(test, url.parse('http://localhost'),
    '0xef71687474703a2f2f6c6f63616c686f73742f');

  testPack(test, /a/, '0xf76161');

  testPack(test, new cbor.Tagged(0xffff, "foo"), '0xfdffff63666f6f');
  test.done();
};

exports.addSemanticType = function(test) {
  function tempClass(val) {
    // render as the string tempClass with the tag 0xffff
    this.value = val || "tempClass";
  }
  tempClass.pack = function(gen, obj, bufs) {
    cbor.Generator.packInt(0xffff, 7, bufs);
    gen.unsafePack(obj.value, bufs);
  };
  // before the tag, this is an innocuous object:
  // {"value": "foo"}
  var t = new tempClass('foo');
  testPack(test, t, '0xa16576616c756563666f6f');

  var gen = new cbor.Generator({genTypes: [tempClass, tempClass.pack]});
  test.deepEqual(gen.pack(t), hex('0xfdffff63666f6f'));

  function hexPackBuffer(gen, obj, bufs) {
    gen.unsafePack('0x' + obj.toString('hex'), bufs);
  }

  // replace Buffer serializer with hex strings
  gen = new cbor.Generator({genTypes: [Buffer, hexPackBuffer]});
  test.deepEqual(gen.pack(new Buffer('010203', 'hex')),
    hex('0x683078303130323033'));

  test.done();
};

exports.fail = function(test) {
  test.throws(function() {
    cbor.pack(test.ok);
  });
  test.done();
};

exports.edges = function(test) {
  var bs = new BufferStream();
  cbor.pack('a', bs);
  test.deepEqual(bs.flatten(), hex('0x6161'));

  test.done();
};
