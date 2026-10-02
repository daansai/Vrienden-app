'use strict';
// Vrienden Run — een renspel door een bruin café waarin je je vrienden als poppetjes kunt namaken.
// Spel 1: pak groene bierflesjes, je bierglas wordt leger. Spel 2: pak wijnglazen, je wijnglas wordt leger.
// Een shotje vult je glas weer een beetje bij. Is het glas leeg, dan win je. Raak je iets anders, dan val je flauw.
// (Het poppetje zelf wordt getekend door character.js)

const W = 800, H = 450, GROUND = 340;
const $ = id => document.getElementById(id);
const cv = $('game'), ctx = cv.getContext('2d');

/* ---------- opslag ---------- */
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
};
const DEFAULT_FRIENDS = [{ id: 1, name: 'Speler' }];
let friends = store.get('friends', DEFAULT_FRIENDS).map(normalize);
let selectedId = store.get('selected', friends[0].id);
let mode = store.get('mode', 1);
const bestKey = () => 'best' + mode;
let best = store.get(bestKey(), 0);

// drain = hoeveel van het glas er per flesje/wijnglas uitgaat, refill = hoeveel een shotje bijvult
const MODES = {
  1: { name: 'Bierflesjes', base: 330, grow: 9, max: 780, drain: 0.035, refill: 0.08 },
  2: { name: 'Wijnglazen', base: 330, grow: 9, max: 780, drain: 0.075, refill: 0.09 } // zelfde tempo als bier; wijn is sterker, dus het glas gaat sneller leeg
};

/* ---------- menu ---------- */
const current = () => friends.find(f => f.id === selectedId) || friends[0];
function saveAll() { store.set('friends', friends); store.set('selected', selectedId); }

function renderRoster() {
  const r = $('roster'); r.innerHTML = '';
  for (const f of friends) {
    const d = document.createElement('div'); d.className = 'card' + (f.id === selectedId ? ' sel' : '');
    const cc = document.createElement('canvas'); cc.width = 80; cc.height = 120;
    drawChar(cc.getContext('2d'), f, 40, 112, { pose: 'idle', scale: 1.1, shadow: false });
    const n = document.createElement('div'); n.textContent = f.name;
    const e = document.createElement('button'); e.className = 'edit'; e.textContent = '✎';
    e.onclick = ev => { ev.stopPropagation(); openEditor(f); };
    d.append(cc, n, e);
    d.onclick = () => { selectedId = f.id; saveAll(); renderRoster(); };
    r.appendChild(d);
  }
  document.querySelectorAll('.mode').forEach(b => b.classList.toggle('sel', +b.dataset.mode === mode));
  $('best').textContent = best ? `Highscore ${mode === 1 ? 'Spel 1' : 'Spel 2'}: ${best} m` : '';
}
document.querySelectorAll('.mode').forEach(b => b.onclick = () => {
  mode = +b.dataset.mode; store.set('mode', mode); best = store.get(bestKey(), 0); renderRoster();
});

/* ---------- poppetjes-maker ---------- */
const SCHEMA = [
  { sec: 'Algemeen', items: [
    { k: 'name', t: 'text', l: 'Naam' }, { k: 'gender', t: 'sel', l: 'Man of vrouw' },
    { k: 'height', t: 'sel', l: 'Lengte' }, { k: 'build', t: 'sel', l: 'Postuur' }, { k: 'posture', t: 'sel', l: 'Houding' }] },
  { sec: 'Lichaamsvorm', items: [
    { k: 'hump', t: 'rng', l: 'Bochel', lo: 'geen', hi: 'groot' }, { k: 'chest', t: 'rng', l: 'Borst', lo: 'plat', hi: 'groot' },
    { k: 'belly', t: 'rng', l: 'Buik', lo: 'plat', hi: 'dik' }, { k: 'butt', t: 'rng', l: 'Billen', lo: 'klein', hi: 'groot' }] },
  { sec: 'Gezicht', items: [
    { k: 'skin', t: 'sw', l: 'Huidskleur', c: SKIN }, { k: 'eyes', t: 'sw', l: 'Oogkleur', c: EYES },
    { k: 'beard', t: 'sel', l: 'Baard en snor' }, { k: 'glasses', t: 'sel', l: 'Bril' }] },
  { sec: 'Haar', items: [{ k: 'style', t: 'sel', l: 'Kapsel' }, { k: 'hair', t: 'sw', l: 'Haarkleur', c: HAIR }] },
  { sec: 'Kleding', items: [
    { k: 'top', t: 'sel', l: 'Bovenkant' }, { k: 'topColor', t: 'col', l: 'Kleur bovenkant' },
    { k: 'bottom', t: 'sel', l: 'Onderkant' }, { k: 'bottomColor', t: 'col', l: 'Kleur onderkant' },
    { k: 'shoes', t: 'col', l: 'Schoenen' }, { k: 'hat', t: 'sel', l: 'Hoofddeksel' }] }
];
let draft = null, editingNew = false, edPose = 'run';
const controls = {};

