/*jslint node: true */
"use strict";

var stream = require('stream');
var util = require('util');
var utils = require('./utils');
var Unallocated = require('./unallocated');

function BufferReadError(message, expected, slice) {
  Error.call(this, message);
  this.slice = slice;
  this.expected = expected;
}
util.inherits(BufferReadError, Error);

BufferReadError.prototype.toString = function() {
  return "[Error: " + this.message +
    " (expected: " + this.expected +
    "bytes, got: " + this.slice.toString('hex') + ")]";
};

function BufferReader(buf, idx) {
  this.buf = buf;
  this.idx = idx;
  this.lastGood = idx;
}

BufferReader.prototype.read = function(size) {
  var i = this.idx;
  if (this.idx + size > this.buf.length) {
    this.idx = this.buf.length;
    throw new BufferReadError("End of file", size, this.buf.slice(this.lastGood));
  }
  this.idx += size;
  return this.buf.slice(i, i+size);
};

BufferReader.prototype.mark = function() {
  this.lastGood = this.idx;
};

function writeSmall(ai, buf, str) {
  var val;
  switch (ai) {
    case 24: val = false; break;
    case 25: val = true; break;
    case 26: val = str.write('null'); return;
    case 27: val = str.write('undefined'); return;
    case 28: val = new Unallocated(ai); break;
    case 29: val = utils.parseHalf(buf); break;
    case 30: val = buf.readFloatBE(0); break;
    case 31: val = buf.readDoubleBE(0); break;
    default:
      val = new Unallocated(utils.parseInt(ai, buf));
      break;
  }
  str.write(val.toString());
}

function writeBuffer(reader, len, str) {
  str.write("h'");
  reader.mark();
  var buf = reader.read(len);
  str.write(buf.toString('hex'));
  str.write("'");
}

function writeString(reader, len, str) {
  reader.mark();
  try {
    var val = reader.read(len);

    // use JSON.stringify in order to get all of the escaping correct
    str.write(JSON.stringify(val.toString('utf8')));
  } catch (e) {
    // however, if there aren't enough bytes, or the utf8 decode doesn't work,
    // We at least want the reader to know that we consumed the marker that
    // this was a string, and the length.
    str.write('"');
    throw e;
  }
}

function diag(reader, str) {
  var ib = reader.read(1)[0];
  var mt = ib >> 5;
  var ai = ib & 0x1f;
  var val = (ai >= 28) ? reader.read(1 << (ai - 28)) : null;
  var i;

  switch(mt) {
    case 0: str.write(JSON.stringify(utils.parseInt(ai, val))); break;
    case 1: str.write(JSON.stringify(-1-utils.parseInt(ai, val))); break;
    case 2: writeBuffer(reader, utils.parseInt(ai, val), str); break;
    case 3: writeString(reader, utils.parseInt(ai, val), str); break;
    case 4:
      str.write("[");
      val = utils.parseInt(ai, val);
      for (i=0; i < val; i++) {
        if (i !== 0) {
          str.write(", ");
        }
        diag(reader, str);
      }
      return str.write("]");
    case 5:
      str.write("{");
      val = utils.parseInt(ai, val);
      for (i=0; i<val; i++) {
        if (i !== 0) {
          str.write(", ");
        }
        diag(reader, str),
        str.write(": ");
        diag(reader, str);
      }
      return str.write("}");
    case 6:
      return writeSmall(ai, val, str);
    case 7:
      str.write(JSON.stringify(utils.parseInt(ai, val)));
      str.write("(");
      diag(reader, str);
      return str.write(")");
  }
  reader.mark();
}

module.exports = function(buf, index, str) {
  if (!Buffer.isBuffer(buf)) {
    throw new Error('Diagnosis only works on Buffers');
  }

  if (typeof(index) !== 'number') {
    if (!str) {
      str = index;
    }
    index = 0;
  }
  str = (str && (str instanceof stream.Writable)) ? str : process.stdout;

  try {
    diag(new BufferReader(buf, index), str);
  } catch (e) {
    if (e instanceof BufferReadError) {
      str.write('err{"expected": ' + e.expected);
      if (e.slice.length > 0) {
        str.write(', "left": h\'' + e.slice.toString('hex') + "'");
      }
      str.write("}");
    } else {
      throw e;
    }
  }
  str.write("\n");
};
