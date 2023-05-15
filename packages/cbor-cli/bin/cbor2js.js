#!/usr/bin/env node

import * as cbor from 'cbor'
import * as utils from '../lib/utils.js'
import {Command} from 'commander'
import {addBigDecimal} from 'cbor-bigdecimal'
import util from 'util'

addBigDecimal(cbor)

const pkg = await utils.pkg()

const program = new Command()
  .version(pkg.version, 'Files to process, or "-" for stdin')
  .argument('[file...]')
  .option('-x, --hex <STRING>', 'Hex string input')
  .option('-e, --exports', 'add module.exports= to the beginning')
  .option('-H, --hidden', 'Include non-enumerable symbols and properties')
  .parse(process.argv)

const opts = program.opts()
const argv = program.args
if (opts.hex) {
  argv.push(new utils.DeHexStream(opts.hex))
}

if (argv.length === 0) {
  argv.push('-')
}

utils.streamFiles(argv, () => {
  const d = new cbor.Decoder()
  d.on('data', v => {
    if (opts.exports) {
      process.stdout.write('module.exports = ')
    }
    console.log(util.inspect(v, {
      compact: false,
      colors: process.stdout.isTTY,
      showHidden: opts.hidden,
      showProxy: opts.hidden,
      depth: Infinity,
      sorted: true,
      breakLength: process.env.COLS || 80,
    }))
  })
  return d
}).catch(e => {
  utils.printError(e)
  process.exit(1)
})