function buildForm() {
  const form = $('form'); form.innerHTML = '';
  for (const sec of SCHEMA) {
    const fs = document.createElement('fieldset'), lg = document.createElement('legend'); lg.textContent = sec.sec; fs.appendChild(lg);
    for (const it of sec.items) {
      const w = document.createElement('div'); w.className = 'fld';
      const lab = document.createElement('label'); lab.textContent = it.l; lab.htmlFor = 'f_' + it.k; w.appendChild(lab);
      let el;
      if (it.t === 'text') { el = document.createElement('input'); el.type = 'text'; el.maxLength = 12; el.placeholder = 'Naam'; }
      else if (it.t === 'rng') { el = document.createElement('input'); el.type = 'range'; el.min = 0; el.max = 100; el.step = 1; }
      else if (it.t === 'col') { el = document.createElement('input'); el.type = 'color'; }
      else if (it.t === 'sel') {
        el = document.createElement('select');
        OPT[it.k].forEach(([v, n]) => { const o = document.createElement('option'); o.value = v; o.textContent = n; el.appendChild(o); });
      } else {
        el = document.createElement('div'); el.className = 'sw';
        it.c.forEach(col => {
          const b = document.createElement('button'); b.className = 'dot'; b.style.background = col; b.dataset.c = col; b.setAttribute('aria-label', col);
          b.onclick = () => { draft[it.k] = col; syncForm(); };
          el.appendChild(b);
        });
      }
      el.id = 'f_' + it.k;
      if (it.t !== 'sw') el.addEventListener('input', () => { draft[it.k] = it.t === 'rng' ? +el.value : el.value; syncForm(); });
      controls[it.k] = { el, it };
      w.appendChild(el);
      if (it.t === 'rng') { const rl = document.createElement('div'); rl.className = 'rl'; rl.innerHTML = `<span>${it.lo}</span><span>${it.hi}</span>`; w.appendChild(rl); }
      fs.appendChild(w);
    }
    form.appendChild(fs);
  }
}
function syncForm() {
  for (const [k, { el, it }] of Object.entries(controls)) {
    if (it.t === 'sw') el.querySelectorAll('.dot').forEach(b => b.classList.toggle('sel', b.dataset.c === draft[k]));
    else if (String(el.value) !== String(draft[k])) el.value = draft[k];
  }
  // een jurk of rok past bij elkaar: houd de keuzes consistent
  if (draft.top === 'dress' && controls.bottom.el.disabled !== true) controls.bottom.el.disabled = true;
  if (draft.top !== 'dress' && controls.bottom.el.disabled) controls.bottom.el.disabled = false;
}
function openEditor(f) {
  editingNew = !f;
  draft = Object.assign({}, f ? f : BLANK, f ? {} : { id: Date.now() });
  syncForm();
  $('menu').classList.add('hidden'); $('editor').classList.remove('hidden');
  $('btnDelete').style.display = f && friends.length > 1 ? '' : 'none';
}
function closeEditor() { $('editor').classList.add('hidden'); $('menu').classList.remove('hidden'); }
$('btnNew').onclick = () => openEditor(null);
$('btnCancel').onclick = closeEditor;
$('btnSave').onclick = () => {
  const o = Object.assign({}, draft); o.name = (o.name || '').trim() || 'Vriend';
  const i = friends.findIndex(f => f.id === o.id);
  if (i >= 0) friends[i] = o; else friends.push(o);
  selectedId = o.id; saveAll(); renderRoster(); closeEditor();
};
$('btnDelete').onclick = () => {
  friends = friends.filter(f => f.id !== draft.id);
  if (selectedId === draft.id) selectedId = friends[0].id;
  saveAll(); renderRoster(); closeEditor();
};
document.querySelectorAll('#poseBtns button').forEach(b => b.onclick = () => {
  edPose = b.dataset.pose; document.querySelectorAll('#poseBtns button').forEach(x => x.classList.toggle('sel', x === b));
});
function drawPreview(ts) {
  const p = $('preview').getContext('2d'), t = ts / 1000;
  p.clearRect(0, 0, 240, 320);
  p.fillStyle = '#6b4423'; p.fillRect(0, 262, 240, 58);
  const ph = t * 12;
  let y = 262, extra = {};
  if (edPose === 'jump') y = 262 - Math.abs(Math.sin(t * 3)) * 40;
  drawChar(p, draft, 120, y, Object.assign({ pose: edPose, t: ph, scale: 2.6, airH: 262 - y }, extra));
}
buildForm();
$('btnPlay').onclick = () => startGame();
$('btnAgain').onclick = () => startGame();
$('btnHome').onclick = () => goHome();

/* ---------- spel ---------- */
let state = 'menu', player, obstacles, items, speed, score, itemCount, spawnIn, time = 0, phase = 0, faintT = 0, wonT = 0, lastT;
let dust = [], motes = Array.from({ length: 34 }, (_, i) => ({ x: (i * 97) % 800, y: 30 + (i * 53) % 280, r: 0.8 + (i % 3) * 0.5, v: 4 + i % 5, p: i })), shake = 0, wasAir = false, dustT = 0, hatT = 0, nextMile = 100;
let level = 1, dispLevel = 1, pulse = 0, popups = [], confetti = [], overShown = false, hintT = 0;
const input = { duck: false }; let jumpHeld = false;
const rnd = (a, b) => a + Math.random() * (b - a);

function startGame() {
  $('menu').classList.add('hidden'); $('over').classList.add('hidden'); $('editor').classList.add('hidden');
  best = store.get(bestKey(), 0);
  player = { x: 150, y: GROUND, vy: 0, duck: false, f: current() };
  obstacles = []; items = []; popups = []; confetti = [];
  speed = MODES[mode].base; score = 0; itemCount = 0; spawnIn = 1; time = 0; phase = 0; faintT = 0; wonT = 0;
  level = 1; dispLevel = 1; pulse = 0; overShown = false; hintT = 0; dust = []; shake = 0; wasAir = false; hatT = 0; nextMile = 100; state = 'play';
}
function goHome() {
  state = 'menu'; $('over').classList.add('hidden'); $('menu').classList.remove('hidden'); best = store.get(bestKey(), 0); renderRoster();
}
function jump() { if (state === 'play' && player.y >= GROUND) player.vy = -820; }
function playerBox() {
  const h = player.duck && player.y >= GROUND ? 62 : 90;
  return { x: player.x - 12, y: player.y - h, w: 24, h };
}
function pop(text, x, y, color) { popups.push({ text, x, y, color, t: 0 }); }

