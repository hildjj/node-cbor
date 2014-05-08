(function() {
  var BufferStream, Diagnose, Evented, Simple, stream, utils,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  stream = require('stream');

  Evented = require('./evented');

  BufferStream = require('./BufferStream');

  Simple = require('./simple');

  utils = require('./utils');

  module.exports = Diagnose = (function(_super) {
    __extends(Diagnose, _super);

    function Diagnose(options) {
      if (options == null) {
        options = {};
      }
      this._on_end = __bind(this._on_end, this);
      this._on_stream_stop = __bind(this._on_stream_stop, this);
      this._on_stream_start = __bind(this._on_stream_start, this);
      this._on_map_stop = __bind(this._on_map_stop, this);
      this._on_map_start = __bind(this._on_map_start, this);
      this._on_array_stop = __bind(this._on_array_stop, this);
      this._on_array_start = __bind(this._on_array_start, this);
      this._on_value = __bind(this._on_value, this);
      this._on_error = __bind(this._on_error, this);
      Diagnose.__super__.constructor.call(this);
      this.options = utils.extend({
        separator: '\n',
        output: process.stdout,
        streamErrors: false
      }, options);
      this.on('finish', (function(_this) {
        return function() {
          return _this.parser.end();
        };
      })(this));
      this.parser = new Evented(this.options);
      this.parser.on('value', this._on_value);
      this.parser.on('array-start', this._on_array_start);
      this.parser.on('array-stop', this._on_array_stop);
      this.parser.on('map-start', this._on_map_start);
      this.parser.on('map-stop', this._on_map_stop);
      this.parser.on('stream-start', this._on_stream_start);
      this.parser.on('stream-stop', this._on_stream_stop);
      this.parser.on('end', this._on_end);
      this.parser.on('error', this._on_error);
    }

    Diagnose.prototype.start = function() {
      return this.parser.start();
    };

    Diagnose.diagnose = function(input, encoding, output, done) {
      var d;
      if (encoding == null) {
        encoding = 'hex';
      }
      if (output == null) {
        output = process.stdout;
      }
      if (input == null) {
        throw new Error('input required');
      }
      d = new Diagnose({
        input: input,
        encoding: encoding,
        output: output
      });
      if (done) {
        d.on('end', done);
        d.on('error', done);
      }
      return d.start();
    };

    Diagnose.diagnoseString = function(input, done) {
      var bs, d;
      if (input == null) {
        throw new Error('input required');
      }
      if (done == null) {
        throw new Error('callback required');
      }
      bs = new BufferStream;
      d = new Diagnose({
        input: input,
        output: bs
      });
      d.on('end', function() {
        return done(null, bs.toString('utf8'));
      });
      d.on('error', done);
      return d.start();
    };

    Diagnose.prototype._numStr = function(val) {
      if (isNaN(val)) {
        return "NaN";
      } else if (!isFinite(val)) {
        if (val < 0) {
          return '-Infinity';
        } else {
          return 'Infinity';
        }
      } else {
        return JSON.stringify(val);
      }
    };

    Diagnose.prototype._stream_val = function(val) {
      return this.options.output.write((function() {
        switch (false) {
          case val !== void 0:
            return 'undefined';
          case val !== null:
            return 'nil';
          case typeof val !== 'number':
            return this._numStr(val);
          case !Simple.isSimple(val):
            return val.toString();
          case !Buffer.isBuffer(val):
            return "h'" + val.toString('hex') + "'";
          default:
            return JSON.stringify(val);
        }
      }).call(this));
    };

    Diagnose.prototype._on_error = function(er) {
      if (this.options.streamErrors) {
        this.options.output.write(er.toString());
      }
      return this.emit('error', er);
    };

    Diagnose.prototype._fore = function(kind) {
      switch (kind) {
        case 'array':
        case 'key':
        case 'stream':
          return this.options.output.write(', ');
      }
    };

    Diagnose.prototype._aft = function(kind) {
      switch (kind) {
        case 'key':
        case 'key-first':
          return this.options.output.write(': ');
        case null:
          if (this.options.separator != null) {
            this.options.output.write(this.options.separator);
          }
          return this.emit('complete', this.options.output);
      }
    };

    Diagnose.prototype._on_value = function(val, tags, kind) {
      var t, _i, _j, _len, _len1;
      this._fore(kind);
      if ((tags != null) && tags.length) {
        for (_i = 0, _len = tags.length; _i < _len; _i++) {
          t = tags[_i];
          this.options.output.write("" + t + "(");
        }
      }
      this._stream_val(val);
      if ((tags != null) && tags.length) {
        for (_j = 0, _len1 = tags.length; _j < _len1; _j++) {
          t = tags[_j];
          this.options.output.write(")");
        }
      }
      return this._aft(kind);
    };

    Diagnose.prototype._on_array_start = function(count, tags, kind) {
      var t, _i, _len;
      this._fore(kind);
      if ((tags != null) && tags.length) {
        for (_i = 0, _len = tags.length; _i < _len; _i++) {
          t = tags[_i];
          this.options.output.write("" + t + "(");
        }
      }
      this.options.output.write("[");
      if (count === -1) {
        return this.options.output.write("_ ");
      }
    };

    Diagnose.prototype._on_array_stop = function(count, tags, kind) {
      var t, _i, _len;
      this.options.output.write("]");
      if ((tags != null) && tags.length) {
        for (_i = 0, _len = tags.length; _i < _len; _i++) {
          t = tags[_i];
          this.options.output.write(")");
        }
      }
      return this._aft(kind);
    };

    Diagnose.prototype._on_map_start = function(count, tags, kind) {
      var t, _i, _len;
      this._fore(kind);
      if ((tags != null) && tags.length) {
        for (_i = 0, _len = tags.length; _i < _len; _i++) {
          t = tags[_i];
          this.options.output.write("" + t + "(");
        }
      }
      this.options.output.write("{");
      if (count === -1) {
        return this.options.output.write("_ ");
      }
    };

    Diagnose.prototype._on_map_stop = function(count, tags, kind) {
      var t, _i, _len;
      this.options.output.write("}");
      if ((tags != null) && tags.length) {
        for (_i = 0, _len = tags.length; _i < _len; _i++) {
          t = tags[_i];
          this.options.output.write(")");
        }
      }
      return this._aft(kind);
    };

    Diagnose.prototype._on_stream_start = function(mt, tags, kind) {
      var t, _i, _len;
      this._fore(kind);
      if ((tags != null) && tags.length) {
        for (_i = 0, _len = tags.length; _i < _len; _i++) {
          t = tags[_i];
          this.options.output.write("" + t + "(");
        }
      }
      return this.options.output.write("(_ ");
    };

    Diagnose.prototype._on_stream_stop = function(count, mt, tags, kind) {
      var t, _i, _len;
      this.options.output.write(")");
      if ((tags != null) && tags.length) {
        for (_i = 0, _len = tags.length; _i < _len; _i++) {
          t = tags[_i];
          this.options.output.write(")");
        }
      }
      return this._aft(kind);
    };

    Diagnose.prototype._on_end = function() {
      return this.emit('end');
    };

    Diagnose.prototype._write = function(chunk, enc, next) {
      return this.parser.write(chunk, enc, next);
    };

    return Diagnose;

  })(stream.Writable);

}).call(this);
