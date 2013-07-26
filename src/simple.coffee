constants = require './constants'

class Simple
  constructor: (@value)->
    unless typeof @value == 'number'
      throw new Error "Invalid Simple type: #{typeof @value}"

    unless (0 <= value < 256) && ((@value|0) == @value)
      throw new Error "value must be a small positive integer: #{@value}"

  toString: ()->
    "simple(#{@value})"

  generateCBOR: (gen)->
    gen._packInt @value, constants.MT.SIMPLE_FLOAT

  @isSimple = (b)->
    b instanceof Simple

module.exports = Simple
