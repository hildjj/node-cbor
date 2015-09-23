(function() {
  try {
    require('source-map-support').install();
  } catch (_error) {

  }

  exports.Decoder = require('./stream');

  exports.Encoder = require('./encoder');

  exports.Simple = require('./simple');

  exports.Tagged = require('./tagged');

  exports.decodeAll = exports.Decoder.decodeAll;

  exports.decodeFirst = exports.Decoder.decodeFirst;

  exports.encode = exports.Encoder.encode;

}).call(this);

//# sourceMappingURL=cbor.js.map
