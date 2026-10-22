// Storyboard for the Meshdraw film: "What if a gradient had a personality?"
// Each scene has a name, a playback speed and the actions to perform. Supers are serif and stay out of the bottom
// band. Edit words, order or speeds here and run record.js again to re-render.
const LOOKS = require('./looks.js');

const BASE_LOOK = { mode: 'freeform', bg: '#0A3FD6', power: 3.2, blur: 0, bands: 0, grain: 0.05, distort: 'none', amount: 0.5, scale: 0.5, flow: false, canvas: 'landscape', cw: 1920, ch: 1080 };
const frame = (L, extra = {}) => ({ name: L.name, look: { ...BASE_LOOK, ...L.look }, presetKey: 'glacier', customPalette: null, stops: L.stops || [], grid: null, warp: null, ...extra });
const MAKE_PALETTE = ['#F0141E', '#FF8C1A', '#2F7DB0', '#FFF4E2', '#FF3D8B', '#2D6BFF', '#FFE14D', '#FFFFFF'];
// Words that sit on light looks are set dark so they stay readable.
const LIGHT = new Set(['Romantic.', 'Dreamy.']);
const INVERT = new Set(['Elegant.']);

module.exports = {
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
        await d.dm('hand', false);
        const A = d.at(0.28, 0.32), B = d.at(0.72, 0.26), C = d.at(0.62, 0.74);
        await d.dm('sup', 'Drop a point.', { dark: true });
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
        await d.dm('sup', 'Pull a handle.', { dark: true });
        await d.click(...A);
        const h = d.frameRect().h * 0.06;
        await d.dragLine([A[0] + h, A[1]], [A[0] + 230, A[1] + 120], 650);
        await d.key('Escape');
        await d.dm('sup', 'Draw a path.', { dark: true });
        await d.clickEl('#palette button[data-c="#FFF4E2"]');
        await d.key('b');
        const pts = [];
        for (let i = 0; i <= 28; i++) { const t = i / 28; pts.push(d.at(0.1 + 0.8 * t, 0.55 + 0.12 * Math.sin(t * Math.PI * 2.2))); }
        await d.drag(pts, 900);
        await d.slider('#selSpread', 0.3);
        await d.key('v');
        await d.key('Escape');
        await d.dm('sup', 'Spread it.', { dark: true });
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
        await d.key('PageDown');
        await d.dm('flash');
        await d.dm('sup', 'A colour block is loud.', { dark: true, size: 120 });
        await d.wait(1100);
        await d.clickText('#inspector summary', 'Effects');
        await d.slider('#bands', 0, { drag: true, ms: 450 });
        await d.clickText('#inspector summary', 'Mesh');
        await d.slider('#power', 2.4, { drag: true, ms: 600 });
        await d.dm('sup', 'A gradient is fluid.', { dark: true, size: 120, italic: true });
        await d.wait(1200);
      },
    },
    {
      name: 'Personalities',
      speed: 1,
      run: async (d) => {
        await d.dm('cursor', false);
        await d.key('\\');
        await d.dm('clear', 'sup');
        for (const L of LOOKS.montage) {
          await d.key('PageDown');
          await d.dm('flash');
          await d.dm('sup', L.word, { center: true, italic: true, size: 190, dark: LIGHT.has(L.word), invert: INVERT.has(L.word) });
          await d.wait(1000);
        }
      },
    },
    {
      name: 'One canvas',
      speed: 1,
      run: async (d) => {
        await d.key('Shift+Digit1');
        await d.dm('flash');
        await d.dm('sup', 'Every mood. One canvas.', { size: 110, center: true, scrim: true });
        await d.wait(1600);
      },
    },
    {
      name: 'Export',
      speed: 1.4,
      run: async (d) => {
        await d.key('Shift+Digit2');
        await d.dm('flash');
        await d.dm('clear', 'sup');
        await d.dm('cursor', true);
        await d.clickEl('#exportBtn');
        await d.dm('sup', 'Export it. Still or in motion.', { size: 96, top: '12vh' });
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
        await d.dm('end', 'Gradients have a personality.', 'Give yours one.', 'Meshdraw');
        await d.wait(3200);
      },
    },
  ],
};
