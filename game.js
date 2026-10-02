'use strict';
// Vrienden Run — een Kaasje/dino-achtig renspel waarin je je vrienden als poppetjes kunt namaken.

const W = 800, H = 450, GROUND = 340;
const $ = id => document.getElementById(id);
const cv = $('game'), ctx = cv.getContext('2d');

/* ---------- opslag ---------- */
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
};
const DEFAULT_FRIENDS = [
  { id: 1, name: 'Kaasje', skin: '#f1c7a0', hair: '#c9c9c9', style: 'short', shirt: '#d93636', pants: '#3b5bdb', glasses: true, hat: 'none' }
];
let friends = store.get('friends', DEFAULT_FRIENDS);
let selectedId = store.get('selected', friends[0].id);
let best = store.get('best', 0);

/* ---------- poppetje tekenen ---------- */
function drawChar(c, f, x, y, o = {}) {
  // x = midden, y = voeten; staand 70 hoog, gebukt 42 hoog
  const duck = !!o.duck, air = !!o.air, t = o.t || 0, s = o.scale || 1;
  c.save(); c.translate(x, y); c.scale(s, s);
  const legSwing = air ? 0.5 : Math.sin(t * 14) * 0.8;
  const bodyH = duck ? 18 : 28, legH = duck ? 10 : 22;
  const hipY = -legH, shoulderY = hipY - bodyH, headR = 13, headY = shoulderY - headR + 2 + (duck ? 2 : 0);
  // benen
  c.strokeStyle = f.pants; c.lineWidth = 8; c.lineCap = 'round';
  for (const d of [-1, 1]) {
    c.beginPath(); c.moveTo(d * 4, hipY);
    c.lineTo(d * 4 + legSwing * d * 9 * (duck ? .5 : 1), -2); c.stroke();
  }
  // lijf
  c.fillStyle = f.shirt;
  c.beginPath(); c.roundRect(-11, shoulderY, 22, bodyH + 2, 6); c.fill();
  // armen
  c.strokeStyle = f.skin; c.lineWidth = 6;
  for (const d of [-1, 1]) {
    c.beginPath(); c.moveTo(d * 11, shoulderY + 5);
    c.lineTo(d * 15 - legSwing * d * 6, shoulderY + (air ? -2 : duck ? 12 : 16)); c.stroke();
  }
  // hoofd
  const hx = duck ? 4 : 0;
  c.translate(hx, 0);
  // haar achter
  c.fillStyle = f.hair;
  if (f.style === 'long') { c.beginPath(); c.roundRect(-headR - 2, headY - 4, headR * 2 + 4, 30, 8); c.fill(); }
  if (f.style === 'bun') { c.beginPath(); c.arc(0, headY - headR - 4, 7, 0, 7); c.fill(); }
  c.fillStyle = f.skin; c.beginPath(); c.arc(0, headY, headR, 0, 7); c.fill();
  // haar voor
  c.fillStyle = f.hair;
  const top = headY - headR;
  if (f.style === 'short' || f.style === 'long' || f.style === 'bun') {
    c.beginPath(); c.arc(0, headY, headR + 1, Math.PI, 0); c.lineTo(headR + 1, headY - 5); c.lineTo(-headR - 1, headY - 5); c.fill();
  } else if (f.style === 'spiky') {
    c.beginPath(); c.moveTo(-headR, headY - 3);
    for (let i = 0; i < 5; i++) { c.lineTo(-headR + i * 6.5 + 3, top - 9); c.lineTo(-headR + i * 6.5 + 6.5, top + 2); }
    c.lineTo(headR, headY - 3); c.fill();
  } else if (f.style === 'mohawk') {
    c.beginPath(); c.moveTo(-3, top + 2); c.lineTo(-1, top - 12); c.lineTo(3, top - 8); c.lineTo(5, top + 2); c.fill();
  }
  // hoed
  if (f.hat === 'cap') { c.fillStyle = '#2b8a3e'; c.beginPath(); c.arc(0, headY - 1, headR + 1, Math.PI, 0); c.fill(); c.fillRect(0, headY - 4, headR + 8, 4); }
  if (f.hat === 'top') { c.fillStyle = '#222'; c.fillRect(-headR - 3, top + 1, headR * 2 + 6, 4); c.fillRect(-9, top - 15, 18, 17); }
  if (f.hat === 'beanie') { c.fillStyle = '#e8590c'; c.beginPath(); c.arc(0, headY - 2, headR + 1, Math.PI, 0); c.fill(); c.beginPath(); c.arc(0, top - 3, 4, 0, 7); c.fill(); }
  // gezicht
  c.fillStyle = '#222'; c.beginPath(); c.arc(5, headY, 1.8, 0, 7); c.arc(-2, headY, 1.8, 0, 7); c.fill();
  c.strokeStyle = '#a33'; c.lineWidth = 1.5; c.beginPath(); c.arc(2, headY + 5, 3, 0.1, Math.PI - 0.1); c.stroke();
  if (f.glasses) {
    c.strokeStyle = '#111'; c.lineWidth = 1.6;
    c.beginPath(); c.arc(5, headY, 4.2, 0, 7); c.stroke(); c.beginPath(); c.arc(-2, headY, 4.2, 0, 7); c.stroke();
    c.beginPath(); c.moveTo(1.4, headY); c.lineTo(1.2, headY); c.stroke();
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
    drawChar(cc.getContext('2d'), f, 35, 84, { scale: 1 });
    const n = document.createElement('div'); n.textContent = f.name;
    const e = document.createElement('button'); e.className = 'edit'; e.textContent = '✎';
    e.onclick = ev => { ev.stopPropagation(); openEditor(f); };
    d.append(cc, n, e);
    d.onclick = () => { selectedId = f.id; saveAll(); renderRoster(); };
    r.appendChild(d);
  }
  $('best').textContent = best ? 'Highscore: ' + best : '';
}

