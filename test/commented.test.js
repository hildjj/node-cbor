var async = require('async');

var temp = require('temp');
var fs = require('fs');

var BufferStream = require('../lib/BufferStream');
var Commented = require('../lib/commented');
var comment = Commented.comment;
var encode = require('../lib/encoder').encode;
var Simple = require('../lib/simple');

exports.simple = function(test) {
  async.each([
      ['01',
        '  01                -- 1\n' +
        "0x01\n"],
      ['20',
        '  20                -- -1\n' +
        '0x20\n'],
      ['1819',
        '  1819              -- 25\n' +
        '0x1819\n'],
      [encode(new Buffer([1,2,3])),
        '  43                -- Byte string length 3\n' +
        '    010203          -- Bytes content\n' +
        '0x43010203\n'],
      [encode("foo"),
        '  63                -- UTF-8 string length 3\n' +
        '    666f6f          -- "foo"\n' +
        '0x63666f6f\n'],
      [encode([1]),
        '  81                -- Array of length 1\n' +
        '    01              -- Array[0]: 1\n' +
        '0x8101\n'],
      [encode({foo: 1}),
        '  a1                -- Map with 1 pairs\n' +
        '    63              -- Map[0].key: UTF-8 string length 3\n' +
        '      666f6f        -- "foo"\n' +
        '    01              -- Map[0].value: 1\n' +
        '0xa163666f6f01\n'],
      [encode(new Date(0)),
        '  c1                -- Tag 1\n' +
        '    00              -- 0\n' +
        '0xc100\n'],
      [encode(false),
        '  f4                -- false\n' +
        '0xf4\n'],
      [encode(true),
        '  f5                -- true\n' +
        '0xf5\n'],
      [encode(null),
        '  f6                -- null\n' +
        '0xf6\n'],
      ['f7',
        '  f7                -- undefined\n' +
        '0xf7\n'],
      [encode(new Simple(255)),
        '  f8ff              -- simple(255)\n' +
        '0xf8ff\n'],
      ['0x9f018202039f0405ffff',
        '  9f                -- Start indefinite-length array\n' +
        '    01              -- 1\n' +
        '    82              -- Array of length 2\n' +
        '      02            -- Array[0]: 2\n' +
        '      03            -- Array[1]: 3\n' +
        '    9f              -- Start indefinite-length array\n' +
        '      04            -- 4\n' +
        '      05            -- 5\n' +
        '      ff            -- BREAK\n' +
        '    ff              -- BREAK\n' +
        '0x9f018202039f0405ffff\n'],
      ['0xbf6346756ef563416d7421ff',
        '  bf                -- Start indefinite-length map\n' +
        '    63              -- Map[0].key: UTF-8 string length 3\n' +
        '      46756e        -- "Fun"\n' +
        '    f5              -- Map[0].value: true\n' +
        '    63              -- Map[1].key: UTF-8 string length 3\n' +
        '      416d74        -- "Amt"\n' +
        '    21              -- Map[1].value: -2\n' +
        '    ff              -- BREAK\n' +
        '0xbf6346756ef563416d7421ff\n'],
      ['0x5F44aabbccdd43eeff99FF',
        '  5f                -- Start indefinite-length string\n' +
        '    44              -- Byte string length 4\n' +
        '      aabbccdd      -- Bytes content\n' +
        '    43              -- Byte string length 3\n' +
        '      eeff99        -- Bytes content\n' +
        '    ff              -- BREAK\n' +
        '0x5f44aabbccdd43eeff99ff\n'],
      ['0xfb3fb999999999999a',
        '  fb3fb999999999999a -- 0.1\n' +
        '0xfb3fb999999999999a\n'],
      ['0x0101',
        '  01                -- 1\n' +
        '  01                -- 1\n' +
        '0x0101\n'],
      ["", ""],
      [new Buffer(0), ""]
    ], function(io, cb) {
      var i = io[0];
      var o = io[1];
      comment(i, function(er, s) {
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
    '0x18',
    '0x43',
    '0x5f',
    '0x63',
    '0x83',
    '0x9f',
    '0xbf',
    '0xa3',
    '0xfc',
    '0xfd',
    '0xfe',
    '0x4301',
    '0x43FE',
    '0x4361',
    '0x5f6161',
    '0x5f01',
  ], function(i, cb) {
    comment(i, function(er, s) {
      if (!er) {
        cb(new Error('Expected error'));
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

  comment("");

  test.done();
};

exports.max_depth = function(test) {
  comment("01", 2, function(er, str) {
    test.ifError(er);
    test.deepEqual(str,
        '  01 -- 1\n' +
        "0x01\n");
    test.done();
  })
};

exports.stream = function(test) {
  var parser = new Commented({output: new BufferStream()});

  parser.on('end', function(buf) {
    test.deepEqual(buf, new Buffer([0x61, 0x61]));
    test.done();
  });
  parser.on('error', function(er) {
    test.fail(er);
  });

  temp.track();
  var f = temp.createWriteStream();
  f.end(new Buffer('6161', 'hex'), function(er){
    var g = fs.createReadStream(f.path);
    g.pipe(parser);
  });
};
