# jslint node: true

stream = require 'stream'
util = require 'util'

Decoder = require './stream'
BufferStream = require './BufferStream'
Simple = require './simple'
utils = require './utils'
{MT} = require './constants'

# Output the diagnostic format from a set of CBOR bytes.
module.exports = class Diagnose extends stream.Transform
  # Create a Diagnose.
  # @param options [Object] options for creation
  # @option options separator [String] output between detected objects
  #   (default: '\n')
  constructor: (options = {}) ->
    super()
    @_writableState.objectMode = false
    @_readableState.objectMode = false

    @options = utils.extend
      separator: '\n'
      streamErrors: false
    , options

    @parser = new Decoder @options

    @parser.on 'value', @_on_value
    @parser.on 'start', @_on_start
    @parser.on 'stop', @_on_stop
    @parser.on 'data', @_on_data
    @parser.on 'error', @_on_error

  _transform: (fresh, encoding, cb) ->
    @parser.write fresh, encoding, cb

  # Convenience function to return a string in diagnostic format.
  # @param input [Buffer,String] the CBOR bytes to write
  # @param encoding the encoding, if input is a stream (defaults to 'hex')
  # @param cb [function(error, String)]
  @diagnose: (input, encoding, cb) ->
    if !input?
      throw new Error 'input required'

    if typeof(encoding) == 'function'
      cb = encoding
      if typeof(input) == 'string'
        encoding = 'hex'
      else
        encoding = undefined

    if !cb?
      throw new Error 'callback required'

    bs = new BufferStream
    d = new Diagnose

    d.on 'end', ->
      cb(null, bs.toString('utf8'))
    d.on 'error', cb
    d.pipe bs
    d.end input, encoding

  # @nodoc
  _on_error: (er) =>
    if @options.streamErrors
      @push er.toString()
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
    if val == Decoder.BREAK
      return
    @_fore parent_mt, pos
    @push switch
      when typeof(val) == 'string'
        "\"#{val}\""
      when Buffer.isBuffer val
        "h'#{val.toString("hex")}'"
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
        throw new Error "Unknown diagnostic type: #{mt}"
    if tag == Decoder.STREAM
      @push "_ "

  _on_stop: (mt) =>
    @push switch mt
      when MT.TAG then ")"
      when MT.ARRAY then "]"
      when MT.MAP then "}"
      when MT.BYTE_STRING, MT.UTF8_STRING then ")"
      else
        throw new Error "Unknown diagnostic type: #{mt}"

  _on_data: =>
    @push @options.separator
