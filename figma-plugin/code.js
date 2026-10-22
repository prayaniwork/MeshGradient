// Meshdraw for Figma, the part that runs inside Figma. It opens the Meshdraw editor (ui.html) in the plugin window,
// keeps the editor's saved state in Figma's client storage, and turns finished renders into layers:
//   PNG / JPG / GIF → an image fill, MP4 → a video fill, SVG → editable layers built from native Figma gradients.
// Every layer it makes keeps the gradient's data, so "Edit gradient" reopens it in the editor.
// AI prompts go to Groq from here, with the user's own key from client storage: the key never enters the editor window.

const DATA_KEY = 'meshdraw';
const KIND_KEY = 'meshdrawKind';
const WINDOW = { width: 1180, height: 760 };
const FILLABLE = new Set(['RECTANGLE', 'ELLIPSE', 'POLYGON', 'STAR', 'VECTOR', 'FRAME', 'COMPONENT', 'INSTANCE', 'BOOLEAN_OPERATION']);
const MAX_DATA = 90000; // stay well inside Figma's plugin-data size limit per layer
const KEY_STORE = 'groqApiKey'; // deliberately not a "meshdraw…" key, so it is never copied into the editor's storage
const GROQ_MODEL = 'openai/gpt-oss-120b';

const canFill = (node) => !!node && !node.removed && FILLABLE.has(node.type) && 'fills' in node;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const rgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
};

// ---------------------------------------------------------------- open
async function start() {
  const selection = figma.currentPage.selection;
  const target = selection.length === 1 ? selection[0] : null;
  let open = null;
  if (target) {
    const raw = target.getPluginData(DATA_KEY);
    if (raw) {
      try { open = { frame: JSON.parse(raw), link: target.id, name: target.name }; } catch (e) { open = null; }
    }
    if (!open && canFill(target)) open = { size: [target.width, target.height], link: target.id, name: target.name };
  }
  const storage = {};
  for (const key of await figma.clientStorage.keysAsync()) {
    if (key.startsWith('meshdraw')) storage[key] = await figma.clientStorage.getAsync(key);
  }
  const hasKey = !!(await figma.clientStorage.getAsync(KEY_STORE));
  const init = JSON.stringify({ storage, open, ai: { hasKey } }).replace(/</g, '\\u003c');
  figma.showUI(__html__.replace('/*MESHDRAW_INIT*/', `window.__MESHDRAW_INIT__ = ${init};`), { ...WINDOW, title: 'Meshdraw', themeColors: false });
}

// ---------------------------------------------------------------- place
// The layer an item lands on: the layer it is linked to, otherwise the one selected layer that can take a fill.
async function targetFor(item) {
  const linked = item.link ? await figma.getNodeByIdAsync(item.link) : null;
  if (linked && !linked.removed && (canFill(linked) || linked.getPluginData(KIND_KEY) === 'layers')) return linked;
  const sel = figma.currentPage.selection;
  return !item.link && sel.length === 1 && canFill(sel[0]) ? sel[0] : null;
}

function remember(node, item, kind) {
  const data = { ...item.data, link: null };
  let json = JSON.stringify(data);
  let note = '';
  if (json.length > MAX_DATA && data.warp) { data.warp = null; json = JSON.stringify(data); note = ' Smudge isn’t kept for re-editing on this layer (too large).'; }
  node.setPluginData(DATA_KEY, json);
  node.setPluginData(KIND_KEY, kind);
  node.setRelaunchData({ edit: 'Open this gradient in Meshdraw' });
  return note;
}

// SVG items arrive as a colour grid. Each row becomes a horizontal Figma gradient, faded in over the row above by an
// alpha mask, which blends the grid smoothly; a solid base sits underneath.
function buildLayers(grid, w, h, name) {
  const { cols, rows, hex, base } = grid;
  const frame = figma.createFrame();
  frame.name = name;
  frame.resize(w, h);
  frame.fills = [];
  frame.clipsContent = true;
  const bg = figma.createRectangle();
  bg.name = 'Base';
  bg.resize(w, h);
  bg.fills = [{ type: 'SOLID', color: rgb(base) }];
  frame.appendChild(bg);
  const rowH = h / (rows - 1);
  for (let r = 0; r < rows; r++) {
    const y0 = r === 0 ? 0 : (r - 1) * rowH, y1 = r === rows - 1 ? h : (r + 1) * rowH;
    const band = figma.createRectangle();
    band.name = `Row ${r + 1}`;
    band.resize(w, Math.max(0.01, y1 - y0));
    band.y = y0;
    band.fills = [{
      type: 'GRADIENT_LINEAR',
      gradientTransform: [[1, 0, 0], [0, 1, 0]],
      gradientStops: Array.from({ length: cols }, (_, c) => ({ position: c / (cols - 1), color: { ...rgb(hex[r * cols + c]), a: 1 } })),
    }];
    if (r === 0) { frame.appendChild(band); continue; }
    const fade = figma.createRectangle();
    fade.name = 'Fade';
    fade.resize(w, Math.max(0.01, y1 - y0));
    fade.y = y0;
    const white = (a) => ({ r: 1, g: 1, b: 1, a });
    fade.fills = [{
      type: 'GRADIENT_LINEAR',
      gradientTransform: [[0, 1, 0], [-1, 0, 1]],
      gradientStops: r === rows - 1
        ? [{ position: 0, color: white(0) }, { position: 1, color: white(1) }]
        : [{ position: 0, color: white(0) }, { position: 0.5, color: white(1) }, { position: 1, color: white(1) }],
    }];
    frame.appendChild(fade);
    frame.appendChild(band);
    const group = figma.group([fade, band], frame);
    group.name = `Row ${r + 1}`;
    fade.isMask = true;
  }
  return frame;
}

