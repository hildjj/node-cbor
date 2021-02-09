'use strict'
const pkg = require('./package.json')
const MIN_VER = pkg.engines.node.match(/(\d+(\.\d+)?)/)[1]
const fmin = parseFloat(MIN_VER)
const nver = process.version

if (parseFloat(nver.slice(1)) < fmin) {
  console.error(`
+-------------------------------------------------------+
| The cbor package REQUIRES Node.js v${MIN_VER} or higher. ${' '.repeat(7 - MIN_VER.length)}|
| You are currently running Node.js ${nver} ${' '.repeat(19 - nver.length)}|
| Please upgrade node, or pin cbor to version 5.2.x:    |
| \`npm install --save cbor@5.2\`                         |
+-------------------------------------------------------+
`)
  process.exit(1)
}
