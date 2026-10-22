// Builds the plugin window, ui.html, from the editor (../meshdraw.html) and bridge.js, so the plugin always runs the
// same editor as the web app. code.js swaps the /*MESHDRAW_INIT*/ marker for the launch data.
//
//   node figma-plugin/build.js
const fs = require('fs');
const path = require('path');

const here = __dirname;
const app = fs.readFileSync(path.join(here, '..', 'meshdraw.html'), 'utf8');
const bridge = fs.readFileSync(path.join(here, 'bridge.js'), 'utf8');
if (app.includes('/*MESHDRAW_INIT*/') || bridge.includes('</script')) throw new Error('Unexpected marker or closing script tag in the sources.');

const html = '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n'
  + '<script>/*MESHDRAW_INIT*/</script>\n<script>\n' + bridge + '</script>\n</head>\n<body style="margin:0">\n' + app + '\n</body>\n</html>\n';
fs.writeFileSync(path.join(here, 'ui.html'), html);
console.log(`ui.html written (${(html.length / 1024).toFixed(0)} KB)`);
