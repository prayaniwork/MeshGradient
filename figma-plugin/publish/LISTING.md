# Figma Community listing: MeshGradient

Paste these into **Plugins → Development → right-click MeshGradient → Publish…**

## Images
- **Icon:** `icon.png` (128 × 128). `icon-512.png` is the large master.
- **Cover:** `cover.png` (1920 × 960)

## Name
MeshGradient

## Tagline
Draw mesh gradients with points and paths, add fluted, liquid and swirl effects, and make them move.

## Description
Draw gradients the way you draw shapes. Drop colour points, pull their handles, and sketch paths with the pen or pencil. MeshGradient blends everything into a smooth mesh gradient, live on the canvas.

**Give it a personality**
- Three mesh types: freeform, a classic grid mesh with Bézier handles, and radial glows
- Effects: fluted glass, liquid, swirl, ripple, circular bloom, colour bands, blur and grain, with optional animation
- A smudge brush that pushes colours around like wet paint
- Per-point blend modes, opacity and softness
- 12 starter scenes, plus a dice that rolls a fresh gradient whenever you need ideas

**Straight into Figma**
- Image fill on the selected layer, up to 4096 px, or a new layer
- Editable layers built from native Figma gradients
- Animated GIF fills and video fills (video needs a Figma plan with video)
- Every gradient remembers how it was made. Select the layer and press **Edit gradient** to change it.

**Describe it**
Open a prompt node beside any frame, write what you want ("electric lagoon at night, with a hot pink ribbon") and generate. The gradient comes back as normal points and paths, so you can keep editing. AI prompts use Groq with your own API key, which is stored on your computer only.

## Tags
gradient, mesh gradient, background, color, effects, animation, generative, ai

## Network access (shown to reviewers and users)
- **fonts.googleapis.com, fonts.gstatic.com:** the interface fonts
- **cdn.jsdelivr.net:** the open-source mp4-muxer library, loaded only when you export a video
- **api.groq.com:** AI prompts, sent with the user's own Groq API key, only when they press Generate

## Data and privacy answers
- **Collects personal data?** No. Nothing is sent to us.
- **Stores data?** Gradients are saved in the Figma file, on the layers the plugin makes. Editor preferences and the user's Groq key are saved in Figma's local plugin storage on their own computer.
- **Third-party services:** Groq receives only the text prompt (and a short description of the frame size) when the user presses Generate.
