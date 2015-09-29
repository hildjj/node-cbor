(function() {
  var SHIFT32, bignumber, fs, parseHalf, printError, stream,
    slice = [].slice,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  fs = require('fs');

  stream = require('stream');

  bignumber = require('bignumber.js');

  SHIFT32 = Math.pow(2, 32);

  exports.parseInt = function(ai, buf) {
    var f, g;
    switch (ai) {
      case 24:
        return buf.readUInt8(0, true);
      case 25:
        return buf.readUInt16BE(0, true);
      case 26:
        return buf.readUInt32BE(0, true);
      case 27:
        f = buf.readUInt32BE(0);
        g = buf.readUInt32BE(4);
        return (f * SHIFT32) + g;
      default:
        throw new Error("Invalid additional info for int: " + ai);
    }
  };

  exports.parseHalf = parseHalf = function(buf) {
    var exp, mant, sign;
    sign = buf[0] & 0x80 ? -1 : 1;
    exp = (buf[0] & 0x7C) >> 2;
    mant = ((buf[0] & 0x03) << 8) | buf[1];
    if (!exp) {
      return sign * 5.9604644775390625e-8 * mant;
    } else if (exp === 0x1f) {
      return sign * (mant ? NaN : Infinity);
    } else {
      return sign * Math.pow(2, exp - 25) * (1024 + mant);
    }
  };

  exports.parseFloat = function(ai, buf) {
    switch (ai) {
      case 25:
        return parseHalf(buf);
      case 26:
        return buf.readFloatBE(0, true);
      case 27:
        return buf.readDoubleBE(0, true);
      default:
        throw new Error("Invalid additional info for float: " + ai);
    }
  };

  exports.hex = function(s) {
    return new Buffer(s.replace(/^0x/, ''), 'hex');
  };

  exports.bin = function(s) {
    var chunks, end, start;
    s = s.replace(/\s/g, '');
    start = 0;
    end = (s.length % 8) || 8;
    chunks = [];
    while (end <= s.length) {
      chunks.push(parseInt(s.slice(start, end), 2));
      start = end;
      end += 8;
    }
    return new Buffer(chunks);
  };

  exports.extend = function() {
    var a, adds, j, k, len, old, v;
    old = arguments[0], adds = 2 <= arguments.length ? slice.call(arguments, 1) : [];
    if (old == null) {
      old = {};
    }
    for (j = 0, len = adds.length; j < len; j++) {
      a = adds[j];
      for (k in a) {
        v = a[k];
        old[k] = v;
      }
    }
    return old;
  };

  exports.arrayEqual = function(a, b) {
    if ((a == null) && (b == null)) {
      return true;
    }
    if ((a == null) || (b == null)) {
      return false;
    }
    return (a.length === b.length) && a.every(function(elem, i) {
      return elem === b[i];
    });
  };

  exports.bufferEqual = function(a, b) {
    var byte, i, j, len, ret;
    if ((a == null) && (b == null)) {
      return true;
    }
    if ((a == null) || (b == null)) {
      return false;
    }
    if (!(Buffer.isBuffer(a) && Buffer.isBuffer(b) && (a.length === b.length))) {
      return false;
    }
    ret = true;
    for (i = j = 0, len = a.length; j < len; i = ++j) {
      byte = a[i];
      ret &= b[i] === byte;
    }
    return !!ret;
  };

  exports.bufferToBignumber = function(buf) {
    return new bignumber(buf.toString('hex'), 16);
  };

  this.DeHexStream = (function(superClass) {
    extend(DeHexStream, superClass);

    function DeHexStream(hex) {
      DeHexStream.__super__.constructor.call(this);
      hex = hex.replace(/^0x/, '');
      if (hex) {
        this.push(new Buffer(hex, 'hex'));
      }
      this.push(null);
    }

    DeHexStream.prototype._read = function() {};

    return DeHexStream;

  })(stream.Readable);

  this.HexStream = (function(superClass) {
    extend(HexStream, superClass);

    function HexStream(options) {
      HexStream.__super__.constructor.call(this, options);
    }

    HexStream.prototype._transform = function(fresh, encoding, cb) {
      this.push(fresh.toString('hex'));
      return cb();
    };

    HexStream.prototype._flush = function(cb) {
      return cb();
    };

    return HexStream;

  })(stream.Transform);

  this.JSONparser = (function(superClass) {
    extend(JSONparser, superClass);

    function JSONparser(options) {
      if (options == null) {
        options = {};
      }
      options.readableObjectMode = true;
      options.writableObjectMode = false;
      JSONparser.__super__.constructor.call(this, options);
    }

    JSONparser.prototype._transform = function(fresh, encoding, cb) {
      this.push(JSON.parse(fresh));
      return cb();
    };

    JSONparser.prototype._flush = function(cb) {
      return cb();
    };

    return JSONparser;

  })(stream.Transform);

  printError = function(er) {
    if (er != null) {
      return console.log(er);
    }
  };

  exports.streamFiles = function(files, streamFunc, cb) {
    var er, f, s, sf;
    if (cb == null) {
      cb = printError;
    }
    try {
      f = files.shift();
      if (!f) {
        return cb();
      }
      sf = streamFunc();
      sf.on('end', function() {
        return exports.streamFiles(files, streamFunc, cb);
      });
      sf.on('error', function(er) {
        return cb(er);
      });
      s = (function() {
        switch (false) {
          case f !== "-":
            return process.stdin;
          case !(f instanceof stream.Stream):
            return f;
          default:
            return fs.createReadStream(f);
        }
      })();
      return s.pipe(sf);
    } catch (_error) {
      er = _error;
      return cb(er);
    }
  };

}).call(this);

//# sourceMappingURL=utils.js.map
