# jslint node: true

stream = require 'stream'

Evented = require './evented'
BufferStream = require '../lib/BufferStream'
Simple = require '../lib/simple'
utils = require '../lib/utils'

class Diagnose extends stream.Writable
  constructor: (options={}) ->
    super()

    @options = utils.extend
      separator: '\n'
      output: process.stdout
    , options

    @parser = new Evented
      input: @options.input
    @listen()

  start: ()->
    @parser.start()

  _stream_val: (val) ->
    @options.output.write switch
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
      @options.output.write er.toString()
    @emit 'error', er

  _fore: (kind) ->
    switch kind
      when 'array', 'key', 'stream' then @options.output.write ', '

  _aft: (kind) ->
    switch kind
      when 'key', 'key first' then @options.output.write ': '
      when null
        if @options.separator?
          @options.output.write @options.separator
        @emit 'complete', @options.output

  on_value: (val,tags,kind)=>
    @_fore kind
    if tags
      @options.output.write "#{t}(" for t in tags

    @_stream_val val

    if tags
      @options.output.write ")" for t in tags
    @_aft kind

  on_array_start: (count,tags,kind)=>
    @_fore kind
    if tags
      @options.output.write "#{t}(" for t in tags
    @options.output.write "["
    if count == -1
      @options.output.write "_ "

  on_array_stop: (count,tags,kind)=>
    @options.output.write "]"
    if tags
      @options.output.write ")" for t in tags
    @_aft kind

  on_map_start: (count,tags,kind)=>
    @_fore kind
    if tags
      @options.output.write "#{t}(" for t in tags
    @options.output.write "{"
    if count == -1
      @options.output.write "_ "

  on_map_stop: (count,tags,kind)=>
    @options.output.write "}"
    if tags
      @options.output.write ")" for t in tags
    @_aft kind

  on_stream_start: (mt,tags,kind)=>
    @_fore kind
    if tags
      @options.output.write "#{t}(" for t in tags
    @options.output.write "(_ "

  on_stream_stop: (count,mt,tags,kind)=>
    @options.output.write ")"
    if tags
      @options.output.write ")" for t in tags
    @_aft kind

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

  _write: (chunk, enc, next)->
    @parser.write chunk, enc, next

module.exports = Diagnose
