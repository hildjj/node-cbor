/*jslint node: true */
"use strict";

var fs = require('fs');
var async = require('async');
var bignumber = require('bignumber.js');

var BufferStream = require('../lib/BufferStream');
var utils = require('../lib/utils');
var hex = utils.hex;
var bin = utils.bin;

exports.bin = function(test) {
  test.deepEqual(utils.bin('1'), hex('01'));
  test.deepEqual(utils.bin('11'), hex('03'));
  test.deepEqual(utils.bin('1100 0000 0000'), hex('0c00'));
  test.done();
}

exports.parseInt = function(test) {
  test.deepEqual(utils.parseInt(24, hex('ff')), 255);
  test.deepEqual(utils.parseInt(25, hex('ffff')), 65535);
  test.deepEqual(utils.parseInt(26, hex('00010000')), 65536);
  test.deepEqual(utils.parseInt(27, hex('0000000100000000')), 4294967296);
  test.throws(function(){
    utils.parseInt(28, hex('ff'));
  });
  test.throws(function(){
    utils.parseInt(27, hex('ff'));
  });
  test.done();
};

exports.parseFloat = function(test) {
  test.deepEqual(utils.parseFloat(25, bin('0 00000 0000000000')), 0);
  test.deepEqual(utils.parseFloat(26, bin('0 00000000 00000000000000000000000')), 0);
  test.deepEqual(utils.parseFloat(27, bin('0 00000000000 0000000000000000000000000000000000000000000000000000')), 0);
  test.throws(function(){
    utils.parseFloat(28, hex('ff'));
  });
  test.throws(function(){
    utils.parseFloat(24, hex('ff'));
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
  var bt = buildDeHexTest(test);
  async.each([
    ['6161', 'aa'],
    ['0x00', '\x00']
  ], bt, function(er) {
    test.equal(er, null);
    test.done();
  });
};
