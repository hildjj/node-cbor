/*jslint node: true */
"use strict";

function Tagged(tag, val) {
  if (typeof tag !== 'number') {
    throw new Error('Invalid Unallocated type: ' + typeof(tag));
  }
  if ((tag < 0) || ((tag|0) !== tag)) {
    throw new Error('num must be a positive integer: ' + tag);
  }
  this.tag = tag;
  this.value = val;
}

/**
 * Convert to string.
 *
 * @param  {int} base Radix for the integer.  Defaults to 10.
 * @return {string}
 */
Tagged.prototype.toString = function() {
  return "" + this.tag + "(" + JSON.stringify(this.value) + ")";
};

Tagged.pack = function(gen, obj, bufs) {
  gen.constructor.packInt(obj.tag, 7, bufs);
  gen.unsafePack(obj.value, bufs);
};

module.exports = Tagged;
