"use strict";

/**
 * Based on npm coding standards at https://docs.npmjs.com/misc/coding-style.
 *
 * The places we differ from the npm coding style:
 *   - Commas should be at the end of a line.
 *   - Always use semicolons.
 *   - Functions should not have whitespace before params.
 */

module.exports = {
  "env": {
    "node": true,
    "es6": true
  },
  parserOptions: {
    ecmaVersion: 6,
  },
  "rules": {
    "arrow-spacing": "error",
    "brace-style": ["error", "1tbs"],
    "comma-dangle": ["error", "never"],
    "comma-spacing": "error",
    "comma-style": ["error", "last"],
    "curly": ["error", "multi-line"],
    "generator-star-spacing": "error",
    "handle-callback-err": ["error", "er"],
    "indent": ["error", 2, {"SwitchCase": 1}],
    "keyword-spacing": "error",
    "max-len": ["error", 80],
    "no-const-assign": "error",
    "no-const-assign": "error",
    "no-dupe-class-members": "error",
    "no-duplicate-case": "error",
    "no-fallthrough": "error",
    "no-multiple-empty-lines": ["error", {"max": 1}],
    "no-new-symbol": "error",
    "no-undef-init": "error",
    "no-undef": "error",
    "no-unexpected-multiline": "error",
    "no-var": "error",
    "object-curly-spacing": "off",
    "one-var": ["error", "never"],
    "operator-linebreak": ["error", "after"],
    "prefer-arrow-callback": "error",
    "prefer-const": "error",
    "semi": ["error", "never"],
    "space-before-blocks": "error",
    "space-before-function-paren": ["error", "never"],
    "strict": ["error", "global"],

    // more from hildjj:
    "quotes": ["error", "single"],
  },
};
