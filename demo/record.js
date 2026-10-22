// Records the Meshdraw demo: serves ../meshdraw.html, drives it in headless Chrome following script.js,
// captures the screen with the DevTools screencast, then speeds up each scene and encodes an MP4 with ffmpeg.
//
//   cd demo && npm install && node record.js [output.mp4]
//
// Needs Google Chrome and ffmpeg. Output defaults to meshdraw-demo.mp4 next to this file.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright-core');

const SCENES = require('./script.js');
const W = 1920, H = 1080, FPS = 30;
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT = path.resolve(process.argv[2] || path.join(__dirname, 'meshdraw-demo.mp4'));
const TMP = fs.mkdtempSync(path.join(require('os').tmpdir(), 'meshdraw-demo-'));

// ------------------------------------------------------------------ local server
function serve() {
  const page = '<!doctype html><html><head><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"></head><body style="margin:0">'
    + fs.readFileSync(path.join(__dirname, '..', 'meshdraw.html'), 'utf8') + '</body></html>';
  const server = http.createServer((req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(req.url.startsWith('/app') ? page : '<!doctype html><title>blank</title>');
  });
  return new Promise((r) => server.listen(0, '127.0.0.1', () => r(server)));
}

// Cursor, click ripple, captions and the end card are drawn into the page so the screencast picks them up.
const OVERLAY = `(() => {
  const css = document.createElement('style');
  css.textContent = \`
    .hint-wrap{display:none!important}
    #demo-cursor{position:fixed;left:0;top:0;width:26px;height:26px;z-index:2147483647;pointer-events:none;transform:translate(-100px,-100px);filter:drop-shadow(0 2px 3px rgba(0,0,0,.45))}
    .demo-ripple{position:fixed;width:34px;height:34px;margin:-17px 0 0 -17px;border-radius:50%;border:2px solid rgba(255,255,255,.9);background:rgba(91,136,255,.25);z-index:2147483646;pointer-events:none;animation:demoRip .45s ease-out forwards}
    @keyframes demoRip{from{transform:scale(.3);opacity:1}to{transform:scale(1.4);opacity:0}}
    #demo-cap{position:fixed;left:50%;bottom:34px;transform:translateX(-50%);z-index:2147483645;pointer-events:none;display:flex;gap:12px;align-items:center;padding:14px 26px;border-radius:999px;background:rgba(12,14,20,.84);color:#fff;font:600 26px/1.2 Geist,system-ui,sans-serif;letter-spacing:-.01em;box-shadow:0 10px 30px rgba(0,0,0,.35);transition:opacity .25s;white-space:nowrap}
    #demo-cap b{font:600 15px/1 'Geist Mono',ui-monospace,monospace;padding:6px 10px;border-radius:999px;background:#5b88ff;color:#0a1024}
    #demo-end{position:fixed;inset:0;z-index:2147483644;display:grid;place-items:center;background:rgba(8,10,16,.72);opacity:0;transition:opacity .6s;pointer-events:none;color:#fff;text-align:center;font-family:Geist,system-ui,sans-serif}
    #demo-end h1{margin:0;font-size:96px;font-weight:600;letter-spacing:-.03em}
    #demo-end p{margin:12px 0 0;font-size:30px;opacity:.8}\`;
  const cur = document.createElement('div');
  cur.id = 'demo-cursor';
  cur.innerHTML = '<svg viewBox="0 0 24 24" width="26" height="26"><path d="M4 2.5 20 12l-7 1.6-3.4 6.9z" fill="#fff" stroke="#111" stroke-width="1.4" stroke-linejoin="round"/></svg>';
  const add = () => { document.head.appendChild(css); document.body.append(cur); };
  if (document.body) add(); else document.addEventListener('DOMContentLoaded', add);
  addEventListener('mousemove', (e) => { cur.style.transform = 'translate(' + (e.clientX - 3) + 'px,' + (e.clientY - 2) + 'px)'; }, true);
  addEventListener('mousedown', (e) => { const r = document.createElement('div'); r.className = 'demo-ripple'; r.style.left = e.clientX + 'px'; r.style.top = e.clientY + 'px'; document.body.appendChild(r); setTimeout(() => r.remove(), 500); }, true);
  window.__demoCaption = (text, badge) => {
    let c = document.getElementById('demo-cap');
    if (!c) { c = document.createElement('div'); c.id = 'demo-cap'; document.body.appendChild(c); }
    c.textContent = text;
    if (badge) { const b = document.createElement('b'); b.textContent = badge; c.appendChild(b); }
    c.style.opacity = text ? 1 : 0;
  };
  window.__demoEnd = (title, sub) => {
    const e = document.createElement('div'); e.id = 'demo-end';
    e.innerHTML = '<div><h1></h1><p></p></div>';
    e.querySelector('h1').textContent = title; e.querySelector('p').textContent = sub;
    document.body.appendChild(e); requestAnimationFrame(() => (e.style.opacity = 1));
    const c = document.getElementById('demo-cap'); if (c) c.style.opacity = 0;
  };
})();`;

