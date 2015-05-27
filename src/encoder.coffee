stream = require 'stream'
url = require 'url'
bignumber =  require 'bignumber.js'

BufferStream = require './BufferStream'
Tagged = require './tagged'
Simple = require './simple'

constants = require './constants'

# TODO: replace these with constants and add unit tests to verify
MT = constants.MT
NUM_BYTES = constants.NUM_BYTES
TAG = constants.TAG
SHIFT32 = Math.pow 2, 32
DOUBLE = (MT.SIMPLE_FLOAT << 5) | NUM_BYTES.EIGHT
TRUE = (MT.SIMPLE_FLOAT << 5) | constants.SIMPLE.TRUE
FALSE = (MT.SIMPLE_FLOAT << 5) | constants.SIMPLE.FALSE
UNDEFINED = (MT.SIMPLE_FLOAT << 5) | constants.SIMPLE.UNDEFINED
NULL = (MT.SIMPLE_FLOAT << 5) | constants.SIMPLE.NULL
MAXINT_BN = new bignumber '0x20000000000000'

# A Readable stream of CBOR bytes.  Call `write` to get JSON objects translated
# into the stream.
module.exports = class Encoder extends stream.Readable
  # Create an encoder
  # @param options [Object] options for the encoder
  # @option options genTypes [Array] array of pairs of `type`,
  #   `function(Encoder)` for semantic types to be encoded.
  #   (default: [Array, arrayFunc, Date, dateFunc, Buffer, bufferFunc, RegExp,
  #   regexFunc, url.Url, urlFunc, bignumber, bignumberFunc]
  constructor: (options = {}) ->
    super options
    @bs = new BufferStream options
    @going = false
    @sendEOF = false
    @semanticTypes = [
      Array, @_packArray
      Date, @_packDate
      Buffer, @_packBuffer
      RegExp, @_packRegexp
      url.Url, @_packUrl
      bignumber, @_packBigNumber
    ]

    addTypes = options.genTypes ? []
    for typ,i in addTypes by 2
      @addSemanticType typ, addTypes[i + 1]

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
  _read: (size) ->
    @going = true
    while @going
      x = @bs.read()
      if x.length
        @going = @push x
      else
        if @sendEOF
          @going = @push null
        break

  # @nodoc
  _packNaN: () ->
    @bs.write 'f97e00', 'hex' # Half-NaN

  # @nodoc
  _packInfinity: (obj) ->
    half = if obj < 0 then 'f9fc00' else 'f97c00'
    @bs.write half, 'hex'

  # @nodoc
  _packFloat: (obj) ->
    # TODO: see if we can write smaller ones.
    @bs.writeUInt8 DOUBLE
    @bs.writeDoubleBE obj

  # @nodoc
  _packInt: (obj,mt) ->
    mt = mt << 5
    switch
      when obj < 24 then @bs.writeUInt8 mt | obj
      when obj <= 0xff
        @bs.writeUInt8 mt | NUM_BYTES.ONE
        @bs.writeUInt8 obj
      when obj <= 0xffff
        @bs.writeUInt8 mt | NUM_BYTES.TWO
        @bs.writeUInt16BE obj
      when obj <= 0xffffffff
        @bs.writeUInt8 mt | NUM_BYTES.FOUR
        @bs.writeUInt32BE obj
      when obj < 0x20000000000000
        @bs.writeUInt8 mt | NUM_BYTES.EIGHT
        @bs.writeUInt32BE Math.floor(obj / SHIFT32)
        @bs.writeUInt32BE (obj % SHIFT32)
      else
        @_packFloat obj

  # @nodoc
  _packIntNum: (obj) ->
    if obj < 0
      @_packInt -obj - 1, MT.NEG_INT
    else
      @_packInt obj, MT.POS_INT

  # @nodoc
  _packNumber: (obj) ->
    switch
      when isNaN(obj) then @_packNaN obj
      when !isFinite(obj) then @_packInfinity obj
      when Math.round(obj) == obj then @_packIntNum obj
      else
        @_packFloat obj

  # @nodoc
  _packString: (obj) ->
    len = Buffer.byteLength obj, 'utf8'
    @_packInt len, MT.UTF8_STRING
    @bs.writeString obj, len, 'utf8'

  # @nodoc
  _packBoolean: (obj) ->
    @bs.writeUInt8 if obj then TRUE else FALSE

  # @nodoc
  _packUndefined: (obj) ->
    @bs.writeUInt8 UNDEFINED

  # @nodoc
  _packArray: (gen, obj) ->
    len = obj.length
    @_packInt len, MT.ARRAY
    for x in obj
      @_pack x

  # @nodoc
  _packTag: (tag) ->
    @_packInt tag, MT.TAG

  # @nodoc
  _packDate: (gen, obj) ->
    @_packTag TAG.DATE_EPOCH
    @_pack obj / 1000

  # @nodoc
  _packBuffer: (gen, obj) ->
    @_packInt obj.length, MT.BYTE_STRING
    @bs.append obj

  # @nodoc
  _packRegexp: (gen, obj) ->
    @_packTag TAG.REGEXP
    @_pack obj.source

  # @nodoc
  _packUrl: (gen, obj) ->
    @_packTag TAG.URI
    @_pack obj.format()

  # @nodoc
  _packBigint: (obj) ->
    if obj.isNegative()
      obj = obj.negated().minus(1)
      tag = TAG.NEG_BIGINT
    else
      tag = TAG.POS_BIGINT
    str = obj.toString(16)
    if str.length % 2
      str = '0' + str
    buf = new Buffer str, 'hex'
    @_packTag tag
    @_packBuffer this, buf, @bs

  # @nodoc
  _packBigNumber: (gen, obj) ->
    if obj.isNaN()
      return @_packNaN()
    unless obj.isFinite()
      return @_packInfinity if obj.isNegative() then -Infinity else Infinity

    # if integer, just write a bigint.
    if obj.isInteger()
      return @_packBigint obj

    @_packTag TAG.DECIMAL_FRAC
    @_packInt 2, MT.ARRAY

    dec = obj.decimalPlaces()
    slide = obj.mul(new bignumber(10).pow(dec))
    @_packIntNum -dec

    # just use an integer if possible.
    if slide.abs().lessThan(MAXINT_BN)
      @_packIntNum slide.toNumber()
    else
      @_packBigint slide

  # @nodoc
  _packMap: (obj) ->
    keys = Object.keys obj
    len = keys.length
    @_packInt len, MT.MAP
    for k in keys
      @_pack k
      @_pack obj[k]

  # @nodoc
  _packObject: (obj) ->
    unless obj then return @bs.writeUInt8 NULL
    for typ,i in @semanticTypes by 2
      if obj instanceof typ
        return @semanticTypes[i + 1].call(this, this, obj)

    f = obj.encodeCBOR
    if typeof f == 'function'
      return f.call(obj, this)

    @_packMap obj

  # @nodoc
  _pack: (obj) ->
    switch typeof(obj)
      when 'number'    then @_packNumber obj
      when 'string'    then @_packString obj
      when 'boolean'   then @_packBoolean obj
      when 'undefined' then @_packUndefined obj
      when 'object'    then @_packObject obj
      else
        # e.g. function
        throw new Error('Unknown type: ' + typeof(obj))

  # Encode one or more JavaScript objects into the stream.
  # @param objs... [Object+] the objects to encode
  write: (objs...) ->
    for o in objs
      @_pack o
      if @going
        x = @bs.read()
        if x.length
          @going = @push x

  # Encode zero or more JavaScript objects into the stream, then end the stream.
  # @param objs... [Object*] the objects to encode
  end: (objs...) ->
    if objs.length then @write objs...
    if @going
      # assert.ok(@bs.length == 0)
      @going = @push null
    else
      @sendEOF = true

  # Encode one or more JavaScript objects, and return a Buffer containing the
  # CBOR bytes.
  # @param objs... [Object+] the objects to encode
  @encode: (objs...) ->
    g = new Encoder
    g.end objs...
    g.read()
