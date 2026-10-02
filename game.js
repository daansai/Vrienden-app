'use strict';
// Vrienden Run — een renspel door een bruin café waarin je je vrienden als poppetjes kunt namaken.
// Spel 1: groene flesjes verzamelen (sneller). Spel 2: wijnglazen verzamelen (rustiger).

const W = 800, H = 450, GROUND = 340;
const $ = id => document.getElementById(id);
const cv = $('game'), ctx = cv.getContext('2d');

/* ---------- opslag ---------- */
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
};
const DEFAULT_FRIENDS = [
  { id: 1, name: 'Speler', gender: 'm', skin: '#f1c7a0', hair: '#c9c9c9', style: 'short', shirt: '#d93636', pants: '#3b5bdb', glasses: true, hat: 'none' }
];
let friends = store.get('friends', DEFAULT_FRIENDS);
let selectedId = store.get('selected', friends[0].id);
let mode = store.get('mode', 1);
const bestKey = () => 'best' + mode;
let best = store.get(bestKey(), 0);

const MODES = {
  1: { name: 'Groene flesjes', base: 330, grow: 9, max: 780 },
  2: { name: 'Wijnglazen', base: 230, grow: 5, max: 480 }
};

/* ---------- poppetje tekenen ---------- */
// x = midden, y = voeten; staand 70 hoog, gebukt 42 hoog
function drawChar(c, f, x, y, o = {}) {
  const duck = !!o.duck, air = !!o.air, t = o.t || 0, s = o.scale || 1, faint = o.faint || 0;
  const fem = f.gender === 'f';
  c.save(); c.translate(x, y); c.scale(s, s);
  if (faint) { c.translate(0, -11 * faint); c.rotate(-faint * Math.PI / 2); }
  const legSwing = air ? 0.5 : Math.sin(t) * 0.8;
  const bodyH = duck ? 18 : 28, legH = duck ? 10 : 22;
  const hipY = -legH, shoulderY = hipY - bodyH, headR = 13, headY = shoulderY - headR + 2 + (duck ? 2 : 0);
  // benen
  c.strokeStyle = fem ? f.skin : f.pants; c.lineWidth = fem ? 6 : 8; c.lineCap = 'round';
  for (const d of [-1, 1]) {
    c.beginPath(); c.moveTo(d * 4, hipY);
    c.lineTo(d * 4 + legSwing * d * 9 * (duck ? .5 : 1), -2); c.stroke();
  }
  // lijf (+ rok bij vrouw)
  c.fillStyle = f.pants;
  if (fem) { c.beginPath(); c.moveTo(-8, hipY - 4); c.lineTo(8, hipY - 4); c.lineTo(15, hipY + 12); c.lineTo(-15, hipY + 12); c.closePath(); c.fill(); }
  c.fillStyle = f.shirt;
  const bw = fem ? 18 : 22;
  c.beginPath(); c.roundRect(-bw / 2, shoulderY, bw, bodyH + 2, 6); c.fill();
  // armen
  c.strokeStyle = f.skin; c.lineWidth = fem ? 5 : 6;
  for (const d of [-1, 1]) {
    c.beginPath(); c.moveTo(d * (bw / 2), shoulderY + 5);
    c.lineTo(d * (bw / 2 + 4) - legSwing * d * 6, shoulderY + (air ? -2 : duck ? 12 : 16)); c.stroke();
  }
  // hoofd
  c.translate(duck ? 4 : 0, 0);
  c.fillStyle = f.hair;
  if (f.style === 'long') { c.beginPath(); c.roundRect(-headR - 2, headY - 4, headR * 2 + 4, 30, 8); c.fill(); }
  if (f.style === 'bun') { c.beginPath(); c.arc(0, headY - headR - 4, 7, 0, 7); c.fill(); }
  if (f.style === 'ponytail') { c.beginPath(); c.ellipse(-headR - 3, headY + 6, 5, 13, 0.3, 0, 7); c.fill(); }
  c.fillStyle = f.skin; c.beginPath(); c.arc(0, headY, headR, 0, 7); c.fill();
  c.fillStyle = f.hair;
  const top = headY - headR;
  if (['short', 'long', 'bun', 'ponytail'].includes(f.style)) {
    c.beginPath(); c.arc(0, headY, headR + 1, Math.PI, 0); c.lineTo(headR + 1, headY - 5); c.lineTo(-headR - 1, headY - 5); c.fill();
  } else if (f.style === 'spiky') {
    c.beginPath(); c.moveTo(-headR, headY - 3);
    for (let i = 0; i < 5; i++) { c.lineTo(-headR + i * 6.5 + 3, top - 9); c.lineTo(-headR + i * 6.5 + 6.5, top + 2); }
    c.lineTo(headR, headY - 3); c.fill();
  } else if (f.style === 'mohawk') {
    c.beginPath(); c.moveTo(-3, top + 2); c.lineTo(-1, top - 12); c.lineTo(3, top - 8); c.lineTo(5, top + 2); c.fill();
  }
  if (f.hat === 'cap') { c.fillStyle = '#2b8a3e'; c.beginPath(); c.arc(0, headY - 1, headR + 1, Math.PI, 0); c.fill(); c.fillRect(0, headY - 4, headR + 8, 4); }
  if (f.hat === 'top') { c.fillStyle = '#222'; c.fillRect(-headR - 3, top + 1, headR * 2 + 6, 4); c.fillRect(-9, top - 15, 18, 17); }
  if (f.hat === 'beanie') { c.fillStyle = '#e8590c'; c.beginPath(); c.arc(0, headY - 2, headR + 1, Math.PI, 0); c.fill(); c.beginPath(); c.arc(0, top - 3, 4, 0, 7); c.fill(); }
  // gezicht
  c.strokeStyle = '#222'; c.fillStyle = '#222'; c.lineWidth = 1.6;
  for (const ex of [5, -2]) {
    if (faint > .4) { c.beginPath(); c.moveTo(ex - 2, headY - 2); c.lineTo(ex + 2, headY + 2); c.moveTo(ex + 2, headY - 2); c.lineTo(ex - 2, headY + 2); c.stroke(); }
    else { c.beginPath(); c.arc(ex, headY, 1.8, 0, 7); c.fill(); }
    if (fem && faint < .4) { c.beginPath(); c.moveTo(ex, headY - 2); c.lineTo(ex + 2.5, headY - 4.5); c.stroke(); }
  }
  if (faint > .4) { c.fillStyle = '#a33'; c.beginPath(); c.ellipse(2, headY + 6, 2.5, 3, 0, 0, 7); c.fill(); }
  else {
    c.strokeStyle = '#a33'; c.lineWidth = fem ? 2.4 : 1.5; c.beginPath(); c.arc(2, headY + 5, 3, 0.1, Math.PI - 0.1); c.stroke();
  }
  if (f.glasses) {
    c.strokeStyle = '#111'; c.lineWidth = 1.6;
    c.beginPath(); c.arc(5, headY, 4.2, 0, 7); c.stroke(); c.beginPath(); c.arc(-2, headY, 4.2, 0, 7); c.stroke();
  }
  c.restore();
}

