/*jslint node: true */
"use strict";

var assert = require('assert');
var util = require('util');
var stream = require('stream');

util.inherits(BufferStream, stream.Writable);

// new BufferStream([options])
// options can be as for stream, but also:
// - bsInit: Initial buffer
// - bsGrowSize: the number of bytes to grow when needed (default: 512)
// - bsStartEmpty: Don't initialize with a growSize buffer (default: false)
// - bsStartEnded: after bsInit is appended, should we end the stream?
//     if bsInit, defaults to true, else ignored
function BufferStream(options) {
  this.clear();
  this.waitingCB = null;
  this.waitingLen = Number.MAX_VALUE;

  if (!options) {
    options = {};
  }
  stream.Writable.call(this, options);
  this.growSize = options.bsGrowSize || 512;

  var that = this;
  var _finished = function () {
    if (that.waitingCB) {
      var cb = that.waitingCB;
      that.waitingCB = null;
      that.waitingLen = Number.MAX_VALUE;

      cb.call(that, new Error("End of file while waiting"));
    }
  };
  this.on("finish", _finished);

  var startEnded = options.bsStartEnded;

  // Often, we'll know the buffer we're working with, and it will never grow.
  var buf = options.bsInit;
  if (Buffer.isBuffer(buf)) {
    this.append(buf);
    if ((typeof startEnded !== 'boolean') || startEnded) {
      this.end();
      return;
    }
  }

  if (!options.bsStartEmpty) {
    this.grow();
  }
}

BufferStream.isBufferStream = function isBuffer(b) {
  return b instanceof BufferStream;
};

BufferStream.pack = function(gen, obj, bufs) {
  gen.constructor.packInt(obj.length, 2, bufs);
  bufs.append(obj.flatten());
};

BufferStream.prototype.isValid = function() {
  var len = this.bufs.reduce(function(prev, cur) {return prev + cur.length;}, 0);
  len -= this.left;
  if (len !== this.length) {
    console.log("Invalid", len, this.length);
  }
  return len === this.length;
};

BufferStream.prototype._bufSizes = function() {
  return this.bufs.map(function(b) {return b.length;});
};

BufferStream.prototype._write = function(chunk, encoding, callback) {
  if (!Buffer.isBuffer(chunk)) {
    callback(new Error("String encoding not supported"));
  } else {
    this.append(chunk);
    callback();
  }
};

BufferStream.prototype._notifyWaiter = function() {
  assert.ok(this.waitingCB);

  var buf = null;
  var lenZ = this.bufs[0].length;
  var lenW = this.waitingLen;

  assert.ok(lenW <= this.length);

  // TODO: don't keep slicing; maintain a start offset.

  // Note to self: none of the paths here need to modify this.left
  // You don't need to check again.
  if (lenZ === lenW) {
    // hey, it might happen
    buf = this.bufs.shift();
  } else if (lenZ > lenW) {
    buf = this.bufs[0].slice(0, lenW);
    this.bufs[0] = this.bufs[0].slice(lenW);
  } else {
    // We're going to need more than one.
    var some = [];
    var got = 0;
    while (got < lenW) {
      var b = this.bufs.shift();
      some.push(b);
      got += b.length;
    }
    buf = Buffer.concat(some, lenW);
    if (got > lenW) {
      // put the unread bytes back.  Those bytes will ALWAYS be in the last
      // chunk of some.
      var last = some[some.length-1];
      var left = got-lenW;
      this.bufs.unshift(last.slice(last.length - left));
    }
  }
  this.length -= lenW;

  // reset before calling, so that callbacks can call wait()
  var cb = this.waitingCB;
  this.waitingCB = null;
  this.waitingLen = Number.MAX_VALUE;

  cb.call(this, null, buf);
};

BufferStream.prototype.wait = function(length, cb) {
  if (this.waitingCB) {
    throw new Error('Invalid state.  Cannot wait while already waiting.');
  }
  if (typeof(length) !== 'number') {
    throw new Error("length required, must be non-negative number: " + length);
  }
  if (typeof(cb) !== 'function') {
    throw new Error("cb required, must be function");
  }
  if (length === 0) {
    cb.call(this, null, new Buffer(0));
  } else {
    this.waitingCB = cb;
    this.waitingLen = length;
    if (this.length >= length) {
      this._notifyWaiter();
    }
    else if (this._writableState.ended) {
      cb.call(this, new Error('End of file'));
      this.waitingCB = null;
      this.waitingLen = Number.MAX_VALUE;
    }
  }
};

BufferStream.prototype.clear = function() {
  this.bufs = [];
  this.length = 0;
  this.left = 0;
};

BufferStream.prototype.trimLast = function() {
  if (this.left !== 0) {
    var last = this.bufs.pop();
    if (this.left != last.length) {
      this.bufs.push(last.slice(0, last.length-this.left));
    }
    this.left = 0;
  }
};

