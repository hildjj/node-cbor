/*jslint node: true */

"use strict";

var assert = require('assert');
var util = require('util');
var stream = require('stream');
var BufferStream = require('./BufferStream');
var EventEmitter = require('events').EventEmitter;

function Unallocated(num) {
  if (typeof num !== 'number') {
    throw new Error('Invalid Unallocated type: ' + typeof(num));
  }
  if ((num < 0) || (num > 255) || ((num|0) !== num)) {
    throw new Error('num must be a small positive integer: ' + num);
  }
  this.value = num;
}

/**
 * Convert to string.
 *
 * @param  {int} base Radix for the integer.  Defaults to 10.
 * @return {string}
 */
Unallocated.prototype.toString = function(base) {
  if (!base) { base = 10; }
  var prefix = '';
  if (base == 16) { prefix = '0x'; }
  if (base == 8) { prefix = '0'; }
  if (base == 2) { prefix = '0b'; }
  return "Unallocated-" + prefix + this.value.toString(base);
};

exports.Unallocated = Unallocated;

// ---------------- pack ----------------- //
function intify(i, mt, bufs) {
  mt = mt << 5;
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
    assert.fail(i, "Integer out of range");
  }
}

function p(obj, bufs) {
  var len, i;
  switch(typeof(obj)) {
    case 'number':
      // NaN's mess up everything below
      // Infinite works fine.
      if (!isNaN(obj) && (obj === (obj|0))) {
        // integer
        if (obj >= 0) {
          // unsigned
          intify(obj, 0, bufs);
        } else {
          // negative
          intify(-obj-1, 1, bufs);
        }
      } else {
        // float-ish, such as a big integer
        // TODO: see if we can write smaller ones.
        bufs.writeUInt8(0xdf);
        bufs.writeDoubleBE(obj);
      }
      break;
    case 'string':
      len = Buffer.byteLength(obj, 'utf8');
      intify(len, 3, bufs);
      bufs.writeString(obj, len, 'utf8');
      break;
    case 'boolean':
      bufs.writeUInt8(obj ? 0xd9 : 0xd8);
      break;
    case 'undefined':
      bufs.writeUInt8(0xdb);
      break;
    case 'object':
      if (!obj) {
        // typeof(null) === 'object'
        bufs.writeUInt8(0xda);
      }
      else if (Buffer.isBuffer(obj)) {
        len = obj.length;
        intify(len, 2, bufs);
        bufs.append(obj);
      }
      else if (BufferStream.isBufferStream(obj)) {
        len = obj.length;
        intify(len, 2, bufs);
        bufs.append(obj.flatten());
      }
      else if (Array.isArray(obj)) {
        len = obj.length;
        intify(len, 4, bufs);
        for(i=0; i<len; i++) {
          p(obj[i], bufs);
        }
      }
      else if (obj instanceof Unallocated) {
        intify(obj.value, 6, bufs);
      }
      else if (obj instanceof Date) {
        bufs.writeUInt8(0xeb);
        p(obj.getTime() / 1000, bufs);
      }
      else if (obj instanceof RegExp) {
        bufs.writeUInt8(0xf7);
        p(obj.source, bufs);
      } else {
        var keys = Object.keys(obj);
        len = keys.length;
        intify(len, 5, bufs);
        for (i=0; i<len; i++) {
          var key = keys[i];
          p(key, bufs);
          p(obj[key], bufs);
        }
      }
      break;
    default:
      throw new Error('Unknown type: ' + typeof(obj));
  }
}

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

function _unpackInt(ai, buf) {
  //process.stderr.write(util.inspect(buf));
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
    // Math.pow(2, -24) = 5.9604644775390625e-8
    return sign * 5.9604644775390625e-8 * mant;
  }
  if (exp === 0x1f) {
    return sign * (mant ? NaN : Infinity);
  }
  return sign * Math.pow(2, exp-25) * (1024 + mant);
}

/**
 * Create an instance of a Parser.
 * This class exists to hold the semantic tags that the user wants
 * to parse over and above the default set.
 */
