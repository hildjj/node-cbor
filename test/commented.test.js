var async = require('async');

var Commented = require('../lib/commented');
var comment = Commented.comment;
var encode = require('../lib/encoder').encode;
var Simple = require('../lib/simple');

exports.simple = function(test) {
  async.each([
      ['01', "0x01\n" +
        "  01                -- 1\n"],
      ['20', "0x20\n" +
        "  20                -- -1\n"],
      ['1819', '0x1819\n' +
        '  1819              -- 25\n'],
      [encode(new Buffer([1,2,3])), "0x43010203\n" +
        "  43                -- Byte string length 3\n" +
        "    010203          -- Bytes content\n"],
      [encode("foo"), '0x63666f6f\n' +
        '  63                -- UTF-8 string length 3\n' +
        '    666f6f          -- "foo"\n'],
      [encode([1]), '0x8101\n' +
        '  81                -- Array of length 1\n' +
        '    01              -- Array[0]: 1\n'],
      [encode({foo: 1}), '0xa163666f6f01\n' +
        '  a1                -- Map with 1 pairs\n' +
        '    63              -- Map[0].key: UTF-8 string length 3\n' +
        '      666f6f        -- "foo"\n' +
        '    01              -- Map[0].value: 1\n'],
      [encode(new Date(0)), '0xc100\n' +
        '  c1                -- Tag 1\n' +
        '    00              -- 0\n'],
      [encode(false), '0xf4\n' +
        '  f4                -- false\n'],
      [encode(true), '0xf5\n' +
        '  f5                -- true\n'],
      [encode(null), '0xf6\n' +
        '  f6                -- null\n'],
      ['f7', '0xf7\n' +
        '  f7                -- undefined\n'],
      [encode(new Simple(255)), '0xf8ff\n' +
        '  f8ff              -- simple(255)\n'],
      ['0x9f018202039f0405ffff', '0x9f018202039f0405ffff\n' +
        '  9f                -- Start indefinite-length array\n' +
        '    01              -- 1\n' +
        '    82              -- Array of length 2\n' +
        '      02            -- Array[0]: 2\n' +
        '      03            -- Array[1]: 3\n' +
        '    9f              -- Start indefinite-length array\n' +
        '      04            -- 4\n' +
        '      05            -- 5\n' +
        '      ff            -- BREAK\n' +
        '    ff              -- BREAK\n'],
      ['0xbf6346756ef563416d7421ff', '0xbf6346756ef563416d7421ff\n' +
        '  bf                -- Start indefinite-length map\n' +
        '    63              -- Map[0].key: UTF-8 string length 3\n' +
        '      46756e        -- "Fun"\n' +
        '    f5              -- Map[0].value: true\n' +
        '    63              -- Map[1].key: UTF-8 string length 3\n' +
        '      416d74        -- "Amt"\n' +
        '    21              -- Map[1].value: -2\n' +
        '    ff              -- BREAK\n'],
      ['0x5F44aabbccdd43eeff99FF', '0x5f44aabbccdd43eeff99ff\n' +
        '  5f                -- Start indefinite-length string\n' +
        '    44              -- Byte string length 4\n' +
        '      aabbccdd      -- Bytes content\n' +
        '    43              -- Byte string length 3\n' +
        '      eeff99        -- Bytes content\n' +
        '    ff              -- BREAK\n'],
      ['0xfb3fb999999999999a', '0xfb3fb999999999999a\n' +
        '  fb3fb999999999999a -- 0.1'],
      ['0x0101', '0x0101\n' +
        '  01                -- 1\n' +
        '  01                -- 1\n'],
      [new Buffer(0), "0x\n"]
    ], function(io, cb) {
      var i = io[0];
      var o = io[1];
      comment({input: i}, function(er, s) {
        if (er) {
          return cb(er);
        }
        test.deepEqual(s, o);
        cb();
      });
    }, function(er) {
      test.ifError(er);
      test.done();
    });
};

exports.encoding_errors = function(test) {
  async.each([
    "0x18",
    "0x43",
    "0x5f",
    "0x63",
    "0x83",
    "0x9f",
    "0xbf",
    "0xa3",
    "0xfc",
    "0xfd",
    "0xfe",
    "0x4301",
    "0x43FE",
    "0x4361",
    "0x5f6161",
    "0x5f01",
  ], function(i, cb) {
    comment({input: i}, function(er, s) {
      if (!er) {
        cb(new Error("Expected error"));
      }
      cb();
    });

  }, function(er) {
    test.ifError(er);
    test.done();
  });
};

exports.input_errors = function(test) {
  test.throws(function() {
    comment(null, null);
  });
  test.throws(function() {
    comment({input: ""}, null);
  });
  test.throws(function() {
    new Commented();
  });
  test.throws(function() {
    new Commented({input: 7});
  });

  test.done();
}
