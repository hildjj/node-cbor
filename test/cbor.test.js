var csrequire = require('covershot').require.bind(null, require);
var cbor = csrequire('../lib/cbor');
var BufferStream = csrequire('../lib/BufferStream');

function hex(s) {
  return new Buffer(s.replace(/^0x/, ''), 'hex');
}

exports.encode = {
  ints: function(test) {
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
  },

  negative_ints: function(test) {
    test.deepEqual(cbor.pack(-1), hex('0x20'));
    test.deepEqual(cbor.pack(-10), hex('0x29'));
    test.deepEqual(cbor.pack(-100), hex('0x3c63'));
    test.deepEqual(cbor.pack(-1000), hex('0x3d03e7'));
    test.done();
  },

  floats: function(test) {
    test.deepEqual(cbor.pack(1.1), hex('0xdf3ff199999999999a'));
    //test.deepEqual(cbor.pack(1.5), hex('0xdd3e00'));
    //test.deepEqual(cbor.pack(3.4028234663852886e+38), hex('0xde7f7fffff'));
    test.deepEqual(cbor.pack(1.0e+300), hex('0xdf7e37e43c8800759c'));
    //test.deepEqual(cbor.pack(5.960464477539063e-08), hex('0xdd0001'));
    //test.deepEqual(cbor.pack(6.103515625e-05), hex('0xdd0400'));
    test.deepEqual(cbor.pack(-4.1), hex('0xdfc010666666666666'));
    test.done();
  },

  special_numbers: function(test) {
    test.deepEqual(cbor.pack(Infinity), hex('0xdf7ff0000000000000'));
    test.deepEqual(cbor.pack(-Infinity), hex('0xdffff0000000000000'));
    test.deepEqual(cbor.pack(NaN), hex('0xdf7ff8000000000000'));
    test.done();
  },

  small: function(test) {
    test.deepEqual(cbor.pack(false), hex('0xd8'));
    test.deepEqual(cbor.pack(true), hex('0xd9'));
    test.deepEqual(cbor.pack(null), hex('0xda'));
    test.deepEqual(cbor.pack(), hex('0xdb'));
    test.done();
  },

  strings: function(test) {
    test.deepEqual(cbor.pack(""), hex('0x60'));
    test.deepEqual(cbor.pack("a"), hex('0x6161'));
    test.deepEqual(cbor.pack("\u00FC"), hex('0x62c3bc'));
    test.deepEqual(cbor.pack("IETF"), hex('0x6449455446'));
    test.done();
  },

  arrays : function(test) {
    test.deepEqual(cbor.pack([]), hex('0x80'));
    test.deepEqual(cbor.pack([1, 2, 3]), hex('0x83010203'));
    test.done();
  },

  objects: function(test) {
    test.deepEqual(cbor.pack({}), hex('0xa0'));
    //test.deepEqual(cbor.pack({1: 2, 3: 4}), hex('a201020304'));
    test.deepEqual(cbor.pack({"a": 1, "b": [2, 3]}), hex('0xa26161016162820203'));
    test.deepEqual(cbor.pack(["a", {"b": "c"}]), hex('0x826161a161626163'));
    test.deepEqual(cbor.pack(
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
       17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30]),
      hex('0x9c1e0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1c1c1d1c1e'));
    test.deepEqual(cbor.pack({"a": "A", "b": "B", "c": "C", "d": "D", "e": "E"}),
      hex('0xa56161614161626142616361436164614461656145'));
    test.done();
  },

  special_objects: function(test) {
    /*
    test.deepEqual(cbor.pack(new Date(0)), hex('0xeb00'));

    test.deepEqual(cbor.pack(new Buffer(0)), hex('0x40'));
    test.deepEqual(cbor.pack(new Buffer([0,1,2,3,4])), hex('0x450001020304'));
    */
    debugger;
    test.deepEqual(cbor.pack(new BufferStream()), hex('0x40'));
    test.deepEqual(cbor.pack(new cbor.Unallocated(255)), hex('0xdcff'));

    test.deepEqual(cbor.pack(/a/), hex('0xf76161'));
    test.done();
  },

  fail : function(test) {
    test.throws(function() {
      cbor.pack(test.ok);
    });
    test.done();
  },

  edges: function(test) {
    var bs = new BufferStream();
    cbor.pack('a', bs);
    test.deepEqual(bs.flatten(), hex('0x6161'));

    test.done();
  }
}

var parser = null;
function testUnpack(hexString, expected, test, cb) {
  parser.unpack(hex(hexString), function(er, res) {
    test.ok(!er, er);
    test.deepEqual(expected, res);
    if (cb) {
      cb.call(this, er, res);
    }
  });
}

function parseMilliInts(tag, obj, cb) {
  cb.call(this, null, obj / 1000);
}

