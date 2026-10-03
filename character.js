'use strict';
// Poppetje-maker: opties, kleurenpaletten en de tekenroutine (zijaanzicht, kijkt naar rechts).

const OPT = {
  gender: [['m', 'Man'], ['f', 'Vrouw']],
  height: [['short', 'Klein'], ['normal', 'Gemiddeld'], ['tall', 'Lang']],
  build: [['slim', 'Slank'], ['normal', 'Normaal'], ['broad', 'Breed']],
  style: [['bald', 'Kaal'], ['buzz', 'Stoppels'], ['short', 'Kort'], ['quiff', 'Kuif'], ['curly', 'Krullen'], ['afro', 'Afro'],
    ['long', 'Lang haar'], ['bob', 'Bob'], ['ponytail', 'Paardenstaart'], ['bun', 'Knot'], ['braid', 'Vlecht'], ['mohawk', 'Hanenkam']],
  beard: [['none', 'Geen'], ['stubble', 'Stoppelbaard'], ['moustache', 'Snor'], ['beard', 'Volle baard']],
  glasses: [['none', 'Geen'], ['round', 'Ronde bril'], ['square', 'Vierkante bril'], ['sun', 'Zonnebril']],
  top: [['tshirt', 'T-shirt'], ['long', 'Trui / lange mouw'], ['hoodie', 'Hoodie'], ['blazer', 'Colbert'], ['tank', 'Hemdje'], ['dress', 'Jurk']],
  posture: [['upright', 'Kaarsrecht'], ['normal', 'Normaal'], ['slouch', 'Voorovergebogen']],
  bottom: [['jeans', 'Jeans'], ['chinos', 'Nette broek'], ['shorts', 'Korte broek'], ['skirt', 'Rok']],
  drink: [['beer', 'Bier 🍺'], ['wine', 'Wijn 🍷'], ['cocktail', 'Cocktail 🍹']],
  hat: [['none', 'Geen'], ['cap', 'Pet'], ['beanie', 'Muts'], ['top', 'Hoge hoed']]
};
const SKIN = ['#fbe2cf', '#f3cfae', '#e6b48c', '#cf9a6b', '#b27846', '#8a5836', '#6a4028', '#47291a'];
const HAIR = ['#0e0a08', '#2a1a10', '#4a2e1a', '#7a4a24', '#a9702f', '#d6a84f', '#ebd48e', '#b5481f', '#8c8c8c', '#e9e9e9', '#3b6ea5', '#d6459f'];
const EYES = ['#3b2414', '#7a5a2a', '#4a8a55', '#3b78a8', '#7d9bb0', '#555555'];

