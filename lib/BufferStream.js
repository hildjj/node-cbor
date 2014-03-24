(function() {
  var BufferStream, EMPTY, assert, createEOF, stream, util,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    __slice = [].slice;

  assert = require('assert');

  util = require('util');

  stream = require('stream');

  EMPTY = new Buffer(0);

  createEOF = function() {
    var e;
    e = new Error('EOF');
    e.BufferStreamEOF = true;
    return e;
  };

  BufferStream = (function(_super) {
    __extends(BufferStream, _super);

    function BufferStream(options) {
      var buf, startEnded, _ref, _ref1, _ref2;
      if (options == null) {
        options = {};
      }
      this.clear();
      this._resetCB();
      BufferStream.__super__.constructor.call(this, options);
      this.growSize = (_ref = options.bsGrowSize) != null ? _ref : 512;
      this.zero = (_ref1 = options.bsZero) != null ? _ref1 : false;
      this.on("finish", (function(_this) {
        return function() {
          return _this._resetCB(createEOF());
        };
      })(this));
      buf = options.bsInit;
      if (Buffer.isBuffer(buf)) {
        this.append(buf);
        startEnded = (_ref2 = options.bsStartEnded) != null ? _ref2 : true;
        if (!!startEnded) {
          this.end();
        }
      } else if (!options.bsStartEmpty) {
        this.grow();
      }
    }

    BufferStream.isBufferStream = function(obj) {
      return obj instanceof BufferStream;
    };

    BufferStream.isEOFError = function(er) {
      return er && (er instanceof Error) && (er.BufferStreamEOF === true);
    };

    BufferStream.prototype.encodeCBOR = function(enc) {
      return enc._packBuffer(enc, this.flatten());
    };

    BufferStream.prototype.isValid = function() {
      var len;
      len = this.bufs.reduce(function(prev, cur) {
        return prev + cur.length;
      }, 0);
      len -= this.left;
      return len === this.length;
    };

    BufferStream.prototype._bufSizes = function() {
      return this.bufs.map(function(b) {
        return b.length;
      });
    };

    BufferStream.prototype._write = function(chunk, encoding, cb) {
      if (!Buffer.isBuffer(chunk)) {
        return cb(new Error('String encoding not supported'));
      } else {
        this.append(chunk);
        return cb();
      }
    };

    BufferStream.prototype._resetCB = function() {
      var args, cb, _ref;
      args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      _ref = [this.waitingCB, null, Number.MAX_VALUE], cb = _ref[0], this.waitingCB = _ref[1], this.waitingLen = _ref[2];
      if (cb && args.length) {
        cb.apply(this, args);
      }
      return cb;
    };

    BufferStream.prototype._notifyWaiter = function() {
      var buf;
      assert.ok(this.waitingCB);
      buf = this.read(this.waitingLen);
      return this._resetCB(null, buf);
    };

    BufferStream.prototype.read = function(length) {
      var b, buf, got, last, lastbuf, left, lenW, lenZ, local_left, some;
      buf = null;
      if (this.length === 0) {
        return EMPTY;
      }
      lenZ = this.bufs[0].length;
      if (length == null) {
        length = 0;
      }
      lenW = (function() {
        switch (length) {
          case 0:
            return this.length;
          case -1:
            return Math.min(this.length, lenZ);
          default:
            return Math.min(this.length, length);
        }
      }).call(this);
      if (lenZ === lenW) {
        buf = this.bufs.shift();
      } else if (lenZ > lenW) {
        buf = this.bufs[0].slice(0, lenW);
        this.bufs[0] = this.bufs[0].slice(lenW);
      } else if (lenW === this.length) {
        local_left = null;
        if (this.left !== 0) {
          lastbuf = this.bufs[this.bufs.length - 1];
          if (this.left === lastbuf.length) {
            local_left = this.bufs.pop();
          } else {
            local_left = lastbuf.slice(lastbuf.length - this.left);
          }
        }
        buf = Buffer.concat(this.bufs, this.length);
        this.bufs = local_left ? [local_left] : [];
      } else {
        some = [];
        got = 0;
        while (got < lenW) {
          b = this.bufs.shift();
          some.push(b);
          got += b.length;
        }
        buf = Buffer.concat(some, lenW);
        if (got > lenW) {
          last = some[some.length - 1];
          left = got - lenW;
          this.bufs.unshift(last.slice(last.length - left));
        }
      }
      this.length -= lenW;
      this.emit('read', buf);
      return buf;
    };

    BufferStream.prototype.isEOF = function() {
      return (this.length === 0) && this._writableState.finished;
    };

    BufferStream.prototype.wait = function(length, cb) {
      if (this.waitingCB) {
        throw new Error('Invalid state.  Cannot wait while already waiting.');
      }
      if (!((typeof length === 'number') && (length >= 0))) {
        throw new Error("length required, must be non-negative number: " + length);
      }
      if (typeof cb !== 'function') {
        throw new Error('cb required, must be function');
      }
      if (length === 0) {
        return process.nextTick((function(_this) {
          return function() {
            return cb.call(_this, null, EMPTY);
          };
        })(this));
      } else {
        this.waitingCB = cb;
        this.waitingLen = length;
        if (this.length >= length) {
          return this._notifyWaiter();
        } else if (this._writableState.ended) {
          return this._resetCB(createEOF());
        }
      }
    };

    BufferStream.prototype.clear = function() {
      this.bufs = [];
      this.length = 0;
      return this.left = 0;
    };

    BufferStream.prototype._trimLast = function() {
      var last, old;
      old = this.left;
      if (this.left > 0) {
        last = this.bufs.pop();
        if (this.left !== last.length) {
          this.bufs.push(last.slice(0, last.length - this.left));
        }
        this.left = 0;
      }
      return old;
    };

    BufferStream.prototype._lengthen = function(size) {
      var len;
      assert.ok(size > 0);
      this.length += size;
      len = this.length;
      if (this.length >= this.waitingLen) {
        this._notifyWaiter();
      }
      return len;
    };

    BufferStream.prototype.grow = function(size) {
      var b, s;
      this._trimLast();
      s = size != null ? size : this.growSize;
      b = new Buffer(s);
      if (this.zero) {
        b.fill(0);
      }
      this.bufs.push(b);
      this.left = s;
      return b;
    };

    BufferStream.prototype.append = function(buf) {
      var lastbuf, len;
      assert.ok(Buffer.isBuffer(buf));
      len = buf.length;
      if (len === 0) {
        return;
      }
      if (this.left === 0) {
        this.bufs.push(buf);
      } else if (len > this.left) {
        this._trimLast();
        this.bufs.push(buf);
      } else {
        lastbuf = this.bufs[this.bufs.length - 1];
        buf.copy(lastbuf, lastbuf.length - this.left);
        this.left -= len;
      }
      return this._lengthen(len);
    };

    BufferStream.prototype.flatten = function() {
      var b;
      if (this.length === 0) {
        this.left = 0;
        this.bufs = [];
        return EMPTY;
      }
      b = null;
      switch (this.bufs.length) {
        case 0:
          // istanbul ignore next;
          assert.fail(this.length, "Invalid state.  No buffers when length>0.");
          // istanbul ignore next;
          break;
        case 1:
          if (this.left === 0) {
            b = this.bufs[0];
          } else {
            b = this.bufs[0].slice(0, this.length);
            this.bufs = [b];
            this.left = 0;
          }
          break;
        default:
          if (this.left === this.bufs[this.bufs.length - 1].length) {
            this.bufs.pop();
          }
          b = Buffer.concat(this.bufs, this.length);
          this.bufs = [b];
          this.left = 0;
      }
      return b;
    };

    BufferStream.prototype.slice = function(start, end) {
      return this.flatten().slice(start, end);
    };

    BufferStream.prototype.fill = function(val, offset, end) {
      return this.flatten().fill(val, offset, end);
    };

    BufferStream.prototype.toJSON = function() {
      return this.flatten().toJSON();
    };

    BufferStream.prototype.toString = function(encoding) {
      if (encoding == null) {
        encoding = 'hex';
      }
      return this.flatten().toString(encoding);
    };

    BufferStream.prototype.ensure = function(len) {
      if (this.left < len) {
        return this.grow(Math.max(this.growSize, len));
      } else {
        return this.bufs[this.bufs.length - 1];
      }
    };

    BufferStream.prototype.writeString = function(value, length, encoding) {
      var b;
      if (encoding == null) {
        encoding = 'utf8';
      }
      if (length == null) {
        length = Buffer.byteLength(value, encoding);
      }
      if (length === 0) {
        return;
      }
      b = this.ensure(length);
      b.write(value, b.length - this.left, length, encoding);
      this.left -= length;
      return this._lengthen(length);
    };

    BufferStream._write_gen = function(meth, len) {
      return function(val) {
        var b;
        b = this.ensure(len);
        b[meth].call(b, val, b.length - this.left, true);
        this.left -= len;
        return this._lengthen(len);
      };
    };

    BufferStream.prototype.writeUInt8 = BufferStream._write_gen('writeUInt8', 1);

    BufferStream.prototype.writeUInt16LE = BufferStream._write_gen('writeUInt16LE', 2);

    BufferStream.prototype.writeUInt16BE = BufferStream._write_gen('writeUInt16BE', 2);

    BufferStream.prototype.writeUInt32LE = BufferStream._write_gen('writeUInt32LE', 4);

    BufferStream.prototype.writeUInt32BE = BufferStream._write_gen('writeUInt32BE', 4);

    BufferStream.prototype.writeInt8 = BufferStream._write_gen('writeInt8', 1);

    BufferStream.prototype.writeInt16LE = BufferStream._write_gen('writeInt16LE', 2);

    BufferStream.prototype.writeInt16BE = BufferStream._write_gen('writeInt16BE', 2);

    BufferStream.prototype.writeInt32LE = BufferStream._write_gen('writeInt32LE', 4);

    BufferStream.prototype.writeInt32BE = BufferStream._write_gen('writeInt32BE', 4);

    BufferStream.prototype.writeFloatLE = BufferStream._write_gen('writeFloatLE', 4);

    BufferStream.prototype.writeFloatBE = BufferStream._write_gen('writeFloatBE', 4);

    BufferStream.prototype.writeDoubleLE = BufferStream._write_gen('writeDoubleLE', 8);

    BufferStream.prototype.writeDoubleBE = BufferStream._write_gen('writeDoubleBE', 8);

    return BufferStream;

  })(stream.Writable);

  module.exports = BufferStream;

}).call(this);
