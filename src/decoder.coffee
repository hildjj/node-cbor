BinaryParseStream = require '../vendor/binary-parse-stream'
Tagged = require './tagged'
Simple = require './simple'
BufferStream = require './BufferStream'
utils = require './utils'
bignumber = require 'bignumber.js'

# TODO: check node version, fail nicely

{MT, NUMBYTES, SIMPLE, SYMS} = require './constants'

SHIFT_32 = new bignumber(2).pow(32)
NEG_ONE = new bignumber(-1)
MAX_SAFE_BIG = new bignumber(Number.MAX_SAFE_INTEGER.toString(16), 16)
MAX_SAFE_HIGH = 0x1fffff

COUNT = Symbol('count')
PENDING_KEY = Symbol('pending_key')
MAJOR = Symbol('major type')
NOTHING = Symbol('nothing')
ERROR = Symbol('error')

parseCBORint = (ai, buf) ->
  switch ai
    when NUMBYTES.ONE then buf.readUInt8(0, true)
    when NUMBYTES.TWO then buf.readUInt16BE(0, true)
    when NUMBYTES.FOUR then buf.readUInt32BE(0, true)
    when NUMBYTES.EIGHT
      f = buf.readUInt32BE(0)
      g = buf.readUInt32BE(4)
      # 2^53-1 maxint
      if f > MAX_SAFE_HIGH
        # alternately, we could throw an error.
        new bignumber(f).times(SHIFT_32).plus(g)
      else
        (f * SHIFT_32) + g
    else
      throw new Error "Invalid additional info for int: #{ai}"

parseCBORfloat = (buf) ->
  switch buf.length
    when 2 then utils.parseHalf buf
    when 4 then buf.readFloatBE 0, true
    when 8 then buf.readDoubleBE 0, true
    else
      throw new Error "Invalid float size: #{buf.length}"

parentArray = (parent, typ, count) ->
  a         = []
  a[COUNT]  = count
  a[SYMS.PARENT] = parent
  a[MAJOR]  = typ
  a

parentBufferStream = (parent, typ) ->
  b = new BufferStream
  b[SYMS.PARENT] = parent
  b[MAJOR] = typ
  b

module.exports = class CborStream extends BinaryParseStream
  @nullcheck: (val) ->
    switch val
      when SYMS.NULL then null
      when SYMS.UNDEFINED then undefined
      else val

  @decodeFirst: (buf, encoding = 'utf-8', cb) ->
    # stop parsing after the first item  (SECURITY!)
    # error if there are bytes left over
    opts = {}
    switch typeof(encoding)
      when 'function'
        cb = encoding
        encoding = undefined
      when 'object'
        opts = encoding
        encoding = opts.encoding
        delete opts.encoding

    c = new CborStream opts
    p = undefined
    v = NOTHING
    c.on 'data', (val) ->
      v = CborStream.nullcheck val
      c.close()
    if typeof(cb) == 'function'
      c.once 'error', (er) ->
        unless v == ERROR
          v = ERROR
          c.close()
          cb er
      c.once 'end', ->
        switch v
          when NOTHING
            cb new Error 'No CBOR found'
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
            when NOTHING
              reject new Error 'No CBOR found'
            when ERROR
              undefined
            else
              resolve v

    c.end buf, encoding
    p

  @decodeAll: (buf, encoding = 'utf-8', cb) ->
    opts = {}
    switch typeof(encoding)
      when 'function'
        cb = encoding
        encoding = undefined
      when 'object'
        opts = encoding
        encoding = opts.encoding
        delete opts.encoding

    c = new CborStream opts
    p = undefined
    if typeof(cb) == 'function'
      c.on 'data', (val) ->
        cb null, CborStream.nullcheck(val)
      c.on 'error', (er) ->
        cb er
    else
      p = new Promise (resolve, reject) ->
        vals = []
        c.on 'data', (val) ->
          vals.push CborStream.nullcheck(val)
        c.on 'error', (er) ->
          reject er
        c.on 'end', ->
          resolve vals

    c.end buf, encoding
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
            parseCBORint(ai, buf)
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
            val = MAX_SAFE_BIG
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
            val = parseCBORfloat val

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
          else
            @running = false
            throw new Error 'Unknown parent type'

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
              else
                throw new Error 'Invalid state'

          when parent instanceof BufferStream
            switch parent[MAJOR]
              when MT.BYTE_STRING
                parent.flatten()
              when MT.UTF8_STRING
                parent.toString('utf-8')
              else
                @running = false
                throw new Error 'Invalid stream major type'
          else
            # can this still happen
            throw new Error 'Invalid state'
            parent

        parent = parent[SYMS.PARENT]
      if !again
        # remove this check later
        if depth != 0
          throw new Error 'Depth problem'
        return val
