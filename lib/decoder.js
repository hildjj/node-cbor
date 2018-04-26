'use strict'

const BinaryParseStream = require('../vendor/binary-parse-stream')
const Tagged = require('./tagged')
const Simple = require('./simple')
const utils = require('./utils')
const bignumber = require('bignumber.js')
const NoFilter = require('nofilter')
const constants = require('./constants')
// Do not fix this if you want to support node v4
const MT = constants.MT
const NUMBYTES = constants.NUMBYTES
const SIMPLE = constants.SIMPLE
const SYMS = constants.SYMS

const NEG_ONE = new bignumber(-1)
const NEG_MAX = NEG_ONE.minus(
  new bignumber(Number.MAX_SAFE_INTEGER.toString(16), 16))
const COUNT = Symbol('count')
const PENDING_KEY = Symbol('pending_key')
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
  const b = new NoFilter
  b[SYMS.PARENT] = parent
  b[MAJOR] = typ
  return b
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
   * @param {object} [options={}]
   * @param {number} [options.max_depth=-1] - the maximum depth to parse.
   *   Use -1 for "until you run out of memory".  Set this to a finite
   *   positive number for un-trusted inputs.  Most standard inputs won't nest
   *   more than 100 or so levels; I've tested into the millions before
   *   running out of memory.
   * @param {object=} options.tags - mapping from tag number to function(v),
   *   where v is the decoded value that comes after the tag, and where the
   *   function returns the correctly-created value for that tag.
   */
  constructor(options) {
    options = options || {}
    const tags = options.tags
    delete options.tags
    const max_depth = (options.max_depth != null) ? options.max_depth : -1
    delete options.max_depth
    super(options)

    this.running = true
    this.max_depth = max_depth
    this.tags = tags
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
      case NOT_FOUND:
        throw new Error('Value not found')
      default:
        return val
    }
  }

  /**
   * Decode the first CBOR item in the input, synchronously.  This will throw an
   * exception if the input is not valid CBOR.
   *
   * @static
   * @param {(string|Buffer)} input
   * @param {object} [options={encoding: 'hex'}]
   * @param {string} [options.encoding: 'hex'] - The encoding of the input.
   *   Ignored if input is a Buffer.
   * @returns {any} - the decoded value
   */
  static decodeFirstSync(input, options) {
    options = options || { encoding: 'hex' }
    let opts = {}
    let encod
    switch (typeof options) {
      case 'string':
        encod = options
        break
      case 'object':
        opts = utils.extend({}, options)
        encod = opts.encoding
        delete opts.encoding
        break
    }
    const c = new Decoder(opts)
    const s = new NoFilter(
      input,
      encod != null ? encod : utils.guessEncoding(input))
    const parser = c._parse()
    let state = parser.next()
    while (!state.done) {
      const b = s.read(state.value)
      if ((b == null) || (b.length !== state.value)) {
        throw new Error('Insufficient data')
      }
      state = parser.next(b)
    }
    return Decoder.nullcheck(state.value)
  }

  /**
   * Decode all of the CBOR items in the input into an array.  This will throw
   * an exception if the input is not valid CBOR; a zero-length input will
   * return an empty array.
   *
   * @static
   * @param {(string|Buffer)} input
   * @param {(string|Object)} [options={encoding: 'hex'}]
   * @param {string} [options.encoding: 'hex'] - The encoding of the input.
   *   Ignored if input is a Buffer.
   * @returns {Array} - Array of all found items
   */
  static decodeAllSync(input, options) {
    options = options || { encoding: 'hex' }
    let opts = {}
    let encod
    switch (typeof options) {
      case 'string':
        encod = options
        break
      case 'object':
        opts = utils.extend({}, options)
        encod = opts.encoding
        delete opts.encoding
    }
    const c = new Decoder(opts)
    const s = new NoFilter(
      input,
      encod != null ? encod : utils.guessEncoding(input))
    const res = []
    while (s.length > 0) {
      const parser = c._parse()
      let state = parser.next()
      while (!state.done) {
        const b = s.read(state.value)
        if ((b == null) || (b.length !== state.value)) {
          throw new Error('Insufficient data')
        }
        state = parser.next(b)
      }
      res.push(Decoder.nullcheck(state.value))
    }
    return res
  }

  /**
   * @callback decodeCallback
   * @param {Error} error - if one was generated
   * @param {any} value - the decoded value
   */

  /**
   * Decode the first CBOR item in the input.  This will error if there are more
   * bytes left over at the end, and optionally if there were no valid CBOR
   * bytes in the input.  Emits the {Decoder.NOT_FOUND} Symbol in the callback
   * if no data was found and the `required` option is false.
   *
   * @static
   * @param {(string|Buffer)} input - the input to parse
   * @param {(function|string|Object)} options
   * @param {string} [options.encoding: 'hex'] - The encoding of the input.
   *   Ignored if input is a Buffer.
   * @param {decodeCallback} cb
   * @returns {Promise} if no cb specified
   */
  static decodeFirst(input, options, cb) {
    let opts = {}
    let required = false
    let encod = 'hex'
    switch (typeof options) {
      case 'function':
        cb = options
        encod = utils.guessEncoding(input)
        break
      case 'string':
        encod = options
        break
      case 'object':
        opts = utils.extend({}, options)
        encod = (opts.encoding != null) ?
          opts.encoding : utils.guessEncoding(input)
        delete opts.encoding
        required = (opts.required != null) ? opts.required : false
        delete opts.required
    }
    const c = new Decoder(opts)
    let p
    let v = NOT_FOUND
    c.on('data', (val) => {
      v = Decoder.nullcheck(val)
      c.close()
    })
    if (typeof cb === 'function') {
      c.once('error', (er) => {
        const u = v
        v = ERROR
        c.close()
        return cb(er, u)
      })
      c.once('end', () => {
        switch (v) {
          case NOT_FOUND:
            if (required) {
              return cb(new Error('No CBOR found'))
            } else {
              return cb(null, v)
            }
          case ERROR:
            return void 0
          default:
            return cb(null, v)
        }
      })
    } else {
      p = new Promise((resolve, reject) => {
        c.once('error', (er) => {
          v = ERROR
          c.close()
          return reject(er)
        })
        return c.once('end', () => {
          switch (v) {
            case NOT_FOUND:
              if (required) {
                return reject(new Error('No CBOR found'))
              } else {
                return resolve(v)
              }
            case ERROR:
              return void 0
            default:
              return resolve(v)
          }
        })
      })
    }
    c.end(input, encod)
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
   * @param {(string|Buffer)} input - the input to parse
   * @param {(string|Object)} options - Decoding options.
   *   If string, the input encoding.
   * @param {decodeAllCallback} cb
   * @returns {Promise} if no callback
   */
  static decodeAll(input, options, cb) {
    let opts = {}
    let encod = 'hex'
    switch (typeof options) {
      case 'function':
        cb = options
        encod = utils.guessEncoding(input)
        break
      case 'string':
        encod = options
        break
      case 'object':
        opts = utils.extend({}, options)
        encod = (opts.encoding != null) ?
          opts.encoding : utils.guessEncoding(input)
        delete opts.encoding
    }
    const c = new Decoder(opts)
    let p
    const vals = []
    c.on('data', (val) => {
      return vals.push(Decoder.nullcheck(val))
    })
    if (typeof cb === 'function') {
      c.on('error', cb)
      c.on('end', () => cb(null, vals))
    } else {
      p = new Promise((resolve, reject) => {
        c.on('error', reject)
        c.on('end', () => resolve(vals))
      })
    }
    c.end(input, encod)
    return p
  }

  /**
   * Stop processing
   */
  close() {
    this.running = false
    this.__fresh = true
  }

  *_parse() {
    let parent = null
    let depth = 0
    let val = null
    while (true) {
      if ((this.max_depth >= 0) && (depth > this.max_depth)) {
        throw new Error('Maximum depth ' + this.max_depth + ' exceeded')
      }
      const octet = (yield 1)[0]
      if (!this.running) {
        throw new Error('Unexpected data: 0x' + (octet.toString(16)))
      }
      const mt = octet >> 5
      const ai = octet & 0x1f
      const parent_major = (parent != null) ? parent[MAJOR] : undefined
      const parent_length = (parent != null) ? parent.length : undefined
      switch (ai) {
        case NUMBYTES.ONE:
          this.emit('more-bytes', mt, 1, parent_major, parent_length)
          val = (yield 1)[0]
          break
        case NUMBYTES.TWO:
        case NUMBYTES.FOUR:
        case NUMBYTES.EIGHT:
          const numbytes = 1 << (ai - 24)
          this.emit('more-bytes', mt, numbytes, parent_major, parent_length)
          const buf = yield numbytes
          val = (mt === MT.SIMPLE_FLOAT) ? buf : utils.parseCBORint(ai, buf)
          break
        case 28:
        case 29:
        case 30:
          this.running = false
          throw new Error('Additional info not implemented: ' + ai)
        case NUMBYTES.INDEFINITE:
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
            val = NEG_MAX
          } else if (val instanceof bignumber) {
            val = NEG_ONE.minus(val)
          } else {
            val = -1 - val
          }
          break
        case MT.BYTE_STRING:
        case MT.UTF8_STRING:
          switch (val) {
            case 0:
              this.emit('start-string', mt, val, parent_major, parent_length)
              val = (mt === MT.BYTE_STRING) ? Buffer.allocUnsafe(0) : ''
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
                val = val.toString('utf-8')
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
            val = Simple.decode(val, parent != null)
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
          case !(parent instanceof NoFilter):
            const pm = parent[MAJOR]
            if ((pm != null) && (pm !== mt)) {
              this.running = false
              throw new Error('Invalid major type in indefinite encoding')
            }
            parent.write(val)
        }
        if ((--parent[COUNT]) !== 0) {
          again = true
          break
        }
        --depth
        delete parent[COUNT]
        this.emit('stop', parent[MAJOR])

        if (Array.isArray(parent)) {
          switch (parent[MAJOR]) {
            case MT.ARRAY:
              val = parent
              break
            case MT.MAP:
              let allstrings = true
              if ((parent.length % 2) !== 0) {
                throw new Error('Invalid map length: ' + parent.length)
              }
              for (let i = 0, len = parent.length; i < len; i += 2) {
                if (typeof parent[i] !== 'string') {
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
                val = new Map
                for (let i = 0, len = parent.length; i < len; i += 2) {
                  val.set(parent[i], parent[i + 1])
                }
              }
              break
            case MT.TAG:
              const t = new Tagged(parent[0], parent[1])
              val = t.convert(this.tags)
              break
          }
        } else if (parent instanceof NoFilter) {
          switch (parent[MAJOR]) {
            case MT.BYTE_STRING:
              val = parent.slice()
              break
            case MT.UTF8_STRING:
              val = parent.toString('utf-8')
              break
          }
        }

        const old = parent
        parent = parent[SYMS.PARENT]
        delete old[SYMS.PARENT]
        delete old[MAJOR]
      }
      if (!again) {
        return val
      }
    }
  }
}

Decoder.NOT_FOUND = NOT_FOUND
module.exports = Decoder
