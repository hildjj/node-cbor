module.exports = {
  env: {
    browser: true,
  },
  parserOptions: { sourceType: 'module' },
  rules: {
    'node/no-unsupported-features/es-syntax': [
      'error',
      {
        version: '>=12.19',
        ignores: ['modules'],
      },
    ],
  },
}
