'use strict'

const BigNum = require('bignumber.js')
const NoFilter = require('nofilter')
const cbor = require('../')
const constants = require('../lib/constants')
const url = require('url')

class TempClass {
  constructor(val) {
    // render as the string tempClass with the tag 0xffff
    this.value = val || 'tempClass'
  }
  encodeCBOR(gen) {
    return gen._pushTag(0xffff) && gen.pushAny(this.value)
  }
  static toCBOR(gen, obj) {
    return gen._pushTag(0xfffe) && gen.pushAny(obj.value)
  }
}
exports.TempClass = TempClass

/* eslint-disable max-len */

// [Decoded, Diagnostic, Commented]
exports.good = [
  [0, '0', `
  00                -- 0
0x00`],
  [1, '1', `
  01                -- 1
0x01`],
  [10, '10', `
  0a                -- 10
0x0a`],
  [23, '23', `
  17                -- 23
0x17`],
  [24, '24', `
  18                -- Positive number, next 1 byte
    18              -- 24
0x1818`],
  [25, '25', `
  18                -- Positive number, next 1 byte
    19              -- 25
0x1819`],
  [100, '100', `
  18                -- Positive number, next 1 byte
    64              -- 100
0x1864`],
  [1000, '1000', `
  19                -- Positive number, next 2 bytes
    03e8            -- 1000
0x1903e8`],
  [1000000, '1000000', `
  1a                -- Positive number, next 4 bytes
    000f4240        -- 1000000
0x1a000f4240`],
  [1000000000000, '1000000000000', `
  1b                -- Positive number, next 8 bytes
    000000e8d4a51000 -- 1000000000000
0x1b000000e8d4a51000`],

  // JS rounding: 18446744073709552000
  // [18446744073709551615, '0x1bffffffffffffffff'],
  [Number.MAX_SAFE_INTEGER, '9007199254740991', `
  1b                -- Positive number, next 8 bytes
    001fffffffffffff -- 9007199254740991
0x1b001fffffffffffff`],
  [Number.MAX_VALUE, '1.7976931348623157e+308_3', `
  fb                -- Float, next 8 bytes
    7fefffffffffffff -- 1.7976931348623157e+308
0xfb7fefffffffffffff`],
  [new BigNum('-1c0000000000000001', 16), '3(h\'1c0000000000000000\')', `
  c3                -- Tag #3
    49              -- Bytes, length: 9
      1c0000000000000000 -- 1c0000000000000000
0xc3491c0000000000000000`],
  [new BigNum('18446744073709551616'), '2(h\'010000000000000000\')', `
  c2                -- Tag #2
    49              -- Bytes, length: 9
      010000000000000000 -- 010000000000000000
0xc249010000000000000000`],
  [new BigNum('-18446744073709551617'), '3(h\'010000000000000000\')', `
  c3                -- Tag #3
    49              -- Bytes, length: 9
      010000000000000000 -- 010000000000000000
0xc349010000000000000000`],
  [-1, '-1', `
  20                -- -1
0x20`],
  [-10, '-10', `
  29                -- -10
0x29`],
  [-100, '-100', `
  38                -- Negative number, next 1 byte
    63              -- -100
0x3863`],
  [-1000, '-1000', `
  39                -- Negative number, next 2 bytes
    03e7            -- -1000
0x3903e7`],
  [1.1, '1.1_3', `
  fb                -- Float, next 8 bytes
    3ff199999999999a -- 1.1
0xfb3ff199999999999a`],
  [1.5, '1.5_3', `
  fb                -- Float, next 8 bytes
    3ff8000000000000 -- 1.5
0xfb3ff8000000000000`],
  [3.4028234663852886e+38, '3.4028234663852886e+38_3', `
  fb                -- Float, next 8 bytes
    47efffffe0000000 -- 3.4028234663852886e+38
0xfb47efffffe0000000`],
  [1e+300, '1e+300_3', `
  fb                -- Float, next 8 bytes
    7e37e43c8800759c -- 1e+300
0xfb7e37e43c8800759c`],
  [5.960464477539063e-8, '5.960464477539063e-8_3', `
  fb                -- Float, next 8 bytes
    3e70000000000000 -- 5.960464477539063e-8
0xfb3e70000000000000`],

  [0.00006103515625, '0.00006103515625_3', `
  fb                -- Float, next 8 bytes
    3f10000000000000 -- 0.00006103515625
0xfb3f10000000000000`],
  [-4.1, '-4.1_3', `
  fb                -- Float, next 8 bytes
    c010666666666666 -- -4.1
0xfbc010666666666666`],

  [Infinity, 'Infinity_1', `
  f9                -- Float, next 2 bytes
    7c00            -- Infinity
0xf97c00`],
  [NaN, 'NaN_1', `
  f9                -- Float, next 2 bytes
    7e00            -- NaN
0xf97e00`],
  [-Infinity, '-Infinity_1', `
  f9                -- Float, next 2 bytes
    fc00            -- -Infinity
0xf9fc00`],
  [false, 'false', `
  f4                -- false
0xf4`],
  [true, 'true', `
  f5                -- true
0xf5`],
  [null, 'null', `
  f6                -- null
0xf6`],
  [undefined, 'undefined', `
  f7                -- undefined
0xf7`],

  [new cbor.Simple(16), 'simple(16)', `
  f0                -- simple(16)
0xf0`],
  [new cbor.Simple(24), 'simple(24)', `
  f8                -- Simple value, next 1 byte
    18              -- simple(24)
0xf818`],
  [new cbor.Simple(255), 'simple(255)', `
  f8                -- Simple value, next 1 byte
    ff              -- simple(255)
0xf8ff`],
  [new Date(1363896240000), '1(1363896240)', `
  c1                -- Tag #1
    1a              -- Positive number, next 4 bytes
      514b67b0      -- 1363896240
0xc11a514b67b0`],

  [url.parse('http://www.example.com'), '32("http://www.example.com/")', `
  d8                --  next 1 byte
    20              -- Tag #32
      77            -- String, length: 23
        687474703a2f2f7777772e6578616d706c652e636f6d2f -- "http://www.example.com/"
0xd82077687474703a2f2f7777772e6578616d706c652e636f6d2f`],
  [new Buffer(0), 'h\'\'', `
  40                -- Bytes, length: 0
0x40`],
  [new Buffer('01020304', 'hex'), 'h\'01020304\'', `
  44                -- Bytes, length: 4
    01020304        -- 01020304
0x4401020304`],
  [new Buffer('000102030405060708090a0b0c0d0e0f101112131415161718', 'hex'), 'h\'000102030405060708090a0b0c0d0e0f101112131415161718\'', `
  58                -- Bytes, length next 1 byte
    19              -- Bytes, length: 25
      000102030405060708090a0b0c0d0e0f101112131415161718 -- 000102030405060708090a0b0c0d0e0f101112131415161718
0x5819000102030405060708090a0b0c0d0e0f101112131415161718`],

  ['', '""', `
  60                -- String, length: 0
0x60`],
  ['a', '"a"', `
  61                -- String, length: 1
    61              -- "a"
0x6161`],
  ['IETF', '"IETF"', `
  64                -- String, length: 4
    49455446        -- "IETF"
0x6449455446`],
  ['"\\', '"\\"\\\\"', `
  62                -- String, length: 2
    225c            -- "\\\"\\\\"
0x62225c`],
  ['\u00fc', '"\u00fc"', `
  62                -- String, length: 2
    c3bc            -- "ü"
0x62c3bc`],
  ['\u6c34', '"\u6c34"', `
  63                -- String, length: 3
    e6b0b4          -- "水"
0x63e6b0b4`],
  ['\ud800\udd51', '"\ud800\udd51"', `
  64                -- String, length: 4
    f0908591        -- "𐅑"
0x64f0908591`],
  [[], '[]', `
  80                -- []
0x80`],
  [[1, 2, 3], '[1, 2, 3]', `
  83                -- Array, 3 items
    01              -- [0], 1
    02              -- [1], 2
    03              -- [2], 3
0x83010203`],
  [[1, [2, 3], [4, 5]], '[1, [2, 3], [4, 5]]', `
  83                -- Array, 3 items
    01              -- [0], 1
    82              -- [1], Array, 2 items
      02            -- [0], 2
      03            -- [1], 3
    82              -- [2], Array, 2 items
      04            -- [0], 4
      05            -- [1], 5
0x8301820203820405`],

  [[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25], '[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25]', `
  98                -- Array, length next 1 byte
    19              -- Array, 25 items
      01            -- [0], 1
      02            -- [1], 2
      03            -- [2], 3
      04            -- [3], 4
      05            -- [4], 5
      06            -- [5], 6
      07            -- [6], 7
      08            -- [7], 8
      09            -- [8], 9
      0a            -- [9], 10
      0b            -- [10], 11
      0c            -- [11], 12
      0d            -- [12], 13
      0e            -- [13], 14
      0f            -- [14], 15
      10            -- [15], 16
      11            -- [16], 17
      12            -- [17], 18
      13            -- [18], 19
      14            -- [19], 20
      15            -- [20], 21
      16            -- [21], 22
      17            -- [22], 23
      18            -- Positive number, next 1 byte
        18          -- [23], 24
      18            -- Positive number, next 1 byte
        19          -- [24], 25
0x98190102030405060708090a0b0c0d0e0f101112131415161718181819`],
  [{}, '{}', `
  a0                -- {}
0xa0`],
  [{1: 2, 3: 4}, '{"1": 2, "3": 4}', `
  a2                -- Map, 2 pairs
    61              -- String, length: 1
      31            -- {Key:0}, "1"
    02              -- {Val:0}, 2
    61              -- String, length: 1
      33            -- {Key:1}, "3"
    04              -- {Val:1}, 4
0xa2613102613304`],
  [{'a': 1, 'b': [2, 3]}, '{"a": 1, "b": [2, 3]}', `
  a2                -- Map, 2 pairs
    61              -- String, length: 1
      61            -- {Key:0}, "a"
    01              -- {Val:0}, 1
    61              -- String, length: 1
      62            -- {Key:1}, "b"
    82              -- {Val:1}, Array, 2 items
      02            -- [0], 2
      03            -- [1], 3
0xa26161016162820203`],
  [['a', {'b': 'c'}], '["a", {"b": "c"}]', `
  82                -- Array, 2 items
    61              -- String, length: 1
      61            -- [0], "a"
    a1              -- [1], Map, 1 pair
      61            -- String, length: 1
        62          -- {Key:0}, "b"
      61            -- String, length: 1
        63          -- {Val:0}, "c"
0x826161a161626163`],
  [{'a': 'A', 'b': 'B', 'c': 'C', 'd': 'D', 'e': 'E'}, '{"a": "A", "b": "B", "c": "C", "d": "D", "e": "E"}', `
  a5                -- Map, 5 pairs
    61              -- String, length: 1
      61            -- {Key:0}, "a"
    61              -- String, length: 1
      41            -- {Val:0}, "A"
    61              -- String, length: 1
      62            -- {Key:1}, "b"
    61              -- String, length: 1
      42            -- {Val:1}, "B"
    61              -- String, length: 1
      63            -- {Key:2}, "c"
    61              -- String, length: 1
      43            -- {Val:2}, "C"
    61              -- String, length: 1
      64            -- {Key:3}, "d"
    61              -- String, length: 1
      44            -- {Val:3}, "D"
    61              -- String, length: 1
      65            -- {Key:4}, "e"
    61              -- String, length: 1
      45            -- {Val:4}, "E"
0xa56161614161626142616361436164614461656145`],
  [new Buffer('0102030405', 'hex'), 'h\'0102030405\'', `
  45                -- Bytes, length: 5
    0102030405      -- 0102030405
0x450102030405`],
  ['streaming', '"streaming"', `
  69                -- String, length: 9
    73747265616d696e67 -- "streaming"
0x6973747265616d696e67`],
  [[1, [2, 3], [4, 5]], '[1, [2, 3], [4, 5]]', `
  83                -- Array, 3 items
    01              -- [0], 1
    82              -- [1], Array, 2 items
      02            -- [0], 2
      03            -- [1], 3
    82              -- [2], Array, 2 items
      04            -- [0], 4
      05            -- [1], 5
0x8301820203820405`],
  [[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25], '[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25]', `
  98                -- Array, length next 1 byte
    19              -- Array, 25 items
      01            -- [0], 1
      02            -- [1], 2
      03            -- [2], 3
      04            -- [3], 4
      05            -- [4], 5
      06            -- [5], 6
      07            -- [6], 7
      08            -- [7], 8
      09            -- [8], 9
      0a            -- [9], 10
      0b            -- [10], 11
      0c            -- [11], 12
      0d            -- [12], 13
      0e            -- [13], 14
      0f            -- [14], 15
      10            -- [15], 16
      11            -- [16], 17
      12            -- [17], 18
      13            -- [18], 19
      14            -- [19], 20
      15            -- [20], 21
      16            -- [21], 22
      17            -- [22], 23
      18            -- Positive number, next 1 byte
        18          -- [23], 24
      18            -- Positive number, next 1 byte
        19          -- [24], 25
0x98190102030405060708090a0b0c0d0e0f101112131415161718181819`],
  [{'a': 1, 'b': [2, 3]}, '{"a": 1, "b": [2, 3]}', `
  a2                -- Map, 2 pairs
    61              -- String, length: 1
      61            -- {Key:0}, "a"
    01              -- {Val:0}, 1
    61              -- String, length: 1
      62            -- {Key:1}, "b"
    82              -- {Val:1}, Array, 2 items
      02            -- [0], 2
      03            -- [1], 3
0xa26161016162820203`],
  [['a', {'b': 'c'}], '["a", {"b": "c"}]', `
  82                -- Array, 2 items
    61              -- String, length: 1
      61            -- [0], "a"
    a1              -- [1], Map, 1 pair
      61            -- String, length: 1
        62          -- {Key:0}, "b"
      61            -- String, length: 1
        63          -- {Val:0}, "c"
0x826161a161626163`],

  // decimal
  [new BigNum(10.1), '4([-1, 101])', `
  c4                -- Tag #4
    82              -- Array, 2 items
      20            -- [0], -1
      18            -- Positive number, next 1 byte
        65          -- [1], 101
0xc482201865`],
  [new BigNum(100.1), '4([-1, 1001])', `
  c4                -- Tag #4
    82              -- Array, 2 items
      20            -- [0], -1
      19            -- Positive number, next 2 bytes
        03e9        -- [1], 1001
0xc482201903e9`],
  [new BigNum(0.1), '4([-1, 1])', `
  c4                -- Tag #4
    82              -- Array, 2 items
      20            -- [0], -1
      01            -- [1], 1
0xc4822001`],
  [new BigNum(-0.1), '4([-1, -1])', `
  c4                -- Tag #4
    82              -- Array, 2 items
      20            -- [0], -1
      20            -- [1], -1
0xc4822020`],
  [new BigNum(0), '2(h\'00\')', `
  c2                -- Tag #2
    41              -- Bytes, length: 1
      00            -- 00
0xc24100`],
  // [new BigNum(-0), "3(h'')", '0xc34100'],
  [new BigNum('18446744073709551615.1'), '4([-1, 2(h\'09fffffffffffffff7\')])', `
  c4                -- Tag #4
    82              -- Array, 2 items
      20            -- [0], -1
      c2            -- [1], Tag #2
        49          -- Bytes, length: 9
          09fffffffffffffff7 -- 09fffffffffffffff7
0xc48220c24909fffffffffffffff7`],
  [NaN, 'NaN_1', `
  f9                -- Float, next 2 bytes
    7e00            -- NaN
0xf97e00`],

  // ints
  [0xff, '255', `
  18                -- Positive number, next 1 byte
    ff              -- 255
0x18ff`],
  [256, '256', `
  19                -- Positive number, next 2 bytes
    0100            -- 256
0x190100`],
  [65535, '65535', `
  19                -- Positive number, next 2 bytes
    ffff            -- 65535
0x19ffff`],
  [65536, '65536', `
  1a                -- Positive number, next 4 bytes
    00010000        -- 65536
0x1a00010000`],
  [4294967295, '4294967295', `
  1a                -- Positive number, next 4 bytes
    ffffffff        -- 4294967295
0x1affffffff`],
  [8589934591, '8589934591', `
  1b                -- Positive number, next 8 bytes
    00000001ffffffff -- 8589934591
0x1b00000001ffffffff`],
  [9007199254740991, '9007199254740991', `
  1b                -- Positive number, next 8 bytes
    001fffffffffffff -- 9007199254740991
0x1b001fffffffffffff`],
  [9007199254740992, '9007199254740992_3', `
  fb                -- Float, next 8 bytes
    4340000000000000 -- 9007199254740992
0xfb4340000000000000`],
  [-9223372036854776000, '-9223372036854776000_3', `
  fb                -- Float, next 8 bytes
    c3e0000000000000 -- -9223372036854776000
0xfbc3e0000000000000`],
  [-2147483648, '-2147483648', `
  3a                -- Negative number, next 4 bytes
    7fffffff        -- -2147483648
0x3a7fffffff`],

  [new Date(0), '1(0)', `
  c1                -- Tag #1
    00              -- 0
0xc100`],
  [new Buffer(0), 'h\'\'', `
  40                -- Bytes, length: 0
0x40`],
  [new Buffer([0, 1, 2, 3, 4]), 'h\'0001020304\'', `
  45                -- Bytes, length: 5
    0001020304      -- 0001020304
0x450001020304`],
  [new cbor.Simple(0xff), 'simple(255)', `
  f8                -- Simple value, next 1 byte
    ff              -- simple(255)
0xf8ff`],
  [/a/, '35("a")', `
  d8                --  next 1 byte
    23              -- Tag #35
      61            -- String, length: 1
        61          -- "a"
0xd8236161`],
  [new Map([[1, 2]]), '{1: 2}', `
  a1                -- Map, 1 pair
    01              -- {Key:0}, 1
    02              -- {Val:0}, 2
0xa10102`],
  [new Map([[{b:1}, {b:1}]]), '{{"b": 1}: {"b": 1}}', `
  a1                -- Map, 1 pair
    a1              -- {Key:0}, Map, 1 pair
      61            -- String, length: 1
        62          -- {Key:0}, "b"
      01            -- {Val:0}, 1
    a1              -- {Val:0}, Map, 1 pair
      61            -- String, length: 1
        62          -- {Key:0}, "b"
      01            -- {Val:0}, 1
0xa1a1616201a1616201`],
  [new Map([[0, '0'], [1, '1'], [2, '2'], [3, '3'], [4, '4'], [5, '5'], [6, '6'], [7, '7'], [8, '8'], [9, '9'], [10, '10'], [11, '11'], [12, '12'], [13, '13'], [14, '14'], [15, '15'], [16, '16'], [17, '17'], [18, '18'], [19, '19'], [20, '20'], [21, '21'], [22, '22'], [23, '23'], [24, '24']]), '{0: "0", 1: "1", 2: "2", 3: "3", 4: "4", 5: "5", 6: "6", 7: "7", 8: "8", 9: "9", 10: "10", 11: "11", 12: "12", 13: "13", 14: "14", 15: "15", 16: "16", 17: "17", 18: "18", 19: "19", 20: "20", 21: "21", 22: "22", 23: "23", 24: "24"}', `
  b8                -- Map, count next 1 byte
    19              -- Map, 25 pairs
      00            -- {Key:0}, 0
      61            -- String, length: 1
        30          -- {Val:0}, "0"
      01            -- {Key:1}, 1
      61            -- String, length: 1
        31          -- {Val:1}, "1"
      02            -- {Key:2}, 2
      61            -- String, length: 1
        32          -- {Val:2}, "2"
      03            -- {Key:3}, 3
      61            -- String, length: 1
        33          -- {Val:3}, "3"
      04            -- {Key:4}, 4
      61            -- String, length: 1
        34          -- {Val:4}, "4"
      05            -- {Key:5}, 5
      61            -- String, length: 1
        35          -- {Val:5}, "5"
      06            -- {Key:6}, 6
      61            -- String, length: 1
        36          -- {Val:6}, "6"
      07            -- {Key:7}, 7
      61            -- String, length: 1
        37          -- {Val:7}, "7"
      08            -- {Key:8}, 8
      61            -- String, length: 1
        38          -- {Val:8}, "8"
      09            -- {Key:9}, 9
      61            -- String, length: 1
        39          -- {Val:9}, "9"
      0a            -- {Key:10}, 10
      62            -- String, length: 2
        3130        -- {Val:10}, "10"
      0b            -- {Key:11}, 11
      62            -- String, length: 2
        3131        -- {Val:11}, "11"
      0c            -- {Key:12}, 12
      62            -- String, length: 2
        3132        -- {Val:12}, "12"
      0d            -- {Key:13}, 13
      62            -- String, length: 2
        3133        -- {Val:13}, "13"
      0e            -- {Key:14}, 14
      62            -- String, length: 2
        3134        -- {Val:14}, "14"
      0f            -- {Key:15}, 15
      62            -- String, length: 2
        3135        -- {Val:15}, "15"
      10            -- {Key:16}, 16
      62            -- String, length: 2
        3136        -- {Val:16}, "16"
      11            -- {Key:17}, 17
      62            -- String, length: 2
        3137        -- {Val:17}, "17"
      12            -- {Key:18}, 18
      62            -- String, length: 2
        3138        -- {Val:18}, "18"
      13            -- {Key:19}, 19
      62            -- String, length: 2
        3139        -- {Val:19}, "19"
      14            -- {Key:20}, 20
      62            -- String, length: 2
        3230        -- {Val:20}, "20"
      15            -- {Key:21}, 21
      62            -- String, length: 2
        3231        -- {Val:21}, "21"
      16            -- {Key:22}, 22
      62            -- String, length: 2
        3232        -- {Val:22}, "22"
      17            -- {Key:23}, 23
      62            -- String, length: 2
        3233        -- {Val:23}, "23"
      18            -- Positive number, next 1 byte
        18          -- {Key:24}, 24
      62            -- String, length: 2
        3234        -- {Val:24}, "24"
0xb8190061300161310261320361330461340561350661360761370861380961390a6231300b6231310c6231320d6231330e6231340f62313510623136116231371262313813623139146232301562323116623232176232331818623234`],
  [new cbor.Tagged(256, 1), '256(1)', `
  d9                --  next 2 bytes
    0100            -- Tag #256
      01            -- 1
0xd9010001`]
]

