#!/usr/bin/env node
'use strict';

const cbor = require('cbor');
const utils = require('../lib/utils');
const pkg = require('../package.json');
const {program} = require('commander');

const opts = program
  .version(pkg.version)
  .argument('[file...]', 'Files to read, "-" for stdin')
  .usage('[options] [file ...]')
  .option('-x, --hex <string>', 'Hex string input')
  .option('-t, --tabsize [spaces]', 'Indent amount')
  .parse(process.argv)
  .opts();

const numTabs = (opts.tabsize | 0) || 10;
const argv = program.args;
if (opts.hex) {
  argv.push(new utils.DeHexStream(opts.hex));
}

if (argv.length === 0) {
  argv.push('-');
}

utils.streamFiles(argv, () => {
  const c = new cbor.Commented({
    // Backwards-compat
    max_depth: numTabs,
  });
  c.pipe(process.stdout);
  return c;
}).catch(utils.printError);
