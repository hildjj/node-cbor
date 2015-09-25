(function() {
  var BREAK, BinaryParseStream, BufferStream, COUNT, CborStream, ERROR, MAJOR, MAX_SAFE_HIGH, MT, NOTHING, NULL, NUM_BYTES, PARENT, PENDING_KEY, SHIFT_32, SIMPLE, STREAM, Simple, Tagged, long, parentArray, parentBufferStream, parseCBORfloat, parseCBORint, ref, utils,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  BinaryParseStream = require('binary-parse-stream');

  Tagged = require('./tagged');

  Simple = require('./simple');

  BufferStream = require('./BufferStream');

  utils = require('./utils');

  long = require('long');

  ref = require('./constants'), MT = ref.MT, NUM_BYTES = ref.NUM_BYTES, SIMPLE = ref.SIMPLE;

  SHIFT_32 = Math.pow(2, 32);

  MAX_SAFE_HIGH = long.fromNumber(Number.MAX_SAFE_INTEGER).high;

  COUNT = Symbol('count');

  PENDING_KEY = Symbol('pending_key');

  PARENT = Symbol('parent');

  BREAK = Symbol('break');

  MAJOR = Symbol('major type');

  NULL = Symbol('null');

  NOTHING = Symbol('nothing');

  ERROR = Symbol('error');

  STREAM = Symbol('stream');

  parseCBORint = function(ai, buf) {
    var f, g;
    switch (ai) {
      case NUM_BYTES.ONE:
        return buf.readUInt8(0, true);
      case NUM_BYTES.TWO:
        return buf.readUInt16BE(0, true);
      case NUM_BYTES.FOUR:
        return buf.readUInt32BE(0, true);
      case NUM_BYTES.EIGHT:
        f = buf.readUInt32BE(0);
        g = buf.readUInt32BE(4);
        if (f > MAX_SAFE_HIGH) {
          return new long({
            high: f,
            low: g
          });
        } else {
          return (f * SHIFT_32) + g;
        }
        break;
      default:
        throw new Error("Invalid additional info for int: " + ai);
    }
  };

  parseCBORfloat = function(buf) {
    switch (buf.length) {
      case 2:
        return utils.parseHalf(buf);
      case 4:
        return buf.readFloatBE(0, true);
      case 8:
        return buf.readDoubleBE(0, true);
      default:
        throw new Error("Invalid float size: " + buf.length);
    }
  };

  parentArray = function(parent, typ, count) {
    var a;
    a = [];
    a[COUNT] = count;
    a[PARENT] = parent;
    a[MAJOR] = typ;
    return a;
  };

  parentBufferStream = function(parent, typ) {
    var b;
    b = new BufferStream;
    b[PARENT] = parent;
    b[MAJOR] = typ;
    return b;
  };

  module.exports = CborStream = (function(superClass) {
    extend(CborStream, superClass);

    CborStream.PARENT = PARENT;

    CborStream.NULL = NULL;

    CborStream.BREAK = BREAK;

    CborStream.STREAM = STREAM;

    CborStream.nullcheck = function(val) {
      if (val === NULL) {
        return null;
      } else {
        return val;
      }
    };

    CborStream.decodeFirst = function(buf, encoding, cb) {
      var c, p, v;
      if (encoding == null) {
        encoding = 'utf-8';
      }
      if (typeof encoding === 'function') {
        cb = encoding;
        encoding = void 0;
      }
      c = new CborStream;
      p = void 0;
      v = NOTHING;
      c.on('data', function(val) {
        v = CborStream.nullcheck(val);
        return c.close();
      });
      if (typeof cb === 'function') {
        c.once('error', function(er) {
          if (v !== ERROR) {
            v = ERROR;
            c.close();
            return cb(er);
          }
        });
        c.once('end', function() {
          switch (v) {
            case NOTHING:
              return cb(new Error('No CBOR found'));
            case ERROR:
              return void 0;
            default:
              return cb(null, v);
          }
        });
      } else {
        p = new Promise(function(resolve, reject) {
          c.once('error', function(er) {
            v = ERROR;
            c.close();
            return reject(er);
          });
          return c.once('end', function() {
            switch (v) {
              case NOTHING:
                return reject(new Error('No CBOR found'));
              case ERROR:
                return void 0;
              default:
                return resolve(v);
            }
          });
        });
      }
      c.end(buf, encoding);
      return p;
    };

    CborStream.decodeAll = function(buf, encoding, cb) {
      var c, p;
      if (encoding == null) {
        encoding = 'utf-8';
      }
      if (typeof encoding === 'function') {
        cb = encoding;
        encoding = void 0;
      }
      c = new CborStream;
      p = void 0;
      if (typeof cb === 'function') {
        c.on('data', function(val) {
          return cb(null, CborStream.nullcheck(val));
        });
        c.on('error', function(er) {
          return cb(er);
        });
      } else {
        p = new Promise(function(resolve, reject) {
          var vals;
          vals = [];
          c.on('data', function(val) {
            return vals.push(CborStream.nullcheck(val));
          });
          c.on('error', function(er) {
            return reject(er);
          });
          return c.on('end', function() {
            return resolve(vals);
          });
        });
      }
      c.end(buf, encoding);
      return p;
    };

    function CborStream(options) {
      this.tags = options != null ? options.tags : void 0;
      if (options != null) {
        delete options.tags;
      }
      this.running = true;
      CborStream.__super__.constructor.call(this, options);
    }

    CborStream.prototype.close = function() {
      this.running = false;
      return this.__fresh = true;
    };

    CborStream.prototype._parse = function*() {
      var a, again, ai, allstrings, buf, i, mt, octet, parent, pm, t;
      parent = null;
      while (true) {
        octet = (yield (-1));
        if (!this.running) {
          throw new Error("Unexpected data: 0x" + (octet.toString(16)));
        }
        mt = octet >> 5;
        ai = octet & 0x1f;
        switch (ai) {
          case NUM_BYTES.ONE:
            ai = (yield (-1));
            break;
          case NUM_BYTES.TWO:
          case NUM_BYTES.FOUR:
          case NUM_BYTES.EIGHT:
            buf = (yield (1 << (ai - 24)));
            ai = mt === MT.SIMPLE_FLOAT ? buf : parseCBORint(ai, buf);
            break;
          case 28:
          case 29:
          case 30:
            this.running = false;
            throw new Error("Additional info not implemented: " + ai);
            break;
          case NUM_BYTES.INDEFINITE:
            ai = -1;
        }
        switch (mt) {
          case MT.POS_INT:
            void 0;
            break;
          case MT.NEG_INT:
            if (long.isLong(ai) || (ai === Number.MAX_SAFE_INTEGER)) {
              ai = long.NEG_ONE.subtract(ai);
            } else {
              ai = -1 - ai;
            }
            break;
          case MT.BYTE_STRING:
            switch (ai) {
              case 0:
                ai = new Buffer(0);
                break;
              case -1:
                this.emit('start', mt, STREAM, parent != null ? parent[MAJOR] : void 0, parent != null ? parent.length : void 0);
                parent = parentBufferStream(parent, mt);
                continue;
              default:
                ai = (yield ai);
            }
            break;
          case MT.UTF8_STRING:
            switch (ai) {
              case 0:
                ai = '';
                break;
              case -1:
                this.emit('start', mt, STREAM, parent != null ? parent[MAJOR] : void 0, parent != null ? parent.length : void 0);
                parent = parentBufferStream(parent, mt);
                continue;
              default:
                ai = ((yield ai)).toString('utf-8');
            }
            break;
          case MT.ARRAY:
          case MT.MAP:
            switch (ai) {
              case 0:
                ai = mt === MT.MAP ? {} : [];
                ai[PARENT] = parent;
                break;
              case -1:
                this.emit('start', mt, STREAM, parent != null ? parent[MAJOR] : void 0, parent != null ? parent.length : void 0);
                parent = parentArray(parent, mt, -1);
                continue;
              default:
                this.emit('start', mt, NULL, parent != null ? parent[MAJOR] : void 0, parent != null ? parent.length : void 0);
                parent = parentArray(parent, mt, ai * (mt - 3));
                continue;
            }
            break;
          case MT.TAG:
            this.emit('start', mt, ai, parent != null ? parent[MAJOR] : void 0, parent != null ? parent.length : void 0);
            parent = parentArray(parent, mt, 1);
            parent.push(ai);
            continue;
          case MT.SIMPLE_FLOAT:
            if (typeof ai === 'number') {
              ai = (function() {
                switch (ai) {
                  case SIMPLE.FALSE:
                    return false;
                  case SIMPLE.TRUE:
                    return true;
                  case SIMPLE.NULL:
                    if (parent != null) {
                      return null;
                    } else {
                      return NULL;
                    }
                    break;
                  case SIMPLE.UNDEFINED:
                    return void 0;
                  case -1:
                    if (parent == null) {
                      this.running = false;
                      throw new Error('Invalid BREAK');
                    }
                    parent[COUNT] = 1;
                    return BREAK;
                  default:
                    return new Simple(ai);
                }
              }).call(this);
            } else {
              ai = parseCBORfloat(ai);
            }
        }
        this.emit('value', ai, parent != null ? parent[MAJOR] : void 0, parent != null ? parent.length : void 0);
        again = false;
        while (parent != null) {
          switch (false) {
            case ai !== BREAK:
              void 0;
              break;
            case !Array.isArray(parent):
              parent.push(ai);
              break;
            case !(parent instanceof BufferStream):
              pm = parent[MAJOR];
              if ((pm != null) && (pm !== mt)) {
                this.running = false;
                throw new Error('Invalid major type in indefinite encoding');
              }
              parent.write(ai);
              break;
            default:
              this.running = false;
              throw new Error('Unknown parent type');
          }
          if ((--parent[COUNT]) !== 0) {
            again = true;
            break;
          }
          delete parent[COUNT];
          this.emit('stop', parent[MAJOR]);
          ai = (function() {
            var j, k, l, ref1, ref2, ref3;
            switch (false) {
              case !Array.isArray(parent):
                switch (parent[MAJOR]) {
                  case MT.ARRAY:
                    return parent;
                  case MT.MAP:
                    allstrings = true;
                    if ((parent.length % 2) !== 0) {
                      throw new Error("Invalid map length: " + parent.length);
                    }
                    for (i = j = 0, ref1 = parent.length; j < ref1; i = j += 2) {
                      if (typeof parent[i] !== 'string') {
                        allstrings = false;
                        break;
                      }
                    }
                    if (allstrings) {
                      a = {};
                      for (i = k = 0, ref2 = parent.length; k < ref2; i = k += 2) {
                        a[parent[i]] = parent[i + 1];
                      }
                      return a;
                    } else {
                      a = new Map;
                      for (i = l = 0, ref3 = parent.length; l < ref3; i = l += 2) {
                        a.set(parent[i], parent[i + 1]);
                      }
                      return a;
                    }
                    break;
                  case MT.TAG:
                    t = new Tagged(parent[0], parent[1]);
                    return t.convert(this.tags);
                  default:
                    throw new Error('Invalid state');
                }
                break;
              case !(parent instanceof BufferStream):
                switch (parent[MAJOR]) {
                  case MT.BYTE_STRING:
                    return parent.flatten();
                  case MT.UTF8_STRING:
                    return parent.toString('utf-8');
                  default:
                    this.running = false;
                    throw new Error('Invalid stream major type');
                }
                break;
              default:
                throw new Error('Invalid state');
                return parent;
            }
          }).call(this);
          parent = parent[PARENT];
        }
        if (!again) {
          return ai;
        }
      }
    };

    return CborStream;

  })(BinaryParseStream);

}).call(this);

//# sourceMappingURL=stream.js.map
