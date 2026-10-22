# Meshdraw

A mesh gradient drawing tool that runs in the browser. Everything lives in one file, `meshdraw.html`: plain HTML, CSS and JavaScript with WebGL 2 rendering and no build step.

## Features

- **Draw with color:** color points with handles, pen and pencil paths with editable anchors, and a reach circle on each point or anchor to set how far its color spreads.
- **Three mesh types:** Freeform (blend by distance), Grid (Coons-patch gradient mesh with Bézier handles) and Radial (layered glows).
- **Per-point blending:** blend mode, opacity and softness for every point or path.
- **Effects:** blur, color bands, grain, and Ripple, Swirl, Liquid, Circular and Fluted distortions, with optional animation.
- **Smudge brush** that pushes colors around like wet paint.
- **Multiple frames** on a zoomable, pannable canvas, with rename, duplicate and delete.
- **12 starter scenes.**
- **Reference images:** trace over them, pick colors or a palette from them, or turn one into a grid mesh.
- **Export** to PNG, JPG, PDF, SVG, CSS, HTML, GIF or MP4 (animated distortions), for one frame, a chosen set or all frames.
- **Light and dark mode** (dark by default) and liquid-glass panels.

## Running it

Open `meshdraw.html` in a recent Chrome, Safari, Firefox or Edge. WebGL 2 is required. To serve it locally:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000/meshdraw.html.

The file is written as a page fragment with no `<!doctype>` wrapper, so the hosted viewer can add its own. Browsers render it as it is.

## Demo film

`demo/` records "What if a gradient had a personality?", a film of about 40 seconds. A kinetic serif cold open leads into the reveal: "Introducing Meshdraw". Then it shows making a gradient (point, handle, path, spread), melts four colour blocks into a gradient, and cuts through seven looks, each with a personality: Electric, Bold, Romantic, Elegant, Dreamy, Cinematic and Futuristic. It moves through a perspective showreel of every look, and ends with export and the end card. Everything runs in the real app in headless Chrome. Supers, cursor and cuts are drawn in the page.

- `demo/script.js`: the storyboard. Edit supers, order and speeds here. The soundtrack is set with `music: { file, at, drop }`. The track's drop (`drop`, in seconds) is lined up with a moment the storyboard marks (`at`). Audio files live in `demo/assets/` and are not committed.
- `demo/looks.js`: the gradient looks used in the film.
- `demo/overlay.js`: supers, title cards, flash cuts and the end card.

```bash
cd demo && npm install && node record.js
```

This needs Google Chrome and ffmpeg. The film is written to `demo/meshdraw-demo.mp4`.
