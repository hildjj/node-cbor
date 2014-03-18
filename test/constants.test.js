/*jslint node: true */
"use strict";

var constants = require('../lib/constants');

exports.constants = function(test) {
  // This is a cheat, to "test" the syntactic sugar
  new constants.MT();
  new constants.TAG();
  new constants.NUM_BYTES();
  new constants.SIMPLE();
  test.done();
};
