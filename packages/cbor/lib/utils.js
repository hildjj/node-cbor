import {BI, NUMBYTES, SHIFT32, SYMS} from './constants.js'
import {Buffer} from 'buffer'
import {NoFilter} from 'nofilter'
import {Readable} from 'stream'

const MAX_SAFE_HIGH = 0x1fffff

const td = new TextDecoder('utf8', {fatal: true, ignoreBOM: true})

/**
 * Convert a UTF8-encoded Buffer to a JS string.  If possible, throw an error
 * on invalid UTF8.  Byte Order Marks are not looked at or stripped.
 *
 * @param {Buffer} buf The buffer to convert.
 * @returns {string} UTF8-decoded.
 * @private
 */
export function utf8(buf) {
  return td.decode(buf)
}
utf8.checksUTF8 = true

/**
 * Type guard for readable stream.
 *
 * @param {any} s The potential stream.
 * @returns {s is Readable} Can be used as a Readable.
 * @private
 */
function isReadable(s) {
  // Is this a readable stream?  In the webpack version, instanceof isn't
  // working correctly.
  if (s instanceof Readable) {
    return true
  }
  return ['read', 'on', 'pipe'].every(f => typeof s[f] === 'function')
}

/**
 * Type guard for buffer-like objects.
 *
 * @param {any} b The candidate object.
 * @returns {b is ArrayBufferView}
 *   Safe to typecast b (boolean).
 * @private
 */
export function isBufferish(b) {
  return b && (typeof b === 'object') && (ArrayBuffer.isView(b))
}

/**
 * Convert object to a buffer.
 *
 * @param {Buffer|ArrayBuffer|ArrayBufferView} b Candidate object.
 * @returns {Buffer|null} Object converted to Buffer, if possible.
 *   Otherwise null.
 * @private
 */
export function bufferishToBuffer(b) {
  if (Buffer.isBuffer(b)) {
    return b
  } else if (ArrayBuffer.isView(b)) {
    return Buffer.from(b.buffer, b.byteOffset, b.byteLength)
  } else if (b instanceof ArrayBuffer) {
    return Buffer.from(b)
  }
  return null
}

/**
 * Parse a CBOR integer from a Buffer.
 *
 * @param {number} ai Additional Information.
 * @param {Buffer} buf Buffer.
 * @returns {number|bigint} Converted integer.
 * @throws {Error} Invalid AI.
 * @private
 */
export function parseCBORint(ai, buf) {
  switch (ai) {
    case NUMBYTES.ONE:
      return buf.readUInt8(0)
    case NUMBYTES.TWO:
      return buf.readUInt16BE(0)
    case NUMBYTES.FOUR:
      return buf.readUInt32BE(0)
    case NUMBYTES.EIGHT: {
      const f = buf.readUInt32BE(0)
      const g = buf.readUInt32BE(4)
      if (f > MAX_SAFE_HIGH) {
        return (BigInt(f) * BI.SHIFT32) + BigInt(g)
      }
      return (f * SHIFT32) + g
    }
    default:
      throw new Error(`Invalid additional info for int: ${ai}`)
  }
}

/**
 * Write a half-sized (2 byte) float to a buffer.
 *
 * @param {Buffer} buf Buffer.
 * @param {number} half Number to encode.
 * @returns {boolean} Success if true.
 * @private
 */
