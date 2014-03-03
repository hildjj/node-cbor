# A CBOR tagged item, where the tag does not have semantics specified at the
# moment, or those semantics threw an error during parsing.
# Typically this will be an extension point you're not yet expecting.
module.exports = class Tagged
  # Create a tagged value
  # @param tag [Integer] the number of the tag
  # @param value [any] the value inside the tag
  # @param err [Error] the error that was thrown parsing the tag
  constructor: (@tag,@value,@err)->
    unless typeof @tag == 'number'
      throw new Error "Invalid tag type (#{typeof @tag})"
    if (@tag < 0) || ((@tag|0) != @tag)
      throw new Error "Tag must be a positive integer: #{@tag}"

  # Convert to a String
  # @return [String]
  toString: ()->
    return "#{@tag}(#{JSON.stringify(@value)})"

  # @nodoc
  encodeCBOR: (gen)->
    gen._packTag @tag
    gen._pack(@value)
