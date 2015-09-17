(function() {
  var AI_1, AI_2, AI_4, AI_8, AI_INDEF, BREAK, BinaryParseStream, BufferStream, COUNT, CborStream, MAJOR, MT_ARRAY, MT_BYTES, MT_MAP, MT_NEGATIVE, MT_PRIM, MT_TAG, MT_TEXT, MT_UNSIGNED, PARENT, PENDING_KEY, SHIFT32, Simple, Tagged, VAL_FALSE, VAL_NIL, VAL_TRUE, VAL_UNDEF, p, parseCBORfloat, parseCBORint, utils,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  BinaryParseStream = require('binary-parse-stream');

  Tagged = require('./tagged');

  Simple = require('./simple');

  BufferStream = require('./BufferStream');

  utils = require('./utils');

  MT_UNSIGNED = 0 << 5;

  MT_NEGATIVE = 1 << 5;

  MT_BYTES = 2 << 5;

  MT_TEXT = 3 << 5;

  MT_ARRAY = 4 << 5;

  MT_MAP = 5 << 5;

  MT_TAG = 6 << 5;

  MT_PRIM = 7 << 5;

  AI_1 = 24;

  AI_2 = 25;

  AI_4 = 26;

  AI_8 = 27;

  AI_INDEF = 31;

  VAL_FALSE = 20;

  VAL_TRUE = 21;

  VAL_NIL = 22;

  VAL_UNDEF = 23;

  SHIFT32 = Math.pow(2, 32);

  COUNT = Symbol('count');

  PENDING_KEY = Symbol('pending_key');

  PARENT = Symbol('parent');

  BREAK = Symbol('break');

  MAJOR = Symbol('major type');

  parseCBORint = function(ai, buf) {
    var f, g;
    switch (ai) {
      case AI_1:
        return buf.readUInt8(0, true);
      case AI_2:
        return buf.readUInt16BE(0, true);
      case AI_4:
        return buf.readUInt32BE(0, true);
      case AI_8:
        f = buf.readUInt32BE(0);
        g = buf.readUInt32BE(4);
        return (f * SHIFT32) + g;
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

  CborStream = (function(superClass) {
    extend(CborStream, superClass);

    function CborStream() {
      return CborStream.__super__.constructor.apply(this, arguments);
    }

    CborStream.PARENT = PARENT;

    CborStream.prototype._parse = function*() {
      var a, again, ai, b, buf, key, m, mt, octet, parent, pm, t;
      parent = null;
      while (true) {
        octet = (yield (-1));
        mt = octet & 0xe0;
        ai = octet & 0x1f;
        switch (ai) {
          case AI_1:
            ai = (yield (-1));
            break;
          case AI_2:
          case AI_4:
          case AI_8:
            buf = (yield (1 << (ai - 24)));
            ai = mt === MT_PRIM ? buf : parseCBORint(ai, buf);
            break;
          case 28:
          case 29:
          case 30:
            throw new Error("Additional info not implemented: " + ai);
            break;
          case AI_INDEF:
            ai = -1;
        }
        switch (mt) {
          case MT_UNSIGNED:
            void 0;
            break;
          case MT_NEGATIVE:
            ai = -1 - ai;
            break;
          case MT_BYTES:
            switch (ai) {
              case 0:
                ai = new Buffer;
                break;
              case -1:
                b = new BufferStream;
                b[MAJOR] = mt;
                b[PARENT] = parent;
                parent = b;
                continue;
              default:
                ai = (yield ai);
            }
            break;
          case MT_TEXT:
            switch (ai) {
              case 0:
                ai = '';
                break;
              case -1:
                b = new BufferStream;
                b[MAJOR] = mt;
                b[PARENT] = parent;
                parent = b;
                continue;
              default:
                ai = ((yield ai)).toString('utf-8');
            }
            break;
          case MT_ARRAY:
            a = [];
            a[PARENT] = parent;
            if (ai !== 0) {
              a[COUNT] = ai;
              parent = a;
              continue;
            }
            ai = a;
            break;
          case MT_MAP:
            m = new Map();
            m[PARENT] = parent;
            if (ai !== 0) {
              m[COUNT] = 2 * ai;
              parent = m;
              continue;
            }
            ai = m;
            break;
          case MT_TAG:
            t = new Tagged(ai);
            t[COUNT] = 1;
            t[PARENT] = parent;
            parent = t;
            continue;
          case MT_PRIM:
            if (typeof ai === 'number') {
              ai = (function() {
                switch (ai) {
                  case VAL_FALSE:
                    return false;
                  case VAL_TRUE:
                    return true;
                  case VAL_NIL:
                    return null;
                  case VAL_UNDEF:
                    return void 0;
                  case -1:
                    if (parent == null) {
                      throw new Error('Invalid BREAK');
                    }
                    parent[COUNT] = 1;
                    return BREAK;
                  default:
                    return new Simple(ai);
                }
              })();
            } else {
              ai = parseCBORfloat(ai);
            }
        }
        again = false;
        while (parent != null) {
          switch (false) {
            case ai !== BREAK:
              void 0;
              break;
            case !Array.isArray(parent):
              parent.push(ai);
              break;
            case !(parent instanceof Map):
              key = parent[PENDING_KEY];
              if (key != null) {
                parent.set(key, ai);
                delete parent[PENDING_KEY];
              } else {
                parent[PENDING_KEY] = ai;
              }
              break;
            case !(parent instanceof Tagged):
              parent.value = ai;
              break;
            case !(parent instanceof BufferStream):
              pm = parent[MAJOR];
              if ((pm != null) && (pm !== mt)) {
                throw new Error('Invalid major type in indefinite encoding');
              }
              parent.write(ai);
              break;
            default:
              throw new Error('Unknown parent type');
          }
          if ((--parent[COUNT]) !== 0) {
            again = true;
            break;
          }
          if (parent instanceof BufferStream) {
            switch (parent[MAJOR]) {
              case MT_BYTES:
                parent = parent.flatten();
                break;
              case MT_TEXT:
                parent = parent.toString('utf-8');
                break;
              default:
                throw new Error('Invalid stream major type');
            }
          }
          delete parent[COUNT];
          ai = parent;
          parent = parent[PARENT];
        }
        if (!again) {
          return ai;
        }
      }
    };

    return CborStream;

  })(BinaryParseStream);

  module.exports = CborStream;

  p = new CborStream;

  p.on('data', console.log);

  process.stdin.pipe(p);

}).call(this);

//# sourceMappingURL=stream.js.map
