// Kopieert alleen de bestanden die de app nodig heeft naar www/ (gebruikt voor GitHub Pages en de Android-app).
const fs = require('fs'), path = require('path');
const out = path.join(__dirname, '..', 'www');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
for (const f of ['index.html', 'style.css', 'character.js', 'game.js', 'manifest.webmanifest', 'sw.js']) fs.copyFileSync(path.join(__dirname, '..', f), path.join(out, f));
fs.cpSync(path.join(__dirname, '..', 'icons'), path.join(out, 'icons'), { recursive: true });
console.log('www/ klaar:', fs.readdirSync(out).join(', '));
