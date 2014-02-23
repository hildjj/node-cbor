class Tagged
  constructor: (@tag,@value,@err)->
    unless typeof @tag == 'number'
      throw new Error "Invalid tag type (#{typeof @tag})"
    if (@tag < 0) || ((@tag|0) != @tag)
      throw new Error "Tag must be a positive integer: #{@tag}"

  toString: ()->
    return "#{@tag}(#{JSON.stringify(@value)})"

  encodeCBOR: (gen)->
    gen._packTag @tag
    gen._pack(@value)

module.exports = Tagged