// ------------------------------------------------------------------ actions the storyboard can use
function director(page) {
  let mx = W / 2, my = H / 2;
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const wait = (ms) => page.waitForTimeout(ms);
  async function move(x, y, ms = 420) {
    const steps = Math.max(2, Math.round(ms / 16)), x0 = mx, y0 = my;
    for (let i = 1; i <= steps; i++) {
      const t = ease(i / steps);
      await page.mouse.move(x0 + (x - x0) * t, y0 + (y - y0) * t);
      await wait(ms / steps);
    }
    mx = x; my = y;
  }
  async function box(sel, text) {
    const loc = text ? page.locator(sel, { hasText: text }).first() : page.locator(sel).first();
    await loc.scrollIntoViewIfNeeded();
    const b = await loc.boundingBox();
    if (!b) throw new Error('Not visible: ' + sel + (text ? ' "' + text + '"' : ''));
    return b;
  }
  async function click(x, y) { await move(x, y); await page.mouse.down(); await wait(40); await page.mouse.up(); await wait(120); }
  async function dblclick(x, y) { await move(x, y); await page.mouse.dblclick(x, y); mx = x; my = y; await wait(150); }
  // Mirrors the app's "zoom to frame" layout so frame coordinates map to the screen.
  function frameRect() {
    const l = 72, r = 304, t = 60, b = 52, aw = W - l - r, ah = H - t - b, fw = 1920, fh = 1080;
    const z = Math.min((aw - 72) / fw, (ah - 72) / fh), w = fw * z, h = fh * z;
    return { x: l + (aw - w) / 2, y: t + (ah - h) / 2, w, h };
  }
  return {
    wait, move, click, dblclick, frameRect,
    at: (u, v) => { const r = frameRect(); return [r.x + u * r.w, r.y + v * r.h]; },
    async clickEl(sel) { const b = await box(sel); await click(b.x + b.width / 2, b.y + b.height / 2); },
    async clickText(sel, text) { const b = await box(sel, text); await click(b.x + Math.min(b.width / 2, 60), b.y + b.height / 2); },
    async type(text) { await page.keyboard.type(text, { delay: 35 }); },
    async key(k) { await page.keyboard.press(k); await wait(60); },
    async setHex(hex) {
      const b = await box('#selHex');
      await move(b.x + 60, b.y + b.height / 2);
      await page.mouse.click(b.x + 60, b.y + b.height / 2, { clickCount: 3 });
      await page.keyboard.type(hex, { delay: 25 });
      await page.keyboard.press('Enter');
      await wait(80);
    },
    // Clicks (or drags) a range input to a value; Chrome maps the track inset by half the thumb width.
    async slider(sel, value, opt = {}) {
      const b = await box(sel);
      const [min, max, cur] = await page.$eval(sel, (el) => [+el.min, +el.max, +el.value]);
      const xOf = (v) => b.x + 7.5 + ((v - min) / (max - min)) * (b.width - 15), y = b.y + b.height / 2;
      if (!opt.drag) { await click(xOf(value), y); return; }
      await move(xOf(cur), y);
      await page.mouse.down();
      await move(xOf(value), y, opt.ms || 700);
      await page.mouse.up();
      await wait(100);
    },
    async drag(points, ms) {
      await move(points[0][0], points[0][1]);
      await page.mouse.down();
      const per = ms / points.length;
      for (const [x, y] of points.slice(1)) { await page.mouse.move(x, y, { steps: 3 }); await wait(per); mx = x; my = y; }
      await page.mouse.up();
    },
    async endCard(title, sub) { await page.evaluate(([t, s]) => window.__demoEnd(t, s), [title, sub]); },
  };
}