let editing = null;
const fields = { name: 'fName', skin: 'fSkin', hair: 'fHair', style: 'fStyle', shirt: 'fShirt', pants: 'fPants', glasses: 'fGlasses', hat: 'fHat' };
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
  editing = f || { id: Date.now(), name: '', skin: '#f1c7a0', hair: '#5c3a21', style: 'short', shirt: '#3b82f6', pants: '#334155', glasses: false, hat: 'none' };
  for (const [k, id] of Object.entries(fields)) { if (id === 'fGlasses') $(id).checked = !!editing[k]; else $(id).value = editing[k]; }
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

/* ---------- spel ---------- */
let state = 'menu', player, obstacles, cheeses, speed, score, cheeseCount, spawnIn, time, lastT, input = { duck: false }, shake = 0;
const rnd = (a, b) => a + Math.random() * (b - a);

function startGame() {
  $('menu').classList.add('hidden');
  player = { x: 150, y: GROUND, vy: 0, duck: false, f: current() };
  obstacles = []; cheeses = []; speed = 330; score = 0; cheeseCount = 0; spawnIn = 1; time = 0; state = 'play';
}
function jump() {
  if (state !== 'play') { if (state === 'over' && overTimer <= 0) startGame(); return; }
  if (player.y >= GROUND) { player.vy = -820; }
}
function playerBox() {
  const h = player.duck && player.y >= GROUND ? 40 : 68;
  return { x: player.x - 12, y: player.y - h, w: 24, h };
}
function spawn() {
  const r = Math.random(), x = W + 40;
  let o;
  if (r < 0.4) o = { type: 'rock', x, w: 44, h: 38, y: GROUND - 38 };
  else if (r < 0.6) o = { type: 'spike', x, w: 60, h: 28, y: GROUND - 28 };
  else if (r < 0.8) o = { type: 'tall', x, w: 34, h: 66, y: GROUND - 66 };
  else o = { type: 'bat', x, w: 46, h: 26, y: GROUND - rnd(78, 92) };
  obstacles.push(o);
  // kaasjes: boog boven grondobstakel, lage rij bij vleermuis
  const n = 3 + (Math.random() * 3 | 0);
  if (o.type === 'bat') {
    for (let i = 0; i < n; i++) cheeses.push({ x: x - 60 + i * 34, y: GROUND - 20, got: false });
  } else if (Math.random() < 0.8) {
    for (let i = 0; i < n; i++) {
      const k = i / (n - 1), arcY = Math.sin(k * Math.PI) * 90;
      cheeses.push({ x: x + o.w / 2 - 50 + k * 100, y: o.y - 40 - arcY, got: false });
    }
  }
  spawnIn = (rnd(0.9, 1.7) * (1 + (500 - Math.min(speed, 500)) / 900)) * (400 / speed) + 0.35;
}
let overTimer = 0;
function die() {
  state = 'over'; overTimer = 0.6; shake = 0.3;
  const s = Math.floor(score);
  if (s > best) { best = s; store.set('best', best); }
  renderRoster();
}
function update(dt) {
  if (state !== 'play') { overTimer -= dt; shake = Math.max(0, shake - dt); return; }
  time += dt; speed = Math.min(780, 330 + time * 9); score += speed * dt / 40;
  // fysica
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
    const hit = o.type === 'spike'
      ? pb.x < o.x + o.w - 8 && pb.x + pb.w > o.x + 8 && pb.y + pb.h > o.y + 6
      : pb.x < o.x + o.w - 4 && pb.x + pb.w > o.x + 4 && pb.y < o.y + o.h - 3 && pb.y + pb.h > o.y + 3;
    if (hit) return die();
  }
  for (const c of cheeses) {
    c.x -= speed * dt;
    if (!c.got && Math.abs(c.x - player.x) < 26 && c.y > pb.y - 14 && c.y < pb.y + pb.h + 14) { c.got = true; cheeseCount++; }
  }
  obstacles = obstacles.filter(o => o.x > -100);
  cheeses = cheeses.filter(c => c.x > -50 && !c.got);
}

