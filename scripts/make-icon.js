#!/usr/bin/env node
// Generates build/icon.ico — the static .exe icon shown by File Explorer when
// the app isn't running. Mirrors the canvas drawing in app.js
// (makeDockIconDataURL) so the static icon matches what the running app paints
// in its taskbar/window. Frozen to the MINT theme — that's the boot default
// in app.js until the user overrides it.

const fs = require('fs');
const path = require('path');
const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');
const pngToIco = require('png-to-ico').default;

const BUILD_DIR = path.join(__dirname, '..', 'build');
const FONT_FILE = path.join(BUILD_DIR, 'Rajdhani-Bold.ttf');
const ICO_OUT   = path.join(BUILD_DIR, 'icon.ico');

// Windows .ico contains multiple bitmaps so the OS picks the best size for
// each context (16=tray/title-bar, 32=Alt-Tab, 48=desktop, 256=high-DPI).
const SIZES = [16, 24, 32, 48, 64, 128, 256];

// MINT theme — kept in sync with body.theme-mint in styles.css.
const COLORS = {
  bg:        '#fbfdfc',
  accent:    '#059669',
  accentHot: '#10b981',
};

if (!fs.existsSync(FONT_FILE)) {
  console.error(`[icon] missing ${FONT_FILE} — fetch Rajdhani-Bold.ttf first`);
  process.exit(1);
}
GlobalFonts.registerFromPath(FONT_FILE, 'Rajdhani');

function drawIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const radius = size * 0.2;

  ctx.fillStyle = COLORS.bg;
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, radius);
  ctx.fill();

  const frameInset = size * 0.115;
  const frameSize = size - frameInset * 2;
  ctx.strokeStyle = COLORS.accent;
  ctx.lineWidth = Math.max(1, size * 0.008);
  ctx.lineCap = 'square';
  ctx.strokeRect(frameInset, frameInset, frameSize, frameSize);

  ctx.strokeStyle = COLORS.accent;
  ctx.lineWidth = Math.max(1, size * 0.016);
  const tickLen = size * 0.06;
  const t = frameInset;
  ctx.beginPath(); ctx.moveTo(t, t + tickLen);                  ctx.lineTo(t, t);                          ctx.lineTo(t + tickLen, t);                  ctx.stroke();
  ctx.beginPath(); ctx.moveTo(size - t - tickLen, t);           ctx.lineTo(size - t, t);                   ctx.lineTo(size - t, t + tickLen);           ctx.stroke();
  ctx.beginPath(); ctx.moveTo(t, size - t - tickLen);           ctx.lineTo(t, size - t);                   ctx.lineTo(t + tickLen, size - t);           ctx.stroke();
  ctx.beginPath(); ctx.moveTo(size - t - tickLen, size - t);    ctx.lineTo(size - t, size - t);            ctx.lineTo(size - t, size - t - tickLen);    ctx.stroke();

  ctx.font = `700 ${Math.round(size * 0.7)}px Rajdhani`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = COLORS.accentHot;
  const metrics = ctx.measureText('M');
  const ascent = metrics.actualBoundingBoxAscent || size * 0.5;
  const descent = metrics.actualBoundingBoxDescent || 0;
  const frameCenterY = frameInset + frameSize / 2;
  const baselineY = frameCenterY + (ascent - descent) / 2;
  ctx.fillText('M', size / 2, baselineY);

  return canvas.toBuffer('image/png');
}

(async () => {
  const buffers = SIZES.map(drawIcon);
  const ico = await pngToIco(buffers);
  fs.writeFileSync(ICO_OUT, ico);
  const kb = (ico.length / 1024).toFixed(1);
  console.log(`[icon] wrote ${ICO_OUT} (${SIZES.length} sizes, ${kb} KB)`);
})();
