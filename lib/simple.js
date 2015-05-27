(function() {
  var Simple, constants;

  constants = require('./constants');

  Simple = (function() {
    function Simple(value) {
      var ref;
      this.value = value;
      if (typeof this.value !== 'number') {
        throw new Error("Invalid Simple type: " + (typeof this.value));
      }
      if (!(((0 <= (ref = this.value) && ref < 256)) && ((this.value | 0) === this.value))) {
        throw new Error("value must be a small positive integer: " + this.value);
      }
    }

    Simple.prototype.toString = function() {
      return "simple(" + this.value + ")";
    };

    Simple.prototype.encodeCBOR = function(gen) {
      return gen._packInt(this.value, constants.MT.SIMPLE_FLOAT);
    };

    Simple.isSimple = function(obj) {
      return obj instanceof Simple;
    };

    return Simple;

  })();

  module.exports = Simple;

}).call(this);

//# sourceMappingURL=simple.js.map
