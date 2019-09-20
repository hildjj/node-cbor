'use strict'

const test = require('ava')
const mockIo = require('mock-stdio')
const { spawn } = require('child_process')
const path = require('path')
const pkg = require('../package.json')

function exec(bin, opts = {}) {
  return new Promise((resolve, reject) => {
    const c = spawn(path.join(__dirname, '..', 'bin', bin), opts.args || [], {
      stdio: 'pipe'
    })
    c.on('error', reject)
    const bufs = []
    c.stdout.on('data', b => bufs.push(b))
    c.stderr.on('data', b => bufs.push(b))
    c.on('close', code => {
      const buf = Buffer.concat(bufs)
      if (code !== 0) {
        const err = new Error(`process fail, code ${code}`)
        err.buf = buf
        reject(err)
      } else {
        resolve(buf)
      }
    })
    if (opts.stdin != null) {
      c.stdin.write(opts.stdin)
    }
    c.stdin.end()
  })
}

test('json2cbor', async t => {
  let buf = await exec('json2cbor', {
    stdin: '{"foo": false}'
  })
  t.deepEqual(buf.toString('hex'), 'a163666f6ff4')
  buf = await exec('json2cbor', {
    args: ['-xc'],
    stdin: `{
  "foo": false,
  "bar": -1
}`})
  t.deepEqual(buf.toString('utf8'), 'a2636261722063666f6ff4\n')
  const pf = path.join(__dirname, '..', 'package.json')
  buf = await exec('json2cbor', {
    args: [pf, pf, pf]
  })
  t.truthy(buf.length > 0)

  const ver = await exec('json2cbor', { args: ['-V'] })
  t.is(ver.toString(), pkg.version + '\n')

  const help = await exec('json2cbor', { args: ['-h'] })
  t.truthy(help.toString().startsWith('Usage: '))

  const er = await t.throwsAsync(() => {
    return exec('json2cbor', { args: ['-Q'] })
  })
  t.is(er.buf.toString('utf8'), 'error: unknown option \'-Q\'\n')
})

test('cbor2json', async t => {
  let buf = await exec(t.title, {
    stdin: Buffer.from('12', 'hex')
  })
  t.deepEqual(buf.toString('utf8'), '18\n')
  buf = await exec(t.title, {
    args: ['-x', '12']
  })
  t.deepEqual(buf.toString('utf8'), '18\n')
})

test('cbor2diag', async t => {
  let buf = await exec(t.title, {
    stdin: Buffer.from('c100', 'hex')
  })
  t.deepEqual(buf.toString('utf8'), '1(0)\n')
  buf = await exec(t.title, {
    args: ['-x', 'c100']
  })
  t.deepEqual(buf.toString('utf8'), '1(0)\n')
})

test('cbor2comment', async t => {
  let buf = await exec(t.title, {
    stdin: Buffer.from('c100', 'hex')
  })
  t.deepEqual('\n' + buf.toString('utf8'), `
  c1                -- Tag #1
    00              -- 0
0xc100
`)
  buf = await exec(t.title, {
    args: [
      '--tabsize', '14',
      '-x', 'c100']
  })
  t.deepEqual('\n' + buf.toString('utf8'), `
  c1                        -- Tag #1
    00                      -- 0
0xc100
`)
})
