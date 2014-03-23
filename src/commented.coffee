# jslint node: true

assert = require 'assert'
events = require 'events'
stream = require 'stream'
util = require 'util'
async = require 'async'

BufferStream = require './BufferStream'
utils = require './utils'
Simple = require './simple'
{MT} = require './constants'

`// istanbul ignore next`
# @nodoc
# Never executed, just an atom to compare against that can never happen in
# a real stream.
BREAK = () ->
  "BREAK"

# A quick hack to generate the expanded format of RFC 7049, section 2.2.1
module.exports = class Commented extends events.EventEmitter

  # Create a CBOR commenter.  Call start() after you hook any events.
  # @param options [Object] options for the parser
  # @option options input [Buffer,String,BufferStream] input
  # @option options max_depth [Integer] how many times to indent the dashes
  #   (default: 10)
  # @option options output [Writable] where to send the output
  #   (default: process.stdout)
  constructor: (options) ->
    super()
    @bs = null
    @depth = 0

    if !options?
      throw new Error("options is required")

    {input, @output, @max_depth, encoding} = utils.extend
      output: process.stdout
      max_depth: 10
      encoding: 'hex'
    , options

    buf = if Buffer.isBuffer(input)
            input
          else if typeof(input) == 'string'
            input = input.replace /^0x/, ''
            new Buffer(input, encoding)
          else
            throw new Error "input must be Buffer or string"

    @bs = new BufferStream
      bsInit: buf

    @_out '0x%s\n', buf.toString('hex')

  # Call this after you've set up any callbacks desired
  start: () ->
    @_pump()

  # Comment on an input Buffer or string, creating a string passed to the
  # callback.
  # @param options [Object] options for the parser
  # @option options input [Buffer,String,BufferStream] input
  # @option options max_depth [Integer] how many times to indent the dashes
  #   (default: 10)
  # @param cb [function(Error, String)]
  @comment: (options, cb) ->
    if !options?
      throw new Error("options is required")
    if !cb?
      throw new Error("cb is required")

    bs = new BufferStream
    opts = utils.extend options,
      output: bs

    c = new Commented options
    c.on 'end', (er, buf) ->
      cb(er, bs.toString('utf8'))
    c.on 'error', cb
    c.start()

  # @nodoc
  _out: () ->
    @output.write(util.format.apply util, arguments)

  # @nodoc
  _indent: (prefix) ->
    @_out(new Array(@depth+1).join("  "))
    @_out prefix
    ind = (@max_depth - @depth) * 2
    ind -= prefix.length
    if ind < 1
      ind = 1
    @_out(new Array(ind+1).join(" "))
    @_out "-- "

  # @nodoc
  _val: (val,cb) ->
    cb.call this, null, val

  # @nodoc
  _readBuf: (len,cb) ->
    @bs.wait len, (er,buf) =>
      return cb.call(this,er) if er
      @depth++
      @_indent buf.toString('hex')
      @_out "Bytes content\n"
      @depth--
      @_val buf, cb

  # @nodoc
  _readStr: (len,cb) ->
    @bs.wait len, (er,buf) =>
      return cb.call(this,er) if er
      u = buf.toString 'utf8'
      @depth++
      @_indent buf.toString('hex')
      @_out '"%s"\n', u
      @depth--
      @_val u, cb

  # @nodoc
  _readArray: (count,cb) ->
    async.timesSeries count, (n,done) =>
      @_unpack done, "Array[#{n}]: "
    , (er) =>
      return cb.call(this, er) if er
      @mt = MT.ARRAY
      cb.call this

  # @nodoc
  _readMap: (count,cb) ->
    async.timesSeries count, (n,done) =>
      async.series [
        (cb) =>
          @_unpack cb, "Map[#{n}].key: "
        , (cb) =>
          @_unpack cb, "Map[#{n}].value: "
      ], done
    , (er) =>
      return cb.call(this, er) if er
      @mt = MT.MAP
      cb.call this

  # @nodoc
  _readSimple: (val,cb) ->
    v = switch val
      when 20 then false
      when 21 then true
      when 22 then null
      when 23 then undefined
      else new Simple(val)
    @_out "%s\n", v
    @_val v, cb

  # @nodoc
  _getVal: (val,cb) ->
    switch @mt
      when MT.POS_INT
        @_out "%d\n", val
        @_val val, cb
      when MT.NEG_INT
        @_out "%d\n", -1-val
        @_val -1 - val, cb
      when MT.BYTE_STRING
        @_out "Byte string length %d\n", val
        @_readBuf val, cb
      when MT.UTF8_STRING
        @_out "UTF-8 string length %d\n", val
        @_readStr val, cb
      when MT.ARRAY
        @_out "Array of length %d\n", val
        @_readArray val, cb
      when MT.MAP
        @_out "Map with %d pairs\n", val
        @_readMap val, cb
      when MT.TAG
        @_out "Tag %d\n", val
        @_unpack cb
      when MT.SIMPLE_FLOAT then @_readSimple val, cb
      else
        # really should never happen, since the above are all of the cases
        # of three bits
        `// istanbul ignore next`
        cb.call this, new Error("Unknown major type(#{@mt}): #{val}")

  # @nodoc
  _stream_stringy: (cb) ->
    mt = @mt
    count = 0
    keep_going = true
    @_out "Start indefinite-length string\n"

    async.doWhilst (done) =>
      @_unpack (er,val) =>
        return done(er) if er
        if val == BREAK
          keep_going = false
        else
          if @mt != mt
            done(new Error "Invalid stream major type: #{@mt},
              when anticipating only #{mt}")
            return
        done()
    , () ->
      count++
      keep_going
    , cb

  # @nodoc
  _stream_array: (cb) ->
    mt = @mt
    count = 0
    keep_going = true
    @_out "Start indefinite-length array\n"

    async.doWhilst (done) =>
      @_unpack (er,val) ->
        return done(er) if er
        if val == BREAK
          keep_going = false
        done()
    , () ->
      count++
      keep_going
    , cb

  # @nodoc
  _stream_map: (cb) ->
    mt = @mt
    count = 0
    keep_going = true
    @_out "Start indefinite-length map\n"

    async.doWhilst (done) =>
      @_unpack (er,val) =>
        return done(er) if er
        if val == BREAK
          keep_going = false
          done()
        else
          @_unpack done, "Map[#{count}].value: "
      , "Map[#{count}].key: "
    , () ->
      count++
      keep_going
    , cb

  # @nodoc
  _stream: (cb) ->
    switch @mt
      when MT.BYTE_STRING, MT.UTF8_STRING then @_stream_stringy cb
      when MT.ARRAY then @_stream_array cb
      when MT.MAP then @_stream_map cb
      when MT.SIMPLE_FLOAT
        @_out 'BREAK\n'
        cb.call this, null, BREAK
      else
        # really should never happen, since the above are all of the cases
        # of three bits
        `// istanbul ignore next`
        cb.call this, new Error("Invalid stream major type: #{@mt}")

  # @nodoc
  _unpack: (cb, extra="") ->
    @bs.wait 1, (er,buf) =>
      return cb(er) if er

      @octet = buf[0]
      hex = buf.toString('hex');
      @mt = @octet >> 5
      @ai = @octet & 0x1f

      decrement = (er)=>
        unless er instanceof Error
          @depth--
        cb.apply this, arguments

      @depth++
      switch @ai
        when 24,25,26,27
          @bs.wait 1 << (@ai - 24), (er,buf) =>
            return cb er if er
            @_indent(hex + buf.toString('hex'))
            @_out extra
            if @mt == MT.SIMPLE_FLOAT # floating point or high simple
              if @ai == 24
                @_readSimple utils.parseInt(@ai, buf), decrement
              else
                fl = utils.parseFloat(@ai, buf)
                @_out fl
                @_val fl, decrement
            else
              @_getVal utils.parseInt(@ai, buf), decrement
        when 28,29,30
          return cb(new Error("Additional info not implemented: #{@ai}"))
        when 31
          @_indent hex
          @_stream decrement
        else
          @_indent hex
          @_out extra
          @_getVal @ai, decrement

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