exports.decode = {
  setUp: function(cb) {
    parser = new cbor.Parser();
    cb();
  },
  tearDown: function(cb) {
    parser = null;
    cb();
  },
  // Note: it's safe to run these in parallel, since they should all be
  // synchronous in practice
  ints : function(test) {
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
    testUnpack('0x1f000000e8d4a51000', 1000000000000, test);

    test.done();
  },
  negative_ints: function(test) {
    testUnpack('0x20', -1, test);
    testUnpack('0x29', -10, test);
    testUnpack('0x3c63', -100, test);
    testUnpack('0x3d03e7', -1000, test);

    test.done();
  },
  floats: function(test) {
    testUnpack('0x5f3ff199999999999a', 1.1, test);
    testUnpack('0x5f7e37e43c8800759c', 1.0e+300, test);
    testUnpack('0x5e47c35000', 100000.0, test);
    testUnpack('0x5fc010666666666666', -4.1, test);

    // extra tests for half-precision, since it's implemented by hand
    testUnpack('0x5dc000', -2, test);
    testUnpack('0x5d7bff', 65504, test);
    testUnpack('0x5d0400', Math.pow(2,-14), test);
    testUnpack('0x5d0001', Math.pow(2,-24), test);
    testUnpack('0x5d0000', 0, test);
    testUnpack('0x5d8000', -0, test);
    testUnpack('0x5d7c00', Infinity, test);
    testUnpack('0x5dfc00', -Infinity, test);
    testUnpack('0x5d3555', 0.333251953125, test);

    parser.unpack(hex('0x5d7c01'), function(er, res) {
      test.ok(!er, er);
      test.ok(isNaN(res));
      test.done();
    });
  },
  special_numbers: function(test) {
    testUnpack('0x5f7ff0000000000000', Infinity, test);
    testUnpack('0x5ffff0000000000000', -Infinity, test);
    parser.unpack(hex('0x5f7ff8000000000000'), function(er, obj) {
      test.ok(!er);

      // NaN !== NaN
      test.ok(isNaN(obj));
      test.done();
    });
  },
  specials: function(test) {
    testUnpack('0x4f', new cbor.Unallocated(15), test);
    testUnpack('0x5c28', new cbor.Unallocated(0x28), test);
    testUnpack('0x5cff', new cbor.Unallocated(0xff), test);
    var u = new cbor.Unallocated(0xff)
    test.equal(u.toString(), 'Unallocated-255');
    test.equal(u.toString(2), 'Unallocated-0b11111111');
    test.equal(u.toString(8), 'Unallocated-0377');
    test.equal(u.toString(16), 'Unallocated-0xff');
    test.done();
  },
  strings: function(test) {
    testUnpack('0x60', '', test);
    testUnpack('0x6161', 'a', test);
    testUnpack('0x62c3bc', '\u00FC', test);
    testUnpack('0x6449455446', 'IETF', test);

    test.done();
  },
  small: function(test) {
    testUnpack('0xd8', false, test);
    testUnpack('0xd9', true, test);
    testUnpack('0xda', null, test);
    testUnpack('0xdb', undefined, test);

    test.done();
  },
  arrays: function(test) {
    testUnpack('0x80', [], test);
    testUnpack('0x83010203', [1, 2, 3], test);
    testUnpack('0x83a449455446a449455446a449455446',
      ['IETF', 'IETF', 'IETF'], test);

    test.done();
  },
  objects: function(test) {
    testUnpack('0xa0', {}, test);
    testUnpack('0xa26161016162820203', {"a": 1, "b": [2, 3]}, test);
    testUnpack('0x826161a161626163', ["a", {"b": "c"}], test);
    testUnpack('0x9c1e0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1c1c1d1c1e',
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
        17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30], test);
    testUnpack('0xa56161614161626142616361436164614461656145',
      {"a": "A", "b": "B", "c": "C", "d": "D", "e": "E"}, test);

    test.done();
  },
  special_objects: function(test) {
    // double: 0
    testUnpack('0xeb5f0000000000000000', new Date(0), test);

    // double: 1e10
    testUnpack('0xeb5f40c3880000000000', new Date(1e7), test);
    testUnpack('0xebb8313937302d30312d30315430303a30303a30302e3030305a',
      new Date(0), test)
    testUnpack('0x40', new Buffer(0), test);
    testUnpack('0x450001020304', new Buffer([0,1,2,3,4]), test);
    testUnpack('0xf7a3666f6f', /foo/, test);

    // an unknown tag
    parser.unpack(hex('0xfe000f4240450001020304'), function(er, res, tag) {
      test.ok(!er, er);
      test.deepEqual(new Buffer([0, 1, 2, 3, 4]), res);
      test.deepEqual(1000000, tag);
      test.done();
    });
  },
  edges: function(test) {
    test.throws(function() {
      parser.unpack(hex('0x00'));
    });
    test.throws(function() {
      parser.unpack(hex('0x00', 0));
    });
    test.throws(function() {
      parser.unpack(0x00, function(er, obj) {
        test.fail(obj, 'Should never be called');
      });
    });

    // tag can't follow a tag.
    parser.unpack(hex('0xf1f15f40c3880000000000'), function(er, obj) {
      test.deepEqual(er, new Error('Tag must not follow a tag'));
    });

    // With an offset
    parser.unpack(hex('0x0801'), 1, function(er, obj) {
      test.ok(!er);
      test.deepEqual(obj, 1);
      test.done();
    })
  },
  add_tag: function(test) {
    parser.addSemanticTag(0xffff, parseMilliInts);
    testUnpack('0xfdffff1d2710', 10, test, function(er, obj) {
      test.ok(this instanceof cbor.Parser);
      test.done();
    });
  }
}
