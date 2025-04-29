#!/usr/bin/env node
'use strict';

const cbor = require('cbor');
const utils = require('../lib/utils');
const pkg = require('../package.json');
const util = require('node:util');
const bdec = require('cbor-bigdecimal');
bdec(cbor);

const {program} = require('commander');

program
  .version(pkg.version)
  .argument('[file...]', 'Files to read, "-" for stdin')
  .usage('[options] [file ...]')
  .option('-x, --hex <STRING>', 'Hex string input')
  .option('-e, --exports', 'add module.exports= to the beginning')
  .option('-H, --hidden', 'Include non-enumerable symbols and properties')
  .parse(process.argv);

const opts = program.opts();
const argv = program.args;
if (opts.hex) {
  argv.push(new utils.DeHexStream(opts.hex));
}

if (argv.length === 0) {
  argv.push('-');
}

utils.streamFiles(argv, () => {
  const d = new cbor.Decoder();
  d.on('data', v => {
    if (opts.exports) {
      process.stdout.write('module.exports = ');
    }
    console.log(util.inspect(v, {
      compact: false,
      colors: process.stdout.isTTY,
      showHidden: opts.hidden,
      showProxy: opts.hidden,
      depth: Infinity,
      sorted: true,
      breakLength: process.env.COLS || 80,
    }));
  });
  return d;
}).catch(utils.printError);