// ------------------------------------------------------------------ record
(async () => {
  const server = await serve();
  const base = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--hide-scrollbars'] });
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await page.addInitScript(OVERLAY);
  await page.goto(base + '/blank');
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('meshdraw:tips', JSON.stringify({ select: true, pen: true, pencil: true, smudge: true, grid: true, radial: true }));
  });
  await page.goto(base + '/app');
  await page.waitForTimeout(1800);
  await page.keyboard.press('Shift+Digit1');
  await page.waitForTimeout(800);

  const cdp = await page.context().newCDPSession(page);
  const frames = [];
  let n = 0;
  cdp.on('Page.screencastFrame', async (f) => {
    const file = path.join(TMP, 'f' + String(++n).padStart(6, '0') + '.jpg');
    fs.writeFileSync(file, Buffer.from(f.data, 'base64'));
    frames.push({ file, t: f.metadata.timestamp });
    cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: W, maxHeight: H, everyNthFrame: 1 });
  await page.waitForTimeout(300);

  const d = director(page);
  const marks = [];
  for (const [i, s] of SCENES.entries()) {
    marks.push({ t: Date.now() / 1000, speed: s.speed || 1 });
    await page.evaluate(([c, b]) => window.__demoCaption(c, b), [s.caption || '', s.badge || '']);
    const t0 = Date.now();
    await s.run(d);
    console.log(`scene ${i + 1}: ${((Date.now() - t0) / 1000).toFixed(1)}s real, ~${((Date.now() - t0) / 1000 / (s.speed || 1)).toFixed(1)}s in video · ${s.caption}`);
  }
  const end = Date.now() / 1000;
  await page.waitForTimeout(200);
  await cdp.send('Page.stopScreencast');
  await browser.close();
  server.close();

  // Map wall-clock time to video time: each scene plays back at its own speed.
  const toVideo = (t) => {
    let out = 0;
    for (let i = 0; i < marks.length; i++) {
      const a = marks[i].t, b = i + 1 < marks.length ? marks[i + 1].t : end;
      if (t <= a) break;
      out += (Math.min(t, b) - a) / marks[i].speed;
    }
    return out;
  };
  const total = toVideo(end);
  const list = [];
  const usable = frames.filter((f) => f.t <= end);
  const first = usable.findIndex((f) => f.t >= marks[0].t);
  const seq = usable.slice(Math.max(0, first - 1));
  for (let i = 0; i < seq.length; i++) {
    const a = Math.max(0, toVideo(seq[i].t)), b = i + 1 < seq.length ? toVideo(seq[i + 1].t) : total;
    if (b - a <= 0) continue;
    list.push(`file '${seq[i].file}'\nduration ${(b - a).toFixed(5)}`);
  }
  list.push(`file '${seq[seq.length - 1].file}'`);
  const listFile = path.join(TMP, 'list.txt');
  fs.writeFileSync(listFile, list.join('\n'));
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', listFile,
    '-vf', `fps=${FPS},format=yuv420p`, '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-movflags', '+faststart', OUT], { stdio: 'inherit' });
  fs.rmSync(TMP, { recursive: true, force: true });
  console.log(`\n${frames.length} frames captured · video ${total.toFixed(1)}s → ${OUT}`);
})().catch((e) => { console.error(e); process.exit(1); });
