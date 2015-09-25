(function() {
  var BufferStream, Decoder, Diagnose, MT, Simple, stream, util, utils,
    bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  stream = require('stream');

  util = require('util');

  Decoder = require('./stream');

  BufferStream = require('./BufferStream');

  Simple = require('./simple');

  utils = require('./utils');

  MT = require('./constants').MT;

  module.exports = Diagnose = (function(superClass) {
    extend(Diagnose, superClass);

    function Diagnose(options) {
      if (options == null) {
        options = {};
      }
      this._on_data = bind(this._on_data, this);
      this._on_stop = bind(this._on_stop, this);
      this._on_start = bind(this._on_start, this);
      this._on_value = bind(this._on_value, this);
      this._on_error = bind(this._on_error, this);
      Diagnose.__super__.constructor.call(this);
      this._writableState.objectMode = false;
      this._readableState.objectMode = false;
      this.options = utils.extend({
        separator: '\n',
        streamErrors: false
      }, options);
      this.parser = new Decoder(this.options);
      this.parser.on('value', this._on_value);
      this.parser.on('start', this._on_start);
      this.parser.on('stop', this._on_stop);
      this.parser.on('data', this._on_data);
      this.parser.on('error', this._on_error);
    }

    Diagnose.prototype._transform = function(fresh, encoding, cb) {
      return this.parser.write(fresh, encoding, cb);
    };

    Diagnose.diagnose = function(input, encoding, cb) {
      var bs, d;
      if (input == null) {
        throw new Error('input required');
      }
      if (typeof encoding === 'function') {
        cb = encoding;
        if (typeof input === 'string') {
          encoding = 'hex';
        } else {
          encoding = void 0;
        }
      }
      if (cb == null) {
        throw new Error('callback required');
      }
      bs = new BufferStream;
      d = new Diagnose;
      d.on('end', function() {
        return cb(null, bs.toString('utf8'));
      });
      d.on('error', cb);
      d.pipe(bs);
      return d.end(input, encoding);
    };

    Diagnose.prototype._on_error = function(er) {
      if (this.options.streamErrors) {
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
      if (val === Decoder.BREAK) {
        return;
      }
      this._fore(parent_mt, pos);
      return this.push((function() {
        switch (false) {
          case typeof val !== 'string':
            return "\"" + val + "\"";
          case !Buffer.isBuffer(val):
            return "h'" + (val.toString("hex")) + "'";
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
      if (tag === Decoder.STREAM) {
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
      return this.push(this.options.separator);
    };

    return Diagnose;

  })(stream.Transform);

}).call(this);

//# sourceMappingURL=diagnose.js.map
