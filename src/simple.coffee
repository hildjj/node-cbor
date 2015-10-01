{MT, SIMPLE, SYMS} = require './constants'

# A CBOR Simple Value that does not map onto a known constant.
class Simple
  # Create a Simple with the given value
  # @param value [Integer] the simple value's integer value
  constructor: (@value) ->
    unless typeof @value == 'number'
      throw new Error "Invalid Simple type: #{typeof @value}"

    unless (0 <= @value < 256) && ((@value | 0) == @value)
      throw new Error "value must be a small positive integer: #{@value}"

  # Convert to a string
  # @return [String]
  toString: () ->
    "simple(#{@value})"

  inspect: (depth, opts) ->
    "simple(#{@value})"

  # @nodoc
  encodeCBOR: (gen) ->
    gen._pushInt @value, MT.SIMPLE_FLOAT

  # Is the given object a Simple?
  # @param obj the object to check
  # @return [Boolean]
  @isSimple = (obj) ->
    obj instanceof Simple

  @decode = (val, has_parent = true) ->
    switch val
      when SIMPLE.FALSE then false
      when SIMPLE.TRUE then true
      when SIMPLE.NULL
        return if has_parent then null
        else SYMS.NULL # HACK
      when SIMPLE.UNDEFINED
        return if has_parent then undefined
        else SYMS.UNDEFINED
      when -1
        if !has_parent
          throw new Error 'Invalid BREAK'
        SYMS.BREAK
      else new Simple(val)

module.exports = Simple
