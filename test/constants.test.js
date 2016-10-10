'use strict'

var constants = require('../lib/constants')

exports.constants = function (test) {
  test.ok(constants.MT)
  test.ok(constants.TAG)
  test.ok(constants.NUMBYTES)
  test.ok(constants.SIMPLE)
  test.ok(constants.SYMS)
  test.ok(constants.SHIFT32)
  test.done()
}
