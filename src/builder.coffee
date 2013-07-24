# jslint node: true

events = require 'events'
url = require 'url'
bignumber = require 'bignumber.js'

BufferStream = require '../lib/BufferStream'
Tagged = require '../lib/tagged'
utils = require '../lib/utils'

Evented = require './evented'
constants = require './constants'

TAG = constants.TAG
MT = constants.MT
MINUS_ONE = new bignumber -1
TEN = new bignumber 10
TWO = new bignumber 2

class Builder extends events.EventEmitter
  constructor: (@parser, tags) ->
    @tags = {}
    for k,v of TAG
      f = @["tag_" + k]
      if f? and (typeof(f) == 'function')
        @tags[v] = f
    utils.extend @tags, tags
    @stack = []
    @parser ?= new Evented
    @listen()

  on_error: (er) =>
    @emit 'error', er

  process: (val,tags,kind)->
    for t in tags by -1
      try
        f = @tags[t]
        if f?
          val = f.call(this, val) ? new Tagged(t, val)
        else
          val = new Tagged t, val
      catch er
        val = new Tagged t, val, er

    switch kind
      when null then @emit 'complete', val
      when 'array first', 'array' then @last.push val
      when 'key first', 'key' then @stack.push val
      when 'stream first', 'stream' then @last.write val
      when 'value'
        key = @stack.pop()
        @last[key] = val
      else console.log 'unknown', kind

  on_value: (val,tags,kind)=>
    @process val, tags, kind

  on_array_start: (count,tags,kind)=>
    if @last?
      @stack.push @last
    @last = []

  on_array_stop: (count,tags,kind)=>
    [val, @last] = [@last, @stack.pop()]
    @process val, tags, kind

  on_map_start: (count,tags,kind)=>
    if @last?
      @stack.push @last
    @last = {}

  on_map_stop: (count,tags,kind)=>
    [val, @last] = [@last, @stack.pop()]
    @process val, tags, kind

  on_stream_start: (mt,tags,kind)=>
    if @last?
      @stack.push @last
    @last = new BufferStream

  on_stream_stop: (count,mt,tags,kind)=>
    [val, @last] = [@last, @stack.pop()]
    val = val.read()
    if mt == MT.UTF8_STRING
      val = val.toString 'utf8'
    @process val, tags, kind

  on_end: ()=>
    @emit 'end'

  listen: ()->
    @parser.on 'value', @on_value
    @parser.on 'array start', @on_array_start
    @parser.on 'array stop', @on_array_stop
    @parser.on 'map start', @on_map_start
    @parser.on 'map stop', @on_map_stop
    @parser.on 'stream start', @on_stream_start
    @parser.on 'stream stop', @on_stream_stop
    @parser.on 'end', @on_end
    @parser.on 'error', @on_error

  unlisten: ()->
    @parser.removeListener 'value', @on_value
    @parser.removeListener 'array start', @on_array_start
    @parser.removeListener 'array stop', @on_array_stop
    @parser.removeListener 'map start', @on_map_start
    @parser.removeListener 'map stop', @on_map_stop
    @parser.removeListener 'stream start', @on_stream_start
    @parser.removeListener 'stream stop', @on_stream_stop
    @parser.removeListener 'end', @on_end
    @parser.removeListener 'error', @on_error

  unpack: (buf, offset, encoding)->
    @parser.unpack buf, offset, encoding

  @parse: (buf, cb)->
    d = new Builder();
    actual = []
    d.on 'complete', (v)->
      actual.push v

    d.on 'end', ()->
      cb(null, actual) if cb
    d.on 'error', cb
    d.unpack buf

  tag_DATE_STRING: (val)->
    new Date(val)

  tag_DATE_EPOCH: (val)->
    new Date(val * 1000)

  tag_POS_BIGINT: (val)->
    utils.bufferToBignumber val

  tag_NEG_BIGINT: (val)->
    MINUS_ONE.minus(utils.bufferToBignumber val)

  tag_DECIMAL_FRAC: (val)->
    [e,m] = val
    # m*(10**e)
    TEN.pow(e).times(m)

  tag_BIGFLOAT: (val)->
    [e,m] = val
    # m*(2**e)
    TWO.pow(e).times(m)

  tag_URI: (val)->
    url.parse(val)

  tag_REGEXP: (val)->
    new RegExp val

module.exports = Builder
