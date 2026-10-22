// Makes the Community listing artwork from real Meshdraw renders: icon.png (128×128) and cover.png (1920×960).
//   node figma-plugin/publish/make-art.js
const fs = require('fs');
const path = require('path');
const http = require('http');
const { chromium } = require(path.join(__dirname, '..', '..', 'demo', 'node_modules', 'playwright-core'));
const LOOKS = require(path.join(__dirname, '..', '..', 'demo', 'looks.js'));

const BASE = { mode: 'freeform', bg: '#0A3FD6', power: 3.2, blur: 0, bands: 0, grain: 0.05, distort: 'none', amount: 0.5, scale: 0.5, flow: false };
const app = '<!doctype html><html><head><meta charset=utf-8></head><body style="margin:0">' + fs.readFileSync(path.join(__dirname, '..', '..', 'meshdraw.html'), 'utf8') + '</body></html>';
const look = (word) => LOOKS.montage.find((l) => l.word === word);

// Renders one look at the given frame size with the editor's UI hidden; returns a PNG of just the frame.
async function render(page, base, L, cw, ch) {
  const state = { frames: [{ name: 'Art', look: { ...BASE, ...L.look, canvas: 'custom', cw, ch, flow: false }, presetKey: 'glacier', customPalette: null, stops: L.stops, grid: null, warp: null }],
    active: 0, panelOpen: false, newColor: '#FFFFFF', app: {} };
  await page.goto(base + '/blank');
  await page.evaluate((s) => { localStorage.clear(); localStorage.setItem('meshdraw:v4', JSON.stringify(s)); localStorage.setItem('meshdraw:tips', JSON.stringify({ select: 1, pen: 1, pencil: 1, smudge: 1, grid: 1, radial: 1 })); }, state);
  await page.goto(base + '/app'); await page.waitForTimeout(1200);
  await page.keyboard.press('h'); await page.keyboard.press('Shift+Digit2'); await page.waitForTimeout(900);
  // The fitted frame, as the editor lays it out with the settings panel hidden.
  const vw = 1920, vh = 1080, a = { x: 72, y: 60, w: vw - 72, h: vh - 112 };
  const z = Math.min((a.w - 72) / cw, (a.h - 72) / ch), w = cw * z, h = ch * z;
  return page.screenshot({ clip: { x: a.x + (a.w - w) / 2 + 3, y: a.y + (a.h - h) / 2 + 3, width: w - 6, height: h - 6 } });
}

(async () => {
  const server = http.createServer((q, r) => { r.setHeader('Content-Type', 'text/html'); r.end(q.url.startsWith('/app') ? app : '<title>b</title>'); });
  await new Promise((r) => server.listen(0, r));
  const base = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  for (const [word, cw, ch, file] of [['Electric.', 1024, 1024, 'art-square.png'], ['Electric.', 1920, 960, 'art-wide.png'], ['Bold.', 1024, 1024, 'art-bold.png'], ['Futuristic.', 1024, 1024, 'art-beam.png']]) {
    fs.writeFileSync(path.join(__dirname, file), await render(page, base, look(word), cw, ch));
    console.log('rendered', file);
  }
  await browser.close(); server.close();
})();
