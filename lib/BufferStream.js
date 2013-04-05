var assert = require('assert');
var util = require('util');
var stream = require('stream');

util.inherits(BufferStream, stream.Writable);

function BufferStream(options) {
  if (typeof(options) === 'number') {
    this.growsize = options|0;
  } else {
    if (options) {
      this.growsize = options.growsize || 512;
    } else {
      this.growsize = 512;
    }
  }

  this.clear();
  stream.Writable.call(this, options);
}

BufferStream.prototype._write = function(chunk, encoding, callback) {
  if (!Buffer.isBuffer(chunk)) {
    console.log(encoding);
    console.log(typeof(chunk));
    callback(new Error("String encoding not supported"))
  } else {
    this.append(chunk);
    callback();
  }
}

BufferStream.prototype.clear = function() {
  this.bufs = [];
  this.length = 0;
  this.left = 0;
};

BufferStream.prototype.trimLast = function() {
  if (this.left !== 0) {
    var last = this.bufs.pop();
    this.bufs.push(last.slice(0, last.length-this.left));
    this.left = 0;
  }
}

BufferStream.prototype.lengthen = function(size) {
  this.length += size;
};

BufferStream.prototype.grow = function(size) {
  this.trimLast();

  var s = size || this.growsize;
  var b = new Buffer(s);
  this.bufs.push(b);
  this.left = s;
  return b;
};

BufferStream.prototype.append = function(buf) {
  var len = buf.length;
  if (len === 0) {
    return 0;
  }

  if (this.left === 0) {
    this.bufs.push(buf);
  } else if (len > this.left) {
    trimLast(); // left always 0
    this.bufs.push(buf);
  } else {
    var b = this.bufs[this.bufs.length-1];
    buf.copy(b, b.length - this.left);
    this.left -= len;
  }

  this.lengthen(len);
};

BufferStream.prototype.flatten = function() {
  if (this.length === 0) {
    this.left = 0;
    this.bufs = [];
    return new Buffer(0);
  }

  switch (this.bufs.length) {
    case 0:
      throw new Error("Invalid state.  No buffers when length>0.")
    case 1:
      if (this.left === 0) {
        return this.bufs[0];
      } else {
        var b = this.bufs[0].slice(0,this.length);
        this.bufs = [b];
        this.left = 0;
        return b;
      }
    default:
      // grown, but not added to yet.  This will break Buffer.concat.
      if (this.left === this.bufs[this.bufs.length-1].length) {
        this.bufs.pop();
      }
      var b = Buffer.concat(this.bufs, this.length);
      this.bufs = [b];
      this.left = 0;
      return b;
  }
};

BufferStream.prototype.slice = function(start, end) {
  var b = this.flatten();
  return b.slice(start, end);
};

BufferStream.prototype.fill = function(val, offset, end) {
  var b = new Buffer(this.length);
  b.fill(val, offset, end);
  this.bufs = [b];
  this.left = 0;
};

BufferStream.prototype.toJSON = function() {
  var b = this.flatten();
  return b.toJSON();
};

BufferStream.prototype.ensure = function(len) {
  if (this.left < len) {
    return this.grow(Math.max(this.growsize, len));
  }
  return this.bufs[this.bufs.length-1];
}

BufferStream.prototype.writeUInt8 = function(value) {
  var b = this.ensure(1);
  b.writeUInt8(value, b.length - this.left, true);
  this.left -= 1;
  this.lengthen(1);
}

BufferStream.prototype.writeUInt16LE = function(value) {
  var b = this.ensure(2);
  b.writeUInt16LE(value, b.length - this.left, true);
  this.left -= 2;
  this.lengthen(2);
}

BufferStream.prototype.writeUInt16BE = function(value) {
  var b = this.ensure(2);
  b.writeUInt16BE(value, b.length - this.left, true);
  this.left -= 2;
  this.lengthen(2);
}

BufferStream.prototype.writeUInt32LE = function(value) {
  var b = this.ensure(4);
  b.writeUInt32LE(value, b.length - this.left, true);
  this.left -= 4;
  this.lengthen(4);
}

BufferStream.prototype.writeUInt32BE = function(value) {
  var b = this.ensure(4);
  b.writeUInt32BE(value, b.length - this.left, true);
  this.left -= 4;
  this.lengthen(4);
}

BufferStream.prototype.writeInt8 = function(value) {
  var b = this.ensure(1);
  b.writeInt8(value, b.length - this.left, true);
  this.left -= 1;
  this.lengthen(1);
}

BufferStream.prototype.writeInt16LE = function(value) {
  var b = this.ensure(2);
  b.writeInt16LE(value, b.length - this.left, true);
  this.left -= 2;
  this.lengthen(2);
}

BufferStream.prototype.writeInt16BE = function(value) {
  var b = this.ensure(2);
  b.writeInt16BE(value, b.length - this.left, true);
  this.left -= 2;
  this.lengthen(2);
}

BufferStream.prototype.writeInt32LE = function(value) {
  var b = this.ensure(4);
  b.writeInt32LE(value, b.length - this.left, true);
  this.left -= 4;
  this.lengthen(4);
}

BufferStream.prototype.writeInt32BE = function(value) {
  var b = this.ensure(4);
  b.writeInt32BE(value, b.length - this.left, true);
  this.left -= 4;
  this.lengthen(4);
}

BufferStream.prototype.writeFloatLE = function(value) {
  var b = this.ensure(4);
  b.writeFloatLE(value, b.length - this.left, true);
  this.left -= 4;
  this.lengthen(4);
}

BufferStream.prototype.writeFloatBE = function(value) {
  var b = this.ensure(4);
  b.writeFloatBE(value, b.length - this.left, true);
  this.left -= 4;
  this.lengthen(4);
}

BufferStream.prototype.writeDoubleLE = function(value) {
  var b = this.ensure(8);
  b.writeDoubleLE(value, b.length - this.left, true);
  this.left -= 8;
  this.lengthen(8);
}

BufferStream.prototype.writeDoubleBE = function(value) {
  var b = this.ensure(8);
  b.writeDoubleBE(value, b.length - this.left, true);
  this.left -= 8;
  this.lengthen(8);
}

BufferStream.prototype.writeString = function(value, length, encoding) {
  var enc = encoding || 'utf8';
  var len = length || Buffer.byteLength(value, enc);
  if (len === 0) {
    return;
  }

  var b = this.ensure(len);
  b.write(value, b.length - this.left, len, enc);
  this.left -= len;
  this.lengthen(len);
}

module.exports = BufferStream;
