// Gradient looks used in the film: bright, no round blobs. Each entry becomes one frame.
// Points: P(x, y, color, spread, stretch, angle°). Paths: PATH(color, spread, [[x, y], ...]) through the listed points.
const H0 = 0.06;
const P = (x, y, color, spread = 1, stretch = 1, deg = 0) => {
  const a = (deg * Math.PI) / 180;
  return { type: 'point', x, y, color, spread, hx: Math.cos(a) * H0 * stretch, hy: Math.sin(a) * H0 * stretch, blend: 'normal', opacity: 1, soft: 0.5 };
};
// Smooth path through the points (Catmull-Rom tangents turned into Bézier handles).
const PATH = (color, spread, pts) => ({
  type: 'path', color, spread, blend: 'normal', opacity: 1, soft: 0.5, closed: false,
  nodes: pts.map(([x, y], i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], tx = (b[0] - a[0]) / 6, ty = (b[1] - a[1]) / 6;
    return { x, y, ix: x - tx, iy: y - ty, ox: x + tx, oy: y + ty, type: 'smooth' };
  }),
});
// A loopy squiggle inside a box, like a thick marker scribble.
const squiggle = (x0, y0, w, h, loops, tilt = 0) => {
  const pts = [];
  for (let i = 0; i <= loops * 10; i++) {
    const t = i / (loops * 10), a = t * loops * Math.PI * 2;
    pts.push([x0 + w * (0.1 + 0.8 * t + 0.16 * Math.cos(a + tilt)), y0 + h * (0.5 + 0.4 * Math.sin(a + tilt))]);
  }
  return pts;
};

