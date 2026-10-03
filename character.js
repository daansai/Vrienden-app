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

const BLANK = {
  name: '', drink: 'beer', gender: 'm', height: 'normal', build: 'normal', skin: SKIN[2], eyes: EYES[0],
  style: 'short', hair: HAIR[2], beard: 'none', glasses: 'none',
  top: 'tshirt', topColor: '#3b82f6', bottom: 'jeans', bottomColor: '#2f4a7a', shoes: '#f1f1f1', hat: 'none',
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
  return o;
}

/* ---------- hulpfuncties ---------- */
const FACE_CACHE = {}; // gezichtsfoto's (data-URL) als Image, zodat ze maar één keer geladen worden
function faceImage(src) { let i = FACE_CACHE[src]; if (!i) { i = FACE_CACHE[src] = new Image(); i.src = src; } return i; }
function shade(hex, k) {
  if (hex.length === 4) hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
  const n = parseInt(hex.slice(1), 16);
  let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
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

/* ======================= VOORAANZICHT ======================= */
function toonFront(c, f, o) {
  const fem = f.gender === 'f', bm = { slim: 0.88, normal: 1, broad: 1.2 }[f.build] || 1, sh = bodyShape(f);
  const hairD = shade(f.hair, 0.7), cheer = o.pose === 'cheer', faint = o.faint || 0, angry = o.mood === 'angry';
  const skin = f.skin, topc = f.topColor, botc = f.bottomColor, st = f.style, photo = faceOf(f);
  const dress = f.top === 'dress', skirt = f.bottom === 'skirt', bare = dress || skirt || f.bottom === 'shorts' || f.bottom === 'briefs';
  const H = -92 + ({ upright: -2, normal: 0, slouch: 3 }[f.posture] || 0) + sh.hump * 0.15;
  const tw = 17 * bm, wt = Math.max(12, tw + sh.chest * 0.9), wb = Math.max(12, tw + sh.belly + sh.butt * 0.3);
  const legW = 11 * bm * (1 + sh.butt / 22), legX = 8.5 + sh.butt * 0.25;
  const fk = { tshirt: 'jersey', long: 'knit', hoodie: 'fleece', blazer: 'wool', dress: 'jersey', tank: 'jersey' }[f.top];
  const topFill = fk ? fabric(fk, topc) : topc;
  const legFill = f.bottom === 'jeans' ? fabric('denim', botc) : f.bottom === 'chinos' ? fabric('chino', botc) : botc;
  /* benen + schoenen */
  for (const d of [-1, 1]) {
    oCap(c, d * legX, -36, d * (legX + 1), -9, legW, bare && f.bottom !== 'shorts' ? skin : (f.bottom === 'shorts' ? skin : legFill));
    if (f.bottom === 'shorts') oCap(c, d * legX, -36, d * (legX + 0.5), -22, legW + 1, botc);
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
  const torso = () => oPath(c, c => { c.moveTo(-wt + 10, -68); c.lineTo(wt - 10, -68); c.quadraticCurveTo(wt, -68, wt, -58); c.bezierCurveTo(wt, -48, wb, -46, wb, -40); c.quadraticCurveTo(wb, -32, wb - 10, -32); c.lineTo(-wb + 10, -32); c.quadraticCurveTo(-wb, -32, -wb, -40); c.bezierCurveTo(-wb, -46, -wt, -48, -wt, -58); c.quadraticCurveTo(-wt, -68, -wt + 10, -68); c.closePath(); });
  if (dress || skirt) {
    const col = dress ? topc : botc, fillS = dress ? topFill : fabric('chino', botc);
    oPath(c, c => { c.moveTo(-wb + 2, -42); c.lineTo(wb - 2, -42); c.lineTo(wb + 12, -16); c.quadraticCurveTo(0, -10, -wb - 12, -16); c.closePath(); }); oFill(c, fillS, 2.6);
    c.strokeStyle = shade(col, 0.7); c.lineWidth = 1.4; for (const k of [-0.5, 0, 0.5]) { c.beginPath(); c.moveTo(k * 14, -40); c.lineTo(k * (wb + 8), -15); c.stroke(); }
  }
  if (f.bottom === 'briefs') { oPath(c, c => { c.moveTo(-wb, -38); c.lineTo(wb, -38); c.lineTo(legX + legW * 0.5 + 6, -24); c.lineTo(0, -30); c.lineTo(-legX - legW * 0.5 - 6, -24); c.closePath(); }); oFill(c, botc, 2.6); }
  torso(); oFill(c, f.top === 'none' ? shade(skin, 1) : (f.top === 'tank' ? skin : topFill), 2.6);
  const tg = c.createLinearGradient(-wb, 0, wb, 0); tg.addColorStop(0, 'rgba(0,0,0,.14)'); tg.addColorStop(0.35, 'rgba(255,255,255,.1)'); tg.addColorStop(1, 'rgba(0,0,0,.14)'); torso(); c.fillStyle = tg; c.fill();
  if (f.top === 'tshirt') { c.strokeStyle = OUT; c.lineWidth = 2; c.beginPath(); c.arc(0, -68, 7, 0.1, Math.PI - 0.1); c.stroke(); }
  if (f.top === 'hoodie') { c.strokeStyle = OUT; c.lineWidth = 2; c.beginPath(); c.arc(0, -68, 10, 0.1, Math.PI - 0.1); c.stroke(); c.beginPath(); c.moveTo(0, -60); c.lineTo(0, -34); c.stroke(); c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(-4, -62); c.lineTo(-5, -50); c.moveTo(4, -62); c.lineTo(5, -50); c.stroke(); oPath(c, c => c.roundRect(-10, -48, 20, 11, 3)); c.strokeStyle = OUT; c.lineWidth = 1.6; c.stroke(); }
  if (f.top === 'long') { c.strokeStyle = shade(topc, 0.6); c.lineWidth = 1.6; c.beginPath(); c.arc(0, -68, 8, 0.1, Math.PI - 0.1); c.stroke(); for (let k = -3; k <= 3; k++) { c.beginPath(); c.moveTo(k * 4.5 * (wb / 17), -38); c.lineTo(k * 4.5 * (wb / 17), -33); c.stroke(); } }
  if (f.top === 'blazer') { oPath(c, c => { c.moveTo(-8, -68); c.lineTo(0, -50); c.lineTo(8, -68); c.closePath(); }); oFill(c, '#f4efe6', 2); c.strokeStyle = OUT; c.lineWidth = 2.2; c.beginPath(); c.moveTo(-8, -68); c.lineTo(-3, -44); c.lineTo(-12, -36); c.moveTo(8, -68); c.lineTo(3, -44); c.lineTo(12, -36); c.stroke(); c.fillStyle = '#111'; for (const yy of [-42, -37]) { c.beginPath(); c.arc(0, yy, 1.5, 0, 7); c.fill(); } }
  if (f.top === 'tank') { oPath(c, c => c.roundRect(-wt + 2, -66, wt * 2 - 4, 34, 10)); c.fillStyle = topc; c.fill(); c.fillStyle = skin; oPath(c, c => c.roundRect(-wt + 2, -69, wt * 2 - 4, 8, 4)); c.fill(); c.strokeStyle = OUT; c.lineWidth = 2; c.beginPath(); c.arc(0, -66, 8, 0.1, Math.PI - 0.1); c.stroke(); }
  if (f.top === 'none') { c.strokeStyle = shade(skin, 0.55); c.lineWidth = 2; c.beginPath(); c.arc(0, -46, 3, 0.3, Math.PI - 0.3); c.stroke(); c.beginPath(); c.arc(0, -40 + sh.belly * 0.3, 1.4, 0, 7); c.stroke(); }
  if (!dress && (f.bottom === 'jeans' || f.bottom === 'chinos')) { c.fillStyle = '#2a1a10'; c.fillRect(-wb + 1, -37, wb * 2 - 2, 4); c.fillStyle = '#d4a017'; c.fillRect(-3, -37, 6, 4); }
  /* hals */
  oPath(c, c => c.roundRect(-6, H + 18, 12, 14, 3)); oFill(c, shade(skin, 0.92), 2.2);
  /* achterhaar */
  if (!photo) {
    if (st === 'long') { oPath(c, c => c.roundRect(-33, H - 30, 66, 78, 24)); oFill(c, oHair(c, f.hair, H - 30, H + 48)); }
    if (st === 'bob') { oPath(c, c => c.roundRect(-33, H - 30, 66, 56, 22)); oFill(c, oHair(c, f.hair, H - 30, H + 26)); }
    if (st === 'afro') { oPath(c, c => c.arc(0, H - 6, 42, 0, 7)); oFill(c, oHair(c, f.hair, H - 48, H + 36)); }
    if (st === 'ponytail') { oPath(c, c => { c.moveTo(24, H - 20); c.bezierCurveTo(52, H - 26, 60, H + 8, 44, H + 40); c.bezierCurveTo(46, H + 16, 40, H, 26, H - 4); c.closePath(); }); oFill(c, oHair(c, f.hair, H - 28, H + 40)); }
    if (st === 'braid') for (let i = 0; i < 6; i++) { oPath(c, c => c.ellipse(-30 - i * 0.6, H + 6 + i * 9, 6.5, 6, 0, 0, 7)); oFill(c, i % 2 ? hairD : f.hair, 2.2); }
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
    const capH = vol => oPath(c, c => { c.moveTo(-29, H + 2); c.bezierCurveTo(-36, H - 40 - vol, 36, H - 40 - vol, 29, H + 2); c.bezierCurveTo(26, H - 14, 12, H - 20, 2, H - 17); c.bezierCurveTo(-8, H - 14, -22, H - 12, -29, H + 2); c.closePath(); });
    if (st !== 'bald') {
      if (st === 'afro') { capH(4); oFill(c, oHair(c, f.hair, H - 44, H), 2.6); }
      else if (st === 'mohawk') { oPath(c, c => { c.moveTo(-9, H - 22); c.lineTo(-10, H - 44); c.lineTo(-4, H - 34); c.lineTo(0, H - 50); c.lineTo(5, H - 34); c.lineTo(10, H - 44); c.lineTo(9, H - 22); c.closePath(); }); oFill(c, oHair(c, f.hair, H - 50, H - 20), 2.6); }
      else {
        capH(st === 'quiff' ? 4 : st === 'curly' ? 2 : 0); if (st === 'buzz') { c.globalAlpha = 0.55; oFill(c, f.hair, 1.6); c.globalAlpha = 1; } else oFill(c, oHair(c, f.hair, H - 44, H), 2.6);
        if (st === 'quiff') { oPath(c, c => { c.moveTo(-8, H - 31); c.bezierCurveTo(-4, H - 56, 26, H - 54, 30, H - 28); c.bezierCurveTo(18, H - 38, 4, H - 38, -8, H - 31); c.closePath(); }); oFill(c, oHair(c, f.hair, H - 54, H - 30), 2.6); }
        if (st === 'curly') for (let i = 0; i < 8; i++) { const a = Math.PI * (1.04 + i * 0.13); oPath(c, c => c.arc(Math.cos(a) * 28, H + Math.sin(a) * 30, 9.5, 0, 7)); oFill(c, i % 2 ? f.hair : shade(f.hair, 1.15), 2.2); }
        if (st === 'bun') { oPath(c, c => c.arc(0, H - 38, 12, 0, 7)); oFill(c, oHair(c, f.hair, H - 52, H - 26), 2.6); }
        if (st === 'long' || st === 'bob') for (const d of [-1, 1]) { oPath(c, c => { c.moveTo(d * 28, H - 6); c.bezierCurveTo(d * 36, H + 14, d * 33, H + (st === 'long' ? 40 : 22), d * 29, H + (st === 'long' ? 44 : 26)); c.bezierCurveTo(d * 24, H + 20, d * 25, H + 4, d * 22, H - 8); c.closePath(); }); oFill(c, f.hair, 2.4); }
      }
      c.strokeStyle = 'rgba(255,255,255,.4)'; c.lineWidth = 3; c.beginPath(); c.arc(-4, H - 4, 26, Math.PI * 1.18, Math.PI * 1.45); c.stroke();
    } else oShine(c, -8, H - 22, 10, 5, 0.45);
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

/* ======================= ZIJAANZICHT (rennen, springen, bukken) ======================= */
function toonSide(c, f, o) {
  const J = poseJoints(o.pose || 'run', o.t || 0), ph = o.t || 0, fem = f.gender === 'f', faint = o.faint || 0, angry = o.mood === 'angry';
  const bm = { slim: 0.88, normal: 1, broad: 1.2 }[f.build] || 1, sh = bodyShape(f), skin = f.skin, hairD = shade(f.hair, 0.7), st = f.style, photo = faceOf(f);
  sh.chest *= 1.5; sh.belly *= 1.8; sh.butt *= 1.5;
  const pl = faint ? 0 : ({ upright: -0.06, normal: 0, slouch: 0.14 }[f.posture] || 0);
  const hipx = J.hx, hipy = J.hy, lean = J.lean + pl;
  const T = 24, S = 23, A1 = 16, A2 = 15, tb = 1 + sh.butt / 24;
  const shoulder = { x: hipx + Math.sin(lean) * 24, y: hipy - Math.cos(lean) * 24 };
  const head = { x: hipx + Math.sin(lean * 0.8) * 52 + sh.hump * 0.5, y: hipy - Math.cos(lean * 0.8) * 52 + sh.hump * 0.15 };
  const sleeveLong = ['long', 'hoodie', 'blazer'].includes(f.top), bareArms = f.top === 'dress' || f.top === 'tank' || f.top === 'none';
  const fk = { tshirt: 'jersey', long: 'knit', hoodie: 'fleece', blazer: 'wool', dress: 'jersey', tank: 'jersey' }[f.top];
  const isBareLeg = f.top === 'dress' || f.bottom === 'skirt' || f.bottom === 'shorts' || f.bottom === 'briefs';
  const legKind = f.bottom === 'jeans' ? 'denim' : f.bottom === 'chinos' ? 'chino' : null;
  const leg = (i, k) => {
    const L = J.legs[i], a = L.a, b = a - L.k;
    const kx = hipx + Math.sin(a) * T, ky = hipy + Math.cos(a) * T, ax = kx + Math.sin(b) * S, ay = ky + Math.cos(b) * S;
    const col = isBareLeg ? shade(skin, k) : (legKind ? fabric(legKind, shade(f.bottomColor, k)) : shade(f.bottomColor, k));
    oCap(c, hipx, hipy, kx, ky, 12 * bm * tb, col); oCap(c, kx, ky, ax, ay, 10 * bm, col);
    if (f.bottom === 'shorts' || f.bottom === 'briefs') { const t = f.bottom === 'briefs' ? 0.35 : 0.85; oCap(c, hipx, hipy, hipx + (kx - hipx) * t, hipy + (ky - hipy) * t, 13 * bm * tb, shade(f.bottomColor, k)); }
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
  const bk = 11.5 * bm, fr = 12 * bm;
  if (f.top === 'dress' || f.bottom === 'skirt') { const col = f.top === 'dress' ? f.topColor : f.bottomColor, fl = fabric(f.top === 'dress' ? 'jersey' : 'chino', col); oPath(c, c => { c.moveTo(-9 - sh.butt, -4); c.lineTo(11 + sh.belly * 0.6, -4); c.lineTo(23 + sh.belly * 0.6, 22); c.quadraticCurveTo(2, 28, -20 - sh.butt, 22); c.closePath(); }); oFill(c, fl, 2.6); }
  if (f.bottom === 'briefs') { oPath(c, c => { c.moveTo(-bk - sh.butt, -2); c.lineTo(fr + sh.belly * 0.8, -2); c.lineTo(fr + sh.belly * 0.5, 12); c.lineTo(-bk - sh.butt, 12); c.closePath(); }); oFill(c, f.bottomColor, 2.6); }
  const body = () => oPath(c, c => {
    c.moveTo(-bk - sh.butt, 6); c.bezierCurveTo(-bk - sh.butt, -4, -bk - sh.hump, -14, -bk - sh.hump * 0.8, -22);
    c.quadraticCurveTo(-bk - sh.hump * 0.5, -31, -2, -31); c.quadraticCurveTo(fr, -31, fr + sh.chest, -20);
    c.bezierCurveTo(fr + sh.chest, -12, fr + sh.belly, -8, fr + sh.belly, -2); c.quadraticCurveTo(fr + sh.belly * 0.6, 6, fr - 2, 6); c.closePath();
  });
  body(); oFill(c, f.top === 'none' ? skin : (f.top === 'tank' ? skin : (fk ? fabric(fk, f.topColor) : f.topColor)), 2.6);
  const tg = c.createLinearGradient(-bk, 0, fr, 0); tg.addColorStop(0, 'rgba(0,0,0,.18)'); tg.addColorStop(0.6, 'rgba(255,255,255,.1)'); tg.addColorStop(1, 'rgba(0,0,0,.08)'); body(); c.fillStyle = tg; c.fill();
  if (f.top === 'tank') { c.save(); body(); c.clip(); c.fillStyle = f.topColor; c.fillRect(-30, -17, 70, 30); c.restore(); body(); c.strokeStyle = OUT; c.lineWidth = 2.6; c.stroke(); }
  if (f.top === 'hoodie') { oPath(c, c => c.arc(-bk - sh.hump * 0.6 + 2, -28, 8, 0, 7)); oFill(c, shade(f.topColor, 0.85), 2.4); }
  if (f.top === 'blazer') { c.strokeStyle = OUT; c.lineWidth = 2; c.beginPath(); c.moveTo(fr - 2, -26); c.lineTo(fr + 3, -4); c.stroke(); c.fillStyle = '#f4efe6'; c.beginPath(); c.moveTo(fr - 3, -28); c.lineTo(fr + 4, -14); c.lineTo(fr - 6, -14); c.closePath(); c.fill(); }
  if (f.top === 'none') { c.strokeStyle = shade(skin, 0.55); c.lineWidth = 1.8; c.beginPath(); c.arc(fr + sh.belly * 0.7 - 2, -4, 2.4, 0, 7); c.stroke(); }
  if (f.bottom === 'jeans' || f.bottom === 'chinos') { c.fillStyle = '#2a1a10'; c.fillRect(-bk - sh.butt * 0.6, 0, bk + fr + sh.butt * 0.6 + sh.belly * 0.7, 5); }
  c.restore();
  /* hoofd (groot, in profiel) */
  c.save(); c.translate(head.x, head.y - 6); c.rotate(lean * 0.4); c.scale(1.2, 1.2);
  if (!photo) {
    if (st === 'long' || st === 'bob') { const len = st === 'long' ? 44 : 22, sw = Math.sin(ph) * 2; oPath(c, c => { c.moveTo(-18, -22); c.bezierCurveTo(-36, -10, -38, len - 14 + sw, -22, len); c.lineTo(-2, len - 4); c.bezierCurveTo(-4, 20, -4, 0, 2, -14); c.closePath(); }); oFill(c, oHair(c, f.hair, -26, len)); }
    if (st === 'ponytail') { const sw = Math.sin(ph) * 4; oPath(c, c => { c.moveTo(-18, -14); c.bezierCurveTo(-46 - sw, -16, -54 - sw, 14, -42 - sw * 2, 34); c.bezierCurveTo(-40, 14, -34, 0, -16, 0); c.closePath(); }); oFill(c, oHair(c, f.hair, -20, 34)); }
    if (st === 'braid') for (let i = 0; i < 6; i++) { oPath(c, c => c.ellipse(-24 - i * 1.2 - Math.sin(ph) * i * 0.5, -6 + i * 9, 6.5, 6, 0, 0, 7)); oFill(c, i % 2 ? hairD : f.hair, 2.2); }
    if (st === 'afro') { oPath(c, c => c.arc(-4, -6, 36, 0, 7)); oFill(c, oHair(c, f.hair, -44, 30)); }
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
    if (st !== 'bald') {
      if (st === 'mohawk') { oPath(c, c => { c.moveTo(-18, -18); c.lineTo(-20, -42); c.lineTo(-10, -32); c.lineTo(-6, -50); c.lineTo(2, -34); c.lineTo(8, -46); c.lineTo(10, -22); c.closePath(); }); oFill(c, oHair(c, f.hair, -50, -18), 2.6); }
      else {
        oPath(c, c => { c.moveTo(-25, 6); c.bezierCurveTo(-34, -42 - (st === 'quiff' ? 6 : 0), 22, -48, 26, -8); c.bezierCurveTo(18, -20, 6, -20, 0, -14); c.bezierCurveTo(-8, -6, -16, 0, -20, 8); c.closePath(); });
        if (st === 'buzz') { c.globalAlpha = 0.55; oFill(c, f.hair, 1.6); c.globalAlpha = 1; } else oFill(c, oHair(c, f.hair, -44, 4), 2.6);
        if (st === 'quiff') { oPath(c, c => { c.moveTo(-6, -36); c.bezierCurveTo(-2, -62, 28, -58, 30, -28); c.bezierCurveTo(18, -38, 6, -38, -6, -36); c.closePath(); }); oFill(c, oHair(c, f.hair, -60, -30), 2.6); }
        if (st === 'curly') for (let i = 0; i < 7; i++) { const a = Math.PI * (1.0 + i * 0.14); oPath(c, c => c.arc(Math.cos(a) * 25 - 2, Math.sin(a) * 27 - 2, 9, 0, 7)); oFill(c, i % 2 ? f.hair : shade(f.hair, 1.15), 2.2); }
        if (st === 'bun') { oPath(c, c => c.arc(-8, -42, 11, 0, 7)); oFill(c, f.hair, 2.6); }
      }
      c.strokeStyle = 'rgba(255,255,255,.4)'; c.lineWidth = 3; c.beginPath(); c.arc(-3, -2, 23, Math.PI * 1.15, Math.PI * 1.45); c.stroke();
    }
    if (f.glasses !== 'none') { c.lineWidth = 2.8; c.strokeStyle = '#222'; oPath(c, c => f.glasses === 'square' ? c.roundRect(ex - 9, ey - 9, 20, 18, 4) : c.arc(ex + 1, ey, 10.5, 0, 7)); if (f.glasses === 'sun') { c.fillStyle = 'rgba(12,12,16,.93)'; c.fill(); } else { c.fillStyle = 'rgba(200,230,255,.22)'; c.fill(); } c.stroke(); c.beginPath(); c.moveTo(ex - 9, ey - 1); c.lineTo(-8, 0); c.stroke(); }
  }
  if (f.hat === 'cap') { oPath(c, c => { c.moveTo(-26, -8); c.bezierCurveTo(-28, -44, 26, -44, 26, -10); c.closePath(); }); oFill(c, '#2b8a3e', 2.6); oPath(c, c => { c.moveTo(24, -12); c.quadraticCurveTo(44, -10, 46, -2); c.quadraticCurveTo(30, -4, 22, -4); c.closePath(); }); oFill(c, '#1f6a2e', 2.4); }
  if (f.hat === 'beanie') { oPath(c, c => { c.moveTo(-27, -6); c.bezierCurveTo(-29, -46, 27, -46, 26, -6); c.closePath(); }); oFill(c, '#e8590c', 2.6); oPath(c, c => c.roundRect(-28, -14, 55, 10, 5)); oFill(c, '#c24400', 2.4); oPath(c, c => c.arc(0, -42, 5.5, 0, 7)); oFill(c, '#ffd8a8', 2.2); }
  if (f.hat === 'top') { oPath(c, c => c.ellipse(0, -22, 33, 6, 0, 0, 7)); oFill(c, '#1f1f1f', 2.4); oPath(c, c => c.roundRect(-17, -62, 34, 40, 4)); oFill(c, '#262626', 2.6); c.fillStyle = '#8a1c1c'; c.fillRect(-17, -32, 34, 7); }
  c.restore();
  arm(0, 1); leg(0, 1);
}
