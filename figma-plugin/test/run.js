// End-to-end test of the plugin outside Figma: a stand-in for Figma's plugin API runs the real code.js, which opens the
// real ui.html in a plugin-style window; the test then plays the whole loop in headless Chrome.
//   node figma-plugin/test/run.js           (needs Google Chrome; set GROQ_API_KEY or keep it in ../../.env to test AI)
const fs = require('fs');
const path = require('path');
const http = require('http');
const { chromium } = require(path.join(__dirname, '..', '..', 'demo', 'node_modules', 'playwright-core'));

const ROOT = path.join(__dirname, '..');
const envFile = path.join(ROOT, '..', '.env');
const GROQ = process.env.GROQ_API_KEY || (fs.existsSync(envFile) ? (fs.readFileSync(envFile, 'utf8').match(/GROQ_API_KEY=(\S+)/) || [])[1] : '');

// A small model of the parts of Figma's API that code.js uses.
const FAKE_FIGMA = `
let nid = 1; const nodes = new Map(); window.__log = [];
function mk(type) {
  const n = { id: '1:' + nid++, type, name: type, x: 0, y: 0, width: 100, height: 100, fills: [], children: [], parent: null, removed: false, isMask: false, _pd: {}, _relaunch: null,
    resize(w, h) { this.width = w; this.height = h; }, getPluginData(k) { return this._pd[k] || ''; }, setPluginData(k, v) { this._pd[k] = v; },
    setRelaunchData(d) { this._relaunch = d; }, appendChild(c) { detach(c); c.parent = this; this.children.push(c); },
    insertChild(i, c) { detach(c); c.parent = this; this.children.splice(i, 0, c); }, remove() { detach(this); this.removed = true; } };
  nodes.set(n.id, n); return n;
}
function detach(c) { if (c.parent) { const a = c.parent.children; a.splice(a.indexOf(c), 1); c.parent = null; } }
const pageNode = mk('PAGE'); pageNode.selection = [];
const store = new Map(Object.entries(window.__seedStorage || {}));
let frameEl = null;
window.figma = {
  currentPage: pageNode, viewport: { center: { x: 0, y: 0 }, scrollAndZoomIntoView() {} },
  notify: (t) => window.__log.push(t),
  clientStorage: { keysAsync: async () => [...store.keys()], getAsync: async (k) => store.get(k), setAsync: async (k, v) => { store.set(k, v); }, deleteAsync: async (k) => { store.delete(k); } },
  getNodeByIdAsync: async (id) => nodes.get(id) || null,
  createRectangle: () => { const n = mk('RECTANGLE'); pageNode.appendChild(n); return n; },
  createFrame: () => { const n = mk('FRAME'); pageNode.appendChild(n); return n; },
  group: (list, parent) => { const g = mk('GROUP'); parent.appendChild(g); list.forEach((n) => g.appendChild(n)); return g; },
  createImage: (bytes) => ({ hash: 'img-' + bytes.length, bytes }),
  createVideoAsync: async (bytes) => ({ hash: 'vid-' + bytes.length }),
  showUI(html, opts) {
    frameEl = document.createElement('iframe');
    frameEl.style.cssText = 'position:fixed;left:0;top:0;border:0;width:' + opts.width + 'px;height:' + opts.height + 'px';
    frameEl.srcdoc = html; document.body.appendChild(frameEl);
  },
  ui: { onmessage: null, postMessage(m) { frameEl.contentWindow.postMessage({ pluginMessage: m }, '*'); }, resize(w, h) { frameEl.style.width = w + 'px'; frameEl.style.height = h + 'px'; } },
  closePlugin() {},
};
window.addEventListener('message', (e) => { if (frameEl && e.source === frameEl.contentWindow && e.data && e.data.pluginMessage) figma.ui.onmessage(e.data.pluginMessage); });
window.__store = store; window.__nodes = nodes; window.__page = pageNode; window.__mk = mk;
`;

