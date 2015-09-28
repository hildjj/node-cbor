(function() {
  var BufferStream, Decoder, Diagnose, MT, SYMS, Simple, bignumber, ref, stream, util, utils,
    bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  stream = require('stream');

  util = require('util');

  Decoder = require('./decoder');

  BufferStream = require('./BufferStream');

  Simple = require('./simple');

  utils = require('./utils');

  ref = require('./constants'), MT = ref.MT, SYMS = ref.SYMS;

  bignumber = require('bignumber.js');

  module.exports = Diagnose = (function(superClass) {
    extend(Diagnose, superClass);

    function Diagnose(options) {
      var ref1, ref2;
      if (options == null) {
        options = {};
      }
      this._on_data = bind(this._on_data, this);
      this._on_stop = bind(this._on_stop, this);
      this._on_start = bind(this._on_start, this);
      this._on_value = bind(this._on_value, this);
      this._on_error = bind(this._on_error, this);
      this.separator = (ref1 = options.separator) != null ? ref1 : '\n';
      delete options.separator;
      this.stream_errors = (ref2 = options.stream_errors) != null ? ref2 : false;
      delete options.stream_errors;
      options.readableObjectMode = false;
      options.writableObjectMode = false;
      Diagnose.__super__.constructor.call(this, options);
      this.parser = new Decoder(options);
      this.parser.on('value', this._on_value);
      this.parser.on('start', this._on_start);
      this.parser.on('stop', this._on_stop);
      this.parser.on('data', this._on_data);
      this.parser.on('error', this._on_error);
    }

    Diagnose.prototype._transform = function(fresh, encoding, cb) {
      return this.parser.write(fresh, encoding, function(er) {
        return cb(er);
      });
    };

    Diagnose.prototype._flush = function(cb) {
      return this.parser._flush(cb);
    };

    Diagnose.diagnose = function(input, encoding, cb) {
      var bs, d, opts, p;
      if (input == null) {
        throw new Error('input required');
      }
      opts = {};
      switch (typeof encoding) {
        case 'function':
          cb = encoding;
          encoding = typeof input === 'string' ? 'hex' : void 0;
          break;
        case 'object':
          opts = encoding;
          encoding = opts.encoding;
          delete opts.encoding;
      }
      bs = new BufferStream;
      d = new Diagnose(opts);
      p = null;
      if (typeof cb === 'function') {
        d.on('end', function() {
          return cb(null, bs.toString('utf8'));
        });
        d.on('error', cb);
      } else {
        p = new Promise(function(resolve, reject) {
          d.on('end', function() {
            return resolve(bs.toString('utf8'));
          });
          return d.on('error', reject);
        });
      }
      d.pipe(bs);
      d.end(input, encoding);
      return p;
    };

    Diagnose.prototype._on_error = function(er) {
      if (this.stream_errors) {
        this.push(er.toString());
      }
      return this.emit('error', er);
    };

    Diagnose.prototype._fore = function(parent_mt, pos) {
      switch (parent_mt) {
        case MT.BYTE_STRING:
        case MT.UTF8_STRING:
        case MT.ARRAY:
          if (pos > 0) {
            return this.push(', ');
          }
          break;
        case MT.MAP:
          if (pos > 0) {
            if (pos % 2) {
              return this.push(': ');
            } else {
              return this.push(', ');
            }
          }
      }
    };

    Diagnose.prototype._on_value = function(val, parent_mt, pos) {
      if (val === SYMS.BREAK) {
        return;
      }
      this._fore(parent_mt, pos);
      return this.push((function() {
        switch (false) {
          case val !== SYMS.NULL:
            return "null";
          case val !== SYMS.UNDEFINED:
            return "undefined";
          case typeof val !== 'string':
            return JSON.stringify(val);
          case !Buffer.isBuffer(val):
            return "h'" + (val.toString("hex")) + "'";
          case !(val instanceof bignumber):
            return val.toString();
          default:
            return util.inspect(val);
        }
      })());
    };

    Diagnose.prototype._on_start = function(mt, tag, parent_mt, pos) {
      this._fore(parent_mt, pos);
      this.push((function() {
        switch (mt) {
          case MT.TAG:
            return tag + "(";
          case MT.ARRAY:
            return "[";
          case MT.MAP:
            return "{";
          case MT.BYTE_STRING:
          case MT.UTF8_STRING:
            return "(";
          default:
            throw new Error("Unknown diagnostic type: " + mt);
        }
      })());
      if (tag === SYMS.STREAM) {
        return this.push("_ ");
      }
    };

    Diagnose.prototype._on_stop = function(mt) {
      return this.push((function() {
        switch (mt) {
          case MT.TAG:
            return ")";
          case MT.ARRAY:
            return "]";
          case MT.MAP:
            return "}";
          case MT.BYTE_STRING:
          case MT.UTF8_STRING:
            return ")";
          default:
            throw new Error("Unknown diagnostic type: " + mt);
        }
      })());
    };

    Diagnose.prototype._on_data = function() {
      return this.push(this.separator);
    };

    return Diagnose;

  })(stream.Transform);

}).call(this);

//# sourceMappingURL=diagnose.js.map
