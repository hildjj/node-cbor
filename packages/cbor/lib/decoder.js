'use strict'

const BinaryParseStream = require('../vendor/binary-parse-stream')
const Tagged = require('./tagged')
const Simple = require('./simple')
const utils = require('./utils')
const NoFilter = require('nofilter')
const constants = require('./constants')
const { MT, NUMBYTES, SYMS, BI } = constants
const { Buffer } = require('buffer')

const COUNT = Symbol('count')
const MAJOR = Symbol('major type')
const ERROR = Symbol('error')
const NOT_FOUND = Symbol('not found')

function parentArray(parent, typ, count) {
  const a = []

  a[COUNT] = count
  a[SYMS.PARENT] = parent
  a[MAJOR] = typ
  return a
}

function parentBufferStream(parent, typ) {
  const b = new NoFilter()

  b[COUNT] = -1
  b[SYMS.PARENT] = parent
  b[MAJOR] = typ
  return b
}

/**
 * @param {Buffer} v
 * @private
 */
function _tag_2(v) {
  return utils.bufferToBigInt(v)
}

/**
 * @param {BigInt} v
 * @private
 */
function _tag_3(v) {
  // avoid syntax error on old runtimes
  return BI.MINUS_ONE - utils.bufferToBigInt(v)
}

class UnexpectedDataError extends Error {
  constructor(byte, value) {
    super(`Unexpected data: 0x${byte.toString(16)}`)
    this.name = 'UnexpectedDataError'
    this.byte = byte
    this.value = value
  }
}

/**
 * @typedef ExtendedResults
 * @property {any} value - the value that was found
 * @property {number} length - the number of bytes of the original input that
 *   were read
 * @property {Buffer} bytes - the bytes of the original input that were used
 *   to produce the value
 * @property {Buffer} [unused] - the bytes that were left over from the original
 *   input.  This property only exists if {@linkcode Decoder.decodeFirst} or
 *   {@linkcode Decoder.decodeFirstSync} was called.
 */
/**
 * @typedef DecoderOptions
 * @property {number} [max_depth=-1] - the maximum depth to parse.
 *   Use -1 for "until you run out of memory".  Set this to a finite
 *   positive number for un-trusted inputs.  Most standard inputs won't nest
 *   more than 100 or so levels; I've tested into the millions before
 *   running out of memory.
 * @property {object} [tags] - mapping from tag number to function(v),
 *   where v is the decoded value that comes after the tag, and where the
 *   function returns the correctly-created value for that tag.
 * @property {boolean} [bigint=true] generate JavaScript BigInt's
 *   instead of BigNumbers, when possible.
 * @property {boolean} [preferWeb=false] if true, prefer Uint8Arrays to
 *   be generated instead of node Buffers.  This might turn on some more
 *   changes in the future, so forward-compatibility is not guaranteed yet.
 * @property {string} [encoding='hex'] - The encoding of the input.
 *   Ignored if input is a Buffer.
 * @property {boolean} [required=false] - Should an error be thrown when no
 *   data is in the input?
 * @property {boolean} [extendedResults=false] - if true, emit extended
 *   results, which will be an object with shape {@link ExtendedResults}.
 *   The value will already have been null-checked.
 */
/**
  * @callback decodeCallback
  * @param {Error} [error] - if one was generated
  * @param {any} [value] - the decoded value
  */
/**
  * @param {DecoderOptions|decodeCallback|string} opts options,
  *   the callback, or input incoding
  * @param {decodeCallback} [cb] - called on completion
  * @returns {{options: DecoderOptions, cb: decodeCallback}}
  * @private
  */
function normalizeOptions(opts, cb) {
  switch (typeof opts) {
    case 'function':
      return { options: {}, cb: /** @type {decodeCallback} */ (opts) }
    case 'string':
      return { options: { encoding: opts }, cb }
    case 'object':
      return { options: opts || {}, cb }
    default:
      throw new TypeError('Unknown option type')
  }
}

