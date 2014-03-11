/*jslint node: true */
"use strict";

var cbor = require('../lib/cbor');

exports.create = function(test) {
  var u = new cbor.Simple(0);
  test.deepEqual(u.value, 0);

  test.deepEqual(cbor.Simple.isSimple(u), true);
  test.deepEqual(cbor.Simple.isSimple("foo"), false);

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