exports.encodeGood = [
  [constants.SYMS.NULL, 'null', `
  f6                -- null
0xf6`],
  [constants.SYMS.UNDEFINED, 'undefined', `
  f7                -- undefined
0xf7`],
  [new BigNum(Infinity), 'Infinity_1', `
  f9                -- Float, next 2 bytes
    7c00            -- Infinity
0xf97c00`],
  [new BigNum(-Infinity), '-Infinity_1', `
  f9                -- Float, next 2 bytes
    fc00            -- -Infinity
0xf9fc00`],
  [new BigNum(NaN), '-NaN', `
  f9                -- Float, next 2 bytes
    7e00            -- NaN
0xf97e00`],

  [new Set([1, 2]), '[1, 2]', `
  82                -- Array, 2 items
    01              -- [0], 1
    02              -- [1], 2
0x820102`], // TODO: define a tag for Set

  // internal types
  [new NoFilter(new Buffer([1, 2, 3, 4])), 'h\'01020304\'', `
  44                -- Bytes, length: 4
    01020304        -- 01020304
0x4401020304`],
  [new TempClass('foo'), '65535("foo")', `
  d9                --  next 2 bytes
    ffff            -- Tag #65535
      63            -- String, length: 3
        666f6f      -- "foo"
0xd9ffff63666f6f`]
]

