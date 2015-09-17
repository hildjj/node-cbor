BinaryParseStream = require 'binary-parse-stream'
Tagged = require './tagged'
Simple = require './simple'
BufferStream = require './BufferStream'
utils = require './utils'

# TODO: check node version, fail nicely

MT_UNSIGNED = 0 << 5
MT_NEGATIVE = 1 << 5
MT_BYTES    = 2 << 5
MT_TEXT     = 3 << 5
MT_ARRAY    = 4 << 5
MT_MAP      = 5 << 5
MT_TAG      = 6 << 5
MT_PRIM     = 7 << 5

AI_1     = 24
AI_2     = 25
AI_4     = 26
AI_8     = 27
AI_INDEF = 31

VAL_FALSE = 20
VAL_TRUE  = 21
VAL_NIL   = 22
VAL_UNDEF = 23

SHIFT32 = Math.pow(2,32)

COUNT = Symbol('count')
PENDING_KEY = Symbol('pending_key')
PARENT = Symbol('parent')
BREAK = Symbol('break')
MAJOR = Symbol('major type')

parseCBORint = (ai, buf) ->
  switch ai
    when AI_1 then return buf.readUInt8(0, true)
    when AI_2 then return buf.readUInt16BE(0, true)
    when AI_4 then return buf.readUInt32BE(0, true)
    when AI_8
      f = buf.readUInt32BE(0)
      g = buf.readUInt32BE(4)
      # if f > something, return bigint
      return (f * SHIFT32) + g;
    else
      throw new Error "Invalid additional info for int: #{ai}"

parseCBORfloat = (buf) ->
  switch buf.length
    when 2 then utils.parseHalf buf
    when 4 then buf.readFloatBE(0, true)
    when 8 then buf.readDoubleBE(0, true)
    else
      throw new Error "Invalid float size: #{buf.length}"

class CborStream extends BinaryParseStream
  @PARENT = PARENT

  _parse: ->
    parent = null
    while true
      octet = yield(-1)
      mt = octet & 0xe0
      ai = octet & 0x1f

      switch ai
        when AI_1
          ai = yield(-1)
        when AI_2, AI_4, AI_8
          buf = yield(1 << (ai - 24))
          ai = if mt == MT_PRIM
            buf
          else
            parseCBORint(ai, buf)
        when 28, 29, 30
          throw new Error "Additional info not implemented: #{ai}"
        when AI_INDEF
          ai = -1
        # else ai is already correct

      switch mt
        when MT_UNSIGNED then undefined # do nothing
        when MT_NEGATIVE then ai = -1 - ai
        when MT_BYTES
          switch ai
            when 0 then ai = new Buffer
            when -1
              b = new BufferStream
              b[MAJOR] = mt
              b[PARENT] = parent
              parent = b
              continue
            else
              ai = yield(ai)
        when MT_TEXT
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
        when MT_ARRAY
          a = []
          a[PARENT] = parent
          if ai != 0
            a[COUNT] = ai
            parent = a
            continue
          ai = a
        when MT_MAP
          m = new Map()
          m[PARENT] = parent
          if ai != 0
            m[COUNT] = 2 * ai
            parent = m
            continue
          ai = m
        when MT_TAG
          t = new Tagged(ai)
          t[COUNT] = 1
          t[PARENT] = parent
          parent = t
          continue
        when MT_PRIM
          if typeof(ai) == 'number' # simple values
            ai = switch ai
              when VAL_FALSE then false
              when VAL_TRUE then true
              when VAL_NIL then null
              when VAL_UNDEF then undefined
              when -1
                if !parent?
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
          when parent instanceof Map
            key = parent[PENDING_KEY]
            if key?
              parent.set key, ai
              delete parent[PENDING_KEY]
            else
              parent[PENDING_KEY] = ai
          when parent instanceof Tagged
            parent.value = ai
          when parent instanceof BufferStream
            pm = parent[MAJOR]
            if pm? and (pm != mt)
              throw new Error 'Invalid major type in indefinite encoding'
            parent.write ai
          else
            throw new Error 'Unknown parent type'

        if (--parent[COUNT]) != 0
          again = true
          break

        if parent instanceof BufferStream
          switch parent[MAJOR]
            when MT_BYTES
              parent = parent.flatten()
            when MT_TEXT
              parent = parent.toString('utf-8')
            else
              throw new Error 'Invalid stream major type'
        delete parent[COUNT]
        ai = parent
        parent = parent[PARENT]
      if !again
        return ai

module.exports = CborStream

p = new CborStream
p.on 'data', console.log
process.stdin.pipe p
