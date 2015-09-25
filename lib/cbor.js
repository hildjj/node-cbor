(function() {
  try {
    require('source-map-support').install();
  } catch (_error) {

  }

  exports.Diagnose = require('./diagnose');

  exports.Decoder = require('./stream');

  exports.Encoder = require('./encoder');

  exports.Simple = require('./simple');

  exports.Tagged = require('./tagged');

  exports.decodeAll = exports.Decoder.decodeAll;

  exports.decodeFirst = exports.Decoder.decodeFirst;

  exports.diagnose = exports.Diagnose.diagnose;

  exports.encode = exports.Encoder.encode;

}).call(this);

//# sourceMappingURL=cbor.js.map