export function writeHalf(buf, half) {
  // Assume 0, -0, NaN, Infinity, and -Infinity have already been caught

  // HACK: everyone settle in.  This isn't going to be pretty.
  // Translate cn-cbor's C code (from Carsten Borman):

  // uint32_t be32;
  // uint16_t be16, u16;
  // union {
  //   float f;
  //   uint32_t u;
  // } u32;
  // u32.f = float_val;

  const u32 = Buffer.allocUnsafe(4)
  u32.writeFloatBE(half, 0)
  const u = u32.readUInt32BE(0)

  // If ((u32.u & 0x1FFF) == 0) { /* worth trying half */

  // hildjj: If the lower 13 bits aren't 0,
  // we will lose precision in the conversion.
  // mant32 = 24bits, mant16 = 11bits, 24-11 = 13
  if ((u & 0x1FFF) !== 0) {
    return false
  }

  // Sign, exponent, mantissa
  //   int s16 = (u32.u >> 16) & 0x8000;
  //   int exp = (u32.u >> 23) & 0xff;
  //   int mant = u32.u & 0x7fffff;

  let s16 = (u >> 16) & 0x8000 // Top bit is sign
  const exp = (u >> 23) & 0xff // Then 5 bits of exponent
  const mant = u & 0x7fffff

  // Hildjj: zeros already handled.  Assert if you don't believe me.
  //   if (exp == 0 && mant == 0)
  //     ;              /* 0.0, -0.0 */

  //   else if (exp >= 113 && exp <= 142) /* normalized */
  //     s16 += ((exp - 112) << 10) + (mant >> 13);

  if ((exp >= 113) && (exp <= 142)) {
    s16 += ((exp - 112) << 10) + (mant >> 13)
  } else if ((exp >= 103) && (exp < 113)) {
    // Denormalized numbers
    //   else if (exp >= 103 && exp < 113) { /* denorm, exp16 = 0 */
    //     if (mant & ((1 << (126 - exp)) - 1))
    //       goto float32;         /* loss of precision */
    //     s16 += ((mant + 0x800000) >> (126 - exp));

    if (mant & ((1 << (126 - exp)) - 1)) {
      return false
    }
    s16 += ((mant + 0x800000) >> (126 - exp))
  } else {
  //   } else if (exp == 255 && mant == 0) { /* Inf */
  //     s16 += 0x7c00;

    // hildjj: Infinity already handled

    //   } else
    //     goto float32;           /* loss of range */

    return false
  }

  // Done
  //   ensure_writable(3);
  //   u16 = s16;
  //   be16 = hton16p((const uint8_t*)&u16);
  buf.writeUInt16BE(s16)
  return true
}

/**
 * Parse a half-sized (2 byte) float from a buffer.
 *
 * @param {Buffer} buf The buffer.
 * @returns {number} Retrieved value.
 * @private
 */
export function parseHalf(buf) {
  const sign = buf[0] & 0x80 ? -1 : 1
  const exp = (buf[0] & 0x7C) >> 2
  const mant = ((buf[0] & 0x03) << 8) | buf[1]
  if (!exp) {
    return sign * 5.9604644775390625e-8 * mant
  } else if (exp === 0x1f) {
    return sign * (mant ? NaN : Infinity)
  }
  return sign * (2 ** (exp - 25)) * (1024 + mant)
}

/**
 * Parse a CBOR float from a buffer, with the type determined by the buffer's
 * length.
 *
 * @param {Buffer} buf The buffer.
 * @returns {number} The decoded float.
 * @throws {Error} Invalid buffer size, should be 2,4, or 8.
 * @private
 */
export function parseCBORfloat(buf) {
  switch (buf.length) {
    case 2:
      return parseHalf(buf)
    case 4:
      return buf.readFloatBE(0)
    case 8:
      return buf.readDoubleBE(0)
    default:
      throw new Error(`Invalid float size: ${buf.length}`)
  }
}

/**
 * Decode a hex-encoded string to a Buffer.  String may start with `0x`, which
 * is ignored.
 *
 * @param {string} s String to decode.
 * @returns {Buffer} The decoded value.
 * @private
 */
export function hex(s) {
  return Buffer.from(s.replace(/^0x/, ''), 'hex')
}

/**
 * Decode a binary-encoded string to a Buffer.  Spaces will be ignored.
 *
 * @param {string} s String to decode.
 * @returns {Buffer} The decoded value.
 * @private
 */
export function bin(s) {
  s = s.replace(/\s/g, '')
  let start = 0
  let end = (s.length % 8) || 8
  const chunks = []
  while (end <= s.length) {
    chunks.push(parseInt(s.slice(start, end), 2))
    start = end
    end += 8
  }
  return Buffer.from(chunks)
}

/**
 * Are the two arrays equal, by comparing each array element with `===`?
 *
 * @template T
 * @param {Array<T>} [a] First array.
 * @param {Array<T>} [b] Second array.
 * @returns {boolean} Are they equal?
 * @private
 */
