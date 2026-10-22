// Storyboard for the Meshdraw film "Gradients have a personality".
// Each scene has a name, a playback speed and the actions to perform. Edit the supers, order or speeds here and run
// record.js again to re-render. The painter shot is assets/painter.mp4 (generated with Gemini).
const LOOKS = require('./looks.js');

const BASE_LOOK = { mode: 'freeform', bg: '#0A3FD6', power: 3.2, blur: 0, bands: 0, grain: 0.05, distort: 'none', amount: 0.5, scale: 0.5, flow: false, canvas: 'landscape', cw: 1920, ch: 1080 };
const frame = (L, empty) => ({ name: L.name, look: { ...BASE_LOOK, ...L.look }, presetKey: 'glacier', customPalette: null, stops: empty ? [] : L.stops, grid: null, warp: null });

// The first frame starts empty and the golden-hour sky is drawn into it live; the rest are ready for the montage.
const SKY = LOOKS[0];
const MONTAGE = [
  { name: 'Liquid chrome', spec: 'Liquid · amount 100% · animated', colors: ['#F7F8FA', '#5E6573', '#0A0A0C'] },
  { name: 'Fluted glass', spec: 'Fluted · 15 ribs · animated', colors: ['#FF9E7A', '#B79CFF', '#6FC3FF', '#9FF0C8'] },
  { name: 'Bloom', spec: 'Circular · 4 segments · twist 32%', colors: ['#F1F2D8', '#1DB2F2', '#D8262A', '#3B060A'] },
  { name: 'Lollipop', spec: 'Swirl · amount 85%', colors: ['#FF4FA3', '#FFD23F', '#3EC6FF', '#7B61FF'] },
  { name: 'Neon dusk', spec: 'Ripple · grain 58%', colors: ['#3A0CA3', '#FF2E88', '#FFB347', '#00E5FF'] },
  { name: 'Aurora', spec: 'Liquid · blur 6% · animated', colors: ['#1DE9B6', '#64FFDA', '#7C4DFF', '#040814'] },
];

module.exports = {
  clip: 'assets/painter.mp4',
  audio: { until: 6.6, fade: 1.1, gain: 4 },
  seed: { frames: [frame(SKY, true), ...LOOKS.slice(1).map((L) => frame(L))], active: 0, panelOpen: true, newColor: '#F2A541', app: {} },
  scenes: [
    {
      name: 'The painter',
      speed: 1,
      run: async (d) => {
        await d.dm('cursor', false);
        await d.clip();
        await d.wait(900);
        await d.dm('serif', 'For centuries, the gradient lived on the brush.');
        await d.wait(4500);
      },
    },
    {
      name: 'The flip',
      speed: 1,
      run: async (d) => {
        await d.dm('wipe');
        await d.wait(700);
        await d.dm('big', ['Then the canvas changed.'], 'fluid', { scrim: true });
        await d.wait(1500);
        await d.dm('clear', 'big');
        const [x, y] = d.at(0.08, 0.72);
        await d.jump(x, y);
        await d.dm('morph', x, y);
        await d.dm('caption', 'The brush became a cursor.');
        await d.wait(1500);
      },
    },
    {
      name: 'The stroke continues',
      speed: 1.6,
      run: async (d) => {
        await d.clickEl('.tool[data-tool="pencil"]');
        await d.wait(150);
        const pts = [];
        for (let i = 0; i <= 30; i++) { const t = i / 30; pts.push(d.at(0.08 + 0.84 * t, 0.72 - 0.12 * Math.sin(t * Math.PI))); }
        await d.drag(pts, 1300);
        await d.wait(250);
        await d.slider('#selSpread', 0.3);
        await d.key('v');
      },
    },
    {
      name: 'The blend became a mesh',
      speed: 10,
      run: async (d) => {
        await d.dm('caption', 'The blend became a mesh.', '10× speed');
        for (const p of SKY.stops) {
          await d.key('Escape');
          await d.dblclick(...d.at(p.x, p.y));
          await d.wait(150);
          await d.setHex(p.color);
          await d.slider('#selSpread', p.spread);
          const stretch = Math.hypot(p.hx, p.hy) / 0.06;
          if (stretch > 1.05) await d.slider('#selStretch', stretch);
        }
        await d.key('Escape');
        await d.wait(500);
      },
    },
    {
      name: 'Block vs gradient',
      speed: 1.25,
      run: async (d) => {
        await d.dm('caption', '');
        await d.key('h');
        await d.clickText('#inspector summary', 'Effects');
        await d.wait(300);
        await d.slider('#bands', 4, { drag: true, ms: 500 });
        await d.dm('big', ['A colour block is', 'edgy. solid. loud.'], 'hard', { lineGap: 350 });
        await d.wait(1800);
        await d.dm('clear', 'big');
        await d.slider('#bands', 0, { drag: true, ms: 750 });
        await d.dm('big', ['A gradient is', 'fluid. easy.'], 'fluid', { lineGap: 420, grad: 1 });
        await d.wait(1650);
        await d.dm('big', ['It speaks tech.'], 'fluid', { scrim: true });
        await d.wait(1250);
        await d.dm('clear', 'big');
      },
    },
    {
      name: 'Go wild',
      speed: 1,
      run: async (d) => {
        await d.dm('cursor', false);
        await d.key('\\');
        await d.dm('big', ['Now give it a personality.'], 'fluid', { scrim: true });
        await d.wait(1300);
        await d.dm('clear', 'big');
        for (const m of MONTAGE) {
          await d.key('PageDown');
          await d.dm('chip', m.name, m.spec, m.colors);
          await d.wait(1250);
        }
        await d.dm('clear', 'chip');
      },
    },
    {
      name: 'One canvas',
      speed: 1,
      run: async (d) => {
        await d.key('Shift+Digit1');
        await d.dm('big', ['One canvas. Every mood.'], 'fluid', { scrim: true });
        await d.wait(2000);
        await d.dm('clear', 'big');
      },
    },
    {
      name: 'Export',
      speed: 1.8,
      run: async (d) => {
        await d.dm('cursor', true);
        await d.key('Shift+Digit2');
        await d.clickEl('#exportBtn');
        await d.wait(500);
        await d.clickText('#exportFormat button', 'GIF');
        await d.dm('caption', 'Export it. Still or in motion.');
        await d.wait(1700);
        await d.clickText('#exportFormat button', 'MP4');
        await d.wait(1300);
        await d.key('Escape');
        await d.dm('caption', '');
      },
    },
    {
      name: 'End card',
      speed: 1,
      run: async (d) => {
        await d.dm('end', 'Gradients have a personality.', 'Give yours one.', 'Meshdraw');
        await d.wait(3600);
      },
    },
  ],
};
