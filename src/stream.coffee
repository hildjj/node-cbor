BinaryParseStream = require 'binary-parse-stream'
Tagged = require './tagged'
Simple = require './simple'
BufferStream = require './BufferStream'
utils = require './utils'
long = require 'long'

# TODO: check node version, fail nicely

{MT, NUM_BYTES, SIMPLE} = require './constants'

SHIFT_32 = Math.pow(2, 32)
MAX_SAFE_HIGH = long.fromNumber(Number.MAX_SAFE_INTEGER).high

COUNT = Symbol('count')
PENDING_KEY = Symbol('pending_key')
PARENT = Symbol('parent')
BREAK = Symbol('break')
MAJOR = Symbol('major type')
NULL = Symbol('null')
NOTHING = Symbol('nothing')
ERROR = Symbol('error')

parseCBORint = (ai, buf) ->
  switch ai
    when NUM_BYTES.ONE then buf.readUInt8(0, true)
    when NUM_BYTES.TWO then buf.readUInt16BE(0, true)
    when NUM_BYTES.FOUR then buf.readUInt32BE(0, true)
    when NUM_BYTES.EIGHT
      f = buf.readUInt32BE(0)
      g = buf.readUInt32BE(4)
      # 2^53-1 maxint
      if f > MAX_SAFE_HIGH
        # alternately, we could throw an error.
        new long
          high: f
          low: g
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
  a[PARENT] = parent
  a[MAJOR]  = typ
  a

module.exports = class CborStream extends BinaryParseStream
  @PARENT: PARENT
  @NULL: NULL

  @nullcheck: (val) ->
    if val == NULL
      null
    else
      val

  @decodeFirst: (buf, encoding = 'utf-8', cb) ->
    # stop parsing after the first item  (SECURITY!)
    # error if there are bytes left over
    if typeof(encoding) == 'function'
      cb = encoding
      encoding = undefined

    c = new CborStream
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
    if typeof(encoding) == 'function'
      cb = encoding
      encoding = undefined

    c = new CborStream
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
    @running = true
    super options

  close: ->
    @running = false
    @__fresh = true

  _parse: ->
    parent = null
    while true
      octet = yield(-1)
      if !@running
        throw new Error "Unexpected data: 0x#{octet.toString(16)}"

      mt = octet >> 5
      ai = octet & 0x1f

      switch ai
        when NUM_BYTES.ONE
          ai = yield(-1)
        when NUM_BYTES.TWO, NUM_BYTES.FOUR, NUM_BYTES.EIGHT
          buf = yield(1 << (ai - 24))
          ai = if mt == MT.SIMPLE_FLOAT
            buf
          else
            parseCBORint(ai, buf)
        when 28, 29, 30
          @running = false
          throw new Error "Additional info not implemented: #{ai}"
        when NUM_BYTES.INDEFINITE
          ai = -1
        # else ai is already correct

      switch mt
        when MT.POS_INT then undefined # do nothing
        when MT.NEG_INT
          if long.isLong(ai) or (ai == Number.MAX_SAFE_INTEGER)
            ai = long.NEG_ONE.subtract ai
          else
            ai = -1 - ai
        when MT.BYTE_STRING
          switch ai
            when 0 then ai = new Buffer(0)
            when -1
              b = new BufferStream
              b[MAJOR] = mt
              b[PARENT] = parent
              parent = b
              continue
            else
              ai = yield(ai)
        when MT.UTF8_STRING
          switch ai
            when 0 then ai = ''
            when -1
              b = new BufferStream
              b[MAJOR] = mt
              b[PARENT] = parent
              parent = b
              continue
            else
              ai = (yield(ai)).toString 'utf-8'
        when MT.ARRAY, MT.MAP
          if ai == 0
            ai = if (mt == MT.MAP) then {} else []
            ai[PARENT] = parent
          else
            # 1 for Array, 2 for Map
            parent = parentArray parent, mt, ai * (mt - 3)
            continue
        when MT.TAG
          parent = parentArray parent, mt, 1
          parent.push ai
          continue
        when MT.SIMPLE_FLOAT
          if typeof(ai) == 'number' # simple values
            ai = switch ai
              when SIMPLE.FALSE then false
              when SIMPLE.TRUE then true
              when SIMPLE.NULL
                if parent?
                  null
                else
                  NULL # HACK
              when SIMPLE.UNDEFINED then undefined
              when -1
                if !parent?
                  @running = false
                  throw new Error 'Invalid BREAK'
                parent[COUNT] = 1
                BREAK
              else new Simple(ai)
          else
            ai = parseCBORfloat ai

      again = false
      while parent?
        switch
          when ai == BREAK
            undefined # no action
          when Array.isArray(parent)
            parent.push ai
          when parent instanceof BufferStream
            pm = parent[MAJOR]
            if pm? and (pm != mt)
              @running = false
              throw new Error 'Invalid major type in indefinite encoding'
            parent.write ai
          else
            @running = false
            throw new Error 'Unknown parent type'

        if (--parent[COUNT]) != 0
          again = true
          break

        delete parent[COUNT]
        ai = switch
          when Array.isArray parent
            switch parent[MAJOR]
              when MT.ARRAY
                parent
              when MT.MAP
                allstrings = true
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

        parent = parent[PARENT]
      if !again
        return ai
