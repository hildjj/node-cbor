(function() {
  try {
    require('source-map-support').install();
  } catch (_error) {

  }

  exports.Commented = require('./commented');

  exports.Diagnose = require('./diagnose');

  exports.Decoder = require('./decoder');

  exports.Encoder = require('./encoder');

  exports.Simple = require('./simple');

  exports.Tagged = require('./tagged');

  exports.Evented = require('./evented');

  exports.comment = exports.Commented.comment;

  exports.decode = exports.Decoder.decode;

  exports.diagnose = exports.Diagnose.diagnose;

  exports.encode = exports.Encoder.encode;

}).call(this);

//# sourceMappingURL=cbor.js.map