export function arrayEqual(a, b) {
  if ((a == null) && (b == null)) {
    return true
  }
  if ((a == null) || (b == null)) {
    return false
  }
  return (a.length === b.length) && a.every((elem, i) => elem === b[i])
}

/**
 * Convert a buffer to an unsigned bigint.  This is not efficient unless the
 * buffer is length 8.
 *
 * @param {Buffer} buf Buffer.
 * @returns {bigint} Decoded unsigned bigint.
 * @private
 */
export function bufferToBigInt(buf) {
  if (buf.length === 8) {
    const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
    return dv.getBigUint64(0)
  }
  return BigInt(`0x${buf.toString('hex')}`)
}

/**
 * Convert the value to a string for diagnostics.
 *
 * @param {any} val The value to convert.
 * @param {number} [float_bytes=-1] The number of bytes in the float, if
 *   val is a floating point number.  -1 if val is not floating point.
 *   If -Infinity, don't prepend hex with `h`.
 * @returns {string} The string form of val.
 * @private
 */
export function cborValueToString(val, float_bytes = -1) {
  switch (typeof val) {
    case 'symbol': {
      switch (val) {
        case SYMS.NULL:
          return 'null'
        case SYMS.UNDEFINED:
          return 'undefined'
        case SYMS.BREAK:
          return 'BREAK'
      }
      if (val.description) {
        return val.description
      }
      return 'Symbol'
    }
    case 'string':
      return JSON.stringify(val)
    case 'bigint':
      return val.toString()
    case 'number': {
      const s = Object.is(val, -0) ? '-0' : String(val)
      return (float_bytes > 0) ? `${s}_${float_bytes}` : s
    }
    case 'object': {
      // A null should be caught above
      const buf = bufferishToBuffer(val)
      if (buf) {
        const hx = buf.toString('hex')
        return (float_bytes === -Infinity) ? hx : `h'${hx}'`
      }
      if (typeof val[Symbol.for('nodejs.util.inspect.custom')] === 'function') {
        return val[Symbol.for('nodejs.util.inspect.custom')]()
      }
      // Shouldn't get non-empty arrays here
      if (Array.isArray(val)) {
        return '[]'
      }
      // This should be all that is left
      return '{}'
    }
  }
  return String(val)
}

/**
 * Convert to a readable stream.
 *
 * @param {string|Buffer|ArrayBuffer|ArrayBufferView|Readable} input Source
 *   of input.
 * @param {BufferEncoding} [encoding] If the input is a string, how should it
 *   be encoded?
 * @returns {Readable} Input converted to Readable stream.
 * @throws {TypeError} Unknown input type.
 * @private
 */
export function guessEncoding(input, encoding) {
  if (typeof input === 'string') {
    return new NoFilter(input, (encoding == null) ? 'hex' : encoding)
  }
  if (isReadable(input)) {
    return input
  }

  const buf = bufferishToBuffer(input)
  if (buf) {
    return new NoFilter(buf)
  }
  throw new TypeError('Unknown input type')
}

const B64URL_SWAPS = {
  '=': '',
  '+': '-',
  '/': '_',
}

/**
 * @param {Buffer|ArrayBufferView|ArrayBuffer} buf
 *   Buffer to convert.
 * @returns {string} Base64url string.
 * @private
 */
export function base64url(buf) {
  return bufferishToBuffer(buf)
    .toString('base64')
    .replace(/[=+/]/g, c => B64URL_SWAPS[c])
}

/**
 * @param {Buffer|ArrayBufferView|ArrayBuffer} buf
 *   Buffer to convert.
 * @returns {string} Base64 string.
 * @private
 */
export function base64(buf) {
  return bufferishToBuffer(buf).toString('base64')
}

/**
 * Is the current system big-endian?  Tests, rather than using the node
 * os.endianness() function, so that it will work in the browser.
 *
 * @returns {boolean} If BigEndian, true.
 * @private
 */
export function isBigEndian() {
  const array = new Uint8Array(4)
  const view = new Uint32Array(array.buffer)
  return !((view[0] = 1) & array[0])
}