function spawn() {
  const r = Math.random(), x = W + 40;
  let o;
  if (r < 0.4) o = { type: 'barrel', x, w: 50, h: 46, y: GROUND - 46 };
  else if (r < 0.6) o = { type: 'shards', x, w: 66, h: 30, y: GROUND - 30 };
  else if (r < 0.8) o = { type: 'crates', x, w: 44, h: 78, y: GROUND - 78 };
  else o = { type: 'lamp', x, w: 46, h: 38, y: GROUND - 104 }; // hanglamp: bukken!
  obstacles.push(o);
  const n = 3 + (Math.random() * 3 | 0);
  if (o.type === 'lamp') {
    for (let i = 0; i < n; i++) items.push({ type: 'main', x: x - 60 + i * 34, y: GROUND - 24, got: false });
  } else if (Math.random() < 0.8) {
    for (let i = 0; i < n; i++) {
      const k = i / (n - 1);
      items.push({ type: 'main', x: x + o.w / 2 - 50 + k * 100, y: o.y - 24 - Math.sin(k * Math.PI) * 60, got: false });
    }
  }
  // een shotje (bijvullen) op hoofdhoogte, vlak voor het obstakel
  if (Math.random() < 0.4) items.push({ type: 'shot', x: x - 150, y: GROUND - rnd(40, 70), got: false });
  // eerlijke afstand: genoeg tijd om te landen en te reageren, ook bij hoog tempo (een sprong duurt ca. 0,7 s)
  spawnIn = (speed * 1.1 + 140 + rnd(0, 380)) / speed + (o.type === 'lamp' ? 0.2 : 0);
}
function collect(c) {
  const M = MODES[mode];
  if (c.type === 'shot') {
    level = Math.min(1, level + M.refill); pulse = 0.7; pop('Bijgevuld!', 62, 56, '#7ee08a');
  } else {
    itemCount++; level = Math.max(0, level - M.drain);
    if (level <= 0) win();
  }
}
function faintNow() {
  state = 'faint'; faintT = 0; shake = 0.3;
  const s = Math.floor(score);
  if (s > best) { best = s; store.set(bestKey(), best); }
}
function win() {
  state = 'won'; wonT = 0; overShown = false;
  const s = Math.floor(score);
  if (s > best) { best = s; store.set(bestKey(), best); }
  for (let i = 0; i < 70; i++) confetti.push({ x: rnd(0, W), y: rnd(-200, 0), vx: rnd(-30, 30), vy: rnd(80, 220), r: rnd(0, 6), c: ['#ffc933', '#ff6b6b', '#4dabf7', '#69db7c', '#f783ac'][i % 5] });
}
function showOver(won) {
  overShown = true;
  $('overTitle').textContent = won ? 'Gewonnen! 🍻' : 'Flauwgevallen! 😵';
  $('overScore').textContent = (won ? 'Je glas is leeg!  ' : '') + `Afstand ${Math.floor(score)} m  ·  ${MODES[mode].name}: ${itemCount}  ·  Highscore ${best} m`;
  // verloren: wat er nog in het glas zit moet worden opgedronken
  const left = Math.ceil(level * 100);
  $('overDrink').textContent = won ? '' : `${mode === 1 ? '🍺' : '🍷'} Drink je glas op! Er zit nog ${left}% in.`;
  $('over').classList.remove('hidden');
}
function update(dt) {
  const M = MODES[mode];
  if (state === 'menu') return;
  dispLevel += (level - dispLevel) * Math.min(1, dt * 7); pulse = Math.max(0, pulse - dt); shake = Math.max(0, shake - dt); hatT = Math.max(0, hatT - dt);
  for (const d of dust) { d.t += dt; d.x += d.vx * dt - (state === 'play' ? speed * dt : 0); d.y += d.vy * dt; }
  dust = dust.filter(d => d.t < 0.6);
  for (const m of motes) { m.x -= m.v * dt; m.y += Math.sin(time * 0.6 + m.p) * 4 * dt; if (m.x < -5) m.x = W + 5; }
  popups.forEach(p => p.t += dt); popups = popups.filter(p => p.t < 1.1);
  if (state === 'faint') {
    faintT += dt;
    if (player.y < GROUND || player.vy < 0) { player.vy += 2300 * dt; player.y = Math.min(GROUND, player.y + player.vy * dt); if (player.y >= GROUND) player.vy = 0; }
    if (faintT > 1.3 && !overShown) { state = 'over'; showOver(false); }
    return;
  }
  if (state === 'won') {
    wonT += dt;
    for (const p of confetti) { p.x += p.vx * dt; p.y += p.vy * dt; p.r += dt * 6; if (p.y > H + 10) { p.y = -10; p.x = rnd(0, W); } }
    if (player.y < GROUND || player.vy < 0) { player.vy += 2300 * dt; player.y = Math.min(GROUND, player.y + player.vy * dt); if (player.y >= GROUND) player.vy = 0; }
    if (wonT > 1.6 && !overShown) showOver(true);
    return;
  }
  if (state !== 'play') return;
  time += dt; hintT += dt; speed = Math.min(M.max, M.base + time * M.grow); score += speed * dt / 50; phase += dt * speed * 0.052;
  player.duck = input.duck;
  if (player.y < GROUND || player.vy < 0) {
    player.vy += (input.duck && player.y < GROUND ? 4200 : 2300) * dt;
    player.y += player.vy * dt;
    if (player.y >= GROUND) { player.y = GROUND; player.vy = 0; }
  }
  const air = player.y < GROUND;
  if (wasAir && !air) for (let i = 0; i < 7; i++) dust.push({ x: player.x - 6, y: GROUND - 2, vx: rnd(-90, 60), vy: rnd(-40, -5), t: 0, r: rnd(2, 4) });
  wasAir = air; dustT -= dt;
  if (!air && dustT <= 0) { dustT = player.duck ? 0.07 : 0.11; dust.push({ x: player.x - 10, y: GROUND - 2, vx: rnd(-50, -10), vy: rnd(-30, -8), t: 0, r: rnd(1.5, 3) }); }
  if (score >= nextMile) { hatT = 2.2; pop(nextMile + ' m!', 84, 64, '#ffd43b'); nextMile += 100; }
  spawnIn -= dt; if (spawnIn <= 0) spawn();
  const pb = playerBox();
  for (const o of obstacles) {
    o.x -= speed * dt;
    const hit = o.type === 'shards'
      ? pb.x < o.x + o.w - 8 && pb.x + pb.w > o.x + 8 && pb.y + pb.h > o.y + 8
      : pb.x < o.x + o.w - 5 && pb.x + pb.w > o.x + 5 && pb.y < o.y + o.h - 3 && pb.y + pb.h > o.y + 3;
    if (hit) return faintNow();
  }
  for (const c of items) {
    c.x -= speed * dt;
    if (!c.got && Math.abs(c.x - player.x) < 28 && c.y > pb.y - 14 && c.y < pb.y + pb.h + 14) { c.got = true; collect(c); if (state !== 'play') return; }
  }
  obstacles = obstacles.filter(o => o.x > -120);
  items = items.filter(c => c.x > -50 && !c.got);
}

