/*jslint node: true */
"use strict";

var assert = require('assert');
var url = require('url');
var BufferStream = require('./BufferStream');
var Unallocated = require('./unallocated');

function _packInt(i, mt, bufs) {
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

function _packNumber(obj, bufs) {
  // NaN's mess up everything below
  // Infinite works fine.
  if (!isNaN(obj) && (obj === (obj|0))) {
    // integer
    if (obj >= 0) {
      // unsigned
      _packInt(obj, 0, bufs);
    } else {
      // negative
      _packInt(-obj-1, 1, bufs);
    }
  } else {
    // float-ish, such as a big integer
    // TODO: see if we can write smaller ones.
    bufs.writeUInt8(0xdf);
    bufs.writeDoubleBE(obj);
  }
}

function _packString(obj, bufs) {
  var len = Buffer.byteLength(obj, 'utf8');
  _packInt(len, 3, bufs);
  bufs.writeString(obj, len, 'utf8');
}

function _packDate(gen, obj, bufs) {
  bufs.writeUInt8(0xeb);
  gen.unsafePack(obj.getTime() / 1000, bufs);
}

function _packBuffer(gen, obj, bufs) {
  _packInt(obj.length, 2, bufs);
  bufs.append(obj);
}

function _packRegexp(gen, obj, bufs) {
  bufs.writeUInt8(0xf7);
  gen.unsafePack(obj.source, bufs);
}

function _packUrl(gen, obj, bufs) {
  bufs.writeUInt8(0xef);
  gen.unsafePack(obj.format(), bufs);
}

function _packArray(gen, obj, bufs) {
  var len = obj.length;
  _packInt(len, 4, bufs);
  for (var i=0; i<len; i++) {
    gen.unsafePack(obj[i], bufs);
  }
}

function Generator(options) {
  options = options || {};

  // Array of type, packer... tuples
  var semanticTypes = [
    Array, _packArray,
    Date, _packDate,
    Buffer, _packBuffer,
    BufferStream, BufferStream.pack,
    RegExp, _packRegexp,
    url.Url, _packUrl,
    Unallocated, Unallocated.pack
  ];

  // hold on to this for callback firing
  var that = this;

  /**
   * Add a packing function for a given data type.
   *
   * @param {Type} type The data type to pack
   * @param {Function(generator, obj, cb)} fun Function called to enccode obj.
   *   obj will be an instanceof type.
   *   Call cb(error, decodedObj) when you're done.
   */
  this.addSemanticType = function(type, fun) {
    for (var i=0; i<semanticTypes.length; i+=2) {
      if (semanticTypes[i] === type) {
        var old = semanticTypes[i+1];
        semanticTypes[i+1] = fun;
        return old;
      }
    }
    semanticTypes.push(type, fun);
    return null;
  };

  var types = options.genTypes;
  if (types) {
    for (var i=0; i<types.length; i+=2) {
      this.addSemanticType(types[i], types[i+1]);
    }
  }

  function _packObject(gen, obj, bufs) {
    if (!obj) { // typeof(null) === 'object'
      return bufs.writeUInt8(0xda);
    }

    for (var i=0; i<semanticTypes.length; i+=2) {
      if (obj instanceof semanticTypes[i]) {
        return semanticTypes[i+1].call(that, that, obj, bufs);
      }
    }
    var keys = Object.keys(obj);
    var len = keys.length;
    _packInt(len, 5, bufs);
    for (i=0; i<len; i++) {
      var key = keys[i];
      gen.unsafePack(key, bufs);
      gen.unsafePack(obj[key], bufs);
    }
  }

  this.unsafePack = function(obj, bufs) {
    switch(typeof(obj)) {
      case 'number':
        _packNumber(obj, bufs);
        break;
      case 'string':
        _packString(obj, bufs);
        break;
      case 'boolean':
        bufs.writeUInt8(obj ? 0xd9 : 0xd8);
        break;
      case 'undefined':
        bufs.writeUInt8(0xdb);
        break;
      case 'object':
        _packObject(this, obj, bufs);
        break;
      default:
        throw new Error('Unknown type: ' + typeof(obj));
    }
  };
}

Generator.prototype.pack = function(obj, bufs) {
  if (bufs) {
    // don't flatten
    return this.unsafePack(obj, bufs);
  }
  bufs = new BufferStream();
  this.unsafePack(obj, bufs);
  return bufs.flatten();
};

exports.pack = function pack(obj, bufs) {
  var gen = new Generator();
  return gen.pack(obj, bufs);
};

Generator.packInt = _packInt;
exports.Generator = Generator;
