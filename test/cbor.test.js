var csrequire = require('covershot').require.bind(null, require);
var cbor = csrequire('../lib/cbor');

function hex(s) {
  return new Buffer(s.replace(/^0x/, ''), 'hex');
}

exports.encode_ints = function(test) {
  test.deepEqual(cbor.pack(0), hex('0x00'));
  test.deepEqual(cbor.pack(1), hex('0x01'));
  test.deepEqual(cbor.pack(10), hex('0x0a'));
  test.deepEqual(cbor.pack(0x1b), hex('0x1b'));
  test.deepEqual(cbor.pack(0x1c), hex('0x1c1c'));
  test.deepEqual(cbor.pack(29), hex('0x1c1d'));
  test.deepEqual(cbor.pack(100), hex('0x1c64'));
  test.deepEqual(cbor.pack(0xff), hex('0x1cff'));
  test.deepEqual(cbor.pack(0x1ff), hex('0x1d01ff'));
  test.deepEqual(cbor.pack(1000), hex('0x1d03e8'));
  test.deepEqual(cbor.pack(0xffff), hex('0x1dffff'));
  test.deepEqual(cbor.pack(0x1ffff), hex('0x1e0001ffff'));
  test.deepEqual(cbor.pack(1000000), hex('0x1e000f4240'));
  test.deepEqual(cbor.pack(0x7fffffff), hex('0x1e7fffffff'));
  test.done();
};

exports.encode_negative_ints = function(test) {
  test.deepEqual(cbor.pack(-1), hex('0x20'));
  test.deepEqual(cbor.pack(-10), hex('0x29'));
  test.deepEqual(cbor.pack(-100), hex('0x3c63'));
  test.deepEqual(cbor.pack(-1000), hex('0x3d03e7'));
  test.done();
};

exports.encode_floats = function(test) {
  test.deepEqual(cbor.pack(1.1), hex('0x5f3ff199999999999a'));
  //test.deepEqual(cbor.pack(1.5), hex('0x5d3e00'));
  //test.deepEqual(cbor.pack(3.4028234663852886e+38), hex('0x5e7f7fffff'));
  test.deepEqual(cbor.pack(1.0e+300), hex('0x5f7e37e43c8800759c'));
  //test.deepEqual(cbor.pack(5.960464477539063e-08), hex('0x5d0001'));
  //test.deepEqual(cbor.pack(6.103515625e-05), hex('0x5d0400'));
  test.done();
};

exports.encode_negative_floats = function(test) {
  test.deepEqual(cbor.pack(-4.1), hex('0x5fc010666666666666'));
  test.done();
};

exports.encode_special_numbers = function(test) {
  test.deepEqual(cbor.pack(Infinity), hex('0x5f7ff0000000000000'));
  test.deepEqual(cbor.pack(-Infinity), hex('0x5ffff0000000000000'));
  test.deepEqual(cbor.pack(NaN), hex('0x5f7ff8000000000000'));
  test.done();
};

exports.encode_small = function(test) {
  test.deepEqual(cbor.pack(false), hex('0x58'));
  test.deepEqual(cbor.pack(true), hex('0x59'));
  test.deepEqual(cbor.pack(null), hex('0x5a'));
  test.deepEqual(cbor.pack(), hex('0x5b'));
  test.done();
};

exports.encode_strings = function(test) {
  test.deepEqual(cbor.pack(""), hex('0xa0'));
  test.deepEqual(cbor.pack("a"), hex('0xa161'));
  test.deepEqual(cbor.pack("\u00FC"), hex('0xa2c3bc'));
  test.deepEqual(cbor.pack("IETF"), hex('0xa449455446'));
  test.done();
};

exports.encode_arrays = function(test) {
  test.deepEqual(cbor.pack([]), hex('0xc0'));
  test.deepEqual(cbor.pack([1, 2, 3]), hex('0xc3010203'));
  test.done();
};

exports.encode_objects = function(test) {
  test.deepEqual(cbor.pack({}), hex('0xe0'));
  //test.deepEqual(cbor.pack({1: 2, 3: 4}), hex('e201020304'));
  test.deepEqual(cbor.pack({"a": 1, "b": [2, 3]}), hex('0xe2a16101a162c20203'));
  test.deepEqual(cbor.pack(["a", {"b": "c"}]), hex('0xc2a161e1a162a163'));
  test.deepEqual(cbor.pack(
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
     17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30]),
    hex('0xdc1e0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1c1c1d1c1e'));
  test.deepEqual(cbor.pack({"a": "A", "b": "B", "c": "C", "d": "D", "e": "E"}),
    hex('0xe5a161a141a162a142a163a143a164a144a165a145'));
  test.done();
};

exports.encode_special_objects = function(test) {
  test.deepEqual(cbor.pack(new Date(0)), hex('0x715f0000000000000000'));

  test.deepEqual(cbor.pack(new Buffer(0)), hex('0x80'));
  test.deepEqual(cbor.pack(new Buffer([0,1,2,3,4])), hex('0x850001020304'));

  test.deepEqual(cbor.pack(/a/), hex('0x77a161'));
  test.done();
};

