# jslint node: true

assert = require 'assert'
events = require 'events'
async = require 'async'

BufferStream = require '../lib/BufferStream'
utils = require '../lib/utils'
Simple = require '../lib/simple'
constants = require './constants'
MT = constants.MT

BREAK = () ->
  "BREAK"

class EventedParser extends events.EventEmitter
  constructor: (@options) ->
    @options ?= {}

  _drainState: (state) ->
    tags = state.tags.slice()
    state.tags.length = 0
    [state.kind, kind] = [null, state.kind]
    [tags, kind]

  _val: (state,val,cb) ->
    [tags, kind] = @_drainState(state)
    @emit 'value', val, tags, kind
    cb.call this, null, val

  _readBuf: (state,len,cb) ->
    state.bs.wait len, (er,buf) =>
      return cb.call(this,er) if er
      @_val state, buf, cb

  _readStr: (state,len,cb) ->
    state.bs.wait len, (er,buf) =>
      return cb.call(this,er) if er
      @_val state, buf.toString('utf8'), cb

  _readArray: (state,count,cb) ->
    [tags, kind] = @_drainState(state)
    @emit 'array start', count, tags, kind

    async.timesSeries count, (n,done) =>
      state.kind = if n then 'array' else 'array first'
      @_unpack state, done
    , (er) =>
      return cb.call(this, er) if er
      @emit 'array stop', count, tags, kind
      state.mt = MT.ARRAY
      cb.call this

  _readMap: (state,count,cb) ->
    [tags, kind] = @_drainState(state)
    @emit 'map start', count, tags, kind
    up = @_unpack.bind(this)

    async.timesSeries count, (n,done) =>
      async.series [
        (cb) =>
          state.kind = if n then 'key' else 'key first'
          up state, cb
        , (cb) =>
          state.kind = 'value'
          up state, cb
      ], done
    , (er) =>
        return cb.call(this, er) if er
        @emit 'map stop', count, tags, kind
        state.mt = MT.MAP
        cb.call this

  _readTag: (state,val,cb) ->
    state.tags.push val
    @_unpack state, cb

  _readSimple: (state,val,cb) ->
    switch val
      when 20 then @_val state, false, cb
      when 21 then @_val state, true, cb
      when 22 then @_val state, null, cb
      when 23 then @_val state, undefined, cb
      else @_val state, new Simple(val), cb

  _getVal: (state,val,cb) ->
    switch state.mt
      when MT.POS_INT then @_val state, val, cb
      when MT.NEG_INT then @_val state, -1-val, cb
      when MT.BYTE_STRING then @_readBuf state, val, cb
      when MT.UTF8_STRING then @_readStr state, val, cb
      when MT.ARRAY then @_readArray state, val, cb
      when MT.MAP then @_readMap state, val, cb
      when MT.TAG then @_readTag state, val, cb
      when MT.SIMPLE_FLOAT then @_readSimple state, val, cb
      else
        cb.call this, new Error("Unknown major type(#{state.mt}): #{val}")

  _stream_stringy: (state,cb) ->
    mt = state.mt
    [tags, kind] = @_drainState(state)
    count = 0
    @emit 'stream start', mt, tags, kind
    keep_going = true
    async.doWhilst (done) =>
      state.kind = if count then 'stream' else 'stream first'
      @_unpack state, (er,val) =>
        return done(er) if er
        if val == BREAK
          keep_going = false
        else
          if state.mt != mt
            return done(new Error("Invalid stream major type: #{state.mt}, when anticipating only #{mt}"))
          count++
        done()
    , () ->
      keep_going
    , (er) =>
      return cb.call that, er if er
      @emit 'stream stop', count, mt, tags, kind
      cb.call this

  _stream_array: (state,cb) ->
    mt = state.mt
    [tags, kind] = @_drainState(state)
    count = 0
    @emit 'array start', -1, tags, kind
    keep_going = true

    async.doWhilst (done) =>
      state.kind = if count then 'array' else 'array first'
      @_unpack state, (er,val) =>
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

  _stream_map: (state,cb) ->
    mt = state.mt
    [tags, kind] = @_drainState(state)
    count = 0
    @emit 'map start', -1, tags, kind
    keep_going = true

    async.doWhilst (done) =>
      state.kind = if count then 'key' else 'key first'
      @_unpack state, (er,val) ->
        return done(er) if er
        if val == BREAK
          keep_going = false
          done()
        else
          count++
          state.kind = 'value'
          @_unpack state, done
    , () ->
      keep_going
    , (er) =>
      return cb.call(this, er) if er
      @emit 'map stop', count, tags, kind
      cb.call this

  _stream: (state,cb) ->
    switch state.mt
      when MT.BYTE_STRING, MT.UTF8_STRING then @_stream_stringy state, cb
      when MT.ARRAY then @_stream_array state, cb
      when MT.MAP then @_stream_map state, cb
      when MT.SIMPLE_FLOAT
        [tags, kind] = @_drainState(state)
        cb.call this, null, BREAK
      else cb.call this, new Error("Invalid stream major type: #{state.mt}")

  _unpack: (state, cb) ->
    state.bs.wait 1, (er,buf) =>
      return @emit 'error', er if er

      state.octet = buf[0]
      state.mt = state.octet >> 5
      state.ai = state.octet & 0x1f

      switch state.ai
        when 24,25,26,27
          state.bs.wait 1<<(state.ai-24), (er,buf) =>
            return cb er if er
            if state.mt == MT.SIMPLE_FLOAT # floating point or high simple
              if state.ai == 24
                @_readSimple state, utils.parseInt(state.ai, buf), cb
              else
                @_val state, utils.parseFloat(state.ai, buf), cb
            else
              @_getVal state, utils.parseInt(state.ai, buf), cb
        when 28,29,30
          return cb new Error("Additional info not implemented: #{ai}")
        when 31 then @_stream state, cb
        else @_getVal state, state.ai, cb

  unpack: (buf, offset=0, encoding='hex') ->
    bs = buf
    if Buffer.isBuffer(bs)
      if offset
        bs = bs.slice(offset)
      bs = new BufferStream
        bsInit: bs
    else if typeof(bs) == 'string'
      s = buf
      if encoding == 'hex'
        s = s.replace /^0x/, ''
      if offset
        s = s.slice offset
      bs = new BufferStream()
      bs.end s, encoding

    else if !BufferStream.isBufferStream(bs)
      throw new Error "buf must be Buffer, string, or BufferStream"
    state =
      bs: bs
      tags: []
      kind: null

    unpacked_one = (er)=>
      return @emit 'error', er if er
      @emit 'top'

      async.nextTick ()=>
        if state.bs.isEOF()
          @emit 'end'
        else
          @_unpack state, unpacked_one

    async.nextTick ()=>
      @_unpack state, unpacked_one

module.exports = EventedParser
