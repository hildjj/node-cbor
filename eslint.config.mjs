import ava from '@cto.af/eslint-config/ava.js';
import base from '@cto.af/eslint-config';
import globals from '@cto.af/eslint-config/globals.js';
import markdown from '@cto.af/eslint-config/markdown.js';

export default [
  {
    ignores: [
      'packages/browserify-demo/dist/**',
      'packages/cbor-bigdecimal/dist/**',
      'packages/cbor-web/dist/**',
      'packages/plain-demo/dist/**',
      'packages/webpack-demo/dist/**',
      '**/*.d.ts',
    ],
  },
  ...base,
  ...markdown,
  ...ava,
  {
    files: [
      'packages/cbor/lib/**',
      'packages/cbor/test/**',
      'packages/browserify-demo/src/**',
      'packages/webpack-demo/src/**',
    ],
    rules: {
      'n/prefer-node-protocol': 'off',
    },
  },
  {
    files: [
      'packages/cbor-cli/**',
    ],
    rules: {
      'no-console': 'off',
    },
  },
  {
    files: [
      'packages/cbor-web/lib/**',
      'packages/parcel-demo/src/**',
    ],
    languageOptions: {
      sourceType: 'module',
      globals: globals.browser,
    },
    rules: {
      'n/prefer-node-protocol': 'off',
    },
  },
];