exports.decodeGood = [
  [1.5, '1.5_1', `
  f9                -- Float, next 2 bytes
    3e00            -- 1.5
0xf93e00`],
  [65504, '65504_1', `
  f9                -- Float, next 2 bytes
    7bff            -- 65504
0xf97bff`],
  [new cbor.Tagged(23, new Buffer('01020304', 'hex')), '23(h\'01020304\')', `
  d7                -- Tag #23
    44              -- Bytes, length: 4
      01020304      -- 01020304
0xd74401020304`],
  [new cbor.Tagged(24, new Buffer('6449455446', 'hex')), '24(h\'6449455446\')', `
  d8                --  next 1 byte
    18              -- Tag #24
      45            -- Bytes, length: 5
        6449455446  -- 6449455446
0xd818456449455446`],
  [0, '0_1', `
  f9                -- Float, next 2 bytes
    0000            -- 0
0xf90000`],
  [-0, '-0_1', `
  f9                -- Float, next 2 bytes
    8000            -- -0
0xf98000`],
  [1, '1_1', `
  f9                -- Float, next 2 bytes
    3c00            -- 1
0xf93c00`],
  [100000, '100000_2', `
  fa                -- Float, next 4 bytes
    47c35000        -- 100000
0xfa47c35000`],
  [5.960464477539063e-8, '5.960464477539063e-8_1', `
  f9                -- Float, next 2 bytes
    0001            -- 5.960464477539063e-8
0xf90001`],
  [new BigNum('9223372036854775807'), '9223372036854775807', `
  1b                -- Positive number, next 8 bytes
    7fffffffffffffff -- 9223372036854775807
0x1b7fffffffffffffff`],
  [new BigNum('-9223372036854775808'), '-9223372036854775808', `
  3b                -- Negative number, next 8 bytes
    7fffffffffffffff -- -9223372036854775808
0x3b7fffffffffffffff`],
  [0.00006103515625, '0.00006103515625_1', `
  f9                -- Float, next 2 bytes
    0400            -- 0.00006103515625
0xf90400`],
  [new BigNum(1.5), '5([-1, 3])', `
  c5                -- Tag #5
    82              -- Array, 2 items
      20            -- [0], -1
      03            -- [1], 3
0xc5822003`],
  [-4, '-4_1', `
  f9                -- Float, next 2 bytes
    c400            -- -4
0xf9c400`],
  [Infinity, 'Infinity_2', `
  fa                -- Float, next 4 bytes
    7f800000        -- Infinity
0xfa7f800000`],
  [-Infinity, '-Infinity_2', `
  fa                -- Float, next 4 bytes
    ff800000        -- -Infinity
0xfaff800000`],
  [Infinity, 'Infinity_3', `
  fb                -- Float, next 8 bytes
    7ff0000000000000 -- Infinity
0xfb7ff0000000000000`],
  [-Infinity, '-Infinity_3', `
  fb                -- Float, next 8 bytes
    fff0000000000000 -- -Infinity
0xfbfff0000000000000`],
  [NaN, 'NaN_2', `
  fa                -- Float, next 4 bytes
    7fc00000        -- NaN
0xfa7fc00000`],
  [NaN, 'NaN_3', `
  fb                -- Float, next 8 bytes
    7ff8000000000000 -- NaN
0xfb7ff8000000000000`],
  [new BigNum('-9007199254740992'), '-9007199254740992', `
  3b                -- Negative number, next 8 bytes
    001fffffffffffff -- -9007199254740992
0x3b001fffffffffffff`],
  [new Date('2013-03-21T20:04:00Z'), '0("2013-03-21T20:04:00Z")', `
  c0                -- Tag #0
    74              -- String, length: 20
      323031332d30332d32315432303a30343a30305a -- "2013-03-21T20:04:00Z"
0xc074323031332d30332d32315432303a30343a30305a`],
  [new Date(1363896240500), '1(1363896240.5_3)', `
  c1                -- Tag #1
    fb              -- Float, next 8 bytes
      41d452d9ec200000 -- 1363896240.5
0xc1fb41d452d9ec200000`],
  [new Buffer('0102030405', 'hex'), '(_ h\'0102\', h\'030405\')', `
  5f                -- Bytes (streaming)
    42              -- Bytes, length: 2
      0102          -- 0102
    43              -- Bytes, length: 3
      030405        -- 030405
    ff              -- BREAK
0x5f42010243030405ff`],
  ['streaming', '(_ "strea", "ming")', `
  7f                -- String (streaming)
    65              -- String, length: 5
      7374726561    -- "strea"
    64              -- String, length: 4
      6d696e67      -- "ming"
    ff              -- BREAK
0x7f657374726561646d696e67ff`],
  [[], '[_ ]', `
  9f                -- Array (streaming)
    ff              -- BREAK
0x9fff`],
  [[1, [2, 3], [4, 5]], '[_ 1, [2, 3], [_ 4, 5]]', `
  9f                -- Array (streaming)
    01              -- [0], 1
    82              -- [1], Array, 2 items
      02            -- [0], 2
      03            -- [1], 3
    9f              -- [2], Array (streaming)
      04            -- [0], 4
      05            -- [1], 5
      ff            -- BREAK
    ff              -- BREAK
0x9f018202039f0405ffff`],
  [[1, [2, 3], [4, 5]], '[_ 1, [2, 3], [4, 5]]', `
  9f                -- Array (streaming)
    01              -- [0], 1
    82              -- [1], Array, 2 items
      02            -- [0], 2
      03            -- [1], 3
    82              -- [2], Array, 2 items
      04            -- [0], 4
      05            -- [1], 5
    ff              -- BREAK
0x9f01820203820405ff`],
  [[1, [2, 3], [4, 5]], '[1, [2, 3], [_ 4, 5]]', `
  83                -- Array, 3 items
    01              -- [0], 1
    82              -- [1], Array, 2 items
      02            -- [0], 2
      03            -- [1], 3
    9f              -- [2], Array (streaming)
      04            -- [0], 4
      05            -- [1], 5
      ff            -- BREAK
0x83018202039f0405ff`],
  [[1, [2, 3], [4, 5]], '[1, [_ 2, 3], [4, 5]]', `
  83                -- Array, 3 items
    01              -- [0], 1
    9f              -- [1], Array (streaming)
      02            -- [0], 2
      03            -- [1], 3
      ff            -- BREAK
    82              -- [2], Array, 2 items
      04            -- [0], 4
      05            -- [1], 5
0x83019f0203ff820405`],
  [[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25], '[_ 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25]', `
  9f                -- Array (streaming)
    01              -- [0], 1
    02              -- [1], 2
    03              -- [2], 3
    04              -- [3], 4
    05              -- [4], 5
    06              -- [5], 6
    07              -- [6], 7
    08              -- [7], 8
    09              -- [8], 9
    0a              -- [9], 10
    0b              -- [10], 11
    0c              -- [11], 12
    0d              -- [12], 13
    0e              -- [13], 14
    0f              -- [14], 15
    10              -- [15], 16
    11              -- [16], 17
    12              -- [17], 18
    13              -- [18], 19
    14              -- [19], 20
    15              -- [20], 21
    16              -- [21], 22
    17              -- [22], 23
    18              -- Positive number, next 1 byte
      18            -- [23], 24
    18              -- Positive number, next 1 byte
      19            -- [24], 25
    ff              -- BREAK
0x9f0102030405060708090a0b0c0d0e0f101112131415161718181819ff`],
  [{'a': 1, 'b': [2, 3]}, '{_ "a": 1, "b": [_ 2, 3]}', `
  bf                -- Map (streaming)
    61              -- String, length: 1
      61            -- {Key:0}, "a"
    01              -- {Val:0}, 1
    61              -- String, length: 1
      62            -- {Key:1}, "b"
    9f              -- {Val:1}, Array (streaming)
      02            -- [0], 2
      03            -- [1], 3
      ff            -- BREAK
    ff              -- BREAK
0xbf61610161629f0203ffff`],
  [['a', {b: 'c'}], '["a", {_ "b": "c"}]', `
  82                -- Array, 2 items
    61              -- String, length: 1
      61            -- [0], "a"
    bf              -- [1], Map (streaming)
      61            -- String, length: 1
        62          -- {Key:0}, "b"
      61            -- String, length: 1
        63          -- {Val:0}, "c"
      ff            -- BREAK
0x826161bf61626163ff`],
  [new cbor.Tagged(64, new cbor.Tagged(64, [])), '64(64([_ ]))', `
  d8                --  next 1 byte
    40              -- Tag #64
      d8            --  next 1 byte
        40          -- Tag #64
          9f        -- Array (streaming)
            ff      -- BREAK
0xd840d8409fff`],
  [new cbor.Tagged(64, new Buffer('aabbccddeeff99', 'hex')), '64((_ h\'aabbccdd\', h\'eeff99\'))', `
  d8                --  next 1 byte
    40              -- Tag #64
      5f            -- Bytes (streaming)
        44          -- Bytes, length: 4
          aabbccdd  -- aabbccdd
        43          -- Bytes, length: 3
          eeff99    -- eeff99
        ff          -- BREAK
0xd8405f44aabbccdd43eeff99ff`]
]