/**
 * Decode a stream of CBOR bytes by transforming them into equivalent
 * JavaScript data.  Because of the limitations of Node object streams,
 * special symbols are emitted instead of NULL or UNDEFINED.  Fix those
 * up by calling {@link Decoder.nullcheck}.
 *
 * @extends {BinaryParseStream}
 */
class Decoder extends BinaryParseStream {
  /**
   * Create a parsing stream.
   *
   * @param {DecoderOptions} [options={}]
   */
  constructor(options = {}) {
    const {
      tags = {},
      max_depth = -1,
      bigint = true,
      preferWeb = false,
      required = false,
      encoding = 'hex',
      extendedResults = false,
      ...superOpts
    } = options

    super({defaultEncoding: encoding, ...superOpts})

    this.running = true
    this.max_depth = max_depth
    this.tags = tags
    this.preferWeb = preferWeb
    this.extendedResults = extendedResults
    this.bigint = bigint
    this.required = required

    if (extendedResults) {
      this.bs.on('read', this._onRead.bind(this))
      this.valueBytes = new NoFilter()
    }
    if (bigint) {
      if (this.tags[2] == null) {
        this.tags[2] = _tag_2
      }
      if (this.tags[3] == null) {
        this.tags[3] = _tag_3
      }
    }
  }

  /**
   * Check the given value for a symbol encoding a NULL or UNDEFINED value in
   * the CBOR stream.
   *
   * @static
   * @param {any} val - the value to check
   * @returns {any} the corrected value
   *
   * @example
   * myDecoder.on('data', function(val) {
   *   val = Decoder.nullcheck(val);
   *   ...
   * });
   */
  static nullcheck(val) {
    switch (val) {
      case SYMS.NULL:
        return null
      case SYMS.UNDEFINED:
        return undefined
      // Leaving this in for now as belt-and-suspenders, but I'm pretty sure
      // it can't happen.
      /* istanbul ignore next */
      case NOT_FOUND:
        /* istanbul ignore next */
        throw new Error('Value not found')
      default:
        return val
    }
  }

  /**
   * Decode the first CBOR item in the input, synchronously.  This will throw
   * an exception if the input is not valid CBOR, or if there are more bytes
   * left over at the end (if options.extendedResults is not true).
   *
   * @static
   * @param {string|Buffer|ArrayBuffer|Uint8Array|Uint8ClampedArray
   *   |DataView|stream.Readable} input - If a Readable stream, must have
   *   received the `readable` event already, or you will get an error
   *   claiming "Insufficient data"
   * @param {DecoderOptions|string} [options={}] Options or encoding for input
   * @returns {any} - the decoded value
   */
  static decodeFirstSync(input, options = {}) {
    if (input == null) {
      throw new TypeError('input required')
    }
    ({options} = normalizeOptions(options))
    const {encoding = 'hex', ...opts} = options
    const c = new Decoder(opts)
    const s = utils.guessEncoding(input, encoding)

    // for/of doesn't work when you need to call next() with a value
    // generator created by parser will be "done" after each CBOR entity
    // parser will yield numbers of bytes that it wants
    const parser = c._parse()
    let state = parser.next()

    while (!state.done) {
      const b = s.read(state.value)

      if ((b == null) || (b.length !== state.value)) {
        throw new Error('Insufficient data')
      }
      if (c.extendedResults) {
        c.valueBytes.write(b)
      }
      state = parser.next(b)
    }

    let val = null
    if (!c.extendedResults) {
      val = Decoder.nullcheck(state.value)
      if (s.length > 0) {
        const nextByte = s.read(1)

        s.unshift(nextByte)
        throw new UnexpectedDataError(nextByte[0], val)
      }
    } else {
      val = state.value
      val.unused = s.read()
    }
    return val
  }

