/* eslint-disable no-console */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const bresolve = require('browser-resolve');

const src = path.join(__dirname, 'src');
const dist = path.join(__dirname, 'dist');
try {
  fs.rmSync(dist, {
    recursive: true,
    force: true,
  });
} catch (ignored) {
  console.warn(`Warning: could not delete "${dist}"`);
}

const have = new Set();
const needed = new Set();
const transform = new Set();

try {
  fs.mkdirSync(dist);
} catch (ignored) {
  console.warn(`Warning: could not create "${dist}"`);
}

// eslint-disable-next-line prefer-named-capture-group
const script = /<script\s+src="([^'"/]+)"/g;
for (const s of fs.readdirSync(src)) {
  const srcFile = path.join(src, s);
  let copy = true;
  switch (path.extname(s)) {
    case '.html': {
      // Find all of the scripts that we need
      const html = fs.readFileSync(srcFile, 'utf8');
      let match = null;
      while ((match = script.exec(html))) {
        needed.add(match[1]);
        copy = false;
        transform.add(s);
      }
      break;
    }
    case '.js':
      // Keep track of the ones we already have
      have.add(s);
      break;
  }
  if (copy) {
    console.log(`Copy: ${s}`);
    fs.copyFileSync(srcFile, path.join(dist, s));
  }
}

const scripts = new Set([...needed].filter(x => !have.has(x)));
// Find the scripts we don't have yet.  Assume each one is
// a single file.
const scriptNames = {};
for (const s of scripts) {
  const scriptSrc = bresolve.sync(s, {filename: __filename});
  const local = path.basename(scriptSrc);
  scriptNames[s] = local;

  console.log(`Resolve: ${s} (${path.relative(__dirname, scriptSrc)})`);
  fs.copyFileSync(scriptSrc, path.join(dist, local));
}

for (const s of transform) {
  const srcFile = path.join(src, s);
  let html = fs.readFileSync(srcFile, 'utf8');
  html = html.replace(script, (m, orig) => {
    const local = scriptNames[orig];
    return local ? `<script src="${local}"` : m;
  });
  console.log(`Transform: ${s}`);
  fs.writeFileSync(path.join(dist, s), html, 'utf8');
}
