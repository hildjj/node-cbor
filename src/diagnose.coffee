# jslint node: true

stream = require 'stream'
util = require 'util'

Decoder = require './decoder'
BufferStream = require './BufferStream'
Simple = require './simple'
utils = require './utils'
{MT, SYMS} = require './constants'
bignumber = require 'bignumber.js'

# Output the diagnostic format from a set of CBOR bytes.
module.exports = class Diagnose extends stream.Transform
  # Create a Diagnose.
  # @param options [Object] options for creation
  # @option options separator [String] output between detected objects
  #   (default: '\n')
  constructor: (options = {}) ->
    @separator = options.separator ? '\n'
    delete options.separator
    @stream_errors = options.stream_errors ? false
    delete options.stream_errors

    options.readableObjectMode = false
    options.writableObjectMode = false

    super(options)

    @parser = new Decoder options
    @parser.on 'value', @_on_value
    @parser.on 'start', @_on_start
    @parser.on 'stop', @_on_stop
    @parser.on 'data', @_on_data
    @parser.on 'error', @_on_error

  _transform: (fresh, encoding, cb) ->
    @parser.write fresh, encoding, cb

  _flush: (cb) ->
    @parser._flush (er) =>
      if @stream_errors
        @_on_error(er)
        cb()
      else
        cb(er)

  # Convenience function to return a string in diagnostic format.
  # @param input [Buffer,String] the CBOR bytes to write
  # @param encoding the encoding, if input is a stream (defaults to 'hex')
  # @param cb [function(error, String)]
  @diagnose: (input, encoding, cb) ->
    if !input?
      throw new Error 'input required'

    opts = {}

    switch typeof(encoding)
      when 'function'
        cb = encoding
        encoding = if (typeof(input) == 'string') then 'hex' else undefined
      when 'object'
        opts = encoding
        encoding = opts.encoding
        delete opts.encoding

    bs = new BufferStream
    d = new Diagnose opts
    p = null

    if typeof(cb) == 'function'
      d.on 'end', ->
        cb(null, bs.toString('utf8'))
      d.on 'error', cb
    else
      p = new Promise (resolve, reject) ->
        d.on 'end', ->
          resolve bs.toString('utf8')
        d.on 'error', reject
    d.pipe bs
    d.end input, encoding
    p

  # @nodoc
  _on_error: (er) =>
    if @stream_errors
      @push er.toString()
    else
      @emit 'error', er

  _fore: (parent_mt, pos) ->
    switch parent_mt
      when MT.BYTE_STRING, MT.UTF8_STRING, MT.ARRAY
        if pos > 0 then @push ', '
      when MT.MAP
        if pos > 0
          if pos % 2 then @push ': '
          else @push ', '

  # @nodoc
  _on_value: (val, parent_mt, pos) =>
    if val == SYMS.BREAK
      return
    @_fore parent_mt, pos
    @push switch
      when val == SYMS.NULL
        "null"
      when val == SYMS.UNDEFINED
        "undefined"
      when typeof(val) == 'string'
        JSON.stringify val
      when Buffer.isBuffer val
        "h'#{val.toString("hex")}'"
      when val instanceof bignumber
        val.toString()
      else
        util.inspect(val)

  _on_start: (mt, tag, parent_mt, pos) =>
    @_fore parent_mt, pos
    @push switch mt
      when MT.TAG then "#{tag}("
      when MT.ARRAY then "["
      when MT.MAP then "{"
      when MT.BYTE_STRING, MT.UTF8_STRING then "("
      else
        `// istanbul ignore next`
        throw new Error "Unknown diagnostic type: #{mt}"
    if tag == SYMS.STREAM
      @push "_ "

  _on_stop: (mt) =>
    @push switch mt
      when MT.TAG then ")"
      when MT.ARRAY then "]"
      when MT.MAP then "}"
      when MT.BYTE_STRING, MT.UTF8_STRING then ")"
      else
        `// istanbul ignore next`
        throw new Error "Unknown diagnostic type: #{mt}"

  _on_data: =>
    @push @separator
