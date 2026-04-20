#!/usr/bin/env node
// Previously patched Electron.app/Contents/Info.plist to rename the dev
// bundle. This broke macOS safeStorage (which ties the keychain entry to the
// app name). This script now RESTORES the defaults so existing encrypted
// passwords keep decrypting. Safe on re-runs.

const fs = require('fs');
const path = require('path');

if (process.platform !== 'darwin') process.exit(0);

const plistPath = path.join(
  __dirname, '..',
  'node_modules', 'electron', 'dist',
  'Electron.app', 'Contents', 'Info.plist'
);

if (!fs.existsSync(plistPath)) process.exit(0);

let txt = fs.readFileSync(plistPath, 'utf8');
let changed = false;

const restore = [
  { key: 'CFBundleName',        value: 'Electron' },
  { key: 'CFBundleDisplayName', value: 'Electron' },
];

for (const { key, value } of restore) {
  const re = new RegExp(`(<key>${key}</key>\\s*<string>)[^<]*(</string>)`);
  if (re.test(txt)) {
    const next = txt.replace(re, `$1${value}$2`);
    if (next !== txt) { txt = next; changed = true; }
  }
}

if (changed) {
  fs.writeFileSync(plistPath, txt);
  console.log('[brand] Electron Info.plist restored to defaults.');
}
