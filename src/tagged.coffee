bignumber = require 'bignumber.js'
utils = require './utils'
url = require 'url'

MINUS_ONE = new bignumber -1
TEN = new bignumber 10
TWO = new bignumber 2

# A CBOR tagged item, where the tag does not have semantics specified at the
# moment, or those semantics threw an error during parsing.
# Typically this will be an extension point you're not yet expecting.
module.exports = class Tagged
  # Create a tagged value
  # @param tag [Integer] the number of the tag
  # @param value [any] the value inside the tag
  # @param err [Error] the error that was thrown parsing the tag
  constructor: (@tag,@value,@err) ->
    unless typeof @tag == 'number'
      throw new Error "Invalid tag type (#{typeof @tag})"
    if (@tag < 0) || ((@tag | 0) != @tag)
      throw new Error "Tag must be a positive integer: #{@tag}"

  # Convert to a String
  # @return [String]
  toString: () ->
    return "#{@tag}(#{JSON.stringify(@value)})"

  # @nodoc
  encodeCBOR: (gen) ->
    gen._pushTag @tag
    gen._pushAny(@value)

  # If we have a converter for this type, do the conversion.  Some converters
  # are built-in.  Additional ones can be passed in.  If you want to remove
  # a built-in converter, pass a converter in whose value is 'null' instead
  # of a function.
  #
  # @param converters [Object] keys in the object are a tag number, the value
  #   is a function that takes the decoded CBOR and returns a JavaScript value
  #   of the appropriate type.  Throw an exception in the function on errors.
  # @return [Any] the converted item
  convert: (converters) ->
    f = converters?[@tag]
    if typeof(f) != 'function'
      f = Tagged["_tag_#{@tag}"]
      if typeof(f) != 'function'
        return @
    try
      f.call Tagged, @value
    catch er
      @err = er
      @

  # @nodoc
  # DATE_STRING
  @_tag_0: (v) ->
    new Date(v)

  # @nodoc
  # DATE_EPOCH
  @_tag_1: (v) ->
    new Date(v * 1000)

  # @nodoc
  # POS_BIGINT
  @_tag_2: (v) ->
    utils.bufferToBignumber v

  # @nodoc
  # NEG_BIGINT
  @_tag_3: (v) ->
    MINUS_ONE.minus(utils.bufferToBignumber v)

  # @nodoc
  # DECIMAL_FRAC
  @_tag_4: (v) ->
    [e,m] = v
    # m*(10**e)
    TEN.pow(e).times(m)

  # @nodoc
  # BIGFLOAT
  @_tag_5: (v) ->
    [e,m] = v
    # m*(2**e)
    TWO.pow(e).times(m)

  # @nodoc
  # URI
  @_tag_32: (v) ->
    url.parse(v)

  # @nodoc
  # REGEXP
  @_tag_35: (v) ->
    new RegExp v