// Vaste kledingopties per kledingstuk: [naam, kleur, stof]. Kleur en stof horen bij elkaar, zodat het altijd realistisch oogt.
const CLOTH = {
  tshirt: [['Wit', '#f2f0ea', 'jersey'], ['Zwart', '#23232a', 'jersey'], ['Marineblauw', '#243b6b', 'jersey'], ['Koningsblauw', '#2f6fd0', 'jersey'], ['Rood', '#b8323a', 'jersey'], ['Grijs gemêleerd', '#9aa0a8', 'melange'], ['Bosgroen', '#2f6b4f', 'jersey'], ['Mosterdgeel', '#d9a62e', 'jersey'], ['Breton (wit-marine)', '#f2f0ea', 'stripe'], ['Zwart-wit gestreept', '#23232a', 'stripe']],
  long: [['Crème', '#e8dcc2', 'knit'], ['Grijs', '#8d9097', 'knit'], ['Marineblauw', '#243b6b', 'knit'], ['Bordeaux', '#6e1f2e', 'knit'], ['Bosgroen', '#2f6b4f', 'knit'], ['Mosterdgeel', '#d9a62e', 'knit'], ['Rood', '#b8323a', 'knit'], ['Zwart', '#23232a', 'knit']],
  hoodie: [['Grijs gemêleerd', '#9aa0a8', 'fleece'], ['Zwart', '#23232a', 'fleece'], ['Marineblauw', '#243b6b', 'fleece'], ['Bordeaux', '#6e1f2e', 'fleece'], ['Bosgroen', '#2f6b4f', 'fleece'], ['Oudroze', '#c77d92', 'fleece'], ['Crème', '#e8dcc2', 'fleece']],
  blazer: [['Antraciet krijtstreep', '#3c3f46', 'wool'], ['Marine krijtstreep', '#243b6b', 'wool'], ['Zwart', '#1d1d21', 'woolplain'], ['Lichtgrijs', '#8d9097', 'woolplain'], ['Bruin tweed', '#7a5a3a', 'tweed'], ['Groen tweed', '#4a5a3c', 'tweed']],
  tank: [['Wit', '#f2f0ea', 'jersey'], ['Zwart', '#23232a', 'jersey'], ['Rood', '#b8323a', 'jersey'], ['Roze', '#e07b9a', 'jersey'], ['Lichtblauw', '#8ab4e0', 'jersey'], ['Mosterdgeel', '#d9a62e', 'jersey']],
  dress: [['Zwart', '#23232a', 'jersey'], ['Bordeaux', '#6e1f2e', 'jersey'], ['Marineblauw', '#243b6b', 'jersey'], ['Bosgroen', '#2f6b4f', 'jersey'], ['Rood', '#b8323a', 'jersey'], ['Gebloemd', '#efe3d2', 'floral'], ['Zomergeel', '#e6b83a', 'jersey']],
  jeans: [['Raw denim', '#25365a', 'denim'], ['Klassiek blauw', '#3f5f95', 'denim'], ['Stonewash', '#6f8fbf', 'denimwash'], ['Bleek blauw', '#9bb5d6', 'denimwash'], ['Zwart', '#25252a', 'denim'], ['Grijs', '#6b7078', 'denim']],
  chinos: [['Beige', '#c8b48d', 'chino'], ['Khaki', '#9c8a5a', 'chino'], ['Olijf', '#59623a', 'chino'], ['Marineblauw', '#2b3a55', 'chino'], ['Antraciet', '#3b3f47', 'chino'], ['Camel', '#a2683a', 'chino'], ['Pak grijs', '#4a4e57', 'woolplain'], ['Pak zwart', '#1d1d21', 'woolplain']],
  shorts: [['Denim', '#5b7fb5', 'denim'], ['Khaki', '#b3a070', 'chino'], ['Marineblauw', '#2b3a55', 'chino'], ['Olijf', '#59623a', 'chino'], ['Grijs sweat', '#8a8f98', 'jersey'], ['Zwart', '#1c1c20', 'chino']],
  skirt: [['Zwart', '#1d1d21', 'woolplain'], ['Marineblauw', '#243b6b', 'woolplain'], ['Bordeaux', '#6e1f2e', 'woolplain'], ['Grijs', '#8d9097', 'woolplain'], ['Beige', '#c8b48d', 'chino'], ['Denim', '#5b7fb5', 'denim'], ['Rood ruit', '#a3262f', 'plaid'], ['Groen ruit', '#2f5b45', 'plaid']]
};
function clothOf(f, part) { return CLOTH[f[part]] || null; }
function rgbOf(h) {
  if (h[0] === 'r') return h.match(/\d+/g).slice(0, 3).map(Number);
  if (h.length === 4) h = '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3];
  const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255];
}
// Zet kleur en stof op de dichtstbijzijnde vaste optie (voor oude poppetjes en bij het wisselen van kledingstuk).
function snapCloth(o) {
  for (const [t, c, fb] of [['top', 'topColor', 'topFab'], ['bottom', 'bottomColor', 'bottomFab']]) {
    const list = CLOTH[o[t]]; if (!list || list.some(x => x[1] === o[c] && x[2] === o[fb])) continue;
    let col; try { col = rgbOf(/^#[0-9a-f]{6}$/i.test(o[c]) ? o[c] : '#888888'); } catch (e) { col = [136, 136, 136]; }
    let best = list[0], bd = 1e9;
    for (const x of list) { const r = rgbOf(x[1]), d = (r[0] - col[0]) ** 2 + (r[1] - col[1]) ** 2 + (r[2] - col[2]) ** 2 - (x[2] === o[fb] ? 900 : 0); if (d < bd) { bd = d; best = x; } }
    o[c] = best[1]; o[fb] = best[2];
  }
  return o;
}

const BLANK = {
  name: '', drink: 'beer', gender: 'm', height: 'normal', build: 'normal', skin: SKIN[2], eyes: EYES[0],
  style: 'short', hair: HAIR[2], beard: 'none', glasses: 'none',
  top: 'tshirt', topColor: '#2f6fd0', topFab: 'jersey', bottom: 'jeans', bottomColor: '#3f5f95', bottomFab: 'denim', shoes: '#f1f1f1', hat: 'none',
  face: '', posture: 'normal', hump: 0, chest: 50, belly: 50, butt: 50 // houding, bochel (0-100), borst/buik/billen (50 = gemiddeld)
};
// Oude opgeslagen vrienden omzetten naar het nieuwe formaat.
function normalize(f) {
  const o = Object.assign({}, BLANK, f);
  if (f.shirt && !f.topColor) o.topColor = f.shirt;
  if (f.pants && !f.bottomColor) o.bottomColor = f.pants;
  o.glasses = f.glasses === true ? 'round' : (!f.glasses || f.glasses === false ? 'none' : f.glasses);
  if (o.style === 'spiky') o.style = 'quiff';
  for (const k of ['hump', 'chest', 'belly', 'butt']) { o[k] = Number(o[k]); if (isNaN(o[k])) o[k] = BLANK[k]; }
  return snapCloth(o);
}

/* ---------- hulpfuncties ---------- */
const FACE_CACHE = {}; // gezichtsfoto's (data-URL) als Image, zodat ze maar één keer geladen worden
function faceImage(src) { let i = FACE_CACHE[src]; if (!i) { i = FACE_CACHE[src] = new Image(); i.src = src; } return i; }
function shade(hex, k) {
  let [r, g, b] = rgbOf(hex);
  if (k <= 1) { r *= k; g *= k; b *= k; } else { const a = k - 1; r += (255 - r) * a; g += (255 - g) * a; b += (255 - b) * a; }
  return `rgb(${Math.round(Math.min(255, r))},${Math.round(Math.min(255, g))},${Math.round(Math.min(255, b))})`;
}
function limb(c, x1, y1, x2, y2, r1, r2, fill) {
  const a = Math.atan2(y2 - y1, x2 - x1), nx = Math.cos(a + Math.PI / 2), ny = Math.sin(a + Math.PI / 2);
  c.fillStyle = fill;
  c.beginPath(); c.moveTo(x1 + nx * r1, y1 + ny * r1); c.lineTo(x2 + nx * r2, y2 + ny * r2);
  c.lineTo(x2 - nx * r2, y2 - ny * r2); c.lineTo(x1 - nx * r1, y1 - ny * r1); c.closePath(); c.fill();
  c.beginPath(); c.arc(x1, y1, r1, 0, 7); c.arc(x2, y2, r2, 0, 7); c.fill();
  if (typeof fill === 'string') volume(c, x1, y1, x2, y2, r1, r2);
}
// cilindrische belichting: licht van linksboven, schaduwrand aan de andere kant
function volume(c, x1, y1, x2, y2, r1, r2) {
  const a = Math.atan2(y2 - y1, x2 - x1); let nx = Math.cos(a + Math.PI / 2), ny = Math.sin(a + Math.PI / 2);
  if (nx * 0.5 - ny * 0.85 < 0) { nx = -nx; ny = -ny; }
  const sx1 = x1 + (x2 - x1) * 0.12, sy1 = y1 + (y2 - y1) * 0.12, sx2 = x2 - (x2 - x1) * 0.12, sy2 = y2 - (y2 - y1) * 0.12;
  c.save(); c.lineCap = 'round';
  c.globalAlpha = 0.11; c.strokeStyle = "#fff"; c.lineWidth = (r1 + r2) * 0.3; c.beginPath(); c.moveTo(sx1 + nx * r1 * 0.38, sy1 + ny * r1 * 0.38); c.lineTo(sx2 + nx * r2 * 0.38, sy2 + ny * r2 * 0.38); c.stroke();
  c.globalAlpha = 0.11; c.strokeStyle = "#000"; c.lineWidth = (r1 + r2) * 0.34; c.beginPath(); c.moveTo(sx1 - nx * r1 * 0.78, sy1 - ny * r1 * 0.78); c.lineTo(sx2 - nx * r2 * 0.78, sy2 - ny * r2 * 0.78); c.stroke();
  c.restore();
}
const FAB_CACHE = {};
// Stofpatronen: echte structuur voor denim, jersey, tricot, fleece, wol en katoen
function fabric(kind, color) {
  const key = kind + color; if (FAB_CACHE[key]) return FAB_CACHE[key];
  const cv = document.createElement('canvas'); cv.width = cv.height = 16; const g = cv.getContext('2d');
  g.fillStyle = color; g.fillRect(0, 0, 16, 16);
  const lt = shade(color, 1.2), dk = shade(color, 0.78);
  if (kind === 'denim') { // keperstof met diagonale draden en gesprenkelde vezels
    g.strokeStyle = lt; g.globalAlpha = 0.38; g.lineWidth = 1; for (let i = -16; i < 32; i += 3) { g.beginPath(); g.moveTo(i, 16); g.lineTo(i + 16, 0); g.stroke(); }
    g.strokeStyle = dk; g.globalAlpha = 0.28; for (let i = -16; i < 32; i += 6) { g.beginPath(); g.moveTo(i + 1.5, 16); g.lineTo(i + 17.5, 0); g.stroke(); }
    g.globalAlpha = 0.35; for (let i = 0; i < 12; i++) { g.fillStyle = i % 2 ? lt : dk; g.fillRect((i * 7) % 16, (i * 11) % 16, 1, 1); }
  } else if (kind === 'jersey') { // tricot-katoen met fijne verticale lijntjes
    g.strokeStyle = dk; g.globalAlpha = 0.2; for (let x = 0; x < 16; x += 2) { g.beginPath(); g.moveTo(x + 0.5, 0); g.lineTo(x + 0.5, 16); g.stroke(); }
  } else if (kind === 'knit') { // gebreide trui: rijtjes V's
    g.lineWidth = 1; for (let y = 0; y < 16; y += 4) for (let x = 0; x < 16; x += 4) {
      g.globalAlpha = 0.4; g.strokeStyle = dk; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 2, y + 3); g.lineTo(x + 4, y); g.stroke();
      g.globalAlpha = 0.28; g.strokeStyle = lt; g.beginPath(); g.moveTo(x, y + 1); g.lineTo(x + 2, y + 4); g.lineTo(x + 4, y + 1); g.stroke();
    }
  } else if (kind === 'fleece') { // zachte fleece: wolkjes
    for (let i = 0; i < 26; i++) { g.globalAlpha = 0.3; g.fillStyle = i % 2 ? lt : dk; g.beginPath(); g.arc((i * 5.3) % 16, (i * 7.7) % 16, 1.1, 0, 7); g.fill(); }
  } else if (kind === 'wool') { // colbertstof met krijtstreep
    g.globalAlpha = 0.4; g.strokeStyle = lt; g.lineWidth = 0.8; g.beginPath(); g.moveTo(4.5, 0); g.lineTo(4.5, 16); g.moveTo(12.5, 0); g.lineTo(12.5, 16); g.stroke();
    g.globalAlpha = 0.12; g.strokeStyle = dk; for (let i = -16; i < 32; i += 2) { g.beginPath(); g.moveTo(i, 16); g.lineTo(i + 16, 0); g.stroke(); }
  } else if (kind === 'denimwash') { // verwassen denim: lichter, met zichtbare vezels
    g.strokeStyle = lt; g.globalAlpha = 0.45; g.lineWidth = 1; for (let i = -16; i < 32; i += 3) { g.beginPath(); g.moveTo(i, 16); g.lineTo(i + 16, 0); g.stroke(); }
    g.strokeStyle = dk; g.globalAlpha = 0.22; for (let i = -16; i < 32; i += 5) { g.beginPath(); g.moveTo(i + 1.5, 16); g.lineTo(i + 17.5, 0); g.stroke(); }
    g.globalAlpha = 0.5; for (let i = 0; i < 16; i++) { g.fillStyle = i % 3 ? lt : dk; g.fillRect((i * 7) % 16, (i * 11) % 16, 1, 1); }
  } else if (kind === 'melange') { // gemêleerd katoen: gespikkeld
    g.strokeStyle = dk; g.globalAlpha = 0.12; for (let x = 0; x < 16; x += 2) { g.beginPath(); g.moveTo(x + 0.5, 0); g.lineTo(x + 0.5, 16); g.stroke(); }
    g.globalAlpha = 0.4; for (let i = 0; i < 40; i++) { g.fillStyle = i % 2 ? lt : dk; g.fillRect((i * 7) % 16, (i * 5 + (i >> 2)) % 16, 1, 1); }
  } else if (kind === 'stripe') { // horizontale streep (donkere basis: lichte streep, lichte basis: marine streep)
    const light = rgbOf(color)[0] > 140;
    g.fillStyle = light ? '#243b6b' : '#f2f0ea'; g.globalAlpha = 1; g.fillRect(0, 5, 16, 5);
    g.strokeStyle = dk; g.globalAlpha = 0.15; for (let x = 0; x < 16; x += 2) { g.beginPath(); g.moveTo(x + 0.5, 0); g.lineTo(x + 0.5, 16); g.stroke(); }
  } else if (kind === 'woolplain') { // effen pak/rokstof: fijne keper
    g.globalAlpha = 0.14; g.strokeStyle = lt; for (let i = -16; i < 32; i += 2) { g.beginPath(); g.moveTo(i, 16); g.lineTo(i + 16, 0); g.stroke(); }
    g.globalAlpha = 0.1; g.strokeStyle = dk; for (let i = -15; i < 32; i += 4) { g.beginPath(); g.moveTo(i, 16); g.lineTo(i + 16, 0); g.stroke(); }
  } else if (kind === 'tweed') { // tweed: veelkleurige spikkels
    g.globalAlpha = 0.5; for (let i = 0; i < 46; i++) { g.fillStyle = ['#d8cdb8', '#2b2118', lt, dk][i % 4]; g.fillRect((i * 7) % 16, (i * 13 + (i >> 1)) % 16, 1, 1); }
    g.globalAlpha = 0.12; g.strokeStyle = lt; for (let i = -16; i < 32; i += 2) { g.beginPath(); g.moveTo(i, 16); g.lineTo(i + 16, 0); g.stroke(); }
  } else if (kind === 'plaid') { // ruitjesstof
    g.globalAlpha = 0.45; g.fillStyle = dk; g.fillRect(0, 3, 16, 4); g.fillRect(3, 0, 4, 16);
    g.globalAlpha = 0.7; g.fillStyle = '#f2e8cf'; g.fillRect(0, 11, 16, 1); g.fillRect(11, 0, 1, 16);
    g.globalAlpha = 0.18; g.strokeStyle = lt; for (let i = -16; i < 32; i += 2) { g.beginPath(); g.moveTo(i, 16); g.lineTo(i + 16, 0); g.stroke(); }
  } else if (kind === 'floral') { // bloemenprint op crème
    g.globalAlpha = 1; const fl = [[3, 3, '#c0455a'], [11, 8, '#d9772e'], [5, 12, '#c0455a'], [13, 1, '#8aa05a']];
    for (const [x, y, cc] of fl) { g.fillStyle = cc; for (let a = 0; a < 5; a++) { g.beginPath(); g.arc(x + Math.cos(a * 1.257) * 1.5, y + Math.sin(a * 1.257) * 1.5, 1.1, 0, 7); g.fill(); } g.fillStyle = '#f2d36b'; g.beginPath(); g.arc(x, y, 0.8, 0, 7); g.fill(); }
  } else { // katoen (chino)
    g.globalAlpha = 0.14; g.strokeStyle = lt; for (let i = -16; i < 32; i += 2) { g.beginPath(); g.moveTo(i, 16); g.lineTo(i + 16, 0); g.stroke(); }
    g.globalAlpha = 0.1; for (let i = 0; i < 10; i++) { g.fillStyle = dk; g.fillRect((i * 5) % 16, (i * 9) % 16, 1, 1); }
  }
  return (FAB_CACHE[key] = g.createPattern(cv, 'repeat'));
}
// gestikt naadje langs een been of mouw (aan de voorkant)
function seam(c, x1, y1, x2, y2, off, col) {
  const a = Math.atan2(y2 - y1, x2 - x1); let nx = Math.cos(a + Math.PI / 2), ny = Math.sin(a + Math.PI / 2); if (nx < 0) { nx = -nx; ny = -ny; }
  c.save(); c.strokeStyle = col; c.lineWidth = 0.8; c.setLineDash([1.6, 1.3]); c.beginPath(); c.moveTo(x1 + nx * off, y1 + ny * off); c.lineTo(x2 + nx * off, y2 + ny * off); c.stroke(); c.restore();
}
// zoomlijntje dwars over een been of mouw
function hem(c, x, y, ang, r, col) {
  c.save(); c.strokeStyle = col; c.lineWidth = 0.9; c.beginPath();
  c.moveTo(x + Math.cos(ang + Math.PI / 2) * r, y + Math.sin(ang + Math.PI / 2) * r); c.lineTo(x - Math.cos(ang + Math.PI / 2) * r, y - Math.sin(ang + Math.PI / 2) * r); c.stroke(); c.restore();
}
function ell(c, x, y, rx, ry, fill, rot = 0) { c.fillStyle = fill; c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, 7); c.fill(); }