/* ---------- menu & editor ---------- */
const current = () => friends.find(f => f.id === selectedId) || friends[0];
function saveAll() { store.set('friends', friends); store.set('selected', selectedId); }

function renderRoster() {
  const r = $('roster'); r.innerHTML = '';
  for (const f of friends) {
    const d = document.createElement('div'); d.className = 'card' + (f.id === selectedId ? ' sel' : '');
    const cc = document.createElement('canvas'); cc.width = 70; cc.height = 90;
    drawChar(cc.getContext('2d'), f, 35, 84, {});
    const n = document.createElement('div'); n.textContent = f.name;
    const e = document.createElement('button'); e.className = 'edit'; e.textContent = '✎';
    e.onclick = ev => { ev.stopPropagation(); openEditor(f); };
    d.append(cc, n, e);
    d.onclick = () => { selectedId = f.id; saveAll(); renderRoster(); };
    r.appendChild(d);
  }
  document.querySelectorAll('.mode').forEach(b => b.classList.toggle('sel', +b.dataset.mode === mode));
  $('best').textContent = best ? `Highscore ${MODES[mode].name}: ${best}` : '';
}
document.querySelectorAll('.mode').forEach(b => b.onclick = () => {
  mode = +b.dataset.mode; store.set('mode', mode); best = store.get(bestKey(), 0); renderRoster();
});

