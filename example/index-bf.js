(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
'use strict'

exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

// Support decoding URL-safe base64 strings, as Node.js does.
// See: https://en.wikipedia.org/wiki/Base64#URL_applications
revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function getLens (b64) {
  var len = b64.length

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // Trim off extra bytes after placeholder bytes are found
  // See: https://github.com/beatgammit/base64-js/issues/42
  var validLen = b64.indexOf('=')
  if (validLen === -1) validLen = len

  var placeHoldersLen = validLen === len
    ? 0
    : 4 - (validLen % 4)

  return [validLen, placeHoldersLen]
}

// base64 is 4/3 + up to two characters of the original data
function byteLength (b64) {
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function _byteLength (b64, validLen, placeHoldersLen) {
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function toByteArray (b64) {
  var tmp
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]

  var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen))

  var curByte = 0

  // if there are placeholders, only get up to the last complete 4 chars
  var len = placeHoldersLen > 0
    ? validLen - 4
    : validLen

  var i
  for (i = 0; i < len; i += 4) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 18) |
      (revLookup[b64.charCodeAt(i + 1)] << 12) |
      (revLookup[b64.charCodeAt(i + 2)] << 6) |
      revLookup[b64.charCodeAt(i + 3)]
    arr[curByte++] = (tmp >> 16) & 0xFF
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 2) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 2) |
      (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 1) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 10) |
      (revLookup[b64.charCodeAt(i + 1)] << 4) |
      (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] +
    lookup[num >> 12 & 0x3F] +
    lookup[num >> 6 & 0x3F] +
    lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp =
      ((uint8[i] << 16) & 0xFF0000) +
      ((uint8[i + 1] << 8) & 0xFF00) +
      (uint8[i + 2] & 0xFF)
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    parts.push(
      lookup[tmp >> 2] +
      lookup[(tmp << 4) & 0x3F] +
      '=='
    )
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + uint8[len - 1]
    parts.push(
      lookup[tmp >> 10] +
      lookup[(tmp >> 4) & 0x3F] +
      lookup[(tmp << 2) & 0x3F] +
      '='
    )
  }

  return parts.join('')
}

},{}],2:[function(require,module,exports){
(function() {
/*
 *      bignumber.js v10.0.1
 *      A JavaScript library for arbitrary-precision arithmetic.
 *      https://github.com/MikeMcl/bignumber.js
 *      Copyright (c) 2026 Michael Mclaughlin <M8ch88l@gmail.com>
 *      MIT Licensed.
 *
 *      BigNumber.prototype methods     |  BigNumber methods
 *                                      |
 *      absoluteValue            abs    |  clone
 *      comparedTo                      |  config               set
 *      decimalPlaces            dp     |      DECIMAL_PLACES
 *      dividedBy                div    |      ROUNDING_MODE
 *      dividedToIntegerBy       idiv   |      EXPONENTIAL_AT
 *      exponentiatedBy          pow    |      RANGE
 *      integerValue                    |      CRYPTO
 *      isEqualTo                eq     |      MODULO_MODE
 *      isFinite                        |      POW_PRECISION
 *      isGreaterThan            gt     |      FORMAT
 *      isGreaterThanOrEqualTo   gte    |      ALPHABET
 *      isInteger                       |  isBigNumber
 *      isLessThan               lt     |  maximum              max
 *      isLessThanOrEqualTo      lte    |  minimum              min
 *      isNaN                           |  random
 *      isNegative                      |  sum
 *      isPositive                      |
 *      isZero                          |
 *      minus                           |
 *      modulo                   mod    |
 *      multipliedBy             times  |
 *      negated                         |
 *      plus                            |
 *      precision                sd     |
 *      shiftedBy                       |
 *      squareRoot               sqrt   |
 *      toExponential                   |
 *      toFixed                         |
 *      toFormat                        |
 *      toFraction                      |
 *      toJSON                          |
 *      toNumber                        |
 *      toObject                        |
 *      toPrecision                     |
 *      toString                        |
 *      valueOf                         |
 *
 */


var
  BigNumber = clone(),
  isNumeric = /^-?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i,
  mathceil = Math.ceil,
  mathfloor = Math.floor,

  bignumberError = '[BigNumber Error] ',

  BASE = 1e14,
  LOG_BASE = 14,
  MAX_SAFE_INTEGER = 0x1fffffffffffff,         // 2^53 - 1
  // MAX_INT32 = 0x7fffffff,                   // 2^31 - 1
  POWS_TEN = [1, 10, 100, 1e3, 1e4, 1e5, 1e6, 1e7, 1e8, 1e9, 1e10, 1e11, 1e12, 1e13],
  SQRT_BASE = 1e7,

  // EDITABLE
  // The limit on the value of DECIMAL_PLACES, TO_EXP_NEG, TO_EXP_POS, MIN_EXP, MAX_EXP, and
  // the arguments to toExponential, toFixed, toFormat, and toPrecision.
  MAX = 1E9;                                   // 0 to MAX_INT32


/*
 * Create and return a BigNumber constructor.
 */
function clone(configObject) {
  var div, convertBase, parseUnusualNumeric,
    P = BigNumber.prototype = { constructor: BigNumber, toString: null, valueOf: null },
    ONE = new BigNumber(1),


    //----------------------------- EDITABLE CONFIG DEFAULTS -------------------------------


    // The default values below must be integers within the inclusive ranges stated.
    // The values can also be changed at run-time using BigNumber.set.

    // The maximum number of decimal places for operations involving division.
    DECIMAL_PLACES = 20,                     // 0 to MAX

    // The rounding mode used when rounding to the above decimal places, and when using
    // toExponential, toFixed, toFormat and toPrecision, and round (default value).
    // UP         0 Away from zero.
    // DOWN       1 Towards zero.
    // CEIL       2 Towards +Infinity.
    // FLOOR      3 Towards -Infinity.
    // HALF_UP    4 Towards nearest neighbour. If equidistant, up.
    // HALF_DOWN  5 Towards nearest neighbour. If equidistant, down.
    // HALF_EVEN  6 Towards nearest neighbour. If equidistant, towards even neighbour.
    // HALF_CEIL  7 Towards nearest neighbour. If equidistant, towards +Infinity.
    // HALF_FLOOR 8 Towards nearest neighbour. If equidistant, towards -Infinity.
    ROUNDING_MODE = 4,                       // 0 to 8

    // EXPONENTIAL_AT : [TO_EXP_NEG , TO_EXP_POS]

    // The exponent value at and beneath which toString returns exponential notation.
    // Number type: -7
    TO_EXP_NEG = -7,                         // 0 to -MAX

    // The exponent value at and above which toString returns exponential notation.
    // Number type: 21
    TO_EXP_POS = 21,                         // 0 to MAX

    // RANGE : [MIN_EXP, MAX_EXP]

    // The minimum exponent value, beneath which underflow to zero occurs.
    // Number type: -324  (5e-324)
    MIN_EXP = -1e7,                          // -1 to -MAX

    // The maximum exponent value, above which overflow to Infinity occurs.
    // Number type:  308  (1.7976931348623157e+308)
    // For MAX_EXP > 1e7, e.g. new BigNumber('1e100000000').plus(1) may be slow.
    MAX_EXP = 1e7,                           // 1 to MAX

    // Whether to use cryptographically-secure random number generation, if available.
    CRYPTO = false,                          // true or false

    // The modulo mode used when calculating the modulus: a mod n.
    // The quotient (q = a / n) is calculated according to the corresponding rounding mode.
    // The remainder (r) is calculated as: r = a - n * q.
    //
    // UP        0 The remainder is positive if the dividend is negative, else is negative.
    // DOWN      1 The remainder has the same sign as the dividend.
    //             This modulo mode is commonly known as 'truncated division' and is
    //             equivalent to (a % n) in JavaScript.
    // FLOOR     3 The remainder has the same sign as the divisor (Python %).
    // HALF_EVEN 6 This modulo mode implements the IEEE 754 remainder function.
    // EUCLID    9 Euclidian division. q = sign(n) * floor(a / abs(n)).
    //             The remainder is always positive.
    //
    // The truncated division, floored division, Euclidian division and IEEE 754 remainder
    // modes are commonly used for the modulus operation.
    // Although the other rounding modes can also be used, they may not give useful results.
    MODULO_MODE = 1,                         // 0 to 9

    // The maximum number of significant digits of the result of the exponentiatedBy operation.
    // If POW_PRECISION is 0, there will be unlimited significant digits.
    POW_PRECISION = 0,                       // 0 to MAX

    // The format specification used by the BigNumber.prototype.toFormat method.
    FORMAT = {
      prefix: '',
      groupSize: 3,
      secondaryGroupSize: 0,
      groupSeparator: ',',
      decimalSeparator: '.',
      fractionGroupSize: 0,
      fractionGroupSeparator: '\xA0',        // non-breaking space
      suffix: ''
    },

    // The alphabet used for base conversion.
    // It must be at least two characters long and have no '+', '-', '.', whitespace, or repeated
    // character.
    // '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ$_'
    ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';


  //------------------------------------------------------------------------------------------


  // CONSTRUCTOR


  /*
   * The BigNumber constructor and exported function.
   * Create and return a new instance of a BigNumber object.
   *
   * v {number|string|BigNumber} A numeric value.
   * [b] {number} The base of v. Integer, 2 to ALPHABET.length inclusive.
   */
  function BigNumber(v, b) {
    var alphabet, c, caseChanged, e, i, len, str, t,
      x = this;

    // Enable constructor call without `new`.
    if (!(x instanceof BigNumber)) return new BigNumber(v, b);

    t = typeof v;

    if (b == null) {

      if (isBigNumber(v)) {
        x.s = v.s;
        
        if (!v.c || v.e > MAX_EXP) {
          x.c = x.e = null;
        } else if (v.e < MIN_EXP) {
          x.c = [x.e = 0];
        } else {
          x.e = v.e;
          x.c = v.c.slice();
        }
         
        return;
      }
      
      if (t == 'number') {

         // Handle ±Infinity and NaN.
        if (v * 0 != 0) {
          x.s = isNaN(v) ? null : v < 0 ? -1 : 1;
          x.c = x.e = null;
          return;
        }

        // Use `1 / v` to handle minus zero also.
        x.s = 1 / v < 0 ? (v = -v, -1) : 1;

        // Fast path for integers, where v < 2147483648 (2**31).
        if (v === ~~v) {
          for (e = 0, i = v; i >= 10; i /= 10, e++);

          if (e > MAX_EXP) {
            x.c = x.e = null;
          } else {
            x.e = e;
            x.c = [v];
          }

          return;
        }

        str = String(v);
      } else {
        if (t == 'string') { 
          str = v;
          if (!isNumeric.test(str)) {
            return parseUnusualNumeric(x, str);
          }
        } else if (t == 'bigint') {
          str = String(v);
        } else {
          throw Error
            (bignumberError + 'Invalid argument: ' + v);
        }
       
        x.s = str.charCodeAt(0) == 45 ? (str = str.slice(1), -1) : 1;
      } 

      // Decimal point?
      if ((e = str.indexOf('.')) > -1) str = str.replace('.', '');

      // Exponential form?
      if ((i = str.search(/e/i)) > 0) {

        // Determine exponent.
        if (e < 0) e = i;
        e += +str.slice(i + 1);
        str = str.substring(0, i);
      } else if (e < 0) {

        // Integer.
        e = str.length;
      }

    // Base specified.
    } else {  

      // '[BigNumber Error] String expected: {v}'
      if (t != 'string') {
        throw Error
          (bignumberError + 'String expected: ' + v);
      }

      // '[BigNumber Error] Base {not a primitive number|not an integer|out of range}: {b}'
      intCheck(b, 2, ALPHABET.length, 'Base');  
        
      str = v;
      x.s = str.charCodeAt(0) === 45 ? (str = str.slice(1), -1) : 1;
      alphabet = ALPHABET.slice(0, b);
      e = i = 0;

      // Check that str is a valid base b number.
      // Don't use RegExp, so alphabet can contain special characters.
      for (len = str.length; i < len; i++) {
        if (alphabet.indexOf(c = str.charAt(i)) < 0) {
          if (c == '.') {

            // If '.' is not the first character and it has not be found before.
            if (i > e) {
              e = len;
              continue;
            }
          } else if (!caseChanged) {

            // Allow e.g. hexadecimal 'FF' as well as 'ff'.
            if (str == str.toUpperCase() && (str = str.toLowerCase()) ||
                str == str.toLowerCase() && (str = str.toUpperCase())) {
              caseChanged = true;
              i = -1;
              e = 0;
              continue;
            }
          }

          return parseUnusualNumeric(x, v, b);
        }
      }  

      str = convertBase(str, b, 10, x.s);

      // Decimal point?
      if ((e = str.indexOf('.')) > -1) str = str.replace('.', '');
      else e = str.length;
    }

    // Determine leading zeros.
    for (i = 0; str.charCodeAt(i) === 48; i++);

    // Determine trailing zeros.
    for (len = str.length; str.charCodeAt(--len) === 48;);

    if (str = str.slice(i, ++len)) {
      len -= i;
      e = e - i - 1;

      // Overflow?
      if (e > MAX_EXP) {

        // Infinity.
        x.c = x.e = null;

      // Underflow?
      } else if (e < MIN_EXP) {

        // Zero.
        x.c = [x.e = 0];
      } else {
        x.e = e;
        x.c = [];

        // Transform base

        // e is the base 10 exponent.
        // i is where to slice str to get the first element of the coefficient array.
        i = (e + 1) % LOG_BASE;
        if (e < 0) i += LOG_BASE;  // i < 1

        if (i < len) {
          if (i) x.c.push(+str.slice(0, i));

          for (len -= LOG_BASE; i < len;) {
            x.c.push(+str.slice(i, i += LOG_BASE));
          }

          i = LOG_BASE - (str = str.slice(i)).length;
        } else {
          i -= len;
        }

        for (; i--; str += '0');
        x.c.push(+str);
      }
    } else {

      // Zero.
      x.c = [x.e = 0];
    }
  }


  // CONSTRUCTOR PROPERTIES


  BigNumber.clone = clone;

  BigNumber.ROUND_UP = 0;
  BigNumber.ROUND_DOWN = 1;
  BigNumber.ROUND_CEIL = 2;
  BigNumber.ROUND_FLOOR = 3;
  BigNumber.ROUND_HALF_UP = 4;
  BigNumber.ROUND_HALF_DOWN = 5;
  BigNumber.ROUND_HALF_EVEN = 6;
  BigNumber.ROUND_HALF_CEIL = 7;
  BigNumber.ROUND_HALF_FLOOR = 8;
  BigNumber.EUCLID = 9;


  /*
   * Configure infrequently-changing library-wide settings.
   *
   * Accept an object with the following optional properties (if the value of a property is
   * a number, it must be an integer within the inclusive range stated):
   *
   *   DECIMAL_PLACES   {number}           0 to MAX
   *   ROUNDING_MODE    {number}           0 to 8
   *   EXPONENTIAL_AT   {number|number[]}  -MAX to MAX  or  [-MAX to 0, 0 to MAX]
   *   RANGE            {number|number[]}  -MAX to MAX (not zero)  or  [-MAX to -1, 1 to MAX]
   *   CRYPTO           {boolean}          true or false
   *   MODULO_MODE      {number}           0 to 9
   *   POW_PRECISION       {number}           0 to MAX
   *   ALPHABET         {string}           A string of unique characters which does not contain
   *                                       '+', '-', '.', or whitespace, and starts with '0123456789'.
   *   FORMAT           {object}           An object with some of the following properties:
   *     prefix                 {string}
   *     groupSize              {number}
   *     secondaryGroupSize     {number}
   *     groupSeparator         {string}
   *     decimalSeparator       {string}
   *     fractionGroupSize      {number}
   *     fractionGroupSeparator {string}
   *     suffix                 {string}
   *
   * (The values assigned to the above FORMAT object properties are not checked for validity.)
   *
   * E.g.
   * BigNumber.config({ DECIMAL_PLACES : 20, ROUNDING_MODE : 4 })
   *
   * Ignore properties/parameters set to null or undefined, except for ALPHABET.
   *
   * Return an object with the properties current values.
   */
  BigNumber.config = BigNumber.set = function (obj) {
    var p, v;

    if (obj != null) {

      if (typeof obj == 'object') {

        // DECIMAL_PLACES {number} Integer, 0 to MAX inclusive.
        // '[BigNumber Error] DECIMAL_PLACES {not a primitive number|not an integer|out of range}: {v}'
        if (obj.hasOwnProperty(p = 'DECIMAL_PLACES')) {
          v = obj[p];
          intCheck(v, 0, MAX, p);
          DECIMAL_PLACES = v;
        }

        // ROUNDING_MODE {number} Integer, 0 to 8 inclusive.
        // '[BigNumber Error] ROUNDING_MODE {not a primitive number|not an integer|out of range}: {v}'
        if (obj.hasOwnProperty(p = 'ROUNDING_MODE')) {
          v = obj[p];
          intCheck(v, 0, 8, p);
          ROUNDING_MODE = v;
        }

        // EXPONENTIAL_AT {number|number[]}
        // Integer, -MAX to MAX inclusive or
        // [integer -MAX to 0 inclusive, 0 to MAX inclusive].
        // '[BigNumber Error] EXPONENTIAL_AT {not a primitive number|not an integer|out of range}: {v}'
        if (obj.hasOwnProperty(p = 'EXPONENTIAL_AT')) {
          v = obj[p];
          if (v && v.pop) {
            intCheck(v[0], -MAX, 0, p);
            intCheck(v[1], 0, MAX, p);
            TO_EXP_NEG = v[0];
            TO_EXP_POS = v[1];
          } else {
            intCheck(v, -MAX, MAX, p);
            TO_EXP_NEG = -(TO_EXP_POS = v < 0 ? -v : v);
          }
        }

        // RANGE {number|number[]} Non-zero integer, -MAX to MAX inclusive or
        // [integer -MAX to -1 inclusive, integer 1 to MAX inclusive].
        // '[BigNumber Error] RANGE {not a primitive number|not an integer|out of range|cannot be zero}: {v}'
        if (obj.hasOwnProperty(p = 'RANGE')) {
          v = obj[p];
          if (v && v.pop) {
            intCheck(v[0], -MAX, -1, p);
            intCheck(v[1], 1, MAX, p);
            MIN_EXP = v[0];
            MAX_EXP = v[1];
          } else {
            intCheck(v, -MAX, MAX, p);
            if (v) {
              MIN_EXP = -(MAX_EXP = v < 0 ? -v : v);
            } else {
              throw Error
               (bignumberError + p + ' cannot be zero: ' + v);
            }
          }
        }

        // CRYPTO {boolean} true or false.
        // '[BigNumber Error] CRYPTO not true or false: {v}'
        // '[BigNumber Error] crypto unavailable'
        if (obj.hasOwnProperty(p = 'CRYPTO')) {
          v = obj[p];
          if (v === !!v) {
            if (v) {
              if (typeof crypto != 'undefined' && crypto &&
               (crypto.getRandomValues || crypto.randomBytes)) {
                CRYPTO = v;
              } else {
                CRYPTO = !v;
                throw Error
                 (bignumberError + 'crypto unavailable');
              }
            } else {
              CRYPTO = v;
            }
          } else {
            throw Error
             (bignumberError + p + ' not true or false: ' + v);
          }
        }

        // MODULO_MODE {number} Integer, 0 to 9 inclusive.
        // '[BigNumber Error] MODULO_MODE {not a primitive number|not an integer|out of range}: {v}'
        if (obj.hasOwnProperty(p = 'MODULO_MODE')) {
          v = obj[p];
          intCheck(v, 0, 9, p);
          MODULO_MODE = v;
        }

        // POW_PRECISION {number} Integer, 0 to MAX inclusive.
        // '[BigNumber Error] POW_PRECISION {not a primitive number|not an integer|out of range}: {v}'
        if (obj.hasOwnProperty(p = 'POW_PRECISION')) {
          v = obj[p];
          intCheck(v, 0, MAX, p);
          POW_PRECISION = v;
        }

        // FORMAT {object}
        // '[BigNumber Error] FORMAT not an object: {v}'
        if (obj.hasOwnProperty(p = 'FORMAT')) {
          v = obj[p];
          if (typeof v == 'object') FORMAT = v;
          else throw Error
           (bignumberError + p + ' not an object: ' + v);
        }

        // ALPHABET {string}
        // '[BigNumber Error] ALPHABET invalid: {v}'
        if (obj.hasOwnProperty(p = 'ALPHABET')) {
          v = obj[p];

          // Disallow if the alphabet is not at least two characters long,
          // or contains '+', '-', '.', whitespace, or a repeated character.
          if (typeof v == 'string' && !/^.?$|[+\-.\s]|(.).*\1/.test(v)) {
            ALPHABET = v;
          } else {
            throw Error
             (bignumberError + p + ' invalid: ' + v);
          }
        }

      } else {

        // '[BigNumber Error] Object expected: {v}'
        throw Error
         (bignumberError + 'Object expected: ' + obj);
      }
    }

    return {
      DECIMAL_PLACES: DECIMAL_PLACES,
      ROUNDING_MODE: ROUNDING_MODE,
      EXPONENTIAL_AT: [TO_EXP_NEG, TO_EXP_POS],
      RANGE: [MIN_EXP, MAX_EXP],
      CRYPTO: CRYPTO,
      MODULO_MODE: MODULO_MODE,
      POW_PRECISION: POW_PRECISION,
      FORMAT: FORMAT,
      ALPHABET: ALPHABET
    };
  };


  /*
   * Return true if v appears to be a BigNumber instance that has a valid coefficient (c),
   * exponent (e), and sign (s), otherwise return false.
   *
   * v {any}
   */
  BigNumber.isBigNumber = function (v) {
    if (!isBigNumber(v)) return false;
    var i, n,
      c = v.c,
      e = v.e,
      s = v.s;
        
    if ({}.toString.call(c) != '[object Array]') {
    
      // ±Infinity and NaN
      return c === null && e === null && (s === null || s === 1 || s === -1)
    }  
     
    // Check sign and check that exponent is an integer within the allowed range.
    if ((s !== 1 && s !== -1) || e < -MAX || e > MAX || e !== mathfloor(e)) {
      return false;
    }
    
    // If the first element is zero, the BigNumber value must be zero.
    if (c[0] === 0) {
      return e === 0 && c.length === 1;
    }
           
    // Calculate number of digits that c[0] should have, based on the exponent.
    i = (e + 1) % LOG_BASE;
    if (i < 1) i += LOG_BASE;
            
    // Calculate number of digits of c[0].
    //if (Math.ceil(Math.log(c[0] + 1) / Math.LN10) !== i) {
    if (String(c[0]).length !== i) {
      return false;
    }
          
    for (i = 0; i < c.length; i++) {
      n = c[i];
      if (n < 0 || n >= BASE || n !== mathfloor(n)) return false;
    }
             
    // Last element cannot be zero, unless it is the only element.
    return n !== 0;
  };


  /*
   * Return a new BigNumber whose value is the maximum of the arguments.
   *
   * arguments {number|string|BigNumber}
   */
  BigNumber.maximum = BigNumber.max = function () {
    return maxOrMin(arguments, -1);
  };


  /*
   * Return a new BigNumber whose value is the minimum of the arguments.
   *
   * arguments {number|string|BigNumber}
   */
  BigNumber.minimum = BigNumber.min = function () {
    return maxOrMin(arguments, 1);
  };


  /*
   * Return a new BigNumber with a random value equal to or greater than 0 and less than 1,
   * and with dp, or DECIMAL_PLACES if dp is omitted, decimal places (or less if trailing
   * zeros are produced).
   *
   * [dp] {number} Decimal places. Integer, 0 to MAX inclusive.
   *
   * '[BigNumber Error] Argument {not a primitive number|not an integer|out of range}: {dp}'
   * '[BigNumber Error] crypto unavailable'
   */
  BigNumber.random = (function () {
    var pow2_53 = 0x20000000000000;

    // Return a 53 bit integer n, where 0 <= n < 9007199254740992.
    // Check if Math.random() produces more than 32 bits of randomness.
    // If it does, assume at least 53 bits are produced, otherwise assume at least 30 bits.
    // 0x40000000 is 2^30, 0x800000 is 2^23, 0x1fffff is 2^21 - 1.
    var random53bitInt = (Math.random() * pow2_53) & 0x1fffff
     ? function () { return mathfloor(Math.random() * pow2_53); }
     : function () { return ((Math.random() * 0x40000000 | 0) * 0x800000) +
       (Math.random() * 0x800000 | 0); };

    return function (dp) {
      var a, b, e, k, v,
        i = 0,
        c = [],
        rand = new BigNumber(ONE);

      if (dp == null) dp = DECIMAL_PLACES;
      else intCheck(dp, 0, MAX);

      k = mathceil(dp / LOG_BASE);

      if (CRYPTO) {

        // Browsers supporting crypto.getRandomValues.
        if (crypto.getRandomValues) {

          a = crypto.getRandomValues(new Uint32Array(k *= 2));

          for (; i < k;) {

            // 53 bits:
            // ((Math.pow(2, 32) - 1) * Math.pow(2, 21)).toString(2)
            // 11111 11111111 11111111 11111111 11100000 00000000 00000000
            // ((Math.pow(2, 32) - 1) >>> 11).toString(2)
            //                                     11111 11111111 11111111
            // 0x20000 is 2^21.
            v = a[i] * 0x20000 + (a[i + 1] >>> 11);

            // Rejection sampling:
            // 0 <= v < 9007199254740992
            // Probability that v >= 9e15, is
            // 7199254740992 / 9007199254740992 ~= 0.0008, i.e. 1 in 1251
            if (v >= 9e15) {
              b = crypto.getRandomValues(new Uint32Array(2));
              a[i] = b[0];
              a[i + 1] = b[1];
            } else {

              // 0 <= v <= 8999999999999999
              // 0 <= (v % 1e14) <= 99999999999999
              c.push(v % 1e14);
              i += 2;
            }
          }
          i = k / 2;

        // Node.js supporting crypto.randomBytes.
        } else if (crypto.randomBytes) {

          // buffer
          a = crypto.randomBytes(k *= 7);

          for (; i < k;) {

            // 0x1000000000000 is 2^48, 0x10000000000 is 2^40
            // 0x100000000 is 2^32, 0x1000000 is 2^24
            // 11111 11111111 11111111 11111111 11111111 11111111 11111111
            // 0 <= v < 9007199254740992
            v = ((a[i] & 31) * 0x1000000000000) + (a[i + 1] * 0x10000000000) +
               (a[i + 2] * 0x100000000) + (a[i + 3] * 0x1000000) +
               (a[i + 4] << 16) + (a[i + 5] << 8) + a[i + 6];

            if (v >= 9e15) {
              crypto.randomBytes(7).copy(a, i);
            } else {

              // 0 <= (v % 1e14) <= 99999999999999
              c.push(v % 1e14);
              i += 7;
            }
          }
          i = k / 7;
        } else {
          CRYPTO = false;
          throw Error
           (bignumberError + 'crypto unavailable');
        }
      }

      // Use Math.random.
      if (!CRYPTO) {

        for (; i < k;) {
          v = random53bitInt();
          if (v < 9e15) c[i++] = v % 1e14;
        }
      }

      k = c[--i];
      dp %= LOG_BASE;

      // Convert trailing digits to zeros according to dp.
      if (k && dp) {
        v = POWS_TEN[LOG_BASE - dp];
        c[i] = mathfloor(k / v) * v;
      }

      // Remove trailing elements which are zero.
      for (; c[i] === 0; c.pop(), i--);

      // Zero?
      if (i < 0) {
        c = [e = 0];
      } else {

        // Remove leading elements which are zero and adjust exponent accordingly.
        for (e = -1 ; c[0] === 0; c.splice(0, 1), e -= LOG_BASE);

        // Count the digits of the first element of c to determine leading zeros, and...
        for (i = 1, v = c[0]; v >= 10; v /= 10, i++);

        // adjust the exponent accordingly.
        if (i < LOG_BASE) e -= LOG_BASE - i;
      }

      rand.e = e;
      rand.c = c;
      return rand;
    };
  })();


  /*
   * Return a BigNumber whose value is the sum of the arguments.
   *
   * arguments {number|string|BigNumber}
   */
  BigNumber.sum = function () {
    var i = 1,
      args = arguments,
      sum = new BigNumber(args[0]);
    for (; i < args.length;) sum = sum.plus(args[i++]);
    return sum;
  };


  // PRIVATE FUNCTIONS


  // Called by BigNumber and BigNumber.prototype.toString.
  convertBase = (function () {
    var decimal = '0123456789';

    /*
     * Convert string of baseIn to an array of numbers of baseOut.
     * Eg. toBaseOut('255', 10, 16) returns [15, 15].
     * Eg. toBaseOut('ff', 16, 10) returns [2, 5, 5].
     */
    function toBaseOut(str, baseIn, baseOut, alphabet) {
      var j,
        arr = [0],
        arrL,
        i = 0,
        len = str.length;

      for (; i < len;) {
        for (arrL = arr.length; arrL--; arr[arrL] *= baseIn);

        arr[0] += alphabet.indexOf(str.charAt(i++));

        for (j = 0; j < arr.length; j++) {

          if (arr[j] > baseOut - 1) {
            if (arr[j + 1] == null) arr[j + 1] = 0;
            arr[j + 1] += arr[j] / baseOut | 0;
            arr[j] %= baseOut;
          }
        }
      }

      return arr.reverse();
    }

    // Convert a numeric string of baseIn to a numeric string of baseOut.
    // If the caller is toString, we are converting from base 10 to baseOut.
    // If the caller is BigNumber, we are converting from baseIn to base 10.
    return function (str, baseIn, baseOut, sign, callerIsToString) {
      var alphabet, d, e, k, r, x, xc, y,
        i = str.indexOf('.'),
        dp = DECIMAL_PLACES,
        rm = ROUNDING_MODE;

      // Non-integer.
      if (i >= 0) {
        k = POW_PRECISION;

        // Unlimited precision.
        POW_PRECISION = 0;
        str = str.replace('.', '');
        y = new BigNumber(baseIn);
        x = y.pow(str.length - i);
        POW_PRECISION = k;

        // Convert str as if an integer, then restore the fraction part by dividing the
        // result by its base raised to a power.

        y.c = toBaseOut(toFixedPoint(coeffToString(x.c), x.e, '0'),
         10, baseOut, decimal);
        y.e = y.c.length;
      }

      // Convert the number as integer.

      xc = toBaseOut(str, baseIn, baseOut, callerIsToString
       ? (alphabet = ALPHABET, decimal)
       : (alphabet = decimal, ALPHABET));

      // xc now represents str as an integer and converted to baseOut. e is the exponent.
      e = k = xc.length;

      // Remove trailing zeros.
      for (; xc[--k] == 0; xc.pop());

      // Zero?
      if (!xc[0]) return alphabet.charAt(0);

      // Does str represent an integer? If so, no need for the division.
      if (i < 0) {
        --e;
      } else {
        x.c = xc;
        x.e = e;

        // The sign is needed for correct rounding.
        x.s = sign;
        x = div(x, y, dp, rm, baseOut);
        xc = x.c;
        r = x.r;
        e = x.e;
      }

      // xc now represents str converted to baseOut.

      // The index of the rounding digit.
      d = e + dp + 1;

      // The rounding digit: the digit to the right of the digit that may be rounded up.
      i = xc[d];

      // Look at the rounding digits and mode to determine whether to round up.

      k = baseOut / 2;
      r = r || d < 0 || xc[d + 1] != null;

      r = rm < 4 ? (i != null || r) && (rm == 0 || rm == (x.s < 0 ? 3 : 2))
            : i > k || i == k &&(rm == 4 || r || rm == 6 && xc[d - 1] & 1 ||
             rm == (x.s < 0 ? 8 : 7));

      // If the index of the rounding digit is not greater than zero, or xc represents
      // zero, then the result of the base conversion is zero or, if rounding up, a value
      // such as 0.00001.
      if (d < 1 || !xc[0]) {

        // 1^-dp or 0
        str = r ? toFixedPoint(alphabet.charAt(1), -dp, alphabet.charAt(0)) : alphabet.charAt(0);
      } else {

        // Truncate xc to the required number of decimal places.
        xc.length = d;

        // Round up?
        if (r) {

          // Rounding up may mean the previous digit has to be rounded up and so on.
          for (--baseOut; ++xc[--d] > baseOut;) {
            xc[d] = 0;

            if (!d) {
              ++e;
              xc = [1].concat(xc);
            }
          }
        }

        // Determine trailing zeros.
        for (k = xc.length; !xc[--k];);

        // E.g. [4, 11, 15] becomes 4bf.
        for (i = 0, str = ''; i <= k; str += alphabet.charAt(xc[i++]));

        // Add leading zeros, decimal point and trailing zeros as required.
        str = toFixedPoint(str, e, alphabet.charAt(0));
      }

      // The caller will add the sign.
      return str;
    };
  })();


  // Perform division in the specified base. Called by div and convertBase.
  div = (function () {

    // Assume non-zero x and k.
    function multiply(x, k, base) {
      var m, temp, xlo, xhi,
        carry = 0,
        i = x.length,
        klo = k % SQRT_BASE,
        khi = k / SQRT_BASE | 0;

      for (x = x.slice(); i--;) {
        xlo = x[i] % SQRT_BASE;
        xhi = x[i] / SQRT_BASE | 0;
        m = khi * xlo + xhi * klo;
        temp = klo * xlo + ((m % SQRT_BASE) * SQRT_BASE) + carry;
        carry = (temp / base | 0) + (m / SQRT_BASE | 0) + khi * xhi;
        x[i] = temp % base;
      }

      if (carry) x = [carry].concat(x);

      return x;
    }

    function compare(a, b, aL, bL) {
      var i, cmp;

      if (aL != bL) {
        cmp = aL > bL ? 1 : -1;
      } else {

        for (i = cmp = 0; i < aL; i++) {

          if (a[i] != b[i]) {
            cmp = a[i] > b[i] ? 1 : -1;
            break;
          }
        }
      }

      return cmp;
    }

    function subtract(a, b, aL, base) {
      var i = 0;

      // Subtract b from a.
      for (; aL--;) {
        a[aL] -= i;
        i = a[aL] < b[aL] ? 1 : 0;
        a[aL] = i * base + a[aL] - b[aL];
      }

      // Remove leading zeros.
      for (; !a[0] && a.length > 1; a.splice(0, 1));
    }

    // x: dividend, y: divisor.
    return function (x, y, dp, rm, base) {
      var cmp, e, i, more, n, prod, prodL, q, qc, rem, remL, rem0, xi, xL, yc0,
        yL, yz,
        s = x.s == y.s ? 1 : -1,
        xc = x.c,
        yc = y.c;

      // Either NaN, Infinity or 0?
      if (!xc || !xc[0] || !yc || !yc[0]) {

        return new BigNumber(

         // Return NaN if either NaN, or both Infinity or 0.
         !x.s || !y.s || (xc ? yc && xc[0] == yc[0] : !yc) ? NaN :

          // Return ±0 if x is ±0 or y is ±Infinity, or return ±Infinity as y is ±0.
          xc && xc[0] == 0 || !yc ? s * 0 : s / 0
       );
      }

      q = new BigNumber(s);
      qc = q.c = [];
      e = x.e - y.e;
      s = dp + e + 1;

      if (!base) {
        base = BASE;
        e = bitFloor(x.e / LOG_BASE) - bitFloor(y.e / LOG_BASE);
        s = s / LOG_BASE | 0;
      }

      // Result exponent may be one less then the current value of e.
      // The coefficients of the BigNumbers from convertBase may have trailing zeros.
      for (i = 0; yc[i] == (xc[i] || 0); i++);

      if (yc[i] > (xc[i] || 0)) e--;

      if (s < 0) {
        qc.push(1);
        more = true;
      } else {
        xL = xc.length;
        yL = yc.length;
        i = 0;
        s += 2;

        // Normalise xc and yc so highest order digit of yc is >= base / 2.

        n = mathfloor(base / (yc[0] + 1));

        // Not necessary, but to handle odd bases where yc[0] == (base / 2) - 1.
        // if (n > 1 || n++ == 1 && yc[0] < base / 2) {
        if (n > 1) {
          yc = multiply(yc, n, base);
          xc = multiply(xc, n, base);
          yL = yc.length;
          xL = xc.length;
        }

        xi = yL;
        rem = xc.slice(0, yL);
        remL = rem.length;

        // Add zeros to make remainder as long as divisor.
        for (; remL < yL; rem[remL++] = 0);
        yz = yc.slice();
        yz = [0].concat(yz);
        yc0 = yc[0];
        if (yc[1] >= base / 2) yc0++;
        // Not necessary, but to prevent trial digit n > base, when using base 3.
        // else if (base == 3 && yc0 == 1) yc0 = 1 + 1e-15;

        do {
          n = 0;

          // Compare divisor and remainder.
          cmp = compare(yc, rem, yL, remL);

          // If divisor < remainder.
          if (cmp < 0) {

            // Calculate trial digit, n.

            rem0 = rem[0];
            if (yL != remL) rem0 = rem0 * base + (rem[1] || 0);

            // n is how many times the divisor goes into the current remainder.
            n = mathfloor(rem0 / yc0);

            //  Algorithm:
            //  product = divisor multiplied by trial digit (n).
            //  Compare product and remainder.
            //  If product is greater than remainder:
            //    Subtract divisor from product, decrement trial digit.
            //  Subtract product from remainder.
            //  If product was less than remainder at the last compare:
            //    Compare new remainder and divisor.
            //    If remainder is greater than divisor:
            //      Subtract divisor from remainder, increment trial digit.

            if (n > 1) {

              // n may be > base only when base is 3.
              if (n >= base) n = base - 1;

              // product = divisor * trial digit.
              prod = multiply(yc, n, base);
              prodL = prod.length;
              remL = rem.length;

              // Compare product and remainder.
              // If product > remainder then trial digit n too high.
              // n is 1 too high about 5% of the time, and is not known to have
              // ever been more than 1 too high.
              while (compare(prod, rem, prodL, remL) == 1) {
                n--;

                // Subtract divisor from product.
                subtract(prod, yL < prodL ? yz : yc, prodL, base);
                prodL = prod.length;
                cmp = 1;
              }
            } else {

              // n is 0 or 1, cmp is -1.
              // If n is 0, there is no need to compare yc and rem again below,
              // so change cmp to 1 to avoid it.
              // If n is 1, leave cmp as -1, so yc and rem are compared again.
              if (n == 0) {

                // divisor < remainder, so n must be at least 1.
                cmp = n = 1;
              }

              // product = divisor
              prod = yc.slice();
              prodL = prod.length;
            }

            if (prodL < remL) prod = [0].concat(prod);

            // Subtract product from remainder.
            subtract(rem, prod, remL, base);
            remL = rem.length;

             // If product was < remainder.
            if (cmp == -1) {

              // Compare divisor and new remainder.
              // If divisor < new remainder, subtract divisor from remainder.
              // Trial digit n too low.
              // n is 1 too low about 5% of the time, and very rarely 2 too low.
              while (compare(yc, rem, yL, remL) < 1) {
                n++;

                // Subtract divisor from remainder.
                subtract(rem, yL < remL ? yz : yc, remL, base);
                remL = rem.length;
              }
            }
          } else if (cmp === 0) {
            n++;
            rem = [0];
          } // else cmp === 1 and n will be 0

          // Add the next digit, n, to the result array.
          qc[i++] = n;

          // Update the remainder.
          if (rem[0]) {
            rem[remL++] = xc[xi] || 0;
          } else {
            rem = [xc[xi]];
            remL = 1;
          }
        } while ((xi++ < xL || rem[0] != null) && s--);

        more = rem[0] != null;

        // Leading zero?
        if (!qc[0]) qc.splice(0, 1);
      }

      if (base == BASE) {

        // To calculate q.e, first get the number of digits of qc[0].
        for (i = 1, s = qc[0]; s >= 10; s /= 10, i++);

        round(q, dp + (q.e = i + e * LOG_BASE - 1) + 1, rm, more);

      // Caller is convertBase.
      } else {
        q.e = e;
        q.r = +more;
      }

      return q;
    };
  })();


  /*
   * Return a string representing the value of BigNumber n in fixed-point or exponential
   * notation rounded to the specified decimal places or significant digits.
   *
   * n: a BigNumber.
   * i: the index of the last digit required (i.e. the digit that may be rounded up).
   * rm: the rounding mode.
   * id: 1 (toExponential) or 2 (toPrecision).
   */
  function format(n, i, rm, id) {
    var c0, e, ne, len, str;

    if (rm == null) rm = ROUNDING_MODE;
    else intCheck(rm, 0, 8);

    if (!n.c) return n.toString();

    c0 = n.c[0];
    ne = n.e;

    if (i == null) {
      str = coeffToString(n.c);
      str = id == 1 || id == 2 && (ne <= TO_EXP_NEG || ne >= TO_EXP_POS)
       ? toExponential(str, ne)
       : toFixedPoint(str, ne, '0');
    } else {
      n = round(new BigNumber(n), i, rm);

      // n.e may have changed if the value was rounded up.
      e = n.e;

      str = coeffToString(n.c);
      len = str.length;

      // toPrecision returns exponential notation if the number of significant digits
      // specified is less than the number of digits necessary to represent the integer
      // part of the value in fixed-point notation.

      // Exponential notation.
      if (id == 1 || id == 2 && (i <= e || e <= TO_EXP_NEG)) {

        // Append zeros?
        for (; len < i; str += '0', len++);
        str = toExponential(str, e);

      // Fixed-point notation.
      } else {
        i -= ne + (id === 2 && e > ne);
        str = toFixedPoint(str, e, '0');

        // Append zeros?
        if (e + 1 > len) {
          if (--i > 0) for (str += '.'; i--; str += '0');
        } else {
          i += e - len;
          if (i > 0) {
            if (e + 1 == len) str += '.';
            for (; i--; str += '0');
          }
        }
      }
    }

    return n.s < 0 && c0 ? '-' + str : str;
  }


  function isBigNumber(v) {
    return v instanceof BigNumber || !!v && v._isBigNumber === true;
  }


  // Handle BigNumber.max and BigNumber.min.
  // If any number is NaN, return NaN.
  function maxOrMin(args, n) {
    var k, y,
      i = 1,
      x = new BigNumber(args[0]);

    for (; i < args.length; i++) {
      y = new BigNumber(args[i]);
      if (!y.s || (k = compare(x, y)) === n || k === 0 && x.s === n) {
        x = y;
      }
    }

    return x;
  }


  /*
   * Strip trailing zeros, calculate base 10 exponent and check against MIN_EXP and MAX_EXP.
   * Called by minus, plus and times.
   */
  function normalise(n, c, e) {
    var i = 1,
      j = c.length;

     // Remove trailing zeros.
    for (; !c[--j]; c.pop());

    // Calculate the base 10 exponent. First get the number of digits of c[0].
    for (j = c[0]; j >= 10; j /= 10, i++);

    // Overflow?
    if ((e = i + e * LOG_BASE - 1) > MAX_EXP) {

      // Infinity.
      n.c = n.e = null;

    // Underflow?
    } else if (e < MIN_EXP) {

      // Zero.
      n.c = [n.e = 0];
    } else {
      n.e = e;
      n.c = c;
    }

    return n;
  }


  // Handle values that fail the validity test in BigNumber.
  parseUnusualNumeric = (function () {
    var basePrefix = /^(-?)0([xbo])(?=\w[\w.]*$)/i,
      dotAfter = /^([^.]+)\.$/,
      dotBefore = /^\.([^.]+)$/,
      isInfinityOrNaN = /^-?(Infinity|NaN)$/,
      whitespaceOrPlus = /^\s*\+(?=[\w.])|^\s+|\s+$/g;

    return function (x, str, b) {
      var base,
        s = str.replace(whitespaceOrPlus, '');

      // No exception on ±Infinity or NaN.
      if (isInfinityOrNaN.test(s)) {
        x.s = isNaN(s) ? null : s < 0 ? -1 : 1;
        x.c = x.e = null;
        return;
      }

      // basePrefix = /^(-?)0([xbo])(?=\w[\w.]*$)/i
      s = s.replace(basePrefix, function (m, p1, p2) {
        base = (p2 = p2.toLowerCase()) == 'x' ? 16 : p2 == 'b' ? 2 : 8;
        return !b || b == base ? p1 : m;
      });
       
      if (b) {
        base = b;
        
        // E.g. '1.' to '1', '.1' to '0.1'
        s = s.replace(dotAfter, '$1').replace(dotBefore, '0.$1');
      }
      
      if (str != s) return new BigNumber(s, base);
      
      // '[BigNumber Error] Not a number: {n}'
      // '[BigNumber Error] Not a base {b} number: {n}'
      throw Error
        (bignumberError + 'Not a' + (b ? ' base ' + b : '') + ' number: ' + str);
    }
  })();


  /*
   * Round x to sd significant digits using rounding mode rm. Check for over/under-flow.
   * If r is truthy, it is known that there are more digits after the rounding digit.
   */
  function round(x, sd, rm, r) {
    var d, i, j, k, n, ni, rd,
      xc = x.c,
      pows10 = POWS_TEN;

    // if x is not Infinity or NaN...
    if (xc) {

      // rd is the rounding digit, i.e. the digit after the digit that may be rounded up.
      // n is a base 1e14 number, the value of the element of array x.c containing rd.
      // ni is the index of n within x.c.
      // d is the number of digits of n.
      // i is the index of rd within n including leading zeros.
      // j is the actual index of rd within n (if < 0, rd is a leading zero).
      out: {

        // Get the number of digits of the first element of xc.
        for (d = 1, k = xc[0]; k >= 10; k /= 10, d++);
        i = sd - d;

        // If the rounding digit is in the first element of xc...
        if (i < 0) {
          i += LOG_BASE;
          j = sd;
          n = xc[ni = 0];

          // Get the rounding digit at index j of n.
          rd = mathfloor(n / pows10[d - j - 1] % 10);
        } else {
          ni = mathceil((i + 1) / LOG_BASE);

          if (ni >= xc.length) {

            if (r) {

              // Needed by sqrt.
              for (; xc.length <= ni; xc.push(0));
              n = rd = 0;
              d = 1;
              i %= LOG_BASE;
              j = i - LOG_BASE + 1;
            } else {
              break out;
            }
          } else {
            n = k = xc[ni];

            // Get the number of digits of n.
            for (d = 1; k >= 10; k /= 10, d++);

            // Get the index of rd within n.
            i %= LOG_BASE;

            // Get the index of rd within n, adjusted for leading zeros.
            // The number of leading zeros of n is given by LOG_BASE - d.
            j = i - LOG_BASE + d;

            // Get the rounding digit at index j of n.
            rd = j < 0 ? 0 : mathfloor(n / pows10[d - j - 1] % 10);
          }
        }

        r = r || sd < 0 ||

        // Are there any non-zero digits after the rounding digit?
        // The expression  n % pows10[d - j - 1]  returns all digits of n to the right
        // of the digit at j, e.g. if n is 908714 and j is 2, the expression gives 714.
         xc[ni + 1] != null || (j < 0 ? n : n % pows10[d - j - 1]);

        r = rm < 4
         ? (rd || r) && (rm == 0 || rm == (x.s < 0 ? 3 : 2))
         : rd > 5 || rd == 5 && (rm == 4 || r || rm == 6 &&

          // Check whether the digit to the left of the rounding digit is odd.
          ((i > 0 ? j > 0 ? n / pows10[d - j] : 0 : xc[ni - 1]) % 10) & 1 ||
           rm == (x.s < 0 ? 8 : 7));

        if (sd < 1 || !xc[0]) {
          xc.length = 0;

          if (r) {

            // Convert sd to decimal places.
            sd -= x.e + 1;

            // 1, 0.1, 0.01, 0.001, 0.0001 etc.
            xc[0] = pows10[(LOG_BASE - sd % LOG_BASE) % LOG_BASE];
            x.e = -sd || 0;
          } else {

            // Zero.
            xc[0] = x.e = 0;
          }

          return x;
        }

        // Remove excess digits.
        if (i == 0) {
          xc.length = ni;
          k = 1;
          ni--;
        } else {
          xc.length = ni + 1;
          k = pows10[LOG_BASE - i];

          // E.g. 56700 becomes 56000 if 7 is the rounding digit.
          // j > 0 means i > number of leading zeros of n.
          xc[ni] = j > 0 ? mathfloor(n / pows10[d - j] % pows10[j]) * k : 0;
        }

        // Round up?
        if (r) {

          for (; ;) {

            // If the digit to be rounded up is in the first element of xc...
            if (ni == 0) {

              // i will be the length of xc[0] before k is added.
              for (i = 1, j = xc[0]; j >= 10; j /= 10, i++);
              j = xc[0] += k;
              for (k = 1; j >= 10; j /= 10, k++);

              // if i != k the length has increased.
              if (i != k) {
                x.e++;
                if (xc[0] == BASE) xc[0] = 1;
              }

              break;
            } else {
              xc[ni] += k;
              if (xc[ni] != BASE) break;
              xc[ni--] = 0;
              k = 1;
            }
          }
        }

        // Remove trailing zeros.
        for (i = xc.length; xc[--i] === 0; xc.pop());
      }

      // Overflow? Infinity.
      if (x.e > MAX_EXP) {
        x.c = x.e = null;

      // Underflow? Zero.
      } else if (x.e < MIN_EXP) {
        x.c = [x.e = 0];
      }
    }

    return x;
  }


  function valueOf(n) {
    var str,
      e = n.e;

    if (e === null) return n.toString();

    str = coeffToString(n.c);

    str = e <= TO_EXP_NEG || e >= TO_EXP_POS
      ? toExponential(str, e)
      : toFixedPoint(str, e, '0');

    return n.s < 0 ? '-' + str : str;
  }


  // PROTOTYPE/INSTANCE METHODS


  /*
   * Return a new BigNumber whose value is the absolute value of this BigNumber.
   */
  P.absoluteValue = P.abs = function () {
    var x = new BigNumber(this);
    if (x.s < 0) x.s = 1;
    return x;
  };


  /*
   * Return
   *   1 if the value of this BigNumber is greater than the value of BigNumber(y, b),
   *   -1 if the value of this BigNumber is less than the value of BigNumber(y, b),
   *   0 if they have the same value,
   *   or null if the value of either is NaN.
   */
  P.comparedTo = function (y, b) {
    return compare(this, new BigNumber(y, b));
  };


  /*
   * If dp is undefined or null or true or false, return the number of decimal places of the
   * value of this BigNumber, or null if the value of this BigNumber is ±Infinity or NaN.
   *
   * Otherwise, if dp is a number, return a new BigNumber whose value is the value of this
   * BigNumber rounded to a maximum of dp decimal places using rounding mode rm, or
   * ROUNDING_MODE if rm is omitted.
   *
   * [dp] {number} Decimal places: integer, 0 to MAX inclusive.
   * [rm] {number} Rounding mode. Integer, 0 to 8 inclusive.
   *
   * '[BigNumber Error] Argument {not a primitive number|not an integer|out of range}: {dp|rm}'
   */
  P.decimalPlaces = P.dp = function (dp, rm) {
    var c, n, v,
      x = this;

    if (dp != null) {
      intCheck(dp, 0, MAX);
      if (rm == null) rm = ROUNDING_MODE;
      else intCheck(rm, 0, 8);

      return round(new BigNumber(x), dp + x.e + 1, rm);
    }

    if (!(c = x.c)) return null;
    n = ((v = c.length - 1) - bitFloor(this.e / LOG_BASE)) * LOG_BASE;

    // Subtract the number of trailing zeros of the last number.
    if (v = c[v]) for (; v % 10 == 0; v /= 10, n--);
    if (n < 0) n = 0;

    return n;
  };


  /*
   *  n / 0 = I
   *  n / N = N
   *  n / I = 0
   *  0 / n = 0
   *  0 / 0 = N
   *  0 / N = N
   *  0 / I = 0
   *  N / n = N
   *  N / 0 = N
   *  N / N = N
   *  N / I = N
   *  I / n = I
   *  I / 0 = I
   *  I / N = N
   *  I / I = N
   *
   * Return a new BigNumber whose value is the value of this BigNumber divided by the value of
   * BigNumber(y, b), rounded according to DECIMAL_PLACES and ROUNDING_MODE.
   */
  P.dividedBy = P.div = function (y, b) {
    return div(this, new BigNumber(y, b), DECIMAL_PLACES, ROUNDING_MODE);
  };


  /*
   * Return a new BigNumber whose value is the integer part of dividing the value of this
   * BigNumber by the value of BigNumber(y, b).
   */
  P.dividedToIntegerBy = P.idiv = function (y, b) {
    return div(this, new BigNumber(y, b), 0, 1);
  };


  /*
   * Return a BigNumber whose value is the value of this BigNumber exponentiated by n.
   *
   * If m is present, return the result modulo m.
   * If n is negative round according to DECIMAL_PLACES and ROUNDING_MODE.
   * If POW_PRECISION is non-zero and m is not present, round to POW_PRECISION using ROUNDING_MODE.
   *
   * The modular power operation works efficiently when x, n, and m are integers, otherwise it
   * is equivalent to calculating x.exponentiatedBy(n).modulo(m) with a POW_PRECISION of 0.
   *
   * n {number|string|BigNumber} The exponent. An integer.
   * [m] {number|string|BigNumber} The modulus.
   *
   * '[BigNumber Error] Exponent not an integer: {n}'
   */
  P.exponentiatedBy = P.pow = function (n, m) {
    var half, isModExp, i, k, more, nIsBig, nIsNeg, nIsOdd, y,
      x = this;

    n = new BigNumber(n);

    // Allow NaN and ±Infinity, but not other non-integers.
    if (n.c && !n.isInteger()) {
      throw Error
        (bignumberError + 'Exponent not an integer: ' + valueOf(n));
    }

    if (m != null) m = new BigNumber(m);

    // Exponent of MAX_SAFE_INTEGER is 15.
    nIsBig = n.e > 14;

    // If x is NaN, ±Infinity, ±0 or ±1, or n is ±Infinity, NaN or ±0.
    if (!x.c || !x.c[0] || x.c[0] == 1 && !x.e && x.c.length == 1 || !n.c || !n.c[0]) {

      // The sign of the result of pow when x is negative depends on the evenness of n.
      // If +n overflows to ±Infinity, the evenness of n would be not be known.
      y = new BigNumber(Math.pow(+valueOf(x), nIsBig ? n.s * (2 - isOdd(n)) : +valueOf(n)));
      return m ? y.mod(m) : y;
    }

    nIsNeg = n.s < 0;

    if (m) {

      // x % m returns NaN if abs(m) is zero, or m is NaN.
      if (m.c ? !m.c[0] : !m.s) return new BigNumber(NaN);

      isModExp = !nIsNeg && x.isInteger() && m.isInteger();

      if (isModExp) x = x.mod(m);

    // Overflow to ±Infinity: >=2**1e10 or >=1.0000024**1e15.
    // Underflow to ±0: <=0.79**1e10 or <=0.9999975**1e15.
    } else if (n.e > 9 && (x.e > 0 || x.e < -1 || (x.e == 0
      // [1, 240000000]
      ? x.c[0] > 1 || nIsBig && x.c[1] >= 24e7
      // [80000000000000]  [99999750000000]
      : x.c[0] < 8e13 || nIsBig && x.c[0] <= 9999975e7))) {

      // If x is negative and n is odd, k = -0, else k = 0.
      k = x.s < 0 && isOdd(n) ? -0 : 0;

      // If x >= 1, k = ±Infinity.
      if (x.e > -1) k = 1 / k;

      // If n is negative return ±0, else return ±Infinity.
      return new BigNumber(nIsNeg ? 1 / k : k);

    } else if (POW_PRECISION) {

      // Truncating each coefficient array to a length of k after each multiplication
      // equates to truncating significant digits to POW_PRECISION + [28, 41],
      // i.e. there will be a minimum of 28 guard digits retained.
      k = mathceil(POW_PRECISION / LOG_BASE + 2);
    }

    if (nIsBig) {
      half = new BigNumber(0.5);
      if (nIsNeg) n.s = 1;
      nIsOdd = isOdd(n);
    } else {
      i = Math.abs(+valueOf(n));
      nIsOdd = i % 2;
    }

    y = new BigNumber(ONE);

    // Performs 54 loop iterations for n of 9007199254740991.
    for (; ;) {

      if (nIsOdd) {
        y = y.times(x);
        if (!y.c) break;

        if (k) {
          if (y.c.length > k) y.c.length = k;
        } else if (isModExp) {
          y = y.mod(m);    //y = y.minus(div(y, m, 0, MODULO_MODE).times(m));
        }
      }

      if (i) {
        i = mathfloor(i / 2);
        if (i === 0) break;
        nIsOdd = i % 2;
      } else {
        n = n.times(half);
        round(n, n.e + 1, 1);

        if (n.e > 14) {
          nIsOdd = isOdd(n);
        } else {
          i = +valueOf(n);
          if (i === 0) break;
          nIsOdd = i % 2;
        }
      }

      x = x.times(x);

      if (k) {
        if (x.c && x.c.length > k) x.c.length = k;
      } else if (isModExp) {
        x = x.mod(m);    //x = x.minus(div(x, m, 0, MODULO_MODE).times(m));
      }
    }

    if (isModExp) return y;
    if (nIsNeg) y = ONE.div(y);

    return m ? y.mod(m) : k ? round(y, POW_PRECISION, ROUNDING_MODE, more) : y;
  };


  /*
   * Return a new BigNumber whose value is the value of this BigNumber rounded to an integer
   * using rounding mode rm, or ROUNDING_MODE if rm is omitted.
   *
   * [rm] {number} Rounding mode. Integer, 0 to 8 inclusive.
   *
   * '[BigNumber Error] Argument {not a primitive number|not an integer|out of range}: {rm}'
   */
  P.integerValue = function (rm) {
    var n = new BigNumber(this);
    if (rm == null) rm = ROUNDING_MODE;
    else intCheck(rm, 0, 8);
    return round(n, n.e + 1, rm);
  };


  /*
   * Return true if the value of this BigNumber is equal to the value of BigNumber(y, b),
   * otherwise return false.
   */
  P.isEqualTo = P.eq = function (y, b) {
    return compare(this, new BigNumber(y, b)) === 0;
  };


  /*
   * Return true if the value of this BigNumber is a finite number, otherwise return false.
   */
  P.isFinite = function () {
    return !!this.c;
  };


  /*
   * Return true if the value of this BigNumber is greater than the value of BigNumber(y, b),
   * otherwise return false.
   */
  P.isGreaterThan = P.gt = function (y, b) {
    return compare(this, new BigNumber(y, b)) > 0;
  };


  /*
   * Return true if the value of this BigNumber is greater than or equal to the value of
   * BigNumber(y, b), otherwise return false.
   */
  P.isGreaterThanOrEqualTo = P.gte = function (y, b) {
    return (b = compare(this, new BigNumber(y, b))) === 1 || b === 0;

  };


  /*
   * Return true if the value of this BigNumber is an integer, otherwise return false.
   */
  P.isInteger = function () {
    return !!this.c && bitFloor(this.e / LOG_BASE) > this.c.length - 2;
  };


  /*
   * Return true if the value of this BigNumber is less than the value of BigNumber(y, b),
   * otherwise return false.
   */
  P.isLessThan = P.lt = function (y, b) {
    return compare(this, new BigNumber(y, b)) < 0;
  };


  /*
   * Return true if the value of this BigNumber is less than or equal to the value of
   * BigNumber(y, b), otherwise return false.
   */
  P.isLessThanOrEqualTo = P.lte = function (y, b) {
    return (b = compare(this, new BigNumber(y, b))) === -1 || b === 0;
  };


  /*
   * Return true if the value of this BigNumber is NaN, otherwise return false.
   */
  P.isNaN = function () {
    return !this.s;
  };


  /*
   * Return true if the value of this BigNumber is negative, otherwise return false.
   */
  P.isNegative = function () {
    return this.s < 0;
  };


  /*
   * Return true if the value of this BigNumber is positive, otherwise return false.
   */
  P.isPositive = function () {
    return this.s > 0;
  };


  /*
   * Return true if the value of this BigNumber is 0 or -0, otherwise return false.
   */
  P.isZero = function () {
    return !!this.c && this.c[0] == 0;
  };


  /*
   *  n - 0 = n
   *  n - N = N
   *  n - I = -I
   *  0 - n = -n
   *  0 - 0 = 0
   *  0 - N = N
   *  0 - I = -I
   *  N - n = N
   *  N - 0 = N
   *  N - N = N
   *  N - I = N
   *  I - n = I
   *  I - 0 = I
   *  I - N = N
   *  I - I = N
   *
   * Return a new BigNumber whose value is the value of this BigNumber minus the value of
   * BigNumber(y, b).
   */
  P.minus = function (y, b) {
    var i, j, t, xLTy,
      x = this,
      a = x.s;

    y = new BigNumber(y, b);
    b = y.s;

    // Either NaN?
    if (!a || !b) return new BigNumber(NaN);

    // Signs differ?
    if (a != b) {
      y.s = -b;
      return x.plus(y);
    }

    var xe = x.e / LOG_BASE,
      ye = y.e / LOG_BASE,
      xc = x.c,
      yc = y.c;

    if (!xe || !ye) {

      // Either Infinity?
      if (!xc || !yc) return xc ? (y.s = -b, y) : new BigNumber(yc ? x : NaN);

      // Either zero?
      if (!xc[0] || !yc[0]) {

        // Return y if y is non-zero, x if x is non-zero, or zero if both are zero.
        return yc[0] ? (y.s = -b, y) : new BigNumber(xc[0] ? x :

         // IEEE 754 (2008) 6.3: n - n = -0 when rounding to -Infinity
         ROUNDING_MODE == 3 ? -0 : 0);
      }
    }

    xe = bitFloor(xe);
    ye = bitFloor(ye);
    xc = xc.slice();

    // Determine which is the bigger number.
    if (a = xe - ye) {

      if (xLTy = a < 0) {
        a = -a;
        t = xc;
      } else {
        ye = xe;
        t = yc;
      }

      t.reverse();

      // Prepend zeros to equalise exponents.
      for (b = a; b--; t.push(0));
      t.reverse();
    } else {

      // Exponents equal. Check digit by digit.
      j = (xLTy = (a = xc.length) < (b = yc.length)) ? a : b;

      for (a = b = 0; b < j; b++) {

        if (xc[b] != yc[b]) {
          xLTy = xc[b] < yc[b];
          break;
        }
      }
    }

    // x < y? Point xc to the array of the bigger number.
    if (xLTy) {
      t = xc;
      xc = yc;
      yc = t;
      y.s = -y.s;
    }

    b = (j = yc.length) - (i = xc.length);

    // Append zeros to xc if shorter.
    // No need to add zeros to yc if shorter as subtract only needs to start at yc.length.
    if (b > 0) for (; b--; xc[i++] = 0);
    b = BASE - 1;

    // Subtract yc from xc.
    for (; j > a;) {

      if (xc[--j] < yc[j]) {
        for (i = j; i && !xc[--i]; xc[i] = b);
        --xc[i];
        xc[j] += BASE;
      }

      xc[j] -= yc[j];
    }

    // Remove leading zeros and adjust exponent accordingly.
    for (; xc[0] == 0; xc.splice(0, 1), --ye);

    // Zero?
    if (!xc[0]) {

      // Following IEEE 754 (2008) 6.3,
      // n - n = +0  but  n - n = -0  when rounding towards -Infinity.
      y.s = ROUNDING_MODE == 3 ? -1 : 1;
      y.c = [y.e = 0];
      return y;
    }

    // No need to check for Infinity as +x - +y != Infinity && -x - -y != Infinity
    // for finite x and y.
    return normalise(y, xc, ye);
  };


  /*
   *   n % 0 =  N
   *   n % N =  N
   *   n % I =  n
   *   0 % n =  0
   *  -0 % n = -0
   *   0 % 0 =  N
   *   0 % N =  N
   *   0 % I =  0
   *   N % n =  N
   *   N % 0 =  N
   *   N % N =  N
   *   N % I =  N
   *   I % n =  N
   *   I % 0 =  N
   *   I % N =  N
   *   I % I =  N
   *
   * Return a new BigNumber whose value is the value of this BigNumber modulo the value of
   * BigNumber(y, b). The result depends on the value of MODULO_MODE.
   */
  P.modulo = P.mod = function (y, b) {
    var q, s,
      x = this;

    y = new BigNumber(y, b);

    // Return NaN if x is Infinity or NaN, or y is NaN or zero.
    if (!x.c || !y.s || y.c && !y.c[0]) {
      return new BigNumber(NaN);

    // Return x if y is Infinity or x is zero.
    } else if (!y.c || x.c && !x.c[0]) {
      return new BigNumber(x);
    }

    if (MODULO_MODE == 9) {

      // Euclidian division: q = sign(y) * floor(x / abs(y))
      // r = x - qy    where  0 <= r < abs(y)
      s = y.s;
      y.s = 1;
      q = div(x, y, 0, 3);
      y.s = s;
      q.s *= s;
    } else {
      q = div(x, y, 0, MODULO_MODE);
    }

    y = x.minus(q.times(y));

    // To match JavaScript %, ensure sign of zero is sign of dividend.
    if (!y.c[0] && MODULO_MODE == 1) y.s = x.s;

    return y;
  };


  /*
   *  n * 0 = 0
   *  n * N = N
   *  n * I = I
   *  0 * n = 0
   *  0 * 0 = 0
   *  0 * N = N
   *  0 * I = N
   *  N * n = N
   *  N * 0 = N
   *  N * N = N
   *  N * I = N
   *  I * n = I
   *  I * 0 = N
   *  I * N = N
   *  I * I = I
   *
   * Return a new BigNumber whose value is the value of this BigNumber multiplied by the value
   * of BigNumber(y, b).
   */
  P.multipliedBy = P.times = function (y, b) {
    var c, e, i, j, k, m, xcL, xlo, xhi, ycL, ylo, yhi, zc,
      base, sqrtBase,
      x = this,
      xc = x.c,
      yc = (y = new BigNumber(y, b)).c;

    // Either NaN, ±Infinity or ±0?
    if (!xc || !yc || !xc[0] || !yc[0]) {

      // Return NaN if either is NaN, or one is 0 and the other is Infinity.
      if (!x.s || !y.s || xc && !xc[0] && !yc || yc && !yc[0] && !xc) {
        y.c = y.e = y.s = null;
      } else {
        y.s *= x.s;

        // Return ±Infinity if either is ±Infinity.
        if (!xc || !yc) {
          y.c = y.e = null;

        // Return ±0 if either is ±0.
        } else {
          y.c = [0];
          y.e = 0;
        }
      }

      return y;
    }

    e = bitFloor(x.e / LOG_BASE) + bitFloor(y.e / LOG_BASE);
    y.s *= x.s;
    xcL = xc.length;
    ycL = yc.length;

    // Ensure xc points to longer array and xcL to its length.
    if (xcL < ycL) {
      zc = xc;
      xc = yc;
      yc = zc;
      i = xcL;
      xcL = ycL;
      ycL = i;
    }

    // Initialise the result array with zeros.
    for (i = xcL + ycL, zc = []; i--; zc.push(0));

    base = BASE;
    sqrtBase = SQRT_BASE;

    for (i = ycL; --i >= 0;) {
      c = 0;
      ylo = yc[i] % sqrtBase;
      yhi = yc[i] / sqrtBase | 0;

      for (k = xcL, j = i + k; j > i;) {
        xlo = xc[--k] % sqrtBase;
        xhi = xc[k] / sqrtBase | 0;
        m = yhi * xlo + xhi * ylo;
        xlo = ylo * xlo + ((m % sqrtBase) * sqrtBase) + zc[j] + c;
        c = (xlo / base | 0) + (m / sqrtBase | 0) + yhi * xhi;
        zc[j--] = xlo % base;
      }

      zc[j] = c;
    }

    if (c) {
      ++e;
    } else {
      zc.splice(0, 1);
    }

    return normalise(y, zc, e);
  };


  /*
   * Return a new BigNumber whose value is the value of this BigNumber negated,
   * i.e. multiplied by -1.
   */
  P.negated = function () {
    var x = new BigNumber(this);
    x.s = -x.s || null;
    return x;
  };


  /*
   *  n + 0 = n
   *  n + N = N
   *  n + I = I
   *  0 + n = n
   *  0 + 0 = 0
   *  0 + N = N
   *  0 + I = I
   *  N + n = N
   *  N + 0 = N
   *  N + N = N
   *  N + I = N
   *  I + n = I
   *  I + 0 = I
   *  I + N = N
   *  I + I = I
   *
   * Return a new BigNumber whose value is the value of this BigNumber plus the value of
   * BigNumber(y, b).
   */
  P.plus = function (y, b) {
    var t,
      x = this,
      a = x.s;

    y = new BigNumber(y, b);
    b = y.s;

    // Either NaN?
    if (!a || !b) return new BigNumber(NaN);

    // Signs differ?
     if (a != b) {
      y.s = -b;
      return x.minus(y);
    }

    var xe = x.e / LOG_BASE,
      ye = y.e / LOG_BASE,
      xc = x.c,
      yc = y.c;

    if (!xe || !ye) {

      // Return ±Infinity if either ±Infinity.
      if (!xc || !yc) return new BigNumber(a / 0);

      // Either zero?
      // Return y if y is non-zero, x if x is non-zero, or zero if both are zero.
      if (!xc[0] || !yc[0]) return yc[0] ? y : new BigNumber(xc[0] ? x : a * 0);
    }

    xe = bitFloor(xe);
    ye = bitFloor(ye);
    xc = xc.slice();

    // Prepend zeros to equalise exponents. Faster to use reverse then do unshifts.
    if (a = xe - ye) {
      if (a > 0) {
        ye = xe;
        t = yc;
      } else {
        a = -a;
        t = xc;
      }

      t.reverse();
      for (; a--; t.push(0));
      t.reverse();
    }

    a = xc.length;
    b = yc.length;

    // Point xc to the longer array, and b to the shorter length.
    if (a - b < 0) {
      t = yc;
      yc = xc;
      xc = t;
      b = a;
    }

    // Only start adding at yc.length - 1 as the further digits of xc can be ignored.
    for (a = 0; b;) {
      a = (xc[--b] = xc[b] + yc[b] + a) / BASE | 0;
      xc[b] = BASE === xc[b] ? 0 : xc[b] % BASE;
    }

    if (a) {
      xc = [a].concat(xc);
      ++ye;
    }

    // No need to check for zero, as +x + +y != 0 && -x + -y != 0
    // ye = MAX_EXP + 1 possible
    return normalise(y, xc, ye);
  };


  /*
   * If sd is undefined or null or true or false, return the number of significant digits of
   * the value of this BigNumber, or null if the value of this BigNumber is ±Infinity or NaN.
   * If sd is true include integer-part trailing zeros in the count.
   *
   * Otherwise, if sd is a number, return a new BigNumber whose value is the value of this
   * BigNumber rounded to a maximum of sd significant digits using rounding mode rm, or
   * ROUNDING_MODE if rm is omitted.
   *
   * sd {number|boolean} number: significant digits: integer, 1 to MAX inclusive.
   *                     boolean: whether to count integer-part trailing zeros: true or false.
   * [rm] {number} Rounding mode. Integer, 0 to 8 inclusive.
   *
   * '[BigNumber Error] Argument {not a primitive number|not an integer|out of range}: {sd|rm}'
   */
  P.precision = P.sd = function (sd, rm) {
    var c, n, v,
      x = this;

    if (sd != null && sd !== !!sd) {
      intCheck(sd, 1, MAX);
      if (rm == null) rm = ROUNDING_MODE;
      else intCheck(rm, 0, 8);

      return round(new BigNumber(x), sd, rm);
    }

    if (!(c = x.c)) return null;
    v = c.length - 1;
    n = v * LOG_BASE + 1;

    if (v = c[v]) {

      // Subtract the number of trailing zeros of the last element.
      for (; v % 10 == 0; v /= 10, n--);

      // Add the number of digits of the first element.
      for (v = c[0]; v >= 10; v /= 10, n++);
    }

    if (sd && x.e + 1 > n) n = x.e + 1;

    return n;
  };


  /*
   * Return a new BigNumber whose value is the value of this BigNumber shifted by k places
   * (powers of 10). Shift to the right if n > 0, and to the left if n < 0.
   *
   * k {number} Integer, -MAX_SAFE_INTEGER to MAX_SAFE_INTEGER inclusive.
   *
   * '[BigNumber Error] Argument {not a primitive number|not an integer|out of range}: {k}'
   */
  P.shiftedBy = function (k) {
    intCheck(k, -MAX_SAFE_INTEGER, MAX_SAFE_INTEGER);
    return this.times('1e' + k);
  };


  /*
   *  sqrt(-n) =  N
   *  sqrt(N) =  N
   *  sqrt(-I) =  N
   *  sqrt(I) =  I
   *  sqrt(0) =  0
   *  sqrt(-0) = -0
   *
   * Return a new BigNumber whose value is the square root of the value of this BigNumber,
   * rounded according to DECIMAL_PLACES and ROUNDING_MODE.
   */
  P.squareRoot = P.sqrt = function () {
    var m, n, r, rep, t,
      x = this,
      c = x.c,
      s = x.s,
      e = x.e,
      dp = DECIMAL_PLACES + 4,
      half = new BigNumber('0.5');

    // Negative/NaN/Infinity/zero?
    if (s !== 1 || !c || !c[0]) {
      return new BigNumber(!s || s < 0 && (!c || c[0]) ? NaN : c ? x : 1 / 0);
    }

    // Initial estimate.
    s = Math.sqrt(+valueOf(x));

    // Math.sqrt underflow/overflow?
    // Pass x to Math.sqrt as integer, then adjust the exponent of the result.
    if (s == 0 || s == 1 / 0) {
      n = coeffToString(c);
      if ((n.length + e) % 2 == 0) n += '0';
      s = Math.sqrt(+n);
      e = bitFloor((e + 1) / 2) - (e < 0 || e % 2);

      if (s == 1 / 0) {
        n = '5e' + e;
      } else {
        n = s.toExponential();
        n = n.slice(0, n.indexOf('e') + 1) + e;
      }

      r = new BigNumber(n);
    } else {
      r = new BigNumber(s + '');
    }

    // Check for zero.
    // r could be zero if MIN_EXP is changed after the this value was created.
    // This would cause a division by zero (x/t) and hence Infinity below, which would cause
    // coeffToString to throw.
    if (r.c[0]) {
      e = r.e;
      s = e + dp;
      if (s < 3) s = 0;

      // Newton-Raphson iteration.
      for (; ;) {
        t = r;
        r = half.times(t.plus(div(x, t, dp, 1)));

        if (coeffToString(t.c).slice(0, s) === (n = coeffToString(r.c)).slice(0, s)) {

          // The exponent of r may here be one less than the final result exponent,
          // e.g 0.0009999 (e-4) --> 0.001 (e-3), so adjust s so the rounding digits
          // are indexed correctly.
          if (r.e < e) --s;
          n = n.slice(s - 3, s + 1);

          // The 4th rounding digit may be in error by -1 so if the 4 rounding digits
          // are 9999 or 4999 (i.e. approaching a rounding boundary) continue the
          // iteration.
          if (n == '9999' || !rep && n == '4999') {

            // On the first iteration only, check to see if rounding up gives the
            // exact result as the nines may infinitely repeat.
            if (!rep) {
              round(t, t.e + DECIMAL_PLACES + 2, 0);

              if (t.times(t).eq(x)) {
                r = t;
                break;
              }
            }

            dp += 4;
            s += 4;
            rep = 1;
          } else {

            // If rounding digits are null, 0{0,4} or 50{0,3}, check for exact
            // result. If not, then there are further digits and m will be truthy.
            if (!+n || !+n.slice(1) && n.charAt(0) == '5') {

              // Truncate to the first rounding digit.
              round(r, r.e + DECIMAL_PLACES + 2, 1);
              m = !r.times(r).eq(x);
            }

            break;
          }
        }
      }
    }

    return round(r, r.e + DECIMAL_PLACES + 1, ROUNDING_MODE, m);
  };


  /*
   * Return a string representing the value of this BigNumber in exponential notation and
   * rounded using ROUNDING_MODE to dp fixed decimal places.
   *
   * [dp] {number} Decimal places. Integer, 0 to MAX inclusive.
   * [rm] {number} Rounding mode. Integer, 0 to 8 inclusive.
   *
   * '[BigNumber Error] Argument {not a primitive number|not an integer|out of range}: {dp|rm}'
   */
  P.toExponential = function (dp, rm) {
    if (dp != null) {
      intCheck(dp, 0, MAX);
      dp++;
    }
    return format(this, dp, rm, 1);
  };


  /*
   * Return a string representing the value of this BigNumber in fixed-point notation rounding
   * to dp fixed decimal places using rounding mode rm, or ROUNDING_MODE if rm is omitted.
   *
   * Note: as with JavaScript's number type, (-0).toFixed(0) is '0',
   * but e.g. (-0.00001).toFixed(0) is '-0'.
   *
   * [dp] {number} Decimal places. Integer, 0 to MAX inclusive.
   * [rm] {number} Rounding mode. Integer, 0 to 8 inclusive.
   *
   * '[BigNumber Error] Argument {not a primitive number|not an integer|out of range}: {dp|rm}'
   */
  P.toFixed = function (dp, rm) {
    if (dp != null) {
      intCheck(dp, 0, MAX);
      dp = dp + this.e + 1;
    }
    return format(this, dp, rm);
  };


  /*
   * Return a string representing the value of this BigNumber in fixed-point notation rounded
   * using rm or ROUNDING_MODE to dp decimal places, and formatted according to the properties
   * of the format or FORMAT object (see BigNumber.set).
   *
   * The formatting object may contain some or all of the properties shown below.
   *
   * FORMAT = {
   *   prefix: '',
   *   groupSize: 3,
   *   secondaryGroupSize: 0,
   *   groupSeparator: ',',
   *   decimalSeparator: '.',
   *   fractionGroupSize: 0,
   *   fractionGroupSeparator: '\xA0',      // non-breaking space
   *   suffix: ''
   * };
   *
   * [dp] {number} Decimal places. Integer, 0 to MAX inclusive.
   * [rm] {number} Rounding mode. Integer, 0 to 8 inclusive.
   * [format] {object} Formatting options. See FORMAT pbject above.
   *
   * '[BigNumber Error] Argument {not a primitive number|not an integer|out of range}: {dp|rm}'
   * '[BigNumber Error] Argument not an object: {format}'
   */
  P.toFormat = function (dp, rm, format) {
    var str,
      x = this;

    if (format == null) {
      if (dp != null && rm && typeof rm == 'object') {
        format = rm;
        rm = null;
      } else if (dp && typeof dp == 'object') {
        format = dp;
        dp = rm = null;
      } else {
        format = FORMAT;
      }
    } else if (typeof format != 'object') {
      throw Error
        (bignumberError + 'Argument not an object: ' + format);
    }

    str = x.toFixed(dp, rm);

    if (x.c) {
      var i,
        arr = str.split('.'),
        g1 = +format.groupSize,
        g2 = +format.secondaryGroupSize,
        groupSeparator = format.groupSeparator || '',
        intPart = arr[0],
        fractionPart = arr[1],
        isNeg = x.s < 0,
        intDigits = isNeg ? intPart.slice(1) : intPart,
        len = intDigits.length;

      if (g2) {
        i = g1;
        g1 = g2;
        g2 = i;
        len -= i;
      }

      if (g1 > 0 && len > 0) {
        i = len % g1 || g1;
        intPart = intDigits.substr(0, i);
        for (; i < len; i += g1) intPart += groupSeparator + intDigits.substr(i, g1);
        if (g2 > 0) intPart += groupSeparator + intDigits.slice(i);
        if (isNeg) intPart = '-' + intPart;
      }

      str = fractionPart
       ? intPart + (format.decimalSeparator || '') + ((g2 = +format.fractionGroupSize)
        ? fractionPart.replace(new RegExp('\\d{' + g2 + '}\\B', 'g'),
         '$&' + (format.fractionGroupSeparator || ''))
        : fractionPart)
       : intPart;
    }

    return (format.prefix || '') + str + (format.suffix || '');
  };


  /*
   * Return an array of two BigNumbers representing the value of this BigNumber as a simple
   * fraction with an integer numerator and an integer denominator.
   * The denominator will be a positive non-zero value less than or equal to the specified
   * maximum denominator. If a maximum denominator is not specified, the denominator will be
   * the lowest value necessary to represent the number exactly.
   *
   * [md] {number|string|BigNumber} Integer >= 1, or Infinity. The maximum denominator.
   *
   * '[BigNumber Error] Argument {not an integer|out of range} : {md}'
   */
  P.toFraction = function (md) {
    var d, d0, d1, d2, e, exp, n, n0, n1, q, r, s,
      x = this,
      xc = x.c;

    if (md != null) {
      n = new BigNumber(md);

      // Throw if md is less than one or is not an integer, unless it is Infinity.
      if (!n.isInteger() && (n.c || n.s !== 1) || n.lt(ONE)) {
        throw Error
          (bignumberError + 'Argument ' +
            (n.isInteger() ? 'out of range: ' : 'not an integer: ') + valueOf(n));
      }
    }

    if (!xc) return new BigNumber(x);

    d = new BigNumber(ONE);
    n1 = d0 = new BigNumber(ONE);
    d1 = n0 = new BigNumber(ONE);
    s = coeffToString(xc);

    // Determine initial denominator.
    // d is a power of 10 and the minimum max denominator that specifies the value exactly.
    e = d.e = s.length - x.e - 1;
    d.c[0] = POWS_TEN[(exp = e % LOG_BASE) < 0 ? LOG_BASE + exp : exp];
    md = !md || n.comparedTo(d) > 0 ? (e > 0 ? d : n1) : n;

    exp = MAX_EXP;
    MAX_EXP = 1 / 0;
    n = new BigNumber(s);

    // n0 = d1 = 0
    n0.c[0] = 0;

    for (; ;)  {
      q = div(n, d, 0, 1);
      d2 = d0.plus(q.times(d1));
      if (d2.comparedTo(md) == 1) break;
      d0 = d1;
      d1 = d2;
      n1 = n0.plus(q.times(d2 = n1));
      n0 = d2;
      d = n.minus(q.times(d2 = d));
      n = d2;
    }

    d2 = div(md.minus(d0), d1, 0, 1);
    n0 = n0.plus(d2.times(n1));
    d0 = d0.plus(d2.times(d1));
    n0.s = n1.s = x.s;
    e = e * 2;

    // Determine which fraction is closer to x, n0/d0 or n1/d1
    r = div(n1, d1, e, ROUNDING_MODE).minus(x).abs().comparedTo(
        div(n0, d0, e, ROUNDING_MODE).minus(x).abs()) < 1 ? [n1, d1] : [n0, d0];

    MAX_EXP = exp;

    return r;
  };


  /*
   * Return the value of this BigNumber converted to a number primitive.
   */
  P.toNumber = function () {
    return +valueOf(this);
  };


  /*
   * Return the value of this BigNumber converted to a plain object.
   */
  P.toObject = function() {
    var x = this;
    return {
      c: x.c ? x.c.slice() : null,
      e: x.e,
      s: x.s
    };
  };


  /*
   * Return a string representing the value of this BigNumber rounded to sd significant digits
   * using rounding mode rm or ROUNDING_MODE. If sd is less than the number of digits
   * necessary to represent the integer part of the value in fixed-point notation, then use
   * exponential notation.
   *
   * [sd] {number} Significant digits. Integer, 1 to MAX inclusive.
   * [rm] {number} Rounding mode. Integer, 0 to 8 inclusive.
   *
   * '[BigNumber Error] Argument {not a primitive number|not an integer|out of range}: {sd|rm}'
   */
  P.toPrecision = function (sd, rm) {
    if (sd != null) intCheck(sd, 1, MAX);
    return format(this, sd, rm, 2);
  };


  /*
   * Return a string representing the value of this BigNumber in base b, or base 10 if b is
   * omitted. If a base is specified, round according to DECIMAL_PLACES and ROUNDING_MODE.
   * If a base is not specified, and this BigNumber has a positive exponent
   * that is equal to or greater than TO_EXP_POS, or a negative exponent equal to or less than
   * TO_EXP_NEG, return exponential notation.
   *
   * [b] {number} Integer, 2 to ALPHABET.length inclusive.
   *
   * '[BigNumber Error] Base {not a primitive number|not an integer|out of range}: {b}'
   */
  P.toString = function (b) {
    var str,
      n = this,
      s = n.s,
      e = n.e;

    // Infinity or NaN?
    if (e === null) {
      if (s) {
        str = 'Infinity';
        if (s < 0) str = '-' + str;
      } else {
        str = 'NaN';
      }
    } else {
      if (b == null) {
        str = e <= TO_EXP_NEG || e >= TO_EXP_POS
         ? toExponential(coeffToString(n.c), e)
         : toFixedPoint(coeffToString(n.c), e, '0');
      } else {
        intCheck(b, 2, ALPHABET.length, 'Base');
        str = convertBase(toFixedPoint(coeffToString(n.c), e, '0'), 10, b, s, true);
      }

      if (s < 0 && n.c[0]) str = '-' + str;
    }

    return str;
  };


  /*
   * Return as toString, but do not accept a base argument, and include the minus sign for
   * negative zero.
   */
  P.valueOf = P.toJSON = function () {
    return valueOf(this);
  };


  P._isBigNumber = true;

  if (configObject != null) BigNumber.set(configObject);

  return BigNumber;
}


// PRIVATE HELPER FUNCTIONS

// These functions don't need access to variables,
// e.g. DECIMAL_PLACES, in the scope of the `clone` function above.


function bitFloor(n) {
  var i = n | 0;
  return n > 0 || n === i ? i : i - 1;
}


// Return a coefficient array as a string of base 10 digits.
function coeffToString(a) {
  var s, z,
    i = 1,
    j = a.length,
    r = a[0] + '';

  for (; i < j;) {
    s = a[i++] + '';
    z = LOG_BASE - s.length;
    for (; z--; s = '0' + s);
    r += s;
  }

  // Determine trailing zeros.
  for (j = r.length; r.charCodeAt(--j) === 48;);

  return r.slice(0, j + 1 || 1);
}


// Compare the value of BigNumbers x and y.
function compare(x, y) {
  var a, b,
    xc = x.c,
    yc = y.c,
    i = x.s,
    j = y.s,
    k = x.e,
    l = y.e;

  // Either NaN?
  if (!i || !j) return null;

  a = xc && !xc[0];
  b = yc && !yc[0];

  // Either zero?
  if (a || b) return a ? b ? 0 : -j : i;

  // Signs differ?
  if (i != j) return i;

  a = i < 0;
  b = k == l;

  // Either Infinity?
  if (!xc || !yc) return b ? 0 : !xc ^ a ? 1 : -1;

  // Compare exponents.
  if (!b) return k > l ^ a ? 1 : -1;

  j = (k = xc.length) < (l = yc.length) ? k : l;

  // Compare digit by digit.
  for (i = 0; i < j; i++) if (xc[i] != yc[i]) return xc[i] > yc[i] ^ a ? 1 : -1;

  // Compare lengths.
  return k == l ? 0 : k > l ^ a ? 1 : -1;
}


/*
 * Check that n is a primitive number, an integer, and in range, otherwise throw.
 */
function intCheck(n, min, max, name) {
  if (n < min || n > max || n !== mathfloor(n)) {
    throw Error
     (bignumberError + (name || 'Argument') + (typeof n == 'number'
       ? n < min || n > max ? ' out of range: ' : ' not an integer: '
       : ' not a primitive number: ') + String(n));
  }
}


// Assumes finite n.
function isOdd(n) {
  var k = n.c.length - 1;
  return bitFloor(n.e / LOG_BASE) == k && n.c[k] % 2 != 0;
}


function toExponential(str, e) {
  return (str.length > 1 ? str.charAt(0) + '.' + str.slice(1) : str) +
   (e < 0 ? 'e' : 'e+') + e;
}


function toFixedPoint(str, e, z) {
  var len, zs;

  // Negative exponent?
  if (e < 0) {

    // Prepend zeros.
    for (zs = z + '.'; ++e; zs += z);
    str = zs + str;

  // Positive exponent
  } else {
    len = str.length;

    // Append zeros.
    if (++e > len) {
      for (zs = z, e -= len; --e; zs += z);
      str += zs;
    } else if (e < len) {
      str = str.slice(0, e) + '.' + str.slice(e);
    }
  }

  return str;
}

(typeof globalThis !== 'undefined' ? globalThis :
  typeof window !== 'undefined' ? window : self).BigNumber = BigNumber;
})();

},{}],3:[function(require,module,exports){
(function (Buffer){(function (){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

var K_MAX_LENGTH = 0x7fffffff
exports.kMaxLength = K_MAX_LENGTH

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
 *               implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * We report that the browser does not support typed arrays if the are not subclassable
 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
 * for __proto__ and has a buggy typed array implementation.
 */
Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport()

if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
    typeof console.error === 'function') {
  console.error(
    'This browser lacks typed array (Uint8Array) support which is required by ' +
    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
  )
}

function typedArraySupport () {
  // Can typed array instances can be augmented?
  try {
    var arr = new Uint8Array(1)
    arr.__proto__ = { __proto__: Uint8Array.prototype, foo: function () { return 42 } }
    return arr.foo() === 42
  } catch (e) {
    return false
  }
}

Object.defineProperty(Buffer.prototype, 'parent', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.buffer
  }
})

Object.defineProperty(Buffer.prototype, 'offset', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.byteOffset
  }
})

function createBuffer (length) {
  if (length > K_MAX_LENGTH) {
    throw new RangeError('The value "' + length + '" is invalid for option "size"')
  }
  // Return an augmented `Uint8Array` instance
  var buf = new Uint8Array(length)
  buf.__proto__ = Buffer.prototype
  return buf
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new TypeError(
        'The "string" argument must be of type string. Received type number'
      )
    }
    return allocUnsafe(arg)
  }
  return from(arg, encodingOrOffset, length)
}

// Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
if (typeof Symbol !== 'undefined' && Symbol.species != null &&
    Buffer[Symbol.species] === Buffer) {
  Object.defineProperty(Buffer, Symbol.species, {
    value: null,
    configurable: true,
    enumerable: false,
    writable: false
  })
}

Buffer.poolSize = 8192 // not used by this implementation

function from (value, encodingOrOffset, length) {
  if (typeof value === 'string') {
    return fromString(value, encodingOrOffset)
  }

  if (ArrayBuffer.isView(value)) {
    return fromArrayLike(value)
  }

  if (value == null) {
    throw TypeError(
      'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
      'or Array-like Object. Received type ' + (typeof value)
    )
  }

  if (isInstance(value, ArrayBuffer) ||
      (value && isInstance(value.buffer, ArrayBuffer))) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof value === 'number') {
    throw new TypeError(
      'The "value" argument must not be of type number. Received type number'
    )
  }

  var valueOf = value.valueOf && value.valueOf()
  if (valueOf != null && valueOf !== value) {
    return Buffer.from(valueOf, encodingOrOffset, length)
  }

  var b = fromObject(value)
  if (b) return b

  if (typeof Symbol !== 'undefined' && Symbol.toPrimitive != null &&
      typeof value[Symbol.toPrimitive] === 'function') {
    return Buffer.from(
      value[Symbol.toPrimitive]('string'), encodingOrOffset, length
    )
  }

  throw new TypeError(
    'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
    'or Array-like Object. Received type ' + (typeof value)
  )
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(value, encodingOrOffset, length)
}

// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
// https://github.com/feross/buffer/pull/148
Buffer.prototype.__proto__ = Uint8Array.prototype
Buffer.__proto__ = Uint8Array

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be of type number')
  } else if (size < 0) {
    throw new RangeError('The value "' + size + '" is invalid for option "size"')
  }
}

function alloc (size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(size).fill(fill, encoding)
      : createBuffer(size).fill(fill)
  }
  return createBuffer(size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(size, fill, encoding)
}

function allocUnsafe (size) {
  assertSize(size)
  return createBuffer(size < 0 ? 0 : checked(size) | 0)
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(size)
}

function fromString (string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('Unknown encoding: ' + encoding)
  }

  var length = byteLength(string, encoding) | 0
  var buf = createBuffer(length)

  var actual = buf.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    buf = buf.slice(0, actual)
  }

  return buf
}

function fromArrayLike (array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  var buf = createBuffer(length)
  for (var i = 0; i < length; i += 1) {
    buf[i] = array[i] & 255
  }
  return buf
}

function fromArrayBuffer (array, byteOffset, length) {
  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('"offset" is outside of buffer bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('"length" is outside of buffer bounds')
  }

  var buf
  if (byteOffset === undefined && length === undefined) {
    buf = new Uint8Array(array)
  } else if (length === undefined) {
    buf = new Uint8Array(array, byteOffset)
  } else {
    buf = new Uint8Array(array, byteOffset, length)
  }

  // Return an augmented `Uint8Array` instance
  buf.__proto__ = Buffer.prototype
  return buf
}

