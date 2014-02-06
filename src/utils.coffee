bignumber = require 'bignumber.js'

SHIFT32 = Math.pow(2,32)

exports.parseInt = (ai, buf)->
  switch ai
    when 24 then buf.readUInt8 0, true
    when 25 then buf.readUInt16BE 0, true
    when 26 then buf.readUInt32BE 0, true
    when 27
      f = buf.readUInt32BE 0
      g = buf.readUInt32BE 4
      (f * SHIFT32) + g;
    else throw new Error "Invalid additional info for int: #{ai}"

exports.parseHalf = parseHalf = (buf)->
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
    sign * Math.pow(2, exp-25) * (1024 + mant)

exports.parseFloat = (ai, buf)->
  switch ai
    when 25 then parseHalf buf
    when 26 then buf.readFloatBE 0, true
    when 27 then buf.readDoubleBE 0, true
    else throw new Error "Invalid additional info for float: #{ai}"

exports.hex = (s)->
  new Buffer s.replace(/^0x/, ''), 'hex'

exports.bin = (s)->
  s = s.replace(/\s/g, '')
  start = 0
  end = s.length%8 or 8
  chunks = []
  while end <= s.length
    chunks.push parseInt(s.slice(start, end), 2)
    start=end
    end += 8
  new Buffer chunks

exports.extend = (old, adds...)->
  old ?= {}
  for a in adds
    for k,v of a
      old[k] = v
  old

exports.arrayEqual = (a, b)->
  if !a? and !b? then return true
  if !a? or !b? then return false
  (a.length == b.length) && a.every (elem,i)->
    elem == b[i];

exports.bufferToBignumber =  (buf)->
  # TODO: there's got to be a faster way to do this
  new bignumber buf.toString('hex'), 16

