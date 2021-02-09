#!/usr/bin/env node

'use strict'
const child_process = require('child_process')
const fs = require('fs')
const path = require('path')
const util = require('util')
const cbor = require('cbor')
const commander = require('commander')
const pkg = require('../package.json')
const HEX = /^\s*(?:['"`]|0x)([0-9a-f]+)\s*$/
const program = commander.program
const OUTPUT_TYPES = {
  'comment': 'comment',
  'c': 'comment',
  'diagnose': 'diagnose',
  'd': 'diagnose',
  'diag': 'diagnose',
  'javascript': 'javascript',
  'js': 'javascript',
  'j': 'javascript'
}
function outputType(val) {
  const norm = OUTPUT_TYPES[val]
  if (!norm) {
    throw new commander.InvalidOptionArgumentError(
      'Not one of: ' + Object.keys(OUTPUT_TYPES).join(', '))
  }
  return norm
}

const opts = program
  .version(pkg.version)
  .usage('[options]')
  .option('-c, --color', 'Force color output even if stdout is not a TTY')
  .option(
    '-t, --type <type>',
    'Output type (one of: javascript, diagnose, comment)',
    outputType,
    'javascript')
  .parse(process.argv)
  .opts()

const COLOR = process.stdout.isTTY || opts.color

// Figure out the node-cbor version number, and the branch name
// if we're running from a git repo.  require.resolve returns
// `{node-cbor}/lib/cbor.js`
const cborPath = path.resolve(path.dirname(require.resolve('cbor')), '..')
const cborPkg = JSON.parse(
  fs.readFileSync(path.join(cborPath, 'package.json'), 'utf8'))
let branch = ''
try {
  // too hard to test both branches.
  /* istanbul ignore next */
  if (fs.statSync(path.resolve(cborPath, '..', '..', '.git')).isDirectory()) {
    branch = '#' + child_process.execSync(
      'git branch --show-current', {
        cwd: cborPath,
        encoding: 'utf8'
      }).trimEnd()
  }
} catch (ignored) {}

console.log(
  `cbor v${cborPkg.version}${branch} (${opts.type} output from typing 0x00)`
)

// extracted from node source
function stylizeWithColor(str, styleType) {
  if (COLOR) {
    const style = util.inspect.styles[styleType]
    const color = util.inspect.colors[style]
    return `\u001b[${color[0]}m${str}\u001b[${color[1]}m`
  }
  return str
}

// wrapper that removes quotes and colorizes from the results of certain
// operations
class PlainResults {
  constructor(str) {
    this.str = str
  }
  [util.inspect.custom](depth, options) {
    if (typeof this.str === 'string') {
      const m = this.str.match(/(.*)(0x[0-9a-f]+)\n$/msi)
      if (m) {
        return `${m[1]}${options.stylize(m[2], 'special')}`
      }
    }
    return this.str
  }
}

util.inspect.defaultOptions.compact = false
const repl = require('repl')
const cborRepl = repl.start({
  prompt: stylizeWithColor('cbor', 'string') + '> ',
  ignoreUndefined: true
})

// import everything from the cbor package into the top level,
// and gussy up a few of them
for (const [k, v] of Object.entries(cbor)) {
  cborRepl.context[k] = v
}
cborRepl.context.cbor = cbor
cborRepl.context.NoFilter = require('nofilter')
cborRepl.context.comment =
  function comment(input, options) {
    return cbor
      .comment(input, options)
      .then(t => new PlainResults(t))
  }
cborRepl.context.diagnose =
  function diagnose(input, options) {
    return cbor
      .diagnose(input, options)
      .then(t => new PlainResults(t))
  }

const originalEval = cborRepl.eval
cborRepl.eval = (cmd, context, filename, callback) => {
  const m = cmd.match(HEX)
  if (m) {
    switch (opts.type) {
      case 'diagnose':
        return cbor.diagnose(m[1], (er, txt) => {
          if (er) {
            return callback(er)
          }
          callback(null, new PlainResults(txt))
        })
      case 'comment':
        return cbor.comment(m[1], (er, txt) => {
          if (er) {
            return callback(er)
          }
          callback(null, new PlainResults(txt))
        })
      case 'javascript':
        return cbor.decodeFirst(m[1], (er, o) => {
          if (er) {
            return callback(er)
          }
          callback(null, new PlainResults(o))
        })
    }
  } else {
    originalEval(cmd, context, filename, (er, output) => {
      // all bare promises just delay the results.  This probably
      // would be bad if this was a system where Promises might last a
      // long time; the command line would lock up while waiting.
      if (!er && (output instanceof Promise)) {
        console.log(stylizeWithColor('Promise', 'special'))
        output.then(results => callback(null, results), callback)
      } else {
        callback(er, output)
      }
    })
  }
}
cborRepl.writer = (output) => {
  let str = repl.writer(output)
  if (!(output instanceof Error) &&
      !(output instanceof PlainResults)) {
    try {
      // Hey!  Let's encode all results as CBOR for fun.
      const buf = cbor.encodeCanonical(output)
      str += stylizeWithColor(
        '\n0x' + buf.toString('hex'),
        'special')
    } catch (ignored) {}
  }
  return str
}

// TODO: The completer mostly doesn't work.
// const originalCompleter = cborRepl.completer.bind(cborRepl)
// cborRepl.completer = (linePartial, callback) => {
//   const m = linePartial.match(HEX)
//   if (m && (m[1].length % 2 === 0)) {
//     cbor.diagnose(m[1]).then(
//       d => {
//         //console.log({d, m})
//         callback(null, [[d.trimEnd()], linePartial])
//       },
//       _ => callback(null, [null, linePartial]))
//   } else {
//     return originalCompleter(linePartial, callback)
//   }
// }

// Throw our history in with the normal node history file.  This is only
// needed in node 11+
/* istanbul ignore else */
if (typeof cborRepl.setupHistory === 'function') {
  cborRepl.setupHistory(process.env.NODE_REPL_HISTORY, (er) => {
    // No good way to get this to fire, even with bad permissions
    // or invalid file
    /* istanbul ignore if */
    if (er) {
      console.error(er)
    }
  })
}
