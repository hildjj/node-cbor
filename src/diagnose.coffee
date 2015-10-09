# jslint node: true

stream = require 'stream'
util = require 'util'

Decoder = require './decoder'
Simple = require './simple'
utils = require './utils'
{MT, SYMS} = require './constants'
bignumber = require 'bignumber.js'
NoFilter = require 'nofilter'

# Output the diagnostic format from a stream of CBOR bytes.
module.exports = class Diagnose extends stream.Transform
  # Create a Diagnose.
  # @param options [Object] options for creation
  # @option options separator [String] output between detected objects
  #   (default: '\n')
  # @option options stream_errors [Boolean] put error info into the
  #   output stream (default: false)
  # @option options max_depth [Number] the maximum depth to parse.  -1 (the
  #   default) for "until you run out of memory".  Set this to a finite positive
  #   number for un-trusted inputs.  Most standard inputs won't nest more than
  #   100 or so levels; I've tested into the millions before running out of
  #   memory.
  constructor: (options = {}) ->
    @separator = options.separator ? '\n'
    delete options.separator
    @stream_errors = options.stream_errors ? false
    delete options.stream_errors

    options.readableObjectMode = false
    options.writableObjectMode = false

    super(options)

    @float_bytes = -1
    @parser = new Decoder options
    @parser.on 'more-bytes', @_on_more
    @parser.on 'value', @_on_value
    @parser.on 'start', @_on_start
    @parser.on 'stop', @_on_stop
    @parser.on 'data', @_on_data
    @parser.on 'error', @_on_error

  # @nodoc
  _transform: (fresh, encoding, cb) ->
    @parser.write fresh, encoding, cb

  # @nodoc
  _flush: (cb) ->
    @parser._flush (er) =>
      if @stream_errors
        @_on_error(er)
        cb()
      else
        cb(er)

  # Convenience function to return a string in diagnostic format.
  # @param input [Buffer,String] the CBOR bytes to write
  # @param encoding the encoding, if input is a string (defaults to 'hex')
  # @param cb [function(error, String)]
  # @return [undefined, Promise] if cb is not specified, returns a Promise
  #   fulfilled with the diagnostic string
  @diagnose: (input, encoding, cb) ->
    if !input?
      throw new Error 'input required'

    opts = {}

    switch typeof(encoding)
      when 'function'
        cb = encoding
        encoding = utils.guessEncoding(input)
      when 'object'
        opts = encoding
        encoding = opts.encoding ? utils.guessEncoding(input)
        delete opts.encoding

    bs = new NoFilter
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

  # @nodoc
  _on_more: (mt, len, parent_mt, pos) =>
    if mt == MT.SIMPLE_FLOAT
      @float_bytes = switch(len)
        when 2 then 1
        when 4 then 2
        when 8 then 3

  # @nodoc
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
      when @float_bytes > 0
        fb = @float_bytes
        @float_bytes = -1
        "#{util.inspect(val)}_#{fb}"
      when Buffer.isBuffer val
        "h'#{val.toString("hex")}'"
      when val instanceof bignumber
        val.toString()
      else
        util.inspect(val)

  # @nodoc
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

  # @nodoc
  _on_stop: (mt) =>
    @push switch mt
      when MT.TAG then ")"
      when MT.ARRAY then "]"
      when MT.MAP then "}"
      when MT.BYTE_STRING, MT.UTF8_STRING then ")"
      else
        `// istanbul ignore next`
        throw new Error "Unknown diagnostic type: #{mt}"

  # @nodoc
  _on_data: =>
    @push @separator
