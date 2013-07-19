/*jslint node: true */
"use strict";

function Simple(num) {
  if (typeof num !== 'number') {
    throw new Error('Invalid Simple type: ' + typeof(num));
  }
  if ((num < 0) || (num > 255) || ((num|0) !== num)) {
    throw new Error('num must be a small positive integer: ' + num);
  }
  this.value = num;
}

/**
 * Convert to string.
 *
 * @return {string}
 */
Simple.prototype.toString = function() {
  return "simple(" + this.value + ")";
};

Simple.pack = function(gen, obj, bufs) {
  gen.constructor.packInt(obj.value, 6, bufs);
};

Simple.isSimple = function isSimple(b) {
  return b instanceof Simple;
};

module.exports = Simple;
