#!/usr/bin/env node
// Patches the dev-mode Electron bundle so macOS shows "Maxter" wherever it
// reads CFBundleName — dock tooltip, Force Quit list, menu-bar first item.
// Idempotent. Re-runs after `npm install` via the "postinstall" script.
//
// NOTE: this changes the Keychain service name used by safeStorage
// ("${name} Safe Storage"). Existing encrypted passwords stored under the
// old name will fail to decrypt — user has to re-enter them once after
// switching. The rest of the data (servers, PIN hash) is unaffected.

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

const keys = [
  { key: 'CFBundleName',        value: 'Maxter' },
  { key: 'CFBundleDisplayName', value: 'Maxter' },
];

for (const { key, value } of keys) {
  const existing = new RegExp(`(<key>${key}</key>\\s*<string>)[^<]*(</string>)`);
  if (existing.test(txt)) {
    const next = txt.replace(existing, `$1${value}$2`);
    if (next !== txt) { txt = next; changed = true; }
  } else {
    // Inject key if missing
    const inject = `\t<key>${key}</key>\n\t<string>${value}</string>\n`;
    const next = txt.replace('</dict>\n</plist>', inject + '</dict>\n</plist>');
    if (next !== txt) { txt = next; changed = true; }
  }
}

if (changed) {
  fs.writeFileSync(plistPath, txt);
  console.log('[brand] Electron Info.plist → Maxter');
} else {
  console.log('[brand] Already branded.');
}
