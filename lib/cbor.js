assert = require('assert');
BufferStream = require('./BufferStream')

function intify(i, mt, bufs) {
  if (i <= 0x1b) {
    bufs.writeUInt8(mt | i);
  }
  else if (i <= 0xff) {
    bufs.writeUInt8(mt | 0x1c);
    bufs.writeUInt8(i);
  }
  else if (i <= 0xffff) {
    bufs.writeUInt8(mt | 0x1d);
    bufs.writeUInt16BE(i);
  }
  else if (i <= 0x7fffffff) {
    bufs.writeUInt8(mt | 0x1e);
    bufs.writeUInt32BE(i);
  }
  else {
    throw new Error("Integer out of range: " + i)
  }
}

function p(obj, bufs) {
  switch(typeof(obj)) {
    case 'number':
      if (isNaN(obj)) {
        bufs.writeUInt8(0x5f);
        bufs.writeDoubleBE(obj);
      }
      else if (obj === (obj|0)) {
        // integer
        if (obj >= 0) {
          // unsigned
          intify(obj, 0x00, bufs);
        } else {
          // negative
          intify(-obj-1, 0x20, bufs);
        }
      } else {
        // float-ish, such as a big integer
        // TODO: see if we can write smaller ones.
        bufs.writeUInt8(0x5f);
        bufs.writeDoubleBE(obj);
      }
      break;
    case 'string':
      var len = Buffer.byteLength(obj, 'utf8');
      intify(len, 0xa0, bufs);
      bufs.writeString(obj, len, 'utf8');
      break;
    case 'boolean':
      if (obj) {
        bufs.writeUInt8(0x59);
      } else {
        bufs.writeUInt8(0x58);
      }
      break;
    case 'null':
      bufs.writeUInt8(0x5a);
      break;
    case 'undefined':
      bufs.writeUInt8(0x5b);
      break;
    case 'object':
      if (Array.isArray(obj)) {
        var len = obj.length;
        intify(len, 0xc0, bufs);
        for(var i=0; i<len; i++) {
          p(obj[i], bufs);
        }
      }
      else if (Buffer.isBuffer(obj)) {
        var len = obj.length;
        intify(len, 0x80, bufs);
        bufs.append(obj);
      }
      else if (obj instanceof Date) {
        bufs.writeUInt8(0x71);
        var t = obj.getTime() / 1000;
        // need to force float here.  Example: new Date(0)
        bufs.writeUInt8(0x5f);
        bufs.writeDoubleBE(t);
      }
      else if (obj instanceof RegExp) {
        // NOT YET IN THE DRAFT!
        bufs.writeUInt8(0x77);
        p(obj.source, bufs);
      } else {
        var keys = Object.keys(obj);
        var len = keys.length;
        intify(len, 0xe0, bufs);
        for (var i=0; i<len; i++) {
          var key = keys[i];
          p(key, bufs);
          p(obj[key], bufs);
        }
      }
      break;
    default:
      throw new Error('Unknown type: ' + typeof(obj));
  }
};

exports.pack = function pack(obj) {
  var bufs = new BufferStream();
  p(obj, bufs);
  return bufs.flatten();
};

function deintify(ai, buf, offset) {
  if (ai <= 0x1b) {
    return [ai, offset];
  }
  if (ai === 0x1c) {
    return [buf.readUInt8(offset), offset+1];
  }
  if (ai === 0x1d) {
    return [buf.readUInt16BE(offset), offset+2];
  }
  if (ai === 0x1e) {
    return [buf.readUInt32BE(offset), offset+4];
  }
  assert.equal(ai, 0x1f);
  var f = buf.readUInt32BE(offset);
  var g = buf.readUInt32BE(offset+4);

  return [(f << 32) | g, offset+8];
}

