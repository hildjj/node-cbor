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
 * @param  {int} base Radix for the integer.  Defaults to 10.
 * @return {string}
 */
Unallocated.prototype.toString = function(base) {
  if (!base) { base = 10; }
  var prefix = '';
  if (base == 16) { prefix = '0x'; }
  if (base == 8) { prefix = '0'; }
  if (base == 2) { prefix = '0b'; }
  return "Unallocated-" + prefix + this.value.toString(base);
};

Unallocated.pack = function(gen, obj, bufs) {
  gen.constructor.packInt(obj.value, 6, bufs);
};

module.exports = Unallocated;
