'use strict'

module.exports = {
  root: true,
  extends: ['@cto.af', '@cto.af/eslint-config/jsdoc', 'plugin:markdown/recommended'],
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'example/',
    'docs/scripts/',
  ],
  rules: {
    'no-empty': ['error', {allowEmptyCatch: true}],
  },
  overrides: [
    {
      files: ['**/*.md/*.js'],
      rules: {
        'no-console': 'off',
      },
    },
  ],
}
