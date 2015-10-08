/*jslint node: true */
"use strict";

var fs = require('fs');
var async = require('async');
var bignumber = require('bignumber.js');
var NoFilter = require('nofilter');

var utils = require('../lib/utils');
var hex = utils.hex;
var bin = utils.bin;

exports.bin = function(test) {
  test.deepEqual(utils.bin('1'), hex('01'));
  test.deepEqual(utils.bin('11'), hex('03'));
  test.deepEqual(utils.bin('1100 0000 0000'), hex('0c00'));
  test.done();
}

exports.parseCBORint = function(test) {
  test.deepEqual(utils.parseCBORint(24, hex('ff')), 255);
  test.deepEqual(utils.parseCBORint(25, hex('ffff')), 65535);
  test.deepEqual(utils.parseCBORint(26, hex('00010000')), 65536);
  test.deepEqual(utils.parseCBORint(27, hex('0000000100000000')), 4294967296);
  test.throws(function(){
    utils.parseCBORint(28, hex('ff'));
  });
  test.throws(function(){
    utils.parseCBORint(27, hex('ff'));
  });
  test.done();
};

exports.parseCBORfloat = function(test) {
  test.deepEqual(utils.parseCBORfloat(bin('0 00000 0000000000')), 0);
  test.deepEqual(utils.parseCBORfloat(bin('0 00000000 00000000000000000000000')), 0);
  test.deepEqual(utils.parseCBORfloat(bin('0 00000000000 0000000000000000000000000000000000000000000000000000')), 0);
  test.throws(function(){
    utils.parseCBORfloat(hex('ff'));
  });
  test.throws(function(){
    utils.parseCBORfloat(hex('ff'));
  });

  test.done();
};

exports.parseHalf = function(test) {
  test.deepEqual(utils.parseHalf(bin('0 01111 0000000000')), 1);
  test.deepEqual(utils.parseHalf(bin('1 10000 0000000000')), -2);
  test.deepEqual(utils.parseHalf(bin('0 11110 1111111111')), 65504);
  test.deepEqual(utils.parseHalf(bin('0 00001 0000000000')), 0.00006103515625);
  test.deepEqual(utils.parseHalf(bin('0 00000 0000000000')), 0);
  test.deepEqual(utils.parseHalf(bin('1 00000 0000000000')), -0);
  test.deepEqual(utils.parseHalf(bin('0 11111 0000000000')), Infinity);
  test.deepEqual(utils.parseHalf(bin('1 11111 0000000000')), -Infinity);
  test.done();
};

exports.extend = function(test) {
  test.deepEqual(utils.extend(), {});
  test.deepEqual(utils.extend({}, {foo: 1}), {foo: 1});
  test.deepEqual(utils.extend({foo: 2}, {foo: 1}), {foo: 1});
  test.deepEqual(utils.extend({foo: 2, bar: 2}, {foo: 1}), {foo: 1, bar: 2});
  test.deepEqual(utils.extend({foo: 2, bar: 2}, {foo: 1}, {bar: 3}), {foo: 1, bar: 3});
  test.done();
};

exports.arrayEqual = function(test) {
  test.deepEqual(utils.arrayEqual(), true);
  test.deepEqual(utils.arrayEqual([]), false);
  test.deepEqual(utils.arrayEqual([], []), true);
  test.deepEqual(utils.arrayEqual([1], []), false);
  test.deepEqual(utils.arrayEqual([1,2,3], [1,2,3]), true);
  test.deepEqual(utils.arrayEqual([1,2,3], [1,2,4]), false);
  test.done();
};

exports.bufferEqual = function(test) {
  test.deepEqual(utils.bufferEqual(), true);
  test.deepEqual(utils.bufferEqual(new Buffer(0)), false);
  test.deepEqual(utils.bufferEqual(new Buffer(0), new Buffer(0)), true);
  test.deepEqual(utils.bufferEqual(new Buffer([1]), new Buffer(0)), false);
  test.deepEqual(utils.bufferEqual(new Buffer([1,2,3]), new Buffer([1,2,3])), true);
  test.deepEqual(utils.bufferEqual(new Buffer([1,2,3]), new Buffer([1,2,4])), false);
  test.done();
};

exports.bufferToBignumber = function(test) {
  var num = new bignumber(0x12345678).toString(16);
  var numbuf = new Buffer(num, 'hex');
  test.deepEqual(utils.bufferToBignumber(numbuf), new bignumber(0x12345678));
  test.done();
};

function buildDeHexTest(test) {
  return function (hd, cb) {
    var actual = hd[0];
    var expected = hd[1];

    var d = new utils.DeHexStream(actual);
    test.deepEqual(d.read().toString(), expected);
    cb();
  }
}

exports.DeHexStream = function(test) {
  async.each([
    ['6161', 'aa'],
    ['0x00', '\x00']
  ], function(hd, cb) {
    var d = new utils.DeHexStream(hd[0]);
    test.deepEqual(d.read().toString(), hd[1]);
    cb();
  }, function(er) {
    test.equal(er, null);
    test.done();
  });
};

exports.HexStream = function(test) {
  var h = new utils.HexStream();
  var bs = new NoFilter();
  h.pipe(bs);
  h.on('end', function() {
    test.deepEqual(bs.toString('utf8'), '61');
    test.done();
  })
  h.end(new Buffer([0x61]));
};

exports.streamFilesNone = function(test) {
  utils.streamFiles([], function(){}, function() {
    utils.streamFiles(['/tmp/hopefully-does-not-exist'], function(){
      return new utils.HexStream();
    }, function(er) {
      test.ok(er);
      test.done();
    });
  })
};

exports.streamFilesDash = function(test) {
  var u = new utils.HexStream()
  var bs = new NoFilter();
  u.pipe(bs);
  utils.streamFiles([new utils.DeHexStream('6161')], function(){
    return u;
  }, function(er) {
    test.ifError(er);
    test.deepEqual(bs.toString('utf8'), '6161');
    test.done();
  })
};

exports.guessEncoding = function(test) {
  try {
    utils.guessEncoding();
  } catch (er) {
    test.done();
  }
}
