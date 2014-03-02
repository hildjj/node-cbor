# jslint node: true

assert = require 'assert'
stream = require 'stream'
async = require 'async'

BufferStream = require '../lib/BufferStream'
utils = require '../lib/utils'
Simple = require '../lib/simple'
constants = require './constants'
MT = constants.MT

BREAK = () ->
  "BREAK"

module.exports = class EventedParser extends stream.Writable

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

    @on 'finish', ()->
      @bs.end()

    if @options.input?
      @_start @options.input, @options.offset, @options.encoding
    else
      @bs = new BufferStream
      @_pump()

  start: ()->
    @_pump()

  _start: (input, offset, encoding)->
    if Buffer.isBuffer(input)
      if @options.offset
        input = input.slice offset
      @bs = new BufferStream
        bsInit: input
    else if typeof(input) == 'string'
      if encoding == 'hex'
        input = input.replace /^0x/, ''
      if @options.offset
        input = input.slice offset
      @bs = new BufferStream
        bsInit: new Buffer(input, @options.encoding)
    else if !BufferStream.isBufferStream(input)
      throw new Error "input must be Buffer, string, or BufferStream"

  _write: (chunk, enc, next)->
    @bs.write chunk, enc, next

  _drainState: () ->
    tags = @tags.slice()
    @tags.length = 0
    [@kind, kind] = [null, @kind]
    [tags, kind]

  _val: (val,cb) ->
    [tags, kind] = @_drainState()
    @emit 'value', val, tags, kind
    cb.call this, null, val

  _readBuf: (len,cb) ->
    @bs.wait len, (er,buf) =>
      return cb.call(this,er) if er
      @_val buf, cb

  _readStr: (len,cb) ->
    @bs.wait len, (er,buf) =>
      return cb.call(this,er) if er
      @_val buf.toString('utf8'), cb

  _readArray: (count,cb) ->
    [tags, kind] = @_drainState()
    @emit 'array start', count, tags, kind

    async.timesSeries count, (n,done) =>
      @kind = if n then 'array' else 'array first'
      @_unpack done
    , (er) =>
      return cb.call(this, er) if er
      @emit 'array stop', count, tags, kind
      @mt = MT.ARRAY
      cb.call this

  _readMap: (count,cb) ->
    [tags, kind] = @_drainState()
    @emit 'map start', count, tags, kind
    up = @_unpack.bind(this)

    async.timesSeries count, (n,done) =>
      async.series [
        (cb) =>
          @kind = if n then 'key' else 'key first'
          up cb
        , (cb) =>
          @kind = 'value'
          up cb
      ], done
    , (er) =>
        return cb.call(this, er) if er
        @emit 'map stop', count, tags, kind
        @mt = MT.MAP
        cb.call this

  _readTag: (val,cb) ->
    @tags.push val
    @_unpack cb

  _readSimple: (val,cb) ->
    switch val
      when 20 then @_val false, cb
      when 21 then @_val true, cb
      when 22 then @_val null, cb
      when 23 then @_val undefined, cb
      else @_val new Simple(val), cb

  _getVal: (val,cb) ->
    switch @mt
      when MT.POS_INT then @_val val, cb
      when MT.NEG_INT then @_val -1-val, cb
      when MT.BYTE_STRING then @_readBuf val, cb
      when MT.UTF8_STRING then @_readStr val, cb
      when MT.ARRAY then @_readArray val, cb
      when MT.MAP then @_readMap val, cb
      when MT.TAG then @_readTag val, cb
      when MT.SIMPLE_FLOAT then @_readSimple val, cb
      else
        cb.call this, new Error("Unknown major type(#{@mt}): #{val}")

  _stream_stringy: (cb) ->
    mt = @mt
    [tags, kind] = @_drainState()
    count = 0
    @emit 'stream start', mt, tags, kind
    keep_going = true
    async.doWhilst (done) =>
      @kind = if count then 'stream' else 'stream first'
      @_unpack (er,val) =>
        return done(er) if er
        if val == BREAK
          keep_going = false
        else
          if @mt != mt
            return done(new Error("Invalid stream major type: #{@mt}, when anticipating only #{mt}"))
          count++
        done()
    , () ->
      keep_going
    , (er) =>
      return cb.call(this, er) if er
      @emit 'stream stop', count, mt, tags, kind
      cb.call this

  _stream_array: (cb) ->
    mt = @mt
    [tags, kind] = @_drainState()
    count = 0
    @emit 'array start', -1, tags, kind
    keep_going = true

    async.doWhilst (done) =>
      @kind = if count then 'array' else 'array first'
      @_unpack (er,val) =>
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
      @emit 'array stop', count, tags, kind
      cb.call this

  _stream_map: (cb) ->
    mt = @mt
    [tags, kind] = @_drainState()
    count = 0
    @emit 'map start', -1, tags, kind
    keep_going = true

    async.doWhilst (done) =>
      @kind = if count then 'key' else 'key first'
      @_unpack (er,val) ->
        return done(er) if er
        if val == BREAK
          keep_going = false
          done()
        else
          count++
          @kind = 'value'
          @_unpack done
    , () ->
      keep_going
    , (er) =>
      return cb.call(this, er) if er
      @emit 'map stop', count, tags, kind
      cb.call this

  _stream: (cb) ->
    switch @mt
      when MT.BYTE_STRING, MT.UTF8_STRING then @_stream_stringy cb
      when MT.ARRAY then @_stream_array cb
      when MT.MAP then @_stream_map cb
      when MT.SIMPLE_FLOAT
        [tags, kind] = @_drainState()
        cb.call this, null, BREAK
      else cb.call this, new Error("Invalid stream major type: #{@mt}")

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
          @bs.wait 1<<(@ai-24), (er,buf) =>
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
