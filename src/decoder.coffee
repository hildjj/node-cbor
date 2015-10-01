BinaryParseStream = require '../vendor/binary-parse-stream'
Tagged = require './tagged'
Simple = require './simple'
BufferStream = require './BufferStream'
utils = require './utils'
bignumber = require 'bignumber.js'

{MT, NUMBYTES, SIMPLE, SYMS} = require './constants'

NEG_ONE = new bignumber(-1)
NEG_MAX = NEG_ONE.sub(new bignumber(Number.MAX_SAFE_INTEGER.toString(16), 16))

COUNT = Symbol('count')
PENDING_KEY = Symbol('pending_key')
MAJOR = Symbol('major type')
ERROR = Symbol('error')
NOT_FOUND = Symbol('not found')

parentArray = (parent, typ, count) ->
  a              = []
  a[COUNT]       = count
  a[SYMS.PARENT] = parent
  a[MAJOR]       = typ
  a

parentBufferStream = (parent, typ) ->
  b = new BufferStream
  b[SYMS.PARENT] = parent
  b[MAJOR]       = typ
  b

module.exports = class CborStream extends BinaryParseStream
  @NOT_FOUND = NOT_FOUND

  @nullcheck: (val) ->
    switch val
      when SYMS.NULL then null
      when SYMS.UNDEFINED then undefined
      else val

  @decodeFirst: (input, encoding = 'hex', cb) ->
    # stop parsing after the first item  (SECURITY!)
    # error if there are bytes left over
    opts = {}
    required = false
    switch typeof(encoding)
      when 'function'
        cb = encoding
        encoding = utils.guessEncoding(input)
      when 'object'
        opts = encoding
        encoding = opts.encoding ? utils.guessEncoding(input)
        delete opts.encoding
        required = opts.required ? false
        delete opts.required

    c = new CborStream opts
    p = undefined
    v = NOT_FOUND
    c.on 'data', (val) ->
      v = CborStream.nullcheck val
      c.close()
    if typeof(cb) == 'function'
      c.once 'error', (er) ->
        # don't think this can fire callback multiple times
        v = ERROR
        c.close()
        cb er
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

    c.end input, encoding
    p

  @decodeAll: (input, encoding = 'hex', cb) ->
    opts = {}
    switch typeof(encoding)
      when 'function'
        cb = encoding
        encoding = utils.guessEncoding(input)
      when 'object'
        opts = encoding
        encoding = opts.encoding ? utils.guessEncoding(input)
        delete opts.encoding

    c = new CborStream opts
    p = undefined
    vals = []
    c.on 'data', (val) ->
      vals.push CborStream.nullcheck(val)

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

    c.end input, encoding
    p

  constructor: (options) ->
    @tags = options?.tags
    delete options?.tags
    @max_depth = options?.max_depth || -1
    delete options?.max_depth
    @running = true
    super options

  close: ->
    @running = false
    @__fresh = true

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
          when parent instanceof BufferStream
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

          when parent instanceof BufferStream
            switch parent[MAJOR]
              when MT.BYTE_STRING
                parent.flatten()
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