function fromObject (obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    var buf = createBuffer(len)

    if (buf.length === 0) {
      return buf
    }

    obj.copy(buf, 0, 0, len)
    return buf
  }

  if (obj.length !== undefined) {
    if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
      return createBuffer(0)
    }
    return fromArrayLike(obj)
  }

  if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
    return fromArrayLike(obj.data)
  }
}

function checked (length) {
  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= K_MAX_LENGTH) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return b != null && b._isBuffer === true &&
    b !== Buffer.prototype // so Buffer.isBuffer(Buffer.prototype) will be false
}

Buffer.compare = function compare (a, b) {
  if (isInstance(a, Uint8Array)) a = Buffer.from(a, a.offset, a.byteLength)
  if (isInstance(b, Uint8Array)) b = Buffer.from(b, b.offset, b.byteLength)
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError(
      'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
    )
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!Array.isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (isInstance(buf, Uint8Array)) {
      buf = Buffer.from(buf)
    }
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    throw new TypeError(
      'The "string" argument must be one of type string, Buffer, or ArrayBuffer. ' +
      'Received type ' + typeof string
    )
  }

  var len = string.length
  var mustMatch = (arguments.length > 2 && arguments[2] === true)
  if (!mustMatch && len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) {
          return mustMatch ? -1 : utf8ToBytes(string).length // assume utf8
        }
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
// reliably in a browserify context because there could be multiple different
// copies of the 'buffer' package in use. This method works even for Buffer
// instances that were created from another copy of the `buffer` package.
// See: https://github.com/feross/buffer/issues/154
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.toLocaleString = Buffer.prototype.toString

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  str = this.toString('hex', 0, max).replace(/(.{2})/g, '$1 ').trim()
  if (this.length > max) str += ' ... '
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (isInstance(target, Uint8Array)) {
    target = Buffer.from(target, target.offset, target.byteLength)
  }
  if (!Buffer.isBuffer(target)) {
    throw new TypeError(
      'The "target" argument must be one of type Buffer or Uint8Array. ' +
      'Received type ' + (typeof target)
    )
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset // Coerce to Number.
  if (numberIsNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  var strLen = string.length

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (numberIsNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset >>> 0
    if (isFinite(length)) {
      length = length >>> 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
        : (firstByte > 0xBF) ? 2
          : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256))
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf = this.subarray(start, end)
  // Return an augmented `Uint8Array` instance
  newBuf.__proto__ = Buffer.prototype
  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset + 3] = (value >>> 24)
  this[offset + 2] = (value >>> 16)
  this[offset + 1] = (value >>> 8)
  this[offset] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  this[offset + 2] = (value >>> 16)
  this[offset + 3] = (value >>> 24)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!Buffer.isBuffer(target)) throw new TypeError('argument should be a Buffer')
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('Index out of range')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start

  if (this === target && typeof Uint8Array.prototype.copyWithin === 'function') {
    // Use built-in when available, missing from IE11
    this.copyWithin(targetStart, start, end)
  } else if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (var i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, end),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if ((encoding === 'utf8' && code < 128) ||
          encoding === 'latin1') {
        // Fast path: If `val` fits into a single byte, use that numeric value.
        val = code
      }
    }
  } else if (typeof val === 'number') {
    val = val & 255
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : Buffer.from(val, encoding)
    var len = bytes.length
    if (len === 0) {
      throw new TypeError('The value "' + val +
        '" is invalid for argument "value"')
    }
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node takes equal signs as end of the Base64 encoding
  str = str.split('=')[0]
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = str.trim().replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

// ArrayBuffer or Uint8Array objects from other contexts (i.e. iframes) do not pass
// the `instanceof` check but they should be treated as of that type.
// See: https://github.com/feross/buffer/issues/166
function isInstance (obj, type) {
  return obj instanceof type ||
    (obj != null && obj.constructor != null && obj.constructor.name != null &&
      obj.constructor.name === type.name)
}
function numberIsNaN (obj) {
  // For IE11 support
  return obj !== obj // eslint-disable-line no-self-compare
}

}).call(this)}).call(this,require("buffer").Buffer)
},{"base64-js":1,"buffer":3,"ieee754":4}],4:[function(require,module,exports){
/*! ieee754. BSD-3-Clause License. Feross Aboukhadijeh <https://feross.org/opensource> */
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = ((value * c) - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],5:[function(require,module,exports){
(function (process){(function (){
/*! For license information please see inspect.js.LICENSE.txt */
!function(t,e){"object"==typeof exports&&"object"==typeof module?module.exports=e():"function"==typeof define&&define.amd?define([],e):"object"==typeof exports?exports.util=e():t.util=e()}(this,()=>(()=>{"use strict";var t={562(t,e,r){function n(t){return n="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t},n(t)}function o(t,e){for(var r=0;r<e.length;r++){var n=e[r];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(t,a(n.key),n)}}function a(t){var e=function(t){if("object"!=n(t)||!t)return t;var e=t[Symbol.toPrimitive];if(void 0!==e){var r=e.call(t,"string");if("object"!=n(r))return r;throw new TypeError("@@toPrimitive must return a primitive value.")}return String(t)}(t);return"symbol"==n(e)?e:e+""}var i=r(746).ArrayPrototypeMap,c=function(){return t=function t(){!function(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}(this,t)},e=[{key:"hexSlice",value:function(){var t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:0,e=arguments.length>1?arguments[1]:void 0;return i(this.slice(t,e),function(t){return("00"+t.toString(16)).slice(-2)}).join("")}}],e&&o(t.prototype,e),Object.defineProperty(t,"prototype",{writable:!1}),t;var t,e}();e.h=c},622(t,e,r){function n(t){return function(t){if(Array.isArray(t))return c(t)}(t)||function(t){if("undefined"!=typeof Symbol&&null!=t[Symbol.iterator]||null!=t["@@iterator"])return Array.from(t)}(t)||i(t)||function(){throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}()}function o(t){return o="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t},o(t)}function a(t,e){var r="undefined"!=typeof Symbol&&t[Symbol.iterator]||t["@@iterator"];if(!r){if(Array.isArray(t)||(r=i(t))||e&&t&&"number"==typeof t.length){r&&(t=r);var n=0,o=function(){};return{s:o,n:function(){return n>=t.length?{done:!0}:{done:!1,value:t[n++]}},e:function(t){throw t},f:o}}throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}var a,c=!0,u=!1;return{s:function(){r=r.call(t)},n:function(){var t=r.next();return c=t.done,t},e:function(t){u=!0,a=t},f:function(){try{c||null==r.return||r.return()}finally{if(u)throw a}}}}function i(t,e){if(t){if("string"==typeof t)return c(t,e);var r={}.toString.call(t).slice(8,-1);return"Object"===r&&t.constructor&&(r=t.constructor.name),"Map"===r||"Set"===r?Array.from(t):"Arguments"===r||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(r)?c(t,e):void 0}}function c(t,e){(null==e||e>t.length)&&(e=t.length);for(var r=0,n=Array(e);r<e;r++)n[r]=t[r];return n}function u(t,e){var r=Object.keys(t);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(t);e&&(n=n.filter(function(e){return Object.getOwnPropertyDescriptor(t,e).enumerable})),r.push.apply(r,n)}return r}function l(t){for(var e=1;e<arguments.length;e++){var r=null!=arguments[e]?arguments[e]:{};e%2?u(Object(r),!0).forEach(function(e){f(t,e,r[e])}):Object.getOwnPropertyDescriptors?Object.defineProperties(t,Object.getOwnPropertyDescriptors(r)):u(Object(r)).forEach(function(e){Object.defineProperty(t,e,Object.getOwnPropertyDescriptor(r,e))})}return t}function f(t,e,r){return(e=function(t){var e=function(t){if("object"!=o(t)||!t)return t;var e=t[Symbol.toPrimitive];if(void 0!==e){var r=e.call(t,"string");if("object"!=o(r))return r;throw new TypeError("@@toPrimitive must return a primitive value.")}return String(t)}(t);return"symbol"==o(e)?e:e+""}(e))in t?Object.defineProperty(t,e,{value:r,enumerable:!0,configurable:!0,writable:!0}):t[e]=r,t}var s,y,p,g=r(746),v=g.AggregateError,h=g.AggregateErrorPrototype,d=g.Array,b=g.ArrayBuffer,m=g.ArrayBufferPrototype,S=g.ArrayIsArray,P=g.ArrayPrototype,w=g.ArrayPrototypeFilter,x=g.ArrayPrototypeForEach,A=g.ArrayPrototypeIncludes,O=g.ArrayPrototypeIndexOf,j=g.ArrayPrototypeJoin,_=g.ArrayPrototypeMap,E=g.ArrayPrototypePop,k=g.ArrayPrototypePush,I=g.ArrayPrototypePushApply,R=g.ArrayPrototypeSlice,L=g.ArrayPrototypeSort,T=g.ArrayPrototypeSplice,B=g.ArrayPrototypeUnshift,z=g.BigIntPrototypeValueOf,M=g.Boolean,C=g.BooleanPrototype,D=g.BooleanPrototypeValueOf,N=g.DataView,F=g.DataViewPrototype,W=g.Date,H=g.DatePrototype,U=g.DatePrototypeGetTime,G=g.DatePrototypeToISOString,V=g.DatePrototypeToString,Z=g.Error,$=g.ErrorPrototype,Y=g.ErrorPrototypeToString,q=g.Function,J=g.FunctionPrototype,K=g.FunctionPrototypeBind,Q=g.FunctionPrototypeCall,X=g.FunctionPrototypeSymbolHasInstance,tt=g.FunctionPrototypeToString,et=g.JSONStringify,rt=g.Map,nt=g.MapPrototype,ot=g.MapPrototypeEntries,at=g.MapPrototypeGetSize,it=g.MathFloor,ct=g.MathMax,ut=g.MathMin,lt=g.MathRound,ft=g.MathSqrt,st=g.MathTrunc,yt=g.Number,pt=g.NumberIsFinite,gt=g.NumberIsNaN,vt=g.NumberParseFloat,ht=g.NumberParseInt,dt=g.NumberPrototype,bt=g.NumberPrototypeToString,mt=g.NumberPrototypeValueOf,St=g.Object,Pt=g.ObjectAssign,wt=g.ObjectDefineProperty,xt=g.ObjectGetOwnPropertyDescriptor,At=g.ObjectGetOwnPropertyNames,Ot=g.ObjectGetOwnPropertySymbols,jt=g.ObjectGetPrototypeOf,_t=g.ObjectIs,Et=g.ObjectKeys,kt=g.ObjectPrototype,It=g.ObjectPrototypeHasOwnProperty,Rt=g.ObjectPrototypePropertyIsEnumerable,Lt=g.ObjectPrototypeToString,Tt=g.ObjectSeal,Bt=g.ObjectSetPrototypeOf,zt=g.Promise,Mt=g.PromisePrototype,Ct=g.RangeError,Dt=g.RangeErrorPrototype,Nt=g.ReflectApply,Ft=g.ReflectOwnKeys,Wt=g.RegExp,Ht=g.RegExpPrototype,Ut=g.RegExpPrototypeExec,Gt=g.RegExpPrototypeSymbolReplace,Vt=g.RegExpPrototypeSymbolSplit,Zt=g.RegExpPrototypeToString,$t=g.SafeMap,Yt=g.SafeSet,qt=g.SafeStringIterator,Jt=g.Set,Kt=g.SetPrototype,Qt=g.SetPrototypeGetSize,Xt=g.SetPrototypeValues,te=g.String,ee=g.StringPrototype,re=g.StringPrototypeCharCodeAt,ne=g.StringPrototypeCodePointAt,oe=g.StringPrototypeEndsWith,ae=g.StringPrototypeIncludes,ie=g.StringPrototypeIndexOf,ce=g.StringPrototypeLastIndexOf,ue=g.StringPrototypeNormalize,le=g.StringPrototypePadEnd,fe=g.StringPrototypePadStart,se=g.StringPrototypeRepeat,ye=g.StringPrototypeReplace,pe=g.StringPrototypeReplaceAll,ge=g.StringPrototypeSlice,ve=g.StringPrototypeSplit,he=g.StringPrototypeStartsWith,de=g.StringPrototypeToLowerCase,be=g.StringPrototypeValueOf,me=g.SymbolIterator,Se=g.SymbolPrototypeToString,Pe=g.SymbolPrototypeValueOf,we=g.SymbolToPrimitive,xe=g.SymbolToStringTag,Ae=g.TypeError,Oe=g.TypeErrorPrototype,je=g.TypedArray,_e=g.TypedArrayPrototype,Ee=g.TypedArrayPrototypeGetLength,ke=g.TypedArrayPrototypeGetSymbolToStringTag,Ie=g.Uint8Array,Re=g.WeakMap,Le=g.WeakMapPrototype,Te=g.WeakSet,Be=g.WeakSetPrototype,ze=g.globalThis,Me=g.internalBinding,Ce=g.uncurryThis,De=r(916),Ne=De.constants,Fe=Ne.ALL_PROPERTIES,We=Ne.ONLY_ENUMERABLE,He=Ne.kPending,Ue=Ne.kRejected,Ge=De.getOwnNonIndexProperties,Ve=De.getPromiseDetails,Ze=De.getProxyDetails,$e=De.previewEntries,Ye=De.getConstructorName,qe=De.getExternalValue,Je=De.Proxy,Ke=r(48),Qe=Ke.customInspectSymbol,Xe=Ke.isError,tr=Ke.join,er=Ke.removeColors,rr=r(27).isStackOverflowError,nr=r(326),or=nr.isAsyncFunction,ar=nr.isGeneratorFunction,ir=nr.isAnyArrayBuffer,cr=nr.isArrayBuffer,ur=nr.isArgumentsObject,lr=nr.isBoxedPrimitive,fr=nr.isDataView,sr=nr.isExternal,yr=nr.isMap,pr=nr.isMapIterator,gr=nr.isModuleNamespaceObject,vr=nr.isNativeError,hr=nr.isPromise,dr=nr.isSet,br=nr.isSetIterator,mr=nr.isWeakMap,Sr=nr.isWeakSet,Pr=nr.isRegExp,wr=nr.isDate,xr=nr.isTypedArray,Ar=nr.isStringObject,Or=nr.isNumberObject,jr=nr.isBooleanObject,_r=nr.isBigIntObject,Er=r(266),kr=r(588).BuiltinModule,Ir=r(903),Rr=Ir.validateObject,Lr=Ir.validateString,Tr=Ir.kValidateObjectAllowArray;function Br(t){return(y=y||r(287)).pathToFileURL(t).href}var zr,Mr=new Yt(w(At(ze),function(t){return null!==Ut(/^[A-Z][a-zA-Z0-9]+$/,t)})),Cr=function(t){return void 0===t&&void 0!==t},Dr=Tt({showHidden:!1,depth:2,colors:!1,customInspect:!0,showProxy:!1,maxArrayLength:100,maxStringLength:1e4,breakLength:80,compact:3,sorted:!1,getters:!1,numericSeparator:!1}),Nr=/[\x00-\x1f\x27\x5c\x7f-\x9f]|[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/,Fr=/[\x00-\x1f\x27\x5c\x7f-\x9f]|[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/g,Wr=/[\x00-\x1f\x5c\x7f-\x9f]|[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/,Hr=/[\x00-\x1f\x5c\x7f-\x9f]|[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/g,Ur=/^[a-zA-Z_][a-zA-Z_0-9]*$/,Gr=/^(0|[1-9][0-9]*)$/,Vr=/^ {4}at (?:[^/\\(]+ \(|)node:(.+):\d+:\d+\)?$/,Zr=/^(\s+[^(]*?)\s*{/,$r=/(\/\/.*?\n)|(\/\*(.|\n)*?\*\/)/g,Yr=["\\x00","\\x01","\\x02","\\x03","\\x04","\\x05","\\x06","\\x07","\\b","\\t","\\n","\\x0B","\\f","\\r","\\x0E","\\x0F","\\x10","\\x11","\\x12","\\x13","\\x14","\\x15","\\x16","\\x17","\\x18","\\x19","\\x1A","\\x1B","\\x1C","\\x1D","\\x1E","\\x1F","","","","","","","","\\'","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","\\\\","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","\\x7F","\\x80","\\x81","\\x82","\\x83","\\x84","\\x85","\\x86","\\x87","\\x88","\\x89","\\x8A","\\x8B","\\x8C","\\x8D","\\x8E","\\x8F","\\x90","\\x91","\\x92","\\x93","\\x94","\\x95","\\x96","\\x97","\\x98","\\x99","\\x9A","\\x9B","\\x9C","\\x9D","\\x9E","\\x9F"],qr=new Wt("[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/\\#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/\\#&.:=?%@~_]*)*)?(?:\\u0007|\\u001B\\u005C|\\u009C))|(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-nq-uy=><~]))","g");function Jr(t,e){var r={budget:{},indentationLvl:0,seen:[],currentDepth:0,stylize:an,showHidden:Dr.showHidden,depth:Dr.depth,colors:Dr.colors,customInspect:Dr.customInspect,showProxy:Dr.showProxy,maxArrayLength:Dr.maxArrayLength,maxStringLength:Dr.maxStringLength,breakLength:Dr.breakLength,compact:Dr.compact,sorted:Dr.sorted,getters:Dr.getters,numericSeparator:Dr.numericSeparator};if(arguments.length>1)if(arguments.length>2&&(void 0!==arguments[2]&&(r.depth=arguments[2]),arguments.length>3&&void 0!==arguments[3]&&(r.colors=arguments[3])),"boolean"==typeof e)r.showHidden=e;else if(e)for(var n=Et(e),o=0;o<n.length;++o){var a=n[o];It(Dr,a)||"stylize"===a?r[a]=e[a]:void 0===r.userOptions&&(r.userOptions=e)}return r.colors&&(r.stylize=on),null===r.maxArrayLength&&(r.maxArrayLength=1/0),null===r.maxStringLength&&(r.maxStringLength=1/0),vn(r,t,0)}Jr.custom=Qe,wt(Jr,"defaultOptions",{__proto__:null,get:function(){return Dr},set:function(t){return Rr(t,"options"),Pt(Dr,t)}});var Kr=39,Qr=49;function Xr(t,e){wt(Jr.colors,e,{__proto__:null,get:function(){return this[t]},set:function(e){this[t]=e},configurable:!0,enumerable:!1})}Jr.colors={__proto__:null,reset:[0,0],bold:[1,22],dim:[2,22],italic:[3,23],underline:[4,24],blink:[5,25],inverse:[7,27],hidden:[8,28],strikethrough:[9,29],doubleunderline:[21,24],black:[30,Kr],red:[31,Kr],green:[32,Kr],yellow:[33,Kr],blue:[34,Kr],magenta:[35,Kr],cyan:[36,Kr],white:[37,Kr],bgBlack:[40,Qr],bgRed:[41,Qr],bgGreen:[42,Qr],bgYellow:[43,Qr],bgBlue:[44,Qr],bgMagenta:[45,Qr],bgCyan:[46,Qr],bgWhite:[47,Qr],framed:[51,54],overlined:[53,55],gray:[90,Kr],redBright:[91,Kr],greenBright:[92,Kr],yellowBright:[93,Kr],blueBright:[94,Kr],magentaBright:[95,Kr],cyanBright:[96,Kr],whiteBright:[97,Kr],bgGray:[100,Qr],bgRedBright:[101,Qr],bgGreenBright:[102,Qr],bgYellowBright:[103,Qr],bgBlueBright:[104,Qr],bgMagentaBright:[105,Qr],bgCyanBright:[106,Qr],bgWhiteBright:[107,Qr]},Xr("gray","grey"),Xr("gray","blackBright"),Xr("bgGray","bgGrey"),Xr("bgGray","bgBlackBright"),Xr("dim","faint"),Xr("strikethrough","crossedout"),Xr("strikethrough","strikeThrough"),Xr("strikethrough","crossedOut"),Xr("hidden","conceal"),Xr("inverse","swapColors"),Xr("inverse","swapcolors"),Xr("doubleunderline","doubleUnderline"),Jr.styles=Pt({__proto__:null},{special:"cyan",number:"yellow",bigint:"yellow",boolean:"yellow",undefined:"grey",null:"bold",string:"green",symbol:"green",date:"magenta",regexp:function t(e){var r,n="",o=0,a=0,i=!1,c=((null===(r=t.colors)||void 0===r?void 0:r.length)>0?t.colors:tn).reduce(function(t,e){var r=Jr.colors[e];return r&&t.push(["[".concat(r[0],"m"),"[".concat(r[1],"m")]),t},[]);function u(t,r){var n=arguments.length>2&&void 0!==arguments[2]?arguments[2]:1,i="";for(o++;o<e.length&&e[o]!==r;)i+=e[o++];o<e.length?(a-=n,l(t),f(i,1,1),l(r),a+=n):f(t,1,-i.length)}var l=function(t){var e,r=a%c.length,o=null!==(e=c[r])&&void 0!==e?e:c[0];return n+=o[0]+t+o[1],r};function f(t,e,r){a+=e,l(t),a-=e,o+=r}for(l("/"),a++,o=1;o<e.length;){var s=e[o];if(i)if("\\"===s){var y="\\";if(++o<e.length){var p=(y+=e[o++])[1];if("u"===p&&"{"===e[o]){u("".concat(y,"{"),"}",0);continue}if(("p"===p||"P"===p)&&"{"===e[o]){u("".concat(y,"{"),"}",0);continue}"x"===y[1]&&(y+=e.slice(o,o+2),o+=2)}l(y)}else"]"===s?(a--,l("]"),o++,i=!1):"-"===s&&"["!==e[o-1]&&o+1<e.length&&"]"!==e[o+1]?f("-",1,1):(l(s),o++);else if("["===s)l("["),a++,o++,i=!0;else if("("===s){if(l("("),a++,++o<e.length&&"?"===e[o]){var g=++o<e.length?e[o]:"";if(":"===g||"="===g||"!"===g)f("?".concat(g),-1,1);else{var v=o+1<e.length?e[o+1]:"";if("<"!==g||"="!==v&&"!"!==v)if("<"===g){for(var h=++o;o<e.length&&">"!==e[o];)o++;var d=e.slice(h,o);o<e.length&&">"===e[o]?(a--,l("?<"),f(d,1,0),l(">"),a++,o++):(f("?<",-1,0),l(d))}else l("?");else f("?<".concat(v),-1,2)}}}else if(")"===s)a--,l(")"),o++;else if("\\"===s){var b="\\";if(++o<e.length){var m=(b+=e[o++])[1];if(o<e.length){if("u"===m&&"{"===e[o]){u("".concat(b,"{"),"}",0);continue}if("x"===m)b+=e.slice(o,o+2),o+=2;else if(m>="0"&&m<="9")for(;o<e.length&&e[o]>="0"&&e[o]<="9";)b+=e[o++];else{if("k"===m&&"<"===e[o]){u("".concat(b,"<"),">");continue}if(("p"===m||"P"===m)&&"{"===e[o]){u("".concat(b,"{"),"}",0);continue}}}}f(b,1,0)}else if("|"===s||"+"===s||"*"===s||"?"===s||","===s||"^"===s||"$"===s)f(s,3,1);else if("{"===s){o++;for(var S="";o<e.length&&e[o]>="0"&&e[o]<="9";)S+=e[o++];if(S&&(l("{"),a++,f(S,1,0)),o<e.length)if(","===e[o])S||(l("{"),a++),l(","),o++;else if(!S){a+=1,l("{"),a-=1;continue}for(var P="";o<e.length&&e[o]>="0"&&e[o]<="9";)P+=e[o++];P&&f(P,1,0),o<e.length&&"}"===e[o]&&(a--,l("}"),o++),o<e.length&&"?"===e[o]&&f("?",3,1)}else if("."===s)f(s,2,1);else{if("/"===s)break;f(s,1,1)}}return f("/",-1,1),o<e.length&&l(e.slice(o)),n},module:"underline"}),Jr.styles.regexp.colors=["green","red","yellow","cyan","magenta"];var tn=Jr.styles.regexp.colors.slice();function en(t,e){return-1===e?'"'.concat(t,'"'):-2===e?"`".concat(t,"`"):"'".concat(t,"'")}function rn(t){var e=re(t);return Yr.length>e?Yr[e]:"\\u".concat(bt(e,16))}function nn(t){var e=Nr,r=Fr,n=39;if(ae(t,"'")&&(ae(t,'"')?ae(t,"`")||ae(t,"${")||(n=-2):n=-1,39!==n&&(e=Wr,r=Hr)),t.length<5e3&&null===Ut(e,t))return en(t,n);if(t.length>100)return en(t=Gt(r,t,rn),n);for(var o="",a=0,i=0;i<t.length;i++){var c=re(t,i);if(c===n||92===c||c<32||c>126&&c<160)o+=a===i?Yr[c]:"".concat(ge(t,a,i)).concat(Yr[c]),a=i+1;else if(c>=55296&&c<=57343){if(c<=56319&&i+1<t.length){var u=re(t,i+1);if(u>=56320&&u<=57343){i++;continue}}o+="".concat(ge(t,a,i),"\\u").concat(bt(c,16)),a=i+1}}return a!==t.length&&(o+=ge(t,a)),en(o,n)}function on(t,e){var r=Jr.styles[e];if(void 0!==r){var n=Jr.colors[r];if(void 0!==n)return"[".concat(n[0],"m").concat(t,"[").concat(n[1],"m");if("function"==typeof r)return r(t)}return t}function an(t){return t}function cn(){return[]}function un(t,e){try{return t instanceof e}catch(t){return!1}}var ln=(new $t).set(P,{name:"Array",constructor:d}).set(m,{name:"ArrayBuffer",constructor:b}).set(J,{name:"Function",constructor:q}).set(nt,{name:"Map",constructor:rt}).set(Kt,{name:"Set",constructor:Jt}).set(kt,{name:"Object",constructor:St}).set(_e,{name:"TypedArray",constructor:je}).set(Ht,{name:"RegExp",constructor:Wt}).set(H,{name:"Date",constructor:W}).set(F,{name:"DataView",constructor:N}).set($,{name:"Error",constructor:Z}).set(h,{name:"AggregateError",constructor:v}).set(Dt,{name:"RangeError",constructor:Ct}).set(Oe,{name:"TypeError",constructor:Ae}).set(C,{name:"Boolean",constructor:M}).set(dt,{name:"Number",constructor:yt}).set(ee,{name:"String",constructor:te}).set(Mt,{name:"Promise",constructor:zt}).set(Le,{name:"WeakMap",constructor:Re}).set(Be,{name:"WeakSet",constructor:Te});function fn(t,e,r,n){for(var o,a=t;t||Cr(t);){var i=ln.get(t);if(void 0!==i){var c=i.name,u=i.constructor;if(X(u,a))return void 0!==n&&o!==t&&sn(e,a,o||a,r,n),c}var f=xt(t,"constructor");if(void 0!==f&&"function"==typeof f.value&&""!==f.value.name&&un(a,f.value))return void 0===n||o===t&&Mr.has(f.value.name)||sn(e,a,o||a,r,n),te(f.value.name);t=jt(t),void 0===o&&(o=t)}if(null===o)return null;var s=Ye(a);if(r>e.depth&&null!==e.depth)return"".concat(s," <Complex prototype>");var y=fn(o,e,r+1,n);return null===y?"".concat(s," <").concat(Jr(o,l(l({},e),{},{customInspect:!1,depth:-1})),">"):"".concat(s," <").concat(y,">")}function sn(t,e,r,n,o){var i,c,u=0;do{if(0!==u||e===r){if(null===(r=jt(r)))return;var l=xt(r,"constructor");if(void 0!==l&&"function"==typeof l.value&&Mr.has(l.value.name))return}0===u?c=new Yt:x(i,function(t){return c.add(t)}),i=Ft(r),k(t.seen,e);var f,s=a(i);try{for(s.s();!(f=s.n()).done;){var y=f.value;if(!("constructor"===y||It(e,y)||0!==u&&c.has(y))){var p=xt(r,y);if("function"!=typeof p.value){var g=Wn(t,r,n,y,0,p,e);t.colors?k(o,"[2m".concat(g,"[22m")):k(o,g)}}}}catch(t){s.e(t)}finally{s.f()}E(t.seen)}while(3!==++u)}function yn(t,e,r){var n=arguments.length>3&&void 0!==arguments[3]?arguments[3]:"";if(null===t)return""!==e&&r!==e?"[".concat(r).concat(n,": null prototype] [").concat(e,"] "):"[".concat(r).concat(n,": null prototype] ");var o="".concat(t).concat(n," ");if(""!==e){var a=t.indexOf(e);if(-1===a)o+="[".concat(e,"] ");else{var i=a+e.length;i!==t.length&&t[i]===t[i].toLowerCase()&&(o+="[".concat(e,"] "))}}return o}function pn(t,e){var r,n=Ot(t);if(e)r=At(t),0!==n.length&&I(r,n);else{try{r=Et(t)}catch(e){Er(vr(e)&&"ReferenceError"===e.name&&gr(t)),r=At(t)}0!==n.length&&I(r,w(n,function(e){return Rt(t,e)}))}return r}function gn(t,e,r){var n="";return null===e&&(n=Ye(t))===r&&(n="Object"),yn(e,r,n)}function vn(t,e,i,c){if("object"!==o(e)&&"function"!=typeof e&&!Cr(e))return On(t.stylize,e,t);if(null===e)return t.stylize("null","null");var u=e,s=Ze(e,!!t.showProxy);if(void 0!==s){if(null===s||null===s[0])return t.stylize("<Revoked Proxy>","special");if(t.showProxy)return function(t,e,r){if(r>t.depth&&null!==t.depth)return t.stylize("Proxy [Array]","special");r+=1,t.indentationLvl+=2;var n=[vn(t,e[0],r),vn(t,e[1],r)];return t.indentationLvl-=2,Un(t,n,"",["Proxy [","]"],2,r)}(t,s,i);e=s}if(t.customInspect){var v,h=e[Qe];if("function"==typeof h&&h!==Jr&&(null===(v=xt(e,"constructor"))||void 0===v||null===(v=v.value)||void 0===v?void 0:v.prototype)!==e){var d=null===t.depth?null:t.depth-i,b=void 0!==s||!X(St,u),m=Q(h,u,d,function(t,e){var r=l({stylize:t.stylize,showHidden:t.showHidden,depth:t.depth,colors:t.colors,customInspect:t.customInspect,showProxy:t.showProxy,maxArrayLength:t.maxArrayLength,maxStringLength:t.maxStringLength,breakLength:t.breakLength,compact:t.compact,sorted:t.sorted,getters:t.getters,numericSeparator:t.numericSeparator},t.userOptions);if(e){Bt(r,null);var n,i=a(Et(r));try{for(i.s();!(n=i.n()).done;){var c=n.value;"object"!==o(r[c])&&"function"!=typeof r[c]||null===r[c]||delete r[c]}}catch(t){i.e(t)}finally{i.f()}r.stylize=Bt(function(e,r){var n;try{n="".concat(t.stylize(e,r))}catch(t){}return"string"!=typeof n?e:n},null)}return r}(t,b),Jr);if(m!==u)return"string"!=typeof m?vn(t,m,i):pe(m,"\n","\n".concat(se(" ",t.indentationLvl)))}}if(t.seen.includes(e)){var P=1;return void 0===t.circular?(t.circular=new $t,t.circular.set(e,P)):void 0===(P=t.circular.get(e))&&(P=t.circular.size+1,t.circular.set(e,P)),t.stylize("[Circular *".concat(P,"]"),"special")}return function(t,e,o,i){var c,u;t.showHidden&&(o<=t.depth||null===t.depth)&&(u=[]);var l=fn(e,t,o,u);void 0!==u&&0===u.length&&(u=void 0);var s="";try{s=e[xe]}catch(t){}("string"!=typeof s||""!==s&&(t.showHidden?It:Rt)(e,xe))&&(s="");var v,h,d,b,m="",P=cn,w=!0,x=t.showHidden?Fe:We,_=0;if(me in e||null===l)if(w=!1,S(e)){var E="Array"!==l||""!==s?yn(l,s,"Array","(".concat(e.length,")")):"";if(c=Ge(e,x),v=["".concat(E,"["),"]"],0===e.length&&0===c.length&&void 0===u)return"".concat(v[0],"]");_=2,P=kn}else if(dr(e)){var M=Qt(e),C=yn(l,s,"Set","(".concat(M,")"));if(c=pn(e,t.showHidden),P=K(Rn,null,null!==l?e:Xt(e)),0===M&&0===c.length&&void 0===u)return"".concat(C,"{}");v=["".concat(C,"{"),"}"]}else if(yr(e)){var N=at(e),F=yn(l,s,"Map","(".concat(N,")"));if(c=pn(e,t.showHidden),P=K(Ln,null,null!==l?e:ot(e)),0===N&&0===c.length&&void 0===u)return"".concat(F,"{}");v=["".concat(F,"{"),"}"]}else if(xr(e)){c=Ge(e,x);var W=e,H="";null===l&&(H=ke(e),W=new g[H](e));var Z=Ee(e),$=yn(l,s,H,"(".concat(Z,")"));if(v=["".concat($,"["),"]"],0===e.length&&0===c.length&&!t.showHidden)return"".concat(v[0],"]");P=K(In,null,W,Z),_=2,t.showHidden&&(d=["BYTES_PER_ELEMENT","length","byteLength","byteOffset","buffer"],i=!0)}else pr(e)?(c=pn(e,t.showHidden),v=hn("Map",s),P=K(Dn,null,v)):br(e)?(c=pn(e,t.showHidden),v=hn("Set",s),P=K(Dn,null,v)):w=!0;if(w)if(c=pn(e,t.showHidden),v=["{","}"],"function"==typeof e){if(m=function(t,e,r,n){var o=tt(e);if(he(o,"class")&&"}"===o[o.length-1]){var a=ge(o,5,-1),i=ie(a,"{");if(-1!==i&&(!ae(ge(a,0,i),"(")||null!==Ut(Zr,Gt($r,a))))return function(t,e,r){var n=It(t,"name")&&t.name||"(anonymous)",o="class ".concat(n);if("Function"!==e&&null!==e&&(o+=" [".concat(e,"]")),""!==r&&e!==r&&(o+=" [".concat(r,"]")),null!==e){var a=jt(t).name;a&&(o+=" extends ".concat(a))}else o+=" extends [null prototype]";return"[".concat(o,"]")}(e,r,n)}var c="Function";ar(e)&&(c="Generator".concat(c)),or(e)&&(c="Async".concat(c));var u="[".concat(c);return null===r&&(u+=" (null prototype)"),""===e.name?u+=" (anonymous)":u+=": ".concat("string"==typeof e.name?e.name:vn(t,e.name)),u+="]",r!==c&&null!==r&&(u+=" ".concat(r)),""!==n&&r!==n&&(u+=" [".concat(n,"]")),u}(t,e,l,s),0===c.length&&void 0===u)return t.stylize(m,"special")}else if("Object"===l){if(ur(e)?v[0]="[Arguments] {":""!==s&&(v[0]="".concat(yn(l,s,"Object"),"{")),0===c.length&&void 0===u)return"".concat(v[0],"}")}else if(Pr(e)){m=Zt(null!==l?e:new Wt(e));var Y=yn(l,s,"RegExp");if("RegExp "!==Y&&(m="".concat(Y).concat(m)),m=t.stylize(m,"regexp"),0===c.length&&void 0===u||o>t.depth&&null!==t.depth)return m}else if(wr(e)){m=gt(U(e))?V(e):G(e);var q=yn(l,s,"Date");if("Date "!==q&&(m="".concat(q).concat(m)),0===c.length&&void 0===u)return t.stylize(m,"date")}else if(Xe(e)){if(m=function(t,e,r,o,i){var c,u,l;try{l=bn(o,t)}catch(e){return Lt(t)}var f=!1;try{c=t.message}catch(t){f=!0}var s=!1;try{u=t.name}catch(t){s=!0}if(!o.showHidden&&0!==i.length){var y=O(i,"stack");if(-1!==y&&T(i,y,1),!f){var p=O(i,"message");-1===p||"string"==typeof c&&!ae(l,c)||T(i,p,1)}if(!s){var g=O(i,"name");-1===g||"string"==typeof u&&!ae(l,u)||T(i,g,1)}}u=null==u?"Error":u,!It(t,"cause")||0!==i.length&&A(i,"cause")||k(i,"cause");try{var v=t.errors;!S(v)||!It(t,"errors")||0!==i.length&&A(i,"errors")||k(i,"errors")}catch(t){}l=function(t,e,r,n){var o=r.length;if("string"!=typeof r&&(t=ye(t,"".concat(r),"".concat(r," [").concat(ge(yn(e,n,"Error"),0,-1),"]"))),null===e||oe(r,"Error")&&he(t,r)&&(t.length===o||":"===t[o]||"\n"===t[o])){var a="Error";if(null===e){var i=Ut(/^([A-Z][a-z_ A-Z0-9[\]()-]+)(?::|\n {4}at)/,t)||Ut(/^([a-z_A-Z0-9-]*Error)$/,t);o=(a=(null==i?void 0:i[1])||"").length,a=a||"Error"}var c=ge(yn(e,n,a),0,-1);r!==c&&(t=ae(c,r)?0===o?"".concat(c,": ").concat(t):"".concat(c).concat(ge(t,o)):"".concat(c," [").concat(r,"]").concat(ge(t,o)))}return t}(l,e,u,r);var h=c&&ie(l,c)||-1;-1!==h&&(h+=c.length);var d=ie(l,"\n    at",h);if(-1===d)l="[".concat(l,"]");else{var b=ge(l,0,d),m=function(t,e,r){var o,a=ve(r,"\n");try{o=e.cause}catch(t){}if(null!=o&&Xe(o)){var i=bn(t,o),c=ie(i,"\n    at");if(-1!==c){var u=dn(a,ve(ge(i,c+1),"\n")),l=u[0],f=u[1];if(l>0){var s=l-2,y="    ... ".concat(s," lines matching cause stack trace ...");a.splice(f+1,s,t.stylize(y,"undefined"))}}}if(a.length>10)for(var p=function(t){for(var e=[],r=new $t,o=0;o<t.length;o++){var a=r.get(t[o]);void 0===a?r.set(t[o],[o]):a[a.length]=o}if(t.length-r.size<=3)return e;for(var i=0;i<t.length-3;i++){var c=r.get(t[i]);if(1!==c.length&&c[c.length-1]!==i){var u=c.indexOf(i)+1;if(u!==c.length){var l=c[c.length-1]-i;if(!(l<3)){var f=void 0;if(u+1<c.length){for(var s=0,y=u;y<c.length;y++){for(var p=c[y]-i;0!==p;){var g=s%p;0!==s&&(f=f||new Yt).add(s),s=p,p=g}if(1===s)break}l=s,f&&(f.delete(l),f=n(f))}for(var v=l,h=0,d=0,b=i+l;;b+=l){for(var m=0,S=0;S<l&&t[i+S]===t[b+S];S++)m++;if(m===l)d++;else{var P;if(null===(P=f)||void 0===P||!P.length)break;0!==d&&v*h<l*d&&(v=l,h=d),l=f.pop(),b=i,d=0}}0!==h&&v*h>=l*d&&(l=v,d=h),d*l>=3&&(e.push(i+l,l,d),i+=l*(d+1)-1)}}}}return e}(a),g=p.length-3;g>=0;g-=3){var v=p[g],h=p[g+1],d=p[g+2],b="    ... collapsed ".concat(h*d," duplicate lines ")+"matching above "+(d>1?"".concat(h," lines ").concat(d," times..."):"lines ...");a.splice(v,h*d,t.stylize(b,"undefined"))}return a}(o,t,ge(l,d+1));if(o.colors){var P,w,x=function(){var t;try{t=process.cwd()}catch(t){return}return t}(),_=a(m);try{for(_.s();!(w=_.n()).done;){var E=w.value,I=Ut(Vr,E);if(null!==I&&kr.exists(I[1]))b+="\n".concat(o.stylize(E,"undefined"));else{if(b+="\n",E=mn(o,E),void 0!==x){var R=Sn(o,E,x);R===E&&(R=Sn(o,E,P=P||Br(x))),E=R}b+=E}}}catch(t){_.e(t)}finally{_.f()}}else b+="\n".concat(j(m,"\n"));l=b}if(0!==o.indentationLvl){var L=se(" ",o.indentationLvl);l=pe(l,"\n","\n".concat(L))}return l}(e,l,s,t,c),0===c.length&&void 0===u)return m}else if(ir(e)){var J=yn(l,s,cr(e)?"ArrayBuffer":"SharedArrayBuffer");if(void 0===i)P=En;else if(0===c.length&&void 0===u)return J+"{ [byteLength]: ".concat(xn(t.stylize,e.byteLength,!1)," }");v[0]="".concat(J,"{"),d=["byteLength"]}else if(fr(e))v[0]="".concat(yn(l,s,"DataView"),"{"),d=["byteLength","byteOffset","buffer"];else if(hr(e))v[0]="".concat(yn(l,s,"Promise"),"{"),P=Nn;else if(Sr(e))v[0]="".concat(yn(l,s,"WeakSet"),"{"),P=t.showHidden?Mn:zn;else if(mr(e))v[0]="".concat(yn(l,s,"WeakMap"),"{"),P=t.showHidden?Cn:zn;else if(gr(e))v[0]="".concat(yn(l,s,"Module"),"{"),P=jn.bind(null,c);else if(lr(e)){if(m=function(t,e,r,n,o){var a,i;Or(t)?(a=mt,i="Number"):Ar(t)?(a=be,i="String",r.splice(0,t.length)):jr(t)?(a=D,i="Boolean"):_r(t)?(a=z,i="BigInt"):(a=Pe,i="Symbol");var c="[".concat(i);return i!==n&&(c+=null===n?" (null prototype)":" (".concat(n,")")),c+=": ".concat(On(an,a(t),e),"]"),""!==o&&o!==n&&(c+=" [".concat(o,"]")),0!==r.length||e.stylize===an?c:e.stylize(c,de(i))}(e,t,c,l,s),0===c.length&&void 0===u)return m}else if(!function(t){return y=y||r(287),"string"==typeof t.href&&t instanceof y.URL}(e)||o>t.depth&&null!==t.depth){if(0===c.length&&void 0===u){if(sr(e)){var Q=qe(e).toString(16);return t.stylize("[External: ".concat(Q,"]"),"special")}return"".concat(gn(e,l,s),"{}")}v[0]="".concat(gn(e,l,s),"{")}else if(c=function(t){return p=p||Ot(new y.URL("http://user:pass@localhost:8080/?foo=bar#baz")),t.filter(function(t){return-1===p[t]})}(c),m=e.href,0===c.length&&void 0===u)return m;if(o>t.depth&&null!==t.depth){var X=ge(gn(e,l,s),0,-1);return null!==l&&(X="[".concat(X,"]")),t.stylize(X,"special")}o+=1,t.seen.push(e),t.currentDepth=o;var et=t.indentationLvl;try{if(b=P(t,e,o),void 0!==d)for(h=0;h<d.length;h++){var rt=void 0;try{rt=Fn(t,e,o,d[h],i)}catch(r){rt=Fn(t,f({},d[h],e.buffer[d[h]]),o,d[h],i)}k(b,rt)}for(h=0;h<c.length;h++)k(b,Wn(t,e,o,c[h],_));void 0!==u&&I(b,u)}catch(r){if(!rr(r))throw r;return function(t,e,r,n){return t.seen.pop(),t.indentationLvl=n,t.stylize("[".concat(r,": Inspection interrupted ")+"prematurely. Maximum call stack size exceeded.]","special")}(t,0,ge(gn(e,l,s),0,-1),et)}if(void 0!==t.circular){var nt=t.circular.get(e);if(void 0!==nt){var it=t.stylize("<ref *".concat(nt,">"),"special");!0!==t.compact?m=""===m?it:"".concat(it," ").concat(m):v[0]="".concat(it," ").concat(v[0])}}if(t.seen.pop(),t.sorted){var ct=!0===t.sorted?void 0:t.sorted;if(0===_)L(b,ct);else if(c.length>1){var ut=L(R(b,b.length-c.length),ct);B(ut,b,b.length-c.length,c.length),Nt(T,null,ut)}}var lt=Un(t,b,m,v,_,o,e),ft=(t.budget[t.indentationLvl]||0)+lt.length;return t.budget[t.indentationLvl]=ft,ft>Math.pow(2,27)&&(t.depth=-1),lt}(t,e,i,c)}function hn(t,e){return e!=="".concat(t," Iterator")&&(""!==e&&(e+="] ["),e+="".concat(t," Iterator")),["[".concat(e,"] {"),"}"]}function dn(t,e){for(var r=0;r<t.length-3;r++){var n=O(e,t[r]);if(-1!==n){var o=e.length-n;if(o>3){for(var a=1,i=ut(t.length-r,o);i>a&&t[r+a]===e[n+a];)a++;if(a>3)return[a,r]}}}return[0,0]}function bn(t,e){var r;try{r=e.stack}catch(t){}if(r){if("string"==typeof r)return r;t.seen.push(e),t.indentationLvl+=4;var n=vn(t,r);return t.indentationLvl-=4,t.seen.pop(),"".concat(Y(e),"\n    ").concat(n)}return Y(e)}function mn(t,e){for(var r="",n=0,o=0;;){var a=ie(e,"node_modules",o);if(-1===a)break;var i=e[a-1],c=e[a+12];if("/"!==c&&"\\"!==c||"/"!==i&&"\\"!==i)o=a+1;else{var u=a+13;r+=ge(e,n,u);var l=ie(e,i,u);"@"===e[u]&&(l=ie(e,i,l+1));var f=ge(e,u,l);r+=t.stylize(f,"module"),n=l,o=l}}return 0!==n&&(e=r+ge(e,n)),e}function Sn(t,e,r){var n=ie(e,r),o="",a=r.length;if(-1!==n){"file://"===ge(e,n-7,n)&&(a+=7,n-=7);var i="("===e[n-1]?n-1:n,c=i!==n&&oe(e,")")?-1:e.length,u=n+a+1,l=ge(e,i,u);o+=ge(e,0,i),o+=t.stylize(l,"undefined"),o+=ge(e,u,c),-1===c&&(o+=t.stylize(")","undefined"))}else o+=e;return o}function Pn(t){var e="",r=t.length;Er(0!==r);for(var n="-"===t[0]?1:0;r>=n+4;r-=3)e="_".concat(ge(t,r-3,r)).concat(e);return r===t.length?t:"".concat(ge(t,0,r)).concat(e)}var wn=function(t){return"... ".concat(t," more item").concat(t>1?"s":"")};function xn(t,e,r){if(!r)return _t(e,-0)?t("-0","number"):t("".concat(e),"number");var n=te(e);if(st(e)===e)return!pt(e)||ae(n,"e")?t(n,"number"):t(Pn(n),"number");if(gt(e))return t(n,"number");var o=ie(n,"."),a=ge(n,0,o),i=ge(n,o+1);return t("".concat(Pn(a),".").concat(function(t){for(var e="",r=0;r<t.length-3;r+=3)e+="".concat(ge(t,r,r+3),"_");return 0===r?t:"".concat(e).concat(ge(t,r))}(i)),"number")}function An(t,e,r){var n=te(e);return t("".concat(r?Pn(n):n,"n"),"bigint")}function On(t,e,r){if("string"==typeof e){var n="";if(e.length>r.maxStringLength){var o=e.length-r.maxStringLength;e=ge(e,0,r.maxStringLength),n="... ".concat(o," more character").concat(o>1?"s":"")}return!0!==r.compact&&e.length>16&&e.length>r.breakLength-r.indentationLvl-4?j(_(Vt(/(?<=\n)/,e),function(e){return t(nn(e),"string")})," +\n".concat(se(" ",r.indentationLvl+2)))+n:t(nn(e),"string")+n}return"number"==typeof e?xn(t,e,r.numericSeparator):"bigint"==typeof e?An(t,e,r.numericSeparator):"boolean"==typeof e?t("".concat(e),"boolean"):void 0===e?t("undefined","undefined"):t(Se(e),"symbol")}function jn(t,e,r,n){for(var o=new d(t.length),a=0;a<t.length;a++)try{o[a]=Wn(e,r,n,t[a],0)}catch(r){Er(vr(r)&&"ReferenceError"===r.name);var i=f({},t[a],"");o[a]=Wn(e,i,n,t[a],0);var c=ce(o[a]," ");o[a]=ge(o[a],0,c+1)+e.stylize("<uninitialized>","special")}return t.length=0,o}function _n(t,e,r,n,o,a){for(var i=Et(e),c=a;a<i.length&&o.length<n;a++){var u=i[a],l=+u;if(l>Math.pow(2,32)-2)break;if("".concat(c)!==u){if(null===Ut(Gr,u))break;var f=l-c,s=f>1?"s":"",y="<".concat(f," empty item").concat(s,">");if(k(o,t.stylize(y,"undefined")),c=l,o.length===n)break}k(o,Wn(t,e,r,u,1)),c++}var p=e.length-c;if(o.length!==n){if(p>0){var g=p>1?"s":"",v="<".concat(p," empty item").concat(g,">");k(o,t.stylize(v,"undefined"))}}else p>0&&k(o,wn(p));return o}function En(t,e){var n;try{n=new Ie(e)}catch(e){return[t.stylize("(detached)","special")]}void 0===s&&(s=Ce(r(562).h.prototype.hexSlice));for(var o=s(n,0,ut(t.maxArrayLength,n.length)),a="",i=0;i<o.length-2;i+=2)a+="".concat(o[i]).concat(o[i+1]," ");o.length>0&&(a+="".concat(o[i]).concat(o[i+1]));var c=n.length-t.maxArrayLength;return c>0&&(a+=" ... ".concat(c," more byte").concat(c>1?"s":"")),["".concat(t.stylize("[Uint8Contents]","special"),": <").concat(a,">")]}function kn(t,e,r){for(var n=e.length,o=ut(ct(0,t.maxArrayLength),n),a=n-o,i=[],c=0;c<o;c++){var u=xt(e,c);if(void 0===u)return _n(t,e,r,o,i,c);k(i,Wn(t,e,r,c,1,u))}return a>0&&k(i,wn(a)),i}function In(t,e,r){for(var n=ut(ct(0,r.maxArrayLength),e),o=t.length-n,a=new d(n),i=t.length>0&&"number"==typeof t[0]?xn:An,c=0;c<n;++c)a[c]=i(r.stylize,t[c],r.numericSeparator);return o>0&&(a[n]=wn(o)),a}function Rn(t,e,r,n){var o=t.size,i=ut(ct(0,e.maxArrayLength),o),c=o-i,u=[];e.indentationLvl+=2;var l,f=0,s=a(t);try{for(s.s();!(l=s.n()).done;){var y=l.value;if(f>=i)break;k(u,vn(e,y,n)),f++}}catch(t){s.e(t)}finally{s.f()}return c>0&&k(u,wn(c)),e.indentationLvl-=2,u}function Ln(t,e,r,n){var o=t.size,i=ut(ct(0,e.maxArrayLength),o),c=o-i,u=[];e.indentationLvl+=2;var l,f=0,s=a(t);try{for(s.s();!(l=s.n()).done;){var y=l.value,p=y[0],g=y[1];if(f>=i)break;k(u,"".concat(vn(e,p,n)," => ").concat(vn(e,g,n))),f++}}catch(t){s.e(t)}finally{s.f()}return c>0&&k(u,wn(c)),e.indentationLvl-=2,u}function Tn(t,e,r,n){var o=ct(t.maxArrayLength,0),a=ut(o,r.length),i=new d(a);t.indentationLvl+=2;for(var c=0;c<a;c++)i[c]=vn(t,r[c],e);t.indentationLvl-=2,0!==n||t.sorted||L(i);var u=r.length-a;return u>0&&k(i,wn(u)),i}function Bn(t,e,r,n){var o=ct(t.maxArrayLength,0),a=r.length/2,i=a-o,c=ut(o,a),u=new d(c),l=0;if(t.indentationLvl+=2,0===n){for(;l<c;l++){var f=2*l;u[l]="".concat(vn(t,r[f],e)," => ").concat(vn(t,r[f+1],e))}t.sorted||L(u)}else for(;l<c;l++){var s=2*l,y=[vn(t,r[s],e),vn(t,r[s+1],e)];u[l]=Un(t,y,"",["[","]"],2,e)}return t.indentationLvl-=2,i>0&&k(u,wn(i)),u}function zn(t){return[t.stylize("<items unknown>","special")]}function Mn(t,e,r){return Tn(t,r,$e(e),0)}function Cn(t,e,r){return Bn(t,r,$e(e),0)}function Dn(t,e,r,n){var o=$e(r,!0),a=o[0];return o[1]?(t[0]=Gt(/ Iterator] {$/,t[0]," Entries] {"),Bn(e,n,a,2)):Tn(e,n,a,1)}function Nn(t,e,r){var n,o=Ve(e),a=o[0],i=o[1];if(a===He)n=[t.stylize("<pending>","special")];else{t.indentationLvl+=2;var c=vn(t,i,r);t.indentationLvl-=2,n=[a===Ue?"".concat(t.stylize("<rejected>","special")," ").concat(c):c]}return n}function Fn(t,e,r,n,o){t.indentationLvl+=2;var a=vn(t,e[n],r,o);t.indentationLvl-=2;var i=t.stylize("[".concat(n,"]"),"string");return"".concat(i,": ").concat(a)}function Wn(t,e,r,n,a,i){var c,u,l=arguments.length>6&&void 0!==arguments[6]?arguments[6]:e,f=" ";if(void 0!==(i=i||xt(e,n)).value){var s=!0!==t.compact||0!==a?2:3;t.indentationLvl+=s,u=vn(t,i.value,r),3===s&&t.breakLength<zr(u,t.colors)&&(f="\n".concat(se(" ",t.indentationLvl))),t.indentationLvl-=s}else if(void 0!==i.get){var y=void 0!==i.set?"Getter/Setter":"Getter",p=t.stylize,g="special";if(t.getters&&(!0===t.getters||"get"===t.getters&&void 0===i.set||"set"===t.getters&&void 0!==i.set)){t.indentationLvl+=2;try{var v=Q(i.get,l);if(null===v)u="".concat(p("[".concat(y,":"),g)," ").concat(p("null","null")).concat(p("]",g));else if("object"===o(v))u="".concat(p("[".concat(y,"]"),g)," ").concat(vn(t,v,r));else{var h=On(p,v,t);u="".concat(p("[".concat(y,":"),g)," ").concat(h).concat(p("]",g))}}catch(e){var d="<Inspection threw (".concat(vn(t,e,r),")>");u="".concat(p("[".concat(y,":"),g)," ").concat(d).concat(p("]",g))}t.indentationLvl-=2}else u=t.stylize("[".concat(y,"]"),g)}else u=void 0!==i.set?t.stylize("[Setter]","special"):t.stylize("undefined","undefined");if(1===a)return u;if("symbol"===o(n)){var b=Gt(Fr,Se(n),rn);c=t.stylize(b,"symbol")}else c=null!==Ut(Ur,n)?"__proto__"===n?"['__proto__']":t.stylize(n,"name"):t.stylize(nn(n),"string");return!1===i.enumerable&&(c="[".concat(c,"]")),"".concat(c,":").concat(f).concat(u)}function Hn(t,e,r,n){var o=e.length+r;if(o+e.length>t.breakLength)return!1;for(var a=0;a<e.length;a++)if(t.colors?o+=er(e[a]).length:o+=e[a].length,o>t.breakLength)return!1;return""===n||!ae(n,"\n")}function Un(t,e,r,n,o,a,i){if(!0!==t.compact){if("number"==typeof t.compact&&t.compact>=1){var c=e.length;if(2===o&&c>6&&(e=function(t,e,r){var n=0,o=0,a=0,i=e.length;t.maxArrayLength<e.length&&i--;for(var c=new d(i);a<i;a++){var u=zr(e[a],t.colors);c[a]=u,n+=u+2,o<u&&(o=u)}var l=o+2;if(3*l+t.indentationLvl<t.breakLength&&(n/l>5||o<=6)){var f=ft(l-n/e.length),s=ct(l-3-f,1),y=ut(lt(ft(2.5*s*i)/s),it((t.breakLength-t.indentationLvl)/l),4*t.compact,15);if(y<=1)return e;for(var p=[],g=[],v=0;v<y;v++){for(var h=0,b=v;b<e.length;b+=y)c[b]>h&&(h=c[b]);h+=2,g[v]=h}var m=fe;if(void 0!==r)for(var S=0;S<e.length;S++)if("number"!=typeof r[S]&&"bigint"!=typeof r[S]){m=le;break}for(var P=0;P<i;P+=y){for(var w=ut(P+y,i),x="",A=P;A<w-1;A++){var O=g[A-P]+e[A].length-c[A];x+=m("".concat(e[A],", "),O," ")}if(m===fe){var j=g[A-P]+e[A].length-c[A]-2;x+=fe(e[A],j," ")}else x+=e[A];k(p,x)}t.maxArrayLength<e.length&&k(p,e[i]),e=p}return e}(t,e,i)),t.currentDepth-a<t.compact&&c===e.length&&Hn(t,e,e.length+t.indentationLvl+n[0].length+r.length+10,r)){var u=tr(e,", ");if(!ae(u,"\n"))return"".concat(r?"".concat(r," "):"").concat(n[0]," ").concat(u)+" ".concat(n[1])}}var l="\n".concat(se(" ",t.indentationLvl));return"".concat(r?"".concat(r," "):"").concat(n[0]).concat(l,"  ")+"".concat(tr(e,",".concat(l,"  "))).concat(l).concat(n[1])}if(Hn(t,e,0,r))return"".concat(n[0]).concat(r?" ".concat(r):""," ").concat(tr(e,", ")," ")+n[1];var f=se(" ",t.indentationLvl),s=""===r&&1===n[0].length?" ":"".concat(r?" ".concat(r):"","\n").concat(f,"  ");return"".concat(n[0]).concat(s).concat(tr(e,",\n".concat(f,"  "))," ").concat(n[1])}function Gn(t){var e=Ze(t,!1);if(void 0!==e){if(null===e)return!0;t=e}var r=It,n=It;if("function"!=typeof t.toString){if("function"!=typeof t[we])return!0;if(It(t,we))return!1;r=Vn}else{if(It(t,"toString"))return!1;if("function"!=typeof t[we])n=Vn;else if(It(t,we))return!1}var o=t;do{o=jt(o)}while(!r(o,"toString")&&!n(o,we));var a=xt(o,"constructor");return void 0!==a&&"function"==typeof a.value&&Mr.has(a.value.name)}function Vn(){return!1}var Zn,$n=function(t){return ve(t.message,"\n",1)[0]};function Yn(t){try{return et(t)}catch(t){if(!Zn)try{var e={};e.a=e,et(e)}catch(t){Zn=$n(t)}if("TypeError"===t.name&&$n(t)===Zn)return"[Circular]";throw t}}function qn(t,e){var r;return xn(an,t,null!==(r=null==e?void 0:e.numericSeparator)&&void 0!==r?r:Dr.numericSeparator)}function Jn(t,e){var r;return An(an,t,null!==(r=null==e?void 0:e.numericSeparator)&&void 0!==r?r:Dr.numericSeparator)}function Kn(t,e){var r=e[0],n=0,a="",i="";if("string"==typeof r){if(1===e.length)return r;for(var c,u=0,f=0;f<r.length-1;f++)if(37===re(r,f)){var s=re(r,++f);if(n+1!==e.length){switch(s){case 115:var y=e[++n];c="number"==typeof y?qn(y,t):"bigint"==typeof y?Jn(y,t):"object"===o(y)&&null!==y&&Gn(y)?Jr(y,l(l({},t),{},{compact:3,colors:!1,depth:0})):te(y);break;case 106:c=Yn(e[++n]);break;case 100:var p=e[++n];c="bigint"==typeof p?Jn(p,t):"symbol"===o(p)?"NaN":qn(yt(p),t);break;case 79:c=Jr(e[++n],t);break;case 111:c=Jr(e[++n],l(l({},t),{},{showHidden:!0,showProxy:!0,depth:4}));break;case 105:var g=e[++n];c="bigint"==typeof g?Jn(g,t):"symbol"===o(g)?"NaN":qn(ht(g),t);break;case 102:var v=e[++n];c="symbol"===o(v)?"NaN":qn(vt(v),t);break;case 99:n+=1,c="";break;case 37:a+=ge(r,u,f),u=f+1;continue;default:continue}u!==f-1&&(a+=ge(r,u,f-1)),a+=c,u=f+1}else 37===s&&(a+=ge(r,u,f),u=f+1)}0!==u&&(n++,i=" ",u<r.length&&(a+=ge(r,u)))}for(;n<e.length;){var h=e[n];a+=i,a+="string"!=typeof h?Jr(h,t):h,i=" ",n++}return a}function Qn(t){return t<=31||t>=127&&t<=159||t>=768&&t<=879||t>=8203&&t<=8207||t>=8400&&t<=8447||t>=65024&&t<=65039||t>=65056&&t<=65071||t>=917760&&t<=917999}if(Me("config").hasIntl)Er(!1);else{zr=function(t){var e=0;(!(arguments.length>1&&void 0!==arguments[1])||arguments[1])&&(t=to(t)),t=ue(t,"NFC");var r,n=a(new qt(t));try{for(n.s();!(r=n.n()).done;){var o=r.value,i=ne(o,0);Xn(i)?e+=2:Qn(i)||e++}}catch(t){n.e(t)}finally{n.f()}return e};var Xn=function(t){return t>=4352&&(t<=4447||9001===t||9002===t||t>=11904&&t<=12871&&12351!==t||t>=12880&&t<=19903||t>=19968&&t<=42182||t>=43360&&t<=43388||t>=44032&&t<=55203||t>=63744&&t<=64255||t>=65040&&t<=65049||t>=65072&&t<=65131||t>=65281&&t<=65376||t>=65504&&t<=65510||t>=110592&&t<=110593||t>=127488&&t<=127569||t>=127744&&t<=128591||t>=131072&&t<=262141)}}function to(t){return Lr(t,"str"),Gt(qr,t,"")}var eo={34:"&quot;",38:"&amp;",39:"&apos;",60:"&lt;",62:"&gt;",160:"&nbsp;"};function ro(t){return t.replace(/[\u0000-\u002F\u003A-\u0040\u005B-\u0060\u007B-\u00FF]/g,function(t){var e=te(t.charCodeAt(0));return eo[e]||"&#"+e+";"})}t.exports={identicalSequenceRange:dn,inspect:Jr,inspectDefaultOptions:Dr,format:function(){for(var t=arguments.length,e=new Array(t),r=0;r<t;r++)e[r]=arguments[r];return Kn(void 0,e)},formatWithOptions:function(t){Rr(t,"inspectOptions",Tr);for(var e=arguments.length,r=new Array(e>1?e-1:0),n=1;n<e;n++)r[n-1]=arguments[n];return Kn(t,r)},getStringWidth:zr,stripVTControlCharacters:to,isZeroWidthCodePoint:Qn,stylizeWithColor:on,stylizeWithHTML:function(t,e){var r=Jr.styles[e];return void 0!==r?'<span style="color:'.concat(r,';">').concat(ro(t),"</span>"):ro(t)},Proxy:Je}},266(t,e,r){var n;function o(){return n=null!=n?n:r(27).codes.ERR_INTERNAL_ASSERTION}function a(t,e){if(!t)throw new(o())(e)}a.fail=function(t){throw new(o())(t)},t.exports=a},588(t){var e=["_http_agent","_http_client","_http_common","_http_incoming","_http_outgoing","_http_server","_stream_duplex","_stream_passthrough","_stream_readable","_stream_transform","_stream_wrap","_stream_writable","_tls_common","_tls_wrap","assert","assert/strict","async_hooks","buffer","child_process","cluster","console","constants","crypto","dgram","diagnostics_channel","dns","dns/promises","domain","events","fs","fs/promises","http","http2","https","inspector","module","Module","net","os","path","path/posix","path/win32","perf_hooks","process","punycode","querystring","readline","readline/promises","repl","stream","stream/consumers","stream/promises","stream/web","string_decoder","sys","timers","timers/promises","tls","trace_events","tty","url","util","util/types","v8","vm","wasi","worker_threads","zlib"];t.exports.BuiltinModule={exists:function(t){return"internal/modules/cjs/foo"!==t&&(t.startsWith("internal/")||-1!==e.indexOf(t))}}},823(t){t.exports={CHAR_DOT:46,CHAR_FORWARD_SLASH:47,CHAR_BACKWARD_SLASH:92}},27(t,e,r){function n(t,e){(null==e||e>t.length)&&(e=t.length);for(var r=0,n=Array(e);r<e;r++)n[r]=t[r];return n}function o(t){return o="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t},o(t)}function a(t,e){for(var r=0;r<e.length;r++){var n=e[r];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(t,i(n.key),n)}}function i(t){var e=function(t){if("object"!=o(t)||!t)return t;var e=t[Symbol.toPrimitive];if(void 0!==e){var r=e.call(t,"string");if("object"!=o(r))return r;throw new TypeError("@@toPrimitive must return a primitive value.")}return String(t)}(t);return"symbol"==o(e)?e:e+""}function c(t,e,r){return e=l(e),function(t,e){if(e&&("object"==o(e)||"function"==typeof e))return e;if(void 0!==e)throw new TypeError("Derived constructors may only return object or undefined");return function(t){if(void 0===t)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return t}(t)}(t,u()?Reflect.construct(e,r||[],l(t).constructor):e.apply(t,r))}function u(){try{var t=!Boolean.prototype.valueOf.call(Reflect.construct(Boolean,[],function(){}))}catch(t){}return(u=function(){return!!t})()}function l(t){return l=Object.setPrototypeOf?Object.getPrototypeOf.bind():function(t){return t.__proto__||Object.getPrototypeOf(t)},l(t)}function f(t,e){return f=Object.setPrototypeOf?Object.setPrototypeOf.bind():function(t,e){return t.__proto__=e,t},f(t,e)}var s,y,p=r(746),g=p.ArrayIsArray,v=p.ArrayPrototypeIncludes,h=p.ArrayPrototypeIndexOf,d=p.ArrayPrototypeJoin,b=p.ArrayPrototypePush,m=p.ArrayPrototypeSlice,S=p.ArrayPrototypeSplice,P=p.Error,w=p.ErrorCaptureStackTrace,x=p.JSONStringify,A=p.ObjectDefineProperty,O=p.ReflectApply,j=p.RegExpPrototypeExec,_=p.SafeMap,E=p.SafeWeakMap,k=p.String,I=p.StringPrototypeEndsWith,R=p.StringPrototypeIncludes,L=p.StringPrototypeIndexOf,T=p.StringPrototypeSlice,B=p.StringPrototypeToLowerCase,z=p.Symbol,M=p.TypeError,C=z("kIsNodeError"),D=new _,N={},F=/^[A-Z][a-zA-Z0-9]*$/,W=["string","function","number","object","Function","Object","boolean","bigint","symbol"],H=new E,U=r(266),G=null;function V(t,e){var r=function(t){function r(){var t,n,o,a;(function(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")})(this,r),n=t=c(this,r),a=e,(o=i(o="code"))in n?Object.defineProperty(n,o,{value:a,enumerable:!0,configurable:!0,writable:!0}):n[o]=a;for(var u=arguments.length,l=new Array(u),f=0;f<u;f++)l[f]=arguments[f];return A(t,"message",{__proto__:null,value:$(e,l,t),enumerable:!1,writable:!0,configurable:!0}),t}return function(t,e){if("function"!=typeof e&&null!==e)throw new TypeError("Super expression must either be null or a function");t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,writable:!0,configurable:!0}}),Object.defineProperty(t,"prototype",{writable:!1}),e&&f(t,e)}(r,t),n=r,(o=[{key:"toString",value:function(){return"".concat(this.name," [").concat(e,"]: ").concat(this.message)}}])&&a(n.prototype,o),u&&a(n,u),Object.defineProperty(n,"prototype",{writable:!1}),n;var n,o,u}(t);return r}function Z(t,e,r){D.set(t,e);var n=V(r,t);N[t]=n}function $(t,e,r){var n=D.get(t);if("function"==typeof n)return U(n.length<=e.length,"Code: ".concat(t,"; The provided arguments length (").concat(e.length,") does not ")+"match the required ones (".concat(n.length,").")),O(n,r,e)}var Y=z("kEnhanceStackBeforeInspector");function q(t){if(null===t)return"null";if(void 0===t)return"undefined";switch(o(t)){case"bigint":return"type bigint (".concat(t,"n)");case"number":return 0===t?1/t==-1/0?"type number (-0)":"type number (0)":t!=t?"type number (NaN)":t===1/0?"type number (Infinity)":t===-1/0?"type number (-Infinity)":"type number (".concat(t,")");case"boolean":return t?"type boolean (true)":"type boolean (false)";case"symbol":return"type symbol (".concat(k(t),")");case"function":return"function ".concat(t.name);case"object":return t.constructor&&"name"in t.constructor?"an instance of ".concat(t.constructor.name):"".concat((G=G||r(622)).inspect(t,{depth:-1}));case"string":return t.length>28&&(t="".concat(T(t,0,25),"...")),-1===L(t,"'")?"type string ('".concat(t,"')"):"type string (".concat(x(t),")")}}function J(t){var e=arguments.length>1&&void 0!==arguments[1]?arguments[1]:"and";switch(t.length){case 0:return"";case 1:return"".concat(t[0]);case 2:return"".concat(t[0]," ").concat(e," ").concat(t[1]);case 3:return"".concat(t[0],", ").concat(t[1],", ").concat(e," ").concat(t[2]);default:return"".concat(d(m(t,0,-1),", "),", ").concat(e," ").concat(t[t.length-1])}}t.exports={codes:N,determineSpecificType:q,E:Z,formatList:J,getMessage:$,hideStackFrames:function(t){function e(){try{for(var r=arguments.length,n=new Array(r),o=0;o<r;o++)n[o]=arguments[o];return O(t,this,n)}catch(t){throw P.stackTraceLimit&&w(t,e),t}}return e.withoutStackTrace=t,e},isStackOverflowError:function(t){if(void 0===y)try{var e=function(){e()};e()}catch(t){y=t.message,s=t.name}return t&&t.name===s&&t.message===y},kEnhanceStackBeforeInspector:Y,kIsNodeError:C,overrideStackTrace:H},Z("ERR_INTERNAL_ASSERTION",function(t){var e="This is caused by either a bug in Node.js or incorrect usage of Node.js internals.\nPlease open an issue with this stack trace at https://github.com/nodejs/node/issues\n";return void 0===t?e:"".concat(t,"\n").concat(e)},P),Z("ERR_INVALID_ARG_TYPE",function(t,e,r){U("string"==typeof t,"'name' must be a string"),g(e)||(e=[e]);var o="The ";if(I(t," argument"))o+="".concat(t," ");else{var a=R(t,".")?"property":"argument";o+='"'.concat(t,'" ').concat(a," ")}o+="must be ";var i,c=[],u=[],l=[],f=function(t,e){var r="undefined"!=typeof Symbol&&t[Symbol.iterator]||t["@@iterator"];if(!r){if(Array.isArray(t)||(r=function(t,e){if(t){if("string"==typeof t)return n(t,e);var r={}.toString.call(t).slice(8,-1);return"Object"===r&&t.constructor&&(r=t.constructor.name),"Map"===r||"Set"===r?Array.from(t):"Arguments"===r||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(r)?n(t,e):void 0}}(t))||e&&t&&"number"==typeof t.length){r&&(t=r);var o=0,a=function(){};return{s:a,n:function(){return o>=t.length?{done:!0}:{done:!1,value:t[o++]}},e:function(t){throw t},f:a}}throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}var i,c=!0,u=!1;return{s:function(){r=r.call(t)},n:function(){var t=r.next();return c=t.done,t},e:function(t){u=!0,i=t},f:function(){try{c||null==r.return||r.return()}finally{if(u)throw i}}}}(e);try{for(f.s();!(i=f.n()).done;){var s=i.value;U("string"==typeof s,"All expected entries have to be of type string"),v(W,s)?b(c,B(s)):null!==j(F,s)?b(u,s):(U("object"!==s,'The value "object" should be written as "Object"'),b(l,s))}}catch(t){f.e(t)}finally{f.f()}if(u.length>0){var y=h(c,"object");-1!==y&&(S(c,y,1),b(u,"Object"))}return c.length>0&&(o+="".concat(c.length>1?"one of type":"of type"," ").concat(J(c,"or")),(u.length>0||l.length>0)&&(o+=" or ")),u.length>0&&(o+="an instance of ".concat(J(u,"or")),l.length>0&&(o+=" or ")),l.length>0&&(l.length>1?o+="one of ".concat(J(l,"or")):(B(l[0])!==l[0]&&(o+="an "),o+="".concat(l[0]))),o+". Received ".concat(q(r))},M)},287(t,e,r){var n=r(746),o=n.StringPrototypeCharCodeAt,a=n.StringPrototypeIncludes,i=n.StringPrototypeReplace,c=r(251),u=r(823).CHAR_FORWARD_SLASH,l=r(211),f=/%/g,s=/\\/g,y=/\n/g,p=/\r/g,g=/\t/g;t.exports={pathToFileURL:function(t){var e=new c("file://"),r=l.resolve(t);return o(t,t.length-1)===u&&r[r.length-1]!==l.sep&&(r+="/"),e.pathname=function(t){return a(t,"%")&&(t=i(t,f,"%25")),a(t,"\\")&&(t=i(t,s,"%5C")),a(t,"\n")&&(t=i(t,y,"%0A")),a(t,"\r")&&(t=i(t,p,"%0D")),a(t,"\t")&&(t=i(t,g,"%09")),t}(r),e},URL:c}},48(t,e,r){var n=r(746),o=n.ArrayPrototypeJoin,a=n.Error,i=n.ErrorIsError,c=n.FunctionPrototypeSymbolHasInstance,u=n.StringPrototypeReplace,l=n.SymbolFor,f=/\u001b\[\d\d?m/g;t.exports={customInspectSymbol:l("nodejs.util.inspect.custom"),isError:function(t){return(null==i?void 0:i(t))||c(a,t)},join:o,removeColors:function(t){return u(t,f,"")}}},326(t,e,r){function n(t){return n="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t},n(t)}var o=r(746),a=o.ArrayIsArray,i=o.BigInt,c=o.Boolean,u=o.DatePrototype,l=o.Error,f=o.FunctionPrototype,s=o.MapPrototypeHas,y=o.Number,p=o.ObjectDefineProperty,g=o.ObjectGetOwnPropertyDescriptor,v=o.ObjectGetPrototypeOf,h=o.ObjectIsFrozen,d=o.ObjectPrototype,b=o.SetPrototypeHas,m=o.String,S=o.Symbol,P=o.SymbolToStringTag,w=o.globalThis,x=r(916).getConstructorName;function A(t){for(var e=arguments.length,r=new Array(e>1?e-1:0),o=1;o<e;o++)r[o-1]=arguments[o];for(var a=0,i=r;a<i.length;a++){var c=i[a],u=w[c];if(u&&t instanceof u)return!0}for(;t;){if("object"!==n(t))return!1;if(r.indexOf(x(t))>=0)return!0;t=v(t)}return!1}function O(t){return function(e){if(!A(e,t.name))return!1;try{t.prototype.valueOf.call(e)}catch(t){return!1}return!0}}"object"!==n(w)&&(p(d,"__magic__",{get:function(){return this},configurable:!0}),__magic__.globalThis=__magic__,delete d.__magic__);var j=O(m),_=O(y),E=O(c),k=O(i),I=O(S);t.exports={isAsyncFunction:function(t){return"function"==typeof t&&f.toString.call(t).startsWith("async")},isGeneratorFunction:function(t){return"function"==typeof t&&f.toString.call(t).match(/^(async\s+)?function *\*/)},isAnyArrayBuffer:function(t){return A(t,"ArrayBuffer","SharedArrayBuffer")},isArrayBuffer:function(t){return A(t,"ArrayBuffer")},isArgumentsObject:function(t){if(null!==t&&"object"===n(t)&&!a(t)&&"number"==typeof t.length&&t.length===(0|t.length)&&t.length>=0){var e=g(t,"callee");return e&&!e.enumerable}return!1},isBoxedPrimitive:function(t){return _(t)||j(t)||E(t)||k(t)||I(t)},isDataView:function(t){return A(t,"DataView")},isExternal:function(t){return"object"===n(t)&&h(t)&&null==v(t)},isMap:function(t){if(!A(t,"Map"))return!1;try{s(t)}catch(t){return!1}return!0},isMapIterator:function(t){return"[object Map Iterator]"===d.toString.call(v(t))},isModuleNamespaceObject:function(t){try{return t&&"object"===n(t)&&"Module"===t[P]}catch(t){return!1}},isNativeError:function(t){return t instanceof l&&A(t,"Error","EvalError","RangeError","ReferenceError","SyntaxError","TypeError","URIError","AggregateError")},isPromise:function(t){return A(t,"Promise")},isSet:function(t){if(!A(t,"Set"))return!1;try{b(t)}catch(t){return!1}return!0},isSetIterator:function(t){return"[object Set Iterator]"===d.toString.call(v(t))},isWeakMap:function(t){return A(t,"WeakMap")},isWeakSet:function(t){return A(t,"WeakSet")},isRegExp:function(t){return A(t,"RegExp")},isDate:function(t){if(A(t,"Date"))try{return u.getTime.call(t),!0}catch(t){}return!1},isTypedArray:function(t){return A(t,"Int8Array","Uint8Array","Uint8ClampedArray","Int16Array","Uint16Array","Int32Array","Uint32Array","Float32Array","Float64Array","BigInt64Array","BigUint64Array")},isStringObject:j,isNumberObject:_,isBooleanObject:E,isBigIntObject:k,isSymbolObject:I}},903(t,e,r){function n(t){return n="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t},n(t)}var o=r(746).ArrayIsArray,a=r(27),i=a.hideStackFrames,c=a.codes.ERR_INVALID_ARG_TYPE,u=i(function(t,e){var r=arguments.length>2&&void 0!==arguments[2]?arguments[2]:0;if(0===r){if(null===t||o(t))throw new c(e,"Object",t);if("object"!==n(t))throw new c(e,"Object",t)}else{if(!(1&r)&&null===t)throw new c(e,"Object",t);if(!(2&r)&&o(t))throw new c(e,"Object",t);var a=!(4&r),i=n(t);if("object"!==i&&(a||"function"!==i))throw new c(e,"Object",t)}});t.exports={kValidateObjectNone:0,kValidateObjectAllowNullable:1,kValidateObjectAllowArray:2,kValidateObjectAllowFunction:4,validateObject:u,validateString:function(t,e){if("string"!=typeof t)throw new c(e,"string",t)}}},211(t,e,r){var n=r(746),o=n.StringPrototypeCharCodeAt,a=n.StringPrototypeLastIndexOf,i=n.StringPrototypeSlice,c=r(823),u=c.CHAR_DOT,l=c.CHAR_FORWARD_SLASH,f=r(903).validateString;function s(t){return t===l}function y(t,e,r,n){for(var c="",f=0,s=-1,y=0,p=0,g=0;g<=t.length;++g){if(g<t.length)p=o(t,g);else{if(n(p))break;p=l}if(n(p)){if(s===g-1||1===y);else if(2===y){if(c.length<2||2!==f||o(c,c.length-1)!==u||o(c,c.length-2)!==u){if(c.length>2){var v=a(c,r);-1===v?(c="",f=0):f=(c=i(c,0,v)).length-1-a(c,r),s=g,y=0;continue}if(0!==c.length){c="",f=0,s=g,y=0;continue}}e&&(c+=c.length>0?"".concat(r,".."):"..",f=2)}else c.length>0?c+="".concat(r).concat(i(t,s+1,g)):c=i(t,s+1,g),f=g-s-1;s=g,y=0}else p===u&&-1!==y?++y:y=-1}return c}t.exports={isPosixPathSeparator:s,normalizeString:y,resolve:function(){if((0===arguments.length||1===arguments.length&&(""===(arguments.length<=0?void 0:arguments[0])||"."===(arguments.length<=0?void 0:arguments[0])))&&o("/",0)===l)return"/";for(var t="",e=!1,r=arguments.length-1;r>=0&&!e;r--){var n=r<0||arguments.length<=r?void 0:arguments[r];f(n,"paths[".concat(r,"]")),0!==n.length&&(t="".concat(n,"/").concat(t),e=o(n,0)===l)}return e||(t="".concat("/","/").concat(t),e=o("/",0)===l),t=y(t,!e,"/",s),e?"/".concat(t):t.length>0?t:"."}}},746(t){function e(){var t,n,o="function"==typeof Symbol?Symbol:{},a=o.iterator||"@@iterator",i=o.toStringTag||"@@toStringTag";function c(e,o,a,i){var c=o&&o.prototype instanceof l?o:l,f=Object.create(c.prototype);return r(f,"_invoke",function(e,r,o){var a,i,c,l=0,f=o||[],s=!1,y={p:0,n:0,v:t,a:p,f:p.bind(t,4),d:function(e,r){return a=e,i=0,c=t,y.n=r,u}};function p(e,r){for(i=e,c=r,n=0;!s&&l&&!o&&n<f.length;n++){var o,a=f[n],p=y.p,g=a[2];e>3?(o=g===r)&&(c=a[(i=a[4])?5:(i=3,3)],a[4]=a[5]=t):a[0]<=p&&((o=e<2&&p<a[1])?(i=0,y.v=r,y.n=a[1]):p<g&&(o=e<3||a[0]>r||r>g)&&(a[4]=e,a[5]=r,y.n=g,i=0))}if(o||e>1)return u;throw s=!0,r}return function(o,f,g){if(l>1)throw TypeError("Generator is already running");for(s&&1===f&&p(f,g),i=f,c=g;(n=i<2?t:c)||!s;){a||(i?i<3?(i>1&&(y.n=-1),p(i,c)):y.n=c:y.v=c);try{if(l=2,a){if(i||(o="next"),n=a[o]){if(!(n=n.call(a,c)))throw TypeError("iterator result is not an object");if(!n.done)return n;c=n.value,i<2&&(i=0)}else 1===i&&(n=a.return)&&n.call(a),i<2&&(c=TypeError("The iterator does not provide a '"+o+"' method"),i=1);a=t}else if((n=(s=y.n<0)?c:e.call(r,y))!==u)break}catch(e){a=t,i=1,c=e}finally{l=1}}return{value:n,done:s}}}(e,a,i),!0),f}var u={};function l(){}function f(){}function s(){}n=Object.getPrototypeOf;var y=[][a]?n(n([][a]())):(r(n={},a,function(){return this}),n),p=s.prototype=l.prototype=Object.create(y);function g(t){return Object.setPrototypeOf?Object.setPrototypeOf(t,s):(t.__proto__=s,r(t,i,"GeneratorFunction")),t.prototype=Object.create(p),t}return f.prototype=s,r(p,"constructor",s),r(s,"constructor",f),f.displayName="GeneratorFunction",r(s,i,"GeneratorFunction"),r(p),r(p,i,"Generator"),r(p,a,function(){return this}),r(p,"toString",function(){return"[object Generator]"}),(e=function(){return{w:c,m:g}})()}function r(t,e,n,o){var a=Object.defineProperty;try{a({},"",{})}catch(t){a=0}r=function(t,e,n,o){function i(e,n){r(t,e,function(t){return this._invoke(e,n,t)})}e?a?a(t,e,{value:n,enumerable:!o,configurable:!o,writable:!o}):t[e]=n:(i("next",0),i("throw",1),i("return",2))},r(t,e,n,o)}function n(t,e,r){return e=a(e),function(t,e){if(e&&("object"==d(e)||"function"==typeof e))return e;if(void 0!==e)throw new TypeError("Derived constructors may only return object or undefined");return function(t){if(void 0===t)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return t}(t)}(t,o()?Reflect.construct(e,r||[],a(t).constructor):e.apply(t,r))}function o(){try{var t=!Boolean.prototype.valueOf.call(Reflect.construct(Boolean,[],function(){}))}catch(t){}return(o=function(){return!!t})()}function a(t){return a=Object.setPrototypeOf?Object.getPrototypeOf.bind():function(t){return t.__proto__||Object.getPrototypeOf(t)},a(t)}function i(t,e){if("function"!=typeof e&&null!==e)throw new TypeError("Super expression must either be null or a function");t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,writable:!0,configurable:!0}}),Object.defineProperty(t,"prototype",{writable:!1}),e&&c(t,e)}function c(t,e){return c=Object.setPrototypeOf?Object.setPrototypeOf.bind():function(t,e){return t.__proto__=e,t},c(t,e)}function u(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}function l(t,e){for(var r=0;r<e.length;r++){var n=e[r];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(t,g(n.key),n)}}function f(t,e,r){return e&&l(t.prototype,e),r&&l(t,r),Object.defineProperty(t,"prototype",{writable:!1}),t}function s(t,e){var r=Object.keys(t);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(t);e&&(n=n.filter(function(e){return Object.getOwnPropertyDescriptor(t,e).enumerable})),r.push.apply(r,n)}return r}function y(t){for(var e=1;e<arguments.length;e++){var r=null!=arguments[e]?arguments[e]:{};e%2?s(Object(r),!0).forEach(function(e){p(t,e,r[e])}):Object.getOwnPropertyDescriptors?Object.defineProperties(t,Object.getOwnPropertyDescriptors(r)):s(Object(r)).forEach(function(e){Object.defineProperty(t,e,Object.getOwnPropertyDescriptor(r,e))})}return t}function p(t,e,r){return(e=g(e))in t?Object.defineProperty(t,e,{value:r,enumerable:!0,configurable:!0,writable:!0}):t[e]=r,t}function g(t){var e=function(t){if("object"!=d(t)||!t)return t;var e=t[Symbol.toPrimitive];if(void 0!==e){var r=e.call(t,"string");if("object"!=d(r))return r;throw new TypeError("@@toPrimitive must return a primitive value.")}return String(t)}(t);return"symbol"==d(e)?e:e+""}function v(t,e){var r="undefined"!=typeof Symbol&&t[Symbol.iterator]||t["@@iterator"];if(!r){if(Array.isArray(t)||(r=function(t,e){if(t){if("string"==typeof t)return h(t,e);var r={}.toString.call(t).slice(8,-1);return"Object"===r&&t.constructor&&(r=t.constructor.name),"Map"===r||"Set"===r?Array.from(t):"Arguments"===r||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(r)?h(t,e):void 0}}(t))||e&&t&&"number"==typeof t.length){r&&(t=r);var n=0,o=function(){};return{s:o,n:function(){return n>=t.length?{done:!0}:{done:!1,value:t[n++]}},e:function(t){throw t},f:o}}throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}var a,i=!0,c=!1;return{s:function(){r=r.call(t)},n:function(){var t=r.next();return i=t.done,t},e:function(t){c=!0,a=t},f:function(){try{i||null==r.return||r.return()}finally{if(c)throw a}}}}function h(t,e){(null==e||e>t.length)&&(e=t.length);for(var r=0,n=Array(e);r<e;r++)n[r]=t[r];return n}function d(t){return d="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t},d(t)}function b(t){return function(){return new m(t.apply(this,arguments))}}function m(t){var e,r;function n(e,r){try{var a=t[e](r),i=a.value,c=i instanceof S;Promise.resolve(c?i.v:i).then(function(r){if(c){var u="return"===e?"return":"next";if(!i.k||r.done)return n(u,r);r=t[u](r).value}o(a.done?"return":"normal",r)},function(t){n("throw",t)})}catch(t){o("throw",t)}}function o(t,o){switch(t){case"return":e.resolve({value:o,done:!0});break;case"throw":e.reject(o);break;default:e.resolve({value:o,done:!1})}(e=e.next)?n(e.key,e.arg):r=null}this._invoke=function(t,o){return new Promise(function(a,i){var c={key:t,arg:o,resolve:a,reject:i,next:null};r?r=r.next=c:(e=r=c,n(t,o))})},"function"!=typeof t.return&&(this.return=void 0)}function S(t,e){this.v=t,this.k=e}m.prototype["function"==typeof Symbol&&Symbol.asyncIterator||"@@asyncIterator"]=function(){return this},m.prototype.next=function(t){return this._invoke("next",t)},m.prototype.throw=function(t){return this._invoke("throw",t)},m.prototype.return=function(t){return this._invoke("return",t)};var P={__proto__:null},w=Reflect.defineProperty,x=Reflect.getOwnPropertyDescriptor,A=Reflect.ownKeys,O=Function.prototype,j=O.apply,_=O.bind,E=O.call,k=_.bind(E);P.uncurryThis=k;var I=_.bind(j);P.applyBind=I;var R=["ArrayOf","ArrayPrototypePush","ArrayPrototypeUnshift","MathHypot","MathMax","MathMin","StringFromCharCode","StringFromCodePoint","StringPrototypeConcat","TypedArrayOf"];function L(t){return"symbol"===d(t)?"Symbol".concat(t.description[7].toUpperCase()).concat(t.description.slice(8)):"".concat(t[0].toUpperCase()).concat(t.slice(1))}function T(t,e,r,n){var o=n.enumerable,a=n.get,i=n.set;w(t,"".concat(e,"Get").concat(r),{__proto__:null,value:k(a),enumerable:o}),void 0!==i&&w(t,"".concat(e,"Set").concat(r),{__proto__:null,value:k(i),enumerable:o})}function B(t,e,r){var n,o=v(A(t));try{for(o.s();!(n=o.n()).done;){var a=n.value,i=L(a),c=x(t,a);if("get"in c)T(e,r,i,c);else{var u="".concat(r).concat(i);w(e,u,y({__proto__:null},c)),R.includes(u)&&w(e,"".concat(u,"Apply"),{__proto__:null,value:I(c.value,t)})}}}catch(t){o.e(t)}finally{o.f()}}function z(t,e,r){var n,o=v(A(t));try{for(o.s();!(n=o.n()).done;){var a=n.value,i=L(a),c=x(t,a);if("get"in c)T(e,r,i,c);else{var u=c.value;"function"==typeof u&&(c.value=k(u));var l="".concat(r).concat(i);w(e,l,y({__proto__:null},c)),R.includes(l)&&w(e,"".concat(l,"Apply"),{__proto__:null,value:I(u)})}}}catch(t){o.e(t)}finally{o.f()}}["Proxy","globalThis"].forEach(function(t){P[t]=globalThis[t]}),[decodeURI,decodeURIComponent,encodeURI,encodeURIComponent].forEach(function(t){P[t.name]=t}),[escape,eval,unescape].forEach(function(t){P[t.name]=t}),["Atomics","JSON","Math","Proxy","Reflect"].forEach(function(t){B(globalThis[t],P,t)}),["AggregateError","Array","ArrayBuffer","BigInt","BigInt64Array","BigUint64Array","Boolean","DataView","Date","Error","EvalError","FinalizationRegistry","Float32Array","Float64Array","Function","Int16Array","Int32Array","Int8Array","Map","Number","Object","RangeError","ReferenceError","RegExp","Set","String","Symbol","SyntaxError","TypeError","URIError","Uint16Array","Uint32Array","Uint8Array","Uint8ClampedArray","WeakMap","WeakRef","WeakSet"].forEach(function(t){var e=globalThis[t];e&&(P[t]=e,B(e,P,t),z(e.prototype,P,"".concat(t,"Prototype")))}),["Promise"].forEach(function(t){var e=globalThis[t];P[t]=e,function(t,e,r){var n,o=v(A(t));try{for(o.s();!(n=o.n()).done;){var a=n.value,i=L(a),c=x(t,a);if("get"in c)T(e,r,i,c);else{var u=c.value;"function"==typeof u&&(c.value=u.bind(t));var l="".concat(r).concat(i);w(e,l,y({__proto__:null},c))}}}catch(t){o.e(t)}finally{o.f()}}(e,P,t),z(e.prototype,P,"".concat(t,"Prototype"))}),[{name:"TypedArray",original:Reflect.getPrototypeOf(Uint8Array)},{name:"ArrayIterator",original:{prototype:Reflect.getPrototypeOf(Array.prototype[Symbol.iterator]())}},{name:"StringIterator",original:{prototype:Reflect.getPrototypeOf(String.prototype[Symbol.iterator]())}}].forEach(function(t){var e=t.name,r=t.original;P[e]=r,z(r,P,e),z(r.prototype,P,"".concat(e,"Prototype"))}),P.IteratorPrototype=Reflect.getPrototypeOf(P.ArrayIteratorPrototype);var M=P.ArrayPrototypeForEach,C=P.ArrayPrototypePushApply,D=P.ArrayPrototypeSlice,N=P.FinalizationRegistry,F=P.FunctionPrototypeCall,W=P.Map,H=P.ObjectFreeze,U=P.ObjectSetPrototypeOf,G=P.RegExp,V=P.Set,Z=P.SymbolIterator,$=P.WeakMap,Y=P.WeakRef,q=P.WeakSet,J=function(t,e){var r=function(){return f(function e(r){u(this,e),this._iterator=t(r)},[{key:"next",value:function(){return e(this._iterator)}},{key:Z,value:function(){return this}}])}();return U(r.prototype,null),H(r.prototype),H(r),r};P.SafeArrayIterator=J(P.ArrayPrototypeSymbolIterator,P.ArrayIteratorPrototypeNext),P.SafeStringIterator=J(P.StringPrototypeSymbolIterator,P.StringIteratorPrototypeNext);var K=function(t,e){M(A(t),function(r){x(e,r)||w(e,r,y({__proto__:null},x(t,r)))})},Q=function(t,e){if(Z in t.prototype){var r,n=new t;M(A(t.prototype),function(o){if(!x(e.prototype,o)){var a,i=x(t.prototype,o);if("function"==typeof i.value&&0===i.value.length&&Z in(null!==(a=F(i.value,n))&&void 0!==a?a:{})){var c=k(i.value);r=r||k(c(n).next);var u=J(c,r);i.value=function(){return new u(this)}}w(e.prototype,o,y({__proto__:null},i))}})}else K(t.prototype,e.prototype);return K(t,e),U(e.prototype,null),H(e.prototype),H(e),e};P.makeSafe=Q,P.SafeMap=Q(W,function(t){function e(){return u(this,e),n(this,e,arguments)}return i(e,t),f(e)}(W)),P.SafeWeakMap=Q($,function(t){function e(){return u(this,e),n(this,e,arguments)}return i(e,t),f(e)}($)),P.SafeSet=Q(V,function(t){function e(){return u(this,e),n(this,e,arguments)}return i(e,t),f(e)}(V)),P.SafeWeakSet=Q(q,function(t){function e(){return u(this,e),n(this,e,arguments)}return i(e,t),f(e)}(q)),P.SafeFinalizationRegistry=Q(N,function(t){function e(){return u(this,e),n(this,e,arguments)}return i(e,t),f(e)}(N)),P.SafeWeakRef=Q(Y,function(t){function e(){return u(this,e),n(this,e,arguments)}return i(e,t),f(e)}(Y)),P.AsyncIteratorPrototype=P.ReflectGetPrototypeOf(b(e().m(function t(){return e().w(function(t){for(;;)if(0===t.n)return t.a(2)},t)}))).prototype,P.internalBinding=function(t){if("config"===t)return{hasIntl:!1};throw new Error('unknown module: "'.concat(t,'"'))},P._stringPrototypeReplaceAll=function(t,e,r){return"[object regexp]"===Object.prototype.toString.call(e).toLowerCase()?t.replace(e,r):t.replace(new G(e,"g"),r)},P.SafeArrayPrototypePushApply=function(t,e){var r=65536;if(r<e.length){var n=0;do{C(t,D(e,n,n=r)),r+=65536}while(r<e.length);e=D(e,n)}return C(t,e)},P.StringPrototypeReplaceAll=P.StringPrototypeReplaceAll||P._stringPrototypeReplaceAll,U(P,null),H(P),t.exports=P},241(t,e,r){function n(t){return n="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t},n(t)}function o(t,e){for(var r=0;r<e.length;r++){var n=e[r];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(t,a(n.key),n)}}function a(t){var e=function(t){if("object"!=n(t)||!t)return t;var e=t[Symbol.toPrimitive];if(void 0!==e){var r=e.call(t,"string");if("object"!=n(r))return r;throw new TypeError("@@toPrimitive must return a primitive value.")}return String(t)}(t);return"symbol"==n(e)?e:e+""}var i=r(746),c=i.Proxy,u=i.ProxyRevocable,l=new(0,i.SafeWeakMap),f=function(){return t=function t(e,r){!function(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}(this,t);var n=new c(e,r);return l.set(n,[e,r]),n},e=[{key:"getProxyDetails",value:function(t){var e=!(arguments.length>1&&void 0!==arguments[1])||arguments[1],r=l.get(t);if(r)return e?r:r[0]}},{key:"revocable",value:function(t,e){var r=u(t,e);l.set(r.proxy,[t,e]);var n=r.revoke;return r.revoke=function(){l.set(r.proxy,[null,null]),n()},r}}],null&&o(t.prototype,null),e&&o(t,e),Object.defineProperty(t,"prototype",{writable:!1}),t;var t,e}();t.exports={getProxyDetails:f.getProxyDetails.bind(f),Proxy:f}},251(t){t.exports=URL},916(t,e,r){function n(t){return n="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t},n(t)}function o(t,e){return function(t){if(Array.isArray(t))return t}(t)||function(t,e){var r=null==t?null:"undefined"!=typeof Symbol&&t[Symbol.iterator]||t["@@iterator"];if(null!=r){var n,o,a,i,c=[],u=!0,l=!1;try{if(a=(r=r.call(t)).next,0===e){if(Object(r)!==r)return;u=!1}else for(;!(u=(n=a.call(r)).done)&&(c.push(n.value),c.length!==e);u=!0);}catch(t){l=!0,o=t}finally{try{if(!u&&null!=r.return&&(i=r.return(),Object(i)!==i))return}finally{if(l)throw o}}return c}}(t,e)||i(t,e)||function(){throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}()}function a(t,e){var r="undefined"!=typeof Symbol&&t[Symbol.iterator]||t["@@iterator"];if(!r){if(Array.isArray(t)||(r=i(t))||e&&t&&"number"==typeof t.length){r&&(t=r);var n=0,o=function(){};return{s:o,n:function(){return n>=t.length?{done:!0}:{done:!1,value:t[n++]}},e:function(t){throw t},f:o}}throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}var a,c=!0,u=!1;return{s:function(){r=r.call(t)},n:function(){var t=r.next();return c=t.done,t},e:function(t){u=!0,a=t},f:function(){try{c||null==r.return||r.return()}finally{if(u)throw a}}}}function i(t,e){if(t){if("string"==typeof t)return c(t,e);var r={}.toString.call(t).slice(8,-1);return"Object"===r&&t.constructor&&(r=t.constructor.name),"Map"===r||"Set"===r?Array.from(t):"Arguments"===r||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(r)?c(t,e):void 0}}function c(t,e){(null==e||e>t.length)&&(e=t.length);for(var r=0,n=Array(e);r<e;r++)n[r]=t[r];return n}var u=r(746),l=u.BigInt,f=u.Error,s=u.NumberParseInt,y=u.ObjectEntries,p=u.ObjectGetOwnPropertyDescriptor,g=u.ObjectGetOwnPropertyDescriptors,v=u.ObjectGetOwnPropertySymbols,h=u.ObjectPrototypeToString,d=u.Symbol,b=r(241),m=d("kPending"),S=d("kRejected");t.exports={constants:{kPending:m,kRejected:S,ALL_PROPERTIES:0,ONLY_ENUMERABLE:2},getOwnNonIndexProperties:function(t){var e,r=arguments.length>1&&void 0!==arguments[1]?arguments[1]:2,n=g(t),i=[],c=a(y(n));try{for(c.s();!(e=c.n()).done;){var u=o(e.value,2),l=u[0],f=u[1];if(!/^(0|[1-9][0-9]*)$/.test(l)||s(l,10)>=Math.pow(2,32)-1){if(2===r&&!f.enumerable)continue;i.push(l)}}}catch(t){c.e(t)}finally{c.f()}var h,d=a(v(t));try{for(d.s();!(h=d.n()).done;){var b=h.value,m=p(t,b);(2!==r||m.enumerable)&&i.push(b)}}catch(t){d.e(t)}finally{d.f()}return i},getPromiseDetails:function(){return[m,void 0]},getProxyDetails:b.getProxyDetails,Proxy:b.Proxy,previewEntries:function(t){return[[],!1]},getConstructorName:function(t){var e;if(!t||"object"!==n(t))throw new f("Invalid object");if(null!==(e=t.constructor)&&void 0!==e&&e.name)return t.constructor.name;var r=h(t).match(/^\[object ([^\]]+)\]/);return r?r[1]:"Object"},getExternalValue:function(){return l(0)}}}},e={};return function r(n){var o=e[n];if(void 0!==o)return o.exports;var a=e[n]={exports:{}};return t[n](a,a.exports,r),a.exports}(622)})());
}).call(this)}).call(this,require('_process'))
},{"_process":6}],6:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],7:[function(require,module,exports){
/* eslint-disable no-undef */
'use strict';

const {
  inspect
} = require('node-inspect-extracted');
const {
  Buffer
} = require('buffer');
const bdec = require('cbor-bigdecimal');
bdec(cbor);
const ofmt = document.getElementById('output-fmt');
const otxt = document.getElementById('output-text');
const itxt = document.getElementById('input-text');
const ifmt = document.getElementById('input-fmt');
const copy = document.getElementById('copy');
function error(e) {
  copy.disabled = true;
  otxt.value = e.toString();
}

// Convert any input to a buffer
function input() {
  const inp = ifmt.selectedOptions[0].label;
  const txt = itxt.value;
  switch (inp) {
    case 'JSON':
      return cbor.encodeOne(JSON.parse(txt), {
        canonical: true
      });
    case 'hex':
    case 'base64':
      return Buffer.from(txt, inp);
    default:
      throw new Error(`Unknown input: "${inp}"`);
  }
}

// Convert a buffer to the desired output format
function output(buf, _typ) {
  const outp = ofmt.selectedOptions[0].label;
  switch (outp) {
    case 'hex':
    case 'base64':
      copy.disabled = false;
      otxt.value = buf.toString(outp);
      break;
    case 'commented':
      copy.disabled = true;
      cbor.comment(buf).then(txt => {
        otxt.value = txt;
      }, error);
      break;
    case 'diagnostic':
      copy.disabled = true;
      cbor.diagnose(buf).then(txt => {
        otxt.value = txt;
      }, error);
      break;
    case 'js':
      copy.disabled = true;
      cbor.decodeFirst(buf).then(o => {
        otxt.value = inspect(o, {
          depth: Infinity,
          compact: 1,
          maxArrayLength: Infinity,
          breakLength: otxt.cols - 1
        });
      }, error);
      break;
    case 'JSON':
      copy.disabled = false;
      cbor.decodeFirst(buf, {
        bigint: true,
        preferWeb: true
      }).then(o => {
        otxt.value = JSON.stringify(o, null, 2);
      }, error);
      break;
    default:
      throw new Error(`Unknown output: "${outp}"`);
  }
}
function convert() {
  try {
    output(input());
  } catch (e) {
    error(e);
  }
}
ofmt.oninput = convert;
ifmt.oninput = convert;
copy.onclick = () => {
  // Copy output to input, and guess the new input format
  itxt.value = otxt.value;
  const sel = ofmt.selectedOptions[0].label;
  for (const o of ifmt.options) {
    if (o.label === sel) {
      ifmt.selectedIndex = o.index;
      break;
    }
  }
};

// Debounce
let timeout = null;
itxt.oninput = () => {
  clearTimeout(timeout);
  timeout = setTimeout(() => {
    timeout = null;
    convert();
  }, 300);
};

// Make sure that initial output is set
convert();

},{"buffer":3,"cbor-bigdecimal":8,"node-inspect-extracted":5}],8:[function(require,module,exports){
!function(e,t){"object"==typeof exports&&"object"==typeof module?module.exports=t(require("bignumber.js")):"function"==typeof define&&define.amd?define([],t):"object"==typeof exports?exports.cborBigDecimal=t(require("bignumber.js")):e.cborBigDecimal=t(e.BigNumber)}(this,e=>(()=>{"use strict";var t={68(e,t,i){const{BigNumber:n}=i(905);let r=null;const u=new n("0x20000000000000"),s=new n(2);function o(e,t){if(t.isNaN())return e._pushNaN();if(!t.isFinite())return e._pushInfinity(t.isNegative()?-1/0:1/0);if(t.isInteger())return e._pushJSBigint(BigInt(t.toFixed()));if(!e._pushTag(4)||!e._pushInt(2,4))return!1;const i=t.decimalPlaces(),n=t.shiftedBy(i);return!!e._pushIntNum(-i)&&(n.abs().isLessThan(u)?e._pushIntNum(n.toNumber()):e._pushJSBigint(BigInt(n.toFixed())))}function p(e){return new n(e[1]).shiftedBy(e[0])}function f(e){return s.pow(e[0]).times(e[1])}function c(e){return r=e,r.Encoder.SEMANTIC_TYPES[n.name]=o,r.Tagged.TAGS[4]=p,r.Tagged.TAGS[5]=f,r}c.BigNumber=n,e.exports=c},905(t){t.exports=e}},i={};return function e(n){var r=i[n];if(void 0!==r)return r.exports;var u=i[n]={exports:{}};return t[n](u,u.exports,e),u.exports}(68)})());
},{"bignumber.js":2}]},{},[7]);
