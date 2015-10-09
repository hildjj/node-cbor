# jslint node: true

assert = require 'assert'
stream = require 'stream'
util = require 'util'

utils = require './utils'
Simple = require './simple'
Decoder = require './decoder'
{MT, NUMBYTES, SYMS} = require './constants'
bignumber = require 'bignumber.js'
NoFilter = require 'nofilter'

# @nodoc
plural = (c) ->
  if c > 1 then 's'
  else ''

# Generate the expanded format of RFC 7049, section 2.2.1
module.exports = class Commented extends stream.Transform

  # Create a CBOR commenter.
  # @param options [Object] options for the parser
  # @option options max_depth [Integer] how many times to indent the dashes
  #   (default: 10)
  constructor: (options = {}) ->
    options.readableObjectMode = false
    options.writableObjectMode = false

    @max_depth = options.max_depth ? 10
    delete options.max_depth

    super(options)
    @depth = 1
    @all = new NoFilter

    @parser = new Decoder options
    @parser.on 'value', @_on_value
    @parser.on 'start', @_on_start
    @parser.on 'start-string', @_on_start_string
    @parser.on 'stop',  @_on_stop
    @parser.on 'more-bytes', @_on_more
    @parser.on 'error', @_on_error
    @parser.on 'data', @_on_data
    @parser.bs.on 'read', @_on_read

  # @nodoc
  _transform: (fresh, encoding, cb) ->
    @parser.write fresh, encoding, (er) ->
      cb er

  # @nodoc
  _flush: (cb) ->
    @parser._flush cb

  # Comment on an input Buffer or string, creating a string passed to the
  # callback.  If callback not specified,  output goes to stdout.
  # @param input [Buffer,String,NoFilter] input
  # @param max_depth [Integer] how many times to indent the dashes
  #   (default: 10)
  # @param cb [function(Error, String)] optional.
  @comment: (input, options, cb) ->
    if !input?
      throw new Error 'input required'

    encoding = if typeof(input) == 'string' then 'hex' else undefined
    max_depth = 10
    switch typeof(options)
      when 'function'
        cb = options
      when 'string'
        encoding = options
      when 'number'
        max_depth = options
      when 'object'
        encoding = options.encoding ? encoding
        max_depth = options.max_depth ? max_depth

    bs = new NoFilter
    d = new Commented
      max_depth: max_depth
    p = null

    if typeof(cb) == 'function'
      d.on 'end', ->
        cb(null, bs.toString('utf8'))
      d.on 'error', cb
    else
      p = new Promise (resolve, reject) ->
        d.on 'end', ->
          resolve bs.toString('utf8')
        d.on 'error', reject
    d.pipe bs
    d.end input, encoding
    p

  # @nodoc
  _on_error: (er) =>
    @push 'ERROR: '
    @push er.toString()
    @push '\n'

  # @nodoc
  _on_read: (buf) =>
    @all.write buf
    hex = buf.toString('hex')
    @push(new Array(@depth + 1).join('  '))
    @push hex
    ind = (@max_depth - @depth) * 2
    ind -= hex.length
    if ind < 1
      ind = 1
    @push(new Array(ind + 1).join(' '))
    @push '-- '

  # @nodoc
  _on_more: (mt, len, parent_mt, pos) =>
    @depth++
    @push switch mt
      when MT.POS_INT
        'Positive number,'
      when MT.NEG_INT
        'Negative number,'
      when MT.ARRAY
        'Array, length'
      when MT.MAP
        'Map, count'
      when MT.BYTE_STRING
        'Bytes, length'
      when MT.UTF8_STRING
        'String, length'
      when MT.SIMPLE_FLOAT
        if len == 1 then 'Simple value,'
        else 'Float,'

    @push " next #{len} byte#{plural(len)}\n"

  # @nodoc
  _on_start_string: (mt, tag, parent_mt, pos) =>
    @depth++
    @push switch mt
      when MT.BYTE_STRING
        "Bytes, length: #{tag}"
      when MT.UTF8_STRING
        "String, length: #{tag.toString()}"
    @push '\n'

  # @nodoc
  _on_start: (mt, tag, parent_mt, pos) =>
    @depth++
    if tag != SYMS.BREAK
      @push switch parent_mt
        when MT.ARRAY
          "[#{pos}], "
        when MT.MAP
          if pos % 2 then "{Val:#{pos // 2}}, "
          else "{Key:#{pos // 2}}, "
    @push switch mt
      when MT.TAG then "Tag ##{tag}"
      when MT.ARRAY
        if tag == SYMS.STREAM then 'Array (streaming)'
        else "Array, #{tag} item#{plural(tag)}"
      when MT.MAP
        if tag == SYMS.STREAM then 'Map (streaming)'
        else "Map, #{tag} pair#{plural(tag)}"
      when MT.BYTE_STRING
        'Bytes (streaming)'
      when MT.UTF8_STRING
        'String (streaming)'
    @push '\n'

  # @nodoc
  _on_stop: (mt) =>
    @depth--

  # @nodoc
  _on_value: (val, parent_mt, pos, ai) =>
    if val != SYMS.BREAK
      @push switch parent_mt
        when MT.ARRAY
          "[#{pos}], "
        when MT.MAP
          if pos % 2 then "{Val:#{pos // 2}}, "
          else "{Key:#{pos // 2}}, "

    @push switch
      when val == SYMS.BREAK then 'BREAK'
      when val == SYMS.NULL then  'null'
      when val == SYMS.UNDEFINED then 'undefined'
      when typeof(val) == 'string'
        @depth--
        JSON.stringify val
      when Buffer.isBuffer val
        @depth--
        val.toString('hex')
      when val instanceof bignumber
        val.toString()
      else
        util.inspect(val)
    switch ai
      when NUMBYTES.ONE, NUMBYTES.TWO, NUMBYTES.FOUR, NUMBYTES.EIGHT
        @depth--
    @push '\n'

  # @nodoc
  _on_data: =>
    @push '0x'
    @push @all.read().toString('hex')
    @push '\n'