exports.decodeBad = [
  '0x18', // missing the next byte for AI
  '0x1c', // invalid AI
  '0x1d', // invalid AI
  '0x1e', // invalid AI
  '0x44010203', // only 3 bytes, not 4, bytestring
  '0x5f', // indeterminate bytestring with nothing
  '0x5f01ff', // indeterminite bytestring includes a non-string chunk
  '0x64494554', // only 3 bytes, not 4, utf8
  '0x7432303133', // string length 20 only has 4 bytes
  '0x7f01ff', // indeterminite string includes a non-string chunk
  '0x7f657374726561646d696e', // no BREAK
  '0x81', // no items in array, expected 1
  '0x8181818181', // nested arrays with no end
  '0x81FE', // Array containaing invalid
  '0x8201', // 1 item in array, expected 2
  '0x9f', // indeterminate array without end
  '0x9f01', // indeterminate array without end
  '0x9fFEff', // streamed array containing invalid
  '0xa16161', // map without value
  '0xa1FE01', // Map containing invalid
  '0xa20102', // only 1 pair, not 2, map
  '0xa3', // no pairs
  '0xbf', // indeterminate map without end
  '0xbf000103ff', // streaming map with odd number of items
  '0xbf6161', // indeterminate map without end
  '0xbf616101', // indeterminate map without end
  '0xbfFE01ff', // streamed map containing invalid
  '0xfc', // reserved AI
  '0xfd', // reserved AI
  '0xfe' // reserved AI
]