let editing = null;
const fields = { name: 'fName', gender: 'fGender', skin: 'fSkin', hair: 'fHair', style: 'fStyle', shirt: 'fShirt', pants: 'fPants', glasses: 'fGlasses', hat: 'fHat' };
function readForm() {
  const o = { id: editing.id };
  for (const [k, id] of Object.entries(fields)) o[k] = id === 'fGlasses' ? $(id).checked : $(id).value;
  o.name = o.name.trim() || 'Vriend';
  return o;
}
function drawPreview() {
  const p = $('preview').getContext('2d'); p.clearRect(0, 0, 160, 180);
  drawChar(p, readForm(), 80, 165, { scale: 1.8 });
}
function openEditor(f) {
  editing = f || { id: Date.now(), name: '', gender: 'm', skin: '#f1c7a0', hair: '#5c3a21', style: 'short', shirt: '#3b82f6', pants: '#334155', glasses: false, hat: 'none' };
  for (const [k, id] of Object.entries(fields)) {
    if (id === 'fGlasses') $(id).checked = !!editing[k]; else $(id).value = editing[k] || (k === 'gender' ? 'm' : '');
  }
  $('menu').classList.add('hidden'); $('editor').classList.remove('hidden');
  $('btnDelete').style.display = f && friends.length > 1 ? '' : 'none';
  drawPreview();
}
Object.values(fields).forEach(id => $(id).addEventListener('input', drawPreview));
$('btnNew').onclick = () => openEditor(null);
$('btnCancel').onclick = () => { $('editor').classList.add('hidden'); $('menu').classList.remove('hidden'); };
$('btnSave').onclick = () => {
  const o = readForm(), i = friends.findIndex(f => f.id === o.id);
  if (i >= 0) friends[i] = o; else friends.push(o);
  selectedId = o.id; saveAll(); renderRoster(); $('btnCancel').onclick();
};
$('btnDelete').onclick = () => {
  friends = friends.filter(f => f.id !== editing.id);
  if (selectedId === editing.id) selectedId = friends[0].id;
  saveAll(); renderRoster(); $('btnCancel').onclick();
};
$('btnPlay').onclick = startGame;
$('btnAgain').onclick = startGame;
$('btnHome').onclick = goHome;

/* ---------- spel ---------- */
let state = 'menu', player, obstacles, items, speed, score, itemCount, spawnIn, time = 0, phase = 0, faintT = 0, lastT, input = { duck: false }, jumpHeld = false;
const rnd = (a, b) => a + Math.random() * (b - a);

