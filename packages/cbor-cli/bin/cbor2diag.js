#!/usr/bin/env node

import * as cbor from 'cbor'
import * as utils from '../lib/utils.js'
import {Command} from 'commander'

const pkg = await utils.pkg()

const program = new Command()
  .version(pkg.version)
  .argument('[file...]', 'Files to read, or "-" for stdin')
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
  const d = new cbor.Diagnose()
  d.pipe(process.stdout)
  return d
}).catch(utils.printError)
