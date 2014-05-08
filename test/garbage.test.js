/*jslint node: true */
"use strict";

var cbor = require('../lib/cbor');
var async = require('async');
var garbage = require('garbage');

var REPEATS = 10000;

exports.garbage = function(test) {
  async.times(REPEATS, function(n, next) {
    var g = garbage(100);
    var c = cbor.encode(g);
    cbor.decode(c, function(er, ary) {
      next(er, [ary[0], g]);
    });
  }, function(er, results) {
    test.ifError(er);
    results.forEach(function(res) {
      test.deepEqual.apply(test, res, res.toString());
    });
    test.expect(REPEATS+1);
    test.done();
  });
};
