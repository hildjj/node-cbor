/*jslint node: true */
"use strict";

var csrequire = require('covershot').require.bind(null, require);
var EventedParser = csrequire('../lib/evented');

var hex = csrequire('../lib/utils').hex;

exports.unpack = function(test) {
  var parser = new EventedParser();
  var foundValue = false;
  parser.on('value', function(value, tags, kind) {
    foundValue = value;
  });
  parser.on('end', function() {
    test.deepEqual(foundValue, 1);
    test.done();
  });
  parser.on('error', function(er) {
    test.fail(er);
  });
  parser.unpack(new Buffer('0001', 'hex'), 1);
};