async function paintFor(item) {
  if (item.format === 'mp4') {
    if (typeof figma.createVideoAsync !== 'function') throw new Error('Video fills aren’t available here. Try GIF instead.');
    const video = await figma.createVideoAsync(item.bytes);
    return { type: 'VIDEO', videoHash: video.hash, scaleMode: 'FILL' };
  }
  return { type: 'IMAGE', imageHash: figma.createImage(item.bytes).hash, scaleMode: 'FILL' };
}

async function place(items) {
  const links = [], touched = [], center = figma.viewport.center;
  let created = 0, updated = 0, note = '';
  let x = null;
  const totalW = items.reduce((a, it) => a + it.size[0] + 80, -80);
  for (const item of items) {
    const target = await targetFor(item);
    const [w0, h0] = item.size;
    if (x === null) x = Math.round(center.x - totalW / 2);
    let node;
    if (item.format === 'svg') {
      const w = target ? target.width : w0, h = target ? target.height : h0;
      node = buildLayers(item.grid, w, h, item.name);
      if (target) {
        const parent = target.parent || figma.currentPage;
        parent.insertChild(Math.min(parent.children.indexOf(target) + 1, parent.children.length), node);
        node.x = target.x; node.y = target.y;
        if (target.getPluginData(KIND_KEY) === 'layers') { target.remove(); updated++; } else created++;
      } else {
        figma.currentPage.appendChild(node);
        node.x = x; node.y = Math.round(center.y - h / 2);
        created++;
      }
    } else {
      const paint = await paintFor(item);
      if (target && canFill(target)) {
        node = target;
        node.fills = [paint];
        updated++;
      } else {
        node = figma.createRectangle();
        node.name = item.name;
        node.resize(w0, h0);
        node.fills = [paint];
        figma.currentPage.appendChild(node);
        node.x = x; node.y = Math.round(center.y - h0 / 2);
        created++;
      }
    }
    note = remember(node, item, item.format === 'svg' ? 'layers' : 'fill') || note;
    links.push(node.id);
    touched.push(node);
    x += w0 + 80;
  }
  figma.currentPage.selection = touched;
  if (created) figma.viewport.scrollAndZoomIntoView(touched);
  const what = items[0].format === 'svg' ? 'gradient layers' : items[0].format === 'mp4' ? 'video fill' : items[0].format === 'gif' ? 'GIF fill' : 'image fill';
  const parts = [];
  if (created) parts.push(`added ${created}`);
  if (updated) parts.push(`updated ${updated}`);
  const message = `${parts.join(', ').replace(/^./, (c) => c.toUpperCase())} ${what}${items.length > 1 || created + updated > 1 ? 's' : ''} in Figma.${note}`;
  figma.notify(message);
  return { links, message };
}

// ---------------------------------------------------------------- AI
// Asks Groq for one JSON scene. Errors carry a code the editor turns into a message.
async function groqJson(prompt) {
  const key = await figma.clientStorage.getAsync(KEY_STORE);
  if (!key) throw { code: 'no_key' };
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: GROQ_MODEL, messages: [{ role: 'user', content: prompt }], response_format: { type: 'json_object' }, temperature: 0.9 }),
  });
  if (res.status === 401 || res.status === 403) throw { code: 'bad_key' };
  if (res.status === 429) throw { code: 'rate_limited' };
  if (!res.ok) throw { code: 'failed', message: `Groq returned an error (${res.status}). Try again.` };
  const body = await res.json();
  try { return JSON.parse(body.choices[0].message.content); } catch (e) { throw { code: 'invalid_json' }; }
}

// ---------------------------------------------------------------- messages from the editor
// Requests carry an id; the answer goes back as { type: 'reply', id, ... } or { type: 'reply', id, error }.
const reply = (id, data) => figma.ui.postMessage({ type: 'reply', id, ...data });
const failure = (e) => ({ code: (e && e.code) || 'failed', message: (e && e.message) || String(e) });
figma.ui.onmessage = async (msg) => {
  if (!msg || !msg.type) return;
  if (msg.type === 'storage') {
    try {
      if (msg.value == null) await figma.clientStorage.deleteAsync(msg.key);
      else await figma.clientStorage.setAsync(msg.key, msg.value);
    } catch (e) { /* storage full: the editor still works for this session */ }
  } else if (msg.type === 'resize') {
    figma.ui.resize(Math.round(clamp(msg.width, 720, 2400)), Math.round(clamp(msg.height, 520, 1600)));
  } else if (msg.type === 'place') {
    try {
      reply(msg.id, await place(msg.items));
    } catch (e) {
      figma.notify((e && e.message) || String(e), { error: true });
      reply(msg.id, { error: failure(e) });
    }
  } else if (msg.type === 'ai-key') {
    try {
      if (msg.key) await figma.clientStorage.setAsync(KEY_STORE, String(msg.key).trim());
      else await figma.clientStorage.deleteAsync(KEY_STORE);
      reply(msg.id, {});
    } catch (e) { reply(msg.id, { error: failure(e) }); }
  } else if (msg.type === 'ai') {
    try { reply(msg.id, { data: await groqJson(msg.prompt) }); } catch (e) { reply(msg.id, { error: failure(e) }); }
  }
};

start();
