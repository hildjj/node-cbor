/*jslint node: true */
"use strict";

var csrequire = require('covershot').require.bind(null, require);
var cbor = csrequire('../lib/cbor');
var BufferStream = csrequire('../lib/BufferStream');
var fs = require('fs');
var url = require('url');
var temp = require('temp');

function hex(s) {
  return new Buffer(s.replace(/^0x/, ''), 'hex');
}

function testUnpack(test, hexString, expected) {
  var funky = (typeof expected === 'function');
  try {
    var bs = new BufferStream({bsInit: hex(hexString)});
    cbor.unpack(bs, function(er, res, tag) {
      if (funky) {
        expected.call(this, er, res, tag);
      } else {
        test.ok(!er, er);
        test.deepEqual(bs.length, 0, "Data left over!");
        test.deepEqual(expected, res);
      }
    });
  } catch (e) {
    if (funky) {
      expected(e);
    } else {
      throw(e);
    }
  }
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

// Note: it's safe to run these in parallel, since they should all be
// synchronous in practice
exports.ints = function(test) {
  testUnpack(test, '0x00', 0);
  testUnpack(test, '0x01', 1);
  testUnpack(test, '0x0a', 10);
  testUnpack(test, '0x1b', 0x1b);
  testUnpack(test, '0x1c1c', 0x1c);
  testUnpack(test, '0x1c1d', 0x1d);
  testUnpack(test, '0x1c64', 100);
  testUnpack(test, '0x1cff', 0xff);
  testUnpack(test, '0x1d01ff', 0x1ff);
  testUnpack(test, '0x1d03e8', 1000);
  testUnpack(test, '0x1dffff', 0xffff);
  testUnpack(test, '0x1e0001ffff', 0x1ffff);
  testUnpack(test, '0x1e000f4240', 1000000);
  testUnpack(test, '0x1e7fffffff', 0x7fffffff);
  testUnpack(test, '0x1f000000e8d4a51000', 1000000000000);

  test.done();
};

exports.negativeInts = function(test) {
  testUnpack(test, '0x20', -1);
  testUnpack(test, '0x29', -10);
  testUnpack(test, '0x3c63', -100);
  testUnpack(test, '0x3d03e7', -1000);

  test.done();
};

exports.floats = function(test) {
  testUnpack(test, '0xdf3ff199999999999a', 1.1);
  testUnpack(test, '0xdf7e37e43c8800759c', 1.0e+300);
  testUnpack(test, '0xde47c35000', 100000.0);
  testUnpack(test, '0xdfc010666666666666', -4.1);

  // extra tests for half-precision, since it's implemented by hand
  testUnpack(test, '0xddc000', -2);
  testUnpack(test, '0xdd7bff', 65504);
  testUnpack(test, '0xdd0400', Math.pow(2,-14));
  testUnpack(test, '0xdd0001', Math.pow(2,-24));
  testUnpack(test, '0xdd0000', 0);
  testUnpack(test, '0xdd8000', -0);
  testUnpack(test, '0xdd7c00', Infinity);
  testUnpack(test, '0xddfc00', -Infinity);
  testUnpack(test, '0xdd3555', 0.333251953125);

  testUnpack(test, '0xdd7c01', function(er, res) {
    test.ok(!er, er);
    test.ok(isNaN(res));
    test.done();
  });
};

exports.specialNumbers = function(test) {
  testUnpack(test, '0xdf7ff0000000000000', Infinity);
  testUnpack(test, '0xdffff0000000000000', -Infinity);
  testUnpack(test, '0xdf7ff8000000000000', function(er, obj) {
    // NaN !== NaN
    test.ok(isNaN(obj));
    test.done();
  });
};

exports.specials = function(test) {
  testUnpack(test, '0xcf', new cbor.Unallocated(15));
  testUnpack(test, '0xdc28', new cbor.Unallocated(0x28));
  testUnpack(test, '0xdcff', new cbor.Unallocated(0xff));
  var u = new cbor.Unallocated(0xff);
  test.equal(u.toString(), 'simple(255)');
  test.done();
};

exports.strings = function(test) {
  testUnpack(test, '0x60', '');
  testUnpack(test, '0x6161', 'a');
  testUnpack(test, '0x62c3bc', '\u00FC');
  testUnpack(test, '0x6449455446', 'IETF');

  test.done();
};

exports.small = function(test) {
  testUnpack(test, '0xd8', false);
  testUnpack(test, '0xd9', true);
  testUnpack(test, '0xda', null);
  testUnpack(test, '0xdb', undefined);

  test.done();
};

exports.arrays = function(test) {
  testUnpack(test, '0x80', []);
  testUnpack(test, '0x83010203', [1, 2, 3]);
  testUnpack(test, '0x83644945544664494554466449455446',
    ['IETF', 'IETF', 'IETF']);

  test.done();
};

exports.objects = function(test) {
  testUnpack(test, '0xa0', {});
  testUnpack(test, '0xa26161016162820203', {"a": 1, "b": [2, 3]});
  testUnpack(test, '0x826161a161626163', ["a", {"b": "c"}]);
  testUnpack(test, '0x9c1e0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1c1c1d1c1e',
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
      17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30]);
  testUnpack(test, '0xa56161614161626142616361436164614461656145',
    {"a": "A", "b": "B", "c": "C", "d": "D", "e": "E"});

  test.done();
};

