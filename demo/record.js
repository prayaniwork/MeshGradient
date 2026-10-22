// Records the Meshdraw film: serves ../meshdraw.html, drives it in headless Chrome following script.js (overlay.js draws the supers),
// captures the screen with the DevTools screencast, then speeds up each scene, adds an optional music track and encodes an MP4.
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
// Optional soundtrack in script.js: music: { file, gain, fade } plus either `edit(marks, total)`, which returns pieces
// { at, src } (film seconds ← track seconds) placed against the storyboard's d.mark() moments, or `at` + `drop` to shift
// the whole track so its drop lands on one mark. The result is cut to the film and faded out.
const MUSIC = STORY.music ? { gain: 1, fade: 1.5, ...STORY.music, file: path.resolve(__dirname, STORY.music.file) } : null;
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

// ------------------------------------------------------------------ actions the storyboard can use
const beats = {};
// What the app's view is doing: settings panel open or not, and how far the selected frame was shrunk and lowered after a fit.
const view = { panel: true, f: 1, dy: 0 };
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
  // The app's canvas area beside the toolbar and settings panel.
  function area(panel = view.panel) {
    const l = 72, r = panel ? 304 : 0, t = 60, b = 52;
    return { x: l, y: t, w: W - l - r, h: H - t - b };
  }
  // Mirrors the app's "zoom to frame" layout, then the shrink and lowering applied after it, so frame coordinates map to the screen.
  function frameRect(panel = view.panel) {
    const a = area(panel), fw = 1920, fh = 1080;
    const z = Math.min((a.w - 72) / fw, (a.h - 72) / fh), w = fw * z, h = fh * z, cx = a.x + a.w / 2, cy = a.y + a.h / 2;
    const f = view.f;
    return { x: cx - (w * f) / 2, y: cy - (h * f) / 2 + view.dy, w: w * f, h: h * f };
  }
  const wheel = (opt) => page.evaluate((o) => document.getElementById('overlay').dispatchEvent(new WheelEvent('wheel', { bubbles: true, cancelable: true, ...o })), opt);
  // Zooms the fitted frame out to f of its size and lowers it by dy, leaving room above it for supers.
  async function shrink(f = 0.8, dy = 70) {
    const a = area(), cx = a.x + a.w / 2, cy = a.y + a.h / 2;
    await wheel({ deltaY: -Math.log(f) / 0.006, ctrlKey: true, clientX: cx, clientY: cy });
    await wheel({ deltaY: -dy, clientX: cx, clientY: cy });
    view.f = f; view.dy = dy;
  }
  return {
    wait, move, click, dblclick, frameRect, dm, shrink,
    mark: (name) => { beats[name] = Date.now() / 1000; },
    // Presses a key that zooms to a frame (PageDown, Shift+Digit2...), then shrinks it unless told not to.
    async fit(k, opt = {}) {
      await page.keyboard.press(k);
      view.f = 1; view.dy = 0;
      if (opt.shrink !== false) await shrink(opt.f, opt.dy);
      await wait(60);
    },
    async panel(open) { if (view.panel !== open) { await page.keyboard.press('\\'); view.panel = open; await wait(60); } },
    // Serif super centred in the empty canvas above the selected frame.
    async sup(text, opt = {}) {
      const a = area(), r = frameRect(), size = opt.size || 112;
      const top = Math.max(64, (a.y + r.y - 14) / 2 - size * 0.62);
      await dm('sup', text, { ...opt, size, top: top + 'px', left: a.x, right: W - a.x - a.w });
    },
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
    async dragLine(a, b, ms) {
      await move(a[0], a[1]);
      await page.mouse.down();
      await move(b[0], b[1], ms);
      await page.mouse.up();
      await wait(80);
    },
    async drag(points, ms) {
      await move(points[0][0], points[0][1]);
      await page.mouse.down();
      const per = ms / points.length;
      for (const [x, y] of points.slice(1)) { await page.mouse.move(x, y, { steps: 3 }); await wait(per); mx = x; my = y; }
      await page.mouse.up();
    },
  };
}

