// Records the Meshdraw demo: serves ../meshdraw.html, drives it in headless Chrome following script.js,
// captures the screen with the DevTools screencast, then speeds up each scene, adds the clip's audio and encodes an MP4.
//
//   cd demo && npm install && node record.js [output.mp4]
//
// Needs Google Chrome and ffmpeg. Output defaults to meshdraw-demo.mp4 next to this file.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright-core');

const STORY = require('./script.js');
const W = 1920, H = 1080, FPS = 30;
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT = path.resolve(process.argv[2] || path.join(__dirname, 'meshdraw-demo.mp4'));
const CLIP = STORY.clip ? path.resolve(__dirname, STORY.clip) : null;
const TMP = fs.mkdtempSync(path.join(require('os').tmpdir(), 'meshdraw-demo-'));

// ------------------------------------------------------------------ local server
function serve() {
  const page = '<!doctype html><html><head><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"></head><body style="margin:0">'
    + fs.readFileSync(path.join(__dirname, '..', 'meshdraw.html'), 'utf8') + '</body></html>';
  const server = http.createServer((req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    if (req.url.startsWith('/clip') && CLIP) {
      const size = fs.statSync(CLIP).size, range = /bytes=(\d+)-(\d*)/.exec(req.headers.range || '');
      if (range) {
        const a = +range[1], b = range[2] ? +range[2] : size - 1;
        res.writeHead(206, { 'Content-Type': 'video/mp4', 'Accept-Ranges': 'bytes', 'Content-Range': `bytes ${a}-${b}/${size}`, 'Content-Length': b - a + 1 });
        fs.createReadStream(CLIP, { start: a, end: b }).pipe(res);
      } else {
        res.writeHead(200, { 'Content-Type': 'video/mp4', 'Accept-Ranges': 'bytes', 'Content-Length': size });
        fs.createReadStream(CLIP).pipe(res);
      }
      return;
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(req.url.startsWith('/app') ? page : '<!doctype html><title>blank</title>');
  });
  return new Promise((r) => server.listen(0, '127.0.0.1', () => r(server)));
}

// Everything drawn on top of the app (cursor, supers, clip, wipe, end card) lives in the page so the screencast records it.
const OVERLAY = `(() => {
  const css = document.createElement('style');
  css.textContent = \`
    @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=block');
    .hint-wrap{display:none!important}
    #dm-cursor{position:fixed;left:0;top:0;width:26px;height:26px;z-index:2147483647;pointer-events:none;transform:translate(-100px,-100px);filter:drop-shadow(0 2px 3px rgba(0,0,0,.45));transition:opacity .25s}
    #dm-cursor.off{opacity:0}
    .dm-ripple{position:fixed;width:34px;height:34px;margin:-17px 0 0 -17px;border-radius:50%;border:2px solid rgba(255,255,255,.9);background:rgba(91,136,255,.25);z-index:2147483646;pointer-events:none;animation:dmRip .45s ease-out forwards}
    @keyframes dmRip{from{transform:scale(.3);opacity:1}to{transform:scale(1.4);opacity:0}}
    #dm-clip{position:fixed;inset:0;width:100vw;height:100vh;object-fit:cover;z-index:2147483600;background:#000}
    .dm-layer{position:fixed;inset:0;pointer-events:none;z-index:2147483640}
    .dm-serif{position:fixed;left:8vw;bottom:12vh;max-width:70vw;font:italic 400 76px/1.05 'Instrument Serif',Georgia,serif;color:#fff8ec;text-shadow:0 2px 24px rgba(0,0,0,.45);letter-spacing:-.01em}
    .dm-word{display:inline-block;opacity:0;filter:blur(10px);transform:translateY(18px);animation:dmIn .9s cubic-bezier(.2,.8,.2,1) forwards}
    @keyframes dmIn{to{opacity:1;filter:none;transform:none}}
    .dm-big{position:fixed;inset:0;display:grid;place-items:center;text-align:center;padding:0 8vw}
    .dm-big .line{font:600 118px/1.02 Geist,system-ui,sans-serif;letter-spacing:-.035em;color:#fff;text-shadow:0 4px 40px rgba(0,0,0,.35)}
    .dm-big.scrim{background:radial-gradient(ellipse at center,rgba(6,8,14,.55),rgba(6,8,14,.15) 70%)}
    .dm-ch{display:inline-block;opacity:0}
    .dm-hard .dm-ch{font-family:'Geist Mono',ui-monospace,monospace;font-weight:600;text-transform:uppercase;letter-spacing:-.06em;animation:dmHard .01s steps(1) forwards}
    @keyframes dmHard{to{opacity:1}}
    .dm-fluid .dm-ch{filter:blur(14px);transform:translateY(40px) scale(.9);animation:dmFluid 1.1s cubic-bezier(.16,.9,.24,1) forwards}
    @keyframes dmFluid{to{opacity:1;filter:none;transform:none}}
    .dm-grad{background:linear-gradient(100deg,#E8742A,#F2A541 25%,#D98C8C 50%,#8E5A7A 72%,#5bb8d6);-webkit-background-clip:text;background-clip:text;color:transparent}
    .dm-chip{position:fixed;left:48px;bottom:44px;display:flex;align-items:center;gap:16px;padding:14px 22px 14px 16px;border-radius:999px;background:rgba(10,12,18,.78);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);box-shadow:0 10px 30px rgba(0,0,0,.35),inset 0 0 0 1px rgba(255,255,255,.08);color:#fff;animation:dmChip .45s cubic-bezier(.2,.9,.3,1.2) both}
    @keyframes dmChip{from{opacity:0;transform:translateY(16px) scale(.96)}}
    .dm-chip .dots{display:flex}.dm-chip .dots i{width:22px;height:22px;border-radius:50%;margin-left:-7px;box-shadow:0 0 0 2px rgba(10,12,18,.9)}
    .dm-chip b{font:600 30px/1 Geist,system-ui,sans-serif;letter-spacing:-.02em}
    .dm-chip span{font:500 19px/1 'Geist Mono',ui-monospace,monospace;color:rgba(255,255,255,.7)}
    .dm-cap{position:fixed;left:50%;bottom:40px;transform:translateX(-50%);display:flex;gap:12px;align-items:center;padding:14px 26px;border-radius:999px;background:rgba(12,14,20,.84);color:#fff;font:600 28px/1.2 Geist,system-ui,sans-serif;letter-spacing:-.01em;box-shadow:0 10px 30px rgba(0,0,0,.35);white-space:nowrap;animation:dmChip .4s cubic-bezier(.2,.9,.3,1.2) both}
    .dm-cap b{font:600 15px/1 'Geist Mono',ui-monospace,monospace;padding:6px 10px;border-radius:999px;background:#5b88ff;color:#0a1024}
    #dm-wipe{position:fixed;top:-30vh;left:0;width:230vw;height:160vh;z-index:2147483620;pointer-events:none;transform:translateX(-240vw) rotate(-6deg);
      background:repeating-linear-gradient(0deg,rgba(255,255,255,.07) 0 2px,transparent 2px 9px),repeating-linear-gradient(0deg,rgba(0,0,0,.08) 0 1px,transparent 1px 13px),linear-gradient(90deg,#2F5D6B,#8E5A7A 30%,#D98C8C 55%,#F2A541 78%,#E8742A);filter:url(#dm-rough)}
    #dm-wipe.go{transition:transform 1.15s cubic-bezier(.65,.05,.35,1);transform:translateX(100vw) rotate(-6deg)}
    #dm-brush{position:fixed;left:0;top:0;z-index:2147483645;pointer-events:none;transform-origin:20% 85%}
    .dm-end{position:fixed;inset:0;z-index:2147483630;display:grid;place-items:center;text-align:center;background:rgba(6,8,14,.5);backdrop-filter:blur(26px) saturate(1.3);-webkit-backdrop-filter:blur(26px) saturate(1.3);opacity:0;transition:opacity .7s}
    .dm-end.on{opacity:1}
    .dm-end .l1{font:italic 400 92px/1.05 'Instrument Serif',Georgia,serif;color:#fff8ec}
    .dm-end .l2{font:600 104px/1.05 Geist,system-ui,sans-serif;letter-spacing:-.035em;margin-top:8px}
    .dm-end .logo{display:flex;align-items:center;justify-content:center;gap:18px;margin-top:64px;font:600 46px/1 Geist,system-ui,sans-serif;letter-spacing:-.02em;color:#fff}
    .dm-end .mark{width:46px;height:46px;border-radius:14px;background:radial-gradient(circle at 22% 22%,#f7b6c5 0 18%,transparent 62%),radial-gradient(circle at 82% 28%,#c9ecff 0 14%,transparent 60%),radial-gradient(circle at 40% 88%,#46b8ff 0 12%,transparent 64%),#0b4fef;box-shadow:inset 0 0 0 1px rgba(255,255,255,.3)}\`;
  const svgns = 'http://www.w3.org/2000/svg';
  const add = () => {
    document.head.appendChild(css);
    const cur = document.createElement('div');
    cur.id = 'dm-cursor';
    cur.innerHTML = '<svg viewBox="0 0 24 24" width="26" height="26"><path d="M4 2.5 20 12l-7 1.6-3.4 6.9z" fill="#fff" stroke="#111" stroke-width="1.4" stroke-linejoin="round"/></svg>';
    const f = document.createElementNS(svgns, 'svg');
    f.setAttribute('width', '0'); f.setAttribute('height', '0'); f.style.position = 'absolute';
    f.innerHTML = '<filter id="dm-rough" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.012 0.08" numOctaves="3" seed="7"/><feDisplacementMap in="SourceGraphic" scale="90"/></filter>';
    document.body.append(cur, f);
  };
  if (document.body) add(); else document.addEventListener('DOMContentLoaded', add);
  let cx = -100, cy = -100;
  addEventListener('mousemove', (e) => { cx = e.clientX; cy = e.clientY; const c = document.getElementById('dm-cursor'); if (c) c.style.transform = 'translate(' + (cx - 3) + 'px,' + (cy - 2) + 'px)'; }, true);
  addEventListener('mousedown', (e) => { const r = document.createElement('div'); r.className = 'dm-ripple'; r.style.left = e.clientX + 'px'; r.style.top = e.clientY + 'px'; document.body.appendChild(r); setTimeout(() => r.remove(), 500); }, true);
  const layer = (kind) => { document.querySelectorAll('[data-dm="' + kind + '"]').forEach((n) => n.remove()); const d = document.createElement('div'); d.dataset.dm = kind; d.className = 'dm-layer'; document.body.appendChild(d); return d; };
  const words = (el, text, step, start = 0) => text.split(' ').forEach((w, i) => { const s = document.createElement('span'); s.className = 'dm-word'; s.textContent = w; s.style.animationDelay = (start + i * step) + 'ms'; el.append(s, ' '); });
  const chars = (el, text, step, jitter) => [...text].forEach((ch, i) => { const s = document.createElement('span'); s.className = 'dm-ch'; s.textContent = ch === ' ' ? '\\u00a0' : ch; s.style.animationDelay = (i * step + (jitter ? Math.random() * jitter : 0)) + 'ms'; el.appendChild(s); });
  window.__dm = {
    cursor(on) { document.getElementById('dm-cursor').classList.toggle('off', !on); },
    clear(kind) { document.querySelectorAll(kind ? '[data-dm="' + kind + '"]' : '[data-dm]').forEach((n) => n.remove()); },
    serif(text) { const l = layer('serif'), d = document.createElement('div'); d.className = 'dm-serif'; words(d, text, 140); l.appendChild(d); },
    // Kinetic headline: "hard" snaps blocky letters in, "fluid" lets them drift in out of a blur.
    big(lines, mode, opt = {}) {
      const l = layer('big'), d = document.createElement('div');
      d.className = 'dm-big dm-' + mode + (opt.scrim ? ' scrim' : '');
      const box = document.createElement('div');
      lines.forEach((t, i) => { const ln = document.createElement('div'); ln.className = 'line' + (opt.grad === i ? ' dm-grad' : ''); chars(ln, t, mode === 'hard' ? 45 : 32, mode === 'hard' ? 0 : 0); ln.querySelectorAll('.dm-ch').forEach((c) => (c.style.animationDelay = (parseFloat(c.style.animationDelay) + i * (opt.lineGap || 450)) + 'ms')); box.appendChild(ln); });
      d.appendChild(box); l.appendChild(d);
    },
    caption(text, badge) { const l = layer('cap'); if (!text) return; const c = document.createElement('div'); c.className = 'dm-cap'; c.textContent = text; if (badge) { const b = document.createElement('b'); b.textContent = badge; c.appendChild(b); } l.appendChild(c); },
    chip(name, spec, colors) {
      const l = layer('chip'), c = document.createElement('div'); c.className = 'dm-chip';
      const dots = document.createElement('div'); dots.className = 'dots';
      colors.forEach((k, i) => { const d = document.createElement('i'); d.style.background = k; if (!i) d.style.marginLeft = '0'; dots.appendChild(d); });
      const b = document.createElement('b'); b.textContent = name; const s = document.createElement('span'); s.textContent = spec;
      c.append(dots, b, s); l.appendChild(c);
    },
    async clipLoad(src) { const v = document.createElement('video'); v.id = 'dm-clip'; v.src = src; v.muted = true; v.playsInline = true; v.preload = 'auto'; document.body.appendChild(v); await new Promise((r) => { v.oncanplaythrough = r; v.load(); }); v.currentTime = 0; },
    clipPlay() { document.getElementById('dm-clip').play(); },
    clipHide() { const v = document.getElementById('dm-clip'); if (v) { v.pause(); v.remove(); } },
    wipe() {
      const w = document.createElement('div'); w.id = 'dm-wipe'; document.body.appendChild(w);
      requestAnimationFrame(() => requestAnimationFrame(() => w.classList.add('go')));
      setTimeout(() => { window.__dm.clipHide(); window.__dm.clear('serif'); }, 560);
      setTimeout(() => w.remove(), 1300);
    },
    // A paintbrush flies in, shrinks and turns into the arrow cursor at (x, y).
    morph(x, y) {
      const b = document.createElement('div'); b.id = 'dm-brush';
      b.innerHTML = '<svg viewBox="0 0 64 64" width="230" height="230"><path d="M44 6c4-2 10 4 8 8L30 40l-6-6z" fill="#e9e3d6" stroke="#111" stroke-width="2"/><path d="M24 34l6 6-4 4c-3 3-8 3-11 0l-1-1c4-1 5-4 5-6z" fill="#c9cfd8" stroke="#111" stroke-width="2"/><path d="M14 43c-5 1-8 5-8 10 0 2 2 4 4 4 6 0 10-4 10-9z" fill="#E8742A" stroke="#111" stroke-width="2"/></svg>';
      const sx = innerWidth / 2 - 115, sy = innerHeight / 2 - 115;
      b.style.transform = 'translate(' + sx + 'px,' + sy + 'px) rotate(-20deg) scale(.6)'; b.style.opacity = '0';
      document.body.appendChild(b);
      const c = document.getElementById('dm-cursor'); c.classList.add('off');
      b.animate([
        { transform: 'translate(' + sx + 'px,' + sy + 'px) rotate(-20deg) scale(.6)', opacity: 0 },
        { transform: 'translate(' + sx + 'px,' + sy + 'px) rotate(0deg) scale(1)', opacity: 1, offset: 0.3 },
        { transform: 'translate(' + sx + 'px,' + sy + 'px) rotate(8deg) scale(1)', opacity: 1, offset: 0.55 },
        { transform: 'translate(' + (x - 30) + 'px,' + (y - 190) + 'px) rotate(25deg) scale(.14)', opacity: 0 },
      ], { duration: 1500, easing: 'cubic-bezier(.6,0,.2,1)', fill: 'forwards' });
      setTimeout(() => c.classList.remove('off'), 1250);
      setTimeout(() => b.remove(), 1600);
    },
    end(l1, l2, name) {
      const e = document.createElement('div'); e.className = 'dm-end'; e.dataset.dm = 'end';
      e.innerHTML = '<div><div class="l1"></div><div class="l2 dm-grad"></div><div class="logo"><i class="mark"></i><span></span></div></div>';
      const [a, b, n] = [e.querySelector('.l1'), e.querySelector('.l2'), e.querySelector('.logo span')];
      words(a, l1, 120); words(b, l2, 160, 900); n.textContent = name;
      e.querySelector('.logo').style.cssText += ';opacity:0;animation:dmIn .9s 1.7s cubic-bezier(.2,.8,.2,1) forwards';
      document.body.appendChild(e); requestAnimationFrame(() => e.classList.add('on'));
      document.getElementById('dm-cursor').classList.add('off');
    },
  };
})();`;

// ------------------------------------------------------------------ actions the storyboard can use
function director(page, base) {
  let mx = W / 2, my = H / 2;
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const wait = (ms) => page.waitForTimeout(ms);
  const dm = (fn, ...args) => page.evaluate(([f, a]) => window.__dm[f](...a), [fn, args]);
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
  function frameRect(panel = true) {
    const l = 72, r = panel ? 304 : 0, t = 60, b = 52, aw = W - l - r, ah = H - t - b, fw = 1920, fh = 1080;
    const z = Math.min((aw - 72) / fw, (ah - 72) / fh), w = fw * z, h = fh * z;
    return { x: l + (aw - w) / 2, y: t + (ah - h) / 2, w, h };
  }
  return {
    wait, move, click, dblclick, frameRect, dm,
    at: (u, v) => { const r = frameRect(); return [r.x + u * r.w, r.y + v * r.h]; },
    jump: (x, y) => { mx = x; my = y; return page.mouse.move(x, y); },
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
    clip: () => dm('clipPlay'),
  };
}

// ------------------------------------------------------------------ record
(async () => {
  const server = await serve();
  const base = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--hide-scrollbars', '--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.error('page error:', e.message));
  await page.addInitScript(OVERLAY);
  await page.goto(base + '/blank');
  await page.evaluate((seed) => {
    localStorage.clear();
    localStorage.setItem('meshdraw:tips', JSON.stringify({ select: true, pen: true, pencil: true, smudge: true, grid: true, radial: true }));
    if (seed) localStorage.setItem('meshdraw:v4', JSON.stringify(seed));
  }, STORY.seed || null);
  await page.goto(base + '/app');
  await page.waitForTimeout(1500);
  await page.evaluate(() => document.fonts.load("italic 76px 'Instrument Serif'"));
  if (STORY.setup) await STORY.setup(director(page, base), page);
  if (CLIP) await page.evaluate(() => window.__dm.clipLoad('/clip'));
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

  const d = director(page, base);
  const marks = [];
  for (const [i, s] of STORY.scenes.entries()) {
    marks.push({ t: Date.now() / 1000, speed: s.speed || 1 });
    const t0 = Date.now();
    await s.run(d);
    console.log(`scene ${i + 1}: ${((Date.now() - t0) / 1000).toFixed(1)}s real, ~${((Date.now() - t0) / 1000 / (s.speed || 1)).toFixed(1)}s in video · ${s.name}`);
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
  const args = ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', listFile];
  const audio = STORY.audio && CLIP;
  if (audio) args.push('-i', CLIP);
  args.push('-vf', `fps=${FPS},format=yuv420p`, '-c:v', 'libx264', '-preset', 'slow', '-crf', '17');
  if (audio) {
    const { until, fade, gain } = STORY.audio;
    args.push('-filter_complex', `[1:a]atrim=0:${until},volume=${gain},afade=t=out:st=${until - fade}:d=${fade},apad[a]`, '-map', '0:v', '-map', '[a]', '-c:a', 'aac', '-b:a', '160k', '-shortest');
  }
  args.push('-movflags', '+faststart', OUT);
  execFileSync('ffmpeg', args, { stdio: 'inherit' });
  fs.rmSync(TMP, { recursive: true, force: true });
  console.log(`\n${frames.length} frames captured · video ${total.toFixed(1)}s → ${OUT}`);
})().catch((e) => { console.error(e); process.exit(1); });