  /**
   * Decode all of the CBOR items in the input into an array.  This will throw
   * an exception if the input is not valid CBOR; a zero-length input will
   * return an empty array.
   *
   * @static
   * @param {string|Buffer|ArrayBuffer|Uint8Array|Uint8ClampedArray
   *   |DataView|stream.Readable} input
   * @param {DecoderOptions|string} [options={}] Options or encoding
   *   for input
   * @returns {Array} - Array of all found items
   */
  static decodeAllSync(input, options = {}) {
    if (input == null) {
      throw new TypeError('input required')
    }
    ({options} = normalizeOptions(options))
    const {encoding = 'hex', ...opts} = options
    const c = new Decoder(opts)
    const s = utils.guessEncoding(input, encoding)
    const res = []

    while (s.length > 0) {
      const parser = c._parse()
      let state = parser.next()

      while (!state.done) {
        const b = s.read(state.value)

        if ((b == null) || (b.length !== state.value)) {
          throw new Error('Insufficient data')
        }
        if (c.extendedResults) {
          c.valueBytes.write(b)
        }
        state = parser.next(b)
      }
      res.push(Decoder.nullcheck(state.value))
    }
    return res
  }

  /**
   * Decode the first CBOR item in the input.  This will error if there are
   * more bytes left over at the end (if options.extendedResults is not true),
   * and optionally if there were no valid CBOR bytes in the input.  Emits the
   * {Decoder.NOT_FOUND} Symbol in the callback if no data was found and the
   * `required` option is false.
   *
   * @static
   * @param {string|Buffer|ArrayBuffer|Uint8Array|Uint8ClampedArray
   *   |DataView|stream.Readable} input
   * @param {DecoderOptions|decodeCallback|string} [options={}] - options, the
   *   callback, or input encoding
   * @param {decodeCallback} [cb] callback
   * @returns {Promise<any>} returned even if callback is specified
   */
  static decodeFirst(input, options = {}, cb = null) {
    if (input == null) {
      throw new TypeError('input required')
    }
    ({options, cb} = normalizeOptions(options, cb))
    const {encoding = 'hex', required = false, ...opts} = options

    const c = new Decoder(opts)
    /** @type {any} */
    let v = NOT_FOUND
    const s = utils.guessEncoding(input, encoding)
    const p = new Promise((resolve, reject) => {
      c.on('data', val => {
        v = Decoder.nullcheck(val)
        c.close()
      })
      c.once('error', er => {
        if (c.extendedResults && (er instanceof UnexpectedDataError)) {
          v.unused = c.bs.slice()
          return resolve(v)
        }
        if (v !== NOT_FOUND) {
          er['value'] = v
        }
        v = ERROR
        c.close()
        return reject(er)
      })
      c.once('end', () => {
        switch (v) {
          case NOT_FOUND:
            if (required) {
              return reject(new Error('No CBOR found'))
            }
            return resolve(v)
          // Pretty sure this can't happen, but not *certain*.
          /* istanbul ignore next */
          case ERROR:
            /* istanbul ignore next */
            return undefined
          default:
            return resolve(v)
        }
      })
    })

    if (typeof cb === 'function') {
      p.then(val => cb(null, val), cb)
    }
    s.pipe(c)
    return p
  }

  /**
   * @callback decodeAllCallback
   * @param {Error} error - if one was generated
   * @param {Array} value - all of the decoded values, wrapped in an Array
   */

  /**
   * Decode all of the CBOR items in the input.  This will error if there are
   * more bytes left over at the end.
   *
   * @static
   * @param {string|Buffer|ArrayBuffer|Uint8Array|Uint8ClampedArray
   *   |DataView|stream.Readable} input
   * @param {DecoderOptions|decodeAllCallback|string} [options={}] -
   *   Decoding options, the callback, or the input encoding.
   * @param {decodeAllCallback} [cb] callback
   * @returns {Promise<Array>} even if callback is specified
   */
  static decodeAll(input, options = {}, cb = null) {
    if (input == null) {
      throw new TypeError('input required')
    }
    ({options, cb} = normalizeOptions(options, cb))
    const {encoding = 'hex', ...opts} = options

    const c = new Decoder(opts)
    const vals = []

    c.on('data', val => vals.push(Decoder.nullcheck(val)))

    const p = new Promise((resolve, reject) => {
      c.on('error', reject)
      c.on('end', () => resolve(vals))
    })

    if (typeof cb === 'function') {
      p.then(v => cb(undefined, v), er => cb(er, undefined))
    }
    utils.guessEncoding(input, encoding).pipe(c)
    return p
  }

