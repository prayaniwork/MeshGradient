// Meshdraw for Figma, the part that runs in the plugin window before the editor starts. It connects the editor to
// code.js: browser storage is backed by Figma's client storage, and window.meshdrawHost tells the editor what to open,
// which formats Figma can take, where finished renders go, and how to reach the AI model.
(() => {
  const init = window.__MESHDRAW_INIT__ || {};
  const post = (msg) => parent.postMessage({ pluginMessage: msg }, '*');

  // Plugin windows can't keep browser storage, so the editor's storage lives in memory, seeded from Figma's client
  // storage at launch, and every write is sent back to be kept there.
  const mem = new Map(Object.entries(init.storage || {}).map(([k, v]) => [k, String(v)]));
  const store = {
    getItem: (k) => (mem.has(String(k)) ? mem.get(String(k)) : null),
    setItem: (k, v) => { mem.set(String(k), String(v)); post({ type: 'storage', key: String(k), value: String(v) }); },
    removeItem: (k) => { mem.delete(String(k)); post({ type: 'storage', key: String(k), value: null }); },
    clear: () => { for (const k of mem.keys()) post({ type: 'storage', key: k, value: null }); mem.clear(); },
    key: (i) => [...mem.keys()][i] ?? null,
    get length() { return mem.size; },
  };
  try { Object.defineProperty(window, 'localStorage', { configurable: true, get: () => store }); } catch (e) { /* the editor copes without storage */ }

  // Requests to code.js get an id; code.js answers with { type: 'reply', id, ... }.
  let seq = 0;
  const waiting = new Map();
  const ask = (msg) => new Promise((resolve, reject) => { const id = ++seq; waiting.set(id, { resolve, reject }); post({ ...msg, id }); });
  window.addEventListener('message', (e) => {
    const m = e.data && e.data.pluginMessage;
    if (!m || m.type !== 'reply' || !waiting.has(m.id)) return;
    const w = waiting.get(m.id);
    waiting.delete(m.id);
    if (m.error) w.reject(m.error); else w.resolve(m);
  });

  let hasKey = !!(init.ai && init.ai.hasKey);
  window.meshdrawHost = {
    open: init.open || null,
    formats: ['png', 'jpg', 'svg', 'gif', 'mp4'],
    maxSize: 4096, // Figma's largest image fill
    exportLabel: 'Add to Figma',
    actionLabel: (fmt, n) => (n > 1 ? `Add ${n} layers` : 'Add to Figma'),
    notes: {
      png: 'Fills the linked or selected layer with a full-resolution image, or adds a new layer. Select it later and press Edit gradient to change it.',
      jpg: 'A smaller image fill for the linked or selected layer, or a new layer.',
      svg: 'Editable layers: rows of native Figma gradients masked into each other. Grain is left out.',
      gif: 'An animated GIF fill of the frame’s distortion.',
      mp4: 'A video fill of the frame’s distortion. Needs a Figma plan with video.',
    },
    place: (items) => ask({ type: 'place', items }).catch((e) => ({ message: (e && e.message) || 'Couldn’t add that to Figma.' })),
    // Groq answers prompts, with the key the user saves. The key goes straight to code.js and is never kept here.
    ai: {
      label: 'Groq',
      images: false,
      hasKey: () => hasKey,
      setKey: async (key) => { await ask({ type: 'ai-key', key }); hasKey = true; },
      clearKey: async () => { await ask({ type: 'ai-key', key: null }); hasKey = false; },
      json: (prompt, opts = {}) => new Promise((resolve, reject) => {
        if (opts.signal) {
          if (opts.signal.aborted) { reject({ code: 'cancelled' }); return; }
          opts.signal.addEventListener('abort', () => reject({ code: 'cancelled' }));
        }
        ask({ type: 'ai', prompt }).then((m) => resolve(m.data), (e) => { if (e && e.code === 'no_key') hasKey = false; reject(e); });
      }),
    },
  };

  // A grip in the bottom-right corner resizes the plugin window.
  document.addEventListener('DOMContentLoaded', () => {
    const grip = document.createElement('div');
    grip.setAttribute('aria-label', 'Resize window');
    grip.style.cssText = 'position:fixed;right:0;bottom:0;width:16px;height:16px;cursor:nwse-resize;z-index:2147483647;'
      + 'background:linear-gradient(135deg,transparent 50%,rgba(127,127,140,.55) 50%,rgba(127,127,140,.55) 58%,transparent 58%,transparent 70%,rgba(127,127,140,.55) 70%,rgba(127,127,140,.55) 78%,transparent 78%)';
    let start = null;
    grip.addEventListener('pointerdown', (e) => { start = { x: e.screenX, y: e.screenY, w: innerWidth, h: innerHeight }; grip.setPointerCapture(e.pointerId); });
    grip.addEventListener('pointermove', (e) => { if (start) post({ type: 'resize', width: start.w + e.screenX - start.x, height: start.h + e.screenY - start.y }); });
    grip.addEventListener('pointerup', () => { start = null; });
    document.body.appendChild(grip);
  });
})();
