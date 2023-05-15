'use strict'

module.exports = {
  root: true,
  extends: ['@cto.af/eslint-config/modules', '@cto.af/eslint-config/jsdoc', 'plugin:markdown/recommended'],
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'example/',
    'docs/scripts/',
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