exports.unpack = function unpack(buf, offset) {
  // returns [object, new offset to read from buf next]

  offset = offset || 0;
  var octet = buf[offset];
  var mt = (octet & 0xe0) >> 5;
  var ai = octet & 0x1f;
  switch (mt) {
    case 0x0: // 0b000: positive int
      return deintify(ai, buf, offset+1);
    case 0x01: // 0b001: negative int
      var ret = deintify(ai, buf, offset+1);
      ret[0] = -1 - ret[0];
      return ret;
    case 0x02: // 0b010: small number of types
      switch (ai) {
        case 0x00: case 0x01: case 0x02: case 0x03: case 0x04:
        case 0x05: case 0x06: case 0x07: case 0x08: case 0x09:
        case 0x0a: case 0x0b: case 0x0c: case 0x0d: case 0x0e:
          throw new Error('Reserved opcode: ' + octet);
        case 0x0f: case 0x10: case 0x11: case 0x12: case 0x13:
        case 0x14: case 0x15: case 0x16: case 0x17:
          return ['special' + ai];
        case 0x18:
          return [false, offset+1];
        case 0x19:
          return [true, offset+1];
        case 0x1a:
          return [null, offset+1];
        case 0x1b:
          return [undefined, offset+1];
        case 0x1c:
          var nextspecial = buf[offset+1] + 28;
          return ['special' + nextspecial, offset+2];
        case 0x1d:
          throw new Error('Half-precision not implemented');
        case 0x1e:
          var ret = buf.readFloatBE(offset+1);
          return [ret, offset+5];
        case 0x1f:
          var ret = buf.readDoubleBE(offset+1);
          return [ret, offset+9];
        default:
          throw new Error('Invalid state'); // should never happen
      }
    case 0x03: // 0b011: Semantic tag
      var tag = deintify(ai, buf, offset+1);
      var ret = unpack(buf, tag[1]);
      switch(tag[0]) {
        case 0x11: // date/time
          switch (typeof(ret[0])) {
            case 'string':
              return [new Date(ret[0]), ret[1]];
            case 'number':
            /* Note that the number can be fractional and/or negative. */
              return [new Date(ret[0] * 1000), ret[1]];
            case 'object':
              if (Array.isArray(ret[0])) {
/* The array contains two numbers, one for seconds, and one (< 10**9) for
   nanoseconds, since 1970-01-01T00:00Z; a third number can be added to
   the array to indicate a timezone in minutes east of UTC (the time
   itself stays in UTC). */
                var ary = ret[0];
                if (ary.length > 2) {
                  throw new Error("I hate timezones");
                }
                return [new Date((ary[0]*1000) + (ary[1] / 1e6)), ret[1]];
              } else {
                throw new Error("Unsupported date type");
              }
            default:
              throw new Error("Unsupported date type: " + typeof(ret[0]));
          }
        case 0x17:
          return [new RegExp(ret[0]), ret[1]];
        default:
          return ret;
      }
      throw new Error("Not implemented: tag 0x" + tag[0].toString(16));
    case 0x04: // 0b100: octet string
      var len = deintify(ai, buf, offset+1);
      return [buf.slice(len[1], len[1]+len[0]), len[1]+len[0]];
    case 0x05: // 0b101: UTF8 string
      var len = deintify(ai, buf, offset+1);
      return [buf.toString('utf8', len[1], len[1]+len[0]), len[1]+len[0]];
    case 0x06: // 0b110: array
      var len = deintify(ai, buf, offset+1);
      var off = len[1];
      len = len[0];
      var ret = [];
      for (var i=0; i<len; i++) {
        var item = unpack(buf, off);
        ret.push(item[0]);
        off = item[1];
      }
      return [ret, off];
    case 0x07: // 0b111: map
      var len = deintify(ai, buf, offset+1);
      var off = len[1];
      len = len[0];
      var ret = {}
      for (var i=0; i<len; i++) {
        var key = unpack(buf, off);
        off = key[1];
        var val = unpack(buf, off);
        off = val[1];
        ret[key[0]] = val[0];
      }
      return [ret, off];
    default:
      throw new Error('Invalid state:' + mt); // should never happen
  }
};
