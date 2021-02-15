'use strict'

module.exports = {
  root: true,
  extends: '@cto.af',
  globals: {
    BigInt: false
  },
  rules: {
    'no-restricted-globals': ['error', 'Buffer']
  }
}
