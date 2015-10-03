fs = require 'fs'
stream = require 'stream'
bignumber = require 'bignumber.js'
{NUMBYTES} = require './constants'
SHIFT32 = Math.pow(2,32)
MAX_SAFE_HIGH = 0x1fffff

# Parse an integer of 1,4, or 8 bytes.
# @param ai [Integer] the additional information from the input stream
# @param buf [Buffer] the appropriate number of bytes based on `ai`
# @return [Integer or bignum]
exports.parseCBORint = (ai, buf) ->
  switch ai
    when NUMBYTES.ONE then buf.readUInt8(0, true)
    when NUMBYTES.TWO then buf.readUInt16BE(0, true)
    when NUMBYTES.FOUR then buf.readUInt32BE(0, true)
    when NUMBYTES.EIGHT
      f = buf.readUInt32BE(0)
      g = buf.readUInt32BE(4)
      # 2^53-1 maxint
      return if f > MAX_SAFE_HIGH
        # alternately, we could throw an error.
        new bignumber(f).times(SHIFT32).plus(g)
      else
        (f * SHIFT32) + g
    else
      throw new Error "Invalid additional info for int: #{ai}"

# Parse an IEEE754 half-precision float
# @param buf [Buffer] two bytes to parse from
# @return [Number]
exports.parseHalf = parseHalf = (buf) ->
  sign = if (buf[0] & 0x80) then -1 else 1
  exp = (buf[0] & 0x7C) >> 2
  mant = ((buf[0] & 0x03) << 8) | buf[1]
  unless exp
    # subnormal
    # Math.pow(2, -24) = 5.9604644775390625e-8
    sign * 5.9604644775390625e-8 * mant
  else if exp == 0x1f
    sign * (if mant then NaN else Infinity)
  else
    sign * Math.pow(2, exp - 25) * (1024 + mant)

# Parse an IEEE754 half-,  single-, or double-precision float.
# @param buf [Buffer] 2,4, or 8 bytes to parse from
# @return [Number]
exports.parseCBORfloat = (buf) ->
  switch buf.length
    when 2 then exports.parseHalf buf
    when 4 then buf.readFloatBE 0, true
    when 8 then buf.readDoubleBE 0, true
    else
      throw new Error "Invalid float size: #{buf.length}"

# Decode a hex string into a buffer
# @return [Buffer]
exports.hex = (s) ->
  new Buffer s.replace(/^0x/, ''), 'hex'

# Decode a binary string (e.g. '1001') into a buffer
# @return [Buffer]
exports.bin = (s) ->
  s = s.replace(/\s/g, '')
  start = 0
  end = (s.length % 8) or 8
  chunks = []
  while end <= s.length
    chunks.push parseInt(s.slice(start, end), 2)
    start = end
    end += 8
  new Buffer chunks

# Copy all of keys from the second and subsequent objects into the first object.
# @param old [Object] optional object to copy into (default: {})
# @param adds [Object*] optional additional objects to copy on top.  These get
#   copied left to right, with later objects overwriting the keys from
#   previous ones.
exports.extend = (old, adds...) ->
  old ?= {}
  for a in adds
    for k,v of a
      old[k] = v
  old

# Are all of the items in two arrays the same?
# @param a [Array]
# @param b [Array]
# @return [Boolean]
exports.arrayEqual = (a, b) ->
  if !a? and !b? then return true
  if !a? or !b? then return false
  (a.length == b.length) && a.every (elem,i) ->
    elem == b[i]

# Do the two buffers contain the same bytes?
exports.bufferEqual = (a,b) ->
  if !a? and !b? then return true
  if !a? or !b? then return false
  unless Buffer.isBuffer(a) and Buffer.isBuffer(b) and (a.length == b.length)
    return false

  ret = true
  for byte,i in a
    ret &= (b[i] == byte)
  return !!ret

# Convert a a buffer to a bignumber
# @param buf [Buffer] the buffer to convert
# @return [bignumber]
exports.bufferToBignumber = (buf) ->
  # TODO: there's got to be a faster way to do this
  new bignumber buf.toString('hex'), 16

# @nodoc
class @DeHexStream extends stream.Readable
  # @nodoc
  constructor: (hex) ->
    super()
    hex = hex.replace /^0x/, ''
    if hex
      @push new Buffer(hex, 'hex')
    @push null

  # @nodoc
  _read: ->

# @nodoc
class @HexStream extends stream.Transform
  constructor: (options) ->
    super(options)

  _transform: (fresh, encoding, cb) ->
    @push fresh.toString('hex')
    cb()

  _flush: (cb) ->
    cb()

# @nodoc
printError = (er) ->
  if er?
    console.log er

# @nodoc
exports.streamFiles = (files, streamFunc, cb = printError) ->
  f = files.shift()
  if !f
    return cb()

  sf = streamFunc()
  sf.on 'end', ->
    exports.streamFiles files, streamFunc, cb
  sf.on 'error', cb

  s = if f == "-" then process.stdin
  else if f instanceof stream.Stream then f
  else fs.createReadStream(f)
  s.on 'error', cb
  s.pipe sf

# @nodoc
exports.guessEncoding = (input) ->
  switch
    when typeof(input) == 'string'
      'hex'
    when Buffer.isBuffer(input)
      undefined
    else
      throw new Error 'Unknown input type'
