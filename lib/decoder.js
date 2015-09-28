(function() {
  var BinaryParseStream, BufferStream, COUNT, CborStream, ERROR, MAJOR, MAX_SAFE_BIG, MAX_SAFE_HIGH, MT, NEG_ONE, NOTHING, NUMBYTES, PENDING_KEY, SHIFT_32, SIMPLE, SYMS, Simple, Tagged, bignumber, parentArray, parentBufferStream, parseCBORfloat, parseCBORint, ref, utils,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  BinaryParseStream = require('../vendor/binary-parse-stream');

  Tagged = require('./tagged');

  Simple = require('./simple');

  BufferStream = require('./BufferStream');

  utils = require('./utils');

  bignumber = require('bignumber.js');

  ref = require('./constants'), MT = ref.MT, NUMBYTES = ref.NUMBYTES, SIMPLE = ref.SIMPLE, SYMS = ref.SYMS;

  SHIFT_32 = new bignumber(2).pow(32);

  NEG_ONE = new bignumber(-1);

  MAX_SAFE_BIG = new bignumber(Number.MAX_SAFE_INTEGER.toString(16), 16);

  MAX_SAFE_HIGH = 0x1fffff;

  COUNT = Symbol('count');

  PENDING_KEY = Symbol('pending_key');

  MAJOR = Symbol('major type');

  NOTHING = Symbol('nothing');

  ERROR = Symbol('error');

  parseCBORint = function(ai, buf) {
    var f, g;
    switch (ai) {
      case NUMBYTES.ONE:
        return buf.readUInt8(0, true);
      case NUMBYTES.TWO:
        return buf.readUInt16BE(0, true);
      case NUMBYTES.FOUR:
        return buf.readUInt32BE(0, true);
      case NUMBYTES.EIGHT:
        f = buf.readUInt32BE(0);
        g = buf.readUInt32BE(4);
        if (f > MAX_SAFE_HIGH) {
          return new bignumber(f).times(SHIFT_32).plus(g);
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
    a[SYMS.PARENT] = parent;
    a[MAJOR] = typ;
    return a;
  };

  parentBufferStream = function(parent, typ) {
    var b;
    b = new BufferStream;
    b[SYMS.PARENT] = parent;
    b[MAJOR] = typ;
    return b;
  };

  module.exports = CborStream = (function(superClass) {
    extend(CborStream, superClass);

    CborStream.nullcheck = function(val) {
      switch (val) {
        case SYMS.NULL:
          return null;
        case SYMS.UNDEFINED:
          return void 0;
        default:
          return val;
      }
    };

    CborStream.decodeFirst = function(buf, encoding, cb) {
      var c, opts, p, v;
      if (encoding == null) {
        encoding = 'utf-8';
      }
      opts = {};
      switch (typeof encoding) {
        case 'function':
          cb = encoding;
          encoding = void 0;
          break;
        case 'object':
          opts = encoding;
          encoding = opts.encoding;
          delete opts.encoding;
      }
      c = new CborStream(opts);
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
      var c, opts, p;
      if (encoding == null) {
        encoding = 'utf-8';
      }
      opts = {};
      switch (typeof encoding) {
        case 'function':
          cb = encoding;
          encoding = void 0;
          break;
        case 'object':
          opts = encoding;
          encoding = opts.encoding;
          delete opts.encoding;
      }
      c = new CborStream(opts);
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
      this.max_depth = (options != null ? options.max_depth : void 0) || -1;
      if (options != null) {
        delete options.max_depth;
      }
      this.running = true;
      CborStream.__super__.constructor.call(this, options);
    }

    CborStream.prototype.close = function() {
      this.running = false;
      return this.__fresh = true;
    };

    CborStream.prototype._parse = function*() {
      var a, again, ai, allstrings, buf, depth, i, mt, numbytes, octet, parent, pm, t, val;
      parent = null;
      depth = 0;
      val = null;
      while (true) {
        if ((this.max_depth >= 0) && (depth > this.max_depth)) {
          throw new Error("Maximum depth " + this.max_depth + " exceeded");
        }
        octet = ((yield 1.))[0];
        if (!this.running) {
          throw new Error("Unexpected data: 0x" + (octet.toString(16)));
        }
        mt = octet >> 5;
        ai = octet & 0x1f;
        switch (ai) {
          case NUMBYTES.ONE:
            this.emit('more-bytes', mt, 1, parent != null ? parent[MAJOR] : void 0, parent != null ? parent.length : void 0);
            val = ((yield 1.))[0];
            break;
          case NUMBYTES.TWO:
          case NUMBYTES.FOUR:
          case NUMBYTES.EIGHT:
            numbytes = 1 << (ai - 24);
            this.emit('more-bytes', mt, numbytes, parent != null ? parent[MAJOR] : void 0, parent != null ? parent.length : void 0);
            buf = (yield numbytes);
            val = mt === MT.SIMPLE_FLOAT ? buf : parseCBORint(ai, buf);
            break;
          case 28:
          case 29:
          case 30:
            this.running = false;
            throw new Error("Additional info not implemented: " + ai);
            break;
          case NUMBYTES.INDEFINITE:
            val = -1;
            break;
          default:
            val = ai;
        }
        switch (mt) {
          case MT.POS_INT:
            void 0;
            break;
          case MT.NEG_INT:
            if (val === Number.MAX_SAFE_INTEGER) {
              val = MAX_SAFE_BIG;
            } else if (val instanceof bignumber) {
              val = NEG_ONE.sub(val);
            } else {
              val = -1 - val;
            }
            break;
          case MT.BYTE_STRING:
          case MT.UTF8_STRING:
            switch (val) {
              case 0:
                val = mt === MT.BYTE_STRING ? new Buffer(0) : '';
                break;
              case -1:
                this.emit('start', mt, SYMS.STREAM, parent != null ? parent[MAJOR] : void 0, parent != null ? parent.length : void 0);
                parent = parentBufferStream(parent, mt);
                depth++;
                continue;
              default:
                this.emit('start-string', mt, val, parent != null ? parent[MAJOR] : void 0, parent != null ? parent.length : void 0);
                val = (yield val);
                if (mt === MT.UTF8_STRING) {
                  val = val.toString('utf-8');
                }
            }
            break;
          case MT.ARRAY:
          case MT.MAP:
            switch (val) {
              case 0:
                val = mt === MT.MAP ? {} : [];
                val[SYMS.PARENT] = parent;
                break;
              case -1:
                this.emit('start', mt, SYMS.STREAM, parent != null ? parent[MAJOR] : void 0, parent != null ? parent.length : void 0);
                parent = parentArray(parent, mt, -1);
                depth++;
                continue;
              default:
                this.emit('start', mt, val, parent != null ? parent[MAJOR] : void 0, parent != null ? parent.length : void 0);
                parent = parentArray(parent, mt, val * (mt - 3));
                depth++;
                continue;
            }
            break;
          case MT.TAG:
            this.emit('start', mt, val, parent != null ? parent[MAJOR] : void 0, parent != null ? parent.length : void 0);
            parent = parentArray(parent, mt, 1);
            parent.push(val);
            depth++;
            continue;
          case MT.SIMPLE_FLOAT:
            if (typeof val === 'number') {
              val = Simple.decode(val, parent != null);
            } else {
              val = parseCBORfloat(val);
            }
        }
        this.emit('value', val, parent != null ? parent[MAJOR] : void 0, parent != null ? parent.length : void 0, ai);
        again = false;
        while (parent != null) {
          switch (false) {
            case val !== SYMS.BREAK:
              parent[COUNT] = 1;
              break;
            case !Array.isArray(parent):
              parent.push(val);
              break;
            case !(parent instanceof BufferStream):
              pm = parent[MAJOR];
              if ((pm != null) && (pm !== mt)) {
                this.running = false;
                throw new Error('Invalid major type in indefinite encoding');
              }
              parent.write(val);
              break;
            default:
              this.running = false;
              throw new Error('Unknown parent type');
          }
          if ((--parent[COUNT]) !== 0) {
            again = true;
            break;
          }
          --depth;
          delete parent[COUNT];
          this.emit('stop', parent[MAJOR]);
          val = (function() {
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
          parent = parent[SYMS.PARENT];
        }
        if (!again) {
          if (depth !== 0) {
            throw new Error('Depth problem');
          }
          return val;
        }
      }
    };

    return CborStream;

  })(BinaryParseStream);

}).call(this);

//# sourceMappingURL=decoder.js.map
