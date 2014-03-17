# jslint node: true

stream = require 'stream'
url = require 'url'
bignumber = require 'bignumber.js'

BufferStream = require './BufferStream'
Tagged = require './tagged'
utils = require './utils'

Evented = require './evented'
{TAG, MT} = require './constants'

MINUS_ONE = new bignumber -1
TEN = new bignumber 10
TWO = new bignumber 2
DEFAULT_TAG_FUNCS = {}

# Decode a CBOR byte stream into JavaScript objects.  Either pipe another stream
# into an instance of this class, or pass a string, Buffer, or BufferStream into
# `options.input`, assign callbacks, then call `start()`.
# @event end() Done processing the input
# @event error(er) An error has occured
#   @param er [Error]
# @event complete(obj) A complete CBOR object has been read from the stream
#   This is the main event to hook.
#   @param obj [Object] the object that was detected
module.exports = class Decoder extends stream.Writable
  # Create a Decoder
  # @param options [Object] options for creation
  # @option options input [Buffer,String,BufferStream] optional input
  # @option options encoding [String] encoding of a String `input` (default: 'hex')
  # @option options offset [Integer] *byte* offset into the input from which to start
  # @option options tags [Object] map of tag numbers to function(value), returning an
  #   object of the correct type for that tag.
  constructor: (@options={}) ->
    super()

    @tags = utils.extend {}, DEFAULT_TAG_FUNCS, @options.tags
    @stack = []

    @parser = new Evented
      input: @options.input

    @parser.on 'value', @_on_value
    @parser.on 'array-start', @_on_array_start
    @parser.on 'array-stop', @_on_array_stop
    @parser.on 'map-start', @_on_map_start
    @parser.on 'map-stop', @_on_map_stop
    @parser.on 'stream-start', @_on_stream_start
    @parser.on 'stream-stop', @_on_stream_stop
    @parser.on 'end', @_on_end
    @parser.on 'error', @_on_error

    @on 'finish', ->
      @parser.end()

  # All events have been hooked, start parsing the input.
  #
  # @note This MUST NOT be called if you're piping a Readable stream in.
  start: ()->
    @parser.start()

  # @nodoc
  _on_error: (er) =>
    @emit 'error', er

  # @nodoc
  _process: (val,tags,kind)->
    # unwrap tags from the inside-most first
    for t in tags by -1
      try
        # if there's a function for this tag, call it
        f = @tags[t]
        if f?
          val = f.call(this, val) ? new Tagged(t, val)
        else
          val = new Tagged t, val
      catch er
        val = new Tagged t, val, er

    switch kind
      when null then @emit 'complete', val
      when 'array-first', 'array' then @last.push val
      when 'key-first', 'key' then @stack.push val
      when 'stream-first', 'stream'
        switch @mt
          when MT.BYTE_STRING
            unless Buffer.isBuffer(val)
              @parser.error(new Error 'Bad input in stream, expected buffer')
              return
          when MT.UTF8_STRING
            unless typeof val == 'string'
              @parser.error(new Error 'Bad input in stream, expected string')
              return
          else
            `// istanbul ignore next`
            throw new Error 'Unknown stream type'
        @last.write val
      when 'value'
        key = @stack.pop()
        @last[key] = val
        `// istanbul ignore next`
      else
        @parser.error(new Error "Unknown event kind: #{kind}")

  # @nodoc
  _on_value: (val,tags,kind)=>
    @_process val, tags, kind

  # @nodoc
  _on_array_start: (count,tags,kind)=>
    if @last?
      @stack.push @last
    @last = []

  # @nodoc
  _on_array_stop: (count,tags,kind)=>
    [val, @last] = [@last, @stack.pop()]
    @_process val, tags, kind

  # @nodoc
  _on_map_start: (count,tags,kind)=>
    if @last?
      @stack.push @last
    @last = {}

  # @nodoc
  _on_map_stop: (count,tags,kind)=>
    [val, @last] = [@last, @stack.pop()]
    @_process val, tags, kind

  # @nodoc
  _on_stream_start: (mt,tags,kind)=>
    if @last?
      @stack.push [@last, @mt]
    @mt = mt
    @last = new BufferStream

  # @nodoc
  _on_stream_stop: (count,mt,tags,kind)=>
    val = @last.read()
    lm = @stack.pop()
    if lm
      [@last, @mt] = lm
    if mt == MT.UTF8_STRING
      val = val.toString 'utf8'
    @_process val, tags, kind

  # @nodoc
  _on_end: ()=>
    @emit 'end'

  # @nodoc
  _write: (buf, offset, encoding)->
    @parser.write buf, offset, encoding

  # Decode CBOR objects from a Buffer, String, or BufferStream
  # @param buf [Buffer,String,BufferStream] the input
  # @param cb [function(Error, Array)] callback function
  # @note I am continually surprised this returns an array.
  @decode: (buf, cb)->
    if !cb?
      throw new Error "cb must be specified"
    d = new Decoder
      input: buf
    actual = []
    d.on 'complete', (v)->
      actual.push v

    d.on 'end', ()->
      cb(null, actual)
    d.on 'error', cb
    d.start()

  # @nodoc
  @_tag_DATE_STRING: (val)->
    new Date(val)

  # @nodoc
  @_tag_DATE_EPOCH: (val)->
    new Date(val * 1000)

  # @nodoc
  @_tag_POS_BIGINT: (val)->
    utils.bufferToBignumber val

  # @nodoc
  @_tag_NEG_BIGINT: (val)->
    MINUS_ONE.minus(utils.bufferToBignumber val)

  # @nodoc
  @_tag_DECIMAL_FRAC: (val)->
    [e,m] = val
    # m*(10**e)
    TEN.pow(e).times(m)

  # @nodoc
  @_tag_BIGFLOAT: (val)->
    [e,m] = val
    # m*(2**e)
    TWO.pow(e).times(m)

  # @nodoc
  @_tag_URI: (val)->
    url.parse(val)

  # @nodoc
  @_tag_REGEXP: (val)->
    new RegExp val

# run once
for k,v of TAG
  f = Decoder["_tag_" + k]
  if typeof(f) == 'function'
    DEFAULT_TAG_FUNCS[v] = f