/* ---------- houdingen ---------- */
// Hoeken in radialen vanaf "recht naar beneden", positief = naar voren (rechts).
function poseJoints(pose, ph) {
  const J = { hx: 0, hy: -50, lean: 0.05, legs: [], arms: [], tilt: 0 };
  if (pose === 'run') {
    J.hy = -50 - Math.abs(Math.cos(ph)) * 2.5; J.lean = 0.15;
    for (let i = 0; i < 2; i++) {
      const p = ph + i * Math.PI;
      J.legs.push({ a: 0.85 * Math.sin(p), k: 0.12 + 1.15 * Math.max(0, Math.cos(p - 0.3)) });
      J.arms.push({ a: -0.95 * Math.sin(p), e: 1.2 + 0.25 * Math.cos(p) });
    }
  } else if (pose === 'duck') {
    J.hy = -26 + Math.sin(ph * 2) * 0.8; J.lean = 0.95; J.tilt = -0.4;
    J.legs = [{ a: 1.25, k: 2.0 }, { a: 0.9, k: 1.9 }]; J.arms = [{ a: 0.9, e: 0.9 }, { a: 0.5, e: 1.0 }];
  } else if (pose === 'jump') {
    J.lean = 0.1; J.legs = [{ a: 0.9, k: 1.3 }, { a: -0.5, k: 1.1 }]; J.arms = [{ a: 2.2, e: 0.3 }, { a: -1.2, e: 0.4 }];
  } else if (pose === 'cheer') {
    J.lean = -0.04; J.legs = [{ a: 0.15, k: 0.1 }, { a: -0.15, k: 0.1 }]; J.arms = [{ a: 2.9, e: 0.2 }, { a: 2.5, e: 0.3 }]; J.tilt = -0.15;
  } else if (pose === 'faint') {
    J.lean = 0; J.legs = [{ a: 0.5, k: 0.2 }, { a: -0.35, k: 0.1 }]; J.arms = [{ a: 1.9, e: 0.2 }, { a: -1.6, e: 0.3 }];
  } else { // idle
    J.legs = [{ a: 0.04, k: 0 }, { a: -0.04, k: 0 }]; J.arms = [{ a: 0.08, e: 0.15 }, { a: -0.05, e: 0.1 }];
  }
  return J;
}

/* ---------- tekenen: cartoon-stijl (groot hoofd, dikke omlijning, gladde kleurvlakken) ---------- */
const OUT = '#3a2216';
function oPath(c, fn) { c.beginPath(); fn(c); }
function oFill(c, fill, lw = 2.6) { c.fillStyle = fill; c.fill(); c.strokeStyle = OUT; c.lineWidth = lw; c.lineJoin = 'round'; c.stroke(); }
function oCap(c, x1, y1, x2, y2, w, fill) { // ledemaat met omlijning (fill mag ook een stofpatroon zijn)
  c.lineCap = 'round'; c.strokeStyle = OUT; c.lineWidth = w + 5; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
  c.strokeStyle = fill; c.lineWidth = w; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
}
function oShine(c, x, y, rx, ry, a = 0.28) { c.fillStyle = `rgba(255,255,255,${a})`; c.beginPath(); c.ellipse(x, y, rx, ry, -0.5, 0, 7); c.fill(); }
function oSkin(c, skin, cx, cy, r) { const g = c.createRadialGradient(cx - r * 0.3, cy - r * 0.4, r * 0.1, cx, cy, r * 1.1); g.addColorStop(0, shade(skin, 1.12)); g.addColorStop(1, skin); return g; }
function oHair(c, hair, y0, y1) { const g = c.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, shade(hair, 1.22)); g.addColorStop(0.5, hair); g.addColorStop(1, shade(hair, 0.8)); return g; }
// lichaamsvorm (50 = gemiddeld): borst, buik, billen en bochel in pixels
function bodyShape(f) {
  const ex = v => { const n = (v === undefined || v === null || isNaN(+v)) ? 50 : +v; return (n - 50) / 50; };
  return { chest: ex(f.chest) > 0 ? ex(f.chest) * 5 : ex(f.chest) * 2.5, belly: ex(f.belly) > 0 ? ex(f.belly) * 8 : ex(f.belly) * 3,
    butt: ex(f.butt) > 0 ? ex(f.butt) * 6 : ex(f.butt) * 2.5, hump: (isNaN(+f.hump) ? 0 : +f.hump) / 100 * 11 };
}
function faceOf(f) { const im = f.face ? faceImage(f.face) : null; return im && im.complete && im.naturalWidth ? im : null; }

// x = midden, y = voeten. o: { pose, t, scale, faint, airH, mood ('angry'), prop ('pin'|'bag'), fwd, shadow, view }
function drawChar(c, f, x, y, o = {}) {
  if (f.top === 'dress' && f.bottom !== 'skirt') f = Object.assign({}, f, { bottom: 'skirt' }); // bij een jurk geen broek
  const pose = o.pose || 'idle', faint = o.faint || 0;
  const view = o.view || ((pose === 'idle' || pose === 'cheer') && !faint ? 'front' : 'side');
  const hm = { short: 0.94, normal: 1, tall: 1.05 }[f.height] || 1, base = view === 'front' ? 0.8 : 0.78, s = (o.scale || 1) * base * hm;
  c.save(); c.translate(x, y);
  if (o.shadow !== false && !faint) { c.globalAlpha = 0.3 * Math.max(0, 1 - (o.airH || 0) / 160); c.fillStyle = '#000'; c.beginPath(); c.ellipse(0, 0, 30 * s, 6 * s, 0, 0, 7); c.fill(); c.globalAlpha = 1; }
  c.scale(s, s); c.lineJoin = 'round'; c.lineCap = 'round';
  if (faint) { c.translate(0, -16 * faint); c.rotate((o.fwd ? 1 : -1) * faint * Math.PI / 2); }
  if (view === 'front') toonFront(c, f, o); else toonSide(c, f, o);
  c.restore();
}


/* ======================= HAAR (realistischer: haarlijn, scheiding, strengen, glans) ======================= */
// strengen binnen de haarvorm: [x0,y0,cx,cy,x1,y1], afwisselend licht en donker
function hairStrands(c, hair, clipFn, strands, a = 1) {
  c.save(); clipFn(); c.clip(); c.lineCap = 'round';
  const dk = shade(hair, 0.6), lt = shade(hair, 1.5);
  strands.forEach((q, i) => {
    const light = i % 3 === 0; c.strokeStyle = light ? lt : dk; c.globalAlpha = (light ? 0.5 : 0.32) * a; c.lineWidth = light ? 1.7 : 1.1;
    c.beginPath(); c.moveTo(q[0], q[1]); c.quadraticCurveTo(q[2], q[3], q[4], q[5]); c.stroke();
  });
  c.restore();
}
// waaier van strengen vanaf een wortel naar een ellips (de schedelrand)
function hairFan(rx, ry, cx, cy, erx, ery, a0, a1, n, push) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = a0 + (a1 - a0) * i / (n - 1), ex = cx + Math.cos(a) * erx, ey = cy + Math.sin(a) * ery;
    out.push([rx, ry, (rx + ex) / 2 + (ex - cx) * push, (ry + ey) / 2 + (ey - cy) * push, ex, ey]);
  }
  return out;
}
function hairFlow(x0, x1, y0, y1, n, wave) { // verticale golvende strengen (lang haar)
  const out = [];
  for (let i = 0; i < n; i++) { const t = n > 1 ? i / (n - 1) : 0.5, x = x0 + (x1 - x0) * t, w = (i % 2 ? 1 : -1) * wave; out.push([x, y0, x + w, (y0 + y1) / 2, x + w * 0.4, y1]); }
  return out;
}
function hairDots(c, hair, clipFn, cx, cy, rx, ry, n, a) { // stoppels / kortgeknipt haar
  c.save(); clipFn(); c.clip(); const dk = shade(hair, 0.55);
  for (let i = 0; i < n; i++) { const t = i * 2.399, r = Math.sqrt((i + 0.5) / n); c.fillStyle = i % 4 ? dk : shade(hair, 1.4); c.globalAlpha = a; c.fillRect(cx + Math.cos(t) * rx * r, cy + Math.sin(t) * ry * r, 1.3, 1.3); }
  c.restore();
}
// haarkap vooraanzicht: vol = volume, side = bakkebaard, fringe = 'side' | 'center' | 'bangs' | 'back'
function hairCap(c, H, o) {
  const vol = o.vol || 0, sd = o.side === undefined ? 5 : o.side, px = o.px === undefined ? -9 : o.px, F = o.fringe || 'side';
  c.beginPath(); c.moveTo(-27.5, H + 6 + sd); c.lineTo(-30.5, H + 2); c.bezierCurveTo(-42, H - 54 - vol, 42, H - 54 - vol, 30.5, H + 2); c.lineTo(27.5, H + 6 + sd); c.lineTo(24.5, H + 4 + sd * 0.6); c.lineTo(24.5, H - 6);
  if (F === 'side') { c.bezierCurveTo(24, H - 18, 14, H - 24, 6, H - 18); c.bezierCurveTo(0, H - 15, px + 4, H - 22, px, H - 30); c.bezierCurveTo(px - 6, H - 22, -22, H - 16, -24.5, H - 6); }
  else if (F === 'center') { c.bezierCurveTo(24, H - 20, 12, H - 24, 1, H - 28); c.bezierCurveTo(-12, H - 24, -24, H - 20, -24.5, H - 6); }
  else if (F === 'bangs') { c.lineTo(23, H - 14); for (let i = 0; i < 8; i++) c.lineTo(23 - (i + 1) * 5.75, H - 14 - (i % 2 ? 2.5 : -0.5)); c.lineTo(-24.5, H - 6); }
  else { c.bezierCurveTo(24, H - 20, 12, H - 31, 0, H - 31); c.bezierCurveTo(-12, H - 31, -24, H - 20, -24.5, H - 6); }
  c.lineTo(-24.5, H + 4 + sd * 0.6); c.lineTo(-27.5, H + 6 + sd); c.closePath();
}
function hairFront(c, f, H) {
  const st = f.style, hair = f.hair, hairD = shade(hair, 0.7); if (st === 'bald') return;
  const grad = oHair(c, hair, H - 48, H + 4), cap = (o) => () => hairCap(c, H, o), hl = () => { c.strokeStyle = 'rgba(255,255,255,.38)'; c.lineWidth = 3; c.beginPath(); c.arc(-4, H - 4, 26, Math.PI * 1.18, Math.PI * 1.45); c.stroke(); };
  const root = (x, y) => hairFan(x, y, 0, H, 31, 33, Math.PI * 0.96, Math.PI * 2.04, 17, 0.1);
  if (st === 'mohawk') {
    const sides = cap({ vol: -10, side: 2, fringe: 'back' }); c.beginPath(); sides(); c.globalAlpha = 0.45; c.fillStyle = hair; c.fill(); c.globalAlpha = 1; hairDots(c, hair, sides, 0, H - 16, 28, 16, 70, 0.7);
    const sp = () => { c.beginPath(); c.moveTo(-9, H - 20); c.lineTo(-11, H - 40); c.lineTo(-5, H - 33); c.lineTo(-3, H - 50); c.lineTo(1, H - 36); c.lineTo(5, H - 52); c.lineTo(8, H - 35); c.lineTo(12, H - 44); c.lineTo(10, H - 20); c.closePath(); };
    sp(); oFill(c, grad, 2.6); hairStrands(c, hair, sp, hairFlow(-9, 9, H - 52, H - 20, 9, 1.2)); sp(); c.strokeStyle = OUT; c.lineWidth = 2.6; c.stroke(); return;
  }
  if (st === 'afro') {
    const sh0 = cap({ vol: 12, side: 0, fringe: 'back' }); c.beginPath(); sh0(); oFill(c, grad, 2.6);
    c.save(); c.beginPath(); sh0(); c.clip(); c.strokeStyle = shade(hair, 0.55); c.globalAlpha = 0.4; c.lineWidth = 1.3;
    for (let i = 0; i < 22; i++) { const x = -26 + (i % 7) * 8.7, y = H - 40 + Math.floor(i / 7) * 9; c.beginPath(); c.arc(x, y, 3.4, 0.4, 5.3); c.stroke(); } c.restore(); hl(); return;
  }
  const o = { buzz: { vol: -6, side: 4, fringe: 'back' }, short: { vol: 2, side: 5, fringe: 'side' }, quiff: { vol: 0, side: 5, fringe: 'back' }, curly: { vol: 3, side: 3, fringe: 'center' },
    long: { vol: 2, side: 2, fringe: 'center' }, bob: { vol: 3, side: 2, fringe: 'bangs' }, ponytail: { vol: 0, side: 2, fringe: 'back' }, bun: { vol: 0, side: 2, fringe: 'back' }, braid: { vol: 1, side: 2, fringe: 'center' } }[st] || { vol: 0, fringe: 'side' };
  const shape = cap(o);
  if (st === 'bun') { const bun = () => { c.beginPath(); c.arc(0, H - 40, 12, 0, 7); }; bun(); oFill(c, oHair(c, hair, H - 54, H - 28), 2.6); hairStrands(c, hair, bun, hairFan(0, H - 40, 0, H - 40, 12, 12, 0, 6.2, 9, 0.5)); bun(); c.strokeStyle = OUT; c.lineWidth = 2.6; c.stroke(); }
  c.beginPath(); shape();
  if (st === 'buzz') { c.globalAlpha = 0.5; c.fillStyle = hair; c.fill(); c.globalAlpha = 1; hairDots(c, hair, shape, 0, H - 16, 28, 18, 110, 0.75); c.strokeStyle = 'rgba(58,34,22,.55)'; c.lineWidth = 1.6; c.stroke(); hl(); return; }
  oFill(c, grad, 2.6);
  if (st === 'curly') {
    for (let i = 0; i < 9; i++) { const x = -22 + i * 5.5, y = H - 26 + Math.sin(i * 1.7) * 3; c.strokeStyle = shade(hair, 0.55); c.globalAlpha = 0.45; c.lineWidth = 1.3; c.beginPath(); c.arc(x, y, 3.6, 0.3, 5.2); c.stroke(); c.globalAlpha = 1; }
    for (let i = 0; i < 12; i++) { const a = Math.PI * (1.02 + i * 0.087), x = Math.cos(a) * 33, y = H - 2 + Math.sin(a) * 36; oPath(c, c => c.arc(x, y, 9.5, 0, 7)); oFill(c, i % 2 ? hair : shade(hair, 1.15), 2.2); c.strokeStyle = shade(hair, 0.55); c.globalAlpha = 0.5; c.lineWidth = 1.3; c.beginPath(); c.arc(x, y, 4.4, 0.5, 5); c.stroke(); c.globalAlpha = 1; }
    hl(); return;
  }
  let strands;
  if (o.fringe === 'side') strands = root(-9, H - 31).concat(hairFan(-9, H - 30, 14, H - 8, 16, 14, -0.2, 1.1, 6, 0.1));
  else if (o.fringe === 'center') strands = hairFan(0, H - 30, 0, H, 31, 33, Math.PI * 0.96, Math.PI * 2.04, 19, 0.1);
  else if (o.fringe === 'bangs') strands = hairFlow(-26, 26, H - 40, H - 12, 14, 1.8).concat(hairFan(0, H - 32, 0, H, 31, 33, Math.PI * 1.05, Math.PI * 1.95, 8, 0.1));
  else strands = hairFan(14, H - 22, 0, H, 31, 33, Math.PI * 0.96, Math.PI * 1.9, 18, 0.08).concat(hairFan(0, H - 28, 0, H, 30, 32, Math.PI * 1.1, Math.PI * 1.9, 6, 0.1));
  hairStrands(c, hair, shape, strands);
  if (st === 'quiff') { const q = () => { c.beginPath(); c.moveTo(-18, H - 38); c.bezierCurveTo(-22, H - 68, 32, H - 70, 33, H - 36); c.bezierCurveTo(22, H - 47, 0, H - 49, -18, H - 38); c.closePath(); }; q(); oFill(c, oHair(c, hair, H - 62, H - 30), 2.6); hairStrands(c, hair, q, [[-12, H - 40, -8, H - 58, 4, H - 66], [-4, H - 40, 2, H - 58, 16, H - 64], [4, H - 40, 12, H - 56, 26, H - 58], [12, H - 40, 22, H - 52, 31, H - 46], [-16, H - 38, -16, H - 52, -6, H - 62], [20, H - 40, 27, H - 46, 32, H - 38]]); }
  if (st === 'ponytail') { c.fillStyle = '#d6232a'; c.beginPath(); c.ellipse(44, H - 4, 3.5, 6, 0.4, 0, 7); c.fill(); c.strokeStyle = OUT; c.lineWidth = 1.6; c.stroke(); }
  if (st === 'long' || st === 'bob') for (const d of [-1, 1]) { const L = st === 'long' ? 46 : 26, lock = () => { c.beginPath(); c.moveTo(d * 25, H - 8); c.bezierCurveTo(d * 36, H + 8, d * 35, H + L - 6, d * 30, H + L); c.bezierCurveTo(d * 24, H + L - 8, d * 24, H + 8, d * 21, H - 4); c.closePath(); }; lock(); oFill(c, oHair(c, hair, H - 8, H + L), 2.4); hairStrands(c, hair, lock, hairFlow(d * 22, d * 33, H - 6, H + L, 5, 1.2)); }
  hl();
}

