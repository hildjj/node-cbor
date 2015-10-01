try
  require('source-map-support').install()
catch
  `// istanbul ignore next`
  undefined

exports.Commented = require './commented'
exports.Diagnose = require './diagnose'
exports.Decoder = require './decoder'
exports.Encoder = require './encoder'
exports.Simple = require './simple'
exports.Tagged = require './tagged'

exports.comment = exports.Commented.comment
exports.decodeAll = exports.Decoder.decodeAll
exports.decodeFirst = exports.Decoder.decodeFirst
exports.diagnose = exports.Diagnose.diagnose
exports.encode = exports.Encoder.encode
