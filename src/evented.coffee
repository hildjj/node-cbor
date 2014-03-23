# jslint node: true

assert = require 'assert'
stream = require 'stream'
async = require 'async'

BufferStream = require './BufferStream'
utils = require './utils'
Simple = require './simple'
constants = require './constants'
MT = constants.MT

`// istanbul ignore next`
# @nodoc
# Never executed, just an atom to compare against that can never happen in
# a real stream.
BREAK = () ->
  "BREAK"

# A SAX-style syntactic parser for CBOR.  Either pipe another
# stream into an instance of this class, or pass a string, Buffer, or
# BufferStream into `options.input`, assign callbacks, then call `start()`.
#
# In the event callbacks, `kind` is one of the following strings:
# - 'value': an atomic value was detected
# - 'array-first': the first element of an array
# - 'array': an item after the first in an array
# - 'key-first': the first key in a map
# - 'key': a key other than the first in a map
# - 'stream-first': the first item in an indefinite encoding
# - 'stream': an item other than the first in an indefinite encoding
# - null: the end of a top-level CBOR item
#
# @event value(val,tags,kind) an atomic item (not a map or array) was detected
#   @param val [any] the value
#   @param tags [Array] an array of tags that preceded the value
#   @param kind [String] see above
#
# @event array-start(count,tags,kind) the start of an array has been read.
#   @param count [Integer] the number of items in the array.
#     -1 if indefinite length.
#   @param tags [Array] an array of tags that preceded the list.
#   @param kind [String] see above
#
# @event array-stop(count,tags,kind) the end of an array has been reached.
#   @param count [Integer] the actual number of items in the array.
#   @param tags [Array] an array of tags that preceded the list.
#   @param kind [String] see above
#
# @event map-start(count,tags,kind) the start of a map has been read.
#   @param count [Integer] the number of pairs in the map.
#     -1 if indefinite length.
#   @param tags [Array] an array of tags that preceded the list
#   @param kind [String] see above
#
# @event map-stop(count,tags,kind) the end of a map has been reached
#   @param count [Integer] the actual number of pairs in the map.
#   @param tags [Array] an array of tags that preceded the list
#   @param kind [String] see above
#
# @event stream-start(mt,tags,kind) The start of a CBOR indefinite length
#   bytestring or utf8-string.
#   @param mt [] the major type for all of the items
#   @param tags [Array] an array of tags that preceded the list
#   @param kind [String] see above
#
# @event stream-stop(count,mt,tags,kind) we got to the end of a CBOR indefinite
#   length bytestring or utf8-string.
#   @param count [Integer] the number of constituent items
#   @param mt [] the major type for all of the items
#   @param tags [Array] an array of tags that preceded the list
#   @param kind [String] see above
#
# @event end() the end of the input
#
# @event error(er) parse error such as invalid input
#   @param er [Error]
#
module.exports = class Evented extends stream.Writable

  # Create an event-based CBOR parser.
  # @param options [Object] options for the parser
  # @option options input [Buffer,String,BufferStream] optional input
  # @option options encoding [String] encoding of a String `input`
  #   (default: 'hex')
  # @option options offset [Integer] *byte* offset into the input from
  #   which to start
  constructor: (options) ->
    super() # TODO: pass subset of options
    @options = utils.extend
      max_depth: 512  # on my machine, the max was 674
      input: null
      offset: 0
      encoding: 'hex'
    , options

    @bs = null
    @tags = []
    @kind = null
    @depth = 0
    @last_err = null

    @on 'finish', () =>
      @bs.end()

    if @options.input?
      input = @options.input
      buf = null
      if Buffer.isBuffer(input)
        buf = input
      else if typeof(input) == 'string'
        if @options.encoding == 'hex'
          input = input.replace /^0x/, ''
        buf = new Buffer(input, @options.encoding)
      else if BufferStream.isBufferStream(input)
        @bs = input
        return @_start
      else
        throw new Error "input must be Buffer, string, or BufferStream"

      if @options.offset
        buf = buf.slice @options.offset
      @bs = new BufferStream
        bsInit: buf

      @_start
    else
      @bs = new BufferStream
      @_pump()

  # All events have been hooked, start parsing the input.
  #
  # @note This MUST NOT be called if you're piping a Readable stream in.
  start: () ->
    @_pump()

  # Report an error to the parser, typically by a callback that is checking
  # its inputs
  # @param er [Error] the error detected
  error: (er) ->
    @last_er = er

  # @nodoc
  _write: (chunk, enc, next) ->
    @bs.write chunk, enc, next

  # @nodoc
  _drainState: () ->
    tags = @tags.slice()
    @tags.length = 0
    [@kind, kind] = [null, @kind]
    [tags, kind]

  # @nodoc
  _val: (val,cb) ->
    [tags, kind] = @_drainState()
    @emit 'value', val, tags, kind
    cb.call this, @last_er, val

  # @nodoc
  _readBuf: (len,cb) ->
    @bs.wait len, (er,buf) =>
      return cb.call(this,er) if er
      @_val buf, cb

  # @nodoc
  _readStr: (len,cb) ->
    @bs.wait len, (er,buf) =>
      return cb.call(this,er) if er
      @_val buf.toString('utf8'), cb

  # @nodoc
  _readArray: (count,cb) ->
    [tags, kind] = @_drainState()
    @emit 'array-start', count, tags, kind

    async.timesSeries count, (n,done) =>
      @kind = if n then 'array' else 'array-first'
      @_unpack done
    , (er) =>
      return cb.call(this, er) if er
      @emit 'array-stop', count, tags, kind
      @mt = MT.ARRAY
      cb.call this

  # @nodoc
  _readMap: (count,cb) ->
    [tags, kind] = @_drainState()
    @emit 'map-start', count, tags, kind
    up = @_unpack.bind(this)

    async.timesSeries count, (n,done) =>
      async.series [
        (cb) =>
          @kind = if n then 'key' else 'key-first'
          up cb
        , (cb) =>
          @kind = 'value'
          up cb
      ], done
    , (er) =>
      return cb.call(this, er) if er
      @emit 'map-stop', count, tags, kind
      @mt = MT.MAP
      cb.call this

  # @nodoc
  _readTag: (val,cb) ->
    @tags.push val
    @_unpack cb

  # @nodoc
  _readSimple: (val,cb) ->
    @_val switch val
      when 20 then false
      when 21 then true
      when 22 then null
      when 23 then undefined
      else new Simple(val)
    , cb

  # @nodoc
  _getVal: (val,cb) ->
    switch @mt
      when MT.POS_INT then @_val val, cb
      when MT.NEG_INT then @_val -1 - val, cb
      when MT.BYTE_STRING then @_readBuf val, cb
      when MT.UTF8_STRING then @_readStr val, cb
      when MT.ARRAY then @_readArray val, cb
      when MT.MAP then @_readMap val, cb
      when MT.TAG then @_readTag val, cb
      when MT.SIMPLE_FLOAT then @_readSimple val, cb
      else
        # really should never happen, since the above are all of the cases
        # of three bits
        `// istanbul ignore next`
        cb.call this, new Error("Unknown major type(#{@mt}): #{val}")

  # @nodoc
  _stream_stringy: (cb) ->
    mt = @mt
    [tags, kind] = @_drainState()
    count = 0
    @emit 'stream-start', mt, tags, kind
    keep_going = true
    async.doWhilst (done) =>
      @kind = if count then 'stream' else 'stream-first'
      @_unpack (er,val) =>
        return done(er) if er
        if val == BREAK
          keep_going = false
        else
          if @mt != mt
            done(new Error "Invalid stream major type: #{@mt},
              when anticipating only #{mt}")
            return
          count++
        done()
    , () ->
      keep_going
    , (er) =>
      return cb.call(this, er) if er
      @emit 'stream-stop', count, mt, tags, kind
      cb.call this

  # @nodoc
  _stream_array: (cb) ->
    mt = @mt
    [tags, kind] = @_drainState()
    count = 0
    @emit 'array-start', -1, tags, kind
    keep_going = true

    async.doWhilst (done) =>
      @kind = if count then 'array' else 'array-first'
      @_unpack (er,val) ->
        return done(er) if er
        if val == BREAK
          keep_going = false
        else
          count++
        done()
    , () ->
      keep_going
    , (er) =>
      return cb.call(this, er) if er
      @emit 'array-stop', count, tags, kind
      cb.call this

  # @nodoc
  _stream_map: (cb) ->
    mt = @mt
    [tags, kind] = @_drainState()
    count = 0
    @emit 'map-start', -1, tags, kind
    keep_going = true

    async.doWhilst (done) =>
      @kind = if count then 'key' else 'key-first'
      @_unpack (er,val) =>
        return done(er) if er
        if val == BREAK
          keep_going = false
          done()
        else
          @kind = 'value'
          @_unpack done
    , () ->
      count++
      keep_going
    , (er) =>
      return cb.call(this, er) if er
      @emit 'map-stop', count, tags, kind
      cb.call this

  # @nodoc
  _stream: (cb) ->
    switch @mt
      when MT.BYTE_STRING, MT.UTF8_STRING then @_stream_stringy cb
      when MT.ARRAY then @_stream_array cb
      when MT.MAP then @_stream_map cb
      when MT.SIMPLE_FLOAT
        [tags, kind] = @_drainState()
        cb.call this, null, BREAK
      else
        # really should never happen, since the above are all of the cases
        # of three bits
        `// istanbul ignore next`
        cb.call this, new Error("Invalid stream major type: #{@mt}")

  # @nodoc
  _unpack: (cb) ->
    @bs.wait 1, (er,buf) =>
      return cb(er) if er

      @depth++
      if @depth > @options.max_depth
        return cb.call this, new Error("Maximum depth exceeded: #{@depth}")
      @octet = buf[0]
      @mt = @octet >> 5
      @ai = @octet & 0x1f

      decrement = (er)=>
        unless er instanceof Error
          @depth--
        cb.apply this, arguments

      switch @ai
        when 24,25,26,27
          @bs.wait 1 << (@ai - 24), (er,buf) =>
            return cb er if er
            if @mt == MT.SIMPLE_FLOAT # floating point or high simple
              if @ai == 24
                @_readSimple utils.parseInt(@ai, buf), decrement
              else
                @_val utils.parseFloat(@ai, buf), decrement
            else
              @_getVal utils.parseInt(@ai, buf), decrement
        when 28,29,30
          return cb(new Error("Additional info not implemented: #{@ai}"))
        when 31 then @_stream decrement
        else @_getVal @ai, decrement

  # @nodoc
  _pump: (er)=>
    if er
      if BufferStream.isEOFError(er) && (@depth == 0)
        return @emit 'end'
      else
        return @emit 'error', er

    async.nextTick ()=>
      if @bs.isEOF()
        @emit 'end'
      else
        @_unpack @_pump
