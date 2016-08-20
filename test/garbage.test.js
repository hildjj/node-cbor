/*jslint node: true */
"use strict";

var cbor = require('../lib/cbor');
var async = require('async');
var garbage = require('garbage');

var REPEATS = process.env['NODE_CBOR_GARBAGE'] || 10000;
REPEATS = parseInt(REPEATS);

exports.garbage = function(test) {
  if (process.env.NO_GARBAGE) {
    test.done()
  } else {
    async.times(REPEATS, function(n, next) {
      var g = garbage(100);
      var c = cbor.encode(g);
      cbor.decodeFirst(c, function(er, val) {
        next(er, [val, g]);
      });
    }, function(er, results) {
      test.ifError(er);
      results.forEach(function(res) {
        test.deepEqual.apply(test, res, res.toString());
      });
      test.expect(REPEATS+1);
      test.done();
    });
  }
};