/* ======================= VOORAANZICHT ======================= */
function toonFront(c, f, o) {
  const fem = f.gender === 'f', bm = { slim: 0.88, normal: 1, broad: 1.2 }[f.build] || 1, sh = bodyShape(f);
  const hairD = shade(f.hair, 0.7), cheer = o.pose === 'cheer', faint = o.faint || 0, angry = o.mood === 'angry';
  const skin = f.skin, topc = f.topColor, botc = f.bottomColor, st = f.style, photo = faceOf(f);
  const dress = f.top === 'dress', skirt = f.bottom === 'skirt', bare = dress || skirt || f.bottom === 'shorts' || f.bottom === 'briefs';
  const H = -92 + ({ upright: -2, normal: 0, slouch: 3 }[f.posture] || 0) + sh.hump * 0.15;
  const tw = 17 * bm, wt = Math.max(12, tw + sh.chest * 0.9), wm = Math.max(12, tw + sh.belly), wh = Math.max(wm * 0.92, tw + 2 + sh.butt * 2); // wm = taille/buik, wh = heupen/billen
  const legW = 11 * bm * (1 + sh.butt / 40), legX = 8.5 + sh.butt * 0.3;
  const fk = CLOTH[f.top] ? f.topFab : null, bk0 = CLOTH[f.bottom] ? f.bottomFab : null;
  const topFill = fk ? fabric(fk, topc) : topc;
  const legFill = bk0 ? fabric(bk0, botc) : botc;
  /* heupen/billen: eigen vorm onder de taille, in de stof van de broek */
  if (!(dress || skirt) && f.bottom !== 'none') {
    const ox = legX + 1 + legW, hipFill = legFill;
    oPath(c, c => { c.moveTo(-wh, -42); c.lineTo(wh, -42); c.bezierCurveTo(wh, -30, ox + 2, -28, ox, -18); c.lineTo(-ox, -18); c.bezierCurveTo(-ox - 2, -28, -wh, -30, -wh, -42); c.closePath(); }); oFill(c, hipFill, 2.6);
    if (bk0 === 'denimwash') { c.fillStyle = 'rgba(255,255,255,.12)'; c.beginPath(); c.ellipse(0, -26, wh * 0.7, 6, 0, 0, 7); c.fill(); }
  }
  /* benen + schoenen */
  for (const d of [-1, 1]) {
    oCap(c, d * legX, -36, d * (legX + 1), -9, legW, bare ? skin : legFill);
    if (f.bottom === 'shorts') oCap(c, d * legX, -36, d * (legX + 0.5), -22, legW + 1, legFill);
    if (bk0 === 'denimwash' && !bare) { c.fillStyle = 'rgba(255,255,255,.14)'; c.beginPath(); c.ellipse(d * (legX + 0.4), -28, legW * 0.5, 7, 0, 0, 7); c.fill(); }
    if (f.bottom === 'jeans' && !bare) { c.strokeStyle = 'rgba(255,200,90,.9)'; c.lineWidth = 1.2; c.setLineDash([3, 3]); c.beginPath(); c.moveTo(d * legX + d * legW * 0.42, -33); c.lineTo(d * (legX + 1) + d * legW * 0.42, -12); c.stroke(); c.setLineDash([]); oCap(c, d * (legX + 0.8), -16, d * (legX + 1), -9, legW + 1, shade(botc, 1.2)); }
    oPath(c, c => c.ellipse(d * (legX + 2.5), -5, 10.5, 6, 0, 0, 7)); oFill(c, f.shoes, 2.4);
    c.fillStyle = 'rgba(255,255,255,.4)'; c.beginPath(); c.ellipse(d * (legX + 2.5) - 2, -7.5, 4.5, 1.8, 0, 0, 7); c.fill();
    c.strokeStyle = OUT; c.lineWidth = 1.6; c.beginPath(); c.moveTo(d * (legX + 2.5) - 9, -3); c.lineTo(d * (legX + 2.5) + 9, -3); c.stroke();
  }
  /* armen */
  const sleeveLong = ['long', 'hoodie', 'blazer'].includes(f.top), sleeveShort = f.top === 'tshirt';
  for (const d of [-1, 1]) {
    const sx = d * (wt + 3), sy = -62, hx = cheer ? d * 34 : d * (wt + 10), hy = cheer ? -92 : -37, ex = cheer ? d * 29 : d * (wt + 8), ey = cheer ? -76 : -50;
    cap_arm: {
      oCap(c, sx, sy, hx, hy, 9 * bm, sleeveLong ? topFill : skin);
      if (sleeveShort) oCap(c, sx, sy, sx + (ex - sx) * 0.8, sy + (ey - sy) * 0.8, 10 * bm, topFill);
      if (sleeveLong) oCap(c, hx - (hx - ex) * 0.35, hy - (hy - ey) * 0.35, hx, hy, 9.5 * bm, shade(topc, 0.78));
    }
    oPath(c, c => c.arc(hx, hy + (cheer ? -3 : 4), 5.8, 0, 7)); oFill(c, skin, 2.4);
    if (o.prop === 'pin' && d === 1) { c.save(); c.translate(hx, hy); c.rotate(0.5); c.fillStyle = '#c58a4a'; c.fillRect(-3.5, -22, 7, 24); c.strokeStyle = OUT; c.lineWidth = 2; c.strokeRect(-3.5, -22, 7, 24); c.restore(); }
  }
  /* romp */
  const torso = () => oPath(c, c => { c.moveTo(-wt + 10, -68); c.lineTo(wt - 10, -68); c.quadraticCurveTo(wt, -68, wt, -58); c.bezierCurveTo(wt, -50, wm, -50, wm, -44); c.bezierCurveTo(wm, -39, wh, -40, wh, -35); c.quadraticCurveTo(wh, -32, wh - 10, -32); c.lineTo(-wh + 10, -32); c.quadraticCurveTo(-wh, -32, -wh, -35); c.bezierCurveTo(-wh, -40, -wm, -39, -wm, -44); c.bezierCurveTo(-wm, -50, -wt, -50, -wt, -58); c.quadraticCurveTo(-wt, -68, -wt + 10, -68); c.closePath(); });
  if (dress || skirt) {
    const col = dress ? topc : botc, fillS = dress ? topFill : fabric('chino', botc);
    oPath(c, c => { c.moveTo(-wh + 2, -42); c.lineTo(wh - 2, -42); c.lineTo(wh + 12, -16); c.quadraticCurveTo(0, -10, -wh - 12, -16); c.closePath(); }); oFill(c, fillS, 2.6);
    c.strokeStyle = shade(col, 0.7); c.lineWidth = 1.4; for (const k of [-0.5, 0, 0.5]) { c.beginPath(); c.moveTo(k * 14, -40); c.lineTo(k * (wh + 8), -15); c.stroke(); }
  }
  if (f.bottom === 'briefs') { oPath(c, c => { c.moveTo(-wh, -38); c.lineTo(wh, -38); c.lineTo(legX + legW * 0.5 + 6, -24); c.lineTo(0, -30); c.lineTo(-legX - legW * 0.5 - 6, -24); c.closePath(); }); oFill(c, botc, 2.6); }
  torso(); oFill(c, f.top === 'none' ? shade(skin, 1) : (f.top === 'tank' ? skin : topFill), 2.6);
  const tg = c.createLinearGradient(-wh, 0, wh, 0); tg.addColorStop(0, 'rgba(0,0,0,.14)'); tg.addColorStop(0.35, 'rgba(255,255,255,.1)'); tg.addColorStop(1, 'rgba(0,0,0,.14)'); torso(); c.fillStyle = tg; c.fill();
  if (f.top === 'tshirt') { c.strokeStyle = OUT; c.lineWidth = 2; c.beginPath(); c.arc(0, -68, 7, 0.1, Math.PI - 0.1); c.stroke(); }
  if (f.top === 'hoodie') { c.strokeStyle = OUT; c.lineWidth = 2; c.beginPath(); c.arc(0, -68, 10, 0.1, Math.PI - 0.1); c.stroke(); c.beginPath(); c.moveTo(0, -60); c.lineTo(0, -34); c.stroke(); c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(-4, -62); c.lineTo(-5, -50); c.moveTo(4, -62); c.lineTo(5, -50); c.stroke(); oPath(c, c => c.roundRect(-10, -48, 20, 11, 3)); c.strokeStyle = OUT; c.lineWidth = 1.6; c.stroke(); }
  if (f.top === 'long') { c.strokeStyle = shade(topc, 0.6); c.lineWidth = 1.6; c.beginPath(); c.arc(0, -68, 8, 0.1, Math.PI - 0.1); c.stroke(); for (let k = -3; k <= 3; k++) { c.beginPath(); c.moveTo(k * 4.5 * (wh / 17), -38); c.lineTo(k * 4.5 * (wh / 17), -33); c.stroke(); } }
  if (f.top === 'blazer') { oPath(c, c => { c.moveTo(-8, -68); c.lineTo(0, -50); c.lineTo(8, -68); c.closePath(); }); oFill(c, '#f4efe6', 2); c.strokeStyle = OUT; c.lineWidth = 2.2; c.beginPath(); c.moveTo(-8, -68); c.lineTo(-3, -44); c.lineTo(-12, -36); c.moveTo(8, -68); c.lineTo(3, -44); c.lineTo(12, -36); c.stroke(); c.fillStyle = '#111'; for (const yy of [-42, -37]) { c.beginPath(); c.arc(0, yy, 1.5, 0, 7); c.fill(); } }
  if (f.top === 'tank') { oPath(c, c => c.roundRect(-wt + 2, -66, wt * 2 - 4, 34, 10)); c.fillStyle = topc; c.fill(); c.fillStyle = skin; oPath(c, c => c.roundRect(-wt + 2, -69, wt * 2 - 4, 8, 4)); c.fill(); c.strokeStyle = OUT; c.lineWidth = 2; c.beginPath(); c.arc(0, -66, 8, 0.1, Math.PI - 0.1); c.stroke(); }
  if (f.top === 'none') { c.strokeStyle = shade(skin, 0.55); c.lineWidth = 2; c.beginPath(); c.arc(0, -46, 3, 0.3, Math.PI - 0.3); c.stroke(); c.beginPath(); c.arc(0, -40 + sh.belly * 0.3, 1.4, 0, 7); c.stroke(); }
  if (!dress && (f.bottom === 'jeans' || f.bottom === 'chinos')) { c.fillStyle = '#2a1a10'; c.fillRect(-wh + 1, -37, wh * 2 - 2, 4); c.fillStyle = '#d4a017'; c.fillRect(-3, -37, 6, 4); }
  /* hals */
  oPath(c, c => c.roundRect(-6, H + 18, 12, 14, 3)); oFill(c, shade(skin, 0.92), 2.2);
  /* achterhaar */
  if (!photo) {
    if (st === 'long' || st === 'bob') {
      const L = st === 'long' ? 50 : 28, back = () => { c.beginPath(); c.moveTo(-31, H - 20); c.bezierCurveTo(-40, H, -38, H + L - 6, -31, H + L); c.quadraticCurveTo(-26, H + L + 5, -20, H + L - 2); c.lineTo(20, H + L - 2); c.quadraticCurveTo(26, H + L + 5, 31, H + L); c.bezierCurveTo(38, H + L - 6, 40, H, 31, H - 20); c.closePath(); };
      back(); oFill(c, oHair(c, f.hair, H - 30, H + L), 2.6); hairStrands(c, f.hair, back, hairFlow(-33, 33, H - 12, H + L, 14, 2.5), 0.9);
    }
    if (st === 'afro') {
      const blob = () => { c.beginPath(); c.arc(0, H - 8, 37, 0, 7); for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2; c.moveTo(Math.cos(a) * 37 + 8, H - 8 + Math.sin(a) * 37); c.arc(Math.cos(a) * 37, H - 8 + Math.sin(a) * 37, 8, 0, 7); } };
      blob(); c.fillStyle = oHair(c, f.hair, H - 48, H + 28); c.fill(); c.strokeStyle = OUT; c.lineWidth = 2.6; c.stroke();
      c.save(); blob(); c.clip(); c.strokeStyle = shade(f.hair, 0.55); c.globalAlpha = 0.35; c.lineWidth = 1.3; for (let i = 0; i < 30; i++) { const a = i * 2.4, r = 8 + (i * 7) % 32; c.beginPath(); c.arc(Math.cos(a) * r, H - 8 + Math.sin(a) * r, 3.2, 0, 4.5); c.stroke(); } c.restore();
    }
    if (st === 'ponytail') { oPath(c, c => { c.moveTo(24, H - 20); c.bezierCurveTo(52, H - 26, 60, H + 8, 44, H + 40); c.bezierCurveTo(46, H + 16, 40, H, 26, H - 4); c.closePath(); }); oFill(c, oHair(c, f.hair, H - 28, H + 40)); }
    if (st === 'braid') {
      for (let i = 0; i < 7; i++) { const x = -31 - Math.sin(i * 0.9) * 2, y = H + 4 + i * 8.5; oPath(c, c => c.ellipse(x, y, 7, 5.6, 0.3 * (i % 2 ? 1 : -1), 0, 7)); oFill(c, i % 2 ? shade(f.hair, 0.82) : oHair(c, f.hair, y - 6, y + 6), 2.2); c.strokeStyle = shade(f.hair, 0.5); c.lineWidth = 1.1; c.globalAlpha = 0.6; c.beginPath(); c.moveTo(x - 4, y - 2); c.lineTo(x + 4, y + 2); c.stroke(); c.globalAlpha = 1; }
      c.fillStyle = '#d6232a'; c.beginPath(); c.ellipse(-31 - Math.sin(6 * 0.9) * 2, H + 4 + 7 * 8.5 - 1, 5.5, 3, 0, 0, 7); c.fill(); c.strokeStyle = OUT; c.lineWidth = 1.6; c.stroke();
    }
  }
  /* oren + hoofd */
  for (const d of [-1, 1]) { oPath(c, c => c.ellipse(d * 27.5, H + 1, 5.5, 8, 0, 0, 7)); oFill(c, shade(skin, 0.97), 2.4); c.strokeStyle = shade(skin, 0.7); c.lineWidth = 1.4; c.beginPath(); c.arc(d * 27.5 + d * 0.5, H + 1, 2.4, 0, 7); c.stroke(); }
  oPath(c, c => c.ellipse(0, H, 27.5, 29, 0, 0, 7)); oFill(c, oSkin(c, skin, 0, H, 29), 2.8);
  if (photo) { c.save(); oPath(c, c => c.ellipse(0, H, 26.5, 28, 0, 0, 7)); c.clip(); c.drawImage(photo, -29, H - 30, 58, 60); c.restore(); oPath(c, c => c.ellipse(0, H, 27.5, 29, 0, 0, 7)); c.strokeStyle = OUT; c.lineWidth = 2.8; c.stroke(); }
  else {
    oShine(c, -10, H - 15, 9, 5, 0.3);
    if (f.beard === 'beard' || f.beard === 'stubble') { oPath(c, c => { c.moveTo(-26, H + 4); c.bezierCurveTo(-27, H + 38, 27, H + 38, 26, H + 4); c.bezierCurveTo(18, H + 14, 12, H + 15, 0, H + 16); c.bezierCurveTo(-12, H + 15, -18, H + 14, -26, H + 4); c.closePath(); }); if (f.beard === 'beard') oFill(c, oHair(c, f.hair, H, H + 36), 2.4); else { c.fillStyle = 'rgba(40,25,15,.28)'; c.fill(); } }
    for (const d of [-1, 1]) { c.fillStyle = angry ? 'rgba(235,60,55,.5)' : 'rgba(255,110,125,.38)'; c.beginPath(); c.ellipse(d * 17.5, H + 12, 6.5, 4.2, 0, 0, 7); c.fill(); }
    for (const d of [-1, 1]) {
      const ex = d * 11.5, ey = H - 1;
      if (faint > 0.4) { c.strokeStyle = OUT; c.lineWidth = 3; c.beginPath(); c.moveTo(ex - 6, ey - 6); c.lineTo(ex + 6, ey + 6); c.moveTo(ex + 6, ey - 6); c.lineTo(ex - 6, ey + 6); c.stroke(); continue; }
      oPath(c, c => c.ellipse(ex, ey, 7.6, angry ? 7 : 9, 0, 0, 7)); c.fillStyle = '#fff'; c.fill(); c.strokeStyle = OUT; c.lineWidth = 2.2; c.stroke();
      c.fillStyle = f.eyes; c.beginPath(); c.arc(ex - d * 0.8, ey + 0.8, 5.2, 0, 7); c.fill(); c.fillStyle = shade(f.eyes, 0.55); c.beginPath(); c.arc(ex - d * 0.8, ey + 0.8, 5.2, 0.15, Math.PI - 0.15); c.fill();
      c.fillStyle = '#0a0705'; c.beginPath(); c.arc(ex - d * 0.8, ey + 0.8, 2.7, 0, 7); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(ex - d * 0.8 - 1.8, ey - 1.4, 1.7, 0, 7); c.arc(ex - d * 0.8 + 1.6, ey + 2.6, 0.8, 0, 7); c.fill();
      c.strokeStyle = OUT; c.lineWidth = 3; c.beginPath(); c.ellipse(ex, ey, 7.8, angry ? 7.4 : 9.2, 0, Math.PI * 1.08, Math.PI * 1.92); c.stroke();
      if (fem) { c.lineWidth = 2; c.beginPath(); c.moveTo(ex + d * 7, ey - 3); c.lineTo(ex + d * 11, ey - 6.5); c.moveTo(ex + d * 7.5, ey - 0.5); c.lineTo(ex + d * 12, ey - 2.5); c.stroke(); }
    }
    for (const d of [-1, 1]) { const ex = d * 11.5, ey = H - 1; c.strokeStyle = hairD; c.lineWidth = fem ? 2.6 : 3.6; c.beginPath(); if (angry) { c.moveTo(d * 20, ey - 15); c.lineTo(d * 3, ey - 8); } else { c.moveTo(ex - d * 7.5, ey - 12.5); c.quadraticCurveTo(ex + d * 0.5, ey - 16.5, ex + d * 8, ey - 12.5); } c.stroke(); }
    c.strokeStyle = shade(skin, 0.6); c.lineWidth = 2.2; c.beginPath(); c.moveTo(0.5, H + 2); c.quadraticCurveTo(-4, H + 11, 1.5, H + 12.5); c.stroke();
    if (angry || faint > 0.4) { oPath(c, c => c.ellipse(0, H + 21, angry ? 10 : 5, angry ? 8 : 6, 0, 0, 7)); c.fillStyle = '#7a1f1f'; c.fill(); c.strokeStyle = OUT; c.lineWidth = 2.4; c.stroke(); if (angry) { c.save(); oPath(c, c => c.ellipse(0, H + 21, 10, 8, 0, 0, 7)); c.clip(); c.fillStyle = '#fff'; c.fillRect(-10, H + 13, 20, 5); c.restore(); } }
    else { oPath(c, c => { c.moveTo(-10, H + 17); c.quadraticCurveTo(0, H + 34, 10, H + 17); c.closePath(); }); c.fillStyle = '#7a1f1f'; c.fill(); c.strokeStyle = OUT; c.lineWidth = 2.4; c.stroke(); c.save(); oPath(c, c => { c.moveTo(-10, H + 17); c.quadraticCurveTo(0, H + 34, 10, H + 17); c.closePath(); }); c.clip(); c.fillStyle = '#fff'; c.fillRect(-10, H + 16, 20, 5.5); c.fillStyle = '#e8737f'; c.beginPath(); c.ellipse(0, H + 28, 6, 4, 0, 0, 7); c.fill(); c.restore(); }
    if (fem && !angry && !(faint > 0.4)) { c.fillStyle = 'rgba(210,50,80,.55)'; c.beginPath(); c.ellipse(0, H + 18.5, 7, 1.6, 0, 0, 7); c.fill(); }
    if (f.beard === 'moustache' || f.beard === 'beard') { oPath(c, c => { c.moveTo(-11, H + 14); c.quadraticCurveTo(-5, H + 9, 0, H + 13); c.quadraticCurveTo(5, H + 9, 11, H + 14); c.quadraticCurveTo(5, H + 17, 0, H + 15); c.quadraticCurveTo(-5, H + 17, -11, H + 14); c.closePath(); }); oFill(c, hairD, 2); }
    /* voorhaar */
    hairFront(c, f, H);
    if (st === 'bald') oShine(c, -8, H - 22, 10, 5, 0.45);
    /* bril */
    if (f.glasses !== 'none') {
      c.lineWidth = 2.8; c.strokeStyle = '#222';
      for (const d of [-1, 1]) { const ex = d * 11.5, ey = H - 1; oPath(c, c => f.glasses === 'square' ? c.roundRect(ex - 10.5, ey - 9.5, 21, 19, 4) : c.arc(ex, ey, 11.2, 0, 7)); if (f.glasses === 'sun') { c.fillStyle = 'rgba(12,12,16,.93)'; c.fill(); oShine(c, ex - 4, ey - 4, 3.5, 1.7, 0.5); } else { c.fillStyle = 'rgba(200,230,255,.22)'; c.fill(); } c.stroke(); }
      c.beginPath(); c.moveTo(-0.5, H - 1.5); c.lineTo(0.5, H - 1.5); c.stroke(); c.beginPath(); c.moveTo(-22.5, H - 2); c.lineTo(-28, H - 4); c.moveTo(22.5, H - 2); c.lineTo(28, H - 4); c.stroke();
    }
  }
  /* hoed */
  if (f.hat === 'cap') { oPath(c, c => { c.moveTo(-29, H - 12); c.bezierCurveTo(-30, H - 46, 30, H - 46, 29, H - 12); c.closePath(); }); oFill(c, '#2b8a3e', 2.6); oPath(c, c => { c.moveTo(-30, H - 12); c.quadraticCurveTo(0, H - 4, 38, H - 14); c.quadraticCurveTo(30, H - 20, -30, H - 16); c.closePath(); }); oFill(c, '#1f6a2e', 2.4); }
  if (f.hat === 'beanie') { oPath(c, c => { c.moveTo(-30, H - 8); c.bezierCurveTo(-32, H - 50, 32, H - 50, 30, H - 8); c.closePath(); }); oFill(c, '#e8590c', 2.6); oPath(c, c => c.roundRect(-31, H - 16, 62, 11, 5)); oFill(c, '#c24400', 2.4); oPath(c, c => c.arc(0, H - 44, 6, 0, 7)); oFill(c, '#ffd8a8', 2.2); }
  if (f.hat === 'top') { oPath(c, c => c.ellipse(0, H - 22, 36, 6, 0, 0, 7)); oFill(c, '#1f1f1f', 2.4); oPath(c, c => c.roundRect(-19, H - 62, 38, 40, 4)); oFill(c, '#262626', 2.6); c.fillStyle = '#8a1c1c'; c.fillRect(-19, H - 32, 38, 7); }
}