BufferStream.prototype.lengthen = function(size) {
  assert.ok(size>0);
  this.length += size;
  if (this.length >= this.waitingLen) {
    this._notifyWaiter();
  }
};

BufferStream.prototype.grow = function(size) {
  this.trimLast();

  var s = size || this.growSize;
  var b = new Buffer(s);
  this.bufs.push(b);
  this.left = s;
  return b;
};

BufferStream.prototype.append = function(buf) {
  assert.ok(Buffer.isBuffer(buf));
  var len = buf.length;
  if (len === 0) {
    return 0;
  }

  if (this.left === 0) {
    this.bufs.push(buf);
  } else if (len > this.left) {
    this.trimLast(); // left always 0
    this.bufs.push(buf);
  } else {
    var b = this.bufs[this.bufs.length-1];
    buf.copy(b, b.length - this.left);
    this.left -= len;
  }

  this.lengthen(len);
};

BufferStream.prototype.flatten = function() {
  var b;
  if (this.length === 0) {
    this.left = 0;
    this.bufs = [];
    return new Buffer(0);
  }

  switch (this.bufs.length) {
    case 0:
      assert.fail(this.length, "Invalid state.  No buffers when length>0.");
      break;
    case 1:
      if (this.left === 0) {
        b = this.bufs[0];
      } else {
        b = this.bufs[0].slice(0,this.length);
        this.bufs = [b];
        this.left = 0;
      }
      return b;
    default:
      // grown, but not added to yet.  This will break Buffer.concat.
      if (this.left === this.bufs[this.bufs.length-1].length) {
        this.bufs.pop();
      }
      b = Buffer.concat(this.bufs, this.length);
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
};

BufferStream.prototype.writeUInt8 = function(value) {
  var b = this.ensure(1);
  b.writeUInt8(value, b.length - this.left, true);
  this.left -= 1;
  this.lengthen(1);
};

BufferStream.prototype.writeUInt16LE = function(value) {
  var b = this.ensure(2);
  b.writeUInt16LE(value, b.length - this.left, true);
  this.left -= 2;
  this.lengthen(2);
};

BufferStream.prototype.writeUInt16BE = function(value) {
  var b = this.ensure(2);
  b.writeUInt16BE(value, b.length - this.left, true);
  this.left -= 2;
  this.lengthen(2);
};

BufferStream.prototype.writeUInt32LE = function(value) {
  var b = this.ensure(4);
  b.writeUInt32LE(value, b.length - this.left, true);
  this.left -= 4;
  this.lengthen(4);
};

BufferStream.prototype.writeUInt32BE = function(value) {
  var b = this.ensure(4);
  b.writeUInt32BE(value, b.length - this.left, true);
  this.left -= 4;
  this.lengthen(4);
};

BufferStream.prototype.writeInt8 = function(value) {
  var b = this.ensure(1);
  b.writeInt8(value, b.length - this.left, true);
  this.left -= 1;
  this.lengthen(1);
};

BufferStream.prototype.writeInt16LE = function(value) {
  var b = this.ensure(2);
  b.writeInt16LE(value, b.length - this.left, true);
  this.left -= 2;
  this.lengthen(2);
};

BufferStream.prototype.writeInt16BE = function(value) {
  var b = this.ensure(2);
  b.writeInt16BE(value, b.length - this.left, true);
  this.left -= 2;
  this.lengthen(2);
};

BufferStream.prototype.writeInt32LE = function(value) {
  var b = this.ensure(4);
  b.writeInt32LE(value, b.length - this.left, true);
  this.left -= 4;
  this.lengthen(4);
};

BufferStream.prototype.writeInt32BE = function(value) {
  var b = this.ensure(4);
  b.writeInt32BE(value, b.length - this.left, true);
  this.left -= 4;
  this.lengthen(4);
};

BufferStream.prototype.writeFloatLE = function(value) {
  var b = this.ensure(4);
  b.writeFloatLE(value, b.length - this.left, true);
  this.left -= 4;
  this.lengthen(4);
};

BufferStream.prototype.writeFloatBE = function(value) {
  var b = this.ensure(4);
  b.writeFloatBE(value, b.length - this.left, true);
  this.left -= 4;
  this.lengthen(4);
};

BufferStream.prototype.writeDoubleLE = function(value) {
  var b = this.ensure(8);
  b.writeDoubleLE(value, b.length - this.left, true);
  this.left -= 8;
  this.lengthen(8);
};

BufferStream.prototype.writeDoubleBE = function(value) {
  var b = this.ensure(8);
  b.writeDoubleBE(value, b.length - this.left, true);
  this.left -= 8;
  this.lengthen(8);
};

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
};

module.exports = BufferStream;