const HEX = /0x([0-9a-f]+)$/i
exports.toBuffer = function toBuffer(c) {
  if (Array.isArray(c)) {
    c = c[2]
  }
  const match = c.match(HEX)
  return new Buffer(match[1], 'hex')
}

exports.toString = function toString(c) {
  if (Array.isArray(c)) {
    c = c[2]
  }
  const match = c.match(HEX)
  return match[1]
}

class EncodeFailer extends cbor.Encoder {
  constructor(count) {
    super()
    if (count == null) {
      count = Number.MAX_SAFE_INTEGER
    }
    this.count = count
    this.start = count
  }
  push(fresh, encoding) {
    if (this.count-- <= 0) {
      super.push(null)
      return false
    }
    return super.push(fresh, encoding)
  }
  get used() {
    return this.start - this.count
  }
  static tryAll(t, f, canonical) {
    let enc = new EncodeFailer()
    enc.canonical = canonical
    t.truthy(enc.pushAny(f))
    const used = enc.used
    for (let i = 0; i < used; i++) {
      enc = new EncodeFailer(i)
      enc.canonical = canonical
      t.falsy(enc.pushAny(f))
    }
    enc = new EncodeFailer(used)
    enc.canonical = canonical
    t.truthy(enc.pushAny(f))
  }
}
exports.EncodeFailer = EncodeFailer

// Here to avoid ava's odd injection of Map into the namespace of the tests
exports.goodMap = new Map([
  ['0', 'foo'],
  [0, 'bar'],
  [{}, 'empty obj'],
  [[], 'empty array'],
  [null, 'null'],
  [[1], 'array'],
  [{1: 2}, 'obj'],
  ['a', 1],
  ['aaa', 3],
  ['aa', 2],
  ['bb', 2],
  ['b', 1],
  ['bbb', 3]
])

exports.canonNums = [
  [-1.25, 'f9bd00'],
  [1.5, 'f93e00'],
  [10.1, 'fb4024333333333333'],
  [5.960464477539063e-8, 'f90001'],
  [3.4028234663852886e+38, 'fa7f7fffff'],
  [0.00006103515625, 'f90400'],
  [0.2498779296875, 'f933ff'],
  [2.9802322387695312e-8, 'fa33000000'],
  [4.1727979294137185e-8, 'fa33333866'],
  [0.000007636845111846924, 'fa37002000'],

  [Infinity, 'f97c00'],
  [-Infinity, 'f9fc00'],
  [NaN, 'f97e00'],
  [0, '00'],
  [-0, '00']
]
