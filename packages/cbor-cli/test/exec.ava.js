'use strict';

const test = require('ava');
const {spawn} = require('node:child_process');
const path = require('node:path');
const process = require('node:process');
const pkg = require('../package.json');
const {Buffer} = require('node:buffer'); // Not the mangled version

function exec(bin, opts = {}) {
  opts = {
    args: [],
    encoding: 'utf8',
    env: {},
    ...opts,
  };
  return new Promise((resolve, reject) => {
    bin = path.join(__dirname, '..', 'bin', `${bin}.js`);
    const env = {
      ...process.env,
      ...opts.env,
    };
    const args = opts.args || [];
    if (process.platform === 'win32') {
      args.unshift(bin);
      [bin] = process.argv;
    }
    const c = spawn(bin, args, {
      stdio: 'pipe',
      env,
    });
    c.on('error', reject);
    const bufs = [];
    c.stdout.on('data', b => bufs.push(b));
    c.stderr.on('data', b => bufs.push(b));
    c.on('close', code => {
      const buf = Buffer.concat(bufs);
      const str = buf.toString(opts.encoding);
      if (code === 0) {
        resolve(str);
      } else {
        const err = new Error(`process fail, code ${code}`);
        err.buf = buf;
        err.str = str;
        reject(err);
      }
    });
    if (opts.stdin != null) {
      c.stdin.write(opts.stdin);
    }
    c.stdin.end();
  });
}

test('json2cbor', async t => {
  let buf = await exec('json2cbor', {
    stdin: '{"foo": false}',
    encoding: 'hex',
  });
  t.is(buf, 'a163666f6ff4');
  buf = await exec('json2cbor', {
    args: ['-xc'],
    stdin: `{
  "foo": false,
  "bar": -1
}`,
  });
  t.is(buf, 'a2636261722063666f6ff4\n');
  const pf = path.join(__dirname, '..', 'package.json');
  buf = await exec('json2cbor', {
    args: [pf, pf, pf],
    encoding: 'hex',
  });
  t.truthy(buf.length > 0);

  const ver = await exec('json2cbor', {args: ['-V']});
  t.is(ver, `${pkg.version}\n`);

  const help = await exec('json2cbor', {args: ['-h']});
  t.truthy(help.startsWith('Usage: '));

  const er = await t.throwsAsync(() => exec('json2cbor', {args: ['-Q']}));
  t.is(er.buf.toString('utf8'), 'error: unknown option \'-Q\'\n');
  t.is(er.str, 'error: unknown option \'-Q\'\n');

  await t.throwsAsync(
    () => exec('json2cbor', {
      args: ['-x', '-'],
      stdin: 'treu', // Sic
    })
  );
});

test('cbor2json', async t => {
  let buf = await exec(t.title, {
    stdin: Buffer.from('12', 'hex'),
  });
  t.is(buf, '18\n');
  buf = await exec(t.title, {
    args: ['-x', '12'],
  });
  t.is(buf, '18\n');
});

test('cbor2diag', async t => {
  let buf = await exec(t.title, {
    stdin: Buffer.from('c100', 'hex'),
  });
  t.is(buf, '1(0)\n');
  buf = await exec(t.title, {
    args: ['-x', 'c100'],
  });
  t.is(buf, '1(0)\n');
});

test('cbor2comment', async t => {
  let buf = await exec(t.title, {
    stdin: Buffer.from('c100', 'hex'),
  });
  t.is(buf, `\
  c1                -- Tag #1
    00              -- 0
0xc100
`);
  buf = await exec(t.title, {
    args: [
      '--tabsize',
      '14',
      '-x',
      'c100',
    ],
  });
  t.is(buf, `\
  c1                        -- Tag #1
    00                      -- 0
0xc100
`);
});

test('cbor', async t => {
  let buf = await exec(t.title, {
    stdin: 'true',
    env: {
      NODE_REPL_HISTORY: '',
    },
  });
  // I might leave this in for a while to ensure that we're running the cbor
  // version I think we should be in CI.
  console.log('cli VERSION:', buf);
  t.regex(buf,
    /^cbor v[0-9.]*(?:#\S*)? \(javascript output from typing 0x00\)\ncbor> true\n0xf5\ncbor> $/);

  await t.throwsAsync(() => exec(t.title, {
    args: ['-t', 'foo'],
    env: {
      NODE_REPL_HISTORY: '',
    },
  }));

  buf = await exec(t.title, {
    args: ['-t', 'diag', '-c'],
    stdin: '0x818100',
    env: {
      NODE_REPL_HISTORY: '',
    },
  });
  t.regex(buf, /\[\[0\]\]\n/);

  buf = await exec(t.title, {
    args: ['-t', 'comment', '-c'],
    stdin: '0x818100',
    env: {
      NODE_REPL_HISTORY: '',
    },
  });
  t.regex(buf, /Array, 1 item/);

  buf = await exec(t.title, {
    args: ['-t', 'js'],
    stdin: '0xa1616101',
    env: {
      NODE_REPL_HISTORY: '',
    },
  });
  t.regex(buf, / +a: 1\n/);
  buf = await exec(t.title, {
    stdin: 'comment("01")',
    env: {
      NODE_REPL_HISTORY: '',
    },
  });
  t.regex(buf, /Promise/);
  t.regex(buf, /0x01/);
  buf = await exec(t.title, {
    stdin: 'diagnose("01")',
    env: {
      NODE_REPL_HISTORY: '',
    },
  });
  t.regex(buf, /Promise\n1\n/);

  buf = await exec(t.title, {
    args: ['-t', 'd'],
    stdin: '0x81',
    env: {
      NODE_REPL_HISTORY: '',
    },
  });
  t.regex(buf, /Error: unexpected end of input/);

  buf = await exec(t.title, {
    args: ['-t', 'c'],
    stdin: '0x81',
    env: {
      NODE_REPL_HISTORY: '',
    },
  });
  t.regex(buf, /Error: unexpected end of input/);

  buf = await exec(t.title, {
    args: ['-t', 'javascript'],
    stdin: '0x81',
    env: {
      NODE_REPL_HISTORY: '',
    },
  });
  t.regex(buf, /Error: unexpected end of input/);
});

test('cbor2js', async t => {
  let buf = await exec(t.title, {
    stdin: Buffer.from('a16161f5', 'hex'),
  });
  t.is(buf, '{\n  a: true\n}\n');
  buf = await exec(t.title, {
    args: ['-x', 'a16161f5', '-e'],
  });
  t.is(buf, 'module.exports = {\n  a: true\n}\n');
});

test('js2cbor', async t => {
  let buf = await exec(t.title, {
    args: ['-x'],
    stdin: 'module.exports = {\n  a: true\n}\n',
  });
  t.is(buf, 'a16161f5\n');
  const fixtureFiles = [
    {
      name: 'object.js',
      result: 'a263666f6fc1fb41d808c21e2a5e35636261724e3031363132393038363634363632',
    },
    {
      name: 'function.js',
      result: 'a363666f6fc1fb41d808c21e2a5e35636261724e30313631323930383636343636326466696c65826866697874757265736b66756e6374696f6e2e6a73',
    },
  ];
  const fixtures = path.resolve(__dirname, 'fixtures');
  for (const {name, result} of fixtureFiles) {
    buf = await exec(t.title, {
      args: [path.resolve(fixtures, name)],
      encoding: 'hex',
    });
    t.is(buf, result);
  }
});