/* ---------- tekenen: voorwerpen ---------- */
function drawBottle(x, y, k = 1) { // groen bierflesje
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
  ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(0, 17, 8, 2.5, 0, 0, 7); ctx.fill();
  const g = ctx.createLinearGradient(-7, 0, 7, 0); g.addColorStop(0, '#0f4d22'); g.addColorStop(0.35, '#37b24d'); g.addColorStop(1, '#0d3d1b');
  ctx.fillStyle = g; ctx.strokeStyle = '#0a2d14'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(-6.5, 16); ctx.lineTo(-6.5, -2); ctx.quadraticCurveTo(-6.5, -6, -2.6, -9); ctx.lineTo(-2.4, -17); ctx.lineTo(2.4, -17); ctx.lineTo(2.6, -9); ctx.quadraticCurveTo(6.5, -6, 6.5, -2); ctx.lineTo(6.5, 16); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#f1e9d2'; ctx.fillRect(-6.5, 2, 13, 9); ctx.fillStyle = '#c92a2a'; ctx.fillRect(-6.5, 5, 13, 2.4);
  ctx.fillStyle = '#d4a017'; ctx.fillRect(-3, -19.5, 6, 3.4);
  ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(-4.6, -14, 1.6, 8); ctx.fillRect(-4.6, -2, 1.6, 3);
  ctx.restore();
}
function drawWine(x, y, w, h, lv) { // wijnglas, lv = vulling 0..1
  const cx = x + w / 2, bowlH = h * 0.52;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(cx, y + h + 1, w * 0.4, 2.5, 0, 0, 7); ctx.fill();
  const bowl = () => { ctx.beginPath(); ctx.moveTo(x + w * 0.1, y); ctx.bezierCurveTo(x, y + bowlH * 0.55, x + w * 0.2, y + bowlH, cx, y + bowlH); ctx.bezierCurveTo(x + w * 0.8, y + bowlH, x + w, y + bowlH * 0.55, x + w * 0.9, y); ctx.closePath(); };
  bowl(); ctx.fillStyle = 'rgba(255,255,255,.14)'; ctx.fill();
  if (lv > 0.01) {
    ctx.save(); bowl(); ctx.clip();
    const top = y + bowlH - lv * bowlH * 0.86;
    const g = ctx.createLinearGradient(0, top, 0, y + bowlH); g.addColorStop(0, '#b0244f'); g.addColorStop(1, '#5c0f27');
    ctx.fillStyle = g; ctx.fillRect(x, top, w, bowlH);
    ctx.fillStyle = 'rgba(255,200,215,.35)'; ctx.beginPath(); ctx.ellipse(cx, top, w * 0.4, 2, 0, 0, 7); ctx.fill();
    ctx.restore();
  }
  bowl(); ctx.strokeStyle = 'rgba(235,245,255,.85)'; ctx.lineWidth = 1.6; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, y + bowlH); ctx.lineTo(cx, y + h - 3); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(cx, y + h - 2, w * 0.36, 2.6, 0, 0, 7); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x + w * 0.24, y + 3); ctx.quadraticCurveTo(x + w * 0.12, y + bowlH * 0.5, x + w * 0.26, y + bowlH * 0.78); ctx.stroke();
  ctx.restore();
}
function drawShot(x, y, k = 1) { // shotglaasje
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
  const gl = 0.5 + 0.5 * Math.sin(time * 5 + x * 0.02);
  const g = ctx.createRadialGradient(0, 0, 3, 0, 0, 22); g.addColorStop(0, `rgba(255,240,150,${0.35 + gl * 0.2})`); g.addColorStop(1, 'rgba(255,240,150,0)');
  ctx.fillStyle = g; ctx.fillRect(-24, -24, 48, 48);
  const body = () => { ctx.beginPath(); ctx.moveTo(-6.5, -9); ctx.lineTo(6.5, -9); ctx.lineTo(5, 9); ctx.lineTo(-5, 9); ctx.closePath(); };
  body(); ctx.fillStyle = 'rgba(255,255,255,.2)'; ctx.fill();
  ctx.save(); body(); ctx.clip(); ctx.fillStyle = '#e8a317'; ctx.fillRect(-8, -4, 16, 16); ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(-8, -4, 16, 1.5); ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.fillRect(-4.5, 6, 9, 3.5); ctx.restore();
  body(); ctx.strokeStyle = 'rgba(240,248,255,.9)'; ctx.lineWidth = 1.6; ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(-4, -7); ctx.lineTo(-3.4, 3); ctx.stroke();
  ctx.restore();
}
function drawItem(c, bob = 0) {
  if (c.type === 'shot') drawShot(c.x, c.y + bob, 1.25);
  else if (mode === 1) drawBottle(c.x, c.y + bob);
  else drawWine(c.x - 11, c.y + bob - 19, 22, 38, 0.42);
}
function drawObstacle(o) {
  ctx.save(); ctx.translate(o.x, o.y);
  if (o.type !== 'lamp') { ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(o.w / 2, o.h, o.w * 0.6, 5, 0, 0, 7); ctx.fill(); }
  if (o.type === 'barrel') {
    const g = ctx.createLinearGradient(0, 0, o.w, 0); g.addColorStop(0, '#6e3d16'); g.addColorStop(0.4, '#b0702f'); g.addColorStop(1, '#5a3010');
    ctx.fillStyle = g; ctx.strokeStyle = '#2e1b0c'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(5, 0); ctx.quadraticCurveTo(-5, o.h / 2, 5, o.h); ctx.lineTo(o.w - 5, o.h); ctx.quadraticCurveTo(o.w + 5, o.h / 2, o.w - 5, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(40,20,5,.55)'; ctx.lineWidth = 1; for (let i = 1; i < 5; i++) { ctx.beginPath(); ctx.moveTo(o.w * i / 5, 1); ctx.lineTo(o.w * i / 5, o.h - 1); ctx.stroke(); }
    for (const yy of [9, o.h - 13]) { ctx.fillStyle = '#3d3d44'; ctx.fillRect(-1, yy, o.w + 2, 5); ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.fillRect(-1, yy, o.w + 2, 1.3); }
  } else if (o.type === 'crates') {
    for (let i = 0; i < 2; i++) {
      const yy = i * 39, g = ctx.createLinearGradient(0, yy, o.w, yy + 39); g.addColorStop(0, '#d29a58'); g.addColorStop(1, '#a8723a');
      ctx.fillStyle = g; ctx.strokeStyle = '#3b2412'; ctx.lineWidth = 2.5; ctx.fillRect(0, yy, o.w, 39); ctx.strokeRect(0, yy, o.w, 39);
      ctx.strokeStyle = 'rgba(60,35,15,.7)'; ctx.lineWidth = 1.6; ctx.strokeRect(5, yy + 5, o.w - 10, 29);
      ctx.beginPath(); ctx.moveTo(5, yy + 5); ctx.lineTo(o.w - 5, yy + 34); ctx.stroke();
      ctx.fillStyle = '#4a4a50'; for (const [nx, ny] of [[3, 3], [o.w - 3, 3], [3, 36], [o.w - 3, 36]]) { ctx.beginPath(); ctx.arc(nx, yy + ny, 1.3, 0, 7); ctx.fill(); }
    }
  } else if (o.type === 'shards') {
    const g = ctx.createRadialGradient(33, o.h - 3, 2, 33, o.h - 3, 36); g.addColorStop(0, 'rgba(230,180,70,.9)'); g.addColorStop(1, 'rgba(200,140,40,.2)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(33, o.h - 3, 36, 6, 0, 0, 7); ctx.fill();
    const sh = [[2, 14, 8], [14, 26, 12], [30, 18, 9], [44, 24, 11], [54, 12, 7]];
    for (const [sx, sh_, sw] of sh) {
      ctx.fillStyle = 'rgba(160,225,200,.85)'; ctx.strokeStyle = '#2f6b55'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(sx, o.h - 2); ctx.lineTo(sx + sw * 0.45, o.h - sh_); ctx.lineTo(sx + sw, o.h - 2); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.moveTo(sx + sw * 0.4, o.h - sh_ + 4); ctx.lineTo(sx + sw * 0.3, o.h - 6); ctx.stroke();
    }
  } else { // hanglamp
    const sway = Math.sin(time * 3 + o.x * 0.01) * 0.04;
    ctx.translate(o.w / 2, 0); ctx.rotate(sway);
    ctx.strokeStyle = '#1e1208'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -o.y); ctx.lineTo(0, 6); ctx.stroke();
    const gl = ctx.createRadialGradient(0, 34, 4, 0, 34, 55); gl.addColorStop(0, 'rgba(255,220,120,.55)'); gl.addColorStop(1, 'rgba(255,220,120,0)');
    ctx.fillStyle = gl; ctx.fillRect(-60, -20, 120, 120);
    const g = ctx.createLinearGradient(-22, 0, 22, 0); g.addColorStop(0, '#1d5a2a'); g.addColorStop(0.45, '#3da14f'); g.addColorStop(1, '#1b4d26');
    ctx.fillStyle = g; ctx.strokeStyle = '#0e2c14'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-8, 4); ctx.lineTo(8, 4); ctx.lineTo(23, 32); ctx.lineTo(-23, 32); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff2b3'; ctx.beginPath(); ctx.ellipse(0, 33, 19, 4.5, 0, 0, 7); ctx.fill();
  }
  ctx.restore();
}