/* ---------- tekenen ---------- */
let bgX = 0;
function drawCheese(x, y, r = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(r, r);
  ctx.fillStyle = '#ffc933'; ctx.strokeStyle = '#c98a00'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-14, 8); ctx.lineTo(14, 8); ctx.lineTo(14, -2); ctx.lineTo(-14, -8); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#e09b00'; ctx.beginPath(); ctx.arc(-4, 2, 2.5, 0, 7); ctx.arc(7, 3, 2, 0, 7); ctx.fill();
  ctx.restore();
}
function drawObstacle(o) {
  ctx.save(); ctx.translate(o.x, o.y);
  if (o.type === 'rock' || o.type === 'tall') {
    ctx.fillStyle = '#6b5b6e'; ctx.strokeStyle = '#2b2030'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, o.h); ctx.lineTo(o.w * .1, o.h * .3); ctx.lineTo(o.w * .45, 0); ctx.lineTo(o.w * .9, o.h * .25); ctx.lineTo(o.w, o.h); ctx.closePath(); ctx.fill(); ctx.stroke();
  } else if (o.type === 'spike') {
    ctx.fillStyle = '#c0392b'; ctx.strokeStyle = '#531'; ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(i * 20, o.h); ctx.lineTo(i * 20 + 10, 0); ctx.lineTo(i * 20 + 20, o.h); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  } else {
    const flap = Math.sin(time * 18 + o.x) * 10;
    ctx.fillStyle = '#3a2a4a'; ctx.strokeStyle = '#150d1d'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(23, 14, 10, 9, 0, 0, 7); ctx.fill(); ctx.stroke();
    for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(23 + d * 8, 12); ctx.quadraticCurveTo(23 + d * 24, 0 - flap, 23 + d * 22, 16 + flap / 2); ctx.lineTo(23 + d * 8, 18); ctx.fill(); ctx.stroke(); }
    ctx.fillStyle = '#ff5555'; ctx.fillRect(19, 11, 3, 3); ctx.fillRect(25, 11, 3, 3);
  }
  ctx.restore();
}
function drawBg() {
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#3a1f2b'); g.addColorStop(1, '#5a2a22');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // stalactieten (parallax)
  ctx.fillStyle = '#2a1520';
  const off = (bgX * .3) % 160;
  for (let x = -160; x < W + 160; x += 160) {
    ctx.beginPath(); ctx.moveTo(x - off - 40, 0); ctx.lineTo(x - off + 40, 0); ctx.lineTo(x - off, 90 + (x % 3) * 30); ctx.fill();
  }
  ctx.fillStyle = '#3d2230';
  const off2 = (bgX * .6) % 240;
  for (let x = -240; x < W + 240; x += 240) {
    ctx.beginPath(); ctx.moveTo(x - off2 + 50, GROUND); ctx.lineTo(x - off2 + 110, 120); ctx.lineTo(x - off2 + 170, GROUND); ctx.fill();
  }
  // lava
  ctx.fillStyle = '#e8590c'; ctx.fillRect(0, GROUND + 30, W, H);
  ctx.fillStyle = '#ffa94d'; for (let x = -40; x < W + 40; x += 80) ctx.fillRect(x - (bgX % 80), GROUND + 36 + Math.sin(x + time * 3) * 2, 40, 5);
  // pad van ronde stenen
  ctx.fillStyle = '#c98a8a'; ctx.strokeStyle = '#6e3b3b'; ctx.lineWidth = 3;
  for (let x = -40; x < W + 40; x += 40) { ctx.beginPath(); ctx.arc(x - (bgX % 40) + 20, GROUND + 12, 19, 0, 7); ctx.fill(); ctx.stroke(); }
}
function drawHUD() {
  ctx.fillStyle = 'rgba(0,0,0,.55)';
  ctx.beginPath(); ctx.roundRect(14, 12, 130, 36, 18); ctx.roundRect(170, 12, 130, 36, 18); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 22px system-ui'; ctx.textBaseline = 'middle';
  ctx.fillText('🏃 ' + Math.floor(score), 30, 31);
  drawCheese(196, 31, .8); ctx.fillText(cheeseCount, 224, 31);
  ctx.textAlign = 'right'; ctx.font = '16px system-ui'; ctx.fillStyle = '#ffd'; ctx.fillText('Best ' + best, W - 16, 30); ctx.textAlign = 'left';
}
function drawButtons() {
  for (const b of buttons) {
    ctx.fillStyle = input[b.key] || (b.key === 'jump' && jumpHeld) ? '#7ed957' : '#5cc437';
    ctx.globalAlpha = .85; ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, b.h, 16); ctx.fill(); ctx.globalAlpha = 1;
    ctx.fillStyle = '#fff'; ctx.beginPath();
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2, d = b.key === 'jump' ? -1 : 1;
    ctx.moveTo(cx, cy + d * 16); ctx.lineTo(cx - 18, cy - d * 4); ctx.lineTo(cx - 8, cy - d * 4); ctx.lineTo(cx - 8, cy - d * 16);
    ctx.lineTo(cx + 8, cy - d * 16); ctx.lineTo(cx + 8, cy - d * 4); ctx.lineTo(cx + 18, cy - d * 4); ctx.closePath(); ctx.fill();
  }
}
const buttons = [{ key: 'duck', x: 20, y: H - 84, w: 70, h: 64 }, { key: 'jump', x: W - 90, y: H - 84, w: 70, h: 64 }];
let jumpHeld = false;

