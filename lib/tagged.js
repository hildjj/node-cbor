/*jslint node: true */
"use strict";

function Tagged(tag, val, err) {
  if (typeof tag !== 'number') {
    throw new Error('Invalid tag type (' + typeof(tag) + "): " + tag);
  }
  if ((tag < 0) || ((tag|0) !== tag)) {
    throw new Error('Tag must be a positive integer: ' + tag);
  }
  this.tag = tag;
  this.value = val;
  this.err =  err;
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
  gen['_packTag'].call(gen, obj.tag);
  gen['_pack'].call(gen, obj.value);
};

module.exports = Tagged;
