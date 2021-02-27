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
},{"base64-js":1,"buffer":2,"ieee754":3}],3:[function(require,module,exports){
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

},{}],4:[function(require,module,exports){
!function(t,e){"object"==typeof exports&&"object"==typeof module?module.exports=e():"function"==typeof define&&define.amd?define([],e):"object"==typeof exports?exports.util=e():t.util=e()}(this,(function(){return(()=>{"use strict";var t={255:(t,e)=>{e.l=class{hexSlice(t=0,e){return Array.prototype.map.call(this.slice(t,e),(t=>("00"+t.toString(16)).slice(-2))).join("")}}},48:(t,e,r)=>{const{internalBinding:n,Array:o,ArrayIsArray:i,ArrayPrototypeFilter:l,ArrayPrototypeForEach:c,ArrayPrototypePush:s,ArrayPrototypePushApply:a,ArrayPrototypeSort:p,ArrayPrototypeUnshift:u,BigIntPrototypeValueOf:y,BooleanPrototypeValueOf:f,DatePrototypeGetTime:g,DatePrototypeToISOString:d,DatePrototypeToString:h,ErrorPrototypeToString:b,FunctionPrototypeCall:m,FunctionPrototypeToString:$,JSONStringify:S,MapPrototypeGetSize:x,MapPrototypeEntries:P,MathFloor:O,MathMax:A,MathMin:v,MathRound:j,MathSqrt:w,Number:E,NumberIsNaN:L,NumberParseFloat:F,NumberParseInt:I,NumberPrototypeValueOf:k,Object:R,ObjectAssign:T,ObjectCreate:z,ObjectDefineProperty:N,ObjectGetOwnPropertyDescriptor:B,ObjectGetOwnPropertyNames:M,ObjectGetOwnPropertySymbols:_,ObjectGetPrototypeOf:D,ObjectIs:C,ObjectKeys:G,ObjectPrototypeHasOwnProperty:H,ObjectPrototypePropertyIsEnumerable:W,ObjectSeal:V,ObjectSetPrototypeOf:U,ReflectOwnKeys:Z,RegExp:Y,RegExpPrototypeTest:K,RegExpPrototypeToString:q,SafeStringIterator:J,SafeMap:Q,SafeSet:X,SetPrototypeGetSize:tt,SetPrototypeValues:et,String:rt,StringPrototypeCharCodeAt:nt,StringPrototypeCodePointAt:ot,StringPrototypeIncludes:it,StringPrototypeNormalize:lt,StringPrototypePadEnd:ct,StringPrototypePadStart:st,StringPrototypeRepeat:at,StringPrototypeReplace:pt,StringPrototypeSlice:ut,StringPrototypeSplit:yt,StringPrototypeToLowerCase:ft,StringPrototypeTrim:gt,StringPrototypeValueOf:dt,SymbolPrototypeToString:ht,SymbolPrototypeValueOf:bt,SymbolIterator:mt,SymbolToStringTag:$t,TypedArrayPrototypeGetLength:St,TypedArrayPrototypeGetSymbolToStringTag:xt,Uint8Array:Pt,uncurryThis:Ot}=r(765),{getOwnNonIndexProperties:At,getPromiseDetails:vt,getProxyDetails:jt,kPending:wt,kRejected:Et,previewEntries:Lt,getConstructorName:Ft,getExternalValue:It,propertyFilter:{ALL_PROPERTIES:kt,ONLY_ENUMERABLE:Rt},Proxy:Tt}=r(891),{customInspectSymbol:zt,isError:Nt,join:Bt,removeColors:Mt}=r(335),{codes:{ERR_INVALID_ARG_TYPE:_t},isStackOverflowError:Dt}=r(101),{isAsyncFunction:Ct,isGeneratorFunction:Gt,isAnyArrayBuffer:Ht,isArrayBuffer:Wt,isArgumentsObject:Vt,isBoxedPrimitive:Ut,isDataView:Zt,isExternal:Yt,isMap:Kt,isMapIterator:qt,isModuleNamespaceObject:Jt,isNativeError:Qt,isPromise:Xt,isSet:te,isSetIterator:ee,isWeakMap:re,isWeakSet:ne,isRegExp:oe,isDate:ie,isTypedArray:le,isStringObject:ce,isNumberObject:se,isBooleanObject:ae,isBigIntObject:pe}=r(63),ue=r(183),{NativeModule:ye}=r(992),{validateObject:fe}=r(356);let ge;const de=new X(l(M(r.g),(t=>K(/^[A-Z][a-zA-Z0-9]+$/,t)))),he=t=>void 0===t&&void 0!==t,be=V({showHidden:!1,depth:2,colors:!1,customInspect:!0,showProxy:!1,maxArrayLength:100,maxStringLength:1e4,breakLength:80,compact:3,sorted:!1,getters:!1}),me=/[\x00-\x1f\x27\x5c\x7f-\x9f]/,$e=/[\x00-\x1f\x27\x5c\x7f-\x9f]/g,Se=/[\x00-\x1f\x5c\x7f-\x9f]/,xe=/[\x00-\x1f\x5c\x7f-\x9f]/g,Pe=/^[a-zA-Z_][a-zA-Z_0-9]*$/,Oe=/^(0|[1-9][0-9]*)$/,Ae=/^    at (?:[^/\\(]+ \(|)node:(.+):\d+:\d+\)?$/,ve=/^    at (?:[^/\\(]+ \(|)((?<![/\\]).+)\.js:\d+:\d+\)?$/,je=/[/\\]node_modules[/\\](.+?)(?=[/\\])/g,we=/^(\s+[^(]*?)\s*{/,Ee=/(\/\/.*?\n)|(\/\*(.|\n)*?\*\/)/g,Le=["\\x00","\\x01","\\x02","\\x03","\\x04","\\x05","\\x06","\\x07","\\b","\\t","\\n","\\x0B","\\f","\\r","\\x0E","\\x0F","\\x10","\\x11","\\x12","\\x13","\\x14","\\x15","\\x16","\\x17","\\x18","\\x19","\\x1A","\\x1B","\\x1C","\\x1D","\\x1E","\\x1F","","","","","","","","\\'","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","\\\\","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","\\x7F","\\x80","\\x81","\\x82","\\x83","\\x84","\\x85","\\x86","\\x87","\\x88","\\x89","\\x8A","\\x8B","\\x8C","\\x8D","\\x8E","\\x8F","\\x90","\\x91","\\x92","\\x93","\\x94","\\x95","\\x96","\\x97","\\x98","\\x99","\\x9A","\\x9B","\\x9C","\\x9D","\\x9E","\\x9F"],Fe=new Y("[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:[a-zA-Z\\d]*(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)|(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-ntqry=><~]))","g");let Ie;function ke(t,e){const r={budget:{},indentationLvl:0,seen:[],currentDepth:0,stylize:De,showHidden:be.showHidden,depth:be.depth,colors:be.colors,customInspect:be.customInspect,showProxy:be.showProxy,maxArrayLength:be.maxArrayLength,maxStringLength:be.maxStringLength,breakLength:be.breakLength,compact:be.compact,sorted:be.sorted,getters:be.getters};if(arguments.length>1)if(arguments.length>2&&(void 0!==arguments[2]&&(r.depth=arguments[2]),arguments.length>3&&void 0!==arguments[3]&&(r.colors=arguments[3])),"boolean"==typeof e)r.showHidden=e;else if(e){const t=G(e);for(let n=0;n<t.length;++n){const o=t[n];H(be,o)||"stylize"===o?r[o]=e[o]:void 0===r.userOptions&&(r.userOptions=e)}}return r.colors&&(r.stylize=_e),null===r.maxArrayLength&&(r.maxArrayLength=1/0),null===r.maxStringLength&&(r.maxStringLength=1/0),Ye(r,t,0)}ke.custom=zt,N(ke,"defaultOptions",{get:()=>be,set:t=>(fe(t,"options"),T(be,t))});const Re=39,Te=49;function ze(t,e){N(ke.colors,e,{get(){return this[t]},set(e){this[t]=e},configurable:!0,enumerable:!1})}function Ne(t,e){return-1===e?`"${t}"`:-2===e?`\`${t}\``:`'${t}'`}ke.colors=T(z(null),{reset:[0,0],bold:[1,22],dim:[2,22],italic:[3,23],underline:[4,24],blink:[5,25],inverse:[7,27],hidden:[8,28],strikethrough:[9,29],doubleunderline:[21,24],black:[30,Re],red:[31,Re],green:[32,Re],yellow:[33,Re],blue:[34,Re],magenta:[35,Re],cyan:[36,Re],white:[37,Re],bgBlack:[40,Te],bgRed:[41,Te],bgGreen:[42,Te],bgYellow:[43,Te],bgBlue:[44,Te],bgMagenta:[45,Te],bgCyan:[46,Te],bgWhite:[47,Te],framed:[51,54],overlined:[53,55],gray:[90,Re],redBright:[91,Re],greenBright:[92,Re],yellowBright:[93,Re],blueBright:[94,Re],magentaBright:[95,Re],cyanBright:[96,Re],whiteBright:[97,Re],bgGray:[100,Te],bgRedBright:[101,Te],bgGreenBright:[102,Te],bgYellowBright:[103,Te],bgBlueBright:[104,Te],bgMagentaBright:[105,Te],bgCyanBright:[106,Te],bgWhiteBright:[107,Te]}),ze("gray","grey"),ze("gray","blackBright"),ze("bgGray","bgGrey"),ze("bgGray","bgBlackBright"),ze("dim","faint"),ze("strikethrough","crossedout"),ze("strikethrough","strikeThrough"),ze("strikethrough","crossedOut"),ze("hidden","conceal"),ze("inverse","swapColors"),ze("inverse","swapcolors"),ze("doubleunderline","doubleUnderline"),ke.styles=T(z(null),{special:"cyan",number:"yellow",bigint:"yellow",boolean:"yellow",undefined:"grey",null:"bold",string:"green",symbol:"green",date:"magenta",regexp:"red",module:"underline"});const Be=t=>Le[nt(t)];function Me(t){let e=me,r=$e,n=39;if(it(t,"'")&&(it(t,'"')?it(t,"`")||it(t,"${")||(n=-2):n=-1,39!==n&&(e=Se,r=xe)),t.length<5e3&&!K(e,t))return Ne(t,n);if(t.length>100)return Ne(t=pt(t,r,Be),n);let o="",i=0;const l=t.length;for(let e=0;e<l;e++){const r=nt(t,e);(r===n||92===r||r<32||r>126&&r<160)&&(o+=i===e?Le[r]:`${ut(t,i,e)}${Le[r]}`,i=e+1)}return i!==l&&(o+=ut(t,i)),Ne(o,n)}function _e(t,e){const r=ke.styles[e];if(void 0!==r){const e=ke.colors[r];if(void 0!==e)return`[${e[0]}m${t}[${e[1]}m`}return t}function De(t){return t}function Ce(){return[]}function Ge(t,e){try{return t instanceof e}catch{return!1}}function He(t,e,r,n){let o;const i=t;for(;t||he(t);){const l=B(t,"constructor");if(void 0!==l&&"function"==typeof l.value&&""!==l.value.name&&Ge(i,l.value))return void 0===n||o===t&&de.has(l.value.name)||We(e,i,o||i,r,n),l.value.name;t=D(t),void 0===o&&(o=t)}if(null===o)return null;const l=Ft(i);if(r>e.depth&&null!==e.depth)return`${l} <Complex prototype>`;const c=He(o,e,r+1,n);return null===c?`${l} <${ke(o,{...e,customInspect:!1,depth:-1})}>`:`${l} <${c}>`}function We(t,e,r,n,o){let i,l,a=0;do{if(0!==a||e===r){if(null===(r=D(r)))return;const t=B(r,"constructor");if(void 0!==t&&"function"==typeof t.value&&de.has(t.value.name))return}0===a?l=new X:c(i,(t=>l.add(t))),i=Z(r);for(const c of i){if("constructor"===c||H(e,c)||0!==a&&l.has(c))continue;const i=B(r,c);if("function"==typeof i.value)continue;const p=fr(t,r,n,c,0,i,e);t.colors?s(o,`[2m${p}[22m`):s(o,p)}}while(3!=++a)}function Ve(t,e,r,n=""){return null===t?""!==e&&r!==e?`[${r}${n}: null prototype] [${e}] `:`[${r}${n}: null prototype] `:""!==e&&t!==e?`${t}${n} [${e}] `:`${t}${n} `}function Ue(t,e){let r;const n=_(t);if(e)r=M(t),0!==n.length&&a(r,n);else{try{r=G(t)}catch(e){ue(Qt(e)&&"ReferenceError"===e.name&&Jt(t)),r=M(t)}0!==n.length&&a(r,l(n,(e=>W(t,e))))}return r}function Ze(t,e,r){let n="";return null===e&&(n=Ft(t),n===r&&(n="Object")),Ve(e,r,n)}function Ye(t,e,r,n){if("object"!=typeof e&&"function"!=typeof e&&!he(e))return Qe(t.stylize,e,t);if(null===e)return t.stylize("null","null");const o=e,l=jt(e,!!t.showProxy);if(void 0!==l){if(t.showProxy)return function(t,e,r){if(r>t.depth&&null!==t.depth)return t.stylize("Proxy [Array]","special");r+=1,t.indentationLvl+=2;const n=[Ye(t,e[0],r),Ye(t,e[1],r)];return t.indentationLvl-=2,dr(t,n,"",["Proxy [","]"],2,r)}(t,l,r);e=l}if(t.customInspect){const n=e[zt];if("function"==typeof n&&n!==ke&&(!e.constructor||e.constructor.prototype!==e)){const e=null===t.depth?null:t.depth-r,i=m(n,o,e,function(t,e){const r={stylize:t.stylize,showHidden:t.showHidden,depth:t.depth,colors:t.colors,customInspect:t.customInspect,showProxy:t.showProxy,maxArrayLength:t.maxArrayLength,maxStringLength:t.maxStringLength,breakLength:t.breakLength,compact:t.compact,sorted:t.sorted,getters:t.getters,...t.userOptions};if(e){U(r,null);for(const t of G(r))"object"!=typeof r[t]&&"function"!=typeof r[t]||null===r[t]||delete r[t];r.stylize=U(((e,r)=>{let n;try{n=`${t.stylize(e,r)}`}catch{}return"string"!=typeof n?e:n}),null)}return r}(t,void 0!==l||!(o instanceof R)));if(i!==o)return"string"!=typeof i?Ye(t,i,r):i.replace(/\n/g,`\n${" ".repeat(t.indentationLvl)}`)}}if(t.seen.includes(e)){let r=1;return void 0===t.circular?(t.circular=new Q,t.circular.set(e,r)):(r=t.circular.get(e),void 0===r&&(r=t.circular.size+1,t.circular.set(e,r))),t.stylize(`[Circular *${r}]`,"special")}return function(t,e,r,n){let o,l;t.showHidden&&(r<=t.depth||null===t.depth)&&(l=[]);const c=He(e,t,r,l);void 0!==l&&0===l.length&&(l=void 0);let s=e[$t];("string"!=typeof s||""!==s&&(t.showHidden?H:W)(e,$t))&&(s="");let a,p="",m=Ce,S=!0,O=0;const A=t.showHidden?kt:Rt;let v,j=0;if(e[mt]||null===c)if(S=!1,i(e)){const t="Array"!==c||""!==s?Ve(c,s,"Array",`(${e.length})`):"";if(o=At(e,A),a=[`${t}[`,"]"],0===e.length&&0===o.length&&void 0===l)return`${a[0]}]`;j=2,m=rr}else if(te(e)){const r=tt(e),n=Ve(c,s,"Set",`(${r})`);if(o=Ue(e,t.showHidden),m=null!==c?or.bind(null,e):or.bind(null,et(e)),0===r&&0===o.length&&void 0===l)return`${n}{}`;a=[`${n}{`,"}"]}else if(Kt(e)){const r=x(e),n=Ve(c,s,"Map",`(${r})`);if(o=Ue(e,t.showHidden),m=null!==c?ir.bind(null,e):ir.bind(null,P(e)),0===r&&0===o.length&&void 0===l)return`${n}{}`;a=[`${n}{`,"}"]}else if(le(e)){o=At(e,A);let r=e,n="";null===c&&(n=xt(e),r=new n(e));const i=St(e);if(a=[`${Ve(c,s,n,`(${i})`)}[`,"]"],0===e.length&&0===o.length&&!t.showHidden)return`${a[0]}]`;m=nr.bind(null,r,i),j=2}else qt(e)?(o=Ue(e,t.showHidden),a=Ke("Map",s),m=ur.bind(null,a)):ee(e)?(o=Ue(e,t.showHidden),a=Ke("Set",s),m=ur.bind(null,a)):S=!0;if(S)if(o=Ue(e,t.showHidden),a=["{","}"],"Object"===c){if(Vt(e)?a[0]="[Arguments] {":""!==s&&(a[0]=`${Ve(c,s,"Object")}{`),0===o.length&&void 0===l)return`${a[0]}}`}else if("function"==typeof e){if(p=function(t,e,r){const n=$(t);if("class"===n.slice(0,5)&&n.endsWith("}")){const o=n.slice(5,-1),i=o.indexOf("{");if(-1!==i&&(!o.slice(0,i).includes("(")||we.test(o.replace(Ee))))return function(t,e,r){let n=`class ${H(t,"name")&&t.name||"(anonymous)"}`;if("Function"!==e&&null!==e&&(n+=` [${e}]`),""!==r&&e!==r&&(n+=` [${r}]`),null!==e){const e=D(t).name;e&&(n+=` extends ${e}`)}else n+=" extends [null prototype]";return`[${n}]`}(t,e,r)}let o="Function";Gt(t)&&(o=`Generator${o}`),Ct(t)&&(o=`Async${o}`);let i=`[${o}`;return null===e&&(i+=" (null prototype)"),""===t.name?i+=" (anonymous)":i+=`: ${t.name}`,i+="]",e!==o&&null!==e&&(i+=` ${e}`),""!==r&&e!==r&&(i+=` [${r}]`),i}(e,c,s),0===o.length&&void 0===l)return t.stylize(p,"special")}else if(oe(e)){p=q(null!==c?e:new Y(e));const n=Ve(c,s,"RegExp");if("RegExp "!==n&&(p=`${n}${p}`),0===o.length&&void 0===l||r>t.depth&&null!==t.depth)return t.stylize(p,"regexp")}else if(ie(e)){p=L(g(e))?h(e):d(e);const r=Ve(c,s,"Date");if("Date "!==r&&(p=`${r}${p}`),0===o.length&&void 0===l)return t.stylize(p,"date")}else if(Nt(e)){if(p=function(t,e,r,n,o){const i=null!=t.name?rt(t.name):"Error";let l=i.length,c=t.stack?rt(t.stack):b(t);if(!n.showHidden&&0!==o.length)for(const e of["name","message","stack"]){const r=o.indexOf(e);-1!==r&&c.includes(t[e])&&o.splice(r,1)}if(null===e||i.endsWith("Error")&&c.startsWith(i)&&(c.length===l||":"===c[l]||"\n"===c[l])){let t="Error";if(null===e){const e=c.match(/^([A-Z][a-z_ A-Z0-9[\]()-]+)(?::|\n {4}at)/)||c.match(/^([a-z_A-Z0-9-]*Error)$/);t=e&&e[1]||"",l=t.length,t=t||"Error"}const n=Ve(e,r,t).slice(0,-1);i!==n&&(c=n.includes(i)?0===l?`${n}: ${c}`:`${n}${c.slice(l)}`:`${n} [${i}]${c.slice(l)}`)}let s=t.message&&c.indexOf(t.message)||-1;-1!==s&&(s+=t.message.length);const a=c.indexOf("\n    at",s);if(-1===a)c=`[${c}]`;else if(n.colors){let t=c.slice(0,a);const e=c.slice(a+1).split("\n");for(const r of e){const e=r.match(Ae)||r.match(ve);if(null!==e&&ye.exists(e[1]))t+=`\n${n.stylize(r,"undefined")}`;else{let e;t+="\n";let o=0;for(;e=je.exec(r);)t+=r.slice(o,e.index+14),t+=n.stylize(e[1],"module"),o=e.index+e[0].length;t+=0===o?r:r.slice(o)}}c=t}if(0!==n.indentationLvl){const t=" ".repeat(n.indentationLvl);c=c.replace(/\n/g,`\n${t}`)}return c}(e,c,s,t,o),0===o.length&&void 0===l)return p}else if(Ht(e)){const r=Ve(c,s,Wt(e)?"ArrayBuffer":"SharedArrayBuffer");if(void 0===n)m=er;else if(0===o.length&&void 0===l)return r+`{ byteLength: ${qe(t.stylize,e.byteLength)} }`;a[0]=`${r}{`,u(o,"byteLength")}else if(Zt(e))a[0]=`${Ve(c,s,"DataView")}{`,u(o,"byteLength","byteOffset","buffer");else if(Xt(e))a[0]=`${Ve(c,s,"Promise")}{`,m=yr;else if(ne(e))a[0]=`${Ve(c,s,"WeakSet")}{`,m=t.showHidden?ar:sr;else if(re(e))a[0]=`${Ve(c,s,"WeakMap")}{`,m=t.showHidden?pr:sr;else if(Jt(e))a[0]=`${Ve(c,s,"Module")}{`,m=Xe.bind(null,o);else if(Ut(e)){if(p=function(t,e,r,n,o){let i,l;se(t)?(i=k,l="Number"):ce(t)?(i=dt,l="String",r.splice(0,t.length)):ae(t)?(i=f,l="Boolean"):pe(t)?(i=y,l="BigInt"):(i=bt,l="Symbol");let c=`[${l}`;return l!==n&&(c+=null===n?" (null prototype)":` (${n})`),c+=`: ${Qe(De,i(t),e)}]`,""!==o&&o!==n&&(c+=` [${o}]`),0!==r.length||e.stylize===De?c:e.stylize(c,ft(l))}(e,t,o,c,s),0===o.length&&void 0===l)return p}else{if(0===o.length&&void 0===l){if(Yt(e)){const r=It(e).toString(16);return t.stylize(`[External: ${r}]`,"special")}return`${Ze(e,c,s)}{}`}a[0]=`${Ze(e,c,s)}{`}if(r>t.depth&&null!==t.depth){let r=Ze(e,c,s).slice(0,-1);return null!==c&&(r=`[${r}]`),t.stylize(r,"special")}r+=1,t.seen.push(e),t.currentDepth=r;const w=t.indentationLvl;try{for(v=m(t,e,r),O=0;O<o.length;O++)v.push(fr(t,e,r,o[O],j));void 0!==l&&v.push(...l)}catch(r){return function(t,e,r,n){if(Dt(e))return t.seen.pop(),t.indentationLvl=n,t.stylize(`[${r}: Inspection interrupted prematurely. Maximum call stack size exceeded.]`,"special");throw e}(t,r,Ze(e,c,s).slice(0,-1),w)}if(void 0!==t.circular){const r=t.circular.get(e);if(void 0!==r){const e=t.stylize(`<ref *${r}>`,"special");!0!==t.compact?p=""===p?e:`${e} ${p}`:a[0]=`${e} ${a[0]}`}}if(t.seen.pop(),t.sorted){const e=!0===t.sorted?void 0:t.sorted;if(0===j)v=v.sort(e);else if(o.length>1){const t=v.slice(v.length-o.length).sort(e);v.splice(v.length-o.length,o.length,...t)}}const E=dr(t,v,p,a,j,r,e),F=(t.budget[t.indentationLvl]||0)+E.length;return t.budget[t.indentationLvl]=F,F>2**27&&(t.depth=-1),E}(t,e,r,n)}function Ke(t,e){return e!==`${t} Iterator`&&(""!==e&&(e+="] ["),e+=`${t} Iterator`),[`[${e}] {`,"}"]}function qe(t,e){return t(C(e,-0)?"-0":`${e}`,"number")}function Je(t,e){return t(`${e}n`,"bigint")}function Qe(t,e,r){if("string"==typeof e){let n="";if(e.length>r.maxStringLength){const t=e.length-r.maxStringLength;e=e.slice(0,r.maxStringLength),n=`... ${t} more character${t>1?"s":""}`}return!0!==r.compact&&e.length>16&&e.length>r.breakLength-r.indentationLvl-4?e.split(/(?<=\n)/).map((e=>t(Me(e),"string"))).join(` +\n${" ".repeat(r.indentationLvl+2)}`)+n:t(Me(e),"string")+n}return"number"==typeof e?qe(t,e):"bigint"==typeof e?Je(t,e):"boolean"==typeof e?t(`${e}`,"boolean"):void 0===e?t("undefined","undefined"):t(ht(e),"symbol")}function Xe(t,e,r,n){const i=new o(t.length);for(let o=0;o<t.length;o++)try{i[o]=fr(e,r,n,t[o],0)}catch(r){if(!Qt(r)||"ReferenceError"!==r.name)throw r;const l={[t[o]]:""};i[o]=fr(e,l,n,t[o],0);const c=i[o].lastIndexOf(" ");i[o]=i[o].slice(0,c+1)+e.stylize("<uninitialized>","special")}return t.length=0,i}function tr(t,e,r,n,o,i){const l=G(e);let c=i;for(;i<l.length&&o.length<n;i++){const s=l[i],a=+s;if(a>2**32-2)break;if(`${c}`!==s){if(!Oe.test(s))break;const e=a-c,r=`<${e} empty item${e>1?"s":""}>`;if(o.push(t.stylize(r,"undefined")),c=a,o.length===n)break}o.push(fr(t,e,r,s,1)),c++}const s=e.length-c;if(o.length!==n){if(s>0){const e=`<${s} empty item${s>1?"s":""}>`;o.push(t.stylize(e,"undefined"))}}else s>0&&o.push(`... ${s} more item${s>1?"s":""}`);return o}function er(t,e){let n;try{n=new Pt(e)}catch{return[t.stylize("(detached)","special")]}void 0===ge&&(ge=Ot(r(255).l.prototype.hexSlice));let o=gt(pt(ge(n,0,v(t.maxArrayLength,n.length)),/(.{2})/g,"$1 "));const i=n.length-t.maxArrayLength;return i>0&&(o+=` ... ${i} more byte${i>1?"s":""}`),[`${t.stylize("[Uint8Contents]","special")}: <${o}>`]}function rr(t,e,r){const n=e.length,o=v(A(0,t.maxArrayLength),n),i=n-o,l=[];for(let n=0;n<o;n++){if(!H(e,n))return tr(t,e,r,o,l,n);l.push(fr(t,e,r,n,1))}return i>0&&l.push(`... ${i} more item${i>1?"s":""}`),l}function nr(t,e,r,n,i){const l=v(A(0,r.maxArrayLength),e),c=t.length-l,a=new o(l),p=t.length>0&&"number"==typeof t[0]?qe:Je;for(let e=0;e<l;++e)a[e]=p(r.stylize,t[e]);if(c>0&&(a[l]=`... ${c} more item${c>1?"s":""}`),r.showHidden){r.indentationLvl+=2;for(const e of["BYTES_PER_ELEMENT","length","byteLength","byteOffset","buffer"]){const n=Ye(r,t[e],i,!0);s(a,`[${e}]: ${n}`)}r.indentationLvl-=2}return a}function or(t,e,r,n){const o=[];e.indentationLvl+=2;for(const r of t)s(o,Ye(e,r,n));return e.indentationLvl-=2,o}function ir(t,e,r,n){const o=[];e.indentationLvl+=2;for(const[r,i]of t)o.push(`${Ye(e,r,n)} => `+Ye(e,i,n));return e.indentationLvl-=2,o}function lr(t,e,r,n){const i=A(t.maxArrayLength,0),l=v(i,r.length),c=new o(l);t.indentationLvl+=2;for(let n=0;n<l;n++)c[n]=Ye(t,r[n],e);t.indentationLvl-=2,0!==n||t.sorted||p(c);const a=r.length-l;return a>0&&s(c,`... ${a} more item${a>1?"s":""}`),c}function cr(t,e,r,n){const i=A(t.maxArrayLength,0),l=r.length/2,c=l-i,s=v(i,l);let a=new o(s),p=0;if(t.indentationLvl+=2,0===n){for(;p<s;p++){const n=2*p;a[p]=`${Ye(t,r[n],e)} => ${Ye(t,r[n+1],e)}`}t.sorted||(a=a.sort())}else for(;p<s;p++){const n=2*p,o=[Ye(t,r[n],e),Ye(t,r[n+1],e)];a[p]=dr(t,o,"",["[","]"],2,e)}return t.indentationLvl-=2,c>0&&a.push(`... ${c} more item${c>1?"s":""}`),a}function sr(t){return[t.stylize("<items unknown>","special")]}function ar(t,e,r){return lr(t,r,Lt(e),0)}function pr(t,e,r){return cr(t,r,Lt(e),0)}function ur(t,e,r,n){const[o,i]=Lt(r,!0);return i?(t[0]=t[0].replace(/ Iterator] {$/," Entries] {"),cr(e,n,o,2)):lr(e,n,o,1)}function yr(t,e,r){let n;const[o,i]=vt(e);if(o===wt)n=[t.stylize("<pending>","special")];else{t.indentationLvl+=2;const e=Ye(t,i,r);t.indentationLvl-=2,n=[o===Et?`${t.stylize("<rejected>","special")} ${e}`:e]}return n}function fr(t,e,r,n,o,i,l=e){let c,s,a=" ";if(void 0!==(i=i||B(e,n)||{value:e[n],enumerable:!0}).value){const e=!0!==t.compact||0!==o?2:3;t.indentationLvl+=e,s=Ye(t,i.value,r),3===e&&t.breakLength<Ie(s,t.colors)&&(a=`\n${" ".repeat(t.indentationLvl)}`),t.indentationLvl-=e}else if(void 0!==i.get){const e=void 0!==i.set?"Getter/Setter":"Getter",n=t.stylize,o="special";if(t.getters&&(!0===t.getters||"get"===t.getters&&void 0===i.set||"set"===t.getters&&void 0!==i.set))try{const c=m(i.get,l);if(t.indentationLvl+=2,null===c)s=`${n(`[${e}:`,o)} ${n("null","null")}${n("]",o)}`;else if("object"==typeof c)s=`${n(`[${e}]`,o)} ${Ye(t,c,r)}`;else{const r=Qe(n,c,t);s=`${n(`[${e}:`,o)} ${r}${n("]",o)}`}t.indentationLvl-=2}catch(t){const r=`<Inspection threw (${t.message})>`;s=`${n(`[${e}:`,o)} ${r}${n("]",o)}`}else s=t.stylize(`[${e}]`,o)}else s=void 0!==i.set?t.stylize("[Setter]","special"):t.stylize("undefined","undefined");if(1===o)return s;if("symbol"==typeof n){const e=pt(ht(n),$e,Be);c=`[${t.stylize(e,"symbol")}]`}else c=!1===i.enumerable?`[${pt(n,$e,Be)}]`:K(Pe,n)?t.stylize(n,"name"):t.stylize(Me(n),"string");return`${c}:${a}${s}`}function gr(t,e,r,n){let o=e.length+r;if(o+e.length>t.breakLength)return!1;for(let r=0;r<e.length;r++)if(t.colors?o+=Mt(e[r]).length:o+=e[r].length,o>t.breakLength)return!1;return""===n||!it(n,"\n")}function dr(t,e,r,n,i,l,c){if(!0!==t.compact){if("number"==typeof t.compact&&t.compact>=1){const a=e.length;if(2===i&&a>6&&(e=function(t,e,r){let n=0,i=0,l=0,c=e.length;t.maxArrayLength<e.length&&c--;const a=new o(c);for(;l<c;l++){const r=Ie(e[l],t.colors);a[l]=r,n+=r+2,i<r&&(i=r)}const p=i+2;if(3*p+t.indentationLvl<t.breakLength&&(n/p>5||i<=6)){const o=2.5,i=w(p-n/e.length),l=A(p-3-i,1),u=v(j(w(o*l*c)/l),O((t.breakLength-t.indentationLvl)/p),4*t.compact,15);if(u<=1)return e;const y=[],f=[];for(let t=0;t<u;t++){let r=0;for(let n=t;n<e.length;n+=u)a[n]>r&&(r=a[n]);r+=2,f[t]=r}let g=st;if(void 0!==r)for(let t=0;t<e.length;t++)if("number"!=typeof r[t]&&"bigint"!=typeof r[t]){g=ct;break}for(let t=0;t<c;t+=u){const r=v(t+u,c);let n="",o=t;for(;o<r-1;o++){const r=f[o-t]+e[o].length-a[o];n+=g(`${e[o]}, `,r," ")}if(g===st){const r=f[o-t]+e[o].length-a[o]-2;n+=st(e[o],r," ")}else n+=e[o];s(y,n)}t.maxArrayLength<e.length&&s(y,e[c]),e=y}return e}(t,e,c)),t.currentDepth-l<t.compact&&a===e.length&&gr(t,e,e.length+t.indentationLvl+n[0].length+r.length+10,r))return`${r?`${r} `:""}${n[0]} ${Bt(e,", ")} ${n[1]}`}const a=`\n${at(" ",t.indentationLvl)}`;return`${r?`${r} `:""}${n[0]}${a}  ${Bt(e,`,${a}  `)}${a}${n[1]}`}if(gr(t,e,0,r))return`${n[0]}${r?` ${r}`:""} ${Bt(e,", ")} `+n[1];const a=at(" ",t.indentationLvl),p=""===r&&1===n[0].length?" ":`${r?` ${r}`:""}\n${a}  `;return`${n[0]}${p}${Bt(e,`,\n${a}  `)} ${n[1]}`}function hr(t){const e=jt(t,!1);if(void 0!==e&&(t=e),"function"!=typeof t.toString)return!0;if(H(t,"toString"))return!1;let r=t;do{r=D(r)}while(!H(r,"toString"));const n=B(r,"constructor");return void 0!==n&&"function"==typeof n.value&&de.has(n.value.name)}const br=t=>yt(t.message,"\n",1)[0];let mr;function $r(t){try{return S(t)}catch(t){if(!mr)try{const t={};t.a=t,S(t)}catch(t){mr=br(t)}if("TypeError"===t.name&&br(t)===mr)return"[Circular]";throw t}}function Sr(t,e){const r=e[0];let n=0,o="",i="";if("string"==typeof r){if(1===e.length)return r;let l,c=0;for(let i=0;i<r.length-1;i++)if(37===nt(r,i)){const s=nt(r,++i);if(n+1!==e.length){switch(s){case 115:const s=e[++n];l="number"==typeof s?qe(De,s):"bigint"==typeof s?`${s}n`:"object"==typeof s&&null!==s&&hr(s)?ke(s,{...t,compact:3,colors:!1,depth:0}):rt(s);break;case 106:l=$r(e[++n]);break;case 100:const a=e[++n];l="bigint"==typeof a?`${a}n`:"symbol"==typeof a?"NaN":qe(De,E(a));break;case 79:l=ke(e[++n],t);break;case 111:l=ke(e[++n],{...t,showHidden:!0,showProxy:!0,depth:4});break;case 105:const p=e[++n];l="bigint"==typeof p?`${p}n`:"symbol"==typeof p?"NaN":qe(De,I(p));break;case 102:const u=e[++n];l="symbol"==typeof u?"NaN":qe(De,F(u));break;case 99:n+=1,l="";break;case 37:o+=ut(r,c,i),c=i+1;continue;default:continue}c!==i-1&&(o+=ut(r,c,i-1)),o+=l,c=i+1}else 37===s&&(o+=ut(r,c,i),c=i+1)}0!==c&&(n++,i=" ",c<r.length&&(o+=ut(r,c)))}for(;n<e.length;){const r=e[n];o+=i,o+="string"!=typeof r?ke(r,t):r,i=" ",n++}return o}if(n("config").hasIntl){const t=n("icu");Ie=function(e,r=!0){let n=0;r&&(e=xr(e));for(let r=0;r<e.length;r++){const o=e.charCodeAt(r);if(o>=127){n+=t.getStringWidth(e.slice(r).normalize("NFC"));break}n+=o>=32?1:0}return n}}else{Ie=function(r,n=!0){let o=0;n&&(r=xr(r)),r=lt(r,"NFC");for(const n of new J(r)){const r=ot(n,0);t(r)?o+=2:e(r)||o++}return o};const t=t=>t>=4352&&(t<=4447||9001===t||9002===t||t>=11904&&t<=12871&&12351!==t||t>=12880&&t<=19903||t>=19968&&t<=42182||t>=43360&&t<=43388||t>=44032&&t<=55203||t>=63744&&t<=64255||t>=65040&&t<=65049||t>=65072&&t<=65131||t>=65281&&t<=65376||t>=65504&&t<=65510||t>=110592&&t<=110593||t>=127488&&t<=127569||t>=127744&&t<=128591||t>=131072&&t<=262141),e=t=>t<=31||t>=127&&t<=159||t>=768&&t<=879||t>=8203&&t<=8207||t>=8400&&t<=8447||t>=65024&&t<=65039||t>=65056&&t<=65071||t>=917760&&t<=917999}function xr(t){return t.replace(Fe,"")}t.exports={inspect:ke,format:function(...t){return Sr(void 0,t)},formatWithOptions:function(t,...e){if("object"!=typeof t||null===t)throw new _t("inspectOptions","object",t);return Sr(t,e)},stylizeWithColor:_e,stylizeWithHTML(t,e){const r=ke.styles[e];return void 0!==r?`<span style="color:${r};">${t}</span>`:t},Proxy:Tt}},183:t=>{t.exports=function(t){if(!t)throw new Error("Assertion failed")}},992:(t,e)=>{e.NativeModule={exists:t=>!t.startsWith("/")}},101:(t,e,r)=>{const{ArrayIsArray:n,ArrayPrototypeIncludes:o,ArrayPrototypeIndexOf:i,ArrayPrototypeJoin:l,ArrayPrototypePop:c,ArrayPrototypePush:s,ArrayPrototypeSplice:a,ErrorCaptureStackTrace:p,ObjectDefineProperty:u,ReflectApply:y,RegExpPrototypeTest:f,SafeMap:g,StringPrototypeEndsWith:d,StringPrototypeIncludes:h,StringPrototypeSlice:b,StringPrototypeToLowerCase:m}=r(765),$=new g,S={},x=/^([A-Z][a-z0-9]*)+$/,P=["string","function","number","object","Function","Object","boolean","bigint","symbol"];let O,A,v=null;function j(){return v||(v=r(48)),v}const w=E((function(t,e,r){(t=L(t)).name=`${e} [${r}]`,t.stack,delete t.name}));function E(t){const e="__node_internal_"+t.name;return u(t,"name",{value:e}),t}const L=E((function(t){return O=Error.stackTraceLimit,Error.stackTraceLimit=1/0,p(t),Error.stackTraceLimit=O,t}));let F,I;var k,R,T,z,N;t.exports={codes:S,hideStackFrames:E,isStackOverflowError:function(t){if(void 0===I)try{!function t(){t()}()}catch(t){I=t.message,F=t.name}return t&&t.name===F&&t.message===I}},k="ERR_INVALID_ARG_TYPE",R=(t,e,r)=>{A("string"==typeof t,"'name' must be a string"),n(e)||(e=[e]);let p="The ";d(t," argument")?p+=`${t} `:p+=`"${t}" ${h(t,".")?"property":"argument"} `,p+="must be ";const u=[],y=[],g=[];for(const t of e)A("string"==typeof t,"All expected entries have to be of type string"),o(P,t)?s(u,m(t)):f(x,t)?s(y,t):(A("object"!==t,'The value "object" should be written as "Object"'),s(g,t));if(y.length>0){const t=i(u,"object");-1!==t&&(a(u,t,1),s(y,"Object"))}if(u.length>0){if(u.length>2){const t=c(u);p+=`one of type ${l(u,", ")}, or ${t}`}else p+=2===u.length?`one of type ${u[0]} or ${u[1]}`:`of type ${u[0]}`;(y.length>0||g.length>0)&&(p+=" or ")}if(y.length>0){if(y.length>2){const t=c(y);p+=`an instance of ${l(y,", ")}, or ${t}`}else p+=`an instance of ${y[0]}`,2===y.length&&(p+=` or ${y[1]}`);g.length>0&&(p+=" or ")}if(g.length>0)if(g.length>2){const t=c(g);p+=`one of ${l(g,", ")}, or ${t}`}else 2===g.length?p+=`one of ${g[0]} or ${g[1]}`:(m(g[0])!==g[0]&&(p+="an "),p+=`${g[0]}`);if(null==r)p+=`. Received ${r}`;else if("function"==typeof r&&r.name)p+=`. Received function ${r.name}`;else if("object"==typeof r)r.constructor&&r.constructor.name?p+=`. Received an instance of ${r.constructor.name}`:p+=`. Received ${j().inspect(r,{depth:-1})}`;else{let t=j().inspect(r,{colors:!1});t.length>25&&(t=`${b(t,0,25)}...`),p+=`. Received type ${typeof r} (${t})`}return p},T=TypeError,$.set(k,R),S[k]=(z=T,N=k,function(...t){const e=Error.stackTraceLimit;Error.stackTraceLimit=0;const n=new z;Error.stackTraceLimit=e;const o=function(t,e,n){const o=$.get(t);return void 0===A&&(A=r(183)),A("function"==typeof o),A(o.length<=e.length,`Code: ${t}; The provided arguments length (${e.length}) does not match the required ones (${o.length}).`),y(o,n,e)}(N,t,n);return u(n,"message",{value:o,enumerable:!1,writable:!0,configurable:!0}),u(n,"toString",{value(){return`${this.name} [${N}]: ${this.message}`},enumerable:!1,writable:!0,configurable:!0}),w(n,z.name,N),n.code=N,n})},335:t=>{const e=/\u001b\[\d\d?m/g;t.exports={customInspectSymbol:Symbol.for("nodejs.util.inspect.custom"),isError:t=>t instanceof Error,join:Array.prototype.join.call.bind(Array.prototype.join),removeColors:t=>String.prototype.replace.call(t,e,"")}},63:(t,e,r)=>{const{getConstructorName:n}=r(891);function o(t,...e){for(const r of e){const e=globalThis[r];if(e&&t instanceof e)return!0}for(;t;){if("object"!=typeof t)return!1;if(e.indexOf(n(t))>=0)return!0;t=Object.getPrototypeOf(t)}return!1}function i(t){return e=>{if(!o(e,t.name))return!1;try{t.prototype.valueOf.call(e)}catch{return!1}return!0}}"object"!=typeof globalThis&&(Object.defineProperty(Object.prototype,"__magic__",{get:function(){return this},configurable:!0}),__magic__.globalThis=__magic__,delete Object.prototype.__magic__);const l=i(String),c=i(Number),s=i(Boolean),a=i(BigInt),p=i(Symbol);t.exports={isAsyncFunction:t=>"function"==typeof t&&Function.prototype.toString.call(t).startsWith("async"),isGeneratorFunction:t=>"function"==typeof t&&Function.prototype.toString.call(t).match(/^(async\s+)?function *\*/),isAnyArrayBuffer:t=>o(t,"ArrayBuffer","SharedArrayBuffer"),isArrayBuffer:t=>o(t,"ArrayBuffer"),isArgumentsObject:t=>!1,isBoxedPrimitive:t=>c(t)||l(t)||s(t)||a(t)||p(t),isDataView:t=>o(t,"DataView"),isExternal:t=>"object"==typeof t&&Object.isFrozen(t)&&null==Object.getPrototypeOf(t),isMap(t){if(!o(t,"Map"))return!1;try{t.has()}catch{return!1}return!0},isMapIterator:t=>"[object Map Iterator]"===Object.prototype.toString.call(Object.getPrototypeOf(t)),isModuleNamespaceObject:t=>t&&"object"==typeof t&&"Module"===t[Symbol.toStringTag],isNativeError:t=>t instanceof Error&&o(t,"Error","EvalError","RangeError","ReferenceError","SyntaxError","TypeError","URIError","AggregateError"),isPromise:t=>o(t,"Promise"),isSet(t){if(!o(t,"Set"))return!1;try{t.has()}catch{return!1}return!0},isSetIterator:t=>"[object Set Iterator]"===Object.prototype.toString.call(Object.getPrototypeOf(t)),isWeakMap:t=>o(t,"WeakMap"),isWeakSet:t=>o(t,"WeakSet"),isRegExp:t=>o(t,"RegExp"),isDate(t){if(o(t,"Date"))try{return Date.prototype.getTime.call(t),!0}catch{}return!1},isTypedArray:t=>o(t,"Int8Array","Uint8Array","Uint8ClampedArray","Int16Array","Uint16Array","Int32Array","Uint32Array","Float32Array","Float64Array","BigInt64Array","BigUint64Array"),isStringObject:l,isNumberObject:c,isBooleanObject:s,isBigIntObject:a,isSymbolObject:p}},356:(t,e,r)=>{const{hideStackFrames:n,codes:{ERR_INVALID_ARG_TYPE:o}}=r(101);e.validateObject=n(((t,e,{nullable:r=!1}={})=>{if(!r&&null===t||Array.isArray(t)||"object"!=typeof t)throw new o(e,"Object",t)}))},765:t=>{const e=(t,e)=>{class r{constructor(e){this._iterator=t(e)}next(){return e(this._iterator)}[Symbol.iterator](){return this}}return Object.setPrototypeOf(r.prototype,null),Object.freeze(r.prototype),Object.freeze(r),r};function r(t,e){return Function.prototype.call.bind(t.prototype.__lookupGetter__(e))}function n(t){return Function.prototype.call.bind(t)}const o=(t,e)=>{Array.prototype.forEach.call(Reflect.ownKeys(t),(r=>{Reflect.getOwnPropertyDescriptor(e,r)||Reflect.defineProperty(e,r,Reflect.getOwnPropertyDescriptor(t,r))}))},i=(t,r)=>{if(Symbol.iterator in t.prototype){const o=new t;let i;Array.prototype.forEach.call(Reflect.ownKeys(t.prototype),(l=>{if(!Reflect.getOwnPropertyDescriptor(r.prototype,l)){const c=Reflect.getOwnPropertyDescriptor(t.prototype,l);if("function"==typeof c.value&&0===c.value.length&&Symbol.iterator in(Function.prototype.call.call(c.value,o)||{})){const t=n(c.value);null==i&&(i=n(t(o).next));const r=e(t,i);c.value=function(){return new r(this)}}Reflect.defineProperty(r.prototype,l,c)}}))}else o(t.prototype,r.prototype);return o(t,r),Object.setPrototypeOf(r.prototype,null),Object.freeze(r.prototype),Object.freeze(r),r},l=Function.prototype.call.bind(String.prototype[Symbol.iterator]),c=Reflect.getPrototypeOf(l(""));t.exports={makeSafe:i,internalBinding(t){if("config"===t)return{hasIntl:!1};throw new Error(`unknown module: "${t}"`)},Array,ArrayIsArray:Array.isArray,ArrayPrototypeFilter:Function.prototype.call.bind(Array.prototype.filter),ArrayPrototypeForEach:Function.prototype.call.bind(Array.prototype.forEach),ArrayPrototypeIncludes:Function.prototype.call.bind(Array.prototype.includes),ArrayPrototypeIndexOf:Function.prototype.call.bind(Array.prototype.indexOf),ArrayPrototypeJoin:Function.prototype.call.bind(Array.prototype.join),ArrayPrototypePop:Function.prototype.call.bind(Array.prototype.pop),ArrayPrototypePush:Function.prototype.call.bind(Array.prototype.push),ArrayPrototypePushApply:Function.apply.bind(Array.prototype.push),ArrayPrototypeSort:Function.prototype.call.bind(Array.prototype.sort),ArrayPrototypeSplice:Function.prototype.call.bind(Array.prototype.slice),ArrayPrototypeUnshift:Function.prototype.call.bind(Array.prototype.unshift),BigIntPrototypeValueOf:Function.prototype.call.bind(BigInt.prototype.valueOf),BooleanPrototypeValueOf:Function.prototype.call.bind(Boolean.prototype.valueOf),DatePrototypeGetTime:Function.prototype.call.bind(Date.prototype.getTime),DatePrototypeToISOString:Function.prototype.call.bind(Date.prototype.toISOString),DatePrototypeToString:Function.prototype.call.bind(Date.prototype.toString),ErrorCaptureStackTrace:function(t){const e=(new Error).stack;t.stack=e.replace(/.*\n.*/,"$1")},ErrorPrototypeToString:Function.prototype.call.bind(Error.prototype.toString),FunctionPrototypeCall:Function.prototype.call.bind(Function.prototype.call),FunctionPrototypeToString:Function.prototype.call.bind(Function.prototype.toString),JSONStringify:JSON.stringify,MapPrototypeGetSize:r(Map,"size"),MapPrototypeEntries:Function.prototype.call.bind(Map.prototype.entries),MathFloor:Math.floor,MathMax:Math.max,MathMin:Math.min,MathRound:Math.round,MathSqrt:Math.sqrt,Number,NumberIsNaN:Number.isNaN,NumberParseFloat:Number.parseFloat,NumberParseInt:Number.parseInt,NumberPrototypeValueOf:Function.prototype.call.bind(Number.prototype.valueOf),Object,ObjectAssign:Object.assign,ObjectCreate:Object.create,ObjectDefineProperty:Object.defineProperty,ObjectGetOwnPropertyDescriptor:Object.getOwnPropertyDescriptor,ObjectGetOwnPropertyNames:Object.getOwnPropertyNames,ObjectGetOwnPropertySymbols:Object.getOwnPropertySymbols,ObjectGetPrototypeOf:Object.getPrototypeOf,ObjectIs:Object.is,ObjectKeys:Object.keys,ObjectPrototypeHasOwnProperty:Function.prototype.call.bind(Object.prototype.hasOwnProperty),ObjectPrototypePropertyIsEnumerable:Function.prototype.call.bind(Object.prototype.propertyIsEnumerable),ObjectSeal:Object.seal,ObjectSetPrototypeOf:Object.setPrototypeOf,ReflectApply:Reflect.apply,ReflectOwnKeys:Reflect.ownKeys,RegExp,RegExpPrototypeTest:Function.prototype.call.bind(RegExp.prototype.test),RegExpPrototypeToString:Function.prototype.call.bind(RegExp.prototype.toString),SafeStringIterator:e(l,Function.prototype.call.bind(c.next)),SafeMap:i(Map,class extends Map{constructor(t){super(t)}}),SafeSet:i(Set,class extends Set{constructor(t){super(t)}}),SetPrototypeGetSize:r(Set,"size"),SetPrototypeValues:Function.prototype.call.bind(Set.prototype.values),String,StringPrototypeCharCodeAt:Function.prototype.call.bind(String.prototype.charCodeAt),StringPrototypeCodePointAt:Function.prototype.call.bind(String.prototype.codePointAt),StringPrototypeEndsWith:Function.prototype.call.bind(String.prototype.endsWith),StringPrototypeIncludes:Function.prototype.call.bind(String.prototype.includes),StringPrototypeNormalize:Function.prototype.call.bind(String.prototype.normalize),StringPrototypePadEnd:Function.prototype.call.bind(String.prototype.padEnd),StringPrototypePadStart:Function.prototype.call.bind(String.prototype.padStart),StringPrototypeRepeat:Function.prototype.call.bind(String.prototype.repeat),StringPrototypeReplace:Function.prototype.call.bind(String.prototype.replace),StringPrototypeSlice:Function.prototype.call.bind(String.prototype.slice),StringPrototypeSplit:Function.prototype.call.bind(String.prototype.split),StringPrototypeToLowerCase:Function.prototype.call.bind(String.prototype.toLowerCase),StringPrototypeTrim:Function.prototype.call.bind(String.prototype.trim),StringPrototypeValueOf:Function.prototype.call.bind(String.prototype.valueOf),SymbolPrototypeToString:Function.prototype.call.bind(Symbol.prototype.toString),SymbolPrototypeValueOf:Function.prototype.call.bind(Symbol.prototype.valueOf),SymbolIterator:Symbol.iterator,SymbolFor:Symbol.for,SymbolToStringTag:Symbol.toStringTag,TypedArrayPrototypeGetLength:("length",t=>t.constructor.prototype.__lookupGetter__("length").call(t)),Uint8Array,uncurryThis:n}},161:t=>{const e=new WeakMap;class r{constructor(t,r){const n=new Proxy(t,r);return e.set(n,[t,r]),n}static getProxyDetails(t,r=!0){const n=e.get(t);if(n)return r?n:n[0]}}t.exports={getProxyDetails:r.getProxyDetails.bind(r),Proxy:r}},891:(t,e,r)=>{const n=r(161),o=Symbol("kPending"),i=Symbol("kRejected");t.exports={getOwnNonIndexProperties:function(t,e=2){const r=Object.getOwnPropertyDescriptors(t),n=[];for(const[t,o]of Object.entries(r))if(!/^(0|[1-9][0-9]*)$/.test(t)||parseInt(t,10)>=2**32-1){if(2===e&&!o.enumerable)continue;n.push(t)}for(const r of Object.getOwnPropertySymbols(t)){const o=Object.getOwnPropertyDescriptor(t,r);(2!==e||o.enumerable)&&n.push(r)}return n},getPromiseDetails:()=>[o,void 0],getProxyDetails:n.getProxyDetails,Proxy:n.Proxy,kPending:o,kRejected:i,previewEntries:t=>[[],!1],getConstructorName(t){if(!t||"object"!=typeof t)throw new Error("Invalid object");if(t.constructor&&t.constructor.name)return t.constructor.name;const e=Object.prototype.toString.call(t).match(/^\[object ([^\]]+)\]/);return e?e[1]:"Object"},getExternalValue:()=>BigInt(0),propertyFilter:{ALL_PROPERTIES:0,ONLY_ENUMERABLE:2}}}},e={};function r(n){if(e[n])return e[n].exports;var o=e[n]={exports:{}};return t[n](o,o.exports,r),o.exports}return r.g=function(){if("object"==typeof globalThis)return globalThis;try{return this||new Function("return this")()}catch(t){if("object"==typeof window)return window}}(),r(48)})()}));
},{}],5:[function(require,module,exports){
/* eslint-disable no-undef */
'use strict';

const {
  inspect
} = require('node-inspect-extracted');

const {
  Buffer
} = require('buffer');

const ofmt = document.getElementById('output-fmt');
const otxt = document.getElementById('output-text');
const itxt = document.getElementById('input-text');
const ifmt = document.getElementById('input-fmt');
const copy = document.getElementById('copy');

function error(e) {
  copy.disabled = true;
  otxt.value = e.toString();
} // convert any input to a buffer


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
} // convert a buffer to the desired output format


function output(buf, typ) {
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
  // copy output to input, and guess the new input format
  itxt.value = otxt.value;
  const sel = ofmt.selectedOptions[0].label;

  for (const o of ifmt.options) {
    if (o.label === sel) {
      ifmt.selectedIndex = o.index;
      break;
    }
  }
}; // debounce


let timeout = null;

itxt.oninput = () => {
  clearTimeout(timeout);
  timeout = setTimeout(() => {
    timeout = null;
    convert();
  }, 300);
}; // make sure that initial output is set


convert();

},{"buffer":2,"node-inspect-extracted":4}]},{},[5]);