(async () => {
  const html = fs.readFileSync(path.join(ROOT, 'ui.html'), 'utf8');
  const code = fs.readFileSync(path.join(ROOT, 'code.js'), 'utf8');
  const server = http.createServer((q, r) => { r.setHeader('Content-Type', 'text/html'); r.end('<!doctype html><title>Figma stand-in</title><body style="margin:0;background:#2c2c2c"></body>'); });
  await new Promise((r) => server.listen(0, r));
  const url = 'http://127.0.0.1:' + server.address().port + '/';
  const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1180, height: 760 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const checks = [];
  const check = (name, ok, detail = '') => { checks.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  · ' + detail : ''}`); };
  const ui = () => page.frames().find((f) => f !== page.mainFrame());

  // Launch with one plain 800×400 rectangle selected; nothing stored yet except "tips seen".
  const launch = async (setup) => {
    await page.goto(url);
    await page.evaluate(FAKE_FIGMA);
    await page.evaluate(setup);
    await page.evaluate(`window.__html__ = ${JSON.stringify(html)};\n${code}`);
    await page.waitForTimeout(2200);
    ui().on && null;
  };
  await launch(`(() => { const r = window.__mk('RECTANGLE'); r.name = 'Hero'; r.resize(800, 400); window.__page.appendChild(r); window.__page.selection = [r]; window.__hero = r.id;
    window.__store.set('meshdraw:tips', JSON.stringify({ select: 1, pen: 1, pencil: 1, smudge: 1, grid: 1, radial: 1 })); })()`);
  const f = ui();
  f.on && f.on('pageerror', (e) => errors.push(e.message));
  const names = await f.evaluate(() => [...document.querySelectorAll('#framesList .fi-name')].map((e) => e.textContent));
  check('opens a frame for the selected layer', names.includes('Hero'), names.join(', '));
  check('editor shows "Add to Figma"', (await f.textContent('#exportBtn')).trim() === 'Add to Figma');
  check('only Figma-ready formats offered', (await f.evaluate(() => [...document.querySelectorAll('#exportFormat button')].map((b) => b.dataset.f).join(','))) === 'png,jpg,svg,gif,mp4');

  // PNG onto the selected layer
  await f.click('#exportBtn'); await page.waitForTimeout(900);
  await f.click('#dlBtn'); await page.waitForTimeout(1800);
  const hero = await page.evaluate(() => { const n = window.__nodes.get(window.__hero); return { fill: n.fills[0] && n.fills[0].type, data: n.getPluginData('meshdraw').length, relaunch: !!n._relaunch }; });
  check('PNG becomes an image fill on that layer', hero.fill === 'IMAGE', JSON.stringify(hero));
  check('layer keeps the gradient for re-editing', hero.data > 100 && hero.relaunch);

  // SVG as editable layers
  await f.click('#exportFormat [data-f="svg"]'); await page.waitForTimeout(1200);
  await f.click('#dlBtn'); await page.waitForTimeout(1500);
  const layers = await page.evaluate(() => {
    const fr = [...window.__nodes.values()].find((n) => n.type === 'FRAME' && n.getPluginData('meshdrawKind') === 'layers');
    if (!fr) return null;
    const groups = fr.children.filter((c) => c.type === 'GROUP');
    return { children: fr.children.length, groups: groups.length, masked: groups.every((g) => g.children[0].isMask), stops: fr.children[1].fills[0].gradientStops.length, w: fr.width, h: fr.height };
  });
  check('SVG becomes editable gradient layers', !!layers && layers.groups > 10 && layers.masked, JSON.stringify(layers));
  await f.click('#exportClose');

  // AI: no key yet → key field; save the key; it must not reach the editor's storage
  const r = { x: 108, y: 201, w: 732, h: 366 };
  await page.mouse.click(r.x + r.w - 11, r.y - 17); await page.waitForTimeout(700);
  check('prompt node opens', (await f.evaluate(() => document.querySelectorAll('#nodes .node.prompt').length)) === 1);
  check('asks for a key first', await f.isVisible('.node-key'), await f.textContent('.node-status'));
  if (GROQ) {
    await f.fill('.node-key input', GROQ);
    await f.click('.node-save'); await page.waitForTimeout(400);
    const where = await page.evaluate((k) => ({ figma: window.__store.get('groqApiKey') === k, editor: [...window.__store.entries()].some(([key, v]) => key !== 'groqApiKey' && String(v).includes(k)) }), GROQ);
    const inPage = await f.evaluate((k) => document.documentElement.outerHTML.includes(k) || [...Array(localStorage.length).keys()].some((i) => String(localStorage.getItem(localStorage.key(i))).includes(k)), GROQ);
    check('key saved in Figma client storage', where.figma);
    check('key not kept in the editor or its storage', !where.editor && !inPage);
    await f.fill('.node.prompt textarea', 'Electric lagoon at night: cyan, violet and a hot pink ribbon');
    await f.click('.node-go');
    const t0 = Date.now();
    await f.waitForFunction(() => !/Thinking/.test(document.querySelector('.node-status').textContent), null, { timeout: 60000 });
    const after = await f.evaluate(() => ({ status: document.querySelector('.node-status').textContent, count: document.getElementById('count').textContent }));
    check('Groq generates a scene into the frame', /^Done/.test(after.status), `${after.status} · ${after.count} · ${((Date.now() - t0) / 1000).toFixed(1)}s`);
    await page.screenshot({ path: path.join(__dirname, 'ai.png') });
  } else console.log('SKIP  AI generation (no GROQ_API_KEY)');

  // Reopen on the layer: the editor should load the stored gradient
  await page.evaluate(() => { const n = window.__nodes.get(window.__hero); window.__heroData = n.getPluginData('meshdraw'); });
  const saved = await page.evaluate(() => ({ data: window.__heroData, store: [...window.__store.entries()] }));
  await launch(`(() => { window.__store.clear(); for (const [k, v] of ${JSON.stringify(saved.store)}) window.__store.set(k, v);
    const r = window.__mk('RECTANGLE'); r.name = 'Hero'; r.resize(800, 400); r.setPluginData('meshdraw', ${JSON.stringify(saved.data)}); window.__page.appendChild(r); window.__page.selection = [r]; })()`);
  const reopened = await ui().evaluate(() => ({ count: document.getElementById('count').textContent, active: document.querySelector('#framesList [aria-current="true"] .fi-name').textContent }));
  check('Edit gradient reopens the stored gradient', /point/.test(reopened.count) && reopened.active === 'Hero', JSON.stringify(reopened));
  check('no page errors', errors.length === 0, errors.join(' | '));
  await browser.close(); server.close();
  console.log(`\n${checks.filter(Boolean).length}/${checks.length} checks passed`);
  process.exit(checks.every(Boolean) ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
