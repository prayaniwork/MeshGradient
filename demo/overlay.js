// Injected into the page by record.js. Everything drawn over the app for the film lives here: the cursor,
// serif supers, white title cards, the gradient flood, flash cuts and the end card. Supers stay out of the
// bottom band so subtitles can sit there.
(() => {
  const SERIF = "'Instrument Serif', Georgia, serif";
  const BRIGHT = 'linear-gradient(100deg,#FF5A1F,#FF3D8B 30%,#B57BFF 55%,#2D6BFF 78%,#22D3EE)';
  const css = document.createElement('style');
  css.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=block');
    .hint-wrap{display:none!important}
    #dm-cursor{position:fixed;left:0;top:0;z-index:2147483647;pointer-events:none;transform:translate(-200px,-200px);filter:drop-shadow(0 3px 4px rgba(0,0,0,.35));transition:opacity .2s}
    #dm-cursor.off{opacity:0}
    #dm-cursor .hand{display:none}
    #dm-cursor.is-hand .hand{display:block}#dm-cursor.is-hand .arrow{display:none}
    .dm-ripple{position:fixed;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;border:2.5px solid #7c5cff;background:rgba(124,92,255,.18);z-index:2147483646;pointer-events:none;animation:dmRip .45s ease-out forwards}
    @keyframes dmRip{from{transform:scale(.3);opacity:1}to{transform:scale(1.5);opacity:0}}
    .dm-layer{position:fixed;inset:0;pointer-events:none}
    .dm-card{background:#fff;z-index:2147483600;display:grid;place-items:center}
    .dm-card .line{font:400 132px/1.1 ${SERIF};color:#141218;letter-spacing:-.015em;display:flex;align-items:center;justify-content:center;gap:.24em;white-space:nowrap}
    .dm-w{display:inline-block;opacity:0;filter:blur(10px);transform:translateY(.25em);animation:dmIn .42s cubic-bezier(.2,.9,.25,1) forwards}
    @keyframes dmIn{to{opacity:1;filter:none;transform:none}}
    .dm-it{font-style:italic}
    .dm-chip{display:inline-block;width:1.9em;height:.82em;border-radius:999px;background:${BRIGHT};background-size:300% 100%;animation:dmIn .42s cubic-bezier(.2,.9,.25,1) forwards,dmFlow 2.4s linear infinite;opacity:0;box-shadow:0 .08em .3em rgba(124,92,255,.35),inset 0 0 0 1px rgba(255,255,255,.4);transform:translateY(.06em)}
    @keyframes dmFlow{to{background-position:300% 0}}
    .dm-fill{background:${BRIGHT};background-size:200% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;animation:dmIn .42s forwards,dmFlow 2s linear infinite;transform-origin:center}
    .dm-pop{animation:dmPop .35s cubic-bezier(.2,1.4,.4,1) forwards!important}
    @keyframes dmPop{0%{transform:scale(1)}50%{transform:scale(1.12)}100%{transform:scale(1.04)}}
    .dm-flood{z-index:2147483610;background:radial-gradient(circle at var(--x) var(--y),#FFE14D 0,#FF8A3D 18%,#FF3D8B 36%,#B57BFF 56%,#2D6BFF 76%,#22D3EE 100%);clip-path:circle(0 at var(--x) var(--y));animation:dmFlood .5s cubic-bezier(.7,0,.2,1) forwards;display:grid;place-items:center}
    @keyframes dmFlood{to{clip-path:circle(150% at var(--x) var(--y))}}
    .dm-flood .intro{text-align:center;color:#fff;text-shadow:0 .04em .25em rgba(60,20,120,.3)}
    .dm-flood .small{font:italic 400 64px/1 ${SERIF};opacity:0;animation:dmIn .4s .15s forwards}
    .dm-flood .name{font:400 220px/1 ${SERIF};letter-spacing:-.02em;margin-top:10px;display:flex;justify-content:center}
    .dm-ch{display:inline-block;opacity:0;animation:dmSnap .7s cubic-bezier(.2,1.3,.3,1) forwards}
    @keyframes dmSnap{from{opacity:0;transform:translate(var(--dx),var(--dy)) rotate(var(--r)) scale(.6)}to{opacity:1;transform:none}}
    .dm-sup{z-index:2147483605;display:flex;justify-content:center;align-items:flex-start;padding-top:var(--top,17vh)}
    .dm-sup .t{display:flex;flex-wrap:wrap;justify-content:center;column-gap:.24em;font:400 var(--size,104px)/1.02 ${SERIF};color:#fff;letter-spacing:-.015em;text-align:center;text-shadow:0 .03em .3em rgba(0,0,0,.35);padding:0 6vw}
    .dm-sup.center{align-items:center;padding-top:0;padding-bottom:6vh}
    .dm-sup.invert .t{color:#fff;text-shadow:none;mix-blend-mode:difference}
    .dm-sup.scrim .t{background:radial-gradient(ellipse at center,rgba(8,10,16,.82),rgba(8,10,16,.55) 45%,transparent 72%);padding:.35em 1.2em}
    .dm-sup.dark .t{color:#141218;text-shadow:0 .02em .3em rgba(255,255,255,.6)}
    .dm-flash{z-index:2147483620;background:#fff;animation:dmFlash .16s ease-out forwards}
    @keyframes dmFlash{from{opacity:.9}to{opacity:0}}
    .dm-end{z-index:2147483630;display:grid;place-items:center;text-align:center;background:#fff;opacity:0;animation:dmFade .35s forwards}
    @keyframes dmFade{to{opacity:1}}
    .dm-end .l1{display:flex;justify-content:center;gap:.24em;font:italic 400 104px/1.05 ${SERIF};color:#141218}
    .dm-end .l2{font:400 150px/1.05 ${SERIF};letter-spacing:-.02em;margin-top:6px}
    .dm-end .logo{display:flex;align-items:center;justify-content:center;gap:20px;margin-top:70px;font:400 64px/1 ${SERIF};color:#141218;opacity:0;animation:dmIn .5s 1.3s forwards}
    .dm-end .mark{width:58px;height:58px;border-radius:18px;background:radial-gradient(circle at 22% 22%,#f7b6c5 0 18%,transparent 62%),radial-gradient(circle at 82% 28%,#c9ecff 0 14%,transparent 60%),radial-gradient(circle at 40% 88%,#46b8ff 0 12%,transparent 64%),#0b4fef;box-shadow:inset 0 0 0 1px rgba(255,255,255,.3)}
  `;
  const add = () => {
    document.head.appendChild(css);
    const cur = document.createElement('div');
    cur.id = 'dm-cursor';
    cur.innerHTML = '<svg class="arrow" viewBox="0 0 24 24" width="28" height="28"><path d="M4 2.5 20 12l-7 1.6-3.4 6.9z" fill="#fff" stroke="#111" stroke-width="1.4" stroke-linejoin="round"/></svg>'
      + '<svg class="hand" viewBox="0 0 32 32" width="44" height="44"><path d="M12 15V5.5a2 2 0 0 1 4 0V14m0-1.5a2 2 0 0 1 4 0V15m0-1a2 2 0 0 1 4 0v1.5m0-.5a2 2 0 0 1 4 0V22c0 4.5-3.5 8-8 8h-2.5c-2.6 0-4.3-1-5.8-2.8L5.6 22a2 2 0 0 1 3-2.6L12 23" fill="#fff" stroke="#111" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/></svg>';
    document.body.appendChild(cur);
  };
  if (document.body) add(); else document.addEventListener('DOMContentLoaded', add);
  let cx = -200, cy = -200;
  addEventListener('mousemove', (e) => {
    cx = e.clientX; cy = e.clientY;
    const c = document.getElementById('dm-cursor');
    if (c) c.style.transform = c.classList.contains('is-hand') ? `translate(${cx - 13}px,${cy - 4}px)` : `translate(${cx - 3}px,${cy - 2}px)`;
  }, true);
  const ripple = (x, y) => { const r = document.createElement('div'); r.className = 'dm-ripple'; r.style.left = x + 'px'; r.style.top = y + 'px'; document.body.appendChild(r); setTimeout(() => r.remove(), 500); };
  addEventListener('mousedown', (e) => ripple(e.clientX, e.clientY), true);
  const layer = (kind, cls) => {
    document.querySelectorAll(`[data-dm="${kind}"]`).forEach((n) => n.remove());
    const d = document.createElement('div'); d.dataset.dm = kind; d.className = 'dm-layer ' + (cls || ''); document.body.appendChild(d); return d;
  };
  // Words of a line: plain strings, {it:'text'} for italic, {chip:true} for the live gradient pill, {fill:'text'} for gradient text.
  const build = (el, parts, step, from = 0) => {
    let i = 0;
    for (const p of parts) {
      let s;
      if (p && p.chip) { s = document.createElement('span'); s.className = 'dm-chip'; }
      else { s = document.createElement('span'); s.className = 'dm-w' + (p.it ? ' dm-it' : '') + (p.fill ? ' dm-fill' : ''); s.textContent = typeof p === 'string' ? p : p.it || p.fill || p.text; if (p.id) s.id = p.id; }
      if (i < from) { s.style.animation = p && p.chip ? 'dmFlow 2.4s linear infinite' : 'none'; s.style.opacity = '1'; s.style.filter = 'none'; s.style.transform = p && p.chip ? 'translateY(.06em)' : 'none'; i++; }
      else s.style.animationDelay = ((i++ - from) * step) + 'ms' + (p && p.chip ? ',0ms' : '');
      el.appendChild(s);
    }
  };
  window.__dm = {
    cursor(on) { document.getElementById('dm-cursor').classList.toggle('off', !on); },
    hand(on) { document.getElementById('dm-cursor').classList.toggle('is-hand', on); },
    ripple,
    clear(kind) { document.querySelectorAll(kind ? `[data-dm="${kind}"]` : '[data-dm]').forEach((n) => n.remove()); },
    // White title card with one animated line.
    card(parts, step = 90, from = 0) {
      let c = document.querySelector('[data-dm="card"]');
      if (!c) c = layer('card', 'dm-card');
      c.textContent = '';
      const line = document.createElement('div'); line.className = 'line'; build(line, parts, step, from); c.appendChild(line);
    },
    // Position of a word on the card, for the cursor.
    where(id) { const r = document.getElementById(id).getBoundingClientRect(); return [r.left + r.width * 0.55, r.top + r.height * 0.62]; },
    fill(id) { const w = document.getElementById(id); w.classList.add('dm-fill'); requestAnimationFrame(() => w.classList.add('dm-pop')); },
    // A bright gradient bursts out of (x, y) and the name snaps together out of scattered letters.
    flood(x, y, small, name) {
      const f = layer('flood', 'dm-flood'); f.style.setProperty('--x', x + 'px'); f.style.setProperty('--y', y + 'px');
      const box = document.createElement('div'); box.className = 'intro';
      const s = document.createElement('div'); s.className = 'small'; s.textContent = small;
      const n = document.createElement('div'); n.className = 'name';
      [...name].forEach((ch, i) => {
        const e = document.createElement('span'); e.className = 'dm-ch'; e.textContent = ch;
        e.style.setProperty('--dx', (Math.sin(i * 7.3) * 260) + 'px'); e.style.setProperty('--dy', (Math.cos(i * 5.1) * 180) + 'px'); e.style.setProperty('--r', (Math.sin(i * 3.7) * 70) + 'deg');
        e.style.animationDelay = (420 + i * 45) + 'ms';
        n.appendChild(e);
      });
      box.append(s, n); f.appendChild(box);
    },
    // Serif super over the app; top third by default, never in the bottom band.
    sup(text, opt = {}) {
      const l = layer('sup', 'dm-sup' + (opt.center ? ' center' : '') + (opt.dark ? ' dark' : '') + (opt.invert ? ' invert' : '') + (opt.scrim ? ' scrim' : ''));
      if (opt.size) l.style.setProperty('--size', opt.size + 'px');
      if (opt.top) l.style.setProperty('--top', opt.top);
      const t = document.createElement('div'); t.className = 't';
      build(t, text.split(' ').map((w) => (opt.italic ? { it: w } : w)), opt.step || 55);
      l.appendChild(t);
    },
    flash() { const f = layer('flash', 'dm-flash'); setTimeout(() => f.remove(), 200); },
    end(l1, l2, name) {
      const e = layer('end', 'dm-end');
      e.innerHTML = '<div><div class="l1"></div><div class="l2"></div><div class="logo"><i class="mark"></i><span></span></div></div>';
      build(e.querySelector('.l1'), l1.split(' '), 50);
      build(e.querySelector('.l2'), [{ fill: l2 }], 0);
      e.querySelector('.l2 .dm-w').style.animationDelay = '650ms, 0ms';
      e.querySelector('.logo span').textContent = name;
      document.getElementById('dm-cursor').classList.add('off');
    },
  };
})();