/* ---------- tekenen: glas links in beeld ---------- */
function drawBeerGlass(x, y, w, h, lv) {
  const bw = w * 0.78, off = (w - bw) / 2;
  const path = ins => { ctx.beginPath(); ctx.moveTo(x + ins, y); ctx.lineTo(x + w - ins, y); ctx.lineTo(x + w - off - ins * 0.6, y + h - ins); ctx.lineTo(x + off + ins * 0.6, y + h - ins); ctx.closePath(); };
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(x + w / 2, y + h + 3, w * 0.5, 4.5, 0, 0, 7); ctx.fill();
  path(0); ctx.fillStyle = 'rgba(255,255,255,.14)'; ctx.fill();
  ctx.save(); path(2.5); ctx.clip();
  const baseY = y + h - 9, topMax = y + 17, liqTop = baseY - (baseY - topMax) * lv;
  if (lv > 0.004) {
    const g = ctx.createLinearGradient(0, liqTop, 0, y + h); g.addColorStop(0, '#f4b01c'); g.addColorStop(1, '#b86c06');
    ctx.fillStyle = g; ctx.fillRect(x, liqTop, w, y + h - liqTop);
    const fh = 3 + 10 * Math.min(1, lv * 4);
    ctx.fillStyle = '#fff6df'; ctx.beginPath(); ctx.moveTo(x, liqTop);
    for (let i = 0; i <= 8; i++) ctx.quadraticCurveTo(x + w * (i + 0.5) / 8, liqTop - fh - (i % 2 ? 3 : 0), x + w * (i + 1) / 8, liqTop - fh * 0.55);
    ctx.lineTo(x + w, liqTop + 2); ctx.lineTo(x, liqTop + 2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,240,190,.75)';
    for (let i = 0; i < 9; i++) { const bx = x + w * (0.2 + 0.6 * ((i * 37) % 10) / 10), by = y + h - 12 - ((time * 24 + i * 29) % Math.max(10, y + h - 12 - liqTop)); ctx.beginPath(); ctx.arc(bx, by, 1 + (i % 3) * 0.5, 0, 7); ctx.fill(); }
  }
  ctx.restore();
  ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.beginPath(); ctx.moveTo(x + off + 2, y + h - 9); ctx.lineTo(x + w - off - 2, y + h - 9); ctx.lineTo(x + w - off - 1, y + h - 1); ctx.lineTo(x + off + 1, y + h - 1); ctx.closePath(); ctx.fill();
  path(0); ctx.strokeStyle = 'rgba(245,250,255,.85)'; ctx.lineWidth = 2.5; ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + w * 0.2, y + 10); ctx.lineTo(x + w * 0.27, y + h - 16); ctx.stroke();
  ctx.restore();
}
function drawGlassHUD() {
  const gx = 20, gy = 66, sc = 1 + pulse * 0.12;
  ctx.save();
  ctx.translate(gx + 34, gy + 66); ctx.scale(sc, sc); ctx.translate(-(gx + 34), -(gy + 66));
  if (pulse > 0) { ctx.shadowColor = '#7ee08a'; ctx.shadowBlur = 18 * pulse; }
  if (mode === 1) drawBeerGlass(gx, gy, 68, 132, dispLevel); else drawWine(gx - 2, gy, 72, 132, dispLevel);
  ctx.restore();
  // niveau-aanduiding
  ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.beginPath(); ctx.roundRect(gx - 4, gy + 140, 76, 22, 11); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 13px Nunito, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(Math.ceil(level * 100) + '% vol', gx + 34, gy + 151); ctx.textAlign = 'left';
}

