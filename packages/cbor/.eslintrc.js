'use strict'

module.exports = {
  rules: {
    'jsdoc/no-undefined-types': ['error', {
      definedTypes: [
        'Generator', // Comes in from Typescript
        'NodeJS',
        'Iterable',
        'IterableIterator',
        'InspectOptionsStylized', // From Node
        'BufferEncoding',
      ],
    }],
  },
}