function render() {
  if (state === 'play') bgX += speed * (1 / 60);
  ctx.save();
  if (shake > 0) ctx.translate(rnd(-5, 5), rnd(-5, 5));
  drawBg();
  if (state !== 'menu') {
    for (const c of cheeses) drawCheese(c.x, c.y + Math.sin(time * 5 + c.x * .05) * 3);
    obstacles.forEach(drawObstacle);
    drawChar(ctx, player.f, player.x, player.y, { duck: player.duck && player.y >= GROUND, air: player.y < GROUND, t: state === 'play' ? time : 0 });
    drawHUD(); drawButtons();
    ctx.fillStyle = '#ffc933'; ctx.font = 'bold 14px system-ui'; ctx.textAlign = 'center'; ctx.fillText(player.f.name, player.x, player.y - 100); ctx.textAlign = 'left';
  }
  if (state === 'over') {
    ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
    ctx.font = 'bold 48px system-ui'; ctx.fillText('Au!', W / 2, 150);
    ctx.font = '24px system-ui'; ctx.fillText(`Score ${Math.floor(score)}  ·  Kaas ${cheeseCount}  ·  Best ${best}`, W / 2, 200);
    ctx.fillText('Tik of druk op spatie om opnieuw te spelen', W / 2, 250);
    ctx.font = '18px system-ui'; ctx.fillStyle = '#ffd'; ctx.fillText('Esc = menu', W / 2, 290); ctx.textAlign = 'left';
  }
  ctx.restore();
}
function loop(ts) {
  const dt = Math.min(0.05, ((ts - (lastT || ts)) / 1000)); lastT = ts;
  update(dt); render(); requestAnimationFrame(loop);
}

/* ---------- invoer ---------- */
const JUMP = ['ArrowUp', 'Space', 'KeyW'], DUCK = ['ArrowDown', 'KeyS'];
addEventListener('keydown', e => {
  if (/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
  if (JUMP.includes(e.code)) { e.preventDefault(); if (!e.repeat) jump(); }
  if (DUCK.includes(e.code)) { e.preventDefault(); input.duck = true; }
  if (e.code === 'Escape' && state !== 'menu') { state = 'menu'; $('menu').classList.remove('hidden'); renderRoster(); }
});
addEventListener('keyup', e => { if (DUCK.includes(e.code)) input.duck = false; });

function pointerPos(e) { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height }; }
const active = new Map();
cv.addEventListener('pointerdown', e => {
  e.preventDefault();
  const p = pointerPos(e);
  const left = p.x < W / 2;
  active.set(e.pointerId, left ? 'duck' : 'jump');
  if (left) { if (state === 'over') jump(); else input.duck = true; } else { jumpHeld = true; jump(); }
});
const release = e => {
  const k = active.get(e.pointerId); active.delete(e.pointerId);
  if (k === 'duck' && ![...active.values()].includes('duck')) input.duck = false;
  if (k === 'jump') jumpHeld = false;
};
cv.addEventListener('pointerup', release); cv.addEventListener('pointercancel', release);

renderRoster();
requestAnimationFrame(loop);
