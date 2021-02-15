'use strict'

const stream = require('stream')
const Decoder = require('./decoder')
const utils = require('./utils')
const NoFilter = require('nofilter')
const {MT, SYMS} = require('./constants')

/**
  * @typedef DiagnoseOptions
  * @property {string} [separator='\n'] - output between detected objects
  * @property {boolean} [stream_errors=false] - put error info into the
  *   output stream
  * @property {number} [max_depth=-1] - the maximum depth to parse.
  *   Use -1 for "until you run out of memory".  Set this to a finite
  *   positive number for un-trusted inputs.  Most standard inputs won't nest
  *   more than 100 or so levels; I've tested into the millions before
  *   running out of memory.
  * @property {object} [tags] - mapping from tag number to function(v),
  *   where v is the decoded value that comes after the tag, and where the
  *   function returns the correctly-created value for that tag.
  * @property {object} [tags] - mapping from tag number to function(v),
  *   where v is the decoded value that comes after the tag, and where the
  *   function returns the correctly-created value for that tag.
  * @property {boolean} [bigint=true] generate JavaScript BigInt's
  *   instead of BigNumbers, when possible.
  * @property {boolean} [preferWeb=false] - if true, prefer Uint8Arrays to
  *   be generated instead of node Buffers.  This might turn on some more
  *   changes in the future, so forward-compatibility is not guaranteed yet.
  * @property {string} [encoding='hex'] - the encoding of input, ignored if
  *   input is not string
  */
/**
  * @callback diagnoseCallback
  * @param {Error} [error] - if one was generated
  * @param {string} [value] - the diagnostic value
  */
/**
  * @param {DiagnoseOptions|diagnoseCallback|string} opts options,
  *   the callback, or input incoding
  * @param {diagnoseCallback} [cb] - called on completion
  * @returns {{options: DiagnoseOptions, cb: diagnoseCallback}}
  * @private
  */
function normalizeOptions(opts, cb) {
  switch (typeof opts) {
    case 'function':
      return { options: {}, cb: /** @type {diagnoseCallback} */ (opts) }
    case 'string':
      return { options: { encoding: opts }, cb }
    case 'object':
      return { options: opts || {}, cb }
    default:
      throw new TypeError('Unknown option type')
  }
}

/**
 * Output the diagnostic format from a stream of CBOR bytes.
 *
 * @extends {stream.Transform}
 */
class Diagnose extends stream.Transform {
  /**
   * Creates an instance of Diagnose.
   *
   * @param {DiagnoseOptions} [options={}] - options for creation
   */
  constructor(options = {}) {
    const {
      separator = '\n',
      stream_errors = false,
      // decoder options
      tags,
      max_depth,
      bigint,
      preferWeb,
      encoding,
      // stream.Transform options
      ...superOpts
    } = options
    super({
      ...superOpts,
      readableObjectMode: false,
      writableObjectMode: false
    })

    this.float_bytes = -1
    this.separator = separator
    this.stream_errors = stream_errors
    this.parser = new Decoder({
      tags,
      max_depth,
      bigint,
      preferWeb,
      encoding
    })
    this.parser.on('more-bytes', this._on_more.bind(this))
    this.parser.on('value', this._on_value.bind(this))
    this.parser.on('start', this._on_start.bind(this))
    this.parser.on('stop', this._on_stop.bind(this))
    this.parser.on('data', this._on_data.bind(this))
    this.parser.on('error', this._on_error.bind(this))
  }

  _transform(fresh, encoding, cb) {
    return this.parser.write(fresh, encoding, cb)
  }

  _flush(cb) {
    return this.parser._flush(er => {
      if (this.stream_errors) {
        if (er) {
          this._on_error(er)
        }
        return cb()
      }
      return cb(er)
    })
  }

  /**
   * Convenience function to return a string in diagnostic format.
   *
   * @param {string|Buffer|ArrayBuffer|Uint8Array|Uint8ClampedArray
   *   |DataView|stream.Readable} input - the CBOR bytes to format
   * @param {DiagnoseOptions |diagnoseCallback|string} [options={}] -
   *   options, the callback, or the input encoding
   * @param {diagnoseCallback} [cb] - callback
   * @returns {Promise} if callback not specified
   */
  static diagnose(input, options = {}, cb = null) {
    if (input == null) {
      throw new Error('input required')
    }
    ({options, cb} = normalizeOptions(options, cb))
    const {encoding = 'hex', ...opts} = options

    const bs = new NoFilter()
    const d = new Diagnose(opts)
    let p = null
    if (typeof cb === 'function') {
      d.on('end', () => cb(null, bs.toString('utf8')))
      d.on('error', cb)
    } else {
      p = new Promise((resolve, reject) => {
        d.on('end', () => resolve(bs.toString('utf8')))
        d.on('error', reject)
      })
    }
    d.pipe(bs)
    utils.guessEncoding(input, encoding).pipe(d)
    return p
  }

  _on_error(er) {
    if (this.stream_errors) {
      return this.push(er.toString())
    }
    return this.emit('error', er)
  }

  _on_more(mt, len, parent_mt, pos) {
    if (mt === MT.SIMPLE_FLOAT) {
      this.float_bytes = {
        2: 1,
        4: 2,
        8: 3
      }[len]
    }
  }

  _fore(parent_mt, pos) {
    switch (parent_mt) {
      case MT.BYTE_STRING:
      case MT.UTF8_STRING:
      case MT.ARRAY:
        if (pos > 0) {
          this.push(', ')
        }
        break
      case MT.MAP:
        if (pos > 0) {
          if (pos % 2) {
            this.push(': ')
          } else {
            this.push(', ')
          }
        }
    }
  }

  _on_value(val, parent_mt, pos) {
    if (val === SYMS.BREAK) {
      return
    }
    this._fore(parent_mt, pos)
    const fb = this.float_bytes
    this.float_bytes = -1
    this.push(utils.cborValueToString(val, fb))
  }

  _on_start(mt, tag, parent_mt, pos) {
    this._fore(parent_mt, pos)
    switch (mt) {
      case MT.TAG:
        this.push(`${tag}(`)
        break
      case MT.ARRAY:
        this.push('[')
        break
      case MT.MAP:
        this.push('{')
        break
      case MT.BYTE_STRING:
      case MT.UTF8_STRING:
        this.push('(')
        break
    }
    if (tag === SYMS.STREAM) {
      this.push('_ ')
    }
  }

  _on_stop(mt) {
    switch (mt) {
      case MT.TAG:
        this.push(')')
        break
      case MT.ARRAY:
        this.push(']')
        break
      case MT.MAP:
        this.push('}')
        break
      case MT.BYTE_STRING:
      case MT.UTF8_STRING:
        this.push(')')
        break
    }
  }

  _on_data() {
    this.push(this.separator)
  }
}

module.exports = Diagnose
