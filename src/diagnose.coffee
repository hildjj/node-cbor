# jslint node: true

stream = require 'stream'

Evented = require './evented'
BufferStream = require '../lib/BufferStream'
Simple = require '../lib/simple'
utils = require '../lib/utils'

# Output the diagnostic format from a set of CBOR bytes.  Either pipe another
# stream into an instance of this class, or pass a string, Buffer, or
# BufferStream into `options.input`, assign callbacks, then call `start()`.
#
# @event end() Done processing the input
# @event error(er) An error has occured
#   @param er [Error]
# @event complete(obj) A complete CBOR object has been read from the stream
#   There is no need to hook this event usually, it's mostly for testing.
#   @param obj [Stream] the stream that was written to
# @todo Consider turning this into a Transform stream
module.exports = class Diagnose extends stream.Writable
  # Create a Diagnose.
  # @param options [Object] options for creation
  # @option options separator [String] output between detected objects
  #   (default: '\n')
  # @option options output [Writable] where the output should go
  #   (default: process.stdout)
  # @option options input [Buffer,String,BufferStream] optional input
  # @option options encoding [String] encoding of a String `input`
  #   (default: 'hex')
  # @option options offset [Integer] *byte* offset into the input from which
  #   to start
  constructor: (options = {}) ->
    super()

    @options = utils.extend
      separator: '\n'
      output: process.stdout
      streamErrors: false
    , options

    @on 'finish', () =>
      @parser.end()

    @parser = new Evented @options

    @parser.on 'value', @_on_value
    @parser.on 'array-start', @_on_array_start
    @parser.on 'array-stop', @_on_array_stop
    @parser.on 'map-start', @_on_map_start
    @parser.on 'map-stop', @_on_map_stop
    @parser.on 'stream-start', @_on_stream_start
    @parser.on 'stream-stop', @_on_stream_stop
    @parser.on 'end', @_on_end
    @parser.on 'error', @_on_error

  # All events have been hooked, start parsing the input.
  # @note This MUST NOT be called if you're piping a Readable stream in.
  start: () ->
    @parser.start()

  # Convenience function to print to (e.g.) stdout.
  # @param input [Buffer,String,BufferStream] the CBOR bytes to write
  # @param encoding [String] encoding if `input` is a string (default: 'hex')
  # @param output [Writable] Writable stream to output diagnosis info into
  #   (default: process.stdout)
  # @param done [function()]
  @diagnose: (input, encoding = 'hex', output = process.stdout, done) ->
    if !input?
      throw new Error 'input required'

    d = new Diagnose
      input: input
      encoding: encoding
      output: output
    if done
      d.on 'end', done
    d.start()

  # @nodoc
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

  # @nodoc
  _on_error: (er) =>
    if @options.streamErrors
      @options.output.write er.toString()
    @emit 'error', er

  # @nodoc
  _fore: (kind) ->
    switch kind
      when 'array', 'key', 'stream' then @options.output.write ', '

  # @nodoc
  _aft: (kind) ->
    switch kind
      when 'key', 'key-first' then @options.output.write ': '
      when null
        if @options.separator?
          @options.output.write @options.separator
        @emit 'complete', @options.output

  # @nodoc
  _on_value: (val,tags,kind) =>
    @_fore kind
    if tags? and tags.length
      @options.output.write "#{t}(" for t in tags

    @_stream_val val

    if tags? and tags.length
      @options.output.write ")" for t in tags
    @_aft kind

  # @nodoc
  _on_array_start: (count,tags,kind) =>
    @_fore kind
    if tags? and tags.length
      @options.output.write "#{t}(" for t in tags
    @options.output.write "["
    if count == -1
      @options.output.write "_ "

  # @nodoc
  _on_array_stop: (count,tags,kind) =>
    @options.output.write "]"
    if tags? and tags.length
      @options.output.write ")" for t in tags
    @_aft kind

  # @nodoc
  _on_map_start: (count,tags,kind) =>
    @_fore kind
    if tags? and tags.length
      @options.output.write "#{t}(" for t in tags
    @options.output.write "{"
    if count == -1
      @options.output.write "_ "

  # @nodoc
  _on_map_stop: (count,tags,kind) =>
    @options.output.write "}"
    if tags? and tags.length
      @options.output.write ")" for t in tags
    @_aft kind

  # @nodoc
  _on_stream_start: (mt,tags,kind) =>
    @_fore kind
    if tags? and tags.length
      @options.output.write "#{t}(" for t in tags
    @options.output.write "(_ "

  # @nodoc
  _on_stream_stop: (count,mt,tags,kind) =>
    @options.output.write ")"
    if tags? and tags.length
      @options.output.write ")" for t in tags
    @_aft kind

  # @nodoc
  _on_end: () =>
    @emit 'end'

  # @nodoc
  _write: (chunk, enc, next) ->
    @parser.write chunk, enc, next

