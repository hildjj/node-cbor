'use strict'

const Tagged = require('./tagged')
const Simple = require('./simple')
const utils = require('./utils')
const bignumber = require('bignumber.js')
const constants = require('./constants')
const MT = constants.MT, NUMBYTES = constants.NUMBYTES, SIMPLE = constants.SIMPLE, SYMS = constants.SYMS

const NEG_ONE = new bignumber(-1)
const NEG_MAX = NEG_ONE.sub(new bignumber(Number.MAX_SAFE_INTEGER.toString(16), 16))
const COUNT = Symbol('count')
const PENDING_KEY = Symbol('pending_key')
const MAJOR = Symbol('major type')
const ERROR = Symbol('error')
const NOT_FOUND = Symbol('not found')

function parentArray (parent, typ, count) {
  const a = []
  a[COUNT] = count
  a[SYMS.PARENT] = parent
  a[MAJOR] = typ
  return a
}

function parentBufferStream (parent, typ) {
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
 */
class Decoder {

  /**
   * Create a parsing stream.
   *
   * @param {object} [options={}]
   * @param {number} [options.max_depth=-1] - the maximum depth to parse.  Use -1 for
   *   "until you run out of memory".  Set this to a finite positive number for
   *   un-trusted inputs.  Most standard inputs won't nest more than
   *   100 or so levels; I've tested into the millions before running out of
   *   memory.
   * @param {object=} options.tags - mapping from tag number to function(v),
   *   where v is the decoded value that comes after the tag, and where the
   *   function returns the correctly-created value for that tag.
   */
  constructor (options) {
    options = options || {}
    const tags = options.tags
    delete options.tags
    const max_depth = (options.max_depth != null) ? options.max_depth : -1
    delete options.max_depth

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
  static nullcheck (val) {
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
  static decodeFirstSync (input, options) {
    return this.decodeAllSync(input, options)
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
  static decodeAllSync (input, options) {
    options = options || { encoding: 'hex' }
    let encoding
    switch (typeof options) {
      case 'string':
        encoding = options
        break
      case 'object':
        encoding = options.encoding || encoding
        delete options.encoding
    }

    let inputBuf
    if (typeof input === 'string') {
      inputBuf = new Buffer(input, encoding || 'hex')
    } else {
      inputBuf = input
    }

    const decoder = new Decoder(options)

    return decoder.parseAll(inputBuf)
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
  static decodeFirst (input, options, cb) {
    return this.decodeAll(input, options, cb)
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
  static decodeAll (input, options, cb) {
    const res = this.decodeAllSync(input, options)
    if (cb) {
      cb(null, res)
    } else {
      return Promise.resolve(res)
    }
  }

  parseAll (input) {
    const res = this._parse(input)
    console.log('parsed', input, res)
    return res
  }

  _takeOne () {
    return this.input[this.offset ++]
  }

  _takeSlice (n) {
    const res = this.input.slice(this.offset, n + 1)
    this.offset += n
    return res
  }

  _parse (input) {
    console.log(' -- _parse')
    const maxDepth = this.max_depth
    const depthLimit = maxDepth > -1
    this.offset = 0
    this.input = input
    let length = input.length
    let parent = null
    let depth = 0
    let val = null

    while (this.offset <= length) {
      console.log(this.offset, length)
      if (depthLimit && (depth > maxDepth)) {
        throw new Error('Maximum depth ' + maxDepth + ' exceeded')
      }
      const octet = this._takeOne()
      const mt = octet >> 5
      const ai = octet & 0x1f
      val = ai
      console.log('octet', octet, mt, ai)

      let parentMajor
      let parentLength
      if (parent != null) {
        parentMajor = parent[MAJOR]
        parentLength = parent.length
      }

      switch (ai) {
        case NUMBYTES.ONE:
          val = this._takeOne()
          break
      case NUMBYTES.TWO:
        val =
        case NUMBYTES.FOUR:
        case NUMBYTES.EIGHT:
          const numbytes = 1 << (ai - 24)
          console.log('numbytes', numbytes, input, this.offset)
        const buf = this._takeSlice(numbytes)
          console.log('buf', buf, ai)
        console.log('val', val)
        val = (mt === MT.SIMPLE_FLOAT) ? buf : utils.parseCBORint(ai, buf)
        console.log('val2', val)
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
            val = NEG_ONE.sub(val)
          } else {
            val = -1 - val
          }
          break
        case MT.BYTE_STRING:
        case MT.UTF8_STRING:
          switch (val) {
            case 0:
              val = (mt === MT.BYTE_STRING) ? new Buffer(0) : ''
              break
            case -1:
              parent = parentBufferStream(parent, mt)
              depth++
              continue
            default:
              var len = val
              val = this._takeSlice(len)
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
              val[SYMS.PARENT] = parent
              break
            case -1:
              parent = parentArray(parent, mt, -1)
              depth++
              continue
            default:
              parent = parentArray(parent, mt, val * (mt - 3))
              depth++
              continue
          }
          break
      case MT.TAG:
        console.log('tag', val, parent, mt)
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
            case MT.UTF8_STRING:
              val = parent.toString('utf-8')
          }
        }

        parent = parent[SYMS.PARENT]
      }
      if (!again) {
        return val
      }
    }
  }
}

Decoder.NOT_FOUND = NOT_FOUND
module.exports = Decoder

const MAX_SAFE_HIGH = 0x1fffff
const SHIFT32 = constants.SHIFT32

function uint (buf) {
  var f, g
  switch (buf.length) {
    case 1:
      return buf.readUInt8(0, true)
    case 2:
      return buf.readUInt16BE(0, true)
    case 4:
      return buf.readUInt32BE(0, true)
    case 8:
      f = buf.readUInt32BE(0)
      g = buf.readUInt32BE(4)
      if (f > MAX_SAFE_HIGH) {
        return new bignumber(f).times(SHIFT32).plus(g)
      } else {
        return (f * SHIFT32) + g
      }
  }
}

function fail () {
  throw new Error('not welformed')
}

function wellFormed (breakable) {
  // process initial bytes
  const ib = uint(take(1))
  const mt = ib >> 5
  const ai = ib & 0x1f
  let val = ai
  let i = 0

  switch (ai) {
  case 24:
    val = uint(take(1))
    break
  case 25:
    val = uint(take(2))
    break
  case 26:
    val = uint(take(4))
    break
  case 27:
    val = uint(take(8))
    break
  case 28:
  case 29:
  case 30:
    fail()
  case 31:
    return wellFormedIndefinite(mt, breakable)
  }
  // process content
  switch (mt) {
    // case 0, 1, 7 do not have content; just use val
  case 2:
  case 3:
    // bytes/UTF-8
    take(val)
    break
  case 4:
    for (i = 0; i < val; i++) {
      wellFormed()
    }
    break
  case 5:
    for (i = 0; i < val*2; i++) {
      wellFormed()
    }
    break
  case 6:
    // 1 embedded data item
    wellFormed()
    break
  }

  // finite data item
  return mt
}

function wellFormedIndefinite(mt, breakable) {
  let it

  switch (mt) {
  case 2:
  case 3:
    while ((it = wellFormed(true)) != -1) {
      if (it != mt) {   // need finite embedded
        fail()          //    of same type
      }
    }
    break
  case 4:
    while (wellFormed(true) != -1) {
    }
    break
  case 5:
    while (wellFormed(true) != -1) {
      wellFormed()
    }
    break
  case 7:
    if (breakable) {
      // signal break out
      return -1
    } else {
      // no enclosing indefinite
      fail()
    }
  default:
    // wrong mt
    fail()
  }
  // no break out
  return 0
}
