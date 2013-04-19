/*jslint node: true */
"use strict";

var stream = require('stream');
var util = require('util');


function BufferReadError(message, slice) {
  Error.call(this, message);
  this.slice = slice;
}
util.inherits(BufferReadError, Error);

function BufferReader(buf, idx) {
  this.buf = buf;
  this.idx = idx;
}

BufferReader.prototype.read = function(size) {
  var i = this.idx;
  if (this.idx + size > this.buf.length) {
    this.idx = this.buf.length;
    throw new BufferReadError("End of file", this.buf.slice(i));
  }
  this.idx += size;
  return this.buf.slice(i, i+size);
};

function parseInt(ai, buf) {
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
}

function writeSmall(ai, buf, str) {
  var val;
  switch (ai) {
    case 29:
      // half.
      throw new Error("Half unimplemented");
    case 30:
      val = buf.readFloatBE(0);
      str.write(JSON.stringify(val));
      break;
    case 31:
      val = buf.readDoubleBE(0);
      str.write(JSON.stringify(val));
      break;
    default:
      val = parseInt(ai, buf);
      str.write("simple(" + val + ")");
  }
}

function writeBuffer(buf, str) {
  str.write("h'");
  str.write(buf.toString('hex'));
  str.write("'");
}

function diag(reader, str) {
  var ib = reader.read(1)[0];
  var mt = ib >> 5;
  var ai = ib & 0x1f;
  var val = (ai >= 28) ? reader.read(1 << (ai - 28)) : null;
  var i;

  switch(mt) {
    case 0:
      return str.write(JSON.stringify(parseInt(ai, val)));
    case 1:
      return str.write(JSON.stringify(-1-parseInt(ai, val)));
    case 2:
      val = reader.read(parseInt(ai, val));
      return writeBuffer(val, str);
    case 3:
      val = reader.read(parseInt(ai, val));
      return str.write(JSON.stringify(val.toString('utf8')));
    case 4:
      str.write("[");
      val = parseInt(ai, val);
      for (i=0; i < val; i++) {
        if (i !== 0) {
          str.write(", ");
        }
        diag(reader, str);
      }
      return str.write("]");
    case 5:
      str.write("{");
      val = parseInt(ai, val);
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
      str.write(JSON.stringify(parseInt(ai, val)));
      str.write("(");
      diag(reader, str);
      str.write(")");
  }
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
  str = (str && (str instanceof stream.WriteStream)) ? str : process.stdout;

  try {
    diag(new BufferReader(buf, index), str);
  } catch (e) {
    if (e instanceof BufferReadError) {
      str.write("err(left=");
      writeBuffer(e.slice, str);
      str.write(")");
    } else {
      throw e;
    }
  }
  str.write("\n");
};
