// Tweaked version of nathan7's binary-parse-stream
// (see https://github.com/nathan7/binary-parse-stream)
// Uses NoFilter instead of the readable in the original.  Removes
// the ability to read -1, which was odd and un-needed.
// License for binary-parse-stream: MIT

'use strict';
exports = module.exports = BinaryParseStream
var Stream = require('stream')
  , TransformStream = Stream.Transform
  , inherits = require('util').inherits
  , NoFilter = require('nofilter')

exports.One = -1

inherits(BinaryParseStream, TransformStream)
function BinaryParseStream(options) {
  TransformStream.call(this, options)
  this._writableState.objectMode = false
  this._readableState.objectMode = true

  this.bs = new NoFilter()
  this.__restart()
}

BinaryParseStream.prototype._transform = function(fresh, encoding, cb) { var self = this
  this.bs.write(fresh)

  while (this.bs.length >= this.__needed) {
    var ret
      , chunk = this.__needed === null
        ? undefined
        : this.bs.read(this.__needed)

    try { ret = this.__parser.next(chunk) }
    catch (e) {
      return cb(e) }

    if (this.__needed)
      this.__fresh = false

    if (!ret.done)
      this.__needed = ret.value | 0
    else {
      this.push(ret.value)
      this.__restart()
    }
  }

  return cb()
}

BinaryParseStream.prototype.__restart = function() {
  this.__needed = null
  this.__parser = this._parse()
  this.__fresh = true
}

BinaryParseStream.prototype._flush = function(cb) {
  cb(this.__fresh
    ? null
    : new Error('unexpected end of input'))
}