// ------------------------------------------------------------------ record
(async () => {
  const server = await serve();
  const base = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--hide-scrollbars', '--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.error('page error:', e.message));
  await page.addInitScript({ path: path.join(__dirname, 'overlay.js') });
  await page.goto(base + '/blank');
  await page.evaluate((seed) => {
    localStorage.clear();
    localStorage.setItem('meshdraw:tips', JSON.stringify({ select: true, pen: true, pencil: true, smudge: true, grid: true, radial: true }));
    if (seed) localStorage.setItem('meshdraw:v4', JSON.stringify(seed));
  }, STORY.seed || null);
  await page.goto(base + '/app');
  await page.waitForTimeout(1500);
  await page.evaluate(() => Promise.all([document.fonts.load("italic 76px 'Instrument Serif'"), document.fonts.load("76px 'Instrument Serif'")]));
  if (STORY.setup) await STORY.setup(director(page, base), page);
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
  if (MUSIC) args.push('-i', MUSIC.file);
  args.push('-vf', `fps=${FPS},format=yuv420p`, '-c:v', 'libx264', '-preset', 'slow', '-crf', '17');
  if (MUSIC && MUSIC.edit) {
    // An edit list of { at: video seconds, src: track seconds } pieces, cut together with tiny fades.
    const marks = Object.fromEntries(Object.entries(beats).map(([k, t]) => [k, toVideo(t)]));
    const segs = MUSIC.edit(marks, total).filter((s, i, all) => i === all.length - 1 || all[i + 1].at > s.at + 0.02);
    const parts = segs.map((s, i) => {
      const len = (i + 1 < segs.length ? segs[i + 1].at : total) - s.at, d = Math.min(0.012, len / 4);
      return `[m${i}]atrim=start=${s.src.toFixed(3)}:end=${(s.src + len).toFixed(3)},asetpts=PTS-STARTPTS,afade=t=in:d=${i ? d : 0.15},afade=t=out:st=${(len - d).toFixed(3)}:d=${d}[p${i}]`;
    });
    const fadeAt = Math.max(0, total - MUSIC.fade).toFixed(3);
    const graph = `[1:a]asplit=${segs.length}${segs.map((_, i) => `[m${i}]`).join('')};${parts.join(';')};${segs.map((_, i) => `[p${i}]`).join('')}concat=n=${segs.length}:v=0:a=1,volume=${MUSIC.gain},alimiter=limit=0.79:level=disabled,afade=t=out:st=${fadeAt}:d=${MUSIC.fade},apad[a]`;
    args.push('-filter_complex', graph, '-map', '0:v', '-map', '[a]', '-c:a', 'aac', '-b:a', '192k', '-shortest');
    console.log('music edit: ' + segs.map((s) => `${s.at.toFixed(2)}s ← track ${s.src.toFixed(2)}s`).join(' · '));
  } else if (MUSIC) {
    const at = MUSIC.at && beats[MUSIC.at] != null ? toVideo(beats[MUSIC.at]) : null;
    const shift = at == null ? 0 : at - (MUSIC.drop || 0), trim = Math.max(0, -shift), delay = Math.round(Math.max(0, shift) * 1000);
    const end = total.toFixed(3), fadeAt = Math.max(0, total - MUSIC.fade).toFixed(3);
    args.push('-filter_complex', `[1:a]atrim=start=${trim.toFixed(3)},asetpts=PTS-STARTPTS,adelay=${delay}:all=1,atrim=0:${end},volume=${MUSIC.gain},alimiter=limit=0.79:level=disabled,afade=t=out:st=${fadeAt}:d=${MUSIC.fade},apad[a]`,
      '-map', '0:v', '-map', '[a]', '-c:a', 'aac', '-b:a', '192k', '-shortest');
    if (at != null) console.log(`music: drop at ${(at).toFixed(2)}s (track ${shift >= 0 ? 'delayed' : 'trimmed'} ${Math.abs(shift).toFixed(2)}s)`);
  }
  args.push('-movflags', '+faststart', OUT);
  execFileSync('ffmpeg', args, { stdio: 'inherit' });
  fs.rmSync(TMP, { recursive: true, force: true });
  console.log(`\n${frames.length} frames captured · video ${total.toFixed(1)}s → ${OUT}`);
})().catch((e) => { console.error(e); process.exit(1); });
