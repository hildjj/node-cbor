/*jslint node: true */
"use strict";

function Unallocated(num) {
  if (typeof num !== 'number') {
    throw new Error('Invalid Unallocated type: ' + typeof(num));
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
Unallocated.prototype.toString = function() {
  return "simple(" + this.value + ")";
};

Unallocated.pack = function(gen, obj, bufs) {
  gen.constructor.packInt(obj.value, 6, bufs);
};

module.exports = Unallocated;
