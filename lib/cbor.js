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

exports.pack = function pack(obj, bufs) {
  if (bufs) {
    // don't flatten
    return p(obj, bufs);
  }
  bufs = new BufferStream();
  p(obj, bufs);
  return bufs.flatten();
};

function deintify(ai, bs, cb) {
  if (ai <= 0x1b) {
    cb.call(bs, null, ai, 1);
  }
  else if (ai === 0x1c) {
    bs.wait(1, function(er, buf) {
      cb.call(bs, er, er || buf.readUInt8(0), 1);
    });
  }
  else if (ai === 0x1d) {
    bs.wait(2, function(er, buf) {
      cb.call(bs, er, er || buf.readUInt16BE(0), 2);
    });
  }
  else if (ai === 0x1e) {
    bs.wait(4, function(er, buf) {
      cb.call(bs, er, er || buf.readUInt32BE(0), 4);
    });
  }
  else {
    assert.equal(ai, 0x1f);
    bs.wait(8, function(er, buf) {
      if (er) {
        cb.call(bs, er);
      } else {
        var f = buf.readUInt32BE(0);
        var g = buf.readUInt32BE(4);
        cb.call(bs, null, (f << 32) | g, 8);
      }
    });
  }
}

function _unpackSmallNumber(ai, bs, cb) {
  switch (ai) {
    case 0x00: case 0x01: case 0x02: case 0x03: case 0x04:
    case 0x05: case 0x06: case 0x07: case 0x08: case 0x09:
    case 0x0a: case 0x0b: case 0x0c: case 0x0d: case 0x0e:
      return cb(new Error('Reserved opcode: ' + octet));
    case 0x0f: case 0x10: case 0x11: case 0x12: case 0x13:
    case 0x14: case 0x15: case 0x16: case 0x17:
      return cb(null, 'special' + ai);
      break;
    case 0x18:
      return cb(null, false);
    case 0x19:
      return cb(null, true);
    case 0x1a:
      return cb(null, null);
    case 0x1b:
      return cb(null, undefined);
    case 0x1c:
      return bs.wait(1, function(er, buf) {
        if (er) {
          cb(er);
        } else {
          var nextspecial = buf[0] + 28;
          cb(null, 'special' + nextspecial);
        }
      });
    case 0x1d:
      return cb(new Error('Half-precision not implemented'));
    case 0x1e:
      return bs.wait(4, function(er, buf){
        cb(er, er || buf.readFloatBE(0));
      });
    case 0x1f:
      return bs.wait(8, function(er, buf){
        cb(er, er || buf.readDoubleBE(0));
      });
    default:
      return cb(new Error('Invalid state')); // should never happen
  }
}

function _unpackSemanticTag(ai, bs, cb) {
  deintify(ai, bs, function(er, tag) {
    if (er) { return cb(er); }

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
      cb(new Error("Not implemented: tag 0x" + tag.toString(16)));
    });
  });
}

function _unpackArray(bs, left, res, cb) {
  if (left == 0) {
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
  if (left == 0) {
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

function _unpack(bs, cb) {

  bs.wait(1, function(er, buf) {
    if (er) { return cb(er); }

    var octet = buf[0];
    var mt = octet & 0xe0;
    var ai = octet & 0x1f;
    switch (mt) {
      case 0x00: // 0b000: positive int
        return deintify(ai, bs, cb);
      case 0x20: // 0b001: negative int
        return deintify(ai, bs, function(er, pos){
          cb(er, er || (-1 - pos));
        });
      case 0x40: // 0b010: small number of types
        return _unpackSmallNumber(ai, bs, cb);
      case 0x60: // 0b011: Semantic tag
        return _unpackSemanticTag(ai, bs, cb);
      case 0x80: // 0b100: octet string
        return deintify(ai, bs, function(er, len) {
          if (er) { return cb(er); }
          bs.wait(len, cb);
        });
      case 0xa0: // 0b101: UTF8 string
        return deintify(ai, bs, function(er, len) {
          if (er) { return cb(er); }
          bs.wait(len, function(er, buf) {
            cb(er, er || buf.toString('utf8'));
          });
        });
      case 0xc0: // 0b110: array
        return deintify(ai, bs, function(er, len) {
          if (er) { return cb(er); }
          _unpackArray(bs, len, [], cb);
        });
      case 0xe0: // 0b111: map
        return deintify(ai, bs, function(er, len) {
          if (er) { return cb(er); }
          _unpackMap(bs, len, [], cb);
        });
      default:
        cb(new Error('Invalid state:' + mt)); // should never happen
    }
  });
};

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
