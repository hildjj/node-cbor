stream = require 'stream'
url = require 'url'
bignumber =  require 'bignumber.js'

BufferStream = require '../lib/BufferStream'
Tagged = require '../lib/tagged'
Simple = require '../lib/simple'

constants = require './constants'

# TODO: replace these with constants and add unit tests to verify
MT = constants.MT
NUM_BYTES = constants.NUM_BYTES
TAG = constants.TAG
SHIFT32 = Math.pow 2, 32
DOUBLE = (MT.SIMPLE_FLOAT<<5)|NUM_BYTES.EIGHT
TRUE = (MT.SIMPLE_FLOAT<<5)|constants.SIMPLE.TRUE
FALSE = (MT.SIMPLE_FLOAT<<5)|constants.SIMPLE.FALSE
UNDEFINED = (MT.SIMPLE_FLOAT<<5)|constants.SIMPLE.UNDEFINED
NULL = (MT.SIMPLE_FLOAT<<5)|constants.SIMPLE.NULL

class Generator extends stream.Readable
  constructor: (options)->
    super options

    @bs = new BufferStream options
    @semanticTypes = [
      Array, @_packArray
      Date, @_packDate
      Buffer, @_packBuffer
      RegExp, @_packRegexp
      url.Url, @_packUrl
      bignumber, @_packBigNumber
    ]

    addTypes = options?.genTypes ? []
    for typ,i in addTypes by 2
      @addSemanticType typ, addTypes[i+1]

  addSemanticType: (type, fun) ->
    for typ,i in @semanticTypes by 2
      if typ == type
        [old, @semanticTypes[i+1]] = [@semanticTypes[i+1], fun]
        return old

    @semanticTypes.push type, fun
    null

  _read: (size)->
    x = @bs.read()
    if x.length
      @push x

  _packNaN: ()->
    @bs.write 'f97e00', 'hex' # Half-NaN

  _packInfinity: (obj)->
    half = if obj < 0 then 'f9fc00' else 'f97c00'
    @bs.write half, 'hex'

  _packFloat: (obj)->
    # TODO: see if we can write smaller ones.
    @bs.writeUInt8 DOUBLE
    @bs.writeDoubleBE obj

  _packInt: (obj,mt)->
    mt = mt << 5
    switch
      when obj < 24 then @bs.writeUInt8 mt|obj
      when obj <= 0xff
        @bs.writeUInt8 mt|NUM_BYTES.ONE
        @bs.writeUInt8 obj
      when obj <= 0xffff
        @bs.writeUInt8 mt|NUM_BYTES.TWO
        @bs.writeUInt16BE obj
      when obj <= 0xffffffff
        @bs.writeUInt8 mt|NUM_BYTES.FOUR
        @bs.writeUInt32BE obj
      when obj < 0x20000000000000
        @bs.writeUInt8 mt|NUM_BYTES.EIGHT
        @bs.writeUInt32BE Math.floor(obj / SHIFT32)
        @bs.writeUInt32BE (obj % SHIFT32)
      else
        @_packFloat obj

  _packNumber: (obj)->
    switch
      when isNaN(obj) then @_packNaN obj
      when !isFinite(obj) then @_packInfinity obj
      when Math.round(obj) == obj #int
        if obj<0
          @_packInt -obj-1, MT.NEG_INT
        else
          @_packInt obj, MT.POS_INT
      else
        @_packFloat obj

  _packString: (obj)->
    len = Buffer.byteLength obj, 'utf8'
    @_packInt len, MT.UTF8_STRING
    @bs.writeString obj, len, 'utf8'

  _packBoolean: (obj)->
    @bs.writeUInt8 if obj then TRUE else FALSE

  _packUndefined: (obj)->
    @bs.writeUInt8 UNDEFINED

  _packArray: (gen, obj)->
    len = obj.length
    @_packInt len, MT.ARRAY
    for x in obj
      @_pack x

  _packTag: (tag)->
    @_packInt tag, MT.TAG

  _packDate: (gen, obj)->
    @_packTag TAG.DATE_EPOCH
    @_pack obj / 1000

  _packBuffer: (gen, obj)->
    @_packInt obj.length, MT.BYTE_STRING
    @bs.append obj

  _packRegexp: (gen, obj)->
    @_packTag TAG.REGEXP
    @_pack obj.source

  _packUrl: (gen, obj)->
    @_packTag TAG.URI
    @_pack obj.format()

  _packBigint: (obj)->
    if obj.isNegative()
      obj = obj.negated().minus(1)
      tag = TAG.NEG_BIGINT
    else
      tag = TAG.POS_BIGINT
    str = obj.toString(16)
    if str.length % 2
      str = '0'+str
    buf = new Buffer str, 'hex'
    @_packTag tag
    @_packBuffer this, buf, @bs

  _packBigNumber: (gen, obj)->
    if obj.isNaN()
      return @_packNaN()
    unless obj.isFinite()
      return @_packInfinity if obj.isNegative() then -Infinity else Infinity

    # if integer, just write a bigint.
    if obj.c.length < (obj.e + 2)
      return @_packBigint obj

    @_packTag TAG.DECIMAL_FRAC
    @_packInt 2, MT.ARRAY

    slide = new bignumber obj
    @_packInt slide.e, MT.POS_INT
    slide.e = slide.c.length - 1
    @_packBigint slide

  _packObject: (obj)->
    unless obj then return @bs.writeUInt8 NULL
    for typ,i in @semanticTypes by 2
      if obj instanceof typ
        return @semanticTypes[i+1].call(this, this, obj)

    f = obj.generateCBOR
    if typeof f == 'function'
      return f.call(obj, this)

    keys = Object.keys obj
    len = keys.length
    @_packInt len, MT.MAP
    for k in keys
      @_pack k
      @_pack obj[k]

  _pack: (obj)->
    switch typeof(obj)
      when 'number'    then @_packNumber obj
      when 'string'    then @_packString obj
      when 'boolean'   then @_packBoolean obj
      when 'undefined' then @_packUndefined obj
      when 'object'    then @_packObject obj
      else throw new Error('Unknown type: ' + typeof(obj));

  write: (objs...)->
    for o in objs
      @_pack o

  @generate: (objs...)->
    g = new Generator
    g.write(objs...)
    g.bs.read()

module.exports = Generator
