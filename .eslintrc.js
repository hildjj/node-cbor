'use strict'

module.exports = {
  root: true,
  extends: '@cto.af',
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'example/',
    'docs/scripts/'
  ],
  rules: {
    'no-empty': ['error', { allowEmptyCatch: true }]
  }
}
