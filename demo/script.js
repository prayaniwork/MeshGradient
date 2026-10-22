// Storyboard for the Meshdraw demo video. Each scene has a caption, a playback speed and the actions to perform.
// Edit captions, order or speeds here and run record.js again to re-render.

// The "Bloom" artwork: a vertical strip of colors that the Circular distortion wraps into a radial burst.
// u runs across the frame (0 left, 1 right) and becomes the angle; v runs down (0 top, 1 bottom) and becomes the distance from the center.
const POINTS = [
  { u: 0.5, v: 0.04, hex: '#F1F2D8', spread: 0.5, stretch: 8, angle: 0 },
  { u: 0.12, v: 0.04, hex: '#F1F2D8', spread: 0.35 },
  { u: 0.88, v: 0.04, hex: '#F1F2D8', spread: 0.35 },
  { u: 0.5, v: 0.22, hex: '#3B060A', spread: 0.3, stretch: 3.5, angle: 90 },
  { u: 0.004, v: 0.26, hex: '#1DB2F2', spread: 0.26, stretch: 3.5, angle: 90 },
  { u: 0.996, v: 0.26, hex: '#1DB2F2', spread: 0.26, stretch: 3.5, angle: 90 },
  { u: 0.25, v: 0.28, hex: '#F7D7D5', spread: 0.4 },
  { u: 0.75, v: 0.28, hex: '#F7D7D5', spread: 0.4 },
  { u: 0.5, v: 0.48, hex: '#F7D7D5', spread: 0.5 },
  { u: 0.004, v: 0.5, hex: '#F7D7D5', spread: 0.4 },
  { u: 0.996, v: 0.5, hex: '#F7D7D5', spread: 0.4 },
  { u: 0.25, v: 0.72, hex: '#1DB2F2', spread: 0.5 },
  { u: 0.75, v: 0.72, hex: '#1DB2F2', spread: 0.5 },
  { u: 0.5, v: 0.84, hex: '#1DB2F2', spread: 0.5 },
  { u: 0.004, v: 0.64, hex: '#5A0B10', spread: 0.12, stretch: 4, angle: 90 },
  { u: 0.996, v: 0.64, hex: '#5A0B10', spread: 0.12, stretch: 4, angle: 90 },
  { u: 0.5, v: 0.996, hex: '#2E0306', spread: 0.35, stretch: 4, angle: 0 },
  { u: 0.1, v: 0.996, hex: '#2E0306', spread: 0.3 },
];

module.exports = [
  {
    caption: 'Meshdraw — draw with mesh gradients',
    speed: 1,
    run: async (d) => { await d.move(960, 560, 900); await d.wait(1500); },
  },
  {
    caption: 'Add a frame and start from scratch',
    speed: 1.6,
    run: async (d) => {
      await d.clickEl('#addFrameBtn');
      await d.wait(900);
      await d.clickText('#inspector summary', 'Starter scenes');
      await d.wait(500);
      await d.clickEl('#clearBtn');
      await d.wait(400);
      const r = d.frameRect();
      await d.dblclick(r.x + 18, r.y - 13);
      await d.wait(250);
      await d.type('Bloom');
      await d.key('Enter');
      await d.wait(500);
    },
  },
  {
    caption: 'Drop color points, then stretch and turn them',
    badge: '8× speed',
    speed: 8,
    run: async (d) => {
      await d.clickText('#inspector summary', 'Mesh');
      await d.wait(300);
      await d.slider('#power', 5);
      for (const p of POINTS) {
        await d.key('Escape');
        await d.dblclick(...d.at(p.u, p.v));
        await d.wait(150);
        await d.setHex(p.hex);
        await d.slider('#selSpread', p.spread);
        if (p.stretch) { await d.slider('#selStretch', p.stretch); await d.slider('#selAngle', p.angle); }
      }
      await d.key('Escape');
      await d.wait(400);
    },
  },
  {
    caption: 'Sketch a path with the pencil',
    speed: 2,
    run: async (d) => {
      await d.setHex('#D8262A');
      await d.clickEl('.tool[data-tool="pencil"]');
      await d.wait(300);
      const pts = [];
      for (let i = 0; i <= 24; i++) { const t = i / 24; pts.push(d.at(0.25 + 0.03 * Math.sin(t * Math.PI * 1.5), 0.26 + 0.6 * t)); }
      await d.drag(pts, 1100);
      await d.wait(300);
      await d.slider('#selSpread', 0.11);
      await d.key('v');
      await d.wait(500);
    },
  },
  {
    caption: 'Distort → Circular wraps the strip into a bloom',
    speed: 1,
    run: async (d) => {
      await d.key('Escape');
      await d.clickText('#inspector summary', 'Effects');
      await d.wait(500);
      await d.clickText('#distorts button', 'Circular');
      await d.wait(1600);
    },
  },
  {
    caption: 'Twist it, then add blur and grain',
    speed: 1.6,
    run: async (d) => {
      await d.slider('#amount', 0.05, { drag: true, ms: 900 });
      await d.slider('#amount', 0.32, { drag: true, ms: 900 });
      await d.slider('#blur', 0.05);
      await d.slider('#grain', 0.1);
      await d.wait(700);
    },
  },
  {
    caption: 'Animate it',
    speed: 1,
    run: async (d) => { await d.clickEl('#flowBtn'); await d.move(...d.at(0.5, 0.5), 600); await d.wait(1700); },
  },
  {
    caption: 'Light or dark',
    speed: 1.2,
    run: async (d) => { await d.clickEl('#themeBtn'); await d.wait(1100); await d.clickEl('#themeBtn'); await d.wait(500); },
  },
  {
    caption: 'Export PNG, JPG, PDF, SVG, CSS or HTML',
    speed: 1.4,
    run: async (d) => {
      await d.clickEl('#exportBtn');
      await d.wait(1500);
      await d.clickText('#exportFormat button', 'SVG');
      await d.wait(1400);
      await d.key('Escape');
      await d.wait(300);
    },
  },
  {
    caption: 'One canvas, many frames',
    speed: 1,
    run: async (d) => { await d.clickEl('#fitAll'); await d.wait(1800); await d.endCard('Meshdraw', 'Draw with mesh gradients'); await d.wait(1600); },
  },
];