module.exports = {
  // The frame the "make one" scene draws into.
  make: { name: 'Make one', look: { power: 3.4, grain: 0.06, bg: '#FFF4E4' } },
  // Four flat colour blocks with marker squiggles, set hard with Bands; the film melts them into a gradient.
  blocks: {
    name: 'Colour block', look: { power: 7, grain: 0, bands: 3, bg: '#FFD93B' },
    stops: [
      P(0.25, 0.25, '#FFD93B', 0.6), P(0.75, 0.25, '#FFB3F0', 0.6), P(0.25, 0.75, '#22D3EE', 0.6), P(0.75, 0.75, '#A3F75B', 0.6),
      PATH('#FF5A1F', 0.1, squiggle(0.06, 0.06, 0.36, 0.38, 3, 0.4)),
      PATH('#F0002C', 0.1, squiggle(0.56, 0.06, 0.36, 0.38, 2, 1.6)),
      PATH('#4A1AB0', 0.1, squiggle(0.06, 0.56, 0.36, 0.38, 3, 2.4)),
      PATH('#0F5040', 0.1, squiggle(0.56, 0.56, 0.36, 0.38, 4, 0.9)),
    ],
  },
  montage: [
    { word: 'Electric.', name: 'Fluted glass', look: { power: 4.2, grain: 0.06, distort: 'fluted', amount: 0.9, scale: 0.55, flow: true, bg: '#F59BEA' }, stops: [
      P(0.1, 0.2, '#FF7A59', 0.35, 4, 70), P(0.45, 0.15, '#E58BFF', 0.4), P(0.85, 0.2, '#FFA2D6', 0.4),
      P(0.3, 0.45, '#2D6BFF', 0.3, 6, 35), P(0.65, 0.55, '#1E4BFF', 0.3, 6, -30), P(0.15, 0.75, '#3B2BD9', 0.3, 5, 60),
      P(0.5, 0.85, '#FF8A6B', 0.35, 4, 80), P(0.9, 0.8, '#C77DFF', 0.4),
    ] },
    { word: 'Bold.', name: 'Thermal', look: { power: 3.6, grain: 0.1, distort: 'liquid', amount: 0.55, scale: 0.3, flow: true, bg: '#FBE7C6' }, stops: [
      P(0.25, 0.25, '#F0141E', 0.35, 4, 15), P(0.6, 0.15, '#FF8C1A', 0.35, 3, 0), P(0.85, 0.35, '#FFF1D6', 0.3),
      P(0.75, 0.65, '#2F7DB0', 0.4, 3, -40), P(0.15, 0.6, '#2F7DB0', 0.25, 3, 80), P(0.35, 0.85, '#F07A1A', 0.35, 3, 0),
      P(0.45, 0.5, '#FFF4E2', 0.3, 5, -30),
    ] },
    { word: 'Romantic.', name: 'Sakura rings', look: { mode: 'radial', power: 2.2, grain: 0.03, bands: 8, bg: '#FBE3F3' }, stops: [
      P(0.5, 0.5, '#FF9BE6', 1.6), P(0.5, 0.5, '#FF3D8B', 0.95), P(0.5, 0.5, '#D0005A', 0.55), P(0.5, 0.5, '#5A0030', 0.25),
    ] },
    { word: 'Elegant.', name: 'Ink', look: { power: 5.5, grain: 0.02, distort: 'liquid', amount: 0.6, scale: 0.25, flow: true, bg: '#FFFFFF' }, stops: [
      P(0.1, 0.1, '#FFFFFF', 0.5), P(0.9, 0.9, '#FFFFFF', 0.5), P(0.9, 0.12, '#FFFFFF', 0.4), P(0.08, 0.85, '#FFFFFF', 0.4),
      PATH('#0B0B14', 0.13, [[0.2, 1.0], [0.38, 0.72], [0.42, 0.45], [0.5, 0.3], [0.62, 0.22]]),
      PATH('#2B2BFF', 0.1, [[0.15, 0.2], [0.3, 0.32], [0.45, 0.3], [0.62, 0.2], [0.8, 0.16]]),
      PATH('#E0102A', 0.08, [[0.48, 0.55], [0.6, 0.62], [0.72, 0.75], [0.9, 0.9]]),
    ] },
    { word: 'Dreamy.', name: 'Pastel grain', look: { power: 2.8, grain: 0.13, bg: '#FFF6EC' }, stops: [
      P(0.2, 0.04, '#FFE14D', 0.45, 6, 0), P(0.8, 0.06, '#FF8FC2', 0.45, 6, 0), P(0.5, 0.42, '#FFF7F0', 0.4, 9, 0),
      P(0.3, 0.7, '#FFC2DA', 0.3, 8, 0), P(0.15, 0.96, '#3E8BFF', 0.45, 6, 0), P(0.75, 0.96, '#6FB2FF', 0.4, 6, 0),
    ] },
    { word: 'Cinematic.', name: 'Horizon', look: { power: 5, grain: 0.08, bg: '#7C72F4' }, stops: [
      P(0.03, 0.25, '#2E1FE6', 0.35, 7, 90), P(0.55, 0.22, '#C9C5F7', 0.55, 6, 0), P(0.4, 0.45, '#8F86F0', 0.35, 8, 0),
      P(0.15, 0.85, '#FF8A00', 0.45, 7, 0), P(0.75, 0.78, '#E85A00', 0.35, 8, 0), P(0.85, 0.98, '#B83A00', 0.35, 6, 0), P(0.5, 0.6, '#FFC98A', 0.09, 14, 0),
    ] },
    { word: 'Futuristic.', name: 'Light beam', look: { power: 3.4, grain: 0.05, distort: 'fluted', amount: 0.55, scale: 0.85, flow: true, bg: '#1B3FD8' }, stops: [
      P(0.5, 0.0, '#1B3FD8', 0.6, 8, 0), P(0.5, 0.38, '#2FB7FF', 0.3, 3, 90), P(0.5, 0.58, '#F2F6FF', 0.25, 3, 90),
      P(0.2, 0.9, '#FF4A5C', 0.45, 3, 0), P(0.8, 0.9, '#FF4A5C', 0.45, 3, 0), P(0.5, 0.78, '#FF8C9A', 0.25, 3, 90), P(0.1, 0.3, '#2448E0', 0.4), P(0.9, 0.3, '#2448E0', 0.4),
    ] },
  ],
};
