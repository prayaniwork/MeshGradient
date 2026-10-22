# Meshdraw for Figma

The Meshdraw editor in a Figma plugin window. It draws mesh gradients and puts them on the canvas, and it can reopen any gradient it made for editing.

## Install for development

1. Build the plugin window from the editor:

   ```bash
   node figma-plugin/build.js
   ```

2. In the Figma desktop app, choose **Plugins → Development → Import plugin from manifest…** and pick `figma-plugin/manifest.json`.

## Using it

- **Select a layer** (a frame, rectangle or other shape) and run **Meshdraw**. The editor opens a frame at that layer's size.
- **Add to Figma** (top right) puts the result on the canvas:

  | Format | What you get |
  |---|---|
  | PNG / JPG | An image fill on the layer. With no layer, a new rectangle. Up to 4096 px. |
  | SVG | Editable layers: rows of native Figma gradients masked into each other. Grain is left out. |
  | GIF | An animated image fill of the frame's distortion. |
  | MP4 | A video fill. Needs a Figma plan with video. |

- **Re-edit:** every layer Meshdraw makes stores its gradient. Select it and press **Edit gradient** in the right sidebar to reopen it.
- **AI prompts:** the sparkle beside a frame's name opens a prompt node. The plugin uses **Groq**:
  - The first time, paste your own Groq API key (from console.groq.com). It's saved in Figma's local storage on your computer only.
  - Only the Figma side of the plugin reads the key and calls Groq. The key is never stored in the editor window or in the file.
  - **Change key** in the prompt node removes it.
  - Groq's models here read text only, so an image node isn't sent.

## Files

- `manifest.json`: plugin settings: network access to Google Fonts, jsDelivr and Groq, and the "Edit gradient" button.
- `code.js`: runs inside Figma. It opens the window, keeps saved state in client storage, creates the layers, and calls Groq.
- `bridge.js`: runs in the plugin window before the editor. It handles storage, what to open, where renders go, and the AI provider.
- `build.js`: assembles `ui.html` from `../meshdraw.html` and `bridge.js`. Rebuild after changing the editor.
- `test/run.js`: an end-to-end test against a stand-in for Figma's API, in headless Chrome. It covers opening a layer, image fills, gradient layers, the key flow, a live Groq call (if a key is in `GROQ_API_KEY` or `../.env`) and re-editing.

## Before publishing to the Community

- Replace `"id": "meshdraw-dev"` in `manifest.json` with the id Figma assigns when you create the plugin.
- Each user brings their own Groq key. To offer AI without that, put your key behind a small server, such as a Cloudflare Worker, and call that instead. Never ship a key inside the plugin.
