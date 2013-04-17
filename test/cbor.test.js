var csrequire = require('covershot').require.bind(null, require);
var cbor = csrequire('../lib/cbor');
var BufferStream = csrequire('../lib/BufferStream');
var fs = require('fs');
var temp = require('temp');

function hex(s) {
  return new Buffer(s.replace(/^0x/, ''), 'hex');
}

exports.Unallocated = {
  create: function(test) {
    var u = new cbor.Unallocated(0);
    test.deepEqual(u.value, 0);

    test.throws(function() {
      new cbor.Unallocated("0");
    });
    test.throws(function() {
      new cbor.Unallocated(-1);
    });
    test.throws(function() {
      new cbor.Unallocated(256);
    });
    test.throws(function() {
      new cbor.Unallocated(1.1);
    });

    test.done();
  }
};

function testPack(obj, encoded, test) {
  test.deepEqual(cbor.pack(obj), hex(encoded));
}

exports.encode = {
  ints: function(test) {
    testPack(0, '0x00', test);
    testPack(1, '0x01', test);
    testPack(10, '0x0a', test);
    testPack(0x1b, '0x1b', test);
    testPack(0x1c, '0x1c1c', test);
    testPack(29, '0x1c1d', test);
    testPack(100, '0x1c64', test);
    testPack(0xff, '0x1cff', test);
    testPack(0x1ff, '0x1d01ff', test);
    testPack(1000, '0x1d03e8', test);
    testPack(0xffff, '0x1dffff', test);
    testPack(0x1ffff, '0x1e0001ffff', test);
    testPack(1000000, '0x1e000f4240', test);
    testPack(0x7fffffff, '0x1e7fffffff', test);
    test.done();
  },

  negativeInts: function(test) {
    testPack(-1, '0x20', test);
    testPack(-10, '0x29', test);
    testPack(-100, '0x3c63', test);
    testPack(-1000, '0x3d03e7', test);
    testPack(-0x80000000, '0x3e7fffffff', test);
    test.done();
  },

  floats: function(test) {
    testPack(1.1, '0xdf3ff199999999999a', test);
    testPack(1.0e+300, '0xdf7e37e43c8800759c', test);
    testPack(-4.1, '0xdfc010666666666666', test);
    test.done();
  },

  specialNumbers: function(test) {
    testPack(Infinity, '0xdf7ff0000000000000', test);
    testPack(-Infinity, '0xdffff0000000000000', test);
    testPack(NaN, '0xdf7ff8000000000000', test);
    test.done();
  },

  small: function(test) {
    testPack(false, '0xd8', test);
    testPack(true, '0xd9', test);
    testPack(null, '0xda', test);
    testPack(undefined, '0xdb', test);
    test.done();
  },

  strings: function(test) {
    testPack("", '0x60', test);
    testPack("a", '0x6161', test);
    testPack("\u00FC", '0x62c3bc', test);
    testPack("IETF", '0x6449455446', test);
    test.done();
  },

  arrays : function(test) {
    testPack([], '0x80', test);
    testPack([1, 2, 3], '0x83010203', test);
    test.done();
  },

  objects: function(test) {
    testPack({}, '0xa0', test);
    testPack({1: 2, 3: 4}, '0xa2613102613304', test);
    testPack({"a": 1, "b": [2, 3]}, '0xa26161016162820203', test);
    testPack(["a", {"b": "c"}], '0x826161a161626163', test);
    test.deepEqual(cbor.pack(
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
       17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30]),
      hex('0x9c1e0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1c1c1d1c1e'));
    test.deepEqual(cbor.pack({"a": "A", "b": "B", "c": "C", "d": "D", "e": "E"}),
      hex('0xa56161614161626142616361436164614461656145'));
    test.done();
  },

  specialObjects: function(test) {
    test.deepEqual(cbor.pack(new Date(0)), hex('0xeb00'));

    test.deepEqual(cbor.pack(new Buffer(0)), hex('0x40'));
    test.deepEqual(cbor.pack(new Buffer([0,1,2,3,4])), hex('0x450001020304'));
    test.deepEqual(cbor.pack(new BufferStream()), hex('0x40'));
    test.deepEqual(cbor.pack(new cbor.Unallocated(0)), hex('0xc0'));
    test.deepEqual(cbor.pack(new cbor.Unallocated(255)), hex('0xdcff'));

    testPack(/a/, '0xf76161', test);
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
};

var parser = null;
function testUnpack(hexString, expected, test, cb) {
  var bs = new BufferStream({bsInit: hex(hexString)});
  parser.unpack(bs, function(er, res) {
    test.ok(!er, er);
    test.deepEqual(bs.length, 0, "Data left over!");
    test.deepEqual(expected, res);
    if (cb) {
      cb.call(this, er, res);
    }
  });
}

