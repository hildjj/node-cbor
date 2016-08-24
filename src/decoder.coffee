BinaryParseStream = require '../vendor/binary-parse-stream'
Tagged = require './tagged'
Simple = require './simple'
utils = require './utils'
bignumber = require 'bignumber.js'
NoFilter = require 'nofilter'

{MT, NUMBYTES, SIMPLE, SYMS} = require './constants'

NEG_ONE = new bignumber(-1)
NEG_MAX = NEG_ONE.sub(new bignumber(Number.MAX_SAFE_INTEGER.toString(16), 16))

COUNT = Symbol('count')
PENDING_KEY = Symbol('pending_key')
MAJOR = Symbol('major type')
ERROR = Symbol('error')
NOT_FOUND = Symbol('not found')

# @nodoc
parentArray = (parent, typ, count) ->
  a              = []
  a[COUNT]       = count
  a[SYMS.PARENT] = parent
  a[MAJOR]       = typ
  a

# @nodoc
parentBufferStream = (parent, typ) ->
  b = new NoFilter
  b[SYMS.PARENT] = parent
  b[MAJOR]       = typ
  b

# Decode a stream of CBOR bytes by transforming them into equivalent
# JavaScript data.  Because of the limitations of Node object streams,
# special symbols are emitted instead of NULL or UNDEFINED.  Fix those
# up by calling {Decoder.nullcheck}.
#
# @event 'data'  (object) A complete top-level CBOR item has been parsed
# @event 'end'   The input stream is fully parsed
# @event 'error' (Error) An error has occurred in parsing
#
# Several other internal events are emitted, but I hope you never need to
# care about them.
#
module.exports = class Decoder extends BinaryParseStream
  # A symbol returned from {Decoder.decodeFirst} when no object was found.
  @NOT_FOUND = NOT_FOUND

  # Check the given value for a symbol encoding a NULL or UNDEFINED
  # value in the CBOR stream.
  #
  # @param value [Any] the value to check
  #
  # @example
  #   myDecoder.on('data', function(val) {
  #     val = Decoder.nullcheck(val);
  #     ...
  #   });
  @nullcheck: (val) ->
    switch val
      when SYMS.NULL then null
      when SYMS.UNDEFINED then undefined
      else val

  # Decode the first CBOR item in the input, synchronously.  This will throw an
  # exception if the input is not valid CBOR.
  #
  # @param input [String, Buffer] the input to parse
  # @param options [Object, String] options Decoding options.
  #   If string, the input encoding.
  # @option options encoding [String] the input encoding, when the input is
  #   a string.
  # @option options tags [Object] mapping from tag number to function(v), where
  #   v is the decoded value that comes after the tag, and where the function
  #   returns the correctly-created value for that tag.
  # @option options max_depth [Number] the maximum depth to parse.  -1 (the
  #   default) for "until you run out of memory".  Set this to a finite positive
  #   number for un-trusted inputs.  Most standard inputs won't nest more than
  #   100 or so levels; I've tested into the millions before running out of
  #   memory.
  # @return [anything] The parsed value
  @decodeFirstSync: (input, options = {encoding: 'hex'}) ->
    opts = {}
    encod = undefined
    switch typeof(options)
      when 'string'
        encod = options
      when 'object'
        opts = utils.extend({}, options)
        encod = opts.encoding
        delete opts.encoding

    c = new Decoder opts
    s = new NoFilter input, (encod ? utils.guessEncoding(input))
    parser = c._parse()
    state = parser.next()
    while !state.done
      b = s.read state.value
      if !b? or (b.length != state.value)
        throw new Error 'Insufficient data'
      state = parser.next b
    Decoder.nullcheck state.value

  # Decode all of the CBOR items in the input.  This will throw an exception
  # if the input is not valid CBOR; a zero-length input will return an empty
  # array.
  #
  # @param input [String, Buffer] the input to parse
  # @param options [Object, String] options Decoding options.
  #   If string, the input encoding.
  # @option options encoding [String] the input encoding, when the input is
  #   a string.
  # @option options tags [Object] mapping from tag number to function(v), where
  #   v is the decoded value that comes after the tag, and where the function
  #   returns the correctly-created value for that tag.
  # @option options max_depth [Number] the maximum depth to parse.  -1 (the
  #   default) for "until you run out of memory".  Set this to a finite positive
  #   number for un-trusted inputs.  Most standard inputs won't nest more than
  #   100 or so levels; I've tested into the millions before running out of
  #   memory.
  # @return [anything] An array of the parsed values.
  @decodeAllSync: (input, options = {encoding: 'hex'}) ->
    opts = {}
    encod = undefined
    switch typeof(options)
      when 'string'
        encod = options
      when 'object'
        opts = utils.extend({}, options)
        encod = opts.encoding
        delete opts.encoding

    c = new Decoder
    s = new NoFilter input, (encod ? utils.guessEncoding(input))
    res = []
    while s.length > 0
      parser = c._parse()
      state = parser.next()
      while !state.done
        b = s.read state.value
        if !b? or (b.length != state.value)
          throw new Error 'Insufficient data'
        state = parser.next b
      res.push Decoder.nullcheck(state.value)
    res

  # Decode the first CBOR item in the input.  This will error if there are more
  # bytes left over at the end, and optionally if there were no valid
  # CBOR bytes in the input.  Emits the {Decoder.NOT_FOUND} Symbol in the
  # callback if no data was found and the `required` option is false.
  #
  # @param input [String, Buffer] the input to parse
  # @param options [Object, String] options Decoding options.
  #   If string, the input encoding.
  # @option options encoding [String] the input encoding, when the input is
  #   a string.
  # @option options required [Boolean] give an error if no valid CBOR is
  #   found in the inoput.
  # @option options tags [Object] mapping from tag number to function(v), where
  #   v is the decoded value that comes after the tag, and where the function
  #   returns the correctly-created value for that tag.
  # @option options max_depth [Number] the maximum depth to parse.  -1 (the
  #   default) for "until you run out of memory".  Set this to a finite positive
  #   number for un-trusted inputs.  Most standard inputs won't nest more than
  #   100 or so levels; I've tested into the millions before running out of
  #   memory.
  # @param cb [Function] an (error, value) callback.
  # @return [undefined, Promise] If cb not specified, returns a Promise
  #   fulfilled with the first parsed value.
  @decodeFirst: (input, options = {encoding: 'hex'}, cb) ->
    opts = {}
    required = false
    encod = undefined
    switch typeof(options)
      when 'function'
        cb = options
        encod = utils.guessEncoding(input)
      when 'string'
        encod = options
      when 'object'
        opts = utils.extend({}, options)
        encod = opts.encoding ? utils.guessEncoding(input)
        delete opts.encoding
        required = opts.required ? false
        delete opts.required

    c = new Decoder opts
    p = undefined
    v = NOT_FOUND
    c.on 'data', (val) ->
      v = Decoder.nullcheck val
      c.close()
    if typeof(cb) == 'function'
      c.once 'error', (er) ->
        # don't think this can fire callback multiple times
        u = v
        v = ERROR
        c.close()
        cb er, u
      c.once 'end', ->
        switch v
          when NOT_FOUND
            return if required
              cb new Error 'No CBOR found'
            else
              cb null, v
          when ERROR
            undefined
          else
            cb null, v
    else
      p = new Promise (resolve, reject) ->
        c.once 'error', (er) ->
          v = ERROR
          c.close()
          reject er
        c.once 'end', ->
          switch v
            when NOT_FOUND
              return if required
                reject new Error 'No CBOR found'
              else
                resolve v
            when ERROR
              undefined
            else
              resolve v

    c.end input, encod
    p

  # Decode all of the CBOR items in the input.  This will error if there are
  # more bytes left over at the end.
  #
  # @param input [String, Buffer] the input to parse
  # @param options [Object, String] options Decoding options.
  #   If string, the input encoding.
  # @option options encoding [String] the input encoding, when the input is
  #   a string.
  # @option options tags [Object] mapping from tag number to function(v), where
  #   v is the decoded value that comes after the tag, and where the function
  #   returns the correctly-created value for that tag.
  # @option options max_depth [Number] the maximum depth to parse.  -1 (the
  #   default) for "until you run out of memory".  Set this to a finite positive
  #   number for un-trusted inputs.  Most standard inputs won't nest more than
  #   100 or so levels; I've tested into the millions before running out of
  #   memory.
  # @param cb [Function] an (error, [values]) callback.
  # @return [undefined, Promise] If cb not specified, returns a Promise
  #   fulfilled with an array of the parsed values.
  @decodeAll: (input, options = {encoding: 'hex'}, cb) ->
    opts = {}
    encod = undefined
    switch typeof(options)
      when 'function'
        cb = options
        encod = utils.guessEncoding(input)
      when 'string'
        encod = options
      when 'object'
        opts = utils.extend({}, options)
        encod = opts.encoding ? utils.guessEncoding(input)
        delete opts.encoding

    c = new Decoder opts
    p = undefined
    vals = []
    c.on 'data', (val) ->
      vals.push Decoder.nullcheck(val)

    if typeof(cb) == 'function'
      c.on 'error', (er) ->
        cb er
      c.on 'end', ->
        cb null, vals
    else
      p = new Promise (resolve, reject) ->
        c.on 'error', (er) ->
          reject er
        c.on 'end', ->
          resolve vals

    c.end input, encod
    p

  # Create a parsing stream.
  #
  # @param options [Object, String] options Decoding options.
  # @option options tags [Object] mapping from tag number to function(v), where
  #   v is the decoded value that comes after the tag, and where the function
  #   returns the correctly-created value for that tag.
  # @option options max_depth [Number] the maximum depth to parse.  -1 (the
  #   default) for "until you run out of memory".  Set this to a finite positive
  #   number for un-trusted inputs.  Most standard inputs won't nest more than
  #   100 or so levels; I've tested into the millions before running out of
  #   memory.
  constructor: (options) ->
    @tags = options?.tags
    delete options?.tags
    @max_depth = options?.max_depth || -1
    delete options?.max_depth
    @running = true
    super options

  # @nodoc
  close: ->
    @running = false
    @__fresh = true

  # @nodoc
  _parse: ->
    parent = null
    depth = 0
    val = null
    while true
      if (@max_depth >= 0) and (depth > @max_depth)
        throw new Error "Maximum depth #{@max_depth} exceeded"

      octet = (yield(1))[0]
      if !@running
        throw new Error "Unexpected data: 0x#{octet.toString(16)}"

      mt = octet >> 5
      ai = octet & 0x1f

      switch ai
        when NUMBYTES.ONE
          @emit 'more-bytes', mt, 1, parent?[MAJOR], parent?.length
          val = (yield(1))[0]
        when NUMBYTES.TWO, NUMBYTES.FOUR, NUMBYTES.EIGHT
          numbytes = 1 << (ai - 24)
          @emit 'more-bytes', mt, numbytes, parent?[MAJOR], parent?.length
          buf = yield(numbytes)
          val = if mt == MT.SIMPLE_FLOAT
            buf
          else
            utils.parseCBORint(ai, buf)
        when 28, 29, 30
          @running = false
          throw new Error "Additional info not implemented: #{ai}"
        when NUMBYTES.INDEFINITE
          val = -1
        else
          # ai is already correct
          val = ai

      switch mt
        when MT.POS_INT then undefined # do nothing
        when MT.NEG_INT
          if val == Number.MAX_SAFE_INTEGER
            val = NEG_MAX
          else if val instanceof bignumber
            val = NEG_ONE.sub val
          else
            val = -1 - val
        when MT.BYTE_STRING, MT.UTF8_STRING
          switch val
            when 0
              val = if (mt == MT.BYTE_STRING) then new Buffer(0) else ''
            when -1
              @emit 'start', mt, SYMS.STREAM, parent?[MAJOR], parent?.length
              parent = parentBufferStream parent, mt
              depth++
              continue
            else
              @emit 'start-string', mt, val, parent?[MAJOR], parent?.length
              val = yield(val)
              if mt == MT.UTF8_STRING
                val = val.toString 'utf-8'
        when MT.ARRAY, MT.MAP
          switch val
            when 0
              val = if (mt == MT.MAP) then {} else []
              val[SYMS.PARENT] = parent
            when -1
              # streaming
              @emit 'start', mt, SYMS.STREAM, parent?[MAJOR], parent?.length
              parent = parentArray parent, mt, -1
              depth++
              continue
            else
              @emit 'start', mt, val, parent?[MAJOR], parent?.length
              # 1 for Array, 2 for Map
              parent = parentArray parent, mt, val * (mt - 3)
              depth++
              continue
        when MT.TAG
          @emit 'start', mt, val, parent?[MAJOR], parent?.length
          parent = parentArray parent, mt, 1
          parent.push val
          depth++
          continue
        when MT.SIMPLE_FLOAT
          if typeof(val) == 'number' # simple values
            val = Simple.decode(val, parent?)
          else
            val = utils.parseCBORfloat val

      @emit 'value', val, parent?[MAJOR], parent?.length, ai
      again = false
      while parent?
        switch
          when val == SYMS.BREAK
            parent[COUNT] = 1
          when Array.isArray(parent)
            parent.push val
          when parent instanceof NoFilter
            pm = parent[MAJOR]
            if pm? and (pm != mt)
              @running = false
              throw new Error 'Invalid major type in indefinite encoding'
            parent.write val
          # Not possible?
          # else
          #   @running = false
          #   throw new Error 'Unknown parent type'

        if (--parent[COUNT]) != 0
          again = true
          break

        --depth
        delete parent[COUNT]
        @emit 'stop', parent[MAJOR]
        val = switch
          when Array.isArray parent
            switch parent[MAJOR]
              when MT.ARRAY
                parent
              when MT.MAP
                allstrings = true
                if (parent.length % 2) != 0
                  throw new Error("Invalid map length: #{parent.length}")
                for i in [0...parent.length] by 2
                  if typeof(parent[i]) != 'string'
                    allstrings = false
                    break
                if allstrings
                  a = {}
                  for i in [0...parent.length] by 2
                    a[parent[i]] = parent[i + 1]
                  a
                else
                  a = new Map
                  for i in [0...parent.length] by 2
                    a.set parent[i], parent[i + 1]
                  a
              when MT.TAG
                t = new Tagged parent[0], parent[1]
                t.convert @tags
              # Not possible
              # else
              #   throw new Error 'Invalid state'

          when parent instanceof NoFilter
            switch parent[MAJOR]
              when MT.BYTE_STRING
                parent.slice()
              when MT.UTF8_STRING
                parent.toString('utf-8')
              # Not possible
              # else
              #   @running = false
              #   throw new Error 'Invalid stream major type'
          # Not possible
          # else
          #   throw new Error 'Invalid state'
          #   parent

        parent = parent[SYMS.PARENT]
      if !again
        return val
