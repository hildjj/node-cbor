(function() {
  var BREAK, BufferStream, Evented, MT, Simple, assert, async, constants, stream, utils,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  assert = require('assert');

  stream = require('stream');

  async = require('async');

  BufferStream = require('./BufferStream');

  utils = require('./utils');

  Simple = require('./simple');

  constants = require('./constants');

  MT = constants.MT;

  // istanbul ignore next;

  BREAK = function() {
    return "BREAK";
  };

  module.exports = Evented = (function(_super) {
    __extends(Evented, _super);

    function Evented(options) {
      this._pump = __bind(this._pump, this);
      var buf, input;
      Evented.__super__.constructor.call(this);
      this.options = utils.extend({
        max_depth: 512,
        input: null,
        offset: 0,
        encoding: 'hex'
      }, options);
      this.bs = null;
      this.tags = [];
      this.kind = null;
      this.depth = 0;
      this.last_err = null;
      this.on('finish', (function(_this) {
        return function() {
          return _this.bs.end();
        };
      })(this));
      if (this.options.input != null) {
        input = this.options.input;
        buf = null;
        if (Buffer.isBuffer(input)) {
          buf = input;
        } else if (typeof input === 'string') {
          if (this.options.encoding === 'hex') {
            input = input.replace(/^0x/, '');
          }
          buf = new Buffer(input, this.options.encoding);
        } else if (BufferStream.isBufferStream(input)) {
          this.bs = input;
          return this._start;
        } else {
          throw new Error("input must be Buffer, string, or BufferStream");
        }
        if (this.options.offset) {
          buf = buf.slice(this.options.offset);
        }
        this.bs = new BufferStream({
          bsInit: buf
        });
        this._start;
      } else {
        this.bs = new BufferStream;
        this._pump();
      }
    }

    Evented.prototype.start = function() {
      return this._pump();
    };

    Evented.prototype.error = function(er) {
      return this.last_er = er;
    };

    Evented.prototype._write = function(chunk, enc, next) {
      return this.bs.write(chunk, enc, next);
    };

    Evented.prototype._drainState = function() {
      var kind, tags, _ref;
      tags = this.tags.slice();
      this.tags.length = 0;
      _ref = [null, this.kind], this.kind = _ref[0], kind = _ref[1];
      return [tags, kind];
    };

    Evented.prototype._val = function(val, cb) {
      var kind, tags, _ref;
      _ref = this._drainState(), tags = _ref[0], kind = _ref[1];
      this.emit('value', val, tags, kind);
      return cb.call(this, this.last_er, val);
    };

    Evented.prototype._readBuf = function(len, cb) {
      return this.bs.wait(len, (function(_this) {
        return function(er, buf) {
          if (er) {
            return cb.call(_this, er);
          }
          return _this._val(buf, cb);
        };
      })(this));
    };

    Evented.prototype._readStr = function(len, cb) {
      return this.bs.wait(len, (function(_this) {
        return function(er, buf) {
          if (er) {
            return cb.call(_this, er);
          }
          return _this._val(buf.toString('utf8'), cb);
        };
      })(this));
    };

    Evented.prototype._readArray = function(count, cb) {
      var kind, tags, _ref;
      _ref = this._drainState(), tags = _ref[0], kind = _ref[1];
      this.emit('array-start', count, tags, kind);
      return async.timesSeries(count, (function(_this) {
        return function(n, done) {
          _this.kind = n ? 'array' : 'array-first';
          return _this._unpack(done);
        };
      })(this), (function(_this) {
        return function(er) {
          if (er) {
            return cb.call(_this, er);
          }
          _this.emit('array-stop', count, tags, kind);
          _this.mt = MT.ARRAY;
          return cb.call(_this);
        };
      })(this));
    };

    Evented.prototype._readMap = function(count, cb) {
      var kind, tags, up, _ref;
      _ref = this._drainState(), tags = _ref[0], kind = _ref[1];
      this.emit('map-start', count, tags, kind);
      up = this._unpack.bind(this);
      return async.timesSeries(count, (function(_this) {
        return function(n, done) {
          return async.series([
            function(cb) {
              _this.kind = n ? 'key' : 'key-first';
              return up(cb);
            }, function(cb) {
              _this.kind = 'value';
              return up(cb);
            }
          ], done);
        };
      })(this), (function(_this) {
        return function(er) {
          if (er) {
            return cb.call(_this, er);
          }
          _this.emit('map-stop', count, tags, kind);
          _this.mt = MT.MAP;
          return cb.call(_this);
        };
      })(this));
    };

    Evented.prototype._readTag = function(val, cb) {
      this.tags.push(val);
      return this._unpack(cb);
    };

    Evented.prototype._readSimple = function(val, cb) {
      switch (val) {
        case 20:
          return this._val(false, cb);
        case 21:
          return this._val(true, cb);
        case 22:
          return this._val(null, cb);
        case 23:
          return this._val(void 0, cb);
        default:
          return this._val(new Simple(val), cb);
      }
    };

    Evented.prototype._getVal = function(val, cb) {
      switch (this.mt) {
        case MT.POS_INT:
          return this._val(val, cb);
        case MT.NEG_INT:
          return this._val(-1 - val, cb);
        case MT.BYTE_STRING:
          return this._readBuf(val, cb);
        case MT.UTF8_STRING:
          return this._readStr(val, cb);
        case MT.ARRAY:
          return this._readArray(val, cb);
        case MT.MAP:
          return this._readMap(val, cb);
        case MT.TAG:
          return this._readTag(val, cb);
        case MT.SIMPLE_FLOAT:
          return this._readSimple(val, cb);
        default:
          // istanbul ignore next;
          return cb.call(this, new Error("Unknown major type(" + this.mt + "): " + val));
      }
    };

    Evented.prototype._stream_stringy = function(cb) {
      var count, keep_going, kind, mt, tags, _ref;
      mt = this.mt;
      _ref = this._drainState(), tags = _ref[0], kind = _ref[1];
      count = 0;
      this.emit('stream-start', mt, tags, kind);
      keep_going = true;
      return async.doWhilst((function(_this) {
        return function(done) {
          _this.kind = count ? 'stream' : 'stream-first';
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
              count++;
            }
            return done();
          });
        };
      })(this), function() {
        return keep_going;
      }, (function(_this) {
        return function(er) {
          if (er) {
            return cb.call(_this, er);
          }
          _this.emit('stream-stop', count, mt, tags, kind);
          return cb.call(_this);
        };
      })(this));
    };

    Evented.prototype._stream_array = function(cb) {
      var count, keep_going, kind, mt, tags, _ref;
      mt = this.mt;
      _ref = this._drainState(), tags = _ref[0], kind = _ref[1];
      count = 0;
      this.emit('array-start', -1, tags, kind);
      keep_going = true;
      return async.doWhilst((function(_this) {
        return function(done) {
          _this.kind = count ? 'array' : 'array-first';
          return _this._unpack(function(er, val) {
            if (er) {
              return done(er);
            }
            if (val === BREAK) {
              keep_going = false;
            } else {
              count++;
            }
            return done();
          });
        };
      })(this), function() {
        return keep_going;
      }, (function(_this) {
        return function(er) {
          if (er) {
            return cb.call(_this, er);
          }
          _this.emit('array-stop', count, tags, kind);
          return cb.call(_this);
        };
      })(this));
    };

    Evented.prototype._stream_map = function(cb) {
      var count, keep_going, kind, mt, tags, _ref;
      mt = this.mt;
      _ref = this._drainState(), tags = _ref[0], kind = _ref[1];
      count = 0;
      this.emit('map-start', -1, tags, kind);
      keep_going = true;
      return async.doWhilst((function(_this) {
        return function(done) {
          _this.kind = count ? 'key' : 'key-first';
          return _this._unpack(function(er, val) {
            if (er) {
              return done(er);
            }
            if (val === BREAK) {
              keep_going = false;
              return done();
            } else {
              count++;
              _this.kind = 'value';
              return _this._unpack(done);
            }
          });
        };
      })(this), function() {
        return keep_going;
      }, (function(_this) {
        return function(er) {
          if (er) {
            return cb.call(_this, er);
          }
          _this.emit('map-stop', count, tags, kind);
          return cb.call(_this);
        };
      })(this));
    };

    Evented.prototype._stream = function(cb) {
      var kind, tags, _ref;
      switch (this.mt) {
        case MT.BYTE_STRING:
        case MT.UTF8_STRING:
          return this._stream_stringy(cb);
        case MT.ARRAY:
          return this._stream_array(cb);
        case MT.MAP:
          return this._stream_map(cb);
        case MT.SIMPLE_FLOAT:
          _ref = this._drainState(), tags = _ref[0], kind = _ref[1];
          return cb.call(this, null, BREAK);
        default:
          // istanbul ignore next;
          return cb.call(this, new Error("Invalid stream major type: " + this.mt));
      }
    };

    Evented.prototype._unpack = function(cb) {
      return this.bs.wait(1, (function(_this) {
        return function(er, buf) {
          var decrement;
          if (er) {
            return cb(er);
          }
          _this.depth++;
          if (_this.depth > _this.options.max_depth) {
            return cb.call(_this, new Error("Maximum depth exceeded: " + _this.depth));
          }
          _this.octet = buf[0];
          _this.mt = _this.octet >> 5;
          _this.ai = _this.octet & 0x1f;
          decrement = function(er) {
            if (!(er instanceof Error)) {
              _this.depth--;
            }
            return cb.apply(_this, arguments);
          };
          switch (_this.ai) {
            case 24:
            case 25:
            case 26:
            case 27:
              return _this.bs.wait(1 << (_this.ai - 24), function(er, buf) {
                if (er) {
                  return cb(er);
                }
                if (_this.mt === MT.SIMPLE_FLOAT) {
                  if (_this.ai === 24) {
                    return _this._readSimple(utils.parseInt(_this.ai, buf), decrement);
                  } else {
                    return _this._val(utils.parseFloat(_this.ai, buf), decrement);
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
              return _this._stream(decrement);
            default:
              return _this._getVal(_this.ai, decrement);
          }
        };
      })(this));
    };

    Evented.prototype._pump = function(er) {
      if (er) {
        if (BufferStream.isEOFError(er) && (this.depth === 0)) {
          return this.emit('end');
        } else {
          return this.emit('error', er);
        }
      }
      return async.nextTick((function(_this) {
        return function() {
          if (_this.bs.isEOF()) {
            return _this.emit('end');
          } else {
            return _this._unpack(_this._pump);
          }
        };
      })(this));
    };

    return Evented;

  })(stream.Writable);

}).call(this);
