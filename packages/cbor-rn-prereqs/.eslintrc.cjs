'use strict'

module.exports = {
  root: true,
  extends: ['@cto.af', '@cto.af/eslint-config/jsdoc', 'plugin:markdown/recommended'],
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'example/',
  ],
  parserOptions: {
    ecmaVersion: '2022',
  },
  rules: {
    'no-empty': ['error', {allowEmptyCatch: true}],
    'jsdoc/no-undefined-types': 'off', // Switch to typedoc
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
