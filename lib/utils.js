/*jslint node: true */
"use strict";

exports.parseInt = function(ai, buf) {
  switch (ai) {
    case 28:
      return buf.readUInt8(0, true);
    case 29:
      return buf.readUInt16BE(0, true);
    case 30:
      return buf.readUInt32BE(0, true);
    case 31:
      var f = buf.readUInt32BE(0);
      var g = buf.readUInt32BE(4);
      return (f * Math.pow(2,32)) + g;
    default:
      return ai;
  }
};

exports.parseHalf = function(buf) {
  var sign = (buf[0] & 0x80) ? -1 : 1;
  var exp = (buf[0] & 0x7C) >> 2;
  var mant = ((buf[0] & 0x03) << 8) | buf[1];
  if (!exp) {
    // subnormal
    // Math.pow(2, -24) = 5.9604644775390625e-8
    return sign * 5.9604644775390625e-8 * mant;
  }
  if (exp === 0x1f) {
    return sign * (mant ? NaN : Infinity);
  }
  return sign * Math.pow(2, exp-25) * (1024 + mant);
};

exports.hex = function(s) {
  return new Buffer(s.replace(/^0x/, ''), 'hex');
};
