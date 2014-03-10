/*jslint node: true */
"use strict";

var cbor = require('../lib/cbor');

exports.create = function(test) {
  var t = new cbor.Tagged(1, "one");
  test.ok(t);
  test.deepEqual(t.tag, 1);
  test.deepEqual(t.value, "one");
  test.deepEqual(t.toString(), '1("one")');

  test.deepEqual(cbor.encode(t), new Buffer('c1636f6e65', 'hex'))
  test.done();
};

exports.edges = function(test) {
  test.throws(function() {
    new cbor.Tagged(-11, "one");
  });

  test.throws(function() {
    new cbor.Tagged(1.1, "one");
  });

  test.throws(function() {
    new cbor.Tagged("zero", "one");
  });

  test.done();
};
