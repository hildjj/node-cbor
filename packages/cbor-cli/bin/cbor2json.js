#!/usr/bin/env node

import * as cbor from 'cbor'
import * as utils from '../lib/utils.js'
import {Command} from 'commander'
import {addBigDecimal} from 'cbor-bigdecimal'

addBigDecimal(cbor)

const pkg = await utils.pkg()
const program = new Command()
  .version(pkg.version)
  .argument('[file...]', 'Files to process, or "-" for stdin')
  .option('-x, --hex <STRING>', 'Hex string input')
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
    console.log(JSON.stringify(v))
  })
  return d
}).catch(utils.printError)
