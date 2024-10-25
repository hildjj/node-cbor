'use strict';

const stream = require('stream');
const cbor = require(process.env.CBOR_PACKAGE || '../');
const Buffer = cbor.encode(0).constructor;

exports.DeHexStream = class DeHexStream extends stream.Readable {
  constructor(hex) {
    super();
    hex = hex.replace(/^0x/, '');
    if (hex) {
      this.push(Buffer.from(hex, 'hex'));
    }
    this.push(null);
  }
};

exports.HexStream = class HexStream extends stream.Transform {
  constructor(options) {
    super(options);
  }

  _transform(fresh, encoding, cb) {
    this.push(fresh.toString('hex'));
    return cb();
  }
};