function startGame() {
  $('menu').classList.add('hidden'); $('over').classList.add('hidden');
  best = store.get(bestKey(), 0);
  player = { x: 150, y: GROUND, vy: 0, duck: false, f: current() };
  obstacles = []; items = []; speed = MODES[mode].base; score = 0; itemCount = 0; spawnIn = 1; time = 0; phase = 0; faintT = 0; state = 'play';
}
function goHome() {
  state = 'menu'; $('over').classList.add('hidden'); $('menu').classList.remove('hidden'); best = store.get(bestKey(), 0); renderRoster();
}
function jump() {
  if (state === 'play' && player.y >= GROUND) player.vy = -820;
}
function playerBox() {
  const h = player.duck && player.y >= GROUND ? 40 : 68;
  return { x: player.x - 12, y: player.y - h, w: 24, h };
}
function spawn() {
  const r = Math.random(), x = W + 40;
  let o;
  if (r < 0.4) o = { type: 'barrel', x, w: 44, h: 38, y: GROUND - 38 };
  else if (r < 0.6) o = { type: 'shards', x, w: 60, h: 28, y: GROUND - 28 };
  else if (r < 0.8) o = { type: 'crates', x, w: 36, h: 66, y: GROUND - 66 };
  else o = { type: 'bird', x, w: 46, h: 26, y: GROUND - rnd(78, 92) };
  obstacles.push(o);
  // items: boog boven grondobstakel, lage rij bij vogel
  const n = 3 + (Math.random() * 3 | 0);
  if (o.type === 'bird') {
    for (let i = 0; i < n; i++) items.push({ x: x - 60 + i * 34, y: GROUND - 22, got: false });
  } else if (Math.random() < 0.8) {
    for (let i = 0; i < n; i++) {
      const k = i / (n - 1), arcY = Math.sin(k * Math.PI) * 90;
      items.push({ x: x + o.w / 2 - 50 + k * 100, y: o.y - 40 - arcY, got: false });
    }
  }
  spawnIn = (rnd(0.9, 1.7) * (1 + (500 - Math.min(speed, 500)) / 900)) * (400 / speed) + 0.35;
}
function faintNow() {
  state = 'faint'; faintT = 0;
  const s = Math.floor(score);
  if (s > best) { best = s; store.set(bestKey(), best); }
}
function update(dt) {
  const M = MODES[mode];
  if (state === 'faint') {
    faintT += dt;
    if (player.y < GROUND || player.vy < 0) { player.vy += 2300 * dt; player.y = Math.min(GROUND, player.y + player.vy * dt); if (player.y >= GROUND) player.vy = 0; }
    if (faintT > 1.3) {
      state = 'over';
      $('overScore').textContent = `Score ${Math.floor(score)}  ·  ${M.name}: ${itemCount}  ·  Highscore ${best}`;
      $('over').classList.remove('hidden');
    }
    return;
  }
  if (state !== 'play') return;
  time += dt; speed = Math.min(M.max, M.base + time * M.grow); score += speed * dt / 40; phase += dt * speed / 24;
  player.duck = input.duck;
  if (player.y < GROUND || player.vy < 0) {
    player.vy += (input.duck && player.y < GROUND ? 4200 : 2300) * dt; // snel naar beneden vallen met bukken
    player.y += player.vy * dt;
    if (player.y >= GROUND) { player.y = GROUND; player.vy = 0; }
  }
  spawnIn -= dt; if (spawnIn <= 0) spawn();
  const pb = playerBox();
  for (const o of obstacles) {
    o.x -= speed * dt;
    const hit = o.type === 'shards'
      ? pb.x < o.x + o.w - 8 && pb.x + pb.w > o.x + 8 && pb.y + pb.h > o.y + 6
      : pb.x < o.x + o.w - 4 && pb.x + pb.w > o.x + 4 && pb.y < o.y + o.h - 3 && pb.y + pb.h > o.y + 3;
    if (hit) return faintNow();
  }
  for (const c of items) {
    c.x -= speed * dt;
    if (!c.got && Math.abs(c.x - player.x) < 26 && c.y > pb.y - 14 && c.y < pb.y + pb.h + 14) { c.got = true; itemCount++; }
  }
  obstacles = obstacles.filter(o => o.x > -100);
  items = items.filter(c => c.x > -50 && !c.got);
}

