// Composes icon.png (128×128, plus a 512 master) and cover.png (1920×960) from the rendered gradients.
//   node figma-plugin/publish/compose.js   (after make-art.js)
const fs = require('fs');
const path = require('path');
const { chromium } = require(path.join(__dirname, '..', '..', 'demo', 'node_modules', 'playwright-core'));
const img = (f) => 'data:image/png;base64,' + fs.readFileSync(path.join(__dirname, f)).toString('base64');
// A pen path with one anchor and its two handles: the editor's own drawing tools, in white.
const pen = (s) => `<svg viewBox="0 0 100 100" width="${s}" height="${s}" style="position:absolute;left:0;top:0;overflow:visible">
  <path d="M14 70 C 34 18, 62 92, 86 32" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round"/>
  <path d="M27.5 46.4 L69.5 61.6" stroke="#fff" stroke-width="3" stroke-linecap="round"/>
  <circle cx="27.5" cy="46.4" r="5.2" fill="#fff"/><circle cx="69.5" cy="61.6" r="5.2" fill="#fff"/>
  <rect x="40.5" y="46" width="16" height="16" rx="3" fill="#fff" stroke="#2D3BFF" stroke-width="3"/>
  </svg>`;
const ICON = `<!doctype html><body style="margin:0"><div style="position:relative;width:512px;height:512px;background:url(${img('art-square.png')}) center/cover">
  <div style="position:absolute;inset:0;filter:drop-shadow(0 6px 14px rgba(20,10,80,.35))"><div style="position:absolute;left:56px;top:56px;width:400px;height:400px">${pen(400)}</div></div></div></body>`;
const COVER = `<!doctype html><head><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist:wght@500&display=block"></head>
<body style="margin:0"><div style="position:relative;width:1920px;height:960px;overflow:hidden;background:url(${img('art-wide.png')}) center/cover">
  <div style="position:absolute;inset:0;background:linear-gradient(90deg,rgba(10,8,40,.55),rgba(10,8,40,.05) 62%)"></div>
  <div style="position:absolute;left:140px;top:250px;color:#fff;text-shadow:0 4px 40px rgba(20,10,80,.35)">
    <div style="display:flex;align-items:center;gap:30px"><div style="position:relative;width:118px;height:118px;border-radius:30px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,.3),inset 0 0 0 2px rgba(255,255,255,.35);background:url(${img('art-square.png')}) center/cover"><div style="position:absolute;left:14px;top:14px;width:90px;height:90px">${pen(90)}</div></div>
      <div style="font:400 168px/1 'Instrument Serif',Georgia,serif;letter-spacing:-.02em">MeshGradient</div></div>
    <div style="margin-top:36px;font:italic 400 66px/1.15 'Instrument Serif',Georgia,serif;max-width:1100px">Draw mesh gradients. Make them move.<br>Give your layers a personality.</div>
    <div style="margin-top:44px;font:500 26px/1 Geist,system-ui,sans-serif;letter-spacing:.02em;opacity:.92">Points &amp; paths · Fluted, liquid &amp; swirl effects · GIF &amp; video fills · AI prompts</div>
  </div></div></body>`;
(async () => {
  const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 512, height: 512 } });
  await page.setContent(ICON); await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(__dirname, 'icon-512.png'), clip: { x: 0, y: 0, width: 512, height: 512 } });
  await page.setViewportSize({ width: 1920, height: 960 });
  await page.setContent(COVER, { waitUntil: 'networkidle' }); await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(__dirname, 'cover.png'), clip: { x: 0, y: 0, width: 1920, height: 960 } });
  await browser.close();
  console.log('icon-512.png, cover.png');
})();