function Parser() {
  var semanticTags = {
    11: _unpackDate,
    23: _unpackRegex
  };

  // hold on to this for callback firing
  var that = this;

  /**
   * Add a processor for a given semantic tag.
   *
   * @param {int} tag The tag number, without the major type bits set.
   * @param {Function(tag, obj, cb)} fun Function called to decode obj
   *   for the tag.  obj will be of the appropriate decoded type for the
   *   item following the tag.  Call cb(error, decodedObj) when you're done.
   */
  this.addSemanticTag = function(tag, fun) {
    var old = semanticTags[tag];
    semanticTags[tag] = fun;
    return old;
  };

  function _unpackSmallNumber(ai, buf, cb) {
    if (ai <= 23) {
      return cb.call(that, null, new Unallocated(ai));
    }
    switch(ai) {
      case 24: return cb.call(that, null, false);
      case 25: return cb.call(that, null, true);
      case 26: return cb.call(that, null, null);
      case 27: return cb.call(that, null, undefined);
      case 28: return cb.call(that, null, new Unallocated(buf[0]));
      case 29: return cb.call(that, null, _unpackHalf(buf));
      case 30: return cb.call(that, null, buf.readFloatBE(0));
      case 31: return cb.call(that, null, buf.readDoubleBE(0));
    }
  }
  function _unpackDate(tag, obj, cb) {
    switch (typeof(obj)) {
      case 'string':
        return cb.call(that, null, new Date(obj)); // RFC 3339
      case 'number':
        return cb.call(that, null, new Date(obj * 1000));
    }
    cb.call(that, new Error('Unsupported date type: ' + typeof(obj)));
  }

  function _unpackRegex(tag, obj, cb) {
    if (typeof(obj) !== 'string') {
      return cb.call(that, new Error("Unsupported RegExp type: " + typeof(obj)));
    }
    cb.call(that, null, new RegExp(obj));
  }

  function _unpackSemanticTag(tag, bs, cb) {
    _unpack(bs, function(er, obj) {
      if (er) { return cb.call(that, er); }

      var f = semanticTags[tag];
      if (f) {
        f.call(this, tag, obj, cb);
      } else {
        cb.call(that, null, obj, tag);
      }
    }, true); // make sure we don't allow double-tags!!
  }

  function _unpackArray(bs, left, res, cb) {
    if (left === 0) {
      cb.call(that, null, res);
    } else {
      _unpack(bs, function(er, obj) {
        if (er) { return cb.call(that, er); }

        res.push(obj);
        _unpackArray(bs, left-1, res, cb);
      });
    }
  }

  function _unpackMap(bs, left, res, cb) {
    if (left === 0) {
      cb.call(that, null, res);
    } else {
      _unpack(bs, function(er, key) {
        if (er) { return cb.call(that, er); }
        _unpack(bs, function(er, val) {
          if (er) { return cb.call(that, er); }
          res[key] = val;
          _unpackMap(bs, left-1, res, cb);
        });
      });
    }
  }

  function _getVal(mt, num, bs, cb, tagged) {
    switch (mt) {
      case 0: // positive int
        return cb.call(that, null, num);
      case 1: // negative int
        return cb.call(that, null, -1 - num);
      case 2: // octet string
        return bs.wait(num, cb);
      case 3: // UTF8 string
        return bs.wait(num, function(er, buf) {
          if (er) { return cb.call(that, er); }
          // TODO: check for malformed UTF-8, and error out
          cb.call(that, null, buf.toString('utf8'));
        });
      case 4: // 0b110: array
        return _unpackArray(bs, num, [], cb);
      case 5: // 0b111: map
        return _unpackMap(bs, num, {}, cb);
      case 6:
        // num < 28
        return _unpackSmallNumber(num, null, cb);
      case 7: // semantic tag
        if (tagged) {
          return cb.call(that, new Error('Tag must not follow a tag'));
        }
        return _unpackSemanticTag(num, bs, cb);
    }
    assert.ok(false, "Invalid state.  Can't get here.");
  }

  function _unpack(bs, cb, tagged) {
    bs.wait(1, function(er, buf) {
      if (er) { return cb.call(that, er); }

      var octet = buf[0];
      var mt = octet >> 5;
      var ai = octet & 0x1f;
      var additionalBytes = ai - 28;
      if (additionalBytes >= 0) {
        bs.wait(1 << additionalBytes, function(er, buf) {
          if (er) { return cb.call(that, er); }
          if (mt == 6) {
            // might be floats
            _unpackSmallNumber(ai, buf, cb);
          } else {
            _getVal(mt, _unpackInt(ai, buf), bs, cb, tagged);
          }
        });
      } else {
        _getVal(mt, ai, bs, cb, tagged);
      }
    });
  }

  /**
   * Unpack a CBOR data item.
   *
   * @param  {Buffer or BufferStream}   buf    Input bytes.  If BufferStream,
   *   read from asynchronously.
   * @param  {int}   offset offset in bytes from the beginning of buf to
   *   start reading, if buf is a Buffer
   * @param  {Function(error, object)} cb     Results or an error are available.
   */
  this.unpack = function(buf, offset, cb) {
    // buf: Buffer or BufferStream
    // offset(optional): if Buffer, start from this offset.  Otherwise ignored.
    // cb(error, object, [unknown tag type])
    var bs = buf;

    if (!cb) {
      cb = offset;
      offset = 0;
    }
    if (typeof(cb) != 'function') {
      throw new Error('cb must be a function');
    }

    if (Buffer.isBuffer(bs)) {
      if (offset) {
        bs = bs.slice(offset);
      }
      bs = new BufferStream({bsInit: bs});
    }
    else if (!BufferStream.isBufferStream(bs)) {
      throw new Error("buf must be Buffer or BufferStream");
    }

    _unpack(bs, cb);
  };
}
exports.Parser = Parser;

util.inherits(ParseStream, stream.Writable);

function ParseStream(options) {
  stream.Writable.call(this, options);

  var that = this;
  var bs = new BufferStream(options);
  var parser = new Parser();

  function getNext() {
    parser.unpack(bs, gotMsg);
  }

  function gotMsg(er, object) {
    if (er) {
      that.emit('error', er);
    } else {
      that.emit('msg', object);
      process.nextTick(getNext);
    }
  }

  this.write = function(chunk, encoding, callback) {
    bs.write(chunk, encoding, callback);
  };

  process.nextTick(getNext);
}

exports.ParseStream = ParseStream;