// haar zijaanzicht (hoofd kijkt naar rechts, middelpunt = 0,0)
function hairSide(c, f, ph) {
  hairSideBody(c, f, ph);
  if (!['long', 'bob', 'afro', 'curly'].includes(f.style)) { const sk = f.skin; oPath(c, c => c.ellipse(-5.5, 3, 4.4, 6.6, 0, 0, 7)); oFill(c, shade(sk, 0.95), 2.2); c.strokeStyle = shade(sk, 0.65); c.lineWidth = 1.2; c.beginPath(); c.arc(-5, 3, 2, 0.6, 5.4); c.stroke(); }
}
function hairSideBody(c, f, ph) {
  const st = f.style, hair = f.hair; if (st === 'bald') return;
  const grad = oHair(c, hair, -52, 6), hl = () => { c.strokeStyle = 'rgba(255,255,255,.38)'; c.lineWidth = 3; c.beginPath(); c.arc(-3, -2, 26, Math.PI * 1.15, Math.PI * 1.45); c.stroke(); };
  // haarmassa: haarlijn die terugwijkt bij de slaap, oor blijft vrij, onregelmatige pieken in de nek
  const cap = (v, fr, cover) => () => {
    c.beginPath(); c.moveTo(-2, 5); c.lineTo(-0.5, -6);
    if (fr === 'back') { c.bezierCurveTo(1, -16, 8, -26, 15, -28); c.bezierCurveTo(19, -28, 22, -24, 24, -20); }
    else if (fr === 'bangs') { c.bezierCurveTo(2, -14, 10, -17, 17, -17); c.bezierCurveTo(20, -17, 22.5, -15, 24, -13); }
    else { c.bezierCurveTo(1, -14, 8, -20, 14, -22); c.bezierCurveTo(18, -23, 21, -21, 23, -17); }
    c.bezierCurveTo(27, -30, 20, -41 - v, 2, -41 - v); c.bezierCurveTo(-18, -42 - v, -30, -30, -28, -12);
    c.bezierCurveTo(-28, -2, -27, 8, -23, 15); c.lineTo(-20, 10); c.lineTo(-17, 16); c.lineTo(-14, 10);
    if (cover) { c.lineTo(-10, 14); c.lineTo(-5, 11); } else { c.bezierCurveTo(-12, 8, -11, 3, -11, -1); c.bezierCurveTo(-10, -7, -5, -8, -3, -3); }
    c.closePath();
  };
  const ear = () => { oPath(c, c => c.ellipse(-5.5, 3, 4.4, 6.6, 0, 0, 7)); oFill(c, shade(f.skin, 0.95), 2.2); c.strokeStyle = shade(f.skin, 0.65); c.lineWidth = 1.2; c.beginPath(); c.arc(-5, 3, 2, 0.6, 5.4); c.stroke(); };
  if (st === 'mohawk') {
    const sh = cap(-14, 'back'); c.beginPath(); sh(); c.globalAlpha = 0.45; c.fillStyle = hair; c.fill(); c.globalAlpha = 1; hairDots(c, hair, sh, -6, -14, 26, 18, 60, 0.7);
    const sp = () => { c.beginPath(); c.moveTo(-24, -14); c.lineTo(-26, -40); c.lineTo(-16, -34); c.lineTo(-12, -56); c.lineTo(-4, -40); c.lineTo(2, -58); c.lineTo(8, -40); c.lineTo(16, -50); c.lineTo(14, -22); c.closePath(); };
    sp(); oFill(c, grad, 2.6); hairStrands(c, hair, sp, hairFlow(-22, 14, -58, -20, 9, 1.4)); sp(); c.strokeStyle = OUT; c.lineWidth = 2.6; c.stroke(); return;
  }
  const o = { buzz: [-13, 'back'], short: [-1, 'side'], quiff: [-4, 'back'], curly: [-2, 'side'], afro: [4, 'back'], long: [0, 'side'], bob: [1, 'bangs'], ponytail: [-8, 'back'], bun: [-8, 'back'], braid: [-7, 'back'] }[st] || [2, 'side'];
  const cover = st === 'long' || st === 'bob' || st === 'afro' || st === 'curly', shape = cap(o[0], o[1], cover);
  if (st === 'bun') { const bun = () => { c.beginPath(); c.arc(-12, -44, 12, 0, 7); }; bun(); oFill(c, oHair(c, hair, -58, -32), 2.6); hairStrands(c, hair, bun, hairFan(-12, -44, -12, -44, 12, 12, 0, 6.2, 9, 0.5)); bun(); c.strokeStyle = OUT; c.lineWidth = 2.6; c.stroke(); }
  c.beginPath(); shape();
  if (st === 'buzz') { c.globalAlpha = 0.5; c.fillStyle = hair; c.fill(); c.globalAlpha = 1; hairDots(c, hair, shape, -6, -16, 26, 20, 110, 0.75); c.strokeStyle = 'rgba(58,34,22,.55)'; c.lineWidth = 1.6; c.stroke(); hl(); return; }
  oFill(c, grad, 2.6);
  const flow = hairFan(-2, -34, 0, 0, 30, 33, Math.PI * 0.6, Math.PI * 1.75, 16, 0.12).concat(hairFan(10, -30, 6, -6, 22, 26, Math.PI * 1.55, Math.PI * 1.95, 5, 0.1));
  hairStrands(c, hair, shape, flow);
  if (st === 'quiff') { const q = () => { c.beginPath(); c.moveTo(-8, -32); c.bezierCurveTo(-10, -62, 28, -62, 29, -24); c.bezierCurveTo(22, -38, 6, -40, -8, -32); c.closePath(); }; q(); oFill(c, oHair(c, hair, -62, -30), 2.6); hairStrands(c, hair, q, [[-2, -34, 4, -52, 18, -58], [4, -34, 12, -52, 24, -52], [10, -34, 18, -48, 28, -40], [-6, -32, -2, -48, 8, -56], [16, -34, 24, -40, 29, -28]]); }
  if (st === 'curly') for (let i = 0; i < 10; i++) { const a = Math.PI * (0.66 + i * 0.1), x = -2 + Math.cos(a) * 25, y = -2 + Math.sin(a) * 28; oPath(c, c => c.arc(x, y, 9, 0, 7)); oFill(c, i % 2 ? hair : shade(hair, 1.15), 2.2); c.strokeStyle = shade(hair, 0.55); c.globalAlpha = 0.5; c.lineWidth = 1.3; c.beginPath(); c.arc(x, y, 4.2, 0.5, 5); c.stroke(); c.globalAlpha = 1; }
  if (st === 'afro') { c.save(); c.beginPath(); shape(); c.clip(); c.strokeStyle = shade(hair, 0.55); c.globalAlpha = 0.4; c.lineWidth = 1.3; for (let i = 0; i < 22; i++) { c.beginPath(); c.arc(-28 + (i % 7) * 8, -50 + Math.floor(i / 7) * 9, 3.4, 0.4, 5.3); c.stroke(); } c.restore(); }
  hl();
}

