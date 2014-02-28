# jslint node: true

events = require 'events'

Evented = require './evented'
BufferStream = require '../lib/BufferStream'
Simple = require '../lib/simple'
utils = require '../lib/utils'

class Diagnose extends events.EventEmitter
  constructor: (@parser, options) ->
    @options = utils.extend
      separator: '\n'
      stream: process.stdout
    , options

    @parser ?= new Evented(options)
    @listen()

  stream_val: (val) ->
    @options.stream.write switch
      when val == undefined then 'undefined'
      when val == null then 'nil'
      when typeof(val) == 'number'
        if isNaN(val) then "NaN"
        else if !isFinite(val)
          if val < 0 then '-Infinity' else 'Infinity'
        else
          JSON.stringify(val)
      when Simple.isSimple(val) then val.toString()
      when Buffer.isBuffer(val) then "h'" + val.toString('hex') + "'"
      else JSON.stringify(val)

  on_error: (er) =>
    if @options.streamErrors
      @options.stream.write er.toString()
    @emit 'error', er

  fore: (kind) ->
    switch kind
      when 'array', 'key', 'stream' then @options.stream.write ', '

  aft: (kind) ->
    switch kind
      when 'key', 'key first' then @options.stream.write ': '
      when null
        if @options.separator?
          @options.stream.write @options.separator
        @emit 'complete', @options.stream

  on_value: (val,tags,kind)=>
    @fore kind
    if tags
      @options.stream.write "#{t}(" for t in tags

    @stream_val val

    if tags
      @options.stream.write ")" for t in tags
    @aft kind

  on_array_start: (count,tags,kind)=>
    @fore kind
    if tags
      @options.stream.write "#{t}(" for t in tags
    @options.stream.write "["
    if count == -1
      @options.stream.write "_ "

  on_array_stop: (count,tags,kind)=>
    @options.stream.write "]"
    if tags
      @options.stream.write ")" for t in tags
    @aft kind

  on_map_start: (count,tags,kind)=>
    @fore kind
    if tags
      @options.stream.write "#{t}(" for t in tags
    @options.stream.write "{"
    if count == -1
      @options.stream.write "_ "

  on_map_stop: (count,tags,kind)=>
    @options.stream.write "}"
    if tags
      @options.stream.write ")" for t in tags
    @aft kind

  on_stream_start: (mt,tags,kind)=>
    @fore kind
    if tags
      @options.stream.write "#{t}(" for t in tags
    @options.stream.write "(_ "

  on_stream_stop: (count,mt,tags,kind)=>
    @options.stream.write ")"
    if tags
      @options.stream.write ")" for t in tags
    @aft kind

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

  unpack: (buf, offset, encoding)->
    @parser.unpack buf, offset, encoding

module.exports = Diagnose
