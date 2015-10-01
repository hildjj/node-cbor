/*jslint node: true */
"use strict";

var cbor = require('../lib/cbor');
var constants = require('../lib/constants');

exports.create = function(test) {
  var u = new cbor.Simple(0);
  test.deepEqual(u.value, 0);

  test.deepEqual(cbor.Simple.isSimple(u), true);
  test.deepEqual(cbor.Simple.isSimple("foo"), false);
  test.deepEqual(u.toString(), "simple(0)");

  test.throws(function() {
    new cbor.Simple("0");
  });
  test.throws(function() {
    new cbor.Simple(-1);
  });
  test.throws(function() {
    new cbor.Simple(256);
  });
  test.throws(function() {
    new cbor.Simple(1.1);
  });

  test.done();
};

exports.decode = function(test) {
  test.ok(cbor.Simple.decode(constants.SIMPLE.NULL) == null);
  test.equal(typeof(cbor.Simple.decode(constants.SIMPLE.UNDEFINED)), 'undefined');
  try {
    cbor.Simple.decode(-1, false);
  } catch (er) {
    test.ok(er);
    test.done();
  }
};