/* ---------- tekenen ---------- */
let bgX = 0;
function drawItem(x, y, k = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
  if (mode === 1) { // groen flesje
    ctx.fillStyle = '#2f9e44'; ctx.strokeStyle = '#175c26'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(-7, -4, 14, 22, 4); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.roundRect(-3, -17, 6, 15, 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#e9ecef'; ctx.fillRect(-6, 3, 12, 8);
    ctx.fillStyle = '#ffd43b'; ctx.fillRect(-3, -19, 6, 3);
    ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(-5, -2, 2, 5);
    ctx.translate(0, -2);
  } else { // wijnglas
    ctx.strokeStyle = '#dbe9f4'; ctx.lineWidth = 2;
    ctx.fillStyle = 'rgba(255,255,255,.25)';
    ctx.beginPath(); ctx.moveTo(-10, -14); ctx.quadraticCurveTo(-11, 4, 0, 5); ctx.quadraticCurveTo(11, 4, 10, -14); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#a61e4d';
    ctx.beginPath(); ctx.moveTo(-9.3, -6); ctx.quadraticCurveTo(-10, 3.5, 0, 4.2); ctx.quadraticCurveTo(10, 3.5, 9.3, -6); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, 5); ctx.lineTo(0, 17); ctx.moveTo(-8, 18); ctx.lineTo(8, 18); ctx.stroke();
  }
  ctx.restore();
}
function drawObstacle(o) {
  ctx.save(); ctx.translate(o.x, o.y);
  if (o.type === 'barrel') {
    ctx.fillStyle = '#a0612a'; ctx.strokeStyle = '#3b2412'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(4, 0); ctx.quadraticCurveTo(-4, o.h / 2, 4, o.h); ctx.lineTo(o.w - 4, o.h); ctx.quadraticCurveTo(o.w + 4, o.h / 2, o.w - 4, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#4a4a4a'; ctx.fillRect(0, 8, o.w, 4); ctx.fillRect(0, o.h - 12, o.w, 4);
  } else if (o.type === 'crates') {
    for (let i = 0; i < 2; i++) {
      const yy = i * 33;
      ctx.fillStyle = '#c28a4a'; ctx.strokeStyle = '#3b2412'; ctx.lineWidth = 3;
      ctx.fillRect(0, yy, o.w, 33); ctx.strokeRect(0, yy, o.w, 33);
      ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(o.w, yy + 33); ctx.moveTo(o.w, yy); ctx.lineTo(0, yy + 33); ctx.stroke();
    }
  } else if (o.type === 'shards') {
    ctx.fillStyle = '#d9b36a'; ctx.beginPath(); ctx.ellipse(30, o.h - 3, 32, 5, 0, 0, 7); ctx.fill(); // gemorst bier
    ctx.fillStyle = '#b8e3d0'; ctx.strokeStyle = '#2f6b55'; ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(i * 20, o.h - 2); ctx.lineTo(i * 20 + 9, 0); ctx.lineTo(i * 20 + 20, o.h - 2); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  } else { // duif
    const flap = Math.sin(time * 18 + o.x) * 12;
    ctx.fillStyle = '#8d96a3'; ctx.strokeStyle = '#3a3f47'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(23, 15, 15, 9, 0, 0, 7); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(8, 9, 6, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#f59f00'; ctx.beginPath(); ctx.moveTo(2, 9); ctx.lineTo(-5, 11); ctx.lineTo(3, 13); ctx.fill();
    ctx.fillStyle = '#8d96a3'; ctx.beginPath(); ctx.moveTo(20, 12); ctx.quadraticCurveTo(26, -8 - flap, 38, 4 - flap); ctx.lineTo(30, 14); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#111'; ctx.fillRect(6, 7, 3, 3);
  }
  ctx.restore();
}
const PAL = ['#2f9e44', '#e8590c', '#c92a2a', '#f08c00', '#1c7ed6', '#7048e8'];
function drawBg() {
  // muur met behang
  ctx.fillStyle = '#8a5a34'; ctx.fillRect(0, 0, W, 250);
  ctx.fillStyle = '#7f5130';
  let off = (bgX * .2) % 60;
  for (let x = -60; x < W + 60; x += 60) ctx.fillRect(x - off, 0, 30, 250);
  // plafondbalk
  ctx.fillStyle = '#4a2a16'; ctx.fillRect(0, 0, W, 24); ctx.fillStyle = '#6b4023'; ctx.fillRect(0, 24, W, 5);
  // schilderijtjes
  off = (bgX * .3) % 470; const pb = Math.floor((bgX * .3) / 470);
  for (let i = -1; i < 3; i++) {
    const x = i * 470 + 120 - off, k = pb + i;
    ctx.fillStyle = '#d4a017'; ctx.fillRect(x, 50, 64, 50);
    ctx.fillStyle = ['#a5d8ff', '#ffd8a8', '#d8f5a2'][((k % 3) + 3) % 3]; ctx.fillRect(x + 5, 55, 54, 40);
    ctx.fillStyle = '#5c7cfa'; ctx.beginPath(); ctx.arc(x + 32, 80, 11, 0, 7); ctx.fill();
  }
  // plank met flessen en glazen
  off = (bgX * .35) % 330; const sb = Math.floor((bgX * .35) / 330);
  for (let i = -1; i < 4; i++) {
    const x = i * 330 - off + 20, k = sb + i;
    ctx.fillStyle = '#4a2a16'; ctx.fillRect(x, 162, 230, 8);
    for (let j = 0; j < 7; j++) {
      const bx = x + 12 + j * 31, col = PAL[(((k * 3 + j) % 6) + 6) % 6];
      if ((j + k) % 3 === 0) { // wijnglas
        ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(bx - 7, 138); ctx.quadraticCurveTo(bx, 156, bx + 7, 138); ctx.moveTo(bx, 150); ctx.lineTo(bx, 160); ctx.stroke();
      } else { ctx.fillStyle = col; ctx.beginPath(); ctx.roundRect(bx - 7, 138, 14, 24, 4); ctx.fill(); ctx.fillRect(bx - 3, 124, 6, 16); }
    }
  }
  // hanglampen
  off = (bgX * .5) % 400;
  for (let i = -1; i < 3; i++) {
    const x = i * 400 + 260 - off;
    const g = ctx.createRadialGradient(x, 100, 5, x, 100, 120); g.addColorStop(0, 'rgba(255,214,102,.55)'); g.addColorStop(1, 'rgba(255,214,102,0)');
    ctx.fillStyle = g; ctx.fillRect(x - 120, 0, 240, 240);
    ctx.strokeStyle = '#2a1608'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, 29); ctx.lineTo(x, 70); ctx.stroke();
    ctx.fillStyle = '#2f7a3d'; ctx.beginPath(); ctx.moveTo(x - 10, 70); ctx.lineTo(x + 10, 70); ctx.lineTo(x + 26, 98); ctx.lineTo(x - 26, 98); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffe066'; ctx.beginPath(); ctx.ellipse(x, 99, 22, 5, 0, 0, 7); ctx.fill();
  }
  // lambrisering
  ctx.fillStyle = '#5e3a1f'; ctx.fillRect(0, 250, W, GROUND - 250);
  ctx.fillStyle = '#a06a3c'; ctx.fillRect(0, 250, W, 8);
  off = (bgX * .6) % 100; ctx.strokeStyle = '#3f2512'; ctx.lineWidth = 3;
  for (let x = -100; x < W + 100; x += 100) ctx.strokeRect(x - off + 12, 270, 76, 56);
  // houten vloer
  ctx.fillStyle = '#7a4a24'; ctx.fillRect(0, GROUND, W, H - GROUND);
  ctx.fillStyle = '#3b2412'; ctx.fillRect(0, GROUND, W, 5);
  ctx.strokeStyle = '#5a3418'; ctx.lineWidth = 3;
  for (const y of [GROUND + 36, GROUND + 72]) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  off = bgX % 120;
  for (let row = 0; row < 3; row++) for (let x = -120 + row * 40; x < W + 120; x += 120) {
    ctx.beginPath(); ctx.moveTo(x - off, GROUND + row * 36 + 5); ctx.lineTo(x - off, GROUND + row * 36 + 36); ctx.stroke();
  }
}
function drawHUD() {
  ctx.fillStyle = 'rgba(0,0,0,.55)';
  ctx.beginPath(); ctx.roundRect(14, 12, 130, 36, 18); ctx.roundRect(170, 12, 130, 36, 18); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 22px system-ui'; ctx.textBaseline = 'middle';
  ctx.fillText('🏃 ' + Math.floor(score), 30, 31);
  drawItem(194, 33, .8); ctx.fillText(itemCount, 224, 31);
  ctx.textAlign = 'right'; ctx.font = '16px system-ui'; ctx.fillStyle = '#ffd'; ctx.fillText('Best ' + best, W - 16, 30); ctx.textAlign = 'left';
}
const buttons = [{ key: 'duck', x: 20, y: H - 84, w: 70, h: 64 }, { key: 'jump', x: W - 90, y: H - 84, w: 70, h: 64 }];
function drawButtons() {
  for (const b of buttons) {
    ctx.fillStyle = (b.key === 'duck' ? input.duck : jumpHeld) ? '#7ed957' : '#5cc437';
    ctx.globalAlpha = .85; ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, b.h, 16); ctx.fill(); ctx.globalAlpha = 1;
    ctx.fillStyle = '#fff'; ctx.beginPath();
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2, d = b.key === 'jump' ? -1 : 1;
    ctx.moveTo(cx, cy + d * 16); ctx.lineTo(cx - 18, cy - d * 4); ctx.lineTo(cx - 8, cy - d * 4); ctx.lineTo(cx - 8, cy - d * 16);
    ctx.lineTo(cx + 8, cy - d * 16); ctx.lineTo(cx + 8, cy - d * 4); ctx.lineTo(cx + 18, cy - d * 4); ctx.closePath(); ctx.fill();
  }
}
function drawStars(cx, cy, t) {
  ctx.fillStyle = '#ffd43b'; ctx.strokeStyle = '#c98a00'; ctx.lineWidth = 1.5;
  for (let i = 0; i < 3; i++) {
    const a = t * 4 + i * 2.1, x = cx + Math.cos(a) * 26, y = cy - 18 + Math.sin(a) * 8;
    ctx.beginPath();
    for (let p = 0; p < 10; p++) { const r = p % 2 ? 3.5 : 8, an = p * Math.PI / 5 - Math.PI / 2; ctx.lineTo(x + Math.cos(an) * r, y + Math.sin(an) * r); }
    ctx.closePath(); ctx.fill(); ctx.stroke();
  }
}
function render() {
  if (state === 'play') bgX += speed * (1 / 60);
  drawBg();
  if (state === 'menu') return;
  for (const c of items) drawItem(c.x, c.y + Math.sin(time * 5 + c.x * .05) * 3);
  obstacles.forEach(drawObstacle);
  const fa = (state === 'faint' || state === 'over') ? Math.min(1, faintT / 0.35) : 0;
  drawChar(ctx, player.f, player.x, player.y, { duck: player.duck && player.y >= GROUND && !fa, air: player.y < GROUND && !fa, t: phase, faint: fa });
  if (fa) {
    const th = fa * Math.PI / 2;
    drawStars(player.x - 62 * Math.sin(th), player.y - 62 * Math.cos(th) - 11 * fa, faintT);
  }
  drawHUD();
  if (state === 'play') drawButtons();
  if (state === 'play') { ctx.fillStyle = '#ffc933'; ctx.font = 'bold 14px system-ui'; ctx.textAlign = 'center'; ctx.fillText(player.f.name, player.x, player.y - 100); ctx.textAlign = 'left'; }
}
function loop(ts) {
  const dt = Math.min(0.05, ((ts - (lastT || ts)) / 1000)); lastT = ts;
  update(dt); render(); requestAnimationFrame(loop);
}

