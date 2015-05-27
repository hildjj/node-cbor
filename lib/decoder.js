(function() {
  var BufferStream, DEFAULT_TAG_FUNCS, Decoder, Evented, MINUS_ONE, MT, TAG, TEN, TWO, Tagged, bignumber, f, k, ref, stream, url, utils, v,
    bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  stream = require('stream');

  url = require('url');

  bignumber = require('bignumber.js');

  BufferStream = require('./BufferStream');

  Tagged = require('./tagged');

  utils = require('./utils');

  Evented = require('./evented');

  ref = require('./constants'), TAG = ref.TAG, MT = ref.MT;

  MINUS_ONE = new bignumber(-1);

  TEN = new bignumber(10);

  TWO = new bignumber(2);

  DEFAULT_TAG_FUNCS = {};

  module.exports = Decoder = (function(superClass) {
    extend(Decoder, superClass);

    function Decoder(options) {
      this.options = options != null ? options : {};
      this._on_end = bind(this._on_end, this);
      this._on_stream_stop = bind(this._on_stream_stop, this);
      this._on_stream_start = bind(this._on_stream_start, this);
      this._on_map_stop = bind(this._on_map_stop, this);
      this._on_map_start = bind(this._on_map_start, this);
      this._on_array_stop = bind(this._on_array_stop, this);
      this._on_array_start = bind(this._on_array_start, this);
      this._on_value = bind(this._on_value, this);
      this._on_error = bind(this._on_error, this);
      Decoder.__super__.constructor.call(this);
      this.tags = utils.extend({}, DEFAULT_TAG_FUNCS, this.options.tags);
      this.stack = [];
      this.parser = new Evented({
        input: this.options.input
      });
      this.parser.on('value', this._on_value);
      this.parser.on('array-start', this._on_array_start);
      this.parser.on('array-stop', this._on_array_stop);
      this.parser.on('map-start', this._on_map_start);
      this.parser.on('map-stop', this._on_map_stop);
      this.parser.on('stream-start', this._on_stream_start);
      this.parser.on('stream-stop', this._on_stream_stop);
      this.parser.on('end', this._on_end);
      this.parser.on('error', this._on_error);
      this.on('finish', (function(_this) {
        return function() {
          return _this.parser.end();
        };
      })(this));
    }

    Decoder.prototype.start = function() {
      return this.parser.start();
    };

    Decoder.prototype._on_error = function(er) {
      return this.emit('error', er);
    };

    Decoder.prototype._process = function(val, tags, kind) {
      var er, f, i, key, ref1, t;
      for (i = tags.length - 1; i >= 0; i += -1) {
        t = tags[i];
        try {
          f = this.tags[t];
          if (f != null) {
            val = (ref1 = f.call(this, val)) != null ? ref1 : new Tagged(t, val);
          } else {
            val = new Tagged(t, val);
          }
        } catch (_error) {
          er = _error;
          val = new Tagged(t, val, er);
        }
      }
      switch (kind) {
        case null:
          return this.emit('complete', val);
        case 'array-first':
        case 'array':
          return this.last.push(val);
        case 'key-first':
        case 'key':
          return this.stack.push(val);
        case 'stream-first':
        case 'stream':
          switch (this.mt) {
            case MT.BYTE_STRING:
              if (!Buffer.isBuffer(val)) {
                this.parser.error(new Error('Bad input in stream, expected buffer'));
                return;
              }
              break;
            case MT.UTF8_STRING:
              if (typeof val !== 'string') {
                this.parser.error(new Error('Bad input in stream, expected string'));
                return;
              }
              break;
            default:
              // istanbul ignore next;
              throw new Error('Unknown stream type');
          }
          return this.last.write(val);
        case 'value':
          key = this.stack.pop();
          this.last[key] = val;
          return // istanbul ignore next;
        default:
          return this.parser.error(new Error("Unknown event kind: " + kind));
      }
    };

    Decoder.prototype._on_value = function(val, tags, kind) {
      return this._process(val, tags, kind);
    };

    Decoder.prototype._on_array_start = function(count, tags, kind) {
      if (this.last != null) {
        this.stack.push(this.last);
      }
      return this.last = [];
    };

    Decoder.prototype._on_array_stop = function(count, tags, kind) {
      var ref1, val;
      ref1 = [this.last, this.stack.pop()], val = ref1[0], this.last = ref1[1];
      return this._process(val, tags, kind);
    };

    Decoder.prototype._on_map_start = function(count, tags, kind) {
      if (this.last != null) {
        this.stack.push(this.last);
      }
      return this.last = {};
    };

    Decoder.prototype._on_map_stop = function(count, tags, kind) {
      var ref1, val;
      ref1 = [this.last, this.stack.pop()], val = ref1[0], this.last = ref1[1];
      return this._process(val, tags, kind);
    };

    Decoder.prototype._on_stream_start = function(mt, tags, kind) {
      if (this.last != null) {
        this.stack.push([this.last, this.mt]);
      }
      this.mt = mt;
      return this.last = new BufferStream;
    };

    Decoder.prototype._on_stream_stop = function(count, mt, tags, kind) {
      var lm, val;
      val = this.last.read();
      lm = this.stack.pop();
      if (lm) {
        this.last = lm[0], this.mt = lm[1];
      }
      if (mt === MT.UTF8_STRING) {
        val = val.toString('utf8');
      }
      return this._process(val, tags, kind);
    };

    Decoder.prototype._on_end = function() {
      return this.emit('end');
    };

    Decoder.prototype._write = function(buf, offset, encoding) {
      return this.parser.write(buf, offset, encoding);
    };

    Decoder.decode = function(buf, cb) {
      var actual, d;
      if (cb == null) {
        throw new Error("cb must be specified");
      }
      d = new Decoder({
        input: buf
      });
      actual = [];
      d.on('complete', function(v) {
        return actual.push(v);
      });
      d.on('end', function() {
        return cb(null, actual);
      });
      d.on('error', cb);
      return d.start();
    };

    Decoder._tag_DATE_STRING = function(val) {
      return new Date(val);
    };

    Decoder._tag_DATE_EPOCH = function(val) {
      return new Date(val * 1000);
    };

    Decoder._tag_POS_BIGINT = function(val) {
      return utils.bufferToBignumber(val);
    };

    Decoder._tag_NEG_BIGINT = function(val) {
      return MINUS_ONE.minus(utils.bufferToBignumber(val));
    };

    Decoder._tag_DECIMAL_FRAC = function(val) {
      var e, m;
      e = val[0], m = val[1];
      return TEN.pow(e).times(m);
    };

    Decoder._tag_BIGFLOAT = function(val) {
      var e, m;
      e = val[0], m = val[1];
      return TWO.pow(e).times(m);
    };

    Decoder._tag_URI = function(val) {
      return url.parse(val);
    };

    Decoder._tag_REGEXP = function(val) {
      return new RegExp(val);
    };

    return Decoder;

  })(stream.Writable);

  for (k in TAG) {
    v = TAG[k];
    f = Decoder["_tag_" + k];
    if (typeof f === 'function') {
      DEFAULT_TAG_FUNCS[v] = f;
    }
  }

}).call(this);

//# sourceMappingURL=decoder.js.map
