// One-off: draws the app icon with a canvas in headless Chromium and writes PNGs to public/icons.
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
const b = await chromium.launch();
const p = await b.newPage();
for (const [name, size] of [['icon-192', 192], ['icon-512', 512], ['apple-touch-icon', 180]]) {
  const data = await p.evaluate((s) => {
    const c = document.createElement('canvas'); c.width = c.height = s; const g = c.getContext('2d');
    g.fillStyle = '#0f1620'; g.fillRect(0, 0, s, s);
    const k = s / 100;
    g.fillStyle = '#1d3a52'; g.beginPath(); g.arc(50 * k, 50 * k, 38 * k, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#e5b54a'; g.beginPath(); g.arc(60 * k, 58 * k, 20 * k, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#a07a22'; g.lineWidth = 3 * k; g.beginPath(); g.arc(60 * k, 58 * k, 14 * k, 0, Math.PI * 2); g.stroke();
    g.save(); g.translate(40 * k, 42 * k); g.rotate(-Math.PI / 4);
    g.fillStyle = '#b9c3cf'; g.fillRect(-4 * k, -6 * k, 8 * k, 40 * k);
    g.fillStyle = '#dfe6ee'; g.fillRect(-14 * k, -14 * k, 28 * k, 10 * k);
    g.restore();
    return c.toDataURL('image/png').split(',')[1];
  }, size);
  writeFileSync(`public/icons/${name}.png`, Buffer.from(data, 'base64'));
}
await b.close();