/* ---------- tekenen: café ---------- */
const PAL = ['#2f9e44', '#e8590c', '#c92a2a', '#f08c00', '#1c7ed6', '#7048e8'];
let bgX = 0;
function drawBg() {
  let g = ctx.createLinearGradient(0, 0, 0, 250); g.addColorStop(0, '#6b4226'); g.addColorStop(1, '#94613a');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, 250);
  ctx.fillStyle = 'rgba(0,0,0,.07)';
  let off = (bgX * 0.2) % 60;
  for (let x = -60; x < W + 60; x += 60) ctx.fillRect(x - off, 0, 30, 250);
  g = ctx.createLinearGradient(0, 0, 0, 24); g.addColorStop(0, '#3b2111'); g.addColorStop(1, '#5a3319'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, 24);
  g = ctx.createLinearGradient(0, 24, 0, 60); g.addColorStop(0, 'rgba(0,0,0,.35)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, 24, W, 36);
  // schilderijen
  off = (bgX * 0.3) % 470; const pb = Math.floor((bgX * 0.3) / 470);
  for (let i = -1; i < 3; i++) {
    const x = i * 470 + 120 - off, k = pb + i;
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(x + 4, 54, 68, 54);
    ctx.fillStyle = '#c8961a'; ctx.fillRect(x, 50, 68, 54);
    const sky = ctx.createLinearGradient(0, 55, 0, 99); const c1 = [['#9ed3f5', '#e6f4ff'], ['#f6b26b', '#ffe3b3'], ['#b9d98b', '#eaf6cf']][((k % 3) + 3) % 3];
    sky.addColorStop(0, c1[0]); sky.addColorStop(1, c1[1]); ctx.fillStyle = sky; ctx.fillRect(x + 5, 55, 58, 44);
    ctx.fillStyle = '#5f8a4a'; ctx.beginPath(); ctx.moveTo(x + 5, 99); ctx.quadraticCurveTo(x + 22, 76, x + 40, 90); ctx.quadraticCurveTo(x + 52, 82, x + 63, 99); ctx.fill();
    ctx.fillStyle = 'rgba(255,230,120,.9)'; ctx.beginPath(); ctx.arc(x + 48, 67, 6, 0, 7); ctx.fill();
  }
  // planken met flessen en glazen
  off = (bgX * 0.35) % 330; const sb = Math.floor((bgX * 0.35) / 330);
  for (let i = -1; i < 4; i++) {
    const x = i * 330 - off + 20, k = sb + i;
    for (let j = 0; j < 7; j++) {
      const bx = x + 12 + j * 31, col = PAL[(((k * 3 + j) % 6) + 6) % 6];
      if ((j + k) % 3 === 0) {
        ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(bx - 7, 138); ctx.quadraticCurveTo(bx, 157, bx + 7, 138); ctx.moveTo(bx, 150); ctx.lineTo(bx, 160); ctx.stroke();
      } else {
        const bg = ctx.createLinearGradient(bx - 7, 0, bx + 7, 0); bg.addColorStop(0, shade(col, 0.6)); bg.addColorStop(0.35, col); bg.addColorStop(1, shade(col, 0.55));
        ctx.fillStyle = bg; ctx.beginPath(); ctx.roundRect(bx - 7, 138, 14, 24, 4); ctx.fill(); ctx.fillRect(bx - 3, 124, 6, 16);
        ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(bx - 5, 141, 1.6, 12);
      }
    }
    g = ctx.createLinearGradient(0, 162, 0, 170); g.addColorStop(0, '#6b4023'); g.addColorStop(1, '#3a2110'); ctx.fillStyle = g; ctx.fillRect(x, 162, 230, 8);
    ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fillRect(x, 170, 230, 6);
  }
  // hanglampen
  off = (bgX * 0.5) % 400;
  for (let i = -1; i < 3; i++) {
    const x = i * 400 + 260 - off;
    const gl = ctx.createRadialGradient(x, 100, 5, x, 100, 130); gl.addColorStop(0, 'rgba(255,214,102,.5)'); gl.addColorStop(1, 'rgba(255,214,102,0)');
    ctx.fillStyle = gl; ctx.fillRect(x - 130, 0, 260, 250);
    ctx.strokeStyle = '#1e1208'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, 29); ctx.lineTo(x, 70); ctx.stroke();
    const sg = ctx.createLinearGradient(x - 26, 0, x + 26, 0); sg.addColorStop(0, '#1d5a2a'); sg.addColorStop(0.45, '#3da14f'); sg.addColorStop(1, '#1b4d26');
    ctx.fillStyle = sg; ctx.beginPath(); ctx.moveTo(x - 10, 70); ctx.lineTo(x + 10, 70); ctx.lineTo(x + 26, 98); ctx.lineTo(x - 26, 98); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff2b3'; ctx.beginPath(); ctx.ellipse(x, 99, 22, 5, 0, 0, 7); ctx.fill();
  }
  // lambrisering
  g = ctx.createLinearGradient(0, 250, 0, GROUND); g.addColorStop(0, '#62391d'); g.addColorStop(1, '#46290f'); ctx.fillStyle = g; ctx.fillRect(0, 250, W, GROUND - 250);
  ctx.fillStyle = '#b07a46'; ctx.fillRect(0, 250, W, 6); ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(0, 256, W, 4);
  off = (bgX * 0.6) % 100;
  for (let x = -100; x < W + 100; x += 100) {
    const px = x - off + 12;
    ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(px, 270, 76, 56);
    ctx.strokeStyle = 'rgba(255,200,140,.25)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px, 326); ctx.lineTo(px, 270); ctx.lineTo(px + 76, 270); ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.beginPath(); ctx.moveTo(px + 76, 270); ctx.lineTo(px + 76, 326); ctx.lineTo(px, 326); ctx.stroke();
  }
  // barkrukken op de achtergrond
  off = (bgX * 0.6) % 260;
  for (let x = -260; x < W + 260; x += 260) {
    const sx = x - off + 130;
    ctx.strokeStyle = '#1b100a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(sx, 304); ctx.lineTo(sx, 338); ctx.stroke();
    ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(sx, 324, 9, 2.5, 0, 0, 7); ctx.stroke();
    ctx.fillStyle = '#1b100a'; ctx.beginPath(); ctx.ellipse(sx, 338, 13, 3, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#4a2418'; ctx.beginPath(); ctx.ellipse(sx, 302, 17, 5.5, 0, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.beginPath(); ctx.ellipse(sx - 4, 300.5, 8, 2, 0, 0, 7); ctx.fill();
  }
  // houten vloer
  g = ctx.createLinearGradient(0, GROUND, 0, H); g.addColorStop(0, '#946030'); g.addColorStop(1, '#4a2b13'); ctx.fillStyle = g; ctx.fillRect(0, GROUND, W, H - GROUND);
  ctx.fillStyle = '#2e1a0c'; ctx.fillRect(0, GROUND, W, 4); ctx.fillStyle = 'rgba(255,220,160,.18)'; ctx.fillRect(0, GROUND + 4, W, 2);
  const rows = [GROUND + 4, GROUND + 38, GROUND + 76], rh = [34, 38, 34];
  off = bgX % 140;
  ctx.strokeStyle = 'rgba(30,15,5,.7)';
  rows.forEach((ry, r) => {
    ctx.lineWidth = 2 + r; ctx.beginPath(); ctx.moveTo(0, ry + rh[r]); ctx.lineTo(W, ry + rh[r]); ctx.stroke();
    ctx.lineWidth = 2;
    for (let x = -140 + r * 47; x < W + 140; x += 140) { ctx.beginPath(); ctx.moveTo(x - off, ry); ctx.lineTo(x - off, ry + rh[r]); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(40,20,8,.18)'; ctx.lineWidth = 1;
    for (let n = 0; n < 7; n++) { const gx = ((n * 173 + r * 61) % 800) - (bgX % 800); ctx.beginPath(); ctx.moveTo(((gx % 900) + 900) % 900 - 50, ry + 8 + n * 3 % 20); ctx.lineTo(((gx % 900) + 900) % 900 + 30, ry + 9 + n * 3 % 20); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(30,15,5,.7)';
  });
}
function vignette() {
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, W * 0.62); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(10,3,0,.5)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

/* ---------- tekenen: HUD en scène ---------- */
function drawPortrait(cx, cy, r) { // mini-portret van je eigen poppetje in de afstandsmeter
  const f = player.f, k = 1.5, hm = { short: 0.92, normal: 1, tall: 1.07 }[f.height] || 1;
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.clip();
  const bg = ctx.createLinearGradient(0, cy - r, 0, cy + r); bg.addColorStop(0, '#f7c46a'); bg.addColorStop(1, '#c97d2b'); ctx.fillStyle = bg; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  drawChar(ctx, f, cx - 4, cy + 88 * k * hm, { pose: 'idle', scale: k, shadow: false });
  ctx.restore();
  ctx.strokeStyle = '#fff4d6'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.stroke();
  if (hatT > 0) { // feestmutsje bij elke 100 meter
    ctx.save(); ctx.translate(cx + 3, cy - r + 3); ctx.rotate(0.35);
    ctx.fillStyle = '#e8590c'; ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(8, 0); ctx.lineTo(0, -17); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffd43b'; ctx.fillRect(-5, -6, 10, 2.5); ctx.beginPath(); ctx.arc(0, -17, 2.4, 0, 7); ctx.fill(); ctx.restore();
  }
}
const BADGE = { x: 14, y: 10, w: 150, h: 42 };
function pill(x, y, w, h) {
  const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, 'rgba(40,22,12,.82)'); g.addColorStop(1, 'rgba(18,9,5,.82)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(x, y, w, h, h / 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,214,140,.35)'; ctx.lineWidth = 1.5; ctx.stroke();
}
function drawHUD() {
  pill(BADGE.x, BADGE.y, BADGE.w, BADGE.h); pill(176, BADGE.y, 96, BADGE.h);
  drawPortrait(BADGE.x + 21, BADGE.y + 21, 16);
  ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff'; ctx.font = '800 21px Nunito, system-ui, sans-serif';
  const ds = String(Math.floor(score)), dw = ctx.measureText(ds).width;
  ctx.fillText(ds, BADGE.x + 46, BADGE.y + 22);
  ctx.fillStyle = '#e9c88a'; ctx.font = '700 13px Nunito, system-ui, sans-serif'; ctx.fillText('m', BADGE.x + 50 + dw, BADGE.y + 25);
  if (mode === 1) drawBottle(197, 31, 0.6); else drawWine(189, 17, 16, 28, 0.4);
  ctx.fillStyle = '#fff'; ctx.font = '800 21px Nunito, system-ui, sans-serif'; ctx.fillText(itemCount, 216, 32);
  ctx.textAlign = 'right'; ctx.font = '700 14px Nunito, system-ui, sans-serif'; ctx.fillStyle = '#ffe9b8'; ctx.fillText('Best ' + best + ' m', W - 16, 30); ctx.textAlign = 'left';
  drawGlassHUD();
}
const buttons = [{ key: 'duck', x: 20, y: H - 84, w: 70, h: 64 }, { key: 'jump', x: W - 90, y: H - 84, w: 70, h: 64 }];
function drawButtons() {
  for (const b of buttons) {
    ctx.fillStyle = (b.key === 'duck' ? input.duck : jumpHeld) ? '#7ed957' : '#5cc437';
    ctx.globalAlpha = 0.8; ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, b.h, 16); ctx.fill(); ctx.globalAlpha = 1;
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
function renderScene(ts) {
  if (state === 'play') bgX += speed * (1 / 60);
  drawBg();
  if (state === 'menu') { vignette(); return; }
  for (const m of motes) { ctx.fillStyle = `rgba(255,236,170,${0.25 + 0.2 * Math.sin(time * 2 + m.p)})`; ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, 7); ctx.fill(); }
  for (const c of items) drawItem(c, Math.sin(time * 5 + c.x * 0.05) * 3);
  obstacles.forEach(drawObstacle);
  const fa = (state === 'faint' || state === 'over') ? Math.min(1, faintT / 0.35) : 0;
  let pose = 'run', py = player.y;
  if (fa) pose = 'faint';
  else if (state === 'won') { pose = 'cheer'; py = player.y - Math.abs(Math.sin(wonT * 7)) * 18; }
  else if (player.y < GROUND) pose = 'jump';
  else if (player.duck) pose = 'duck';
  for (const d of dust) { ctx.fillStyle = `rgba(214,186,150,${0.55 * (1 - d.t / 0.6)})`; ctx.beginPath(); ctx.arc(d.x, d.y, d.r * (1 + d.t * 2), 0, 7); ctx.fill(); }
  drawChar(ctx, player.f, player.x, py, { pose, t: phase, scale: 1.0, faint: fa, airH: GROUND - py });
  if (fa) { const th = fa * Math.PI / 2; drawStars(player.x - 70 * Math.sin(th), player.y - 70 * Math.cos(th) - 9 * fa, faintT); }
  vignette();
  drawHUD();
  if (state === 'play') drawButtons();
  if (state === 'play' && hintT < 5) {
    ctx.globalAlpha = Math.min(1, 5 - hintT); ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.beginPath(); ctx.roundRect(W / 2 - 250, 70, 500, 30, 15); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = '15px Nunito, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(mode === 1 ? 'Pak flesjes om je bier leeg te drinken · shotjes vullen weer bij' : 'Pak wijnglazen om je wijn leeg te drinken · shotjes vullen weer bij', W / 2, 85);
    ctx.textAlign = 'left'; ctx.globalAlpha = 1;
  }
  if (state === 'play') { ctx.fillStyle = '#ffc933'; ctx.font = 'bold 14px Nunito, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillText(player.f.name, player.x, player.y - 112 * ({ short: .92, normal: 1, tall: 1.07 }[player.f.height] || 1)); ctx.textAlign = 'left'; }
  for (const p of popups) { ctx.globalAlpha = 1 - p.t / 1.1; ctx.fillStyle = p.color; ctx.font = 'bold 15px Nunito, system-ui, sans-serif'; ctx.fillText(p.text, p.x, p.y - p.t * 30); ctx.globalAlpha = 1; }
  for (const p of confetti) { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-4, -2, 8, 4); ctx.restore(); }
}
function render(ts) {
  ctx.save();
  if (shake > 0) ctx.translate(rnd(-5, 5) * shake / 0.3, rnd(-5, 5) * shake / 0.3);
  renderScene(ts); ctx.restore();
}
function loop(ts) {
  const dt = Math.min(0.05, ((ts - (lastT || ts)) / 1000)); lastT = ts;
  update(dt); render(ts);
  if (!$('editor').classList.contains('hidden')) drawPreview(ts);
  requestAnimationFrame(loop);
}

/* ---------- invoer ---------- */
const JUMP = ['ArrowUp', 'Space', 'KeyW'], DUCK = ['ArrowDown', 'KeyS'];
const ended = () => state === 'over' || (state === 'won' && overShown);
addEventListener('keydown', e => {
  if (/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
  if (JUMP.includes(e.code)) { e.preventDefault(); if (!e.repeat) { if (ended()) startGame(); else jump(); } }
  if (DUCK.includes(e.code)) { e.preventDefault(); input.duck = true; }
  if (e.code === 'Escape' && state !== 'menu') goHome();
});
addEventListener('keyup', e => { if (DUCK.includes(e.code)) input.duck = false; });

function pointerPos(e) { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height }; }
const active = new Map();
cv.addEventListener('pointerdown', e => {
  e.preventDefault();
  const pp = pointerPos(e);
  if (state === 'play' && pp.x > BADGE.x && pp.x < BADGE.x + BADGE.w && pp.y > BADGE.y && pp.y < BADGE.y + BADGE.h) { hatT = 2.2; pop('Proost!', 84, 64, '#ffd43b'); return; }
  const left = pp.x < W / 2;
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
