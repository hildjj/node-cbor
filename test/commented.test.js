var async = require('async');
var NoFilter = require('nofilter');

var Commented = require('../lib/commented');
var comment = Commented.comment;
var encode = require('../lib/encoder').encode;
var Simple = require('../lib/simple');
var utils = require('../lib/utils');

exports.simple = function(test) {
  async.each([
      ['01',
`  01                -- 1
0x01
`],
      ['20',
`  20                -- -1
0x20
`],
      ['1819',
`  18                -- Positive number, next 1 byte
    19              -- 25
0x1819
`],
      [encode(new Buffer([1,2,3])),
`  43                -- Bytes, length: 3
    010203          -- 010203
0x43010203
`],
      [encode("foo"),
`  63                -- String, length: 3
    666f6f          -- "foo"
0x63666f6f
`],
      [encode([1]),
`  81                -- Array, 1 item
    01              -- [0], 1
0x8101
`],
      [encode({foo: 1}),
`  a1                -- Map, 1 pair
    63              -- String, length: 3
      666f6f        -- {Key:0}, "foo"
    01              -- {Val:0}, 1
0xa163666f6f01
`],
      [encode(new Date(0)),
`  c1                -- Tag #1
    00              -- 0
0xc100
`],
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
`  f8                -- Simple value, next 1 byte
    ff              -- simple(255)
0xf8ff
`],
      ['9f018202039f0405ffff',
`  9f                -- Array (streaming)
    01              -- [0], 1
    82              -- [1], Array, 2 items
      02            -- [0], 2
      03            -- [1], 3
    9f              -- [2], Array (streaming)
      04            -- [0], 4
      05            -- [1], 5
      ff            -- BREAK
    ff              -- BREAK
0x9f018202039f0405ffff
`],
      ['bf6346756ef563416d7421ff',
`  bf                -- Map (streaming)
    63              -- String, length: 3
      46756e        -- {Key:0}, "Fun"
    f5              -- {Val:0}, true
    63              -- String, length: 3
      416d74        -- {Key:1}, "Amt"
    21              -- {Val:1}, -2
    ff              -- BREAK
0xbf6346756ef563416d7421ff
`],
      ['581e000102030405060708090001020304050607080900010203040506070809',
`  58                -- Bytes, length next 1 byte
    1e              -- Bytes, length: 30
      000102030405060708090001020304050607080900010203040506070809 -- 000102030405060708090001020304050607080900010203040506070809
0x581e000102030405060708090001020304050607080900010203040506070809
`],
      ['5F44aabbccdd43eeff99FF',
`  5f                -- Bytes (streaming)
    44              -- Bytes, length: 4
      aabbccdd      -- aabbccdd
    43              -- Bytes, length: 3
      eeff99        -- eeff99
    ff              -- BREAK
0x5f44aabbccdd43eeff99ff
`],
      ['fb3fb999999999999a',
`  fb                -- Float, next 8 bytes
    3fb999999999999a -- 0.1
0xfb3fb999999999999a
`],
      ['0101',
`  01                -- 1
0x01
  01                -- 1
0x01
`],
      ['b8010101',
`  b8                -- Map, count next 1 byte
    01              -- Map, 1 pair
      01            -- {Key:0}, 1
      01            -- {Val:0}, 1
0xb8010101
`],
      ['7f6161ff',
`  7f                -- String (streaming)
    61              -- String, length: 1
      61            -- "a"
    ff              -- BREAK
0x7f6161ff
`],
      ['5f420102ff',
`  5f                -- Bytes (streaming)
    42              -- Bytes, length: 2
      0102          -- 0102
    ff              -- BREAK
0x5f420102ff
`],
      ['a1a1616201a1616201',
`  a1                -- Map, 1 pair
    a1              -- {Key:0}, Map, 1 pair
      61            -- String, length: 1
        62          -- {Key:0}, "b"
      01            -- {Val:0}, 1
    a1              -- {Val:0}, Map, 1 pair
      61            -- String, length: 1
        62          -- {Key:0}, "b"
      01            -- {Val:0}, 1
0xa1a1616201a1616201
`],
      ['3bffffffffffffffff',
`  3b                -- Negative number, next 8 bytes
    ffffffffffffffff -- -18446744073709551616
0x3bffffffffffffffff
`],
      ['',``],
      [new Buffer(0), ""]
    ], function(io, cb) {
      var i = io[0];
      var o = io[1];
      comment(i, function(er, s) {
        if (er) {
          return cb(er);
        }
        test.deepEqual(s, o, `Input '${i}' -> '${s}'`);
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
    i = i.replace(/^0x/, '');
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
  var bs = new NoFilter()
  var parser = new Commented();
  parser.pipe(bs);

  parser.on('end', function() {
    test.deepEqual(bs.toString('utf8'),
  `  61                -- String, length: 1
    61              -- "a"
0x6161
`);
    test.done();
  });
  parser.on('error', function(er) {
    test.fail(er);
  });

  var h = new utils.DeHexStream('6161')
  h.pipe(parser);
};

exports.inputs = function(test) {
  comment('mB4AAQIDBAUGBwgJAAECAwQFBgcICQABAgMEBQYHCAk=', 'base64')
  .then(function(c) {
    test.deepEqual(c,
`  98                -- Array, length next 1 byte
    1e              -- Array, 30 items
      00            -- [0], 0
      01            -- [1], 1
      02            -- [2], 2
      03            -- [3], 3
      04            -- [4], 4
      05            -- [5], 5
      06            -- [6], 6
      07            -- [7], 7
      08            -- [8], 8
      09            -- [9], 9
      00            -- [10], 0
      01            -- [11], 1
      02            -- [12], 2
      03            -- [13], 3
      04            -- [14], 4
      05            -- [15], 5
      06            -- [16], 6
      07            -- [17], 7
      08            -- [18], 8
      09            -- [19], 9
      00            -- [20], 0
      01            -- [21], 1
      02            -- [22], 2
      03            -- [23], 3
      04            -- [24], 4
      05            -- [25], 5
      06            -- [26], 6
      07            -- [27], 7
      08            -- [28], 8
      09            -- [29], 9
0x981e000102030405060708090001020304050607080900010203040506070809
`);
    return comment('x\u001e012345678901234567890123456789', {encoding: 'utf8'})
  })
  .then(function(c) {
    test.deepEqual(c,
`  78                -- String, length next 1 byte
    1e              -- String, length: 30
      303132333435363738393031323334353637383930313233343536373839 -- "012345678901234567890123456789"
0x781e303132333435363738393031323334353637383930313233343536373839
`);
    return comment('381d', {max_depth: 12})
  })
  .then(function(c) {
    test.deepEqual(c,
`  38                    -- Negative number, next 1 byte
    1d                  -- -30
0x381d
`);
    test.done();
  });
};
