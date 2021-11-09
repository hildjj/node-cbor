'use strict'

function patchGlobal(g) {
  const fixes = []

  if (g.BigInt === undefined) {
    const bi = require('big-integer')

    // Allow BigInt('0xffffffffffffffff') or BigInt('0x777777777777777777')
    g.BigInt = value => {
      if (typeof value === 'string') {
        // eslint-disable-next-line prefer-named-capture-group
        const match = value.match(/^0([xo])([0-9a-f]+)$/i)
        if (match) {
          return bi(match[2], match[1].toLowerCase() === 'x' ? 16 : 8)
        }
      }
      return bi(value)
    }
    fixes.push('BigInt')
  }

  if (g.process === undefined) {
    g.process = require('process')
    fixes.push('process')
  } else if (g.process.nextTick === undefined) {
    g.process.nextTick = require('process').nextTick
    fixes.push('nextTick')
  }

  if (g.TextDecoder === undefined) {
    const TextDecoder = require('@cto.af/textdecoder')
    g.TextDecoder = TextDecoder
    fixes.push('TextDecoder')
  }

  return fixes
}

exports.patchGlobal = patchGlobal
exports.fixes = patchGlobal(global)

