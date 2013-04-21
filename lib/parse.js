/*jslint node: true */
"use strict";

var assert = require('assert');
var stream = require('stream');
var url    = require('url');
var util   = require('util');
var utils  = require('./utils');

var BufferStream = require('./BufferStream');
var Unallocated  = require('./unallocated');
var Tagged       = require('./tagged');

/**
 * Create an instance of a Parser.
 * This class exists to hold the semantic tags that the user wants
 * to parse over and above the default set.
 */
function Parser(options) {
  options = options || {};

  var semanticTags = {
    11: _unpackDate,
    15: _unpackUri,
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

  var tags = options.psTags;
  if (tags) {
    var tagKeys = Object.keys(tags);
    for (var i=0; i<tagKeys.length; i++) {
      var tag = tagKeys[i];
      var fun = tags[tag];
      this.addSemanticTag(tag, fun);
    }
  }

  function _unpackSmallNumber(ai, buf, cb) {
    switch(ai) {
      case 24: return cb.call(that, null, false);
      case 25: return cb.call(that, null, true);
      case 26: return cb.call(that, null, null);
      case 27: return cb.call(that, null, undefined);
      case 28: return cb.call(that, null, new Unallocated(buf[0]));
      case 29: return cb.call(that, null, utils.parseHalf(buf));
      case 30: return cb.call(that, null, buf.readFloatBE(0));
      case 31: return cb.call(that, null, buf.readDoubleBE(0));
      default:
        return cb.call(that, null, new Unallocated(ai));
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

  function _unpackUri(tag, obj, cb) {
    if (typeof(obj) !== 'string') {
      return cb.call(that, new Error("Unsupported Uri type: " + typeof(obj)));
    }
    cb.call(that, null, url.parse(obj, true));
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
        f.call(that, tag, obj, cb);
      } else {
        cb.call(that, null, new Tagged(tag, obj));
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
            _getVal(mt, utils.parseInt(ai, buf), bs, cb, tagged);
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
   * @param  {Buffer or BufferStream} buf  Input bytes.  If BufferStream,
   *   read from asynchronously.
   * @param  {int}   offset offset in bytes from the beginning of buf to
   *   start reading, if buf is a Buffer
   * @param  {Function(error, object)} cb  Results or an error are available.
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

/**
 * Parse a stream of CBOR bytes.  This class is a writable stream, so you can
 * just pipe in an existing stream (like a file or socket).  Listen for the
 * 'msg', 'error', and 'finish' events.
 *
 * @param {Object} options Options passed to the constructors for BufferStream,
 *     Parser, and the superclass stream.Writable.
 */
function ParseStream(options) {
  options = options || {};
  stream.Writable.call(this, options);

  var that = this;
  var bs = new BufferStream(options);
  var parser = new Parser(options);

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

/**
 * Unpack the first CBOR data item from input.
 *
 * @param  {Buffer, BufferStream, or stream.Readable} input  Source to read from.
 * @param  {object} [options] Optional stream options.
 *   Extra option: psOffset: Offset from start of input to start reading.  Only
 *                 used if input is a Buffer.
 *   Other options only used if input is a stream.
 * @param  {Function(er, obj)} cb  Called once on completion.
 */
exports.unpack = function(input, options, cb) {
  if (!cb) {
    cb = options;
    options = {};
  }
  if (typeof cb !== 'function') {
    throw new Error('cb must be function');
  }
  if (Buffer.isBuffer(input) || BufferStream.isBufferStream(input)) {
    var p = new Parser(options);
    p.unpack(input, options.psOffset, cb);
  }
  else if (input instanceof stream.Readable) {
    var ps = new ParseStream(options);

    // only parse the first data item from the stream, ignore subsequent
    // errors.
    var fired = false;
    ps.on('msg', function(obj) {
      if (!fired) {
        fired = true;
        cb(null, obj);
      }
    });
    ps.on('error', function(er) {
      if (!fired) {
        fired = true;
        cb(er);
      }
    });
    ps.on('finish', function() {
      if (!fired) {
        fired = true;
        cb(new Error("End of file"));
      }
    });
    input.pipe(ps);
  } else {
    throw new Error("Unknown input type");
  }
};
