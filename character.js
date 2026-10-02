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
  hat: [['none', 'Geen'], ['cap', 'Pet'], ['beanie', 'Muts'], ['top', 'Hoge hoed']]
};
const SKIN = ['#fbe2cf', '#f3cfae', '#e6b48c', '#cf9a6b', '#b27846', '#8a5836', '#6a4028', '#47291a'];
const HAIR = ['#0e0a08', '#2a1a10', '#4a2e1a', '#7a4a24', '#a9702f', '#d6a84f', '#ebd48e', '#b5481f', '#8c8c8c', '#e9e9e9', '#3b6ea5', '#d6459f'];
const EYES = ['#3b2414', '#7a5a2a', '#4a8a55', '#3b78a8', '#7d9bb0', '#555555'];

const BLANK = {
  name: '', gender: 'm', height: 'normal', build: 'normal', skin: SKIN[2], eyes: EYES[0],
  style: 'short', hair: HAIR[2], beard: 'none', glasses: 'none',
  top: 'tshirt', topColor: '#3b82f6', bottom: 'jeans', bottomColor: '#2f4a7a', shoes: '#f1f1f1', hat: 'none',
  posture: 'normal', hump: 0, chest: 50, belly: 50, butt: 50 // houding, bochel (0-100), borst/buik/billen (50 = gemiddeld)
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

/* ---------- tekenen ---------- */
// x = midden, y = voeten. o: { pose, t (fase), scale, faint 0..1, airH, sway }
function drawChar(c, f, x, y, o = {}) {
  if (f.top === 'dress' && f.bottom !== 'skirt') f = Object.assign({}, f, { bottom: 'skirt' }); // bij een jurk geen broek
  const pose = o.pose || 'idle', ph = o.t || 0, fem = f.gender === 'f', faint = o.faint || 0;
  const bm = { slim: 0.86, normal: 1, broad: 1.18 }[f.build] || 1;
  const s = (o.scale || 1) * ({ short: 0.92, normal: 1, tall: 1.07 }[f.height] || 1);
  const J = poseJoints(pose, ph);
  const skin = f.skin, hairCol = f.hair, hairDark = shade(f.hair, 0.65);
  // lichaamsvorm: 50 = gemiddeld; borst, buik en billen zijn zichtbaar in zijaanzicht, de bochel zit op de bovenrug
  const num = (v, d) => (v === undefined || v === null || isNaN(+v)) ? d : +v;
  const ex = v => (num(v, 50) - 50) / 50;
  const chestX = ex(f.chest) > 0 ? ex(f.chest) * 5 : ex(f.chest) * 2.5;
  const bellyX = ex(f.belly) > 0 ? ex(f.belly) * 8 : ex(f.belly) * 3;
  const buttX = ex(f.butt) > 0 ? ex(f.butt) * 6 : ex(f.butt) * 2.5;
  const humpX = num(f.hump, 0) / 100 * 11;
  const tb = 1 + buttX / 28;
  const pl = faint ? 0 : ({ upright: -0.06, normal: 0, slouch: 0.14 }[f.posture] || 0);
  const hipx = J.hx, hipy = J.hy, lean = J.lean + pl;

  c.save(); c.translate(x, y);
  if (o.shadow !== false && !faint) { // grondschaduw
    c.globalAlpha = 0.3 * Math.max(0, 1 - (o.airH || 0) / 160);
    ell(c, 0, 0, 22 * s, 4.5 * s, '#000'); c.globalAlpha = 1;
  }
  c.scale(s, s);
  if (faint) { c.translate(0, -9 * faint); c.rotate(-faint * Math.PI / 2); }
  c.lineJoin = 'round'; c.lineCap = 'round';

  const T = 23, S = 22;
  const shoulder = { x: hipx + Math.sin(lean) * 22 + Math.cos(lean), y: hipy - Math.cos(lean) * 22 + Math.sin(lean) };
  const hd = { x: hipx + Math.sin(lean * 0.7) * 38.5, y: hipy - Math.cos(lean * 0.7) * 38.5 };
  const neckBase = { x: hipx + Math.sin(lean) * 24, y: hipy - Math.cos(lean) * 24 };
  hd.x += humpX * 0.4; hd.y += humpX * 0.12; neckBase.x += humpX * 0.25; // bochel trekt het hoofd naar voren

  /* --- armen --- */
  const arm = i => {
    const A = J.arms[i], back = i === 1, k = back ? 0.78 : 1;
    const ex = shoulder.x + Math.sin(A.a) * 15, ey = shoulder.y + Math.cos(A.a) * 15;
    const wx = ex + Math.sin(A.a + A.e) * 14, wy = ey + Math.cos(A.a + A.e) * 14;
    const sk = shade(skin, k), tc = shade(f.topColor, k);
    limb(c, shoulder.x, shoulder.y, ex, ey, 3.6 * bm, 3.0 * bm, sk);
    limb(c, ex, ey, wx, wy, 3.0 * bm, 2.4 * bm, sk);
    ell(c, wx + Math.sin(A.a + A.e) * 1.5, wy + Math.cos(A.a + A.e) * 1.5, 2.7, 3, sk);
    if (f.top === 'tshirt') limb(c, shoulder.x, shoulder.y, shoulder.x + (ex - shoulder.x) * 0.6, shoulder.y + (ey - shoulder.y) * 0.6, 4.7 * bm, 4.2 * bm, tc);
    else if (['long', 'hoodie', 'blazer'].includes(f.top)) {
      limb(c, shoulder.x, shoulder.y, ex, ey, 4.6 * bm, 3.8 * bm, tc);
      limb(c, ex, ey, wx - (wx - ex) * 0.1, wy - (wy - ey) * 0.1, 3.8 * bm, 3.2 * bm, tc);
    }
  };
  /* --- benen + schoenen --- */
  const leg = i => {
    const L = J.legs[i], back = i === 1, k = back ? 0.78 : 1;
    const a = L.a, b = a - L.k;
    const kx = hipx + Math.sin(a) * T, ky = hipy + Math.cos(a) * T;
    const ax = kx + Math.sin(b) * S, ay = ky + Math.cos(b) * S;
    const sk = shade(skin, k), pc = shade(f.bottomColor, k);
    limb(c, hipx, hipy, kx, ky, 5.5 * bm * tb, 4.3 * bm, sk); limb(c, kx, ky, ax, ay, 4.2 * bm, 3.0 * bm, sk);
    if (f.bottom === 'jeans' || f.bottom === 'chinos') {
      limb(c, hipx, hipy, kx, ky, 6.1 * bm * tb, 5.0 * bm, pc); limb(c, kx, ky, ax, ay, 4.9 * bm, 3.9 * bm, pc);
    } else if (f.bottom === 'shorts') {
      limb(c, hipx, hipy, hipx + (kx - hipx) * 0.82, hipy + (ky - hipy) * 0.82, 6.2 * bm * tb, 5.4 * bm, pc);
    }
    const fa = 0.5 - b * 0.5, tx = ax + Math.cos(fa) * 10, ty = ay + Math.sin(fa) * 10;
    limb(c, ax - 1.5, ay + 0.5, tx, ty, 3.5, 2.9, shade(f.shoes, k));
    c.strokeStyle = shade(f.shoes, 0.55 * k + 0.2); c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(ax - 4, ay + 3); c.lineTo(tx + 1.5, ty + 2.2); c.stroke();
  };
  /* --- romp --- */
  const dB = 6.2 * bm, dF = 6.4 * bm;
  const torsoPath = () => {
    c.beginPath(); c.moveTo(-dB * 0.95 - buttX, 3);
    c.bezierCurveTo(-dB * 1.1 - buttX * 1.1, -6, -dB * 1.1 - humpX * 1.1, -17, -dB * 0.9 - humpX * 0.3, -24);
    c.lineTo(dB * 0.2, -25.5);
    c.bezierCurveTo(dF * 1.05, -23, dF * (fem ? 1.28 : 1.12) + chestX, -16, dF * (fem ? 0.82 : 1.0) + bellyX * 0.6, -8);
    c.bezierCurveTo(dF * (fem ? 0.72 : 0.95) + bellyX, -4, dF * 0.95 + bellyX, 0, dF * 1.0 + bellyX * 0.3, 3); c.closePath();
  };
  const torso = () => {
    c.save(); c.translate(hipx, hipy); c.rotate(lean);
    // capuchon achter de nek
    if (f.top === 'hoodie') ell(c, -dB * 0.8, -25, 5.5, 4.5, shade(f.topColor, 0.8));
    torsoPath();
    const g = c.createLinearGradient(-dB, 0, dF, 0); g.addColorStop(0, shade(f.topColor, 0.8)); g.addColorStop(0.55, f.topColor); g.addColorStop(1, shade(f.topColor, 1.12));
    c.fillStyle = f.top === 'tank' ? shade(skin, 0.95) : g; c.fill();
    c.save(); torsoPath(); c.clip();
    if (f.top === 'tank') { c.fillStyle = g; c.fillRect(-12, -20, 30, 30); c.strokeStyle = f.topColor; c.lineWidth = 2.4; c.beginPath(); c.moveTo(-3, -20); c.lineTo(-2.5, -26); c.moveTo(3, -20.5); c.lineTo(2.5, -26); c.stroke(); }
    if (f.top === 'blazer') {
      c.fillStyle = '#f2efe6'; c.beginPath(); c.moveTo(dF * 0.3, -26); c.lineTo(dF * 1.3, -9); c.lineTo(dF * 0.5, -3); c.closePath(); c.fill();
      c.strokeStyle = shade(f.topColor, 0.55); c.lineWidth = 1.2; c.beginPath(); c.moveTo(dF * 0.3, -26); c.lineTo(dF * 0.95, -8); c.lineTo(dF * 0.3, 3); c.stroke();
    }
    if (f.top === 'hoodie') {
      c.strokeStyle = shade(f.topColor, 0.7); c.lineWidth = 1; c.strokeRect(-2, -8, 8.5 * bm, 7);
      c.strokeStyle = '#eee'; c.lineWidth = 0.9; c.beginPath(); c.moveTo(dF * 0.5, -24); c.lineTo(dF * 0.55, -15); c.moveTo(dF * 0.1, -24); c.lineTo(dF * 0.1, -16); c.stroke();
    }
    if (f.top === 'tshirt' || f.top === 'long' || f.top === 'dress') { c.strokeStyle = shade(f.topColor, 0.7); c.lineWidth = 1.2; c.beginPath(); c.arc(dF * 0.25, -26, 3.8, 0.1, Math.PI * 0.85); c.stroke(); }
    if ((f.bottom === 'jeans' || f.bottom === 'chinos') && f.top !== 'dress') { // riem
      c.fillStyle = '#2a1a10'; c.fillRect(-dB - buttX, -0.5, dB + dF + buttX + bellyX * 0.3, 3); ell(c, dF * 0.8 + bellyX * 0.3, 1, 1.5, 1.2, '#c9a227');
    }
    c.restore();
    c.restore();
  };
  const skirt = () => {
    if (!(f.bottom === 'skirt' || f.top === 'dress')) return;
    const col = f.top === 'dress' ? f.topColor : f.bottomColor, sw = Math.sin(ph) * 1.5;
    c.save(); c.translate(hipx, hipy); c.rotate(lean * 0.5);
    const g = c.createLinearGradient(-dB, 0, dF + 8, 0); g.addColorStop(0, shade(col, 0.8)); g.addColorStop(1, shade(col, 1.1));
    const bb = dB + buttX * 0.9, ff = dF + bellyX * 0.5;
    c.fillStyle = g; c.beginPath(); c.moveTo(-bb, -3); c.lineTo(ff, -3);
    c.quadraticCurveTo(ff + 7, 8, ff + 10 + sw, 19); c.quadraticCurveTo(0, 22, -bb - 9 + sw, 19); c.quadraticCurveTo(-bb - 5, 8, -bb, -3); c.closePath(); c.fill();
    c.restore();
  };
  /* --- hoofd (lokale coördinaten, kijkt naar +x) --- */
  const head = () => {
    const rx = 7.6, ry = 8.8, sway = o.sway !== undefined ? o.sway : Math.sin(ph) * 1.8 * (pose === 'run' ? 1 : 0);
    // nek
    limb(c, neckBase.x, neckBase.y, hd.x, hd.y + 2, 3.5 * (fem ? 0.9 : 1) * (bm > 1 ? 1.1 : 1), 3.3, shade(skin, 0.88));
    c.save(); c.translate(hd.x, hd.y); c.rotate(lean * 0.35 + J.tilt * 0.5 + (faint ? 0 : 0));
    const hl = shade(hairCol, 1.25);
    // haar achter
    if (f.style === 'long' || f.style === 'bob') {
      const len = f.style === 'long' ? 27 : 11;
      const g = c.createLinearGradient(0, -4, 0, len); g.addColorStop(0, hairCol); g.addColorStop(1, hairDark);
      c.fillStyle = g; c.beginPath(); c.moveTo(-rx - 1, -3);
      c.bezierCurveTo(-rx - 4, 3, -rx - 3 + sway, len - 6, -rx + 1 + sway, len);
      c.lineTo(f.style === 'bob' ? rx * 0.55 : -1 + sway * 0.6, len - 1); c.lineTo(2, 2); c.closePath(); c.fill();
    } else if (f.style === 'afro') ell(c, -1.5, -3.5, 12.5, 12, hairCol);
    else if (f.style === 'ponytail') {
      limb(c, -rx - 0.5, -3, -rx - 8 - sway, 5, 3.4, 3.4, hairCol); limb(c, -rx - 8 - sway, 5, -rx - 11 - sway * 2, 16, 3.4, 1.6, hairDark);
      ell(c, -rx - 0.5, -3, 1.8, 1.8, '#c0392b');
    } else if (f.style === 'bun') ell(c, -4, -ry - 2.5, 5.2, 5, hairCol);
    else if (f.style === 'braid') {
      [[-rx - 1.5, 3], [-rx - 4 - sway * 0.5, 9], [-rx - 6 - sway, 15], [-rx - 8 - sway * 1.5, 21]].forEach(([bx, by], n) => ell(c, bx, by, 3 - n * 0.2, 3, n % 2 ? hairDark : hairCol));
      ell(c, -rx - 8.5 - sway * 1.5, 24, 1.8, 1.8, '#c0392b');
    }
    // hoofd + oor
    const hg = c.createRadialGradient(3, -2, 2, 0, 0, 11); hg.addColorStop(0, shade(skin, 1.08)); hg.addColorStop(1, shade(skin, 0.9));
    c.fillStyle = hg; c.beginPath(); c.ellipse(0, 0, rx, ry, 0, 0, 7); c.fill();
    c.beginPath(); c.ellipse(2.5, 4.8, 5.2, 4.6, 0, 0, 7); c.fill(); // kaak
    ell(c, -2.2, 1.2, 1.9, 2.8, shade(skin, 0.86)); ell(c, -2, 1.3, 0.9, 1.6, shade(skin, 0.7));
    // blos
    ell(c, 3.2, 3.4, 2.7, 2.1, fem ? 'rgba(225,100,110,.28)' : 'rgba(220,110,100,.14)');
    // gezichtsbeharing
    const hairD = shade(hairCol, 0.75);
    if (f.beard === 'stubble' || f.beard === 'beard') {
      c.save(); c.beginPath(); c.ellipse(0, 0, rx, ry, 0, 0, 7); c.ellipse(2.5, 4.8, 5.2, 4.6, 0, 0, 7); c.clip();
      if (f.beard === 'stubble') ell(c, 1.5, 6.8, 8.8, 6.2, shade(hairCol, 0.5).replace('rgb', 'rgba').replace(')', ',.22)'));
      else { c.fillStyle = hairD; c.beginPath(); c.moveTo(-6.5, 0); c.bezierCurveTo(-6.5, 9, 0, 13.5, 8.6, 8); c.lineTo(8.6, 5.2); c.bezierCurveTo(5, 6.4, 1.5, 3.6, -2, 0.5); c.closePath(); c.fill(); }
      c.restore();
    }
    if (f.beard === 'moustache' || f.beard === 'beard') ell(c, 6, 3.9, 3, 1.15, hairD, 0.12);
    // neus
    c.fillStyle = shade(skin, 0.97); c.strokeStyle = shade(skin, 0.75); c.lineWidth = 0.6;
    c.beginPath(); c.moveTo(rx - 0.8, -2); c.quadraticCurveTo(rx + 3, 1.8, rx - 0.2, 3.5); c.lineTo(rx - 1.4, 3.1); c.closePath(); c.fill(); c.stroke();
    // mond
    const smile = pose === 'cheer';
    if (faint) { ell(c, 5.8, 6.2, 1.5, 2, '#5a1a1a'); }
    else {
      c.strokeStyle = fem ? '#b8344a' : '#8a4a42'; c.lineWidth = fem ? 1.9 : 1.1;
      c.beginPath(); c.moveTo(4.2, 6); c.quadraticCurveTo(5.8, smile ? 8 : 6.5, 7.4, smile ? 5.2 : 5.6); c.stroke();
      if (smile) { c.fillStyle = '#fff'; c.beginPath(); c.moveTo(4.8, 6.1); c.quadraticCurveTo(6, 7.6, 7.2, 5.6); c.closePath(); c.fill(); }
    }
    // oog + wenkbrauw
    const ex = 3.9, ey = -1;
    if (faint > 0.4) {
      c.strokeStyle = '#222'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(ex - 2, ey - 1.8); c.lineTo(ex + 2, ey + 1.8); c.moveTo(ex + 2, ey - 1.8); c.lineTo(ex - 2, ey + 1.8); c.stroke();
    } else {
      ell(c, ex, ey, 2.2, 1.7, '#fdfdfd'); ell(c, ex + 0.7, ey + 0.1, 1.3, 1.3, f.eyes); ell(c, ex + 0.8, ey + 0.1, 0.6, 0.6, '#050505');
      c.strokeStyle = '#2a1a14'; c.lineWidth = 0.9; c.beginPath(); c.ellipse(ex, ey, 2.3, 1.8, 0, Math.PI * 1.05, Math.PI * 1.95); c.stroke();
      if (fem) { c.lineWidth = 0.9; c.beginPath(); c.moveTo(ex + 1.8, ey - 1.2); c.lineTo(ex + 3.4, ey - 2.4); c.moveTo(ex + 2.2, ey - 0.4); c.lineTo(ex + 3.8, ey - 1.1); c.stroke(); }
    }
    c.strokeStyle = shade(hairCol, 0.7); c.lineWidth = fem ? 1 : 1.5;
    c.beginPath(); c.moveTo(ex - 2.6, ey - 3.3 + (faint > 0.4 ? -0.8 : 0)); c.quadraticCurveTo(ex + 0.5, ey - 4.8, ex + 3.3, ey - 3.4); c.stroke();
    // haar voor
    const cap = (vol, fr) => {
      c.beginPath(); c.moveTo(-rx - 0.9, 3);
      c.bezierCurveTo(-rx - 2.2, -7 - vol, -3, -ry - 3.2 - vol, 2.5, -ry - 1.4 - vol * 0.6);
      c.bezierCurveTo(6, -ry - 0.6 - vol * 0.4, rx + 0.7, -5.5, rx - 0.2, -4.4 - fr);
      c.lineTo(3.8, -5.4 - fr * 0.4); c.bezierCurveTo(1.5, -6.6, -1.8, -3.8, -3.0, -0.2); c.lineTo(-3.4, 3); c.closePath();
    };
    const hg2 = c.createLinearGradient(0, -14, 0, 4); hg2.addColorStop(0, hl); hg2.addColorStop(0.5, hairCol); hg2.addColorStop(1, hairDark);
    const st = f.style;
    if (st === 'buzz') { c.globalAlpha = 0.55; cap(-2.2, 0); c.fillStyle = hairCol; c.fill(); c.globalAlpha = 1; }
    else if (st === 'mohawk') {
      c.fillStyle = hg2; c.beginPath(); c.moveTo(-6, 0); c.lineTo(-5.5, -ry - 5); c.lineTo(-2.5, -ry - 1); c.lineTo(-1, -ry - 8); c.lineTo(1.8, -ry - 1); c.lineTo(3.5, -ry - 6); c.lineTo(4.5, -ry + 1); c.lineTo(1, -3); c.closePath(); c.fill();
    } else if (st !== 'bald') {
      cap(st === 'quiff' ? 2.5 : st === 'curly' ? 1.5 : st === 'afro' ? 1 : 0.2, st === 'short' || st === 'quiff' ? 0 : 0.6);
      c.fillStyle = hg2; c.fill();
      if (st === 'quiff') ell(c, 3.5, -ry - 2.4, 5, 3.4, hl, -0.25);
      if (st === 'curly') for (let n = 0; n < 7; n++) { const an = Math.PI * (1.02 + n * 0.14); ell(c, Math.cos(an) * 8.6 - 0.5, Math.sin(an) * 9.4 - 0.5, 3.3, 3.3, n % 2 ? hairCol : hl); }
      if (st === 'long' || st === 'bob') ell(c, -2.6, 4 + (st === 'long' ? 3 : 0), 2.3, st === 'long' ? 11 : 7, hairCol);
      c.strokeStyle = shade(hairCol, 1.55); c.globalAlpha = 0.4; c.lineWidth = 1; c.beginPath(); c.arc(0, -1, 9.2, Math.PI * 1.15, Math.PI * 1.55); c.stroke(); c.globalAlpha = 1;
    }
    // bril
    if (f.glasses !== 'none') {
      c.strokeStyle = '#1c1c1c'; c.lineWidth = 1.3;
      c.beginPath(); c.moveTo(ex - 3.3, ey); c.lineTo(-2.4, 0.4); c.stroke();
      if (f.glasses === 'round') { c.fillStyle = 'rgba(190,225,255,.2)'; c.beginPath(); c.arc(ex + 0.3, ey, 3.8, 0, 7); c.fill(); c.stroke(); }
      else if (f.glasses === 'square') { c.fillStyle = 'rgba(190,225,255,.2)'; c.beginPath(); c.roundRect(ex - 3.3, ey - 3.1, 7.4, 6, 1.2); c.fill(); c.stroke(); }
      else { c.fillStyle = 'rgba(12,12,12,.92)'; c.beginPath(); c.roundRect(ex - 3.5, ey - 3.2, 8, 6.4, 2); c.fill(); c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(ex - 1.5, ey - 2.2, 1.2, 3); }
    }
    // hoed
    if (f.hat === 'cap') {
      c.fillStyle = '#2b8a3e'; c.beginPath(); c.ellipse(-0.3, -2.8, rx + 1.4, ry + 0.4, 0, Math.PI, Math.PI * 2); c.closePath(); c.fill();
      c.fillStyle = '#1f6a2e'; c.beginPath(); c.moveTo(rx + 0.2, -4); c.lineTo(rx + 9.5, -1.8); c.lineTo(rx + 9, -0.4); c.lineTo(rx - 0.5, -2.2); c.closePath(); c.fill();
      ell(c, -0.3, -ry - 0.4, 1.3, 1.1, '#1f6a2e');
    } else if (f.hat === 'beanie') {
      c.fillStyle = '#e8590c'; c.beginPath(); c.ellipse(-0.3, -3.2, rx + 1.3, ry + 1, 0, Math.PI, Math.PI * 2); c.closePath(); c.fill();
      c.fillStyle = '#c24400'; c.fillRect(-rx - 1.2, -5, rx * 2 + 2.6, 3.4); ell(c, -0.3, -ry - 2, 3.2, 3.2, '#ffd8a8');
    } else if (f.hat === 'top') {
      ell(c, 0, -6, 11.5, 2.4, '#171717'); c.fillStyle = '#222'; c.fillRect(-6.8, -22, 13.6, 16.5); c.fillStyle = '#8a1c1c'; c.fillRect(-6.8, -9.5, 13.6, 2.6);
      ell(c, 0, -22, 6.8, 1.6, '#2c2c2c');
    }
    c.restore();
  };

  arm(1); leg(1); torso(); head(); leg(0); skirt(); arm(0);
  c.restore();
}
