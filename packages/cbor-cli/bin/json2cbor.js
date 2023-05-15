#!/usr/bin/env node
import * as cbor from 'cbor'
import * as utils from '../lib/utils.js'
import {Command} from 'commander'
import {Parser} from 'json-text-sequence'
import {addBigDecimal} from 'cbor-bigdecimal'

addBigDecimal(cbor)

const pkg = await utils.pkg()
const program = new Command()
  .version(pkg.version)
  .argument('[file...]')
  .option('-x, --hex', 'Hex string output')
  .option('-c, --canonical', 'Canonical output')
  .parse(process.argv)

const opts = program.opts()
const argv = program.args
if (argv.length === 0) {
  argv.push('-')
}

utils.streamFiles(argv, () => {
  const p = new Parser()
  const d = new cbor.Encoder({canonical: opts.canonical})
  p.pipe(d)
  p.on('truncated', b => {
    try {
      d.write(JSON.parse(b))
    } catch (e) {
      e.message += ` for input ${b.inspect()}`
      throw e
    }
  })
  let o = d
  if (opts.hex) {
    o = new utils.HexStream()
    d.pipe(o)
    o.on('end', () => process.stdout.write('\n'))
  }
  o.pipe(process.stdout)
  return p
}).catch(e => {
  utils.printError(e)
  process.exit(1)
})