  /**
   * Stop processing
   */
  close() {
    this.running = false
    this.__fresh = true
  }

  /**
   * Only called if extendedResults is true
   * @ignore
   */
  _onRead(data) {
    this.valueBytes.write(data)
  }

  /**
   * @ignore
   * @returns {Generator<number, any, Buffer>}
   */
  *_parse() {
    let parent = null
    let depth = 0
    let val = null

    while (true) {
      if ((this.max_depth >= 0) && (depth > this.max_depth)) {
        throw new Error('Maximum depth ' + this.max_depth + ' exceeded')
      }

      const [octet] = yield 1
      if (!this.running) {
        this.bs.unshift(Buffer.from([octet]))
        throw new UnexpectedDataError(octet)
      }
      const mt = octet >> 5
      const ai = octet & 0x1f
      const parent_major = (parent != null) ? parent[MAJOR] : undefined
      const parent_length = (parent != null) ? parent.length : undefined

      switch (ai) {
        case NUMBYTES.ONE:
          this.emit('more-bytes', mt, 1, parent_major, parent_length)
          ;[val] = yield 1
          break
        case NUMBYTES.TWO:
        case NUMBYTES.FOUR:
        case NUMBYTES.EIGHT: {
          const numbytes = 1 << (ai - 24)

          this.emit('more-bytes', mt, numbytes, parent_major, parent_length)
          const buf = yield numbytes
          val = (mt === MT.SIMPLE_FLOAT) ?
            buf :
            utils.parseCBORint(ai, buf, this.bigint)
          break
        }
        case 28:
        case 29:
        case 30:
          this.running = false
          throw new Error('Additional info not implemented: ' + ai)
        case NUMBYTES.INDEFINITE:
          switch (mt) {
            case MT.POS_INT:
            case MT.NEG_INT:
            case MT.TAG:
              throw new Error(`Invalid indefinite encoding for MT ${mt}`)
          }
          val = -1
          break
        default:
          val = ai
      }
      switch (mt) {
        case MT.POS_INT:
          // val already decoded
          break
        case MT.NEG_INT:
          if (val === Number.MAX_SAFE_INTEGER) {
            if (this.bigint) {
              val = BI.NEG_MAX
            } else if (constants.BigNumber) {
              val = constants.BN.NEG_MAX
            } else {
              throw new Error('No bigint and no bignumber.js')
            }
          } else if (constants.BigNumber &&
            (val instanceof constants.BigNumber)) {
            val = constants.BN.MINUS_ONE.minus(val)
          } else {
            val = (typeof val === 'bigint') ? BI.MINUS_ONE - val : -1 - val
          }
          break
        case MT.BYTE_STRING:
        case MT.UTF8_STRING:
          switch (val) {
            case 0:
              this.emit('start-string', mt, val, parent_major, parent_length)
              if (mt === MT.UTF8_STRING) {
                val = ''
              } else {
                val = this.preferWeb ? new Uint8Array(0) : Buffer.allocUnsafe(0)
              }
              break
            case -1:
              this.emit('start', mt, SYMS.STREAM, parent_major, parent_length)
              parent = parentBufferStream(parent, mt)
              depth++
              continue
            default:
              this.emit('start-string', mt, val, parent_major, parent_length)
              val = yield val
              if (mt === MT.UTF8_STRING) {
                val = utils.utf8(val)
              } else if (this.preferWeb) {
                val = new Uint8Array(val.buffer, val.byteOffset, val.length)
              }
          }
          break
        case MT.ARRAY:
        case MT.MAP:
          switch (val) {
            case 0:
              val = (mt === MT.MAP) ? {} : []
              break
            case -1:
              this.emit('start', mt, SYMS.STREAM, parent_major, parent_length)
              parent = parentArray(parent, mt, -1)
              depth++
              continue
            default:
              this.emit('start', mt, val, parent_major, parent_length)
              parent = parentArray(parent, mt, val * (mt - 3))
              depth++
              continue
          }
          break
        case MT.TAG:
          this.emit('start', mt, val, parent_major, parent_length)
          parent = parentArray(parent, mt, 1)
          parent.push(val)
          depth++
          continue
        case MT.SIMPLE_FLOAT:
          if (typeof val === 'number') {
            if ((ai === NUMBYTES.ONE) && (val < 32)) {
              throw new Error(
                `Invalid two-byte encoding of simple value ${val}`
              )
            }
            const hasParent = (parent != null)
            val = Simple.decode(
              val,
              hasParent,
              hasParent && (parent[COUNT] < 0)
            )
          } else {
            val = utils.parseCBORfloat(val)
          }
      }
      this.emit('value', val, parent_major, parent_length, ai)
      let again = false
      while (parent != null) {
        switch (false) {
          case val !== SYMS.BREAK:
            parent[COUNT] = 1
            break
          case !Array.isArray(parent):
            parent.push(val)
            break
          case !(parent instanceof NoFilter): {
            const pm = parent[MAJOR]

            if ((pm != null) && (pm !== mt)) {
              this.running = false
              throw new Error('Invalid major type in indefinite encoding')
            }
            parent.write(val)
          }
        }
        if ((--parent[COUNT]) !== 0) {
          again = true
          break
        }
        --depth
        delete parent[COUNT]

        if (Array.isArray(parent)) {
          switch (parent[MAJOR]) {
            case MT.ARRAY:
              val = parent
              break
            case MT.MAP: {
              let allstrings = true

              if ((parent.length % 2) !== 0) {
                throw new Error('Invalid map length: ' + parent.length)
              }
              for (let i = 0, len = parent.length; i < len; i += 2) {
                if ((typeof parent[i] !== 'string') ||
                    (parent[i] === '__proto__')) {
                  allstrings = false
                  break
                }
              }
              if (allstrings) {
                val = {}
                for (let i = 0, len = parent.length; i < len; i += 2) {
                  val[parent[i]] = parent[i + 1]
                }
              } else {
                val = new Map()
                for (let i = 0, len = parent.length; i < len; i += 2) {
                  val.set(parent[i], parent[i + 1])
                }
              }
              break
            }
            case MT.TAG: {
              const t = new Tagged(parent[0], parent[1])

              val = t.convert(this.tags)
              break
            }
          }
        } else /* istanbul ignore else */ if (parent instanceof NoFilter) {
          // only parent types are Array and NoFilter for (Array/Map) and
          // (bytes/string) respectively.
          switch (parent[MAJOR]) {
            case MT.BYTE_STRING:
              val = parent.slice()
              if (this.preferWeb) {
                val = new Uint8Array(val.buffer, val.byteOffset, val.length)
              }
              break
            case MT.UTF8_STRING:
              val = parent.toString('utf-8')
              break
          }
        }
        this.emit('stop', parent[MAJOR])

        const old = parent
        parent = parent[SYMS.PARENT]
        delete old[SYMS.PARENT]
        delete old[MAJOR]
      }
      if (!again) {
        if (this.extendedResults) {
          const bytes = this.valueBytes.slice()
          const ret = {
            value: Decoder.nullcheck(val),
            bytes,
            length: bytes.length
          }

          this.valueBytes = new NoFilter()
          return ret
        }
        return val
      }
    }
  }
}

Decoder.NOT_FOUND = NOT_FOUND
module.exports = Decoder
