(function() {
  var BREAK, BufferStream, Commented, MT, Simple, assert, async, stream, util, utils,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  assert = require('assert');

  stream = require('stream');

  util = require('util');

  async = require('async');

  BufferStream = require('./BufferStream');

  utils = require('./utils');

  Simple = require('./simple');

  MT = require('./constants').MT;

  // istanbul ignore next;

  BREAK = function() {
    return "BREAK";
  };

  module.exports = Commented = (function(_super) {
    __extends(Commented, _super);

    function Commented(options) {
      this._pump = __bind(this._pump, this);
      var buf, encoding, input, _ref;
      Commented.__super__.constructor.call(this);
      this.bs = null;
      this.depth = 0;
      this.asRead = new BufferStream({
        bsStartEmpty: true
      });
      _ref = utils.extend({
        output: process.stdout,
        max_depth: 10,
        encoding: 'hex'
      }, options), input = _ref.input, this.output = _ref.output, this.max_depth = _ref.max_depth, encoding = _ref.encoding;
      buf = Buffer.isBuffer(input) ? input : typeof input === 'string' ? (input = input.replace(/^0x/, ''), new Buffer(input, encoding)) : null;
      this.bs = new BufferStream({
        bsInit: buf
      });
      this.bs.on('read', (function(_this) {
        return function(buf) {
          return _this.asRead.append(buf);
        };
      })(this));
      this.on('finish', (function(_this) {
        return function() {
          return _this.bs.end();
        };
      })(this));
      if (!buf) {
        this.start();
      }
    }

    Commented.prototype.start = function() {
      return this._pump();
    };

    Commented.comment = function(input, max_depth, cb) {
      var c, output, _ref;
      if (max_depth == null) {
        max_depth = 10;
      }
      if (input == null) {
        throw new Error("input is required");
      }
      if (typeof max_depth === 'function') {
        _ref = [max_depth, 10], cb = _ref[0], max_depth = _ref[1];
      }
      c = output = null;
      if (cb != null) {
        output = new BufferStream;
        c = new Commented({
          input: input,
          output: output,
          max_depth: max_depth
        });
        c.on('end', function(buf) {
          return cb(null, output.toString('utf8'));
        });
        c.on('error', cb);
      } else {
        c = new Commented({
          input: input,
          max_depth: max_depth
        });
      }
      return c.start();
    };

    Commented.prototype._write = function(chunk, enc, next) {
      return this.bs.write(chunk, enc, next);
    };

    Commented.prototype._out = function() {
      return this.output.write(util.format.apply(util, arguments));
    };

    Commented.prototype._indent = function(prefix) {
      var ind;
      this._out(new Array(this.depth + 1).join("  "));
      this._out(prefix);
      ind = (this.max_depth - this.depth) * 2;
      ind -= prefix.length;
      if (ind < 1) {
        ind = 1;
      }
      this._out(new Array(ind + 1).join(" "));
      return this._out("-- ");
    };

    Commented.prototype._val = function(val, cb) {
      return cb.call(this, null, val);
    };

    Commented.prototype._readBuf = function(len, cb) {
      return this.bs.wait(len, (function(_this) {
        return function(er, buf) {
          if (er) {
            return cb.call(_this, er);
          }
          _this.depth++;
          _this._indent(buf.toString('hex'));
          _this._out("Bytes content\n");
          _this.depth--;
          return _this._val(buf, cb);
        };
      })(this));
    };

    Commented.prototype._readStr = function(len, cb) {
      return this.bs.wait(len, (function(_this) {
        return function(er, buf) {
          var u;
          if (er) {
            return cb.call(_this, er);
          }
          u = buf.toString('utf8');
          _this.depth++;
          _this._indent(buf.toString('hex'));
          _this._out('"%s"\n', u);
          _this.depth--;
          return _this._val(u, cb);
        };
      })(this));
    };

    Commented.prototype._readArray = function(count, cb) {
      return async.timesSeries(count, (function(_this) {
        return function(n, done) {
          return _this._unpack(done, "Array[" + n + "]: ");
        };
      })(this), (function(_this) {
        return function(er) {
          if (er) {
            return cb.call(_this, er);
          }
          _this.mt = MT.ARRAY;
          return cb.call(_this);
        };
      })(this));
    };

    Commented.prototype._readMap = function(count, cb) {
      return async.timesSeries(count, (function(_this) {
        return function(n, done) {
          return async.series([
            function(cb) {
              return _this._unpack(cb, "Map[" + n + "].key: ");
            }, function(cb) {
              return _this._unpack(cb, "Map[" + n + "].value: ");
            }
          ], done);
        };
      })(this), (function(_this) {
        return function(er) {
          if (er) {
            return cb.call(_this, er);
          }
          _this.mt = MT.MAP;
          return cb.call(_this);
        };
      })(this));
    };

    Commented.prototype._readSimple = function(val, cb) {
      var v;
      v = (function() {
        switch (val) {
          case 20:
            return false;
          case 21:
            return true;
          case 22:
            return null;
          case 23:
            return void 0;
          default:
            return new Simple(val);
        }
      })();
      this._out("%s\n", v);
      return this._val(v, cb);
    };

    Commented.prototype._getVal = function(val, cb) {
      switch (this.mt) {
        case MT.POS_INT:
          this._out("%d\n", val);
          return this._val(val, cb);
        case MT.NEG_INT:
          this._out("%d\n", -1 - val);
          return this._val(-1 - val, cb);
        case MT.BYTE_STRING:
          this._out("Byte string length %d\n", val);
          return this._readBuf(val, cb);
        case MT.UTF8_STRING:
          this._out("UTF-8 string length %d\n", val);
          return this._readStr(val, cb);
        case MT.ARRAY:
          this._out("Array of length %d\n", val);
          return this._readArray(val, cb);
        case MT.MAP:
          this._out("Map with %d pairs\n", val);
          return this._readMap(val, cb);
        case MT.TAG:
          this._out("Tag %d\n", val);
          return this._unpack(cb);
        case MT.SIMPLE_FLOAT:
          return this._readSimple(val, cb);
        default:
          // istanbul ignore next;
          return cb.call(this, new Error("Unknown major type(" + this.mt + "): " + val));
      }
    };

    Commented.prototype._stream_stringy = function(cb) {
      var count, keep_going, mt;
      mt = this.mt;
      count = 0;
      keep_going = true;
      this._out("Start indefinite-length string\n");
      return async.doWhilst((function(_this) {
        return function(done) {
          return _this._unpack(function(er, val) {
            if (er) {
              return done(er);
            }
            if (val === BREAK) {
              keep_going = false;
            } else {
              if (_this.mt !== mt) {
                done(new Error("Invalid stream major type: " + _this.mt + ", when anticipating only " + mt));
                return;
              }
            }
            return done();
          });
        };
      })(this), function() {
        count++;
        return keep_going;
      }, cb);
    };

    Commented.prototype._stream_array = function(cb) {
      var count, keep_going, mt;
      mt = this.mt;
      count = 0;
      keep_going = true;
      this._out("Start indefinite-length array\n");
      return async.doWhilst((function(_this) {
        return function(done) {
          return _this._unpack(function(er, val) {
            if (er) {
              return done(er);
            }
            if (val === BREAK) {
              keep_going = false;
            }
            return done();
          });
        };
      })(this), function() {
        count++;
        return keep_going;
      }, cb);
    };

    Commented.prototype._stream_map = function(cb) {
      var count, keep_going, mt;
      mt = this.mt;
      count = 0;
      keep_going = true;
      this._out("Start indefinite-length map\n");
      return async.doWhilst((function(_this) {
        return function(done) {
          return _this._unpack(function(er, val) {
            if (er) {
              return done(er);
            }
            if (val === BREAK) {
              keep_going = false;
              return done();
            } else {
              return _this._unpack(done, "Map[" + count + "].value: ");
            }
          }, "Map[" + count + "].key: ");
        };
      })(this), function() {
        count++;
        return keep_going;
      }, cb);
    };

    Commented.prototype._stream = function(cb) {
      switch (this.mt) {
        case MT.BYTE_STRING:
        case MT.UTF8_STRING:
          return this._stream_stringy(cb);
        case MT.ARRAY:
          return this._stream_array(cb);
        case MT.MAP:
          return this._stream_map(cb);
        case MT.SIMPLE_FLOAT:
          this._out('BREAK\n');
          return cb.call(this, null, BREAK);
        default:
          // istanbul ignore next;
          return cb.call(this, new Error("Invalid stream major type: " + this.mt));
      }
    };

    Commented.prototype._unpack = function(cb, extra) {
      if (extra == null) {
        extra = "";
      }
      return this.bs.wait(1, (function(_this) {
        return function(er, buf) {
          var decrement, hex;
          if (er) {
            return cb(er);
          }
          _this.octet = buf[0];
          hex = buf.toString('hex');
          _this.mt = _this.octet >> 5;
          _this.ai = _this.octet & 0x1f;
          decrement = function(er) {
            if (!(er instanceof Error)) {
              _this.depth--;
            }
            return cb.apply(_this, arguments);
          };
          _this.depth++;
          switch (_this.ai) {
            case 24:
            case 25:
            case 26:
            case 27:
              return _this.bs.wait(1 << (_this.ai - 24), function(er, buf) {
                var fl;
                if (er) {
                  return cb(er);
                }
                _this._indent(hex + buf.toString('hex'));
                _this._out(extra);
                if (_this.mt === MT.SIMPLE_FLOAT) {
                  if (_this.ai === 24) {
                    return _this._readSimple(utils.parseInt(_this.ai, buf), decrement);
                  } else {
                    fl = utils.parseFloat(_this.ai, buf);
                    _this._out("" + fl + "\n");
                    return _this._val(fl, decrement);
                  }
                } else {
                  return _this._getVal(utils.parseInt(_this.ai, buf), decrement);
                }
              });
            case 28:
            case 29:
            case 30:
              return cb(new Error("Additional info not implemented: " + _this.ai));
            case 31:
              _this._indent(hex);
              return _this._stream(decrement);
            default:
              _this._indent(hex);
              _this._out(extra);
              return _this._getVal(_this.ai, decrement);
          }
        };
      })(this));
    };

    Commented.prototype._pump = function(er) {
      var buf;
      if (er) {
        if (BufferStream.isEOFError(er) && (this.depth === 0)) {
          buf = this.asRead.read();
          if (buf.length > 0) {
            this._out('0x%s\n', buf.toString('hex'));
          }
          return this.emit('end', buf);
        } else {
          return this.emit('error', er);
        }
      }
      return async.nextTick((function(_this) {
        return function() {
          if (_this.bs.isEOF()) {
            buf = _this.asRead.read();
            if (buf.length > 0) {
              _this._out('0x%s\n', buf.toString('hex'));
            }
            return _this.emit('end', buf);
          } else {
            return _this._unpack(_this._pump);
          }
        };
      })(this));
    };

    return Commented;

  })(stream.Writable);

}).call(this);