exports.specialObjects = function(test) {
  // double: 0
  testUnpack(test, '0xebdf0000000000000000', new Date(0));

  // double: 1e10
  testUnpack(test, '0xebdf40c3880000000000', new Date(1e7));
  testUnpack(test, '0xeb78313937302d30312d30315430303a30303a30302e3030305a', new Date(0));
  testUnpack(test, '0x40', new Buffer(0));
  testUnpack(test, '0x450001020304', new Buffer([0,1,2,3,4]));
  testUnpack(test, '0xf763666f6f', /foo/);
  testUnpack(test, '0xef70687474703a2f2f6c6f63616c686f7374', function(er, obj) {
    test.ok(obj instanceof url.Url);
    test.deepEqual(obj.href, 'http://localhost/');
  });

  testUnpack(test, '0xef00', function(er, obj) {
    // Unsupported Uri type: number
    test.ok(er);
    test.ok(!obj);
  });

  // an unknown tag
  testUnpack(test, '0xfe000f4240450001020304',
    new cbor.Tagged(1000000, new Buffer([0, 1, 2, 3, 4])));
  test.done();
};

exports.edges = function(test) {
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
  test.throws(function() {
    cbor.unpack(hex('0x00'));
  });

  // tag can't follow a tag.
  testUnpack(test, '0xebebdf40c3880000000000', function(er, obj) {
    test.deepEqual(er, new Error('Tag must not follow a tag'));
  });

  // With an offset
  cbor.unpack(hex('0x0801'), {psOffset: 1}, function(er, obj) {
    test.ok(!er);
    test.deepEqual(obj, 1);
  });

  testUnpack(test, '0xeba0', function(er, obj) {
    test.ok(er);
  });
  testUnpack(test, '0xf7a0', function(er, obj) {
    test.ok(er);
  });
  test.done();
};

exports.addTag = function(test) {
  var parser = new cbor.Parser();
  parser.addSemanticTag(0xffff, parseMilliInts);
  parser.unpack(hex('0xfdffff1d2710'), function(er, obj) {
    test.ok(!er, er);
    test.deepEqual(obj, 10);
  });

  test.done();
};

exports.addTagOptions = function(test) {
  testUnpack(test, '0xfdffff1d2710', new cbor.Tagged(0xffff, 10000));
  cbor.unpack(hex('0xfdffff1d2710'), {psTags:{
    0xffff: parseMilliInts
  }}, function(er, obj) {
    test.deepEqual(obj, 10);
    test.done();
  });
};

exports.stream = function(test) {
  testStream(cbor.pack({a: {b: {c: {d: {e: [0, 1, 2 , 3]}}}}}),
    test, function(er, obj) {
      test.ok(!er);
      test.ok(obj);
      test.done();
  });
};

exports.streamError = function(test) {
  testStream(hex("0xebebdf40c3880000000000"),
    test, function(er, obj) {
      test.ok(er);
      test.ok(!obj);
      test.done();
  });
};

exports.unpackStream = function(test) {
  var path = temp.path({prefix: 'test-', suffix: '.cbor'});
  fs.writeFile(path, hex('0x00'), function(er) {
    test.ok(!er);
    var str = fs.createReadStream(path);
    test.ok(str);
    cbor.unpack(str, function(er, obj) {
      test.ok(!er);
      test.deepEqual(obj, 0);
      test.done();
    });
  });
};

exports.unpackStreamShort = function(test) {
  var path = temp.path({prefix: 'test-', suffix: '.cbor'});
  fs.writeFile(path, hex('0x6861'), function(er) {
    test.ok(!er);
    var str = fs.createReadStream(path);
    test.ok(str);
    cbor.unpack(str, function(er, obj) {
      test.ok(er);
      test.done();
    });
  });
};

exports.unpackStreamError = function(test) {
  var path = temp.path({prefix: 'test-', suffix: '.cbor'});
  fs.writeFile(path, hex('0xebebdf40c3880000000000'), function(er) {
    test.ok(!er);
    var str = fs.createReadStream(path);
    test.ok(str);
    cbor.unpack(str, function(er, obj) {
      test.ok(er);
      test.done();
    });
  });
};

exports.unpackStreamEdges = function(test) {
  test.throws(function() {
    cbor.unpack("foo", console.log);
  });
  test.done();
};
