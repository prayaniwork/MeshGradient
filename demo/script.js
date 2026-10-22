// Storyboard for the Meshdraw film: "What if a gradient had a personality?"
// Each scene has a name, a playback speed and the actions to perform. Frames are shrunk a little after each zoom so
// the serif supers sit on the canvas above them, never over the artwork or in the bottom band. Edit words, order or speeds here and run record.js again to re-render.
const LOOKS = require('./looks.js');

const BASE_LOOK = { mode: 'freeform', bg: '#0A3FD6', power: 3.2, blur: 0, bands: 0, grain: 0.05, distort: 'none', amount: 0.5, scale: 0.5, flow: false, canvas: 'landscape', cw: 1920, ch: 1080 };
const frame = (L, extra = {}) => ({ name: L.name, look: { ...BASE_LOOK, ...L.look }, presetKey: 'glacier', customPalette: null, stops: L.stops || [], grid: null, warp: null, ...extra });
const MAKE_PALETTE = ['#F0141E', '#FF8C1A', '#2F7DB0', '#FFF4E2', '#FF3D8B', '#2D6BFF', '#FFE14D', '#FFFFFF'];
// Stills of every finished look for the showreel, taken before recording starts.
const SHOTS = [];

module.exports = {
  // "The Hip Hop" (audioknap) runs at about 95 BPM, so one bar is 2.525 s. Its sections all fall on that grid:
  // section A drops at 2.6 s, a breakdown starts at 43.0 s and its last bar (60.675 s) is a riser into the big drop
  // at 63.2 s (section B), and the outro starts at 103.6 s. The edit puts those moments on the film's marks.
  music: {
    file: 'assets/the-hip-hop.mp3', gain: 0.9, fade: 1.4,
    edit(m, total) {
      const BAR = 2.525, A = 2.6, BREAK = 43.0, RISER = 60.675, B = 63.2, OUTRO = 103.6;
      const riserAt = m.montage - BAR;
      // The riser plays under the cold open and section B drops on the logo burst; it runs until the last bar line
      // before "A gradient is fluid.", where the music drops out into the breakdown while the blocks melt.
      let melt = m.flood + Math.floor((m.fluid - m.flood) / BAR) * BAR;
      while (melt > riserAt - 0.3) melt -= BAR;
      // The riser again, so section A drops on the first personality cut; the outro takes over on the bar line nearest the end card.
      const outroAt = m.montage + Math.round((m.end - m.montage) / BAR) * BAR;
      return [
        { at: 0, src: B - m.flood },
        { at: melt, src: BREAK },
        { at: riserAt, src: RISER },
        { at: m.montage, src: A },
        { at: outroAt, src: OUTRO },
      ];
    },
  },
  // Steps through the ready-made frames with the UI hidden and keeps a still of each, then puts the app back.
  async setup(d, page) {
    await d.panel(false);
    await d.key('h');
    const r = d.frameRect(), clip = { x: r.x + 3, y: r.y + 3, width: r.w - 6, height: r.h - 6 };
    for (let i = 1; i < module.exports.seed.frames.length; i++) {
      await d.fit('PageDown', { shrink: false });
      await d.wait(650);
      SHOTS.push('data:image/jpeg;base64,' + (await page.screenshot({ type: 'jpeg', quality: 86, clip })).toString('base64'));
    }
    await d.dm('prep', SHOTS);
    await d.fit('PageDown', { shrink: false });
    await d.panel(true);
    await d.key('h');
    await d.fit('Shift+Digit2', { shrink: false });
    await d.wait(600);
  },
  seed: {
    frames: [frame(LOOKS.make, { customPalette: MAKE_PALETTE }), frame(LOOKS.blocks), ...LOOKS.montage.map((L) => frame(L))],
    active: 0, panelOpen: true, newColor: '#F0141E', app: {},
  },
  scenes: [
    {
      name: 'What if a gradient had a personality?',
      speed: 1,
      run: async (d) => {
        await d.dm('hand', true);
        await d.jump(1300, 900);
        await d.dm('card', ['What', 'if'], 90);
        await d.wait(650);
        await d.dm('card', ['What', 'if', 'a', 'gradient', { chip: true }], 90, 2);
        await d.wait(950);
        await d.dm('card', ['had', 'a', { it: 'personality?', id: 'pw' }], 80);
        await d.wait(380);
        const [x, y] = await d.dm('where', 'pw');
        await d.move(x, y, 380);
        await d.dm('ripple', x, y);
        await d.dm('fill', 'pw');
        await d.wait(420);
        d.mark('flood');
        await d.dm('flood', x, y, 'Introducing', 'Meshdraw');
        await d.wait(1750);
      },
    },
    {
      name: 'Make one',
      speed: 1.5,
      run: async (d) => {
        await d.dm('flash');
        await d.dm('clear', 'card'); await d.dm('clear', 'flood');
        await d.shrink();
        await d.dm('hand', false);
        const A = d.at(0.28, 0.32), B = d.at(0.72, 0.26), C = d.at(0.62, 0.74);
        await d.sup('Drop a point.');
        await d.dblclick(...A);
        await d.slider('#selSpread', 0.5);
        await d.key('Escape');
        await d.dblclick(...B);
        await d.clickEl('#palette button[data-c="#FF8C1A"]');
        await d.slider('#selSpread', 0.45);
        await d.key('Escape');
        await d.dblclick(...C);
        await d.clickEl('#palette button[data-c="#2F7DB0"]');
        await d.slider('#selSpread', 0.5);
        await d.key('Escape');
        await d.sup('Pull a handle.');
        await d.click(...A);
        const h = d.frameRect().h * 0.06;
        await d.dragLine([A[0] + h, A[1]], [A[0] + 230, A[1] + 120], 650);
        await d.key('Escape');
        await d.sup('Draw a path.');
        await d.clickEl('#palette button[data-c="#FFF4E2"]');
        await d.key('b');
        const pts = [];
        for (let i = 0; i <= 28; i++) { const t = i / 28; pts.push(d.at(0.1 + 0.8 * t, 0.55 + 0.12 * Math.sin(t * Math.PI * 2.2))); }
        await d.drag(pts, 900);
        await d.slider('#selSpread', 0.3);
        await d.key('v');
        await d.key('Escape');
        await d.sup('Spread it.');
        await d.click(...C);
        const r = 0.4 * d.frameRect().h * 0.5 + 9, ang = -0.8;
        await d.dragLine([C[0] + r * Math.cos(ang), C[1] + r * Math.sin(ang)], [C[0] + r * 1.55 * Math.cos(ang), C[1] + r * 1.55 * Math.sin(ang)], 600);
        await d.key('Escape');
        await d.wait(250);
      },
    },
    {
      name: 'Colour block vs gradient',
      speed: 1.35,
      run: async (d) => {
        await d.key('h');
        await d.fit('PageDown');
        await d.dm('flash');
        await d.sup('A colour block is loud.', { size: 116 });
        await d.wait(1100);
        await d.clickText('#inspector summary', 'Effects');
        await d.slider('#bands', 0, { drag: true, ms: 450 });
        await d.clickText('#inspector summary', 'Mesh');
        await d.slider('#power', 2.4, { drag: true, ms: 600 });
        d.mark('fluid');
        await d.sup('A gradient is fluid.', { size: 116, italic: true });
        await d.wait(1200);
      },
    },
    {
      name: 'Personalities',
      speed: 1,
      run: async (d) => {
        await d.dm('cursor', false);
        await d.panel(false);
        await d.dm('clear', 'sup');
        d.mark('montage');
        for (const L of LOOKS.montage) {
          await d.fit('PageDown');
          await d.dm('flash');
          await d.sup(L.word, { italic: true, size: 132 });
          await d.wait(960);
        }
      },
    },
    {
      name: 'Showreel',
      speed: 1,
      run: async (d) => {
        await d.dm('flash');
        await d.dm('clear', 'sup');
        await d.dm('reel', SHOTS, 'Every mood. One canvas.');
        await d.wait(2900);
      },
    },
    {
      name: 'Export',
      speed: 1.4,
      run: async (d) => {
        await d.fit('Shift+Digit2');
        await d.dm('flash');
        await d.dm('clear', 'reel');
        await d.dm('cursor', true);
        await d.clickEl('#exportBtn');
        await d.sup('Export it. Still or in motion.', { size: 100 });
        await d.clickText('#exportFormat button', 'GIF');
        await d.wait(1700);
        await d.clickText('#exportFormat button', 'MP4');
        await d.wait(900);
        await d.key('Escape');
      },
    },
    {
      name: 'End card',
      speed: 1,
      run: async (d) => {
        await d.dm('clear', 'sup');
        d.mark('end');
        await d.dm('end', 'Gradients have a personality.', 'Give yours one.', 'Meshdraw');
        await d.wait(3200);
      },
    },
  ],
};