function testUnpackFail(hexString, test, cb) {
  parser.unpack(hex(hexString), function(er, res) {
    test.ok(er, "Error expected");
    if (cb) {
      cb.call(this, er, res);
    }
  });
}

function testStream(buf, test, cb) {
  // TODO: replace with a readable BufferStream
  var path = temp.path({prefix: 'test-', suffix: '.cbor'});
  fs.writeFile(path, buf, function(er) {
    test.ok(!er);
    var p = new cbor.ParseStream();
    p.on('msg', function(obj) {
      cb(null, obj);
    });
    p.on('error', function(er) {
      cb(er);
    });
    var str = fs.createReadStream(path);
    test.ok(str);
    str.pipe(p);
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
  negativeInts: function(test) {
    testUnpack('0x20', -1, test);
    testUnpack('0x29', -10, test);
    testUnpack('0x3c63', -100, test);
    testUnpack('0x3d03e7', -1000, test);

    test.done();
  },
  floats: function(test) {
    testUnpack('0xdf3ff199999999999a', 1.1, test);
    testUnpack('0xdf7e37e43c8800759c', 1.0e+300, test);
    testUnpack('0xde47c35000', 100000.0, test);
    testUnpack('0xdfc010666666666666', -4.1, test);

    // extra tests for half-precision, since it's implemented by hand
    testUnpack('0xddc000', -2, test);
    testUnpack('0xdd7bff', 65504, test);
    testUnpack('0xdd0400', Math.pow(2,-14), test);
    testUnpack('0xdd0001', Math.pow(2,-24), test);
    testUnpack('0xdd0000', 0, test);
    testUnpack('0xdd8000', -0, test);
    testUnpack('0xdd7c00', Infinity, test);
    testUnpack('0xddfc00', -Infinity, test);
    testUnpack('0xdd3555', 0.333251953125, test);

    parser.unpack(hex('0xdd7c01'), function(er, res) {
      test.ok(!er, er);
      test.ok(isNaN(res));
      test.done();
    });
  },
  specialNumbers: function(test) {
    testUnpack('0xdf7ff0000000000000', Infinity, test);
    testUnpack('0xdffff0000000000000', -Infinity, test);
    parser.unpack(hex('0xdf7ff8000000000000'), function(er, obj) {
      test.ok(!er);

      // NaN !== NaN
      test.ok(isNaN(obj));
      test.done();
    });
  },
  specials: function(test) {
    testUnpack('0xcf', new cbor.Unallocated(15), test);
    testUnpack('0xdc28', new cbor.Unallocated(0x28), test);
    testUnpack('0xdcff', new cbor.Unallocated(0xff), test);
    var u = new cbor.Unallocated(0xff);
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
    testUnpack('0x83644945544664494554466449455446',
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
  specialObjects: function(test) {
    // double: 0
    testUnpack('0xebdf0000000000000000', new Date(0), test);

    // double: 1e10
    testUnpack('0xebdf40c3880000000000', new Date(1e7), test);
    testUnpack('0xeb78313937302d30312d30315430303a30303a30302e3030305a',
      new Date(0), test);
    testUnpack('0x40', new Buffer(0), test);
    testUnpack('0x450001020304', new Buffer([0,1,2,3,4]), test);
    testUnpack('0xf763666f6f', /foo/, test);

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
    parser.unpack(hex('0xebebdf40c3880000000000'), function(er, obj) {
      test.deepEqual(er, new Error('Tag must not follow a tag'));
    });

    // With an offset
    parser.unpack(hex('0x0801'), 1, function(er, obj) {
      test.ok(!er);
      test.deepEqual(obj, 1);
    });

    testUnpackFail('0xeba0', test);
    testUnpackFail('0xf7a0', test);
    test.done();
  },
  addTag: function(test) {
    parser.addSemanticTag(0xffff, parseMilliInts);
    testUnpack('0xfdffff1d2710', 10, test, function(er, obj) {
      test.ok(this instanceof cbor.Parser);
      test.done();
    });
  },
  stream: function(test) {
    testStream(cbor.pack({a: {b: {c: {d: {e: [0, 1, 2 , 3]}}}}}),
      test, function(er, obj) {
        test.ok(!er);
        test.ok(obj);
        test.done();
    });
  },
  streamError: function(test) {
    testStream(hex("0xebebdf40c3880000000000"),
      test, function(er, obj) {
        test.ok(er);
        test.ok(!obj);
        test.done();
    });
  }
};
