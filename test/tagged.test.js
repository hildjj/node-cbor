/*jslint node: true */
"use strict";

var csrequire = require('covershot').require.bind(null, require);
var cbor = csrequire('../lib/cbor');

exports.create = function(test) {
  var t = new cbor.Tagged(1, "one");
  test.ok(t);
  test.deepEqual(t.tag, 1);
  test.deepEqual(t.value, "one");
  test.deepEqual(t.toString(), '1("one")');

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