/* ---------- invoer ---------- */
const JUMP = ['ArrowUp', 'Space', 'KeyW'], DUCK = ['ArrowDown', 'KeyS'];
addEventListener('keydown', e => {
  if (/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
  if (JUMP.includes(e.code)) { e.preventDefault(); if (!e.repeat) { if (state === 'over') startGame(); else jump(); } }
  if (DUCK.includes(e.code)) { e.preventDefault(); input.duck = true; }
  if (e.code === 'Escape' && state !== 'menu') goHome();
});
addEventListener('keyup', e => { if (DUCK.includes(e.code)) input.duck = false; });

function pointerPos(e) { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height }; }
const active = new Map();
cv.addEventListener('pointerdown', e => {
  e.preventDefault();
  const left = pointerPos(e).x < W / 2;
  active.set(e.pointerId, left ? 'duck' : 'jump');
  if (left) input.duck = true; else { jumpHeld = true; jump(); }
});
const release = e => {
  const k = active.get(e.pointerId); active.delete(e.pointerId);
  if (k === 'duck' && ![...active.values()].includes('duck')) input.duck = false;
  if (k === 'jump') jumpHeld = false;
};
cv.addEventListener('pointerup', release); cv.addEventListener('pointercancel', release);

renderRoster();
requestAnimationFrame(loop);