exports.encode_fail = function(test) {
  test.throws(function() {
    cbor.pack(test.ok);
  });
  test.done();
}

exports.encode_edges = function(test) {
  var bs = new BufferStream();
  cbor.pack('a', bs);
  test.deepEqual(bs.flatten(), hex('0xa161'));

  test.done();
}

function testUnpack(hexString, expected, test, done) {
  cbor.unpack(hex(hexString), function(er, res) {
    test.ok(!er, er);
    test.deepEqual(expected, res);
    if (done) {
      test.done();
    }
  });
}

exports.decode_ints = function(test) {
  // safe to run these in parallel, since they should all be effectively
  // synchronous
  testUnpack('0x00', 0, test);
  testUnpack('0x01', 1, test);
  testUnpack('0x0a', 10, test);
  testUnpack('0x1b', 0x1b, test);
  testUnpack('0x1c1c', 0x1c, test);
  testUnpack('0x1c1d', 0x1d, test);
  testUnpack('0x1c64', 100, test);
  testUnpack('0x1cff', 0xff, test);
  testUnpack('0x1d01ff', 0x1ff, test);
  testUnpack('0x1d03e8', 1000, test);
  testUnpack('0x1dffff', 0xffff, test);
  testUnpack('0x1e0001ffff', 0x1ffff, test);
  testUnpack('0x1e000f4240', 1000000, test);
  testUnpack('0x1e7fffffff', 0x7fffffff, test);
  testUnpack('0x1f000000e8d4a51000', 1000000000000, test, true);
};

exports.decode_negative_ints = function(test) {
  testUnpack('0x20', -1, test);
  testUnpack('0x29', -10, test);
  testUnpack('0x3c63', -100, test);
  testUnpack('0x3d03e7', -1000, test, true);
}

exports.decode_floats = function(test) {
  testUnpack('0x5f3ff199999999999a', 1.1, test);
  testUnpack('0x5f7e37e43c8800759c', 1.0e+300, test);
  testUnpack('0x5e47c35000', 100000.0, test);
  testUnpack('0x5fc010666666666666', -4.1, test, true);
};

exports.decode_special_numbers = function(test) {
  testUnpack('0x5f7ff0000000000000', Infinity, test);
  testUnpack('0x5ffff0000000000000', -Infinity, test);
  cbor.unpack(hex('0x5f7ff8000000000000'), function(er, obj) {
    test.ok(!er);

    // NaN !== NaN
    test.ok(isNaN(obj));
    test.done();
  });
};

exports.decode_specials = function(test) {
  testUnpack('0x4f', 'special0', test);
  testUnpack('0x5c00', 'special28', test, true);
};

exports.decode_strings = function(test) {
  testUnpack('0xa0', '', test);
  testUnpack('0xa161', 'a', test);
  testUnpack('0xa2c3bc', '\u00FC', test);
  testUnpack('0xa449455446', 'IETF', test, true);
};

exports.decode_small = function(test) {
  testUnpack('0x58', false, test);
  testUnpack('0x59', true, test);
  testUnpack('0x5a', null, test);
  testUnpack('0x5b', undefined, test, true);
};

exports.decode_arrays = function(test) {
  testUnpack('0xc0', [], test);
  testUnpack('0xc3010203', [1, 2, 3], test);
  testUnpack('0xc3a449455446a449455446a449455446', ['IETF', 'IETF', 'IETF'], test, true);
};

exports.decode_objects = function(test) {
  testUnpack('0xe0', {}, test);
  testUnpack('0xe2a16101a162c20203', {"a": 1, "b": [2, 3]}, test);
  testUnpack('0xc2a161e1a162a163', ["a", {"b": "c"}], test);
  testUnpack('0xdc1e0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1c1c1d1c1e',
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
      17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30], test);
  testUnpack('0xe5a161a141a162a142a163a143a164a144a165a145',
    {"a": "A", "b": "B", "c": "C", "d": "D", "e": "E"}, test, true);
};

exports.decode_special_objects = function(test) {
  // double: 0
  testUnpack('0x715f0000000000000000', new Date(0), test);
  // double: 1e10
  testUnpack('0x715f40c3880000000000', new Date(1e7), test);
  testUnpack('0x71b8313937302d30312d30315430303a30303a30302e3030305a',
    new Date(0), test)


  testUnpack('0x80', new Buffer(0), test);
  testUnpack('0x850001020304', new Buffer([0,1,2,3,4]), test);
  testUnpack('0x77a3666f6f', /foo/, test, true);
};

exports.unpack_edges = function(test) {
  test.throws(function() {
    cbor.unpack(hex('0x00'));
  });
  test.throws(function() {
    cbor.unpack(hex('0x00', 0));
  });
  test.throws(function() {
    cbor.unpack(0x00, function(er, obj) {
      test.fail(obj, 'Should never be called');
    });
  });
  cbor.unpack(hex('0x0801'), 1, function(er, obj) {
    test.ok(!er);
    test.deepEqual(obj, 1);
    test.done();
  })
};
