module.exports = {
  parserOptions: {
    sourceType: 'module',
  },
  rules: {
    'n/no-unsupported-features/es-syntax': [
      'error',
      {
        version: '>=16',
        ignores: ['modules'],
      },
    ],
  },
}
