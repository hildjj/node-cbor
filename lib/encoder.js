(function() {
  var BufferStream, DOUBLE, Encoder, FALSE, MAXINT_BN, MT, NULL, NUM_BYTES, SHIFT32, Simple, TAG, TRUE, Tagged, UNDEFINED, bignumber, constants, stream, url,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty,
    slice = [].slice;

  stream = require('stream');

  url = require('url');

  bignumber = require('bignumber.js');

  BufferStream = require('./BufferStream');

  Tagged = require('./tagged');

  Simple = require('./simple');

  constants = require('./constants');

  MT = constants.MT;

  NUM_BYTES = constants.NUM_BYTES;

  TAG = constants.TAG;

  SHIFT32 = Math.pow(2, 32);

  DOUBLE = (MT.SIMPLE_FLOAT << 5) | NUM_BYTES.EIGHT;

  TRUE = (MT.SIMPLE_FLOAT << 5) | constants.SIMPLE.TRUE;

  FALSE = (MT.SIMPLE_FLOAT << 5) | constants.SIMPLE.FALSE;

  UNDEFINED = (MT.SIMPLE_FLOAT << 5) | constants.SIMPLE.UNDEFINED;

  NULL = (MT.SIMPLE_FLOAT << 5) | constants.SIMPLE.NULL;

  MAXINT_BN = new bignumber('0x20000000000000');

  module.exports = Encoder = (function(superClass) {
    extend(Encoder, superClass);

    function Encoder(options) {
      var addTypes, i, j, len1, ref, typ;
      if (options == null) {
        options = {};
      }
      Encoder.__super__.constructor.call(this, options);
      this.bs = new BufferStream(options);
      this.going = false;
      this.sendEOF = false;
      this.semanticTypes = [Array, this._packArray, Date, this._packDate, Buffer, this._packBuffer, RegExp, this._packRegexp, url.Url, this._packUrl, bignumber, this._packBigNumber];
      addTypes = (ref = options.genTypes) != null ? ref : [];
      for (i = j = 0, len1 = addTypes.length; j < len1; i = j += 2) {
        typ = addTypes[i];
        this.addSemanticType(typ, addTypes[i + 1]);
      }
    }

    Encoder.prototype.addSemanticType = function(type, fun) {
      var i, j, len1, old, ref, ref1, typ;
      ref = this.semanticTypes;
      for (i = j = 0, len1 = ref.length; j < len1; i = j += 2) {
        typ = ref[i];
        if (typ === type) {
          ref1 = [this.semanticTypes[i + 1], fun], old = ref1[0], this.semanticTypes[i + 1] = ref1[1];
          return old;
        }
      }
      this.semanticTypes.push(type, fun);
      return null;
    };

    Encoder.prototype._read = function(size) {
      var results, x;
      this.going = true;
      results = [];
      while (this.going) {
        x = this.bs.read();
        if (x.length) {
          results.push(this.going = this.push(x));
        } else {
          if (this.sendEOF) {
            this.going = this.push(null);
          }
          break;
        }
      }
      return results;
    };

    Encoder.prototype._packNaN = function() {
      return this.bs.write('f97e00', 'hex');
    };

    Encoder.prototype._packInfinity = function(obj) {
      var half;
      half = obj < 0 ? 'f9fc00' : 'f97c00';
      return this.bs.write(half, 'hex');
    };

    Encoder.prototype._packFloat = function(obj) {
      this.bs.writeUInt8(DOUBLE);
      return this.bs.writeDoubleBE(obj);
    };

    Encoder.prototype._packInt = function(obj, mt) {
      mt = mt << 5;
      switch (false) {
        case !(obj < 24):
          return this.bs.writeUInt8(mt | obj);
        case !(obj <= 0xff):
          this.bs.writeUInt8(mt | NUM_BYTES.ONE);
          return this.bs.writeUInt8(obj);
        case !(obj <= 0xffff):
          this.bs.writeUInt8(mt | NUM_BYTES.TWO);
          return this.bs.writeUInt16BE(obj);
        case !(obj <= 0xffffffff):
          this.bs.writeUInt8(mt | NUM_BYTES.FOUR);
          return this.bs.writeUInt32BE(obj);
        case !(obj < 0x20000000000000):
          this.bs.writeUInt8(mt | NUM_BYTES.EIGHT);
          this.bs.writeUInt32BE(Math.floor(obj / SHIFT32));
          return this.bs.writeUInt32BE(obj % SHIFT32);
        default:
          return this._packFloat(obj);
      }
    };

    Encoder.prototype._packIntNum = function(obj) {
      if (obj < 0) {
        return this._packInt(-obj - 1, MT.NEG_INT);
      } else {
        return this._packInt(obj, MT.POS_INT);
      }
    };

    Encoder.prototype._packNumber = function(obj) {
      switch (false) {
        case !isNaN(obj):
          return this._packNaN(obj);
        case !!isFinite(obj):
          return this._packInfinity(obj);
        case Math.round(obj) !== obj:
          return this._packIntNum(obj);
        default:
          return this._packFloat(obj);
      }
    };

    Encoder.prototype._packString = function(obj) {
      var len;
      len = Buffer.byteLength(obj, 'utf8');
      this._packInt(len, MT.UTF8_STRING);
      return this.bs.writeString(obj, len, 'utf8');
    };

    Encoder.prototype._packBoolean = function(obj) {
      return this.bs.writeUInt8(obj ? TRUE : FALSE);
    };

    Encoder.prototype._packUndefined = function(obj) {
      return this.bs.writeUInt8(UNDEFINED);
    };

    Encoder.prototype._packArray = function(gen, obj) {
      var j, len, len1, results, x;
      len = obj.length;
      this._packInt(len, MT.ARRAY);
      results = [];
      for (j = 0, len1 = obj.length; j < len1; j++) {
        x = obj[j];
        results.push(this._pack(x));
      }
      return results;
    };

    Encoder.prototype._packTag = function(tag) {
      return this._packInt(tag, MT.TAG);
    };

    Encoder.prototype._packDate = function(gen, obj) {
      this._packTag(TAG.DATE_EPOCH);
      return this._pack(obj / 1000);
    };

    Encoder.prototype._packBuffer = function(gen, obj) {
      this._packInt(obj.length, MT.BYTE_STRING);
      return this.bs.append(obj);
    };

    Encoder.prototype._packRegexp = function(gen, obj) {
      this._packTag(TAG.REGEXP);
      return this._pack(obj.source);
    };

    Encoder.prototype._packUrl = function(gen, obj) {
      this._packTag(TAG.URI);
      return this._pack(obj.format());
    };

    Encoder.prototype._packBigint = function(obj) {
      var buf, str, tag;
      if (obj.isNegative()) {
        obj = obj.negated().minus(1);
        tag = TAG.NEG_BIGINT;
      } else {
        tag = TAG.POS_BIGINT;
      }
      str = obj.toString(16);
      if (str.length % 2) {
        str = '0' + str;
      }
      buf = new Buffer(str, 'hex');
      this._packTag(tag);
      return this._packBuffer(this, buf, this.bs);
    };

    Encoder.prototype._packBigNumber = function(gen, obj) {
      var dec, slide;
      if (obj.isNaN()) {
        return this._packNaN();
      }
      if (!obj.isFinite()) {
        return this._packInfinity(obj.isNegative() ? -Infinity : Infinity);
      }
      if (obj.isInteger()) {
        return this._packBigint(obj);
      }
      this._packTag(TAG.DECIMAL_FRAC);
      this._packInt(2, MT.ARRAY);
      dec = obj.decimalPlaces();
      slide = obj.mul(new bignumber(10).pow(dec));
      this._packIntNum(-dec);
      if (slide.abs().lessThan(MAXINT_BN)) {
        return this._packIntNum(slide.toNumber());
      } else {
        return this._packBigint(slide);
      }
    };

    Encoder.prototype._packMap = function(obj) {
      var j, k, keys, len, len1, results;
      keys = Object.keys(obj);
      len = keys.length;
      this._packInt(len, MT.MAP);
      results = [];
      for (j = 0, len1 = keys.length; j < len1; j++) {
        k = keys[j];
        this._pack(k);
        results.push(this._pack(obj[k]));
      }
      return results;
    };

    Encoder.prototype._packObject = function(obj) {
      var f, i, j, len1, ref, typ;
      if (!obj) {
        return this.bs.writeUInt8(NULL);
      }
      ref = this.semanticTypes;
      for (i = j = 0, len1 = ref.length; j < len1; i = j += 2) {
        typ = ref[i];
        if (obj instanceof typ) {
          return this.semanticTypes[i + 1].call(this, this, obj);
        }
      }
      f = obj.encodeCBOR;
      if (typeof f === 'function') {
        return f.call(obj, this);
      }
      return this._packMap(obj);
    };

    Encoder.prototype._pack = function(obj) {
      switch (typeof obj) {
        case 'number':
          return this._packNumber(obj);
        case 'string':
          return this._packString(obj);
        case 'boolean':
          return this._packBoolean(obj);
        case 'undefined':
          return this._packUndefined(obj);
        case 'object':
          return this._packObject(obj);
        default:
          throw new Error('Unknown type: ' + typeof obj);
      }
    };

    Encoder.prototype.write = function() {
      var j, len1, o, objs, results, x;
      objs = 1 <= arguments.length ? slice.call(arguments, 0) : [];
      results = [];
      for (j = 0, len1 = objs.length; j < len1; j++) {
        o = objs[j];
        this._pack(o);
        if (this.going) {
          x = this.bs.read();
          if (x.length) {
            results.push(this.going = this.push(x));
          } else {
            results.push(void 0);
          }
        } else {
          results.push(void 0);
        }
      }
      return results;
    };

    Encoder.prototype.end = function() {
      var objs;
      objs = 1 <= arguments.length ? slice.call(arguments, 0) : [];
      if (objs.length) {
        this.write.apply(this, objs);
      }
      if (this.going) {
        return this.going = this.push(null);
      } else {
        return this.sendEOF = true;
      }
    };

    Encoder.encode = function() {
      var g, objs;
      objs = 1 <= arguments.length ? slice.call(arguments, 0) : [];
      g = new Encoder;
      g.end.apply(g, objs);
      return g.read();
    };

    return Encoder;

  })(stream.Readable);

}).call(this);

//# sourceMappingURL=encoder.js.map