/* ======================= ZIJAANZICHT (rennen, springen, bukken) ======================= */
function toonSide(c, f, o) {
  const J = poseJoints(o.pose || 'run', o.t || 0), ph = o.t || 0, fem = f.gender === 'f', faint = o.faint || 0, angry = o.mood === 'angry';
  const bm = { slim: 0.88, normal: 1, broad: 1.2 }[f.build] || 1, sh = bodyShape(f), skin = f.skin, hairD = shade(f.hair, 0.7), st = f.style, photo = faceOf(f);
  sh.chest *= 1.5; sh.belly *= 1.8; sh.butt *= 1.5;
  const pl = faint ? 0 : ({ upright: -0.06, normal: 0, slouch: 0.14 }[f.posture] || 0);
  const hipx = J.hx, hipy = J.hy, lean = J.lean + pl;
  const T = 24, S = 23, A1 = 16, A2 = 15, tb = 1 + sh.butt / 50;
  const shoulder = { x: hipx + Math.sin(lean) * 24, y: hipy - Math.cos(lean) * 24 };
  const head = { x: hipx + Math.sin(lean * 0.8) * 52 + sh.hump * 0.5, y: hipy - Math.cos(lean * 0.8) * 52 + sh.hump * 0.15 };
  const sleeveLong = ['long', 'hoodie', 'blazer'].includes(f.top), bareArms = f.top === 'dress' || f.top === 'tank' || f.top === 'none';
  const fk = CLOTH[f.top] ? f.topFab : null;
  const isBareLeg = f.top === 'dress' || f.bottom === 'skirt' || f.bottom === 'shorts' || f.bottom === 'briefs';
  const legKind = CLOTH[f.bottom] ? f.bottomFab : null;
  const leg = (i, k) => {
    const L = J.legs[i], a = L.a, b = a - L.k;
    const kx = hipx + Math.sin(a) * T, ky = hipy + Math.cos(a) * T, ax = kx + Math.sin(b) * S, ay = ky + Math.cos(b) * S;
    const col = isBareLeg ? shade(skin, k) : (legKind ? fabric(legKind, shade(f.bottomColor, k)) : shade(f.bottomColor, k));
    oCap(c, hipx, hipy, kx, ky, 12 * bm * tb, col); oCap(c, kx, ky, ax, ay, 10 * bm, col);
    if (f.bottom === 'shorts' || f.bottom === 'briefs') { const t = f.bottom === 'briefs' ? 0.35 : 0.85; oCap(c, hipx, hipy, hipx + (kx - hipx) * t, hipy + (ky - hipy) * t, 13 * bm * tb, legKind ? fabric(legKind, shade(f.bottomColor, k)) : shade(f.bottomColor, k)); }
    if (f.bottom === 'jeans' && !isBareLeg) { c.strokeStyle = 'rgba(255,200,90,.9)'; c.lineWidth = 1.2; c.setLineDash([3, 3]); c.beginPath(); c.moveTo(hipx + 5, hipy + 2); c.lineTo(kx + 4, ky); c.lineTo(ax + 4, ay); c.stroke(); c.setLineDash([]); oCap(c, ax - (ax - kx) * 0.22, ay - (ay - ky) * 0.22, ax, ay, 11, shade(f.bottomColor, k * 1.15)); }
    const fa = 0.5 - b * 0.5, tx = ax + Math.cos(fa) * 12, ty = ay + Math.sin(fa) * 12;
    oCap(c, ax - 2, ay + 1, tx, ty, 9, shade(f.shoes, k)); c.fillStyle = 'rgba(255,255,255,.4)'; c.beginPath(); c.ellipse(tx - 3, ty - 3, 3.5, 1.5, 0, 0, 7); c.fill();
  };
  const arm = (i, k) => {
    const A = J.arms[i], ex = shoulder.x + Math.sin(A.a) * A1, ey = shoulder.y + Math.cos(A.a) * A1, wx = ex + Math.sin(A.a + A.e) * A2, wy = ey + Math.cos(A.a + A.e) * A2;
    const sl = fk ? fabric(fk, shade(f.topColor, k)) : shade(f.topColor, k);
    oCap(c, shoulder.x, shoulder.y, ex, ey, 9, shade(sleeveLong ? f.topColor : skin, k)); oCap(c, ex, ey, wx, wy, 8, sleeveLong ? sl : shade(skin, k));
    if (sleeveLong) oCap(c, ex, ey, shoulder.x, shoulder.y, 9.5, sl);
    if (f.top === 'tshirt') oCap(c, shoulder.x, shoulder.y, shoulder.x + (ex - shoulder.x) * 0.75, shoulder.y + (ey - shoulder.y) * 0.75, 10.5, sl);
    oPath(c, c => c.arc(wx + Math.sin(A.a + A.e) * 2, wy + Math.cos(A.a + A.e) * 2, 5.3, 0, 7)); oFill(c, shade(skin, k), 2.3);
    if (i === 0 && o.prop === 'pin') { c.save(); c.translate(wx + Math.sin(A.a + A.e) * 2, wy + Math.cos(A.a + A.e) * 2); c.rotate(-1.0 + Math.sin(ph) * 0.15); oPath(c, c => c.roundRect(-4, -24, 8, 26, 2)); oFill(c, '#d9a35a', 2.2); c.restore(); }
    if (i === 0 && o.prop === 'bag') { c.save(); c.translate(wx + Math.sin(A.a + A.e) * 2, wy + Math.cos(A.a + A.e) * 2); c.rotate(0.25 + Math.sin(ph) * 0.12); c.strokeStyle = OUT; c.lineWidth = 2.4; c.beginPath(); c.arc(0, 5, 6, Math.PI, 0); c.stroke(); oPath(c, c => c.roundRect(-8.5, 5, 17, 13, 3)); oFill(c, '#9a5a2e', 2.4); c.fillStyle = '#d4a017'; c.fillRect(-2, 9, 4, 3); c.restore(); }
  };
  arm(1, 0.82); leg(1, 0.82);
  /* romp (vorm volgt borst, buik, billen en bochel) */
  c.save(); c.translate(hipx, hipy); c.rotate(lean);
  const bk = 11.5 * bm, fr = 12 * bm, bs = sh.butt;
  if (!(f.top === 'dress' || f.bottom === 'skirt')) { // de bil: onderdeel van het bekkensilhouet (taille -> bilbolling -> bilplooi), geen losse bal
    const B = bk + 3 + bs * 1.2;
    oPath(c, c => { c.moveTo(-bk + 2, -16); c.bezierCurveTo(-bk - 2, -11, -B + 1, -12, -B, -3); c.bezierCurveTo(-B - 0.5, 5, -B + 5, 11, -B + 14, 14); c.lineTo(2, 14); c.lineTo(5, 4); c.lineTo(4, -16); c.closePath(); });
    oFill(c, legKind ? fabric(legKind, f.bottomColor) : f.bottomColor, 2.6);
  }
  if (f.top === 'dress' || f.bottom === 'skirt') { const col = f.top === 'dress' ? f.topColor : f.bottomColor, fl = fabric(f.top === 'dress' ? 'jersey' : 'chino', col); oPath(c, c => { c.moveTo(-9 - bs * 1.3, -4); c.lineTo(11 + sh.belly * 0.6, -4); c.lineTo(23 + sh.belly * 0.6, 22); c.quadraticCurveTo(2, 28, -20 - bs * 1.4, 22); c.closePath(); }); oFill(c, fl, 2.6); }
  if (f.bottom === 'briefs') { oPath(c, c => { c.moveTo(-bk - bs * 0.3, -2); c.lineTo(fr + sh.belly * 0.8, -2); c.lineTo(fr + sh.belly * 0.5, 12); c.lineTo(-bk - bs * 0.3, 12); c.closePath(); }); oFill(c, f.bottomColor, 2.6); }
  const body = () => oPath(c, c => {
    c.moveTo(-bk - bs * 0.45, 6); c.bezierCurveTo(-bk - bs * 0.45, -4, -bk - sh.hump, -14, -bk - sh.hump * 0.8, -22);
    c.quadraticCurveTo(-bk - sh.hump * 0.5, -31, -2, -31); c.quadraticCurveTo(fr, -31, fr + sh.chest, -20);
    c.bezierCurveTo(fr + sh.chest, -12, fr + sh.belly, -8, fr + sh.belly, -2); c.quadraticCurveTo(fr + sh.belly * 0.6, 6, fr - 2, 6); c.closePath();
  });
  body(); oFill(c, f.top === 'none' ? skin : (f.top === 'tank' ? skin : (fk ? fabric(fk, f.topColor) : f.topColor)), 2.6);
  const tg = c.createLinearGradient(-bk, 0, fr, 0); tg.addColorStop(0, 'rgba(0,0,0,.18)'); tg.addColorStop(0.6, 'rgba(255,255,255,.1)'); tg.addColorStop(1, 'rgba(0,0,0,.08)'); body(); c.fillStyle = tg; c.fill();
  if (f.top === 'tank') { c.save(); body(); c.clip(); c.fillStyle = f.topColor; c.fillRect(-30, -17, 70, 30); c.restore(); body(); c.strokeStyle = OUT; c.lineWidth = 2.6; c.stroke(); }
  if (f.top === 'hoodie') { oPath(c, c => c.arc(-bk - sh.hump * 0.6 + 2, -28, 8, 0, 7)); oFill(c, shade(f.topColor, 0.85), 2.4); }
  if (f.top === 'blazer') { c.strokeStyle = OUT; c.lineWidth = 2; c.beginPath(); c.moveTo(fr - 2, -26); c.lineTo(fr + 3, -4); c.stroke(); c.fillStyle = '#f4efe6'; c.beginPath(); c.moveTo(fr - 3, -28); c.lineTo(fr + 4, -14); c.lineTo(fr - 6, -14); c.closePath(); c.fill(); }
  if (f.top === 'none') { c.strokeStyle = shade(skin, 0.55); c.lineWidth = 1.8; c.beginPath(); c.arc(fr + sh.belly * 0.7 - 2, -4, 2.4, 0, 7); c.stroke(); }
  if (f.bottom === 'jeans' || f.bottom === 'chinos') { c.fillStyle = '#2a1a10'; c.fillRect(-bk - bs * 0.3, 0, bk + fr + bs * 0.3 + sh.belly * 0.7, 5); }
  c.restore();
  /* hoofd (groot, in profiel) */
  c.save(); c.translate(head.x, head.y - 6); c.rotate(lean * 0.4); c.scale(1.2, 1.2);
  if (!photo) {
    if (st === 'long' || st === 'bob') { const len = st === 'long' ? 50 : 24, sw = Math.sin(ph) * 3, lp = () => { c.beginPath(); c.moveTo(-18, -24); c.bezierCurveTo(-42, -12, -42 - sw, len - 16, -26 - sw, len); c.quadraticCurveTo(-18 - sw, len + 6, -10, len - 2); c.lineTo(-2, len - 6); c.bezierCurveTo(-4, 20, -4, 0, 2, -14); c.closePath(); }; lp(); oFill(c, oHair(c, f.hair, -26, len), 2.6); hairStrands(c, f.hair, lp, hairFlow(-38, -2, -20, len, 11, 2.5 + sw * 0.3), 0.9); }
    if (st === 'ponytail') { const sw = Math.sin(ph) * 5, tp = () => { c.beginPath(); c.moveTo(-18, -16); c.bezierCurveTo(-48 - sw, -20, -58 - sw, 14, -42 - sw * 2, 40); c.bezierCurveTo(-38, 16, -32, 0, -16, 0); c.closePath(); }; tp(); oFill(c, oHair(c, f.hair, -20, 40), 2.6); hairStrands(c, f.hair, tp, [[-18, -10, -40 - sw, -4, -42 - sw * 2, 38], [-18, -8, -34 - sw, 4, -38 - sw * 2, 34], [-16, -4, -30 - sw, 8, -34 - sw * 2, 30], [-18, -13, -44 - sw, -8, -48 - sw * 2, 30]], 1); c.fillStyle = '#d6232a'; c.beginPath(); c.ellipse(-23, -9, 3.2, 6.5, 0.5, 0, 7); c.fill(); c.strokeStyle = OUT; c.lineWidth = 1.6; c.stroke(); }
    if (st === 'braid') { for (let i = 0; i < 7; i++) { const x = -26 - i * 1.4 - Math.sin(ph) * i * 0.6, y = -6 + i * 8.6; oPath(c, c => c.ellipse(x, y, 7, 5.6, 0.3 * (i % 2 ? 1 : -1), 0, 7)); oFill(c, i % 2 ? shade(f.hair, 0.82) : oHair(c, f.hair, y - 6, y + 6), 2.2); c.strokeStyle = shade(f.hair, 0.5); c.lineWidth = 1.1; c.globalAlpha = 0.6; c.beginPath(); c.moveTo(x - 4, y - 2); c.lineTo(x + 4, y + 2); c.stroke(); c.globalAlpha = 1; } }
    if (st === 'afro') { const blob = () => { c.beginPath(); c.arc(-4, -8, 36, 0, 7); for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2; c.moveTo(-4 + Math.cos(a) * 36 + 8, -8 + Math.sin(a) * 36); c.arc(-4 + Math.cos(a) * 36, -8 + Math.sin(a) * 36, 8, 0, 7); } }; blob(); c.fillStyle = oHair(c, f.hair, -48, 28); c.fill(); c.strokeStyle = OUT; c.lineWidth = 2.6; c.stroke(); }
  }
  oPath(c, c => c.ellipse(0, 0, 24, 26, 0, 0, 7)); oFill(c, oSkin(c, skin, 0, 0, 26), 2.8);
  oPath(c, c => c.ellipse(-5, 3, 4.2, 6.5, 0, 0, 7)); oFill(c, shade(skin, 0.95), 2.2);
  if (photo) { c.save(); oPath(c, c => c.ellipse(1, 0, 23.5, 25.5, 0, 0, 7)); c.clip(); c.drawImage(photo, -23, -26, 48, 52); c.restore(); oPath(c, c => c.ellipse(0, 0, 24, 26, 0, 0, 7)); c.strokeStyle = OUT; c.lineWidth = 2.8; c.stroke(); }
  else {
    oShine(c, -2, -16, 8, 4, 0.3);
    oPath(c, c => { c.moveTo(21, -4); c.quadraticCurveTo(33, 4, 22, 10); c.closePath(); }); oFill(c, shade(skin, 1.02), 2.4);
    const ex = 9, ey = -4;
    if (faint > 0.4) { c.strokeStyle = OUT; c.lineWidth = 3; c.beginPath(); c.moveTo(ex - 6, ey - 6); c.lineTo(ex + 6, ey + 6); c.moveTo(ex + 6, ey - 6); c.lineTo(ex - 6, ey + 6); c.stroke(); }
    else {
      oPath(c, c => c.ellipse(ex, ey, 7, angry ? 7.5 : 9, 0, 0, 7)); c.fillStyle = '#fff'; c.fill(); c.strokeStyle = OUT; c.lineWidth = 2.2; c.stroke();
      c.fillStyle = f.eyes; c.beginPath(); c.arc(ex + 2.2, ey + 0.8, 5, 0, 7); c.fill(); c.fillStyle = '#0a0705'; c.beginPath(); c.arc(ex + 2.6, ey + 0.8, 2.6, 0, 7); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(ex + 0.8, ey - 1.8, 1.7, 0, 7); c.fill();
      c.strokeStyle = OUT; c.lineWidth = 3; c.beginPath(); c.ellipse(ex, ey, 7.2, angry ? 7.7 : 9.2, 0, Math.PI * 1.08, Math.PI * 1.92); c.stroke();
      if (fem) { c.lineWidth = 2; c.beginPath(); c.moveTo(ex + 6, ey - 4); c.lineTo(ex + 10, ey - 7); c.stroke(); }
    }
    c.strokeStyle = hairD; c.lineWidth = fem ? 2.6 : 3.6; c.beginPath(); if (angry) { c.moveTo(ex - 8, ey - 15); c.lineTo(ex + 9, ey - 8); } else { c.moveTo(ex - 6, ey - 12.5); c.quadraticCurveTo(ex + 2, ey - 16, ex + 9, ey - 11); } c.stroke();
    c.fillStyle = angry ? 'rgba(235,60,55,.5)' : 'rgba(255,110,125,.38)'; c.beginPath(); c.ellipse(8, 11, 5.5, 3.6, 0, 0, 7); c.fill();
    if (angry || faint > 0.4) { oPath(c, c => c.ellipse(17, 18, angry ? 7 : 4, angry ? 6 : 5, 0, 0, 7)); c.fillStyle = '#7a1f1f'; c.fill(); c.strokeStyle = OUT; c.lineWidth = 2.2; c.stroke(); if (angry) { c.save(); oPath(c, c => c.ellipse(17, 18, 7, 6, 0, 0, 7)); c.clip(); c.fillStyle = '#fff'; c.fillRect(8, 11, 18, 4); c.restore(); } }
    else { oPath(c, c => { c.moveTo(11, 15); c.quadraticCurveTo(18, 24, 24, 15); c.closePath(); }); c.fillStyle = '#7a1f1f'; c.fill(); c.strokeStyle = OUT; c.lineWidth = 2.2; c.stroke(); c.save(); oPath(c, c => { c.moveTo(11, 15); c.quadraticCurveTo(18, 24, 24, 15); c.closePath(); }); c.clip(); c.fillStyle = '#fff'; c.fillRect(10, 14, 16, 4); c.restore(); }
    if (f.beard === 'stubble') { oPath(c, c => { c.moveTo(-14, 6); c.bezierCurveTo(-12, 34, 22, 38, 25, 12); c.bezierCurveTo(20, 16, 14, 13, 8, 14); c.bezierCurveTo(0, 14, -8, 10, -14, 6); c.closePath(); }); c.fillStyle = 'rgba(40,25,15,.28)'; c.fill(); }
    if (f.beard === 'beard') { oPath(c, c => { c.moveTo(-14, 6); c.bezierCurveTo(-12, 34, 22, 38, 25, 12); c.bezierCurveTo(20, 16, 14, 13, 8, 14); c.bezierCurveTo(0, 14, -8, 10, -14, 6); c.closePath(); }); oFill(c, oHair(c, f.hair, 6, 36), 2.2); }
    if (f.beard === 'moustache' || f.beard === 'beard') { oPath(c, c => { c.moveTo(8, 12); c.quadraticCurveTo(17, 8, 25, 12); c.quadraticCurveTo(17, 17, 8, 14); c.closePath(); }); oFill(c, hairD, 2); }
    /* haar bovenop */
    hairSide(c, f, ph);
    if (f.glasses !== 'none') { c.lineWidth = 2.8; c.strokeStyle = '#222'; oPath(c, c => f.glasses === 'square' ? c.roundRect(ex - 9, ey - 9, 20, 18, 4) : c.arc(ex + 1, ey, 10.5, 0, 7)); if (f.glasses === 'sun') { c.fillStyle = 'rgba(12,12,16,.93)'; c.fill(); } else { c.fillStyle = 'rgba(200,230,255,.22)'; c.fill(); } c.stroke(); c.beginPath(); c.moveTo(ex - 9, ey - 1); c.lineTo(-8, 0); c.stroke(); }
  }
  if (f.hat === 'cap') { oPath(c, c => { c.moveTo(-26, -8); c.bezierCurveTo(-28, -44, 26, -44, 26, -10); c.closePath(); }); oFill(c, '#2b8a3e', 2.6); oPath(c, c => { c.moveTo(24, -12); c.quadraticCurveTo(44, -10, 46, -2); c.quadraticCurveTo(30, -4, 22, -4); c.closePath(); }); oFill(c, '#1f6a2e', 2.4); }
  if (f.hat === 'beanie') { oPath(c, c => { c.moveTo(-27, -6); c.bezierCurveTo(-29, -46, 27, -46, 26, -6); c.closePath(); }); oFill(c, '#e8590c', 2.6); oPath(c, c => c.roundRect(-28, -14, 55, 10, 5)); oFill(c, '#c24400', 2.4); oPath(c, c => c.arc(0, -42, 5.5, 0, 7)); oFill(c, '#ffd8a8', 2.2); }
  if (f.hat === 'top') { oPath(c, c => c.ellipse(0, -22, 33, 6, 0, 0, 7)); oFill(c, '#1f1f1f', 2.4); oPath(c, c => c.roundRect(-17, -62, 34, 40, 4)); oFill(c, '#262626', 2.6); c.fillStyle = '#8a1c1c'; c.fillRect(-17, -32, 34, 7); }
  c.restore();
  arm(0, 1); leg(0, 1);
}
