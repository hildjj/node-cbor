assert = require('assert');
BufferStream = require('./BufferStream')

// ---------------- pack ----------------- //
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
        if (!obj) {
          // typeof(null) === 'object'
          bufs.writeUInt8(0x5a);
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
      }
      break;
    default:
      throw new Error('Unknown type: ' + typeof(obj));
  }
};

exports.pack = function pack(obj, bufs) {
  if (bufs) {
    // don't flatten
    return p(obj, bufs);
  }
  bufs = new BufferStream();
  p(obj, bufs);
  return bufs.flatten();
};

// ---------------- unpack ----------------- //
function deintify(ai, buf) {
  switch (ai) {
    case 28: return buf.readUInt8(0);
    case 29: return buf.readUInt16BE(0);
    case 30: return buf.readUInt32BE(0);
    case 31:
      var f = buf.readUInt32BE(0);
      var g = buf.readUInt32BE(4);
      return (f * Math.pow(2,32)) + g;
  }

  assert.ok(false, "Invalid additional info: " + ai);
}

function _unpackHalf(buf) {
  var sign = (buf[0] & 0x80) ? -1 : 1;
  var exp = (buf[0] & 0x7C) >> 2;
  var mant = ((buf[0] & 0x03) << 8) | buf[1];
  if (!exp) {
    // subnormal
    return sign * Math.pow(2,-14) * (mant/1024.0);
  }
  if (exp === 0x1f) {
    return sign * (mant ? NaN : Infinity);
  }
  return sign * Math.pow(2, exp-15) * (1 + (mant/1024.0));
};

function _unpackSmallNumber(ai, buf, cb) {
  if (ai <= 23) {
    return cb(null, 'unallocated' + ai);
  }
  switch(ai) {
    case 24: return cb(null, false);
    case 25: return cb(null, true);
    case 26: return cb(null, null);
    case 27: return cb(null, undefined);
    case 28: return cb(null, 'unallocated' + buf[0]);
    case 29: return cb(null, _unpackHalf(buf));
    case 30: return cb(null, buf.readFloatBE(0));
    case 31: return cb(null, buf.readDoubleBE(0));
  }
}

function _unpackSemanticTag(tag, bs, cb) {
  _unpack(bs, function(er, obj) {
    if (er) { return cb(er); }

    switch(tag) {
      case 0x11: // date/time
        switch (typeof(obj)) {
          case 'string':
            return cb(null, new Date(obj));
          case 'number':
            /* Note that the number can be fractional and/or negative. */
            return cb(null, new Date(obj * 1000));
          default:
            return cb(new Error('Unsupported date type: ' + typeof(obj)));
        }
      case 0x17: // regex
        return cb(null, new RegExp(obj));
    }
    // TODO: do something with the misunderstood tag
    cb(null, obj);
  }, true); // make sure we don't allow double-tags!!
}

function _unpackArray(bs, left, res, cb) {
  if (left === 0) {
    cb(null, res);
  } else {
    _unpack(bs, function(er, obj) {
      if (er) { return cb(er); }

      res.push(obj);
      _unpackArray(bs, left-1, res, cb);
    });
  }
}

function _unpackMap(bs, left, res, cb) {
  if (left === 0) {
    cb(null, res);
  } else {
    _unpack(bs, function(er, key) {
      if (er) { return cb(er); }
      _unpack(bs, function(er, val) {
        if (er) { return cb(er); }
        res[key] = val;
        _unpackMap(bs, left-1, res, cb)
      });
    });
  }
}

function _getVal(mt, num, bs, cb, tagged) {
  switch (mt) {
    case 0: // positive int
      return cb(null, num);
    case 1: // negative int
      return cb(null, -1 - num);
    case 2:
      return _unpackSmallNumber(num, null, cb);
    case 3: // semantic tag
      if (tagged) {
        return cb(new Error('Tag must not follow a tag'));
      }
      return _unpackSemanticTag(num, bs, cb);
    case 4: // octet string
      return bs.wait(num, cb);
    case 5: // UTF8 string
      return bs.wait(num, function(er, buf) {
        if (er) { return cb(er); }
        cb(null, buf.toString('utf8'));
      });
    case 6: // 0b110: array
      return _unpackArray(bs, num, [], cb);
    case 7: // 0b111: map
      return _unpackMap(bs, num, [], cb);
  }
  assert.ok(false, "Invalid state.  Can't get here.");
}

function _unpack(bs, cb, tagged) {
  bs.wait(1, function(er, buf) {
    if (er) { return cb(er); }

    var octet = buf[0];
    var mt = octet >> 5;
    var ai = octet & 0x1f;
    var additionalBytes = ai - 28;
    if (additionalBytes >= 0) {
      bs.wait(1 << additionalBytes, function(er, buf) {
        if (er) { return cb(er); }
        if (mt == 2) {
          // might be floats
          _unpackSmallNumber(ai, buf, cb);
        } else {
          _getVal(mt, deintify(ai, buf), bs, cb, tagged);
        }
      });
    } else {
      _getVal(mt, ai, bs, cb, tagged);
    }
  });
}

exports.unpack = function unpack(buf, offset, cb) {
  // buf: Buffer or BufferStream
  // offset(optional): if Buffer, start from this offset.  Otherwise ignored.
  // cb(error, object, bytesRead)
  var bs = buf;

  if (!cb) {
    cb = offset;
    offset = 0;
  }
  if (typeof(cb) != 'function') {
    throw new Error('cb must be a function')
  }

  if (Buffer.isBuffer(bs)) {
    if (offset) {
      bs = bs.slice(offset);
    }
    bs = new BufferStream({bsInit: bs, bsStartEmpty: true})
  }
  else if (!BufferStream.isBufferStream(bs)) {
    throw new Error("buf must be Buffer or BufferStream")
  }

  _unpack(bs, cb);
}
