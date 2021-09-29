'use strict'

const path = require('path')
const {Buffer} = require('buffer')

module.exports = f => ({
  foo: new Date(1612908664662),
  bar: Buffer.from('01612908664662'),
  file: path.resolve(process.cwd(), f)
    .split(path.sep)
    .slice(-2),
})
