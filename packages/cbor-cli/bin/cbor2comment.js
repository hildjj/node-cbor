#!/usr/bin/env node

import * as cbor from 'cbor'
import * as utils from '../lib/utils.js'
import {Command} from 'commander'

const pkg = await utils.pkg()

const program = new Command()
  .version(pkg.version)
  .argument('[file ...]', 'Files to read, or "-" for stdin')
  .option('-x, --hex <string>', 'Hex string input')
  .option('-t, --tabsize [spaces]', 'Indent amount')
  .parse(process.argv)

const opts = program.opts()

const numTabs = (opts.tabsize | 0) || 10
const argv = program.args
if (opts.hex) {
  argv.push(new utils.DeHexStream(opts.hex))
}

if (argv.length === 0) {
  argv.push('-')
}

utils.streamFiles(argv, () => {
  const c = new cbor.Commented({
    // Backwards-compat
    max_depth: numTabs,
  })
  c.pipe(process.stdout)
  return c
}).catch(utils.printError)
