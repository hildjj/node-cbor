(function() {
  var Tagged;

  module.exports = Tagged = (function() {
    function Tagged(tag, value, err) {
      this.tag = tag;
      this.value = value;
      this.err = err;
      if (typeof this.tag !== 'number') {
        throw new Error("Invalid tag type (" + (typeof this.tag) + ")");
      }
      if ((this.tag < 0) || ((this.tag | 0) !== this.tag)) {
        throw new Error("Tag must be a positive integer: " + this.tag);
      }
    }

    Tagged.prototype.toString = function() {
      return "" + this.tag + "(" + (JSON.stringify(this.value)) + ")";
    };

    Tagged.prototype.encodeCBOR = function(gen) {
      gen._packTag(this.tag);
      return gen._pack(this.value);
    };

    return Tagged;

  })();

}).call(this);
