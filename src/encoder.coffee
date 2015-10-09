stream = require 'stream'
url = require 'url'
bignumber =  require 'bignumber.js'
NoFilter = require 'nofilter'

Tagged = require './tagged'
Simple = require './simple'

# TODO: replace these with constants and add unit tests to verify
{MT, NUMBYTES, TAG, SIMPLE, SYMS} = require './constants'

SHIFT32   = Math.pow 2, 32
DOUBLE    = (MT.SIMPLE_FLOAT << 5) | NUMBYTES.EIGHT
TRUE      = (MT.SIMPLE_FLOAT << 5) | SIMPLE.TRUE
FALSE     = (MT.SIMPLE_FLOAT << 5) | SIMPLE.FALSE
UNDEFINED = (MT.SIMPLE_FLOAT << 5) | SIMPLE.UNDEFINED
NULL      = (MT.SIMPLE_FLOAT << 5) | SIMPLE.NULL
MAXINT_BN = new bignumber '0x20000000000000'

# Transform JavaScript values into CBOR bytes.  The `Writable` side of
# the stream is in object mode.
module.exports = class Encoder extends stream.Transform
  # Create an encoder
  # @param options [Object] options for the encoder
  # @option options genTypes [Array] array of pairs of `type`,
  #   `function(Encoder)` for semantic types to be encoded.
  #   (default: [Array, arrayFunc, Date, dateFunc, Buffer, bufferFunc, RegExp,
  #   regexFunc, url.Url, urlFunc, bignumber, bignumberFunc]
  constructor: (options = {}) ->
    options.readableObjectMode = false
    options.writableObjectMode = true

    super options

    @semanticTypes = [
      Array, @_pushArray
      Date, @_pushDate
      Buffer, @_pushBuffer
      Map, @_pushMap
      NoFilter, @_pushNoFilter
      RegExp, @_pushRegexp
      Set, @_pushSet
      url.Url, @_pushUrl
      bignumber, @_pushBigNumber
    ]

    addTypes = options.genTypes ? []
    for typ,i in addTypes by 2
      @addSemanticType typ, addTypes[i + 1]

  # @nodoc
  _transform: (fresh, encoding, cb) ->
    @_pushAny fresh
    cb()

  # @nodoc
  _flush: (cb) ->
    cb()

  # Add an encoding function to the list of supported semantic types.  This is
  # useful for objects for which you can't add an encodeCBOR method
  # @return [function(Encoder)] if this type already exists in the semantic type
  #   list, replace that function with the new one, and return the old one.
  #   Return null if this is a new type.
  addSemanticType: (type, fun) ->
    for typ,i in @semanticTypes by 2
      if typ == type
        [old, @semanticTypes[i + 1]] = [@semanticTypes[i + 1], fun]
        return old

    @semanticTypes.push type, fun
    null

  # @nodoc
  @_push_gen: (meth, len) ->
    (val) ->
      b = new Buffer len
      b[meth].call b, val, 0
      @push b

  _pushInt8:     @_push_gen 'writeInt8',     1
  _pushUInt8:    @_push_gen 'writeUInt8',    1
  _pushInt16BE:  @_push_gen 'writeInt16BE',  2
  _pushUInt16BE: @_push_gen 'writeUInt16BE', 2
  _pushInt32BE:  @_push_gen 'writeInt32BE',  4
  _pushUInt32BE: @_push_gen 'writeUInt32BE', 4
  _pushFloatBE:  @_push_gen 'writeFloatBE',  4
  _pushDoubleBE: @_push_gen 'writeDoubleBE', 8

  # @nodoc
  _pushNaN: () ->
    @push 'f97e00', 'hex' # Half-NaN

  # @nodoc
  _pushInfinity: (obj) ->
    half = if obj < 0 then 'f9fc00' else 'f97c00'
    @push half, 'hex'

  # @nodoc
  _pushFloat: (obj) ->
    # TODO: see if we can write smaller ones.
    @_pushUInt8 DOUBLE
    @_pushDoubleBE obj

  # @nodoc
  _pushInt: (obj, mt, orig) ->
    m = mt << 5
    switch
      when obj < 24 then @_pushUInt8 m | obj
      when obj <= 0xff
        @_pushUInt8 m | NUMBYTES.ONE
        @_pushUInt8 obj
      when obj <= 0xffff
        @_pushUInt8 m | NUMBYTES.TWO
        @_pushUInt16BE obj
      when obj <= 0xffffffff
        @_pushUInt8 m | NUMBYTES.FOUR
        @_pushUInt32BE obj
      when obj <= Number.MAX_SAFE_INTEGER
        @_pushUInt8 m | NUMBYTES.EIGHT
        @_pushUInt32BE Math.floor(obj / SHIFT32)
        @_pushUInt32BE (obj % SHIFT32)
      else
        # TODO: this doesn't work.
        if mt == MT.NEG_INT
          @_pushFloat orig
        else
          @_pushFloat obj

  # @nodoc
  _pushIntNum: (obj) ->
    if obj < 0
      @_pushInt -obj - 1, MT.NEG_INT, obj
    else
      @_pushInt obj, MT.POS_INT

  # @nodoc
  _pushNumber: (obj) ->
    switch
      when isNaN(obj) then @_pushNaN obj
      when !isFinite(obj) then @_pushInfinity obj
      when Math.round(obj) == obj then @_pushIntNum obj
      else @_pushFloat obj

  # @nodoc
  _pushString: (obj) ->
    len = Buffer.byteLength obj, 'utf8'
    @_pushInt len, MT.UTF8_STRING
    @push obj, 'utf8'

  # @nodoc
  _pushBoolean: (obj) ->
    @_pushUInt8 if obj then TRUE else FALSE

  # @nodoc
  _pushUndefined: (obj) ->
    @_pushUInt8 UNDEFINED

  # @nodoc
  _pushArray: (gen, obj) ->
    len = obj.length
    @_pushInt len, MT.ARRAY
    for x in obj
      @_pushAny x

  # @nodoc
  _pushTag: (tag) ->
    @_pushInt tag, MT.TAG

  # @nodoc
  _pushDate: (gen, obj) ->
    @_pushTag TAG.DATE_EPOCH
    @_pushAny obj / 1000

  # @nodoc
  _pushBuffer: (gen, obj) ->
    @_pushInt obj.length, MT.BYTE_STRING
    @push obj

  # @nodoc
  _pushNoFilter: (gen, obj) ->
    @_pushBuffer gen, obj.slice()

  # @nodoc
  _pushRegexp: (gen, obj) ->
    @_pushTag TAG.REGEXP
    @_pushAny obj.source

  # @nodoc
  _pushSet: (gen, obj) ->
    gen._pushInt obj.size, MT.ARRAY
    obj.forEach (x) ->
      gen._pushAny x

  # @nodoc
  _pushUrl: (gen, obj) ->
    @_pushTag TAG.URI
    @_pushAny obj.format()

  # @nodoc
  _pushBigint: (obj) ->
    if obj.isNegative()
      obj = obj.negated().minus(1)
      tag = TAG.NEG_BIGINT
    else
      tag = TAG.POS_BIGINT
    str = obj.toString(16)
    if str.length % 2
      str = '0' + str
    buf = new Buffer str, 'hex'
    @_pushTag tag
    @_pushBuffer this, buf, @bs

  # @nodoc
  _pushBigNumber: (gen, obj) ->
    if obj.isNaN()
      return @_pushNaN()
    unless obj.isFinite()
      return @_pushInfinity if obj.isNegative() then -Infinity else Infinity

    # if integer, just write a bigint.
    if obj.isInteger()
      return @_pushBigint obj

    @_pushTag TAG.DECIMAL_FRAC
    @_pushInt 2, MT.ARRAY

    dec = obj.decimalPlaces()
    slide = obj.mul(new bignumber(10).pow(dec))
    @_pushIntNum -dec

    # just use an integer if possible.
    if slide.abs().lessThan(MAXINT_BN)
      @_pushIntNum slide.toNumber()
    else
      @_pushBigint slide

  # @nodoc
  _pushMap: (gen, obj) ->
    gen._pushInt obj.size, MT.MAP
    obj.forEach (v,k) ->
      gen._pushAny k
      gen._pushAny v

  # @nodoc
  _pushObject: (obj) ->
    unless obj then return @_pushUInt8 NULL
    for typ,i in @semanticTypes by 2
      if obj instanceof typ
        return @semanticTypes[i + 1].call(this, this, obj)

    f = obj.encodeCBOR
    if typeof f == 'function'
      return f.call(obj, this)

    keys = Object.keys obj
    @_pushInt keys.length, MT.MAP
    for k in keys
      @_pushAny k
      @_pushAny obj[k]

  # @nodoc
  _pushAny: (obj) ->
    switch typeof(obj)
      when 'number'    then @_pushNumber obj
      when 'string'    then @_pushString obj
      when 'boolean'   then @_pushBoolean obj
      when 'undefined' then @_pushUndefined obj
      when 'object'    then @_pushObject obj
      when 'symbol'
        return switch obj
          when SYMS.NULL then @_pushObject null
          when SYMS.UNDEFINED then @_pushUndefined undefined
          else throw new Error('Unknown symbol: ' + obj.toString())
      else
        # e.g. function
        throw new Error('Unknown type: ' + typeof(obj) + ', ' + obj.toString())

  # Encode one or more JavaScript objects, and return a Buffer containing the
  # CBOR bytes.
  # @param objs... [Object+] the objects to encode
  @encode: (objs...) ->
    enc = new Encoder
    bs = new NoFilter
    enc.pipe bs
    for o in objs
      switch
        when typeof(o) == 'undefined' then enc._pushUndefined()
        when (o == null) then enc._pushObject(null)
        else enc.write o
    enc.end()
    bs.read()
