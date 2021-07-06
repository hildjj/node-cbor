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
!function(t,e){"object"==typeof exports&&"object"==typeof module?module.exports=e():"function"==typeof define&&define.amd?define([],e):"object"==typeof exports?exports.util=e():t.util=e()}(this,(function(){return(()=>{"use strict";var t={794:(t,e)=>{function r(t,e){for(var r=0;r<e.length;r++){var n=e[r];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(t,n.key,n)}}var n=function(){function t(){!function(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}(this,t)}var e,n;return e=t,(n=[{key:"hexSlice",value:function(){var t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:0,e=arguments.length>1?arguments[1]:void 0;return Array.prototype.map.call(this.slice(t,e),(function(t){return("00"+t.toString(16)).slice(-2)})).join("")}}])&&r(e.prototype,n),t}();e.l=n},57:(t,e,r)=>{function n(t){return function(t){if(Array.isArray(t))return c(t)}(t)||function(t){if("undefined"!=typeof Symbol&&null!=t[Symbol.iterator]||null!=t["@@iterator"])return Array.from(t)}(t)||a(t)||function(){throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}()}function o(t){return(o="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t})(t)}function i(t,e){var r="undefined"!=typeof Symbol&&t[Symbol.iterator]||t["@@iterator"];if(!r){if(Array.isArray(t)||(r=a(t))||e&&t&&"number"==typeof t.length){r&&(t=r);var n=0,o=function(){};return{s:o,n:function(){return n>=t.length?{done:!0}:{done:!1,value:t[n++]}},e:function(t){throw t},f:o}}throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}var i,c=!0,l=!1;return{s:function(){r=r.call(t)},n:function(){var t=r.next();return c=t.done,t},e:function(t){l=!0,i=t},f:function(){try{c||null==r.return||r.return()}finally{if(l)throw i}}}}function a(t,e){if(t){if("string"==typeof t)return c(t,e);var r=Object.prototype.toString.call(t).slice(8,-1);return"Object"===r&&t.constructor&&(r=t.constructor.name),"Map"===r||"Set"===r?Array.from(t):"Arguments"===r||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(r)?c(t,e):void 0}}function c(t,e){(null==e||e>t.length)&&(e=t.length);for(var r=0,n=new Array(e);r<e;r++)n[r]=t[r];return n}function l(t,e){var r=Object.keys(t);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(t);e&&(n=n.filter((function(e){return Object.getOwnPropertyDescriptor(t,e).enumerable}))),r.push.apply(r,n)}return r}function u(t){for(var e=1;e<arguments.length;e++){var r=null!=arguments[e]?arguments[e]:{};e%2?l(Object(r),!0).forEach((function(e){p(t,e,r[e])})):Object.getOwnPropertyDescriptors?Object.defineProperties(t,Object.getOwnPropertyDescriptors(r)):l(Object(r)).forEach((function(e){Object.defineProperty(t,e,Object.getOwnPropertyDescriptor(r,e))}))}return t}function p(t,e,r){return e in t?Object.defineProperty(t,e,{value:r,enumerable:!0,configurable:!0,writable:!0}):t[e]=r,t}var f,y,s=r(489),g=s.internalBinding,d=s.Array,b=s.ArrayIsArray,h=s.ArrayPrototypeFilter,v=s.ArrayPrototypeForEach,m=s.ArrayPrototypePop,S=s.ArrayPrototypePush,P=s.ArrayPrototypePushApply,O=s.ArrayPrototypeSort,x=s.ArrayPrototypeUnshift,w=s.BigIntPrototypeValueOf,A=s.BooleanPrototypeValueOf,j=s.DatePrototypeGetTime,E=s.DatePrototypeToISOString,L=s.DatePrototypeToString,F=s.ErrorPrototypeToString,I=s.FunctionPrototypeCall,T=s.FunctionPrototypeToString,k=s.JSONStringify,R=s.MapPrototypeGetSize,z=s.MapPrototypeEntries,_=s.MathFloor,M=s.MathMax,B=s.MathMin,N=s.MathRound,D=s.MathSqrt,C=s.Number,G=s.NumberIsNaN,W=s.NumberParseFloat,H=s.NumberParseInt,V=s.NumberPrototypeValueOf,U=s.Object,$=s.ObjectAssign,Z=s.ObjectCreate,Y=s.ObjectDefineProperty,K=s.ObjectGetOwnPropertyDescriptor,q=s.ObjectGetOwnPropertyNames,J=s.ObjectGetOwnPropertySymbols,Q=s.ObjectGetPrototypeOf,X=s.ObjectIs,tt=s.ObjectKeys,et=s.ObjectPrototypeHasOwnProperty,rt=s.ObjectPrototypePropertyIsEnumerable,nt=s.ObjectSeal,ot=s.ObjectSetPrototypeOf,it=s.ReflectOwnKeys,at=s.RegExp,ct=s.RegExpPrototypeTest,lt=s.RegExpPrototypeToString,ut=s.SafeStringIterator,pt=s.SafeMap,ft=s.SafeSet,yt=s.SetPrototypeGetSize,st=s.SetPrototypeValues,gt=s.String,dt=s.StringPrototypeCharCodeAt,bt=s.StringPrototypeCodePointAt,ht=s.StringPrototypeIncludes,vt=s.StringPrototypeNormalize,mt=s.StringPrototypePadEnd,St=s.StringPrototypePadStart,Pt=s.StringPrototypeRepeat,Ot=s.StringPrototypeReplace,xt=s.StringPrototypeSlice,wt=s.StringPrototypeSplit,At=s.StringPrototypeToLowerCase,jt=s.StringPrototypeTrim,Et=s.StringPrototypeValueOf,Lt=s.SymbolPrototypeToString,Ft=s.SymbolPrototypeValueOf,It=s.SymbolIterator,Tt=s.SymbolToStringTag,kt=s.TypedArrayPrototypeGetLength,Rt=s.TypedArrayPrototypeGetSymbolToStringTag,zt=s.Uint8Array,_t=s.globalThis,Mt=s.uncurryThis,Bt=r(807),Nt=Bt.getOwnNonIndexProperties,Dt=Bt.getPromiseDetails,Ct=Bt.getProxyDetails,Gt=Bt.kPending,Wt=Bt.kRejected,Ht=Bt.previewEntries,Vt=Bt.getConstructorName,Ut=Bt.getExternalValue,$t=Bt.propertyFilter,Zt=$t.ALL_PROPERTIES,Yt=$t.ONLY_ENUMERABLE,Kt=Bt.Proxy,qt=r(185),Jt=qt.customInspectSymbol,Qt=qt.isError,Xt=qt.join,te=qt.removeColors,ee=r(3),re=ee.codes.ERR_INVALID_ARG_TYPE,ne=ee.isStackOverflowError,oe=r(653),ie=oe.isAsyncFunction,ae=oe.isGeneratorFunction,ce=oe.isAnyArrayBuffer,le=oe.isArrayBuffer,ue=oe.isArgumentsObject,pe=oe.isBoxedPrimitive,fe=oe.isDataView,ye=oe.isExternal,se=oe.isMap,ge=oe.isMapIterator,de=oe.isModuleNamespaceObject,be=oe.isNativeError,he=oe.isPromise,ve=oe.isSet,me=oe.isSetIterator,Se=oe.isWeakMap,Pe=oe.isWeakSet,Oe=oe.isRegExp,xe=oe.isDate,we=oe.isTypedArray,Ae=oe.isStringObject,je=oe.isNumberObject,Ee=oe.isBooleanObject,Le=oe.isBigIntObject,Fe=r(8),Ie=r(830).NativeModule,Te=r(383).validateObject,ke=new ft(h(q(_t),(function(t){return ct(/^[A-Z][a-zA-Z0-9]+$/,t)}))),Re=function(t){return void 0===t&&void 0!==t},ze=nt({showHidden:!1,depth:2,colors:!1,customInspect:!0,showProxy:!1,maxArrayLength:100,maxStringLength:1e4,breakLength:80,compact:3,sorted:!1,getters:!1}),_e=/[\x00-\x1f\x27\x5c\x7f-\x9f]/,Me=/[\x00-\x1f\x27\x5c\x7f-\x9f]/g,Be=/[\x00-\x1f\x5c\x7f-\x9f]/,Ne=/[\x00-\x1f\x5c\x7f-\x9f]/g,De=/^[a-zA-Z_][a-zA-Z_0-9]*$/,Ce=/^(0|[1-9][0-9]*)$/,Ge=/^    at (?:[^/\\(]+ \(|)node:(.+):\d+:\d+\)?$/,We=/^    at (?:[^/\\(]+ \(|)(.+)\.js:\d+:\d+\)?$/,He=/[/\\]node_modules[/\\](.+?)(?=[/\\])/g,Ve=/^(\s+[^(]*?)\s*{/,Ue=/(\/\/.*?\n)|(\/\*(.|\n)*?\*\/)/g,$e=["\\x00","\\x01","\\x02","\\x03","\\x04","\\x05","\\x06","\\x07","\\b","\\t","\\n","\\x0B","\\f","\\r","\\x0E","\\x0F","\\x10","\\x11","\\x12","\\x13","\\x14","\\x15","\\x16","\\x17","\\x18","\\x19","\\x1A","\\x1B","\\x1C","\\x1D","\\x1E","\\x1F","","","","","","","","\\'","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","\\\\","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","\\x7F","\\x80","\\x81","\\x82","\\x83","\\x84","\\x85","\\x86","\\x87","\\x88","\\x89","\\x8A","\\x8B","\\x8C","\\x8D","\\x8E","\\x8F","\\x90","\\x91","\\x92","\\x93","\\x94","\\x95","\\x96","\\x97","\\x98","\\x99","\\x9A","\\x9B","\\x9C","\\x9D","\\x9E","\\x9F"],Ze=new at("[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:[a-zA-Z\\d]*(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)|(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-ntqry=><~]))","g");function Ye(t,e){var r={budget:{},indentationLvl:0,seen:[],currentDepth:0,stylize:rr,showHidden:ze.showHidden,depth:ze.depth,colors:ze.colors,customInspect:ze.customInspect,showProxy:ze.showProxy,maxArrayLength:ze.maxArrayLength,maxStringLength:ze.maxStringLength,breakLength:ze.breakLength,compact:ze.compact,sorted:ze.sorted,getters:ze.getters};if(arguments.length>1)if(arguments.length>2&&(void 0!==arguments[2]&&(r.depth=arguments[2]),arguments.length>3&&void 0!==arguments[3]&&(r.colors=arguments[3])),"boolean"==typeof e)r.showHidden=e;else if(e)for(var n=tt(e),o=0;o<n.length;++o){var i=n[o];et(ze,i)||"stylize"===i?r[i]=e[i]:void 0===r.userOptions&&(r.userOptions=e)}return r.colors&&(r.stylize=er),null===r.maxArrayLength&&(r.maxArrayLength=1/0),null===r.maxStringLength&&(r.maxStringLength=1/0),pr(r,t,0)}Ye.custom=Jt,Y(Ye,"defaultOptions",{get:function(){return ze},set:function(t){return Te(t,"options"),$(ze,t)}});var Ke=39,qe=49;function Je(t,e){Y(Ye.colors,e,{get:function(){return this[t]},set:function(e){this[t]=e},configurable:!0,enumerable:!1})}function Qe(t,e){return-1===e?'"'.concat(t,'"'):-2===e?"`".concat(t,"`"):"'".concat(t,"'")}Ye.colors=$(Z(null),{reset:[0,0],bold:[1,22],dim:[2,22],italic:[3,23],underline:[4,24],blink:[5,25],inverse:[7,27],hidden:[8,28],strikethrough:[9,29],doubleunderline:[21,24],black:[30,Ke],red:[31,Ke],green:[32,Ke],yellow:[33,Ke],blue:[34,Ke],magenta:[35,Ke],cyan:[36,Ke],white:[37,Ke],bgBlack:[40,qe],bgRed:[41,qe],bgGreen:[42,qe],bgYellow:[43,qe],bgBlue:[44,qe],bgMagenta:[45,qe],bgCyan:[46,qe],bgWhite:[47,qe],framed:[51,54],overlined:[53,55],gray:[90,Ke],redBright:[91,Ke],greenBright:[92,Ke],yellowBright:[93,Ke],blueBright:[94,Ke],magentaBright:[95,Ke],cyanBright:[96,Ke],whiteBright:[97,Ke],bgGray:[100,qe],bgRedBright:[101,qe],bgGreenBright:[102,qe],bgYellowBright:[103,qe],bgBlueBright:[104,qe],bgMagentaBright:[105,qe],bgCyanBright:[106,qe],bgWhiteBright:[107,qe]}),Je("gray","grey"),Je("gray","blackBright"),Je("bgGray","bgGrey"),Je("bgGray","bgBlackBright"),Je("dim","faint"),Je("strikethrough","crossedout"),Je("strikethrough","strikeThrough"),Je("strikethrough","crossedOut"),Je("hidden","conceal"),Je("inverse","swapColors"),Je("inverse","swapcolors"),Je("doubleunderline","doubleUnderline"),Ye.styles=$(Z(null),{special:"cyan",number:"yellow",bigint:"yellow",boolean:"yellow",undefined:"grey",null:"bold",string:"green",symbol:"green",date:"magenta",regexp:"red",module:"underline"});var Xe=function(t){return $e[dt(t)]};function tr(t){var e=_e,r=Me,n=39;if(ht(t,"'")&&(ht(t,'"')?ht(t,"`")||ht(t,"${")||(n=-2):n=-1,39!==n&&(e=Be,r=Ne)),t.length<5e3&&!ct(e,t))return Qe(t,n);if(t.length>100)return Qe(t=Ot(t,r,Xe),n);for(var o="",i=0,a=t.length,c=0;c<a;c++){var l=dt(t,c);(l===n||92===l||l<32||l>126&&l<160)&&(o+=i===c?$e[l]:"".concat(xt(t,i,c)).concat($e[l]),i=c+1)}return i!==a&&(o+=xt(t,i)),Qe(o,n)}function er(t,e){var r=Ye.styles[e];if(void 0!==r){var n=Ye.colors[r];if(void 0!==n)return"[".concat(n[0],"m").concat(t,"[").concat(n[1],"m")}return t}function rr(t){return t}function nr(){return[]}function or(t,e){try{return t instanceof e}catch(t){return!1}}function ir(t,e,r,n){for(var o,i=t;t||Re(t);){var a=K(t,"constructor");if(void 0!==a&&"function"==typeof a.value&&""!==a.value.name&&or(i,a.value))return void 0===n||o===t&&ke.has(a.value.name)||ar(e,i,o||i,r,n),a.value.name;t=Q(t),void 0===o&&(o=t)}if(null===o)return null;var c=Vt(i);if(r>e.depth&&null!==e.depth)return"".concat(c," <Complex prototype>");var l=ir(o,e,r+1,n);return null===l?"".concat(c," <").concat(Ye(o,u(u({},e),{},{customInspect:!1,depth:-1})),">"):"".concat(c," <").concat(l,">")}function ar(t,e,r,n,o){var a,c,l=0;do{if(0!==l||e===r){if(null===(r=Q(r)))return;var u=K(r,"constructor");if(void 0!==u&&"function"==typeof u.value&&ke.has(u.value.name))return}0===l?c=new ft:v(a,(function(t){return c.add(t)})),a=it(r),S(t.seen,e);var p,f=i(a);try{for(f.s();!(p=f.n()).done;){var y=p.value;if(!("constructor"===y||et(e,y)||0!==l&&c.has(y))){var s=K(r,y);if("function"!=typeof s.value){var g=Fr(t,r,n,y,0,s,e);t.colors?S(o,"[2m".concat(g,"[22m")):S(o,g)}}}}catch(t){f.e(t)}finally{f.f()}m(t.seen)}while(3!=++l)}function cr(t,e,r){var n=arguments.length>3&&void 0!==arguments[3]?arguments[3]:"";return null===t?""!==e&&r!==e?"[".concat(r).concat(n,": null prototype] [").concat(e,"] "):"[".concat(r).concat(n,": null prototype] "):""!==e&&t!==e?"".concat(t).concat(n," [").concat(e,"] "):"".concat(t).concat(n," ")}function lr(t,e){var r,n=J(t);if(e)r=q(t),0!==n.length&&P(r,n);else{try{r=tt(t)}catch(e){Fe(be(e)&&"ReferenceError"===e.name&&de(t)),r=q(t)}0!==n.length&&P(r,h(n,(function(e){return rt(t,e)})))}return r}function ur(t,e,r){var n="";return null===e&&(n=Vt(t))===r&&(n="Object"),cr(e,r,n)}function pr(t,e,r,a){if("object"!==o(e)&&"function"!=typeof e&&!Re(e))return gr(t.stylize,e,t);if(null===e)return t.stylize("null","null");var c=e,l=Ct(e,!!t.showProxy);if(void 0!==l){if(t.showProxy)return function(t,e,r){if(r>t.depth&&null!==t.depth)return t.stylize("Proxy [Array]","special");r+=1,t.indentationLvl+=2;var n=[pr(t,e[0],r),pr(t,e[1],r)];return t.indentationLvl-=2,Tr(t,n,"",["Proxy [","]"],2,r)}(t,l,r);e=l}if(t.customInspect){var p=e[Jt];if("function"==typeof p&&p!==Ye&&(!e.constructor||e.constructor.prototype!==e)){var f=null===t.depth?null:t.depth-r,y=I(p,c,f,function(t,e){var r=u({stylize:t.stylize,showHidden:t.showHidden,depth:t.depth,colors:t.colors,customInspect:t.customInspect,showProxy:t.showProxy,maxArrayLength:t.maxArrayLength,maxStringLength:t.maxStringLength,breakLength:t.breakLength,compact:t.compact,sorted:t.sorted,getters:t.getters},t.userOptions);if(e){ot(r,null);var n,a=i(tt(r));try{for(a.s();!(n=a.n()).done;){var c=n.value;"object"!==o(r[c])&&"function"!=typeof r[c]||null===r[c]||delete r[c]}}catch(t){a.e(t)}finally{a.f()}r.stylize=ot((function(e,r){var n;try{n="".concat(t.stylize(e,r))}catch(t){}return"string"!=typeof n?e:n}),null)}return r}(t,void 0!==l||!(c instanceof U)));if(y!==c)return"string"!=typeof y?pr(t,y,r):y.replace(/\n/g,"\n".concat(" ".repeat(t.indentationLvl)))}}if(t.seen.includes(e)){var g=1;return void 0===t.circular?(t.circular=new pt,t.circular.set(e,g)):void 0===(g=t.circular.get(e))&&(g=t.circular.size+1,t.circular.set(e,g)),t.stylize("[Circular *".concat(g,"]"),"special")}return function(t,e,r,o){var a,c;t.showHidden&&(r<=t.depth||null===t.depth)&&(c=[]);var l=ir(e,t,r,c);void 0!==c&&0===c.length&&(c=void 0);var u=e[Tt];("string"!=typeof u||""!==u&&(t.showHidden?et:rt)(e,Tt))&&(u="");var p,f,y="",g=nr,d=!0,h=0,v=t.showHidden?Zt:Yt,m=0;if(e[It]||null===l)if(d=!1,b(e)){var S="Array"!==l||""!==u?cr(l,u,"Array","(".concat(e.length,")")):"";if(a=Nt(e,v),p=["".concat(S,"["),"]"],0===e.length&&0===a.length&&void 0===c)return"".concat(p[0],"]");m=2,g=vr}else if(ve(e)){var P=yt(e),O=cr(l,u,"Set","(".concat(P,")"));if(a=lr(e,t.showHidden),g=null!==l?Sr.bind(null,e):Sr.bind(null,st(e)),0===P&&0===a.length&&void 0===c)return"".concat(O,"{}");p=["".concat(O,"{"),"}"]}else if(se(e)){var I=R(e),k=cr(l,u,"Map","(".concat(I,")"));if(a=lr(e,t.showHidden),g=null!==l?Pr.bind(null,e):Pr.bind(null,z(e)),0===I&&0===a.length&&void 0===c)return"".concat(k,"{}");p=["".concat(k,"{"),"}"]}else if(we(e)){a=Nt(e,v);var _=e,M="";null===l&&(M=Rt(e),_=new s[M](e));var B=kt(e),N=cr(l,u,M,"(".concat(B,")"));if(p=["".concat(N,"["),"]"],0===e.length&&0===a.length&&!t.showHidden)return"".concat(p[0],"]");g=mr.bind(null,_,B),m=2}else ge(e)?(a=lr(e,t.showHidden),p=fr("Map",u),g=Er.bind(null,p)):me(e)?(a=lr(e,t.showHidden),p=fr("Set",u),g=Er.bind(null,p)):d=!0;if(d)if(a=lr(e,t.showHidden),p=["{","}"],"Object"===l){if(ue(e)?p[0]="[Arguments] {":""!==u&&(p[0]="".concat(cr(l,u,"Object"),"{")),0===a.length&&void 0===c)return"".concat(p[0],"}")}else if("function"==typeof e){if(y=function(t,e,r){var n=T(t);if("class"===n.slice(0,5)&&n.endsWith("}")){var o=n.slice(5,-1),i=o.indexOf("{");if(-1!==i&&(!o.slice(0,i).includes("(")||Ve.test(o.replace(Ue))))return function(t,e,r){var n=et(t,"name")&&t.name||"(anonymous)",o="class ".concat(n);if("Function"!==e&&null!==e&&(o+=" [".concat(e,"]")),""!==r&&e!==r&&(o+=" [".concat(r,"]")),null!==e){var i=Q(t).name;i&&(o+=" extends ".concat(i))}else o+=" extends [null prototype]";return"[".concat(o,"]")}(t,e,r)}var a="Function";ae(t)&&(a="Generator".concat(a)),ie(t)&&(a="Async".concat(a));var c="[".concat(a);return null===e&&(c+=" (null prototype)"),""===t.name?c+=" (anonymous)":c+=": ".concat(t.name),c+="]",e!==a&&null!==e&&(c+=" ".concat(e)),""!==r&&e!==r&&(c+=" [".concat(r,"]")),c}(e,l,u),0===a.length&&void 0===c)return t.stylize(y,"special")}else if(Oe(e)){y=lt(null!==l?e:new at(e));var D=cr(l,u,"RegExp");if("RegExp "!==D&&(y="".concat(D).concat(y)),0===a.length&&void 0===c||r>t.depth&&null!==t.depth)return t.stylize(y,"regexp")}else if(xe(e)){y=G(j(e))?L(e):E(e);var C=cr(l,u,"Date");if("Date "!==C&&(y="".concat(C).concat(y)),0===a.length&&void 0===c)return t.stylize(y,"date")}else if(Qt(e)){if(y=function(t,e,r,n,o){var a=null!=t.name?gt(t.name):"Error",c=a.length,l=t.stack?gt(t.stack):F(t);if(!n.showHidden&&0!==o.length)for(var u=0,p=["name","message","stack"];u<p.length;u++){var f=p[u],y=o.indexOf(f);-1!==y&&l.includes(t[f])&&o.splice(y,1)}if(null===e||a.endsWith("Error")&&l.startsWith(a)&&(l.length===c||":"===l[c]||"\n"===l[c])){var s="Error";if(null===e){var g=l.match(/^([A-Z][a-z_ A-Z0-9[\]()-]+)(?::|\n {4}at)/)||l.match(/^([a-z_A-Z0-9-]*Error)$/);c=(s=g&&g[1]||"").length,s=s||"Error"}var d=cr(e,r,s).slice(0,-1);a!==d&&(l=d.includes(a)?0===c?"".concat(d,": ").concat(l):"".concat(d).concat(l.slice(c)):"".concat(d," [").concat(a,"]").concat(l.slice(c)))}var b=t.message&&l.indexOf(t.message)||-1;-1!==b&&(b+=t.message.length);var h=l.indexOf("\n    at",b);if(-1===h)l="[".concat(l,"]");else if(n.colors){var v,m=l.slice(0,h),S=i(l.slice(h+1).split("\n"));try{for(S.s();!(v=S.n()).done;){var P=v.value,O=P.match(Ge)||P.match(We);if(null!==O&&Ie.exists(O[1]))m+="\n".concat(n.stylize(P,"undefined"));else{var x=void 0;m+="\n";for(var w=0;x=He.exec(P);)m+=P.slice(w,x.index+14),m+=n.stylize(x[1],"module"),w=x.index+x[0].length;m+=0===w?P:P.slice(w)}}}catch(t){S.e(t)}finally{S.f()}l=m}if(0!==n.indentationLvl){var A=" ".repeat(n.indentationLvl);l=l.replace(/\n/g,"\n".concat(A))}return l}(e,l,u,t,a),0===a.length&&void 0===c)return y}else if(ce(e)){var W=cr(l,u,le(e)?"ArrayBuffer":"SharedArrayBuffer");if(void 0===o)g=hr;else if(0===a.length&&void 0===c)return W+"{ byteLength: ".concat(yr(t.stylize,e.byteLength)," }");p[0]="".concat(W,"{"),x(a,"byteLength")}else if(fe(e))p[0]="".concat(cr(l,u,"DataView"),"{"),x(a,"byteLength","byteOffset","buffer");else if(he(e))p[0]="".concat(cr(l,u,"Promise"),"{"),g=Lr;else if(Pe(e))p[0]="".concat(cr(l,u,"WeakSet"),"{"),g=t.showHidden?Ar:wr;else if(Se(e))p[0]="".concat(cr(l,u,"WeakMap"),"{"),g=t.showHidden?jr:wr;else if(de(e))p[0]="".concat(cr(l,u,"Module"),"{"),g=dr.bind(null,a);else if(pe(e)){if(y=function(t,e,r,n,o){var i,a;je(t)?(i=V,a="Number"):Ae(t)?(i=Et,a="String",r.splice(0,t.length)):Ee(t)?(i=A,a="Boolean"):Le(t)?(i=w,a="BigInt"):(i=Ft,a="Symbol");var c="[".concat(a);return a!==n&&(c+=null===n?" (null prototype)":" (".concat(n,")")),c+=": ".concat(gr(rr,i(t),e),"]"),""!==o&&o!==n&&(c+=" [".concat(o,"]")),0!==r.length||e.stylize===rr?c:e.stylize(c,At(a))}(e,t,a,l,u),0===a.length&&void 0===c)return y}else{if(0===a.length&&void 0===c){if(ye(e)){var H=Ut(e).toString(16);return t.stylize("[External: ".concat(H,"]"),"special")}return"".concat(ur(e,l,u),"{}")}p[0]="".concat(ur(e,l,u),"{")}if(r>t.depth&&null!==t.depth){var U=ur(e,l,u).slice(0,-1);return null!==l&&(U="[".concat(U,"]")),t.stylize(U,"special")}r+=1,t.seen.push(e),t.currentDepth=r;var $=t.indentationLvl;try{for(f=g(t,e,r),h=0;h<a.length;h++)f.push(Fr(t,e,r,a[h],m));var Z;void 0!==c&&(Z=f).push.apply(Z,n(c))}catch(r){return function(t,e,r,n){if(ne(e))return t.seen.pop(),t.indentationLvl=n,t.stylize("[".concat(r,": Inspection interrupted ")+"prematurely. Maximum call stack size exceeded.]","special");Fe.fail(e.stack)}(t,r,ur(e,l,u).slice(0,-1),$)}if(void 0!==t.circular){var Y=t.circular.get(e);if(void 0!==Y){var K=t.stylize("<ref *".concat(Y,">"),"special");!0!==t.compact?y=""===y?K:"".concat(K," ").concat(y):p[0]="".concat(K," ").concat(p[0])}}if(t.seen.pop(),t.sorted){var q=!0===t.sorted?void 0:t.sorted;if(0===m)f=f.sort(q);else if(a.length>1){var J,X=f.slice(f.length-a.length).sort(q);(J=f).splice.apply(J,[f.length-a.length,a.length].concat(n(X)))}}var tt=Tr(t,f,y,p,m,r,e),nt=(t.budget[t.indentationLvl]||0)+tt.length;return t.budget[t.indentationLvl]=nt,nt>Math.pow(2,27)&&(t.depth=-1),tt}(t,e,r,a)}function fr(t,e){return e!=="".concat(t," Iterator")&&(""!==e&&(e+="] ["),e+="".concat(t," Iterator")),["[".concat(e,"] {"),"}"]}function yr(t,e){return t(X(e,-0)?"-0":"".concat(e),"number")}function sr(t,e){return t("".concat(e,"n"),"bigint")}function gr(t,e,r){if("string"==typeof e){var n="";if(e.length>r.maxStringLength){var o=e.length-r.maxStringLength;e=e.slice(0,r.maxStringLength),n="... ".concat(o," more character").concat(o>1?"s":"")}return!0!==r.compact&&e.length>16&&e.length>r.breakLength-r.indentationLvl-4?e.split(/\n/).map((function(e,r,n){return t(tr(e+(r===n.length-1?"":"\n")),"string")})).join(" +\n".concat(" ".repeat(r.indentationLvl+2)))+n:t(tr(e),"string")+n}return"number"==typeof e?yr(t,e):"bigint"==typeof e?sr(t,e):"boolean"==typeof e?t("".concat(e),"boolean"):void 0===e?t("undefined","undefined"):t(Lt(e),"symbol")}function dr(t,e,r,n){for(var o=new d(t.length),i=0;i<t.length;i++)try{o[i]=Fr(e,r,n,t[i],0)}catch(r){Fe(be(r)&&"ReferenceError"===r.name);var a=p({},t[i],"");o[i]=Fr(e,a,n,t[i],0);var c=o[i].lastIndexOf(" ");o[i]=o[i].slice(0,c+1)+e.stylize("<uninitialized>","special")}return t.length=0,o}function br(t,e,r,n,o,i){for(var a=tt(e),c=i;i<a.length&&o.length<n;i++){var l=a[i],u=+l;if(u>Math.pow(2,32)-2)break;if("".concat(c)!==l){if(!Ce.test(l))break;var p=u-c,f=p>1?"s":"",y="<".concat(p," empty item").concat(f,">");if(o.push(t.stylize(y,"undefined")),c=u,o.length===n)break}o.push(Fr(t,e,r,l,1)),c++}var s=e.length-c;if(o.length!==n){if(s>0){var g=s>1?"s":"",d="<".concat(s," empty item").concat(g,">");o.push(t.stylize(d,"undefined"))}}else s>0&&o.push("... ".concat(s," more item").concat(s>1?"s":""));return o}function hr(t,e){var n;try{n=new zt(e)}catch(e){return[t.stylize("(detached)","special")]}void 0===f&&(f=Mt(r(794).l.prototype.hexSlice));var o=jt(Ot(f(n,0,B(t.maxArrayLength,n.length)),/(.{2})/g,"$1 ")),i=n.length-t.maxArrayLength;return i>0&&(o+=" ... ".concat(i," more byte").concat(i>1?"s":"")),["".concat(t.stylize("[Uint8Contents]","special"),": <").concat(o,">")]}function vr(t,e,r){for(var n=e.length,o=B(M(0,t.maxArrayLength),n),i=n-o,a=[],c=0;c<o;c++){if(!et(e,c))return br(t,e,r,o,a,c);a.push(Fr(t,e,r,c,1))}return i>0&&a.push("... ".concat(i," more item").concat(i>1?"s":"")),a}function mr(t,e,r,n,o){for(var i=B(M(0,r.maxArrayLength),e),a=t.length-i,c=new d(i),l=t.length>0&&"number"==typeof t[0]?yr:sr,u=0;u<i;++u)c[u]=l(r.stylize,t[u]);if(a>0&&(c[i]="... ".concat(a," more item").concat(a>1?"s":"")),r.showHidden){r.indentationLvl+=2;for(var p=0,f=["BYTES_PER_ELEMENT","length","byteLength","byteOffset","buffer"];p<f.length;p++){var y=f[p],s=pr(r,t[y],o,!0);S(c,"[".concat(y,"]: ").concat(s))}r.indentationLvl-=2}return c}function Sr(t,e,r,n){var o=[];e.indentationLvl+=2;var a,c=i(t);try{for(c.s();!(a=c.n()).done;){var l=a.value;S(o,pr(e,l,n))}}catch(t){c.e(t)}finally{c.f()}return e.indentationLvl-=2,o}function Pr(t,e,r,n){var o=[];e.indentationLvl+=2;var a,c=i(t);try{for(c.s();!(a=c.n()).done;){var l=a.value,u=l[0],p=l[1];o.push("".concat(pr(e,u,n)," => ").concat(pr(e,p,n)))}}catch(t){c.e(t)}finally{c.f()}return e.indentationLvl-=2,o}function Or(t,e,r,n){var o=M(t.maxArrayLength,0),i=B(o,r.length),a=new d(i);t.indentationLvl+=2;for(var c=0;c<i;c++)a[c]=pr(t,r[c],e);t.indentationLvl-=2,0!==n||t.sorted||O(a);var l=r.length-i;return l>0&&S(a,"... ".concat(l," more item").concat(l>1?"s":"")),a}function xr(t,e,r,n){var o=M(t.maxArrayLength,0),i=r.length/2,a=i-o,c=B(o,i),l=new d(c),u=0;if(t.indentationLvl+=2,0===n){for(;u<c;u++){var p=2*u;l[u]="".concat(pr(t,r[p],e)," => ").concat(pr(t,r[p+1],e))}t.sorted||(l=l.sort())}else for(;u<c;u++){var f=2*u,y=[pr(t,r[f],e),pr(t,r[f+1],e)];l[u]=Tr(t,y,"",["[","]"],2,e)}return t.indentationLvl-=2,a>0&&l.push("... ".concat(a," more item").concat(a>1?"s":"")),l}function wr(t){return[t.stylize("<items unknown>","special")]}function Ar(t,e,r){return Or(t,r,Ht(e),0)}function jr(t,e,r){return xr(t,r,Ht(e),0)}function Er(t,e,r,n){var o=Ht(r,!0),i=o[0];return o[1]?(t[0]=t[0].replace(/ Iterator] {$/," Entries] {"),xr(e,n,i,2)):Or(e,n,i,1)}function Lr(t,e,r){var n,o=Dt(e),i=o[0],a=o[1];if(i===Gt)n=[t.stylize("<pending>","special")];else{t.indentationLvl+=2;var c=pr(t,a,r);t.indentationLvl-=2,n=[i===Wt?"".concat(t.stylize("<rejected>","special")," ").concat(c):c]}return n}function Fr(t,e,r,n,i,a){var c,l,u=arguments.length>6&&void 0!==arguments[6]?arguments[6]:e,p=" ";if(void 0!==(a=a||K(e,n)||{value:e[n],enumerable:!0}).value){var f=!0!==t.compact||0!==i?2:3;t.indentationLvl+=f,l=pr(t,a.value,r),3===f&&t.breakLength<y(l,t.colors)&&(p="\n".concat(" ".repeat(t.indentationLvl))),t.indentationLvl-=f}else if(void 0!==a.get){var s=void 0!==a.set?"Getter/Setter":"Getter",g=t.stylize,d="special";if(t.getters&&(!0===t.getters||"get"===t.getters&&void 0===a.set||"set"===t.getters&&void 0!==a.set))try{var b=I(a.get,u);if(t.indentationLvl+=2,null===b)l="".concat(g("[".concat(s,":"),d)," ").concat(g("null","null")).concat(g("]",d));else if("object"===o(b))l="".concat(g("[".concat(s,"]"),d)," ").concat(pr(t,b,r));else{var h=gr(g,b,t);l="".concat(g("[".concat(s,":"),d)," ").concat(h).concat(g("]",d))}t.indentationLvl-=2}catch(t){var v="<Inspection threw (".concat(t.message,")>");l="".concat(g("[".concat(s,":"),d)," ").concat(v).concat(g("]",d))}else l=t.stylize("[".concat(s,"]"),d)}else l=void 0!==a.set?t.stylize("[Setter]","special"):t.stylize("undefined","undefined");if(1===i)return l;if("symbol"===o(n)){var m=Ot(Lt(n),Me,Xe);c="[".concat(t.stylize(m,"symbol"),"]")}else if("__proto__"===n)c="['__proto__']";else if(!1===a.enumerable){var S=Ot(n,Me,Xe);c="[".concat(S,"]")}else c=ct(De,n)?t.stylize(n,"name"):t.stylize(tr(n),"string");return"".concat(c,":").concat(p).concat(l)}function Ir(t,e,r,n){var o=e.length+r;if(o+e.length>t.breakLength)return!1;for(var i=0;i<e.length;i++)if(t.colors?o+=te(e[i]).length:o+=e[i].length,o>t.breakLength)return!1;return""===n||!ht(n,"\n")}function Tr(t,e,r,n,o,i,a){if(!0!==t.compact){if("number"==typeof t.compact&&t.compact>=1){var c=e.length;if(2===o&&c>6&&(e=function(t,e,r){var n=0,o=0,i=0,a=e.length;t.maxArrayLength<e.length&&a--;for(var c=new d(a);i<a;i++){var l=y(e[i],t.colors);c[i]=l,n+=l+2,o<l&&(o=l)}var u=o+2;if(3*u+t.indentationLvl<t.breakLength&&(n/u>5||o<=6)){var p=D(u-n/e.length),f=M(u-3-p,1),s=B(N(D(2.5*f*a)/f),_((t.breakLength-t.indentationLvl)/u),4*t.compact,15);if(s<=1)return e;for(var g=[],b=[],h=0;h<s;h++){for(var v=0,m=h;m<e.length;m+=s)c[m]>v&&(v=c[m]);v+=2,b[h]=v}var P=St;if(void 0!==r)for(var O=0;O<e.length;O++)if("number"!=typeof r[O]&&"bigint"!=typeof r[O]){P=mt;break}for(var x=0;x<a;x+=s){for(var w=B(x+s,a),A="",j=x;j<w-1;j++){var E=b[j-x]+e[j].length-c[j];A+=P("".concat(e[j],", "),E," ")}if(P===St){var L=b[j-x]+e[j].length-c[j]-2;A+=St(e[j],L," ")}else A+=e[j];S(g,A)}t.maxArrayLength<e.length&&S(g,e[a]),e=g}return e}(t,e,a)),t.currentDepth-i<t.compact&&c===e.length&&Ir(t,e,e.length+t.indentationLvl+n[0].length+r.length+10,r))return"".concat(r?"".concat(r," "):"").concat(n[0]," ").concat(Xt(e,", "))+" ".concat(n[1])}var l="\n".concat(Pt(" ",t.indentationLvl));return"".concat(r?"".concat(r," "):"").concat(n[0]).concat(l,"  ")+"".concat(Xt(e,",".concat(l,"  "))).concat(l).concat(n[1])}if(Ir(t,e,0,r))return"".concat(n[0]).concat(r?" ".concat(r):""," ").concat(Xt(e,", ")," ")+n[1];var u=Pt(" ",t.indentationLvl),p=""===r&&1===n[0].length?" ":"".concat(r?" ".concat(r):"","\n").concat(u,"  ");return"".concat(n[0]).concat(p).concat(Xt(e,",\n".concat(u,"  "))," ").concat(n[1])}function kr(t){var e=Ct(t,!1);if(void 0!==e&&(t=e),"function"!=typeof t.toString)return!0;if(et(t,"toString"))return!1;var r=t;do{r=Q(r)}while(!et(r,"toString"));var n=K(r,"constructor");return void 0!==n&&"function"==typeof n.value&&ke.has(n.value.name)}var Rr,zr=function(t){return wt(t.message,"\n",1)[0]};function _r(t){try{return k(t)}catch(t){if(!Rr)try{var e={};e.a=e,k(e)}catch(t){Rr=zr(t)}if("TypeError"===t.name&&zr(t)===Rr)return"[Circular]";throw t}}function Mr(t,e){var r=e[0],n=0,i="",a="";if("string"==typeof r){if(1===e.length)return r;for(var c,l=0,p=0;p<r.length-1;p++)if(37===dt(r,p)){var f=dt(r,++p);if(n+1!==e.length){switch(f){case 115:var y=e[++n];c="number"==typeof y?yr(rr,y):"bigint"==typeof y?"".concat(y,"n"):"object"===o(y)&&null!==y&&kr(y)?Ye(y,u(u({},t),{},{compact:3,colors:!1,depth:0})):gt(y);break;case 106:c=_r(e[++n]);break;case 100:var s=e[++n];c="bigint"==typeof s?"".concat(s,"n"):"symbol"===o(s)?"NaN":yr(rr,C(s));break;case 79:c=Ye(e[++n],t);break;case 111:c=Ye(e[++n],u(u({},t),{},{showHidden:!0,showProxy:!0,depth:4}));break;case 105:var g=e[++n];c="bigint"==typeof g?"".concat(g,"n"):"symbol"===o(g)?"NaN":yr(rr,H(g));break;case 102:var d=e[++n];c="symbol"===o(d)?"NaN":yr(rr,W(d));break;case 99:n+=1,c="";break;case 37:i+=xt(r,l,p),l=p+1;continue;default:continue}l!==p-1&&(i+=xt(r,l,p-1)),i+=c,l=p+1}else 37===f&&(i+=xt(r,l,p),l=p+1)}0!==l&&(n++,a=" ",l<r.length&&(i+=xt(r,l)))}for(;n<e.length;){var b=e[n];i+=a,i+="string"!=typeof b?Ye(b,t):b,a=" ",n++}return i}if(g("config").hasIntl){var Br=g("icu");y=function(t){var e=!(arguments.length>1&&void 0!==arguments[1])||arguments[1],r=0;e&&(t=Cr(t));for(var n=0;n<t.length;n++){var o=t.charCodeAt(n);if(o>=127){r+=Br.getStringWidth(t.slice(n).normalize("NFC"));break}r+=o>=32?1:0}return r}}else{y=function(t){var e=!(arguments.length>1&&void 0!==arguments[1])||arguments[1],r=0;e&&(t=Cr(t)),t=vt(t,"NFC");var n,o=i(new ut(t));try{for(o.s();!(n=o.n()).done;){var a=n.value,c=bt(a,0);Nr(c)?r+=2:Dr(c)||r++}}catch(t){o.e(t)}finally{o.f()}return r};var Nr=function(t){return t>=4352&&(t<=4447||9001===t||9002===t||t>=11904&&t<=12871&&12351!==t||t>=12880&&t<=19903||t>=19968&&t<=42182||t>=43360&&t<=43388||t>=44032&&t<=55203||t>=63744&&t<=64255||t>=65040&&t<=65049||t>=65072&&t<=65131||t>=65281&&t<=65376||t>=65504&&t<=65510||t>=110592&&t<=110593||t>=127488&&t<=127569||t>=127744&&t<=128591||t>=131072&&t<=262141)},Dr=function(t){return t<=31||t>=127&&t<=159||t>=768&&t<=879||t>=8203&&t<=8207||t>=8400&&t<=8447||t>=65024&&t<=65039||t>=65056&&t<=65071||t>=917760&&t<=917999}}function Cr(t){return t.replace(Ze,"")}t.exports={inspect:Ye,format:function(){for(var t=arguments.length,e=new Array(t),r=0;r<t;r++)e[r]=arguments[r];return Mr(void 0,e)},formatWithOptions:function(t){if("object"!==o(t)||null===t)throw new re("inspectOptions","object",t);for(var e=arguments.length,r=new Array(e>1?e-1:0),n=1;n<e;n++)r[n-1]=arguments[n];return Mr(t,r)},getStringWidth:y,inspectDefaultOptions:ze,stripVTControlCharacters:Cr,stylizeWithColor:er,stylizeWithHTML:function(t,e){var r=Ye.styles[e];return void 0!==r?'<span style="color:'.concat(r,';">').concat(t,"</span>"):t},Proxy:Kt}},8:t=>{t.exports=function(t){if(!t)throw new Error("Assertion failed")}},830:(t,e)=>{e.NativeModule={exists:function(t){return!t.startsWith("/")}}},3:(t,e,r)=>{function n(t){return(n="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t})(t)}function o(t,e){(null==e||e>t.length)&&(e=t.length);for(var r=0,n=new Array(e);r<e;r++)n[r]=t[r];return n}var i,a,c=r(489),l=c.ArrayIsArray,u=c.ArrayPrototypeIncludes,p=c.ArrayPrototypeIndexOf,f=c.ArrayPrototypeJoin,y=c.ArrayPrototypePop,s=c.ArrayPrototypePush,g=c.ArrayPrototypeSplice,d=c.ErrorCaptureStackTrace,b=c.ObjectDefineProperty,h=c.ReflectApply,v=c.RegExpPrototypeTest,m=c.SafeMap,S=c.StringPrototypeEndsWith,P=c.StringPrototypeIncludes,O=c.StringPrototypeSlice,x=c.StringPrototypeToLowerCase,w=new m,A={},j=/^([A-Z][a-z0-9]*)+$/,E=["string","function","number","object","Function","Object","boolean","bigint","symbol"],L=null;function F(){return L||(L=r(57)),L}var I=T((function(t,e,r){(t=C(t)).name="".concat(e," [").concat(r,"]"),t.stack,delete t.name}));function T(t){var e="__node_internal_"+t.name;return b(t,"name",{value:e}),t}function k(t,e,n){var o=w.get(t);return void 0===a&&(a=r(8)),a("function"==typeof o),a(o.length<=e.length,"Code: ".concat(t,"; The provided arguments length (").concat(e.length,") does not ")+"match the required ones (".concat(o.length,").")),h(o,n,e)}var R,z,_,M,B,N,D,C=T((function(t){return i=Error.stackTraceLimit,Error.stackTraceLimit=1/0,d(t),Error.stackTraceLimit=i,t}));t.exports={codes:A,hideStackFrames:T,isStackOverflowError:function(t){if(void 0===z)try{!function t(){t()}()}catch(t){z=t.message,R=t.name}return t&&t.name===R&&t.message===z}},_="ERR_INVALID_ARG_TYPE",M=function(t,e,r){a("string"==typeof t,"'name' must be a string"),l(e)||(e=[e]);var i="The ";if(S(t," argument"))i+="".concat(t," ");else{var c=P(t,".")?"property":"argument";i+='"'.concat(t,'" ').concat(c," ")}i+="must be ";var d,b=[],h=[],m=[],w=function(t,e){var r="undefined"!=typeof Symbol&&t[Symbol.iterator]||t["@@iterator"];if(!r){if(Array.isArray(t)||(r=function(t,e){if(t){if("string"==typeof t)return o(t,e);var r=Object.prototype.toString.call(t).slice(8,-1);return"Object"===r&&t.constructor&&(r=t.constructor.name),"Map"===r||"Set"===r?Array.from(t):"Arguments"===r||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(r)?o(t,e):void 0}}(t))||e&&t&&"number"==typeof t.length){r&&(t=r);var n=0,i=function(){};return{s:i,n:function(){return n>=t.length?{done:!0}:{done:!1,value:t[n++]}},e:function(t){throw t},f:i}}throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}var a,c=!0,l=!1;return{s:function(){r=r.call(t)},n:function(){var t=r.next();return c=t.done,t},e:function(t){l=!0,a=t},f:function(){try{c||null==r.return||r.return()}finally{if(l)throw a}}}}(e);try{for(w.s();!(d=w.n()).done;){var A=d.value;a("string"==typeof A,"All expected entries have to be of type string"),u(E,A)?s(b,x(A)):v(j,A)?s(h,A):(a("object"!==A,'The value "object" should be written as "Object"'),s(m,A))}}catch(t){w.e(t)}finally{w.f()}if(h.length>0){var L=p(b,"object");-1!==L&&(g(b,L,1),s(h,"Object"))}if(b.length>0){if(b.length>2){var I=y(b);i+="one of type ".concat(f(b,", "),", or ").concat(I)}else i+=2===b.length?"one of type ".concat(b[0]," or ").concat(b[1]):"of type ".concat(b[0]);(h.length>0||m.length>0)&&(i+=" or ")}if(h.length>0){if(h.length>2){var T=y(h);i+="an instance of ".concat(f(h,", "),", or ").concat(T)}else i+="an instance of ".concat(h[0]),2===h.length&&(i+=" or ".concat(h[1]));m.length>0&&(i+=" or ")}if(m.length>0)if(m.length>2){var k=y(m);i+="one of ".concat(f(m,", "),", or ").concat(k)}else 2===m.length?i+="one of ".concat(m[0]," or ").concat(m[1]):(x(m[0])!==m[0]&&(i+="an "),i+="".concat(m[0]));if(null==r)i+=". Received ".concat(r);else if("function"==typeof r&&r.name)i+=". Received function ".concat(r.name);else if("object"===n(r))if(r.constructor&&r.constructor.name)i+=". Received an instance of ".concat(r.constructor.name);else{var R=F().inspect(r,{depth:-1});i+=". Received ".concat(R)}else{var z=F().inspect(r,{colors:!1});z.length>25&&(z="".concat(O(z,0,25),"...")),i+=". Received type ".concat(n(r)," (").concat(z,")")}return i},B=TypeError,w.set(_,M),A[_]=(N=B,D=_,function(){var t=Error.stackTraceLimit;Error.stackTraceLimit=0;var e=new N;Error.stackTraceLimit=t;for(var r=arguments.length,n=new Array(r),o=0;o<r;o++)n[o]=arguments[o];var i=k(D,n,e);return b(e,"message",{value:i,enumerable:!1,writable:!0,configurable:!0}),b(e,"toString",{value:function(){return"".concat(this.name," [").concat(D,"]: ").concat(this.message)},enumerable:!1,writable:!0,configurable:!0}),I(e,N.name,D),e.code=D,e})},185:t=>{var e=/\u001b\[\d\d?m/g;t.exports={customInspectSymbol:Symbol.for("nodejs.util.inspect.custom"),isError:function(t){return t instanceof Error},join:Array.prototype.join.call.bind(Array.prototype.join),removeColors:function(t){return String.prototype.replace.call(t,e,"")}}},653:(t,e,r)=>{function n(t){return(n="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t})(t)}var o=r(807).getConstructorName;function i(t){for(var e=arguments.length,r=new Array(e>1?e-1:0),i=1;i<e;i++)r[i-1]=arguments[i];for(var a=0,c=r;a<c.length;a++){var l=c[a],u=globalThis[l];if(u&&t instanceof u)return!0}for(;t;){if("object"!==n(t))return!1;if(r.indexOf(o(t))>=0)return!0;t=Object.getPrototypeOf(t)}return!1}function a(t){return function(e){if(!i(e,t.name))return!1;try{t.prototype.valueOf.call(e)}catch(t){return!1}return!0}}"object"!==("undefined"==typeof globalThis?"undefined":n(globalThis))&&(Object.defineProperty(Object.prototype,"__magic__",{get:function(){return this},configurable:!0}),__magic__.globalThis=__magic__,delete Object.prototype.__magic__);var c=a(String),l=a(Number),u=a(Boolean),p=a(BigInt),f=a(Symbol);t.exports={isAsyncFunction:function(t){return"function"==typeof t&&Function.prototype.toString.call(t).startsWith("async")},isGeneratorFunction:function(t){return"function"==typeof t&&Function.prototype.toString.call(t).match(/^(async\s+)?function *\*/)},isAnyArrayBuffer:function(t){return i(t,"ArrayBuffer","SharedArrayBuffer")},isArrayBuffer:function(t){return i(t,"ArrayBuffer")},isArgumentsObject:function(t){return!1},isBoxedPrimitive:function(t){return l(t)||c(t)||u(t)||p(t)||f(t)},isDataView:function(t){return i(t,"DataView")},isExternal:function(t){return"object"===n(t)&&Object.isFrozen(t)&&null==Object.getPrototypeOf(t)},isMap:function(t){if(!i(t,"Map"))return!1;try{t.has()}catch(t){return!1}return!0},isMapIterator:function(t){return"[object Map Iterator]"===Object.prototype.toString.call(Object.getPrototypeOf(t))},isModuleNamespaceObject:function(t){return t&&"object"===n(t)&&"Module"===t[Symbol.toStringTag]},isNativeError:function(t){return t instanceof Error&&i(t,"Error","EvalError","RangeError","ReferenceError","SyntaxError","TypeError","URIError","AggregateError")},isPromise:function(t){return i(t,"Promise")},isSet:function(t){if(!i(t,"Set"))return!1;try{t.has()}catch(t){return!1}return!0},isSetIterator:function(t){return"[object Set Iterator]"===Object.prototype.toString.call(Object.getPrototypeOf(t))},isWeakMap:function(t){return i(t,"WeakMap")},isWeakSet:function(t){return i(t,"WeakSet")},isRegExp:function(t){return i(t,"RegExp")},isDate:function(t){if(i(t,"Date"))try{return Date.prototype.getTime.call(t),!0}catch(t){}return!1},isTypedArray:function(t){return i(t,"Int8Array","Uint8Array","Uint8ClampedArray","Int16Array","Uint16Array","Int32Array","Uint32Array","Float32Array","Float64Array","BigInt64Array","BigUint64Array")},isStringObject:c,isNumberObject:l,isBooleanObject:u,isBigIntObject:p,isSymbolObject:f}},383:(t,e,r)=>{function n(t){return(n="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t})(t)}var o=r(3),i=o.hideStackFrames,a=o.codes.ERR_INVALID_ARG_TYPE;e.validateObject=i((function(t,e){var r=arguments.length>2&&void 0!==arguments[2]?arguments[2]:{},o=r.nullable,i=void 0!==o&&o;if(!i&&null===t||Array.isArray(t)||"object"!==n(t))throw new a(e,"Object",t)}))},489:(t,e,r)=>{function n(t){return(n="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t})(t)}function o(t,e){if("function"!=typeof e&&null!==e)throw new TypeError("Super expression must either be null or a function");t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,writable:!0,configurable:!0}}),e&&p(t,e)}function i(t){var e=u();return function(){var r,n=f(t);if(e){var o=f(this).constructor;r=Reflect.construct(n,arguments,o)}else r=n.apply(this,arguments);return a(this,r)}}function a(t,e){return!e||"object"!==n(e)&&"function"!=typeof e?function(t){if(void 0===t)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return t}(t):e}function c(t){var e="function"==typeof Map?new Map:void 0;return(c=function(t){if(null===t||(r=t,-1===Function.toString.call(r).indexOf("[native code]")))return t;var r;if("function"!=typeof t)throw new TypeError("Super expression must either be null or a function");if(void 0!==e){if(e.has(t))return e.get(t);e.set(t,n)}function n(){return l(t,arguments,f(this).constructor)}return n.prototype=Object.create(t.prototype,{constructor:{value:n,enumerable:!1,writable:!0,configurable:!0}}),p(n,t)})(t)}function l(t,e,r){return(l=u()?Reflect.construct:function(t,e,r){var n=[null];n.push.apply(n,e);var o=new(Function.bind.apply(t,n));return r&&p(o,r.prototype),o}).apply(null,arguments)}function u(){if("undefined"==typeof Reflect||!Reflect.construct)return!1;if(Reflect.construct.sham)return!1;if("function"==typeof Proxy)return!0;try{return Boolean.prototype.valueOf.call(Reflect.construct(Boolean,[],(function(){}))),!0}catch(t){return!1}}function p(t,e){return(p=Object.setPrototypeOf||function(t,e){return t.__proto__=e,t})(t,e)}function f(t){return(f=Object.setPrototypeOf?Object.getPrototypeOf:function(t){return t.__proto__||Object.getPrototypeOf(t)})(t)}function y(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}function s(t,e){for(var r=0;r<e.length;r++){var n=e[r];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(t,n.key,n)}}var g=function(t,e){var r=function(){function r(e){y(this,r),this._iterator=t(e)}var n,o;return n=r,(o=[{key:"next",value:function(){return e(this._iterator)}},{key:Symbol.iterator,value:function(){return this}}])&&s(n.prototype,o),r}();return Object.setPrototypeOf(r.prototype,null),Object.freeze(r.prototype),Object.freeze(r),r};function d(t,e){return Function.prototype.call.bind(t.prototype.__lookupGetter__(e))}function b(t){return Function.prototype.call.bind(t)}var h=function(t,e){Array.prototype.forEach.call(Reflect.ownKeys(t),(function(r){Reflect.getOwnPropertyDescriptor(e,r)||Reflect.defineProperty(e,r,Reflect.getOwnPropertyDescriptor(t,r))}))},v=function(t,e){if(Symbol.iterator in t.prototype){var r,n=new t;Array.prototype.forEach.call(Reflect.ownKeys(t.prototype),(function(o){if(!Reflect.getOwnPropertyDescriptor(e.prototype,o)){var i=Reflect.getOwnPropertyDescriptor(t.prototype,o);if("function"==typeof i.value&&0===i.value.length&&Symbol.iterator in(Function.prototype.call.call(i.value,n)||{})){var a=b(i.value);null==r&&(r=b(a(n).next));var c=g(a,r);i.value=function(){return new c(this)}}Reflect.defineProperty(e.prototype,o,i)}}))}else h(t.prototype,e.prototype);return h(t,e),Object.setPrototypeOf(e.prototype,null),Object.freeze(e.prototype),Object.freeze(e),e},m=Function.prototype.call.bind(String.prototype[Symbol.iterator]),S=Reflect.getPrototypeOf(m(""));t.exports={makeSafe:v,internalBinding:function(t){if("config"===t)return{hasIntl:!1};throw new Error('unknown module: "'.concat(t,'"'))},Array,ArrayIsArray:Array.isArray,ArrayPrototypeFilter:Function.prototype.call.bind(Array.prototype.filter),ArrayPrototypeForEach:Function.prototype.call.bind(Array.prototype.forEach),ArrayPrototypeIncludes:Function.prototype.call.bind(Array.prototype.includes),ArrayPrototypeIndexOf:Function.prototype.call.bind(Array.prototype.indexOf),ArrayPrototypeJoin:Function.prototype.call.bind(Array.prototype.join),ArrayPrototypePop:Function.prototype.call.bind(Array.prototype.pop),ArrayPrototypePush:Function.prototype.call.bind(Array.prototype.push),ArrayPrototypePushApply:Function.apply.bind(Array.prototype.push),ArrayPrototypeSort:Function.prototype.call.bind(Array.prototype.sort),ArrayPrototypeSplice:Function.prototype.call.bind(Array.prototype.slice),ArrayPrototypeUnshift:Function.prototype.call.bind(Array.prototype.unshift),BigIntPrototypeValueOf:Function.prototype.call.bind(BigInt.prototype.valueOf),BooleanPrototypeValueOf:Function.prototype.call.bind(Boolean.prototype.valueOf),DatePrototypeGetTime:Function.prototype.call.bind(Date.prototype.getTime),DatePrototypeToISOString:Function.prototype.call.bind(Date.prototype.toISOString),DatePrototypeToString:Function.prototype.call.bind(Date.prototype.toString),ErrorCaptureStackTrace:function(t){var e=(new Error).stack;t.stack=e.replace(/.*\n.*/,"$1")},ErrorPrototypeToString:Function.prototype.call.bind(Error.prototype.toString),FunctionPrototypeCall:Function.prototype.call.bind(Function.prototype.call),FunctionPrototypeToString:Function.prototype.call.bind(Function.prototype.toString),globalThis:"undefined"==typeof globalThis?r.g:globalThis,JSONStringify:JSON.stringify,MapPrototypeGetSize:d(Map,"size"),MapPrototypeEntries:Function.prototype.call.bind(Map.prototype.entries),MathFloor:Math.floor,MathMax:Math.max,MathMin:Math.min,MathRound:Math.round,MathSqrt:Math.sqrt,Number,NumberIsNaN:Number.isNaN,NumberParseFloat:Number.parseFloat,NumberParseInt:Number.parseInt,NumberPrototypeValueOf:Function.prototype.call.bind(Number.prototype.valueOf),Object,ObjectAssign:Object.assign,ObjectCreate:Object.create,ObjectDefineProperty:Object.defineProperty,ObjectGetOwnPropertyDescriptor:Object.getOwnPropertyDescriptor,ObjectGetOwnPropertyNames:Object.getOwnPropertyNames,ObjectGetOwnPropertySymbols:Object.getOwnPropertySymbols,ObjectGetPrototypeOf:Object.getPrototypeOf,ObjectIs:Object.is,ObjectKeys:Object.keys,ObjectPrototypeHasOwnProperty:Function.prototype.call.bind(Object.prototype.hasOwnProperty),ObjectPrototypePropertyIsEnumerable:Function.prototype.call.bind(Object.prototype.propertyIsEnumerable),ObjectSeal:Object.seal,ObjectSetPrototypeOf:Object.setPrototypeOf,ReflectApply:Reflect.apply,ReflectOwnKeys:Reflect.ownKeys,RegExp,RegExpPrototypeTest:Function.prototype.call.bind(RegExp.prototype.test),RegExpPrototypeToString:Function.prototype.call.bind(RegExp.prototype.toString),SafeStringIterator:g(m,Function.prototype.call.bind(S.next)),SafeMap:v(Map,function(t){o(r,t);var e=i(r);function r(t){return y(this,r),e.call(this,t)}return r}(c(Map))),SafeSet:v(Set,function(t){o(r,t);var e=i(r);function r(t){return y(this,r),e.call(this,t)}return r}(c(Set))),SetPrototypeGetSize:d(Set,"size"),SetPrototypeValues:Function.prototype.call.bind(Set.prototype.values),String,StringPrototypeCharCodeAt:Function.prototype.call.bind(String.prototype.charCodeAt),StringPrototypeCodePointAt:Function.prototype.call.bind(String.prototype.codePointAt),StringPrototypeEndsWith:Function.prototype.call.bind(String.prototype.endsWith),StringPrototypeIncludes:Function.prototype.call.bind(String.prototype.includes),StringPrototypeNormalize:Function.prototype.call.bind(String.prototype.normalize),StringPrototypePadEnd:Function.prototype.call.bind(String.prototype.padEnd),StringPrototypePadStart:Function.prototype.call.bind(String.prototype.padStart),StringPrototypeRepeat:Function.prototype.call.bind(String.prototype.repeat),StringPrototypeReplace:Function.prototype.call.bind(String.prototype.replace),StringPrototypeSlice:Function.prototype.call.bind(String.prototype.slice),StringPrototypeSplit:Function.prototype.call.bind(String.prototype.split),StringPrototypeToLowerCase:Function.prototype.call.bind(String.prototype.toLowerCase),StringPrototypeTrim:Function.prototype.call.bind(String.prototype.trim),StringPrototypeValueOf:Function.prototype.call.bind(String.prototype.valueOf),SymbolPrototypeToString:Function.prototype.call.bind(Symbol.prototype.toString),SymbolPrototypeValueOf:Function.prototype.call.bind(Symbol.prototype.valueOf),SymbolIterator:Symbol.iterator,SymbolFor:Symbol.for,SymbolToStringTag:Symbol.toStringTag,TypedArrayPrototypeGetLength:("length",function(t){return t.constructor.prototype.__lookupGetter__("length").call(t)}),Uint8Array,uncurryThis:b}},624:t=>{function e(t,e){for(var r=0;r<e.length;r++){var n=e[r];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(t,n.key,n)}}var r=new WeakMap,n=function(){function t(e,n){!function(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}(this,t);var o=new Proxy(e,n);return r.set(o,[e,n]),o}var n,o;return n=t,o=[{key:"getProxyDetails",value:function(t){var e=!(arguments.length>1&&void 0!==arguments[1])||arguments[1],n=r.get(t);if(n)return e?n:n[0]}}],null&&e(n.prototype,null),o&&e(n,o),t}();t.exports={getProxyDetails:n.getProxyDetails.bind(n),Proxy:n}},807:(t,e,r)=>{function n(t){return(n="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t})(t)}function o(t,e){var r="undefined"!=typeof Symbol&&t[Symbol.iterator]||t["@@iterator"];if(!r){if(Array.isArray(t)||(r=a(t))||e&&t&&"number"==typeof t.length){r&&(t=r);var n=0,o=function(){};return{s:o,n:function(){return n>=t.length?{done:!0}:{done:!1,value:t[n++]}},e:function(t){throw t},f:o}}throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}var i,c=!0,l=!1;return{s:function(){r=r.call(t)},n:function(){var t=r.next();return c=t.done,t},e:function(t){l=!0,i=t},f:function(){try{c||null==r.return||r.return()}finally{if(l)throw i}}}}function i(t,e){return function(t){if(Array.isArray(t))return t}(t)||function(t,e){var r=null==t?null:"undefined"!=typeof Symbol&&t[Symbol.iterator]||t["@@iterator"];if(null!=r){var n,o,i=[],a=!0,c=!1;try{for(r=r.call(t);!(a=(n=r.next()).done)&&(i.push(n.value),!e||i.length!==e);a=!0);}catch(t){c=!0,o=t}finally{try{a||null==r.return||r.return()}finally{if(c)throw o}}return i}}(t,e)||a(t,e)||function(){throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}()}function a(t,e){if(t){if("string"==typeof t)return c(t,e);var r=Object.prototype.toString.call(t).slice(8,-1);return"Object"===r&&t.constructor&&(r=t.constructor.name),"Map"===r||"Set"===r?Array.from(t):"Arguments"===r||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(r)?c(t,e):void 0}}function c(t,e){(null==e||e>t.length)&&(e=t.length);for(var r=0,n=new Array(e);r<e;r++)n[r]=t[r];return n}var l=r(624),u=Symbol("kPending"),p=Symbol("kRejected");t.exports={getOwnNonIndexProperties:function(t){for(var e=arguments.length>1&&void 0!==arguments[1]?arguments[1]:2,r=Object.getOwnPropertyDescriptors(t),n=[],a=0,c=Object.entries(r);a<c.length;a++){var l=i(c[a],2),u=l[0],p=l[1];if(!/^(0|[1-9][0-9]*)$/.test(u)||parseInt(u,10)>=Math.pow(2,32)-1){if(2===e&&!p.enumerable)continue;n.push(u)}}var f,y=o(Object.getOwnPropertySymbols(t));try{for(y.s();!(f=y.n()).done;){var s=f.value,g=Object.getOwnPropertyDescriptor(t,s);(2!==e||g.enumerable)&&n.push(s)}}catch(t){y.e(t)}finally{y.f()}return n},getPromiseDetails:function(){return[u,void 0]},getProxyDetails:l.getProxyDetails,Proxy:l.Proxy,kPending:u,kRejected:p,previewEntries:function(t){return[[],!1]},getConstructorName:function(t){if(!t||"object"!==n(t))throw new Error("Invalid object");if(t.constructor&&t.constructor.name)return t.constructor.name;var e=Object.prototype.toString.call(t).match(/^\[object ([^\]]+)\]/);return e?e[1]:"Object"},getExternalValue:function(){return BigInt(0)},propertyFilter:{ALL_PROPERTIES:0,ONLY_ENUMERABLE:2}}}},e={};function r(n){var o=e[n];if(void 0!==o)return o.exports;var i=e[n]={exports:{}};return t[n](i,i.exports,r),i.exports}return r.g=function(){if("object"==typeof globalThis)return globalThis;try{return this||new Function("return this")()}catch(t){if("object"==typeof window)return window}}(),r(57)})()}));
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
