'use strict'

const fs = require('fs')
const path = require('path')

const src = path.join(__dirname, '..', '.waiting.html')
const dir = path.join(__dirname, '..', 'coverage')
const dst = path.join(dir, 'index.html')

fs.stat(dst, (er, st) => {
  if (er) {
    if (er.code !== 'ENOENT') {
      console.error(`Error on ${dst}: ${er.message}`)
      process.exit(1)
    }
  } else {
    if (!st.isFile()) {
      console.error(`Error on ${dst}: not a file`)
      process.exit(1)
    }
    if (st.size > 0) {
      process.exit(0)
    }
  }
  // Either the file didn't exist, or it got truncated
  fs.mkdir(dir, (er) => {
    if (er && (er.code !== 'EEXIST')) {
      console.error(`Error creating ${dir}: ${er.message}`)
      process.exit(1)
    }
    fs.copyFile(src, dst, (er) => {
      if (er) {
        console.error(`Error: ${er.message}`)
        process.exit(1)
      }
    })
  })
})
