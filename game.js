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
let mode = 1; // 1 = bier, 2 = wijn: volgt het drankje van de speler die aan de beurt is
const DRINK_ICON = { 1: '🍺', 2: '🍷', 3: '🍹' };
const FINISH = 3000; // elk spel stopt na 3000 meter
// moeilijkheid: tempo, ruimte tussen obstakels, hoe snel het glas leeg gaat, hoe vaak achtervolgers komen en hoe vaak er goud langs vliegt
const DIFFS = {
  easy: { name: 'Makkelijk', speed: 0.82, gap: 1.3, drain: 1.3, chase: 1.4, gold: 0.7, hint: 'Rustiger tempo, meer ruimte tussen obstakels en je glas loopt sneller leeg.' },
  normal: { name: 'Normaal', speed: 1, gap: 1, drain: 1, chase: 1, gold: 1, hint: 'Zoals het bedoeld is.' },
  hard: { name: 'Moeilijk', speed: 1.15, gap: 0.85, drain: 0.8, chase: 0.7, gold: 1.4, hint: 'Sneller, minder ruimte, je glas loopt langzamer leeg en er komen vaker achtervolgers.' }
};
let diff = store.get('diff', 'normal'); if (!DIFFS[diff]) diff = 'normal';
const D = () => DIFFS[diff];
const bestKeyFor = m => 'best' + m + (diff === 'normal' ? '' : '_' + diff);
const bestKey = () => bestKeyFor(mode);
let best = store.get(bestKey(), 0);

// drain = hoeveel van het glas er per flesje/wijnglas uitgaat, refill = hoeveel een shotje bijvult
const MODES = {
  1: { name: 'Bierflesjes', base: 330, grow: 9, max: 780, drain: 0.02, refill: 0.08 },
  3: { name: 'Cocktails', base: 330, grow: 9, max: 780, drain: 0.012, refill: 0.08 }, // zelfde tempo als bier, maar er gaat veel minder uit het glas
  2: { name: 'Wijnglazen', base: 330, grow: 9, max: 780, drain: 0.045, refill: 0.04 } // zelfde tempo als bier; wijn is sterker, dus het glas gaat sneller leeg
};

/* ---------- menu & spelers ---------- */
let chosen = store.get('chosen', [selectedId]).filter(id => friends.some(f => f.id === id));
if (!chosen.length) chosen = [friends[0].id];
function saveAll() { store.set('friends', friends); store.set('selected', selectedId); store.set('chosen', chosen); }
const esc = t => String(t).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

function renderRoster() {
  const r = $('roster'); r.innerHTML = '';
  for (const f of friends) {
    const pos = chosen.indexOf(f.id);
    const d = document.createElement('div'); d.className = 'card' + (pos >= 0 ? ' sel' : '');
    const cc = document.createElement('canvas'); cc.width = 80; cc.height = 120;
    drawChar(cc.getContext('2d'), f, 40, 112, { pose: 'idle', scale: 1.1, shadow: false });
    const n = document.createElement('div'); n.textContent = f.name + ' ' + DRINK_ICON[f.drink === 'wine' ? 2 : f.drink === 'cocktail' ? 3 : 1];
    const num = document.createElement('span'); num.className = 'num'; num.textContent = pos >= 0 ? pos + 1 : '';
    const e = document.createElement('button'); e.className = 'edit'; e.textContent = '✎'; e.setAttribute('aria-label', 'Aanpassen');
    e.onclick = ev => { ev.stopPropagation(); openEditor(f); };
    d.append(cc, n, num, e);
    d.onclick = () => { if (pos >= 0) { if (chosen.length > 1) chosen.splice(pos, 1); } else chosen.push(f.id); saveAll(); renderRoster(); };
    r.appendChild(d);
  }
  $('btnPlay').textContent = chosen.length > 1 ? `Spelen met ${chosen.length} spelers` : 'Spelen';
  const b1 = store.get(bestKeyFor(1), 0), b2 = store.get(bestKeyFor(2), 0), b3 = store.get(bestKeyFor(3), 0);
  $('best').textContent = (b1 || b2 || b3) ? `Highscores (${D().name}): 🍺 ${b1} m · 🍷 ${b2} m · 🍹 ${b3} m` : '';
  document.querySelectorAll('#diffs .chip').forEach(b => b.classList.toggle('sel', b.dataset.diff === diff));
  $('diffHint').textContent = D().hint;
}

/* ---------- poppetjes-maker ---------- */
const TOPC = ['#3b82f6', '#e63946', '#2a9d8f', '#f4a261', '#ffffff', '#1d1d1f', '#8e44ad', '#f1c40f', '#6c757d', '#e84393', '#5dade2', '#7d6608'];
const BOTC = ['#5b7fb5', '#2f4a7a', '#1c2a4a', '#1a1a1d', '#6b6f78', '#e8e8ea', '#b7a37a', '#59623a', '#8a4a2a'];
const SHOEC = ['#f1f1f1', '#1a1a1d', '#8a4a2a', '#d6232a', '#2f4a7a', '#e8c547'];
// Tabs met grote keuzeknoppen: sneller dan lange lijsten
const SCHEMA = [
  { sec: 'Basis', items: [
    { k: 'name', t: 'text', l: 'Naam' }, { k: 'drink', t: 'chips', l: 'Wat drink je?' }, { k: 'gender', t: 'chips', l: 'Man of vrouw' },
    { k: 'height', t: 'chips', l: 'Lengte' }, { k: 'build', t: 'chips', l: 'Postuur' }, { k: 'posture', t: 'chips', l: 'Houding' }] },
  { sec: 'Lichaam', items: [
    { k: 'hump', t: 'rng', l: 'Bochel', lo: 'geen', hi: 'groot' }, { k: 'chest', t: 'rng', l: 'Borst', lo: 'plat', hi: 'groot' },
    { k: 'belly', t: 'rng', l: 'Buik', lo: 'plat', hi: 'dik' }, { k: 'butt', t: 'rng', l: 'Billen', lo: 'klein', hi: 'groot' }] },
  { sec: 'Gezicht', items: [
    { k: 'skin', t: 'sw', l: 'Huidskleur', c: SKIN }, { k: 'eyes', t: 'sw', l: 'Oogkleur', c: EYES },
    { k: 'beard', t: 'chips', l: 'Baard en snor' }, { k: 'glasses', t: 'chips', l: 'Bril' }] },
  { sec: 'Haar', items: [{ k: 'style', t: 'chips', l: 'Kapsel' }, { k: 'hair', t: 'sw', l: 'Haarkleur', c: HAIR }] },
  { sec: 'Kleding', items: [
    { k: 'top', t: 'chips', l: 'Bovenkant' }, { k: 'topColor', t: 'sw', l: 'Kleur bovenkant', c: TOPC, custom: true },
    { k: 'bottom', t: 'chips', l: 'Onderkant' }, { k: 'bottomColor', t: 'sw', l: 'Kleur onderkant', c: BOTC, custom: true },
    { k: 'shoes', t: 'sw', l: 'Schoenen', c: SHOEC, custom: true }, { k: 'hat', t: 'chips', l: 'Hoofddeksel' }] },
  { sec: 'Foto', items: [] }
];
let draft = null, editingNew = false, edPose = 'run', activeTab = 'Basis';
const controls = {}, panes = {};

function buildForm() {
  const form = $('form'); form.innerHTML = '';
  const bar = document.createElement('div'); bar.className = 'tabs';
  for (const sec of SCHEMA) {
    const tb = document.createElement('button'); tb.type = 'button'; tb.className = 'tab'; tb.textContent = sec.sec; tb.dataset.tab = sec.sec; tb.onclick = () => showTab(sec.sec); bar.appendChild(tb);
    const pane = document.createElement('div'); pane.className = 'pane'; pane.hidden = true; panes[sec.sec] = pane;
    for (const it of sec.items) {
      const w = document.createElement('div'); w.className = 'fld';
      const lab = document.createElement('label'); lab.textContent = it.l; lab.htmlFor = 'f_' + it.k; w.appendChild(lab);
      let el;
      if (it.t === 'text') { el = document.createElement('input'); el.type = 'text'; el.maxLength = 12; el.placeholder = 'Naam'; el.addEventListener('input', () => { draft[it.k] = el.value; }); }
      else if (it.t === 'rng') { el = document.createElement('input'); el.type = 'range'; el.min = 0; el.max = 100; el.step = 1; el.addEventListener('input', () => { draft[it.k] = +el.value; }); }
      else if (it.t === 'chips') {
        el = document.createElement('div'); el.className = 'chips';
        OPT[it.k].forEach(([v, n]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.dataset.v = v; b.textContent = n; b.onclick = () => { draft[it.k] = v; syncForm(); }; el.appendChild(b); });
      } else {
        el = document.createElement('div'); el.className = 'sw';
        it.c.forEach(col => { const b = document.createElement('button'); b.type = 'button'; b.className = 'dot'; b.style.background = col; b.dataset.c = col; b.setAttribute('aria-label', col); b.onclick = () => { draft[it.k] = col; syncForm(); }; el.appendChild(b); });
        if (it.custom) { const ci = document.createElement('input'); ci.type = 'color'; ci.className = 'cust'; ci.title = 'Eigen kleur'; ci.addEventListener('input', () => { draft[it.k] = ci.value; syncForm(); }); el.appendChild(ci); }
      }
      el.id = 'f_' + it.k;
      if (it.t === 'text' || it.t === 'rng') el.addEventListener('input', syncForm);
      controls[it.k] = { el, it };
      w.appendChild(el);
      if (it.t === 'rng') { const rl = document.createElement('div'); rl.className = 'rl'; rl.innerHTML = `<span>${it.lo}</span><span>${it.hi}</span>`; w.appendChild(rl); }
      pane.appendChild(w);
    }
  }
  const dice = document.createElement('button'); dice.type = 'button'; dice.className = 'tab dice'; dice.textContent = '🎲 Willekeurig'; dice.onclick = randomize; bar.appendChild(dice);
  form.appendChild(bar);
  for (const sec of SCHEMA) form.appendChild(panes[sec.sec]);
  showTab(activeTab);
}
function showTab(n) {
  activeTab = n;
  document.querySelectorAll('#form .tab[data-tab]').forEach(t => t.classList.toggle('sel', t.dataset.tab === n));
  for (const [k, p] of Object.entries(panes)) p.hidden = k !== n;
}
function syncForm() {
  for (const [k, { el, it }] of Object.entries(controls)) {
    if (it.t === 'chips') el.querySelectorAll('.chip').forEach(b => b.classList.toggle('sel', b.dataset.v === String(draft[k])));
    else if (it.t === 'sw') {
      const cur = String(draft[k]).toLowerCase();
      el.querySelectorAll('.dot').forEach(b => b.classList.toggle('sel', b.dataset.c.toLowerCase() === cur));
      const ci = el.querySelector('.cust'); if (ci && /^#[0-9a-f]{6}$/i.test(cur)) ci.value = cur;
    } else if (String(el.value) !== String(draft[k])) el.value = draft[k];
  }
  const dress = draft.top === 'dress'; // bij een jurk past geen aparte onderkant
  controls.bottom.el.querySelectorAll('.chip').forEach(b => { b.disabled = dress; });
}
function randomize() {
  const pick = a => a[Math.random() * a.length | 0], fem = draft.gender === 'f';
  Object.assign(draft, {
    height: pick(['short', 'normal', 'normal', 'tall']), build: pick(['slim', 'normal', 'normal', 'broad']), posture: pick(['upright', 'normal', 'normal', 'slouch']),
    skin: pick(SKIN), eyes: pick(EYES), hair: pick(HAIR.slice(0, 9)),
    style: pick(fem ? ['long', 'bob', 'ponytail', 'bun', 'braid', 'curly', 'short'] : ['short', 'buzz', 'quiff', 'curly', 'afro', 'bald', 'mohawk']),
    beard: fem ? 'none' : pick(['none', 'none', 'stubble', 'moustache', 'beard']), glasses: pick(['none', 'none', 'none', 'round', 'square', 'sun']),
    top: fem ? pick(['tshirt', 'long', 'hoodie', 'tank', 'dress', 'blazer']) : pick(['tshirt', 'long', 'hoodie', 'blazer', 'tank']), topColor: pick(TOPC),
    bottom: fem ? pick(['jeans', 'chinos', 'shorts', 'skirt']) : pick(['jeans', 'jeans', 'chinos', 'shorts']), bottomColor: pick(BOTC), shoes: pick(SHOEC),
    hat: pick(['none', 'none', 'none', 'cap', 'beanie']), hump: pick([0, 0, 0, 10, 25]), chest: 35 + (Math.random() * 30 | 0), belly: 30 + (Math.random() * 40 | 0), butt: 35 + (Math.random() * 30 | 0)
  });
  draft.face = ''; photoImg = null; syncForm();
}
function openEditor(f) {
  editingNew = !f;
  draft = Object.assign({}, f ? f : BLANK, f ? {} : { id: Date.now() });
  syncForm(); resetPhotoUI();
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
  selectedId = o.id; if (!chosen.includes(o.id)) chosen.push(o.id); saveAll(); renderRoster(); closeEditor();
};
$('btnDelete').onclick = () => {
  friends = friends.filter(f => f.id !== draft.id);
  if (selectedId === draft.id) selectedId = friends[0].id;
  chosen = chosen.filter(id => id !== draft.id); if (!chosen.length) chosen = [friends[0].id];
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
  drawChar(p, draft, 120, y, Object.assign({ pose: edPose, t: ph, scale: 2.3, airH: 262 - y }, extra));
}
buildForm();

/* ---------- foto van je gezicht ---------- */
let photoImg = null;
function buildPhotoUI() {
  const fs = document.createElement('fieldset');
  fs.innerHTML = `<legend>Foto van je gezicht</legend>
    <div class="fld photo">
      <div class="row">
        <label class="btnlike" for="photoIn">📷 Foto maken of kiezen</label>
        <input type="file" id="photoIn" accept="image/*" capture="user" hidden>
        <button type="button" id="photoDel">Foto weghalen</button>
      </div>
      <div class="photoctl">
        <canvas id="photoPrev" width="96" height="96"></canvas>
        <div class="photosl">
          <label for="pz">Inzoomen</label><input type="range" id="pz" min="0" max="100" value="25">
          <label for="px">Links / rechts</label><input type="range" id="px" min="0" max="100" value="50">
          <label for="py">Omhoog / omlaag</label><input type="range" id="py" min="0" max="100" value="25">
        </div>
      </div>
      <p class="hint">Het gezicht komt op je poppetje. De foto blijft alleen op dit apparaat staan.</p>
    </div>`;
  panes.Foto.appendChild(fs);
  $('photoIn').onchange = e => {
    const file = e.target.files && e.target.files[0]; if (!file) return;
    const rd = new FileReader();
    rd.onload = () => { const im = new Image(); im.onload = () => { photoImg = im; $('pz').value = 25; $('px').value = 50; $('py').value = 25; renderPhoto(); }; im.src = rd.result; };
    rd.readAsDataURL(file); e.target.value = '';
  };
  ['pz', 'px', 'py'].forEach(id => $(id).addEventListener('input', renderPhoto));
  $('photoDel').onclick = () => { photoImg = null; draft.face = ''; clearPhotoPrev(); };
}
function clearPhotoPrev() { const pp = $('photoPrev').getContext('2d'); pp.clearRect(0, 0, 96, 96); pp.fillStyle = 'rgba(255,255,255,.08)'; pp.fillRect(0, 0, 96, 96); }
function renderPhoto() {
  if (!photoImg) return;
  const w = photoImg.naturalWidth, h = photoImg.naturalHeight, base = Math.min(w, h);
  const sz = base / (1 + $('pz').value / 50);
  const sx = (w - sz) * $('px').value / 100, sy = (h - sz) * $('py').value / 100;
  const c2 = document.createElement('canvas'); c2.width = c2.height = 128;
  c2.getContext('2d').drawImage(photoImg, sx, sy, sz, sz, 0, 0, 128, 128);
  draft.face = c2.toDataURL('image/jpeg', 0.82);
  const pp = $('photoPrev').getContext('2d'); pp.clearRect(0, 0, 96, 96); pp.drawImage(c2, 0, 0, 96, 96);
}
function resetPhotoUI() {
  photoImg = null; clearPhotoPrev();
  if (draft.face) { const im = faceImage(draft.face); const show = () => $('photoPrev').getContext('2d').drawImage(im, 0, 0, 96, 96); if (im.complete) show(); else im.onload = show; }
}
buildPhotoUI();
document.querySelectorAll('#diffs .chip').forEach(b => b.onclick = () => { diff = b.dataset.diff; store.set('diff', diff); renderRoster(); });
$('btnPlay').onclick = () => startSession();
$('btnAgain').onclick = () => primary();
$('btnHome').onclick = () => goHome();

/* ---------- spel ---------- */
let state = 'menu', player, obstacles = [], items = [], speed = 330, score = 0, itemCount = 0, spawnIn = 1, time = 0, phase = 0, faintT = 0, wonT = 0, lastT;
let dust = [], motes = Array.from({ length: 34 }, (_, i) => ({ x: (i * 97) % 800, y: 30 + (i * 53) % 280, r: 0.8 + (i % 3) * 0.5, v: 4 + i % 5, p: i })), shake = 0, wasAir = false, dustT = 0, nextMile = 100;
let level = 1, dispLevel = 1, pulse = 0, popups = [], confetti = [], overShown = false, hintT = 0;
let nextDoorAt = 320, goldIn = 12, sips = 0, GOLDMODE = false, bonus = null, bonusKind = 'wine', bonusBlend = 0, flash = 0, flashCol = '#fff', nextVatAt = 200, finishObj = null, finT = 0, drunk = 0, shotCount = 0, bouncer = null, bouncerIn = 22, zone = 0, zoneBlend = 0, session = null, primary = () => {};
const input = { duck: false }; let jumpHeld = false;
const rnd = (a, b) => a + Math.random() * (b - a);
// de beveiliger: een grote kerel in het zwart
const BOUNCER = normalize({ id: -1, name: 'Beveiliger', gender: 'm', height: 'tall', build: 'broad', skin: SKIN[3], eyes: EYES[5], style: 'bald', hair: HAIR[0], beard: 'stubble', glasses: 'sun', top: 'blazer', topColor: '#15151c', bottom: 'chinos', bottomColor: '#15151c', shoes: '#0a0a0a', chest: 78, belly: 72, butt: 60, posture: 'upright' });
const ANGRY_WOMAN = normalize({ id: -2, name: 'Boze vrouw', gender: 'f', height: 'normal', build: 'broad', skin: SKIN[1], eyes: EYES[5], style: 'curly', hair: HAIR[8], glasses: 'round', top: 'dress', topColor: '#8e44ad', shoes: '#5a3a2a', chest: 78, belly: 72, butt: 78 });
const FAT_MAN = normalize({ id: -3, name: 'Dikke man', gender: 'm', height: 'normal', build: 'broad', skin: SKIN[1], eyes: EYES[3], style: 'short', hair: HAIR[8], beard: 'moustache', top: 'none', bottom: 'briefs', bottomColor: '#f2f2f2', shoes: SKIN[1], chest: 88, belly: 140, butt: 115, posture: 'slouch' });
const DAD = normalize({ id: -4, name: 'Vader', gender: 'm', height: 'normal', build: 'normal', skin: SKIN[1], eyes: EYES[1], style: 'short', hair: HAIR[8], glasses: 'square', top: 'long', topColor: '#8a6d3b', bottom: 'chinos', bottomColor: '#6b5a3c', shoes: '#3a2a1c', chest: 55, belly: 68, butt: 55, hump: 8 });
const MOM = normalize({ id: -5, name: 'Moeder', gender: 'f', height: 'normal', build: 'normal', skin: SKIN[1], eyes: EYES[2], style: 'bob', hair: HAIR[3], top: 'long', topColor: '#2a9d8f', bottom: 'skirt', bottomColor: '#3a3a4a', shoes: '#2a2a2a', chest: 62, belly: 55, butt: 60 });
// wie er achter je aan rent: wisselt af
const CHASERS = [
  { char: BOUNCER, name: 'Beveiliger', lines: { 1: 'Hé jij! Dat bier is nog niet betaald!', 2: 'Hé jij! Blijf van die wijn af!', 3: 'Hé jij! Geef die cocktail hier!' }, mood: '', prop: '', scale: 1.04 },
  { char: ANGRY_WOMAN, name: 'Boze vrouw', lines: { 1: 'Alweer aan het bier, jij!', 2: 'Dronken van de wijn! Kom hier!', 3: 'Cocktails?! Ik krijg je wel!' }, mood: 'angry', prop: 'pin', scale: 1.0 },
  { char: DAD, name: 'Vader', lines: { 1: 'Je zou vanavond niet dronken worden!', 2: 'Je zou vanavond niet dronken worden! Leg die wijn weg!', 3: 'Je zou vanavond niet dronken worden! Geen cocktails!' }, mood: 'angry', prop: '', scale: 1.0 },
  { char: MOM, name: 'Moeder', lines: { 1: 'Ik dacht dat je vanavond niet dronken zou worden!', 2: 'Je zou vanavond niet dronken worden, hè?!', 3: 'Cocktails?! Je zou niet dronken worden!' }, mood: 'angry', prop: 'bag', scale: 1.0 },
  { char: FAT_MAN, name: 'Dikke man', lines: { 1: 'Geef me mijn bier terug!', 2: 'Dat is mijn wijn, dief!', 3: 'Mijn cocktail met parasol!' }, mood: 'angry', prop: '', scale: 1.06 }
];
let chaserIdx = -1;
function newChaser() {
  chaserIdx = (chaserIdx + 1 + (Math.random() < 0.5 ? 1 : 0)) % CHASERS.length;
  return { def: CHASERS[chaserIdx], x: -90, ph: 0, age: 0, state: 'chase', fallT: 0, idle: false, need: 2 + (Math.random() * 4 | 0), survived: 0, handled: new Set(), act: null, trip: null, h: 0 };
}

function initRun(f) {
  mode = f.drink === 'wine' ? 2 : f.drink === 'cocktail' ? 3 : 1;
  best = store.get(bestKey(), 0);
  player = { x: 150, y: GROUND, vy: 0, on: true, duck: false, f };
  obstacles = []; items = []; popups = []; confetti = []; dust = [];
  speed = MODES[mode].base * D().speed; score = 0; itemCount = 0; spawnIn = 1; time = 0; phase = 0; faintT = 0; wonT = 0;
  level = 1; dispLevel = 1; pulse = 0; overShown = false; hintT = 0; shake = 0; wasAir = false; nextMile = 100;
  drunk = 0; bonus = null; bonusBlend = 0; flash = 0; nextVatAt = rnd(150, 300); nextDoorAt = rnd(300, 450); shotCount = 0; finishObj = null; bouncer = null; bouncerIn = rnd(18, 28) * D().chase; goldIn = rnd(8, 14) * D().gold; sips = 0; zone = 0; zoneBlend = 0; bgX = 0; state = 'ready';
}
function setOver(o) {
  $('overTitle').textContent = o.title; $('overScore').textContent = o.text || ''; $('overDrink').textContent = o.drink || ''; $('overSips').textContent = o.sips || '';
  $('overBoard').innerHTML = o.board || ''; $('btnAgain').textContent = o.label; primary = o.fn; $('over').classList.remove('hidden');
}
function startSession() {
  $('menu').classList.add('hidden'); $('editor').classList.add('hidden');
  session = { queue: chosen.slice(), idx: 0, results: [] };
  prepareTurn();
}
function prepareTurn() {
  const f = friends.find(x => x.id === session.queue[session.idx]) || friends[0];
  $('over').classList.add('hidden');
  initRun(f);
  if (session.queue.length > 1) {
    setOver({ title: `Aan de beurt: ${f.name}`, text: `Speler ${session.idx + 1} van ${session.queue.length} · geef het scherm door`, label: 'Start', fn: beginRun });
  } else beginRun();
}
function beginRun() { $('over').classList.add('hidden'); state = 'play'; }
function goHome() {
  state = 'menu'; session = null; $('over').classList.add('hidden'); $('menu').classList.remove('hidden'); best = store.get(bestKey(), 0); renderRoster();
}
function jump() { if (state === 'play' && player.on) player.vy = -820; }
function playerBox() {
  const h = player.duck && player.on ? 62 : 90;
  return { x: player.x - 12, y: player.y - h, w: 24, h };
}
function pop(text, x, y, color) { popups.push({ text, x, y, color, t: 0 }); }

function spawn() {
  const r = Math.random(), x = W + 40;
  let o;
  if (!bonus && !finishObj && score >= nextVatAt && score < FINISH - 330) { // open vat: spring erin voor een bonusomgeving
    o = { type: 'vat', x, w: 76, h: 86, y: GROUND - 86, liquid: mode === 2 ? 'wine' : mode === 3 ? 'cocktail' : 'beer' }; nextVatAt = score + rnd(250, 450);
  } else if (!bonus && !finishObj && score >= nextDoorAt && score < FINISH - 330) { // achterdeur naar een veld
    o = { type: 'door', x, w: 74, h: 124, y: GROUND - 124, kind: { 1: 'wheat', 2: 'vineyard', 3: 'fruit' }[mode] }; nextDoorAt = score + rnd(380, 600);
  } else if (r < 0.2) o = { type: 'barrel', x, w: 50, h: 46, y: GROUND - 46 };
  else if (r < 0.32) o = { type: 'shards', x, w: 66, h: 30, y: GROUND - 30 };
  else if (r < 0.44) o = { type: 'crates', x, w: 44, h: 78, y: GROUND - 78 };
  else if (r < 0.62) { const k = 1 + (Math.random() * 3 | 0); o = { type: 'bollard', x, w: 16 + (k - 1) * 30, k, h: 56, y: GROUND - 56 }; } // verkeerspaaltjes
  else if (r < 0.76) o = { type: 'lamp', x, w: 46, h: 38, y: GROUND - 104 }; // hanglamp: bukken!
  else o = { type: 'table', x, w: [160, 210, 270][Math.random() * 3 | 0], h: 55, y: GROUND - 55 }; // lange tafel: springen, erop landen mag
  o.theme = bonus ? bonusKind : (zone ? 'disco' : 'cafe'); // elke omgeving heeft eigen tafels, lampen, kratten...
  obstacles.push(o);
  const n = 3 + (Math.random() * 3 | 0);
  if (o.type === 'door') {
    for (let i = 0; i < 5; i++) items.push({ type: 'main', x: x - 30 - i * 34, y: GROUND - 24, got: false });
  } else if (o.type === 'lamp') {
    for (let i = 0; i < n; i++) items.push({ type: 'main', x: x - 60 + i * 34, y: GROUND - 24, got: false });
  } else if (o.type === 'table') { // beloning voor wie op de tafel springt
    const cnt = Math.floor((o.w - 30) / 26);
    for (let i = 0; i < cnt; i++) items.push({ type: 'main', x: x + 18 + i * 26, y: o.y - 24, got: false });
    if (Math.random() < 0.6) items.push({ type: 'shot', x: x + o.w / 2, y: o.y - 62, got: false });
  } else if (o.type === 'vat' || Math.random() < (bonus ? 1 : 0.8)) {
    for (let i = 0; i < n; i++) {
      const k = i / (n - 1);
      items.push({ type: 'main', x: x + o.w / 2 - 50 + k * 100, y: o.y - 24 - Math.sin(k * Math.PI) * 60, got: false });
    }
  }
  // een shotje (bijvullen) op hoofdhoogte, vlak voor het obstakel
  if (o.type !== 'table' && o.type !== 'door' && Math.random() < (bonus ? 0.55 : 0.4)) { // shotje ongeveer midden tussen dit en het volgende obstakel
    const minGap = speed * 1.1 + 140;
    items.push({ type: 'shot', x: x + o.w + (minGap - o.w) * 0.4, y: GROUND - rnd(40, 70), got: false });
  }
  // eerlijke afstand: genoeg tijd om te landen en te reageren, ook bij hoog tempo (een sprong duurt ca. 0,7 s)
  spawnIn = (speed * 1.1 + 140 + rnd(0, 380)) / speed * D().gap + (o.type === 'lamp' ? 0.2 : 0) + (o.type === 'table' ? o.w / speed : 0);
}
function collect(c) {
  const M = MODES[mode];
  if (c.type === 'gold') { // gouden drankje: telt op als slokken om uit te delen
    sips++; pop('+1 slok om uit te delen!', Math.max(60, player.x - 70), player.y - 125, '#ffd43b');
    for (let i = 0; i < 16; i++) dust.push({ x: c.x, y: c.y, vx: rnd(-140, 140), vy: rnd(-220, -40), t: 0, r: rnd(1.5, 3.5), g: true, col: '255,212,59' });
    return;
  }
  if (c.type === 'shot') {
    drunk = Math.min(8, drunk + 4.5); pop('Hik!', player.x - 10, player.y - 120, '#ffb3e6'); // een shotje maakt je wazig en wankelig
    shotCount++;
    if (shotCount % 3 === 0) { // easteregg: elk derde shotje vult het hele glas
      level = 1; pulse = 1.4; pop('JACKPOT! Glas weer helemaal vol!', 110, 100, '#ffd43b');
      for (let i = 0; i < 40; i++) confetti.push({ x: rnd(0, W), y: rnd(-120, 0), vx: rnd(-40, 40), vy: rnd(120, 260), r: rnd(0, 6), c: ['#ffc933', '#ff6b6b', '#4dabf7', '#69db7c', '#f783ac'][i % 5], loop: false });
    } else { level = Math.min(1, level + M.refill); pulse = 0.7; pop('Bijgevuld!', 62, 56, '#7ee08a'); }
  } else {
    itemCount++; level = Math.max(0, level - M.drain * D().drain);
    if (level <= 0) win();
  }
}
function enterBonus(o) { // in het vat gesprongen: 250 meter wijnkelder, brouwerij of cocktailbar
  const kind = o.kind || o.liquid;
  bonus = { until: score + 250 }; bonusKind = kind; zone = 0; flash = 1; flashCol = { wine: '#8a1c40', beer: '#f4b01c', cocktail: '#ff3d81', wheat: '#f4d35e', vineyard: '#7b2d8e', fruit: '#ff9f1c' }[kind];
  for (let i = 0; i < 28; i++) dust.push({ x: o.x + o.w / 2, y: o.y, vx: rnd(-170, 170), vy: rnd(-340, -120), t: 0, r: rnd(2, 5), g: true, col: { wine: '170,30,75', beer: '245,175,30', cocktail: '255,70,140', wheat: '240,205,90', vineyard: '130,50,150', fruit: '255,150,30' }[kind] });
  obstacles = []; items = []; bouncer = null; bouncerIn = rnd(26, 40) * D().chase; spawnIn = 1.6; player.y = GROUND; player.vy = 0; player.on = true; shake = 0.2;
  pop({ wine: 'Wijnkelder! 250 meter', beer: 'Brouwerij! 250 meter', cocktail: 'Cocktailbar! 250 meter', wheat: 'Tarwe veld! 250 meter', vineyard: 'Druivenveld! 250 meter', fruit: 'Fruitplantage! 250 meter' }[kind], W / 2 - 80, 130, '#ffd43b');
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
  for (let i = 0; i < 70; i++) confetti.push({ x: rnd(0, W), y: rnd(-200, 0), vx: rnd(-30, 30), vy: rnd(80, 220), r: rnd(0, 6), c: ['#ffc933', '#ff6b6b', '#4dabf7', '#69db7c', '#f783ac'][i % 5], loop: true });
}
function boardHtml() {
  const rank = session.results.filter(Boolean).map(r => Object.assign({}, r)).sort((a, b) => a.won !== b.won ? (a.won ? -1 : 1) : a.won ? a.time - b.time : a.left - b.left);
  const lost = rank.filter(r => !r.won), worst = lost[lost.length - 1];
  return '<table><tr><th></th><th>Speler</th><th>Resultaat</th><th>Afstand</th><th>🥇 Slokken</th></tr>' +
    rank.map((r, i) => `<tr${r === worst ? ' class="worst"' : ''}><td>${i + 1}</td><td>${esc(r.name)}</td><td>${r.won ? '🏆 Glas leeg' : 'Drinkt ' + r.left + '%'}</td><td>${r.dist} m</td><td>${r.sips || 0}</td></tr>`).join('') +
    '</table>' + (worst ? `<p class="boardnote">${esc(worst.name)} drinkt het meest!</p>` : '');
}
function showResult(kind) {
  overShown = true;
  const won = kind === 'won', fin = kind === 'finish';
  const left = Math.ceil(level * 100), dist = Math.floor(score), n = session.queue.length, last = session.idx >= n - 1;
  session.results[session.idx] = { name: player.f.name, won, left, dist, time, sips };
  const base = {
    title: won ? 'Gewonnen! 🍻' : fin ? 'Finish! 🏁' : 'Flauwgevallen! 😵',
    text: (won ? 'Je glas is leeg! ' : fin ? `Je hebt de ${FINISH} meter gehaald! ` : '') + `Afstand ${dist} m · ${MODES[mode].name}: ${itemCount} · ${D().name}`,
    sips: sips > 0 ? `🥇 Je mag ${sips} ${sips === 1 ? 'slok' : 'slokken'} uitdelen!` : '',
    // verloren: wat er nog in het glas zit moet worden opgedronken
    drink: won ? '' : `${DRINK_ICON[mode]} ${player.f.name}, drink je glas op! Er zit nog ${left}% in.`
  };
  if (n === 1) setOver(Object.assign(base, { text: base.text + ` · Highscore ${best} m`, label: 'Opnieuw spelen', fn: prepareTurn }));
  else if (!last) {
    const nx = friends.find(x => x.id === session.queue[session.idx + 1]) || friends[0];
    setOver(Object.assign(base, { label: `Volgende speler: ${nx.name}`, fn: () => { session.idx++; prepareTurn(); } }));
  } else setOver(Object.assign(base, { board: boardHtml(), label: 'Nog een ronde', fn: () => { session.idx = 0; session.results = []; prepareTurn(); } }));
}

// natuurkunde: zwaartekracht, grond en tafels om op te landen
function stepPhysics(dt, fastFall) {
  const prev = player.y;
  if (fastFall && !player.on) player.vy = Math.max(player.vy, 1100); // bukken in de lucht: meteen omlaag
  player.vy += 2300 * dt;
  player.y += player.vy * dt;
  let land = GROUND;
  if (player.vy >= 0) for (const o of obstacles) {
    if (o.type === 'table' && player.x - 12 < o.x + o.w - 4 && player.x + 12 > o.x + 4 && prev <= o.y + 14 && player.y >= o.y) land = Math.min(land, o.y);
  }
  if (player.y >= land) { player.y = land; player.vy = 0; player.on = true; } else player.on = false;
}
function updateBouncer(dt) {
  const b = bouncer; if (!b) return;
  b.age += dt;
  if (b.state === 'fall') { b.fallT += dt; b.x -= (state === 'play' ? speed : 0) * dt; if (b.x < -160 || b.fallT > 3) bouncer = null; return; }
  const targetX = player.x - 85;
  if (state === 'play') {
    b.ph += dt * speed * 0.052;
    if (b.x < targetX) b.x = Math.min(targetX, b.x + 320 * dt);
    if (b.act) { // bezig met springen of bukken
      b.act.t += dt; const u = Math.min(1, b.act.t / b.act.T);
      b.h = b.act.type === 'hop' ? b.act.H * 4 * u * (1 - u) : 0;
      if (b.act.t >= b.act.T) { b.act = null; b.h = 0; }
    } else for (const o of obstacles) { // volgend obstakel: een paar keer ontwijken, daarna struikelen
      if (o.type === 'door' || b.handled.has(o) || o.x > b.x + 150 || o.x + o.w < b.x - 20) continue;
      b.handled.add(o);
      if (b.survived >= b.need) { b.trip = o; break; }
      b.survived++;
      b.act = o.type === 'lamp' ? { type: 'duck', t: 0, T: (o.w + 90) / speed } : { type: 'hop', t: 0, T: (o.w + 100) / speed, H: o.h + 48 };
      break;
    }
    if (b.trip && !b.act && b.trip.x < b.x + 24 && b.trip.x + b.trip.w > b.x - 20) {
      b.state = 'fall'; b.fallT = 0; b.h = 0; score += 25; shake = 0.15; pop(`${b.def.name} gestruikeld! +25 m`, 90, 150, '#ffd43b');
    }
  } else { // jij bent gevallen: hij rent naar je toe en blijft staan
    b.h = 0; b.act = null;
    if (b.x < targetX + 30) { b.x = Math.min(targetX + 30, b.x + 260 * dt); b.ph += dt * 14; b.idle = false; } else b.idle = true;
  }
}
function update(dt) {
  const M = MODES[mode];
  if (state === 'menu') return;
  dispLevel += (level - dispLevel) * Math.min(1, dt * 7); pulse = Math.max(0, pulse - dt); shake = Math.max(0, shake - dt); drunk = Math.max(0, drunk - dt);
  zoneBlend += (zone - zoneBlend) * Math.min(1, dt * 1.5); bonusBlend += ((bonus ? 1 : 0) - bonusBlend) * Math.min(1, dt * 3); flash = Math.max(0, flash - dt * 1.6);
  for (const d of dust) { if (d.g) d.vy += 700 * dt; d.t += dt; d.x += d.vx * dt - (state === 'play' ? speed * dt : 0); d.y += d.vy * dt; }
  dust = dust.filter(d => d.t < 0.6);
  for (const m of motes) { m.x -= m.v * dt; m.y += Math.sin(time * 0.6 + m.p) * 4 * dt; if (m.x < -5) m.x = W + 5; }
  popups.forEach(p => p.t += dt); popups = popups.filter(p => p.t < 1.1);
  for (const p of confetti) { p.x += p.vx * dt; p.y += p.vy * dt; p.r += dt * 6; if (p.y > H + 10) { if (p.loop) { p.y = -10; p.x = rnd(0, W); } else p.dead = true; } }
  confetti = confetti.filter(p => !p.dead);
  if (state === 'ready') return;
  if (state === 'faint') {
    faintT += dt; stepPhysics(dt, false); updateBouncer(dt);
    if (faintT > 1.3 && !overShown) { state = 'over'; showResult('faint'); }
    return;
  }
  if (state === 'won') {
    wonT += dt; stepPhysics(dt, false);
    if (wonT > 1.6 && !overShown) showResult('won');
    return;
  }
  if (state === 'finished') { finT += dt; stepPhysics(dt, false); if (finT > 1.4 && !overShown) showResult('finish'); return; }
  if (state === 'over') { updateBouncer(dt); return; }
  if (state !== 'play') return;
  time += dt; hintT += dt; speed = Math.min(M.max * D().speed, (M.base + time * M.grow) * D().speed); score += speed * dt / 50; phase += dt * speed * 0.052;
  player.duck = input.duck;
  for (const o of obstacles) o.x -= speed * dt;
  for (const c of items) {
    c.x -= speed * (c.type === 'gold' ? 1.5 : 1) * dt; // het gouden drankje vliegt sneller voorbij
    if (c.type === 'gold') {
      c.y = c.by + Math.sin(time * 4 + c.p) * 14;
      if (Math.random() < 0.6) dust.push({ x: c.x + 10, y: c.y + rnd(-7, 7), vx: rnd(20, 70), vy: rnd(-15, 15), t: 0, r: rnd(1, 2.6), col: '255,212,59' });
    }
  }
  goldIn -= dt;
  if (goldIn <= 0 && score < FINISH - 80) { items.push({ type: 'gold', x: W + 50, by: GROUND - rnd(55, 150), y: GROUND - 90, p: rnd(0, 6), got: false }); goldIn = rnd(14, 24) * D().gold; }
  stepPhysics(dt, input.duck);
  const air = !player.on;
  if (wasAir && !air) for (let i = 0; i < 7; i++) dust.push({ x: player.x - 6, y: player.y - 2, vx: rnd(-90, 60), vy: rnd(-40, -5), t: 0, r: rnd(2, 4) });
  wasAir = air; dustT -= dt;
  if (!air && dustT <= 0) { dustT = player.duck ? 0.07 : 0.11; dust.push({ x: player.x - 10, y: player.y - 2, vx: rnd(-50, -10), vy: rnd(-30, -8), t: 0, r: rnd(1.5, 3) }); }
  if (score >= nextMile) { pop(nextMile + ' m!', 84, 64, '#ffd43b'); nextMile += 100; }
  if (bonus && score >= bonus.until) { bonus = null; flash = 0.9; pop('Terug in het café', W / 2 - 60, 130, '#ffd43b'); nextVatAt = Math.max(nextVatAt, score + 200); }
  const nz = bonus ? 0 : Math.floor(score / 150) % 2; // elke 150 m wisselt het café tussen bar en dansvloer
  if (nz !== zone) { zone = nz; pop(zone ? 'Dansvloer!' : 'Terug in het café', W / 2 - 50, 130, '#ff9de2'); }
  bouncerIn -= dt;
  if (!bouncer && !bonus && bouncerIn <= 0 && score < FINISH - 150) { bouncer = newChaser(); bouncerIn = rnd(24, 36) * D().chase; }
  updateBouncer(dt);
  if (score < FINISH - 15) { spawnIn -= dt; if (spawnIn <= 0) spawn(); } // vlak voor de finish komen er geen obstakels meer
  if (!finishObj && score >= FINISH - 10) finishObj = { x: W + 40 };
  if (finishObj) {
    finishObj.x -= speed * dt;
    if (finishObj.x <= player.x) { // over de finish: dan moet je opdrinken wat er nog in je glas zit
      state = 'finished'; finT = 0; score = FINISH; overShown = false;
      if (FINISH > best) { best = FINISH; store.set(bestKey(), best); }
      for (let i = 0; i < 60; i++) confetti.push({ x: rnd(0, W), y: rnd(-200, 0), vx: rnd(-30, 30), vy: rnd(80, 220), r: rnd(0, 6), c: ['#ffc933', '#ff6b6b', '#4dabf7', '#69db7c', '#f783ac'][i % 5], loop: true });
      return;
    }
  }
  const pb = playerBox();
  for (const o of obstacles) {
    if (o.type === 'door') { // achterdeur: erdoorheen rennen brengt je buiten
      if (!o.done && o.x + o.w / 2 <= player.x) { o.done = true; enterBonus(o); return; }
      continue;
    }
    let hit;
    if (o.type === 'vat') {
      if (pb.x < o.x + o.w - 8 && pb.x + pb.w > o.x + 8) {
        if (player.y <= o.y + 28 && player.vy >= 0 && !player.on) { enterBonus(o); return; } // van boven erin vallen
        hit = player.y > o.y + 28; // tegen de zijkant lopen doet pijn
      } else hit = false;
    } else if (o.type === 'table') hit = pb.x < o.x + o.w - 6 && pb.x + pb.w > o.x + 6 && player.y > o.y + 14;
    else if (o.type === 'shards') hit = pb.x < o.x + o.w - 8 && pb.x + pb.w > o.x + 8 && pb.y + pb.h > o.y + 8;
    else hit = pb.x < o.x + o.w - 5 && pb.x + pb.w > o.x + 5 && pb.y < o.y + o.h - 3 && pb.y + pb.h > o.y + 3;
    if (hit) return faintNow();
  }
  for (const c of items) {
    if (!c.got && Math.abs(c.x - player.x) < 28 && c.y > pb.y - 14 && c.y < pb.y + pb.h + 14) { c.got = true; collect(c); if (state !== 'play') return; }
  }
  obstacles = obstacles.filter(o => o.x > -120);
  items = items.filter(c => c.x > -50 && !c.got);
}

/* ---------- tekenen: voorwerpen ---------- */
function drawBottle(x, y, k = 1) { // groen bierflesje
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
  ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(0, 17, 8, 2.5, 0, 0, 7); ctx.fill();
  const g = ctx.createLinearGradient(-7, 0, 7, 0); if (GOLDMODE) { g.addColorStop(0, '#7a5200'); g.addColorStop(0.35, '#ffd43b'); g.addColorStop(1, '#6b4600'); } else { g.addColorStop(0, '#0f4d22'); g.addColorStop(0.35, '#37b24d'); g.addColorStop(1, '#0d3d1b'); }
  ctx.fillStyle = g; ctx.strokeStyle = '#0a2d14'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(-6.5, 16); ctx.lineTo(-6.5, -2); ctx.quadraticCurveTo(-6.5, -6, -2.6, -9); ctx.lineTo(-2.4, -17); ctx.lineTo(2.4, -17); ctx.lineTo(2.6, -9); ctx.quadraticCurveTo(6.5, -6, 6.5, -2); ctx.lineTo(6.5, 16); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#f1e9d2'; ctx.fillRect(-6.5, 2, 13, 9); ctx.fillStyle = '#c92a2a'; ctx.fillRect(-6.5, 5, 13, 2.4);
  ctx.fillStyle = '#d4a017'; ctx.fillRect(-3, -19.5, 6, 3.4);
  ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(-4.6, -14, 1.6, 8); ctx.fillRect(-4.6, -2, 1.6, 3);
  ctx.restore();
}
function drawCocktail(x, y, w, h, lv) { // groot cocktailglas met rietje, parasolletje en limoen; lv = vulling 0..1
  const cx = x + w / 2, bowlH = h * 0.5;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(cx, y + h + 1, w * 0.36, 2.5, 0, 0, 7); ctx.fill();
  const bowl = () => { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.bezierCurveTo(x + w * 0.98, y + bowlH * 0.6, x + w * 0.62, y + bowlH * 0.98, cx + w * 0.07, y + bowlH); ctx.lineTo(cx - w * 0.07, y + bowlH); ctx.bezierCurveTo(x + w * 0.38, y + bowlH * 0.98, x + w * 0.02, y + bowlH * 0.6, x, y); ctx.closePath(); };
  // rietje achter het glas
  ctx.strokeStyle = '#e8283c'; ctx.lineWidth = Math.max(2, w * 0.06); ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(cx + w * 0.12, y + bowlH * 0.8); ctx.lineTo(x + w * 0.78, y - h * 0.22); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.setLineDash([w * 0.08, w * 0.08]); ctx.stroke(); ctx.setLineDash([]);
  bowl(); ctx.fillStyle = 'rgba(255,255,255,.14)'; ctx.fill();
  if (lv > 0.01) {
    ctx.save(); bowl(); ctx.clip();
    const top = y + bowlH - lv * bowlH * 0.9;
    const g = ctx.createLinearGradient(0, top, 0, y + bowlH); if (GOLDMODE) { g.addColorStop(0, '#fff0a0'); g.addColorStop(0.5, '#ffc933'); g.addColorStop(1, '#b8860b'); } else { g.addColorStop(0, '#ffb347'); g.addColorStop(0.5, '#ff6b9d'); g.addColorStop(1, '#c2185b'); }
    ctx.fillStyle = g; ctx.fillRect(x, top, w, bowlH);
    ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.fillRect(x + w * 0.2, top + 3, w * 0.16, w * 0.16); ctx.fillRect(x + w * 0.55, top + 2, w * 0.15, w * 0.15);
    ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.beginPath(); ctx.ellipse(cx, top, w * 0.45, 2, 0, 0, 7); ctx.fill();
    ctx.restore();
  }
  bowl(); ctx.strokeStyle = 'rgba(235,245,255,.9)'; ctx.lineWidth = 1.6; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, y + bowlH); ctx.lineTo(cx, y + h - 3); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(cx, y + h - 2, w * 0.3, 2.4, 0, 0, 7); ctx.stroke();
  // limoen op de rand en parasolletje
  ctx.fillStyle = '#7ed321'; ctx.strokeStyle = '#3d7a0a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x + w * 0.1, y, w * 0.13, 0, 7); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#6a4a2a'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x + w * 0.3, y + bowlH * 0.5); ctx.lineTo(x + w * 0.42, y - h * 0.2); ctx.stroke();
  ctx.fillStyle = '#ff4d8d'; ctx.beginPath(); ctx.arc(x + w * 0.42, y - h * 0.2, w * 0.2, Math.PI, 0); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ffd43b'; ctx.beginPath(); ctx.arc(x + w * 0.42, y - h * 0.2, w * 0.2, Math.PI * 1.35, Math.PI * 1.65); ctx.lineTo(x + w * 0.42, y - h * 0.2); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x + w * 0.1, y + 3); ctx.quadraticCurveTo(x + w * 0.1, y + bowlH * 0.5, x + w * 0.3, y + bowlH * 0.8); ctx.stroke();
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
    const g = ctx.createLinearGradient(0, top, 0, y + bowlH); if (GOLDMODE) { g.addColorStop(0, '#ffe27a'); g.addColorStop(1, '#c98a00'); } else { g.addColorStop(0, '#b0244f'); g.addColorStop(1, '#5c0f27'); }
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
function drawGold(c) { // gouden drankje met glans en sterretjes
  const pu = 0.6 + 0.4 * Math.sin(time * 8 + c.p);
  const g = ctx.createRadialGradient(c.x, c.y, 2, c.x, c.y, 36); g.addColorStop(0, `rgba(255,226,120,${0.5 * pu + 0.25})`); g.addColorStop(1, 'rgba(255,226,120,0)');
  ctx.fillStyle = g; ctx.fillRect(c.x - 38, c.y - 38, 76, 76);
  GOLDMODE = true;
  if (mode === 1) drawBottle(c.x, c.y, 1.15); else if (mode === 3) drawCocktail(c.x - 13, c.y - 22, 26, 44, 0.6); else drawWine(c.x - 12, c.y - 21, 24, 42, 0.6);
  GOLDMODE = false;
  ctx.fillStyle = '#fff7c2';
  for (let i = 0; i < 3; i++) { const a = time * 3 + i * 2.1 + c.p, sx = c.x + Math.cos(a) * 22, sy = c.y + Math.sin(a) * 18; ctx.fillRect(sx - 3, sy - 0.8, 6, 1.6); ctx.fillRect(sx - 0.8, sy - 3, 1.6, 6); }
}
function drawItem(c, bob = 0) {
  if (c.type === 'gold') { drawGold(c); return; }
  if (c.type === 'shot') drawShot(c.x, c.y + bob, 1.25);
  else if (mode === 1) drawBottle(c.x, c.y + bob);
  else if (mode === 3) drawCocktail(c.x - 12, c.y + bob - 20, 24, 40, 0.55);
  else drawWine(c.x - 11, c.y + bob - 19, 22, 38, 0.42);
}
const FIELD_THEMES = ['wheat', 'vineyard', 'fruit'];
// Obstakels in de velden: strobalen, druivenkratten, fruitmanden, picknicktafels...
const FIELDOBJ = {
  barrel(o, th) { // 50 x 46
    const w = o.w, h = o.h;
    if (th === 'wheat') { // strobaal
      const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#f0c85a'); g.addColorStop(1, '#b8892a');
      ctx.fillStyle = g; ctx.strokeStyle = '#7a5a14'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(1, 4, w - 2, h - 4, 6); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(120,80,10,.5)'; ctx.lineWidth = 1; for (let i = 0; i < 14; i++) { const yy = 8 + (i * 7) % (h - 12), xx = 4 + (i * 13) % (w - 14); ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx + 9, yy + 1); ctx.stroke(); }
      ctx.fillStyle = '#6a4a14'; ctx.fillRect(14, 4, 3, h - 4); ctx.fillRect(w - 18, 4, 3, h - 4);
    } else { // mand met druiven of fruit
      const g = ctx.createLinearGradient(0, 0, w, 0); g.addColorStop(0, '#8a5a2a'); g.addColorStop(0.5, '#c9964e'); g.addColorStop(1, '#7a4a20');
      ctx.fillStyle = g; ctx.strokeStyle = '#4a2a10'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(2, 20); ctx.lineTo(w - 2, 20); ctx.lineTo(w - 7, h); ctx.lineTo(7, h); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(60,30,10,.5)'; ctx.lineWidth = 1; for (let i = 1; i < 5; i++) { ctx.beginPath(); ctx.moveTo(3, 20 + i * 5); ctx.lineTo(w - 3, 20 + i * 5); ctx.stroke(); }
      const cols = th === 'vineyard' ? ['#6a2c91', '#7d3aa8', '#512070'] : ['#ff9f1c', '#ffbf3c', '#ff7a1c'];
      for (let i = 0; i < 10; i++) { ctx.fillStyle = cols[i % 3]; ctx.beginPath(); ctx.arc(9 + (i % 5) * 8 + (i > 4 ? 4 : 0), 14 - (i > 4 ? 0 : -3) + (i > 4 ? -3 : 0), th === 'vineyard' ? 5.2 : 6.5, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.arc(7 + (i % 5) * 8 + (i > 4 ? 4 : 0), 12 + (i > 4 ? -3 : 0), 1.5, 0, 7); ctx.fill(); }
      ctx.fillStyle = '#4a9a2a'; ctx.beginPath(); ctx.ellipse(w / 2 + 6, 5, 8, 4, 0.5, 0, 7); ctx.fill();
    }
  },
  crates(o, th) { // 44 x 78 (twee op elkaar)
    for (let i = 0; i < 2; i++) {
      const yy = i * 39, w = o.w;
      if (th === 'wheat') { // graanzakken
        const g = ctx.createLinearGradient(0, yy, w, yy); g.addColorStop(0, '#b8955a'); g.addColorStop(0.5, '#e0c283'); g.addColorStop(1, '#a8854a');
        ctx.fillStyle = g; ctx.strokeStyle = '#6a4e22'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(1, yy + 8, w - 2, 31, 10); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.roundRect(13, yy + 1, w - 26, 12, 4); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#6a4a14'; ctx.fillRect(12, yy + 9, w - 24, 3);
        ctx.strokeStyle = 'rgba(100,70,20,.4)'; ctx.lineWidth = 0.8; for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.moveTo(6 + k * 8, yy + 16); ctx.lineTo(6 + k * 8, yy + 36); ctx.stroke(); }
      } else { // kratten met druiven / fruit
        ctx.fillStyle = '#b5834a'; ctx.strokeStyle = '#3b2412'; ctx.lineWidth = 2; ctx.fillRect(0, yy + 10, w, 29); ctx.strokeRect(0, yy + 10, w, 29);
        ctx.strokeStyle = 'rgba(60,35,15,.55)'; ctx.lineWidth = 1; for (const ly of [19, 28]) { ctx.beginPath(); ctx.moveTo(1, yy + ly); ctx.lineTo(w - 1, yy + ly); ctx.stroke(); }
        const cols = th === 'vineyard' ? (i ? ['#6a2c91', '#7d3aa8'] : ['#8fbf3a', '#a8d44a']) : (i ? ['#e63946', '#2a9d3f'] : ['#ff9f1c', '#ffbf3c']);
        for (let k = 0; k < 6; k++) { ctx.fillStyle = cols[k % 2]; ctx.beginPath(); ctx.arc(7 + k * 6.4, yy + 8 + (k % 2) * 2, th === 'vineyard' ? 4.8 : 6, 0, 7); ctx.fill(); }
      }
    }
  },
  shards(o, th) { // 66 x 30: stenen met grasbosjes
    ctx.fillStyle = '#5a9a3a'; for (const gx of [4, 22, 40, 58]) { ctx.beginPath(); ctx.moveTo(gx, o.h); ctx.lineTo(gx + 2, o.h - 9); ctx.lineTo(gx + 4, o.h); ctx.lineTo(gx + 6, o.h - 7); ctx.lineTo(gx + 8, o.h); ctx.fill(); }
    for (const [sx, sw, sh, sc] of [[3, 24, 18, '#8d8f94'], [24, 26, 28, '#a3a6ab'], [44, 20, 15, '#7e8085']]) {
      const g = ctx.createLinearGradient(sx, o.h - sh, sx + sw, o.h); g.addColorStop(0, sc); g.addColorStop(1, '#5a5c60');
      ctx.fillStyle = g; ctx.strokeStyle = '#3a3c40'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(sx, o.h - 1); ctx.lineTo(sx + sw * 0.15, o.h - sh * 0.7); ctx.lineTo(sx + sw * 0.5, o.h - sh); ctx.lineTo(sx + sw * 0.9, o.h - sh * 0.6); ctx.lineTo(sx + sw, o.h - 1); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
  },
  bollard(o, th) { // houten hekpalen
    const cap = { wheat: '#e3b64c', vineyard: '#6a2c91', fruit: '#ff9f1c' }[th];
    for (let i = 0; i < o.k; i++) {
      const bx = i * 30, g = ctx.createLinearGradient(bx, 0, bx + 16, 0); g.addColorStop(0, '#6a4624'); g.addColorStop(0.45, '#a87a45'); g.addColorStop(1, '#5a3a1a');
      ctx.fillStyle = g; ctx.strokeStyle = '#2e1b0c'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.roundRect(bx, 6, 16, o.h - 6, [3, 3, 2, 2]); ctx.fill(); ctx.stroke();
      ctx.fillStyle = cap; ctx.beginPath(); ctx.roundRect(bx - 1, 0, 18, 10, 4); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(40,20,5,.4)'; ctx.lineWidth = 0.8; for (const ly of [20, 30, 42]) { ctx.beginPath(); ctx.moveTo(bx + 2, ly); ctx.lineTo(bx + 14, ly + 1); ctx.stroke(); }
      if (i < o.k - 1) { ctx.strokeStyle = th === 'vineyard' ? '#8a8a8f' : '#c9a86a'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(bx + 16, 22); ctx.quadraticCurveTo(bx + 23, 28, bx + 30, 22); ctx.moveTo(bx + 16, 38); ctx.quadraticCurveTo(bx + 23, 44, bx + 30, 38); ctx.stroke(); }
    }
  },
  table(o, th) { // picknicktafel (bovenkant op y = 0)
    const w = o.w, h = o.h, cl = { wheat: ['#f4d35e', '#fff8dc'], vineyard: ['#7b2d8e', '#f3e6f7'], fruit: ['#ff9f1c', '#fff4e0'] }[th];
    ctx.strokeStyle = '#4a2e14'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    for (const lx of [w * 0.18, w * 0.78]) { ctx.beginPath(); ctx.moveTo(lx, 10); ctx.lineTo(lx - 12, h); ctx.moveTo(lx, 10); ctx.lineTo(lx + 12, h); ctx.stroke(); }
    ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(w * 0.18 - 6, h - 16); ctx.lineTo(w * 0.78 + 6, h - 16); ctx.stroke();
    const tg = ctx.createLinearGradient(0, 0, 0, 10); tg.addColorStop(0, '#c9965a'); tg.addColorStop(1, '#8a5a2a'); ctx.fillStyle = tg; ctx.strokeStyle = '#3b2412'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(-2, 0, w + 4, 10, 3); ctx.fill(); ctx.stroke();
    const cells = Math.floor((w - 10) / 9.1);
    for (let i = 0; i < cells; i++) for (let j = 0; j < 2; j++) { ctx.fillStyle = (i + j) % 2 ? cl[1] : cl[0]; ctx.fillRect(5 + i * ((w - 10) / cells), 10 + j * 8, (w - 10) / cells + 0.5, 8); }
    ctx.fillStyle = 'rgba(0,0,0,.15)'; ctx.fillRect(5, 22, w - 10, 4);
  },
  lamp(o, th) { // hangt op hoofdhoogte: snoer + bos
    const sway = Math.sin(time * 3 + o.x * 0.01) * 0.05;
    ctx.translate(o.w / 2, 0); ctx.rotate(sway);
    ctx.strokeStyle = '#6a4a2a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -o.y); ctx.lineTo(0, 8); ctx.stroke();
    if (th === 'wheat') { // opgehangen korenschoof
      for (let i = -5; i <= 5; i++) { ctx.strokeStyle = '#d9a93a'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(i * 0.8, 8); ctx.lineTo(i * 3.4, 36); ctx.stroke(); ctx.fillStyle = '#f0c24a'; ctx.beginPath(); ctx.ellipse(i * 3.4, 36, 2.2, 5, i * 0.08, 0, 7); ctx.fill(); }
      ctx.fillStyle = '#6a4a14'; ctx.fillRect(-6, 10, 12, 4);
    } else if (th === 'vineyard') { // druiventros
      ctx.fillStyle = '#4a9a2a'; ctx.beginPath(); ctx.ellipse(6, 8, 9, 4, -0.4, 0, 7); ctx.fill();
      for (let r = 0; r < 5; r++) for (let k = 0; k <= 4 - r; k++) { ctx.fillStyle = (r + k) % 2 ? '#6a2c91' : '#7d3aa8'; ctx.beginPath(); ctx.arc((k - (4 - r) / 2) * 8, 14 + r * 6.5, 4.6, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.arc((k - (4 - r) / 2) * 8 - 1.5, 12.5 + r * 6.5, 1.2, 0, 7); ctx.fill(); }
    } else { // sinaasappels aan een tak
      ctx.strokeStyle = '#4a9a2a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-14, 10); ctx.quadraticCurveTo(0, 4, 14, 10); ctx.stroke();
      for (const [ox, oy] of [[-11, 22], [0, 28], [11, 22]]) { ctx.strokeStyle = '#6a4a2a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(ox, 10); ctx.lineTo(ox, oy - 8); ctx.stroke(); const g = ctx.createRadialGradient(ox - 3, oy - 3, 1, ox, oy, 10); g.addColorStop(0, '#ffc454'); g.addColorStop(1, '#e8750c'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(ox, oy, 9, 0, 7); ctx.fill(); ctx.fillStyle = '#4a9a2a'; ctx.beginPath(); ctx.ellipse(ox + 3, oy - 9, 4, 2, -0.5, 0, 7); ctx.fill(); }
    }
  }
};
// Per omgeving een eigen uiterlijk (dezelfde afmetingen en botsingen, andere look)
const THEMED = {
  barrel(o, th) { // 50 x 46
    const w = o.w, h = o.h;
    if (th === 'cocktail') { // zilveren cocktailshaker
      const g = ctx.createLinearGradient(0, 0, w, 0); g.addColorStop(0, '#8b94a1'); g.addColorStop(0.35, '#f4f7fa'); g.addColorStop(1, '#79828f');
      ctx.fillStyle = g; ctx.strokeStyle = '#4a525c'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(5, 16); ctx.lineTo(w - 5, 16); ctx.lineTo(w - 10, h); ctx.lineTo(10, h); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.roundRect(11, 3, w - 22, 14, 3); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.roundRect(w / 2 - 6, -3, 12, 7, 3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(12, 20, 3, h - 28); ctx.fillStyle = 'rgba(180,230,255,.6)'; for (const [dx, dy] of [[30, 26], [24, 34], [34, 38]]) { ctx.beginPath(); ctx.arc(dx, dy, 1.6, 0, 7); ctx.fill(); }
    } else if (th === 'beer') { // roestvrijstalen fust
      const g = ctx.createLinearGradient(0, 0, w, 0); g.addColorStop(0, '#7b858c'); g.addColorStop(0.4, '#eef3f6'); g.addColorStop(1, '#6a747b');
      ctx.fillStyle = g; ctx.strokeStyle = '#3f474d'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(2, 4, w - 4, h - 4, 7); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#4a545b'; ctx.fillRect(0, 12, w, 4); ctx.fillRect(0, h - 14, w, 4); ctx.beginPath(); ctx.roundRect(8, 0, w - 16, 7, 3); ctx.fill();
      ctx.fillStyle = '#c0392b'; ctx.fillRect(w / 2 - 9, 22, 18, 10); ctx.fillStyle = '#fff'; ctx.font = '800 8px Nunito, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('BIER', w / 2, 30); ctx.textAlign = 'left';
    } else if (th === 'wine') { // donker eiken wijnvat met gelekte wijn
      const g = ctx.createLinearGradient(0, 0, w, 0); g.addColorStop(0, '#2e170a'); g.addColorStop(0.4, '#6b3a18'); g.addColorStop(1, '#251207');
      ctx.fillStyle = g; ctx.strokeStyle = '#150a03'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(5, 0); ctx.quadraticCurveTo(-5, h / 2, 5, h); ctx.lineTo(w - 5, h); ctx.quadraticCurveTo(w + 5, h / 2, w - 5, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
      for (const yy of [8, h - 14]) { ctx.fillStyle = '#b8892a'; ctx.fillRect(-1, yy, w + 2, 4); ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.fillRect(-1, yy, w + 2, 1); }
      ctx.fillStyle = 'rgba(150,20,60,.85)'; ctx.fillRect(w * 0.6, 10, 3, 22); ctx.beginPath(); ctx.arc(w * 0.6 + 1.5, 32, 2.5, 0, 7); ctx.fill();
    } else { // disco: zwart met neonhoepels
      ctx.fillStyle = '#17102a'; ctx.strokeStyle = '#0a0614'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(5, 0); ctx.quadraticCurveTo(-5, h / 2, 5, h); ctx.lineTo(w - 5, h); ctx.quadraticCurveTo(w + 5, h / 2, w - 5, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.save(); ctx.shadowBlur = 12; for (const [yy, col] of [[8, '#ff3d81'], [h - 14, '#00e5ff']]) { ctx.shadowColor = col; ctx.fillStyle = col; ctx.fillRect(-1, yy, w + 2, 3); } ctx.restore();
    }
  },
  crates(o, th) { // 44 x 78, twee op elkaar
    for (let i = 0; i < 2; i++) {
      const yy = i * 39, w = o.w;
      if (th === 'disco') { // speakerkasten
        ctx.fillStyle = '#16121f'; ctx.strokeStyle = '#05030a'; ctx.lineWidth = 2; ctx.fillRect(0, yy, w, 39); ctx.strokeRect(0, yy, w, 39);
        for (const [cx, cy, r] of [[w / 2, yy + 13, 8], [w / 2, yy + 29, 5]]) { ctx.fillStyle = '#0a0812'; ctx.beginPath(); ctx.arc(cx, cy, r + 2, 0, 7); ctx.fill(); ctx.fillStyle = '#3a3550'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill(); ctx.fillStyle = '#6a6488'; ctx.beginPath(); ctx.arc(cx, cy, r * 0.4, 0, 7); ctx.fill(); }
        ctx.fillStyle = '#c0c4cc'; for (const [nx, ny] of [[2, 2], [w - 4, 2], [2, 35], [w - 4, 35]]) ctx.fillRect(nx, yy + ny, 2.5, 2.5);
        ctx.save(); ctx.shadowColor = '#ff3d81'; ctx.shadowBlur = 8; ctx.fillStyle = '#ff3d81'; ctx.fillRect(w - 8, yy + 4, 4, 2); ctx.restore();
      } else if (th === 'wine') { // wijnkisten met stro en flessenhalzen
        const g = ctx.createLinearGradient(0, yy, w, yy + 39); g.addColorStop(0, '#c9a36a'); g.addColorStop(1, '#9a7442');
        ctx.fillStyle = g; ctx.strokeStyle = '#3b2412'; ctx.lineWidth = 2; ctx.fillRect(0, yy, w, 39); ctx.strokeRect(0, yy, w, 39);
        ctx.strokeStyle = 'rgba(60,35,15,.55)'; ctx.lineWidth = 1; for (const ly of [10, 20, 30]) { ctx.beginPath(); ctx.moveTo(1, yy + ly); ctx.lineTo(w - 1, yy + ly); ctx.stroke(); }
        ctx.fillStyle = '#7a1230'; ctx.font = '800 9px Nunito, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('VIN', w / 2, yy + 24); ctx.textAlign = 'left';
        if (i === 0) { ctx.fillStyle = '#e0c060'; for (let k = 0; k < 6; k++) ctx.fillRect(3 + k * 6.5, yy - 2, 2, 5); ctx.fillStyle = '#14301c'; for (const bx of [10, 22, 34]) { ctx.beginPath(); ctx.arc(bx, yy + 3, 3, 0, 7); ctx.fill(); } }
      } else if (th === 'beer') { // gele bierkratten met doppen
        ctx.fillStyle = '#e0a800'; ctx.strokeStyle = '#6b4f00'; ctx.lineWidth = 2; ctx.fillRect(0, yy, w, 39); ctx.strokeRect(0, yy, w, 39);
        ctx.fillStyle = '#7a5a00'; ctx.fillRect(w / 2 - 9, yy + 4, 18, 5); ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.fillRect(2, yy + 2, w - 4, 2);
        for (let r = 0; r < 2; r++) for (let k = 0; k < 4; k++) { ctx.fillStyle = '#1e5a2c'; ctx.beginPath(); ctx.arc(7 + k * 10.2, yy + 18 + r * 10, 4, 0, 7); ctx.fill(); ctx.fillStyle = '#d4a017'; ctx.beginPath(); ctx.arc(7 + k * 10.2, yy + 18 + r * 10, 2.2, 0, 7); ctx.fill(); }
      } else { // cocktail: ijsbox
        const g = ctx.createLinearGradient(0, yy, 0, yy + 39); g.addColorStop(0, '#ff9ec8'); g.addColorStop(1, '#e0558f');
        ctx.fillStyle = g; ctx.strokeStyle = '#8a1f4f'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(0, yy, w, 39, 5); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.fillRect(2, yy + 2, w - 4, 8); ctx.fillStyle = '#e0558f'; ctx.font = '800 9px Nunito, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('ICE', w / 2, yy + 25); ctx.textAlign = 'left';
        ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(4, yy + 30, 8, 4); ctx.fillRect(w - 14, yy + 28, 9, 5);
      }
    }
  },
  shards(o, th) { // 66 x 30
    const pud = { disco: ['rgba(255,60,170,.75)', 'rgba(0,229,255,.2)'], wine: ['rgba(120,15,50,.85)', 'rgba(120,15,50,.2)'], beer: ['rgba(245,245,225,.9)', 'rgba(220,160,40,.3)'], cocktail: ['rgba(255,107,157,.85)', 'rgba(255,180,70,.2)'] }[th];
    const g = ctx.createRadialGradient(33, o.h - 3, 2, 33, o.h - 3, 36); g.addColorStop(0, pud[0]); g.addColorStop(1, pud[1]);
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(33, o.h - 3, 36, 6, 0, 0, 7); ctx.fill();
    const sh = [[2, 14, 8], [14, 26, 12], [30, 18, 9], [44, 24, 11], [54, 12, 7]];
    sh.forEach(([sx, sh_, sw], i) => {
      ctx.fillStyle = th === 'disco' ? `hsla(${i * 70 + 280},95%,65%,.9)` : th === 'wine' ? 'rgba(30,60,35,.92)' : th === 'beer' ? 'rgba(150,85,25,.9)' : 'rgba(215,240,250,.85)';
      ctx.strokeStyle = th === 'wine' ? '#0a1c0e' : th === 'beer' ? '#5a3010' : 'rgba(40,70,90,.9)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(sx, o.h - 2); ctx.lineTo(sx + sw * 0.45, o.h - sh_); ctx.lineTo(sx + sw, o.h - 2); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.moveTo(sx + sw * 0.4, o.h - sh_ + 4); ctx.lineTo(sx + sw * 0.3, o.h - 6); ctx.stroke();
    });
    if (th === 'cocktail') { ctx.fillStyle = '#7ed321'; ctx.beginPath(); ctx.arc(58, o.h - 6, 6, Math.PI, 0); ctx.fill(); }
  },
  bollard(o, th) {
    const pal = { disco: ['#ff3d81', '#fff'], wine: ['#1f4d2e', '#c9a227'], beer: ['#f2c200', '#1a1a1a'], cocktail: ['#ff7ab5', '#ffffff'] }[th];
    for (let i = 0; i < o.k; i++) {
      const bx = i * 30;
      ctx.save(); if (th === 'disco' || th === 'cocktail') { ctx.shadowColor = pal[0]; ctx.shadowBlur = 12; }
      ctx.fillStyle = pal[1]; ctx.strokeStyle = '#222'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.roundRect(bx, 0, 16, o.h, [8, 8, 2, 2]); ctx.fill(); ctx.stroke(); ctx.restore();
      ctx.save(); ctx.beginPath(); ctx.roundRect(bx, 0, 16, o.h, [8, 8, 2, 2]); ctx.clip();
      ctx.fillStyle = pal[0]; ctx.fillRect(bx, 8, 16, 9); ctx.fillRect(bx, 26, 16, 9); ctx.fillRect(bx, 44, 16, 12); ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(bx + 3, 0, 2.5, o.h); ctx.restore();
    }
  },
  table(o, th) { // top op y = 0, 10 hoog; tot de grond 55
    const w = o.w, h = o.h;
    if (th === 'cocktail') { // hoge glazen bartafel met chromen poten en neon
      ctx.fillStyle = '#c9d2dc'; ctx.fillRect(10, 12, 6, h - 12); ctx.fillRect(w - 16, 12, 6, h - 12); ctx.fillStyle = '#eef3f8'; ctx.fillRect(10, 12, 2, h - 12); ctx.fillRect(w - 16, 12, 2, h - 12);
      ctx.fillStyle = 'rgba(160,230,255,.55)'; ctx.strokeStyle = 'rgba(230,250,255,.95)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(-2, 0, w + 4, 10, 4); ctx.fill(); ctx.stroke();
      ctx.save(); ctx.shadowColor = '#ff3d81'; ctx.shadowBlur = 12; ctx.fillStyle = '#ff7ab5'; ctx.fillRect(0, 9, w, 2.5); ctx.restore();
    } else if (th === 'disco') { // zwart glanzend met ledrand
      ctx.fillStyle = '#26203a'; ctx.fillRect(w / 2 - 5, 12, 10, h - 12); ctx.fillStyle = '#17102a'; ctx.fillRect(10, 12, 7, h - 12); ctx.fillRect(w - 17, 12, 7, h - 12);
      const g = ctx.createLinearGradient(0, 0, 0, 10); g.addColorStop(0, '#3a3158'); g.addColorStop(1, '#120c24'); ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(-2, 0, w + 4, 10, 3); ctx.fill();
      ctx.save(); ctx.shadowBlur = 12; for (let i = 0; i < 6; i++) { const col = `hsl(${i * 60 + time * 80},95%,60%)`; ctx.shadowColor = col; ctx.fillStyle = col; ctx.fillRect(-2 + i * ((w + 4) / 6), 8, (w + 4) / 6 + 0.5, 3); } ctx.restore();
    } else if (th === 'wine') { // plank op twee wijnvaatjes met kaarsen
      const bg = ctx.createLinearGradient(0, 0, 28, 0); bg.addColorStop(0, '#2e170a'); bg.addColorStop(0.5, '#6b3a18'); bg.addColorStop(1, '#251207');
      for (const bx of [8, w - 36]) { ctx.fillStyle = bg; ctx.strokeStyle = '#150a03'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(bx, 10, 28, h - 10, 6); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#b8892a'; ctx.fillRect(bx, 18, 28, 3); ctx.fillRect(bx, h - 14, 28, 3); }
      const tg = ctx.createLinearGradient(0, 0, 0, 10); tg.addColorStop(0, '#7a5230'); tg.addColorStop(1, '#4a2e14'); ctx.fillStyle = tg; ctx.strokeStyle = '#1e1005'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(-2, 0, w + 4, 10, 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(130,20,55,.55)'; ctx.fillRect(w * 0.3, 1, 18, 3);
      for (const cx of [w * 0.2, w * 0.75]) { ctx.fillStyle = '#f1e6c8'; ctx.fillRect(cx - 2, -10, 4, 10); const fl = 0.7 + 0.3 * Math.sin(time * 14 + cx); ctx.fillStyle = `rgba(255,190,70,${fl})`; ctx.beginPath(); ctx.ellipse(cx, -14, 2, 4, 0, 0, 7); ctx.fill(); }
    } else { // beer: stalen werktafel
      ctx.fillStyle = '#7b858c'; ctx.fillRect(10, 12, 6, h - 12); ctx.fillRect(w - 16, 12, 6, h - 12); ctx.fillRect(10, h - 16, w - 20, 3);
      const g = ctx.createLinearGradient(0, 0, 0, 10); g.addColorStop(0, '#f3f7fa'); g.addColorStop(1, '#8d979d'); ctx.fillStyle = g; ctx.strokeStyle = '#4a545b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(-2, 0, w + 4, 10, 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(4, 2, w * 0.4, 2);
      ctx.fillStyle = '#e0a800'; ctx.fillRect(w * 0.15, 26, 30, 22); ctx.fillStyle = '#7a5a00'; ctx.fillRect(w * 0.15 + 10, 29, 10, 4); // bierkrat onder de tafel
    }
  },
  lamp(o, th) { // opgehangen op hoofdhoogte: x gecentreerd, 46 breed, 38 hoog
    const sway = Math.sin(time * 3 + o.x * 0.01) * 0.04;
    ctx.translate(o.w / 2, 0); ctx.rotate(sway);
    ctx.strokeStyle = '#1e1208'; ctx.lineWidth = 2;
    if (th === 'cocktail') { // neonbuis
      const pu = 0.75 + 0.25 * Math.sin(time * 9 + o.x);
      ctx.beginPath(); ctx.moveTo(-18, -o.y); ctx.lineTo(-18, 22); ctx.moveTo(18, -o.y); ctx.lineTo(18, 22); ctx.stroke();
      ctx.save(); ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 20 * pu; ctx.strokeStyle = `rgba(150,250,255,${pu})`; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-20, 26); ctx.lineTo(20, 26); ctx.stroke();
      ctx.shadowColor = '#ff3d81'; ctx.strokeStyle = `rgba(255,150,200,${pu})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-20, 36); ctx.lineTo(20, 36); ctx.stroke(); ctx.restore();
    } else if (th === 'disco') { // spiegelbol
      ctx.beginPath(); ctx.moveTo(0, -o.y); ctx.lineTo(0, 6); ctx.stroke();
      const gl = ctx.createRadialGradient(0, 22, 4, 0, 22, 60); gl.addColorStop(0, `hsla(${(time * 90) % 360},95%,65%,.5)`); gl.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = gl; ctx.fillRect(-60, -30, 120, 110);
      const gb = ctx.createRadialGradient(-5, 15, 2, 0, 22, 18); gb.addColorStop(0, '#fff'); gb.addColorStop(1, '#6f7590'); ctx.fillStyle = gb; ctx.beginPath(); ctx.arc(0, 22, 17, 0, 7); ctx.fill();
      for (let i = 0; i < 10; i++) { const an = i * 0.95 + time * 3; ctx.fillStyle = `hsl(${(i * 40 + time * 90) % 360},90%,78%)`; ctx.fillRect(Math.cos(an) * 11 - 1.5, 22 + Math.sin(an * 1.3) * 11 - 1.5, 3, 3); }
    } else if (th === 'wine') { // ijzeren lantaarn met kaars
      const fl = 0.8 + 0.2 * Math.sin(time * 13 + o.x);
      ctx.beginPath(); ctx.moveTo(0, -o.y); ctx.lineTo(0, 4); ctx.stroke();
      const gl = ctx.createRadialGradient(0, 22, 3, 0, 22, 55 * fl); gl.addColorStop(0, 'rgba(255,170,60,.6)'); gl.addColorStop(1, 'rgba(255,170,60,0)'); ctx.fillStyle = gl; ctx.fillRect(-60, -30, 120, 110);
      ctx.fillStyle = '#1a1a1a'; ctx.fillRect(-12, 4, 24, 4); ctx.fillRect(-12, 36, 24, 3); ctx.fillStyle = `rgba(255,200,90,${0.55 + 0.3 * fl})`; ctx.fillRect(-10, 8, 20, 28);
      ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 2; ctx.strokeRect(-10, 8, 20, 28); ctx.beginPath(); ctx.moveTo(0, 8); ctx.lineTo(0, 36); ctx.stroke();
      ctx.fillStyle = '#f1e6c8'; ctx.fillRect(-2, 22, 4, 14); ctx.fillStyle = '#ffd25e'; ctx.beginPath(); ctx.ellipse(0, 18, 2.4, 5, 0, 0, 7); ctx.fill();
    } else { // beer: industriële kooilamp
      ctx.beginPath(); ctx.moveTo(0, -o.y); ctx.lineTo(0, 4); ctx.stroke();
      const gl = ctx.createRadialGradient(0, 28, 4, 0, 28, 60); gl.addColorStop(0, 'rgba(255,240,190,.55)'); gl.addColorStop(1, 'rgba(255,240,190,0)'); ctx.fillStyle = gl; ctx.fillRect(-60, -20, 120, 110);
      const g = ctx.createLinearGradient(-20, 0, 20, 0); g.addColorStop(0, '#5f696f'); g.addColorStop(0.45, '#d6dde2'); g.addColorStop(1, '#4a545b');
      ctx.fillStyle = g; ctx.strokeStyle = '#2a3238'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-6, 4); ctx.lineTo(6, 4); ctx.lineTo(21, 24); ctx.lineTo(-21, 24); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff6c8'; ctx.beginPath(); ctx.arc(0, 28, 7, 0, 7); ctx.fill(); ctx.strokeStyle = '#2a3238'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.roundRect(-11, 22, 22, 15, 4); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-4, 22); ctx.lineTo(-4, 37); ctx.moveTo(4, 22); ctx.lineTo(4, 37); ctx.stroke();
    }
  }
};
function drawObstacle(o) {
  ctx.save(); ctx.translate(o.x, o.y);
  if (o.type !== 'lamp') { ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(o.w / 2, o.h, o.w * 0.6, 5, 0, 0, 7); ctx.fill(); }
  if (FIELD_THEMES.includes(o.theme) && FIELDOBJ[o.type]) { FIELDOBJ[o.type](o, o.theme); ctx.restore(); return; }
  if (o.theme && o.theme !== 'cafe' && !FIELD_THEMES.includes(o.theme) && THEMED[o.type]) { THEMED[o.type](o, o.theme); ctx.restore(); return; }
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
  } else if (o.type === 'vat' && o.liquid === 'cocktail') { // reuzecocktail: springen maar!
    const cx = o.w / 2;
    const gl = ctx.createRadialGradient(cx, -6, 4, cx, -6, 75); gl.addColorStop(0, 'rgba(255,90,170,.45)'); gl.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gl; ctx.fillRect(-60, -80, o.w + 120, 140);
    ctx.strokeStyle = '#e8283c'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(cx + 6, 40); ctx.lineTo(o.w - 4, -22); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 6; ctx.setLineDash([6, 6]); ctx.stroke(); ctx.setLineDash([]);
    const bowl = () => { ctx.beginPath(); ctx.moveTo(0, 6); ctx.lineTo(o.w, 6); ctx.bezierCurveTo(o.w - 2, 36, o.w * 0.66, 52, cx + 5, 54); ctx.lineTo(cx - 5, 54); ctx.bezierCurveTo(o.w * 0.34, 52, 2, 36, 0, 6); ctx.closePath(); };
    bowl(); ctx.fillStyle = 'rgba(255,255,255,.16)'; ctx.fill();
    ctx.save(); bowl(); ctx.clip();
    const lg = ctx.createLinearGradient(0, 8, 0, 54); lg.addColorStop(0, '#ffb347'); lg.addColorStop(0.55, '#ff6b9d'); lg.addColorStop(1, '#c2185b'); ctx.fillStyle = lg; ctx.fillRect(0, 10, o.w, 50);
    ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.fillRect(14, 14, 11, 11); ctx.fillRect(40, 12, 10, 10); ctx.fillRect(56, 18, 9, 9);
    ctx.restore();
    bowl(); ctx.strokeStyle = 'rgba(235,245,255,.95)'; ctx.lineWidth = 3; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, 54); ctx.lineTo(cx, o.h - 6); ctx.stroke(); ctx.beginPath(); ctx.ellipse(cx, o.h - 4, 26, 5, 0, 0, 7); ctx.stroke();
    ctx.fillStyle = '#7ed321'; ctx.strokeStyle = '#3d7a0a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(8, 6, 10, 0, 7); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#6a4a2a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(24, 30); ctx.lineTo(30, -10); ctx.stroke();
    ctx.fillStyle = '#ff4d8d'; ctx.beginPath(); ctx.arc(30, -10, 15, Math.PI, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffd43b'; ctx.beginPath(); ctx.arc(30, -10, 15, Math.PI * 1.35, Math.PI * 1.65); ctx.lineTo(30, -10); ctx.closePath(); ctx.fill();
    const by = -52 + Math.sin(time * 6 + o.x * 0.02) * 5;
    ctx.fillStyle = '#ffd43b'; ctx.strokeStyle = '#7a5200'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx - 9, by); ctx.lineTo(cx + 9, by); ctx.lineTo(cx, by + 14); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = '800 13px Nunito, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillText('Spring erin!', cx, by - 6); ctx.textAlign = 'left';
  } else if (o.type === 'vat') {
    const wine = o.liquid === 'wine', cx = o.w / 2;
    const gl = ctx.createRadialGradient(cx, -6, 4, cx, -6, 70); gl.addColorStop(0, wine ? 'rgba(255,110,160,.4)' : 'rgba(255,215,110,.45)'); gl.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gl; ctx.fillRect(-60, -80, o.w + 120, 140);
    const g = ctx.createLinearGradient(0, 0, o.w, 0); g.addColorStop(0, '#5e3210'); g.addColorStop(0.4, '#a8682c'); g.addColorStop(1, '#4a2609');
    ctx.fillStyle = g; ctx.strokeStyle = '#2a1608'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(6, 8); ctx.quadraticCurveTo(-6, o.h / 2, 6, o.h); ctx.lineTo(o.w - 6, o.h); ctx.quadraticCurveTo(o.w + 6, o.h / 2, o.w - 6, 8); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(40,20,5,.5)'; ctx.lineWidth = 1; for (let i = 1; i < 6; i++) { ctx.beginPath(); ctx.moveTo(o.w * i / 6, 14); ctx.lineTo(o.w * i / 6, o.h - 2); ctx.stroke(); }
    for (const yy of [24, o.h / 2 + 4, o.h - 18]) { ctx.fillStyle = '#3d3d44'; ctx.fillRect(-2, yy, o.w + 4, 6); ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.fillRect(-2, yy, o.w + 4, 1.5); }
    ctx.fillStyle = '#2a1608'; ctx.beginPath(); ctx.ellipse(cx, 8, cx - 1, 11, 0, 0, 7); ctx.fill();
    const lg = ctx.createRadialGradient(cx, 9, 2, cx, 9, cx); lg.addColorStop(0, wine ? '#c93a68' : '#ffd25e'); lg.addColorStop(1, wine ? '#5c0f27' : '#c27a0b');
    ctx.fillStyle = lg; ctx.beginPath(); ctx.ellipse(cx, 9, cx - 6, 8, 0, 0, 7); ctx.fill();
    if (!wine) { ctx.fillStyle = 'rgba(255,246,223,.9)'; for (let i = 0; i < 8; i++) { ctx.beginPath(); ctx.arc(cx + Math.cos(i * 0.8 + time * 2) * (cx - 14), 9 + Math.sin(i * 0.8 + time * 2) * 5, 3.2, 0, 7); ctx.fill(); } }
    else { ctx.fillStyle = 'rgba(255,200,215,.35)'; ctx.beginPath(); ctx.ellipse(cx - 8, 6, 14, 2.5, 0, 0, 7); ctx.fill(); }
    const by = -38 + Math.sin(time * 6 + o.x * 0.02) * 5;
    ctx.fillStyle = '#ffd43b'; ctx.strokeStyle = '#7a5200'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx - 9, by); ctx.lineTo(cx + 9, by); ctx.lineTo(cx, by + 14); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = '800 13px Nunito, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillText('Spring erin!', cx, by - 6); ctx.textAlign = 'left';
  } else if (o.type === 'door') { // achterdeur naar een veld: zonlicht schijnt naar binnen
    const k = o.kind, w = o.w, h = o.h, lab = { wheat: 'TARWEVELD', vineyard: 'DRUIVENVELD', fruit: 'FRUITTUIN' }[k];
    const gl = ctx.createLinearGradient(w / 2, 0, w / 2, h); gl.addColorStop(0, 'rgba(255,245,170,.0)'); gl.addColorStop(1, 'rgba(255,245,170,.55)'); ctx.fillStyle = gl; ctx.beginPath(); ctx.moveTo(6, h); ctx.lineTo(w - 6, h); ctx.lineTo(w + 40, h + 6); ctx.lineTo(-40, h + 6); ctx.fill();
    const sky = ctx.createLinearGradient(0, 10, 0, h); sky.addColorStop(0, '#8fd4ff'); sky.addColorStop(0.6, '#e8f7ff'); sky.addColorStop(1, '#fff2b8');
    ctx.fillStyle = sky; ctx.fillRect(6, 12, w - 12, h - 12);
    const fc = { wheat: ['#e0b43a', '#f2cd5a'], vineyard: ['#6a2c91', '#4e8a2a'], fruit: ['#ff9f1c', '#3f9a2a'] }[k];
    ctx.fillStyle = fc[1]; ctx.beginPath(); ctx.moveTo(6, h * 0.62); ctx.quadraticCurveTo(w / 2, h * 0.5, w - 6, h * 0.62); ctx.lineTo(w - 6, h); ctx.lineTo(6, h); ctx.fill();
    ctx.fillStyle = fc[0]; for (let r = 0; r < 4; r++) { ctx.fillRect(6, h * 0.7 + r * 9, w - 12, 4); }
    ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.arc(w - 22, 30, 7, 0, 7); ctx.fill();
    ctx.fillStyle = '#6a4224'; ctx.strokeStyle = '#2e1b0c'; ctx.lineWidth = 2.5; ctx.fillRect(0, 8, 8, h - 8); ctx.fillRect(w - 8, 8, 8, h - 8); ctx.fillRect(-4, 0, w + 8, 14); ctx.strokeRect(-4, 0, w + 8, 14);
    ctx.fillStyle = '#8a5a2e'; ctx.beginPath(); ctx.moveTo(8, 14); ctx.lineTo(24, 20); ctx.lineTo(24, h - 4); ctx.lineTo(8, h); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(w - 8, 14); ctx.lineTo(w - 24, 20); ctx.lineTo(w - 24, h - 4); ctx.lineTo(w - 8, h); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#2e1b0c'; ctx.beginPath(); ctx.roundRect(-8, -22, w + 16, 20, 5); ctx.fill(); ctx.fillStyle = '#ffd43b'; ctx.font = '800 12px Nunito, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(lab, w / 2, -12);
    const by = -44 + Math.sin(time * 6 + o.x * 0.02) * 5; ctx.fillStyle = '#ffd43b'; ctx.strokeStyle = '#7a5200'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(w / 2 - 9, by); ctx.lineTo(w / 2 + 9, by); ctx.lineTo(w / 2, by + 14); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.fillText('Ren erdoor!', w / 2, by - 8); ctx.textAlign = 'left';
  } else if (o.type === 'bollard') {
    for (let i = 0; i < o.k; i++) {
      const bx = i * 30;
      const g = ctx.createLinearGradient(bx, 0, bx + 16, 0); g.addColorStop(0, '#b5b5b5'); g.addColorStop(0.4, '#fff'); g.addColorStop(1, '#9a9a9a');
      ctx.fillStyle = g; ctx.strokeStyle = '#444'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.roundRect(bx, 0, 16, o.h, [8, 8, 2, 2]); ctx.fill(); ctx.stroke();
      ctx.save(); ctx.beginPath(); ctx.roundRect(bx, 0, 16, o.h, [8, 8, 2, 2]); ctx.clip();
      ctx.fillStyle = '#d6232a'; ctx.fillRect(bx, 8, 16, 9); ctx.fillRect(bx, 26, 16, 9); ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(bx + 3, 0, 2.5, o.h);
      ctx.fillStyle = '#f2d21b'; ctx.fillRect(bx, 44, 16, 6); ctx.restore();
    }
  } else if (o.type === 'table') {
    ctx.fillStyle = '#3a2210'; ctx.fillRect(9, 14, 8, o.h - 14); ctx.fillRect(o.w - 17, 14, 8, o.h - 14); if (o.w > 200) ctx.fillRect(o.w / 2 - 4, 14, 8, o.h - 14);
    ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(9, 14, 2, o.h - 14); ctx.fillRect(o.w - 17, 14, 2, o.h - 14);
    const tg = ctx.createLinearGradient(0, 0, 0, 10); tg.addColorStop(0, '#c58a4a'); tg.addColorStop(1, '#8a5a2a');
    ctx.fillStyle = tg; ctx.strokeStyle = '#3b2412'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(-2, 0, o.w + 4, 10, 3); ctx.fill(); ctx.stroke();
    const cells = Math.floor((o.w - 10) / 9.1);
    for (let i = 0; i < cells; i++) for (let j = 0; j < 2; j++) { ctx.fillStyle = (i + j) % 2 ? '#f4efe2' : '#c92a2a'; ctx.fillRect(5 + i * ((o.w - 10) / cells), 10 + j * 8, (o.w - 10) / cells + 0.5, 8); }
    ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(5, 22, o.w - 10, 4);
    ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(0, 1, o.w, 2);
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
  const gx = 20, gy = 78, sc = 1 + pulse * 0.12;
  ctx.save();
  ctx.translate(gx + 34, gy + 66); ctx.scale(sc, sc); ctx.translate(-(gx + 34), -(gy + 66));
  if (pulse > 0) { ctx.shadowColor = '#7ee08a'; ctx.shadowBlur = 18 * pulse; }
  if (mode === 1) drawBeerGlass(gx, gy, 68, 132, dispLevel); else if (mode === 3) drawCocktail(gx - 4, gy + 28, 76, 104, dispLevel); else drawWine(gx - 2, gy, 72, 132, dispLevel);
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
function drawCellar() { // wijnkelder: stenen muren, wijnrekken, grote vaten, lantaarns
  ctx.fillStyle = '#1d1517'; ctx.fillRect(0, 0, W, GROUND);
  let off = (bgX * 0.3) % 64;
  const tones = ['#3a2c2c', '#41312f', '#362a2b', '#463533', '#3d2e2d'];
  for (let r = 0; r < 12; r++) for (let x = -64; x < W + 64; x += 64) {
    const k = (Math.floor((x + bgX * 0.3) / 64) * 7 + r * 13) % 5; ctx.fillStyle = tones[(k + 5) % 5]; ctx.fillRect(x - off + (r % 2) * 32, r * 29 + 1, 62, 27);
  }
  let g = ctx.createLinearGradient(0, 0, 0, GROUND); g.addColorStop(0, 'rgba(0,0,0,.55)'); g.addColorStop(0.5, 'rgba(0,0,0,.1)'); g.addColorStop(1, 'rgba(0,0,0,.3)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, GROUND);
  // wijnrekken
  off = (bgX * 0.5) % 330;
  for (let i = -1; i < 3; i++) {
    const x = i * 330 - off + 30;
    ctx.fillStyle = '#4a2c12'; ctx.fillRect(x, 70, 7, 150); ctx.fillRect(x + 233, 70, 7, 150); ctx.fillRect(x + 116, 70, 7, 150);
    for (const sy of [70, 118, 166, 214]) { ctx.fillStyle = '#6b4220'; ctx.fillRect(x, sy, 240, 6); }
    for (const sy of [70, 118, 166]) for (let j = 0; j < 9; j++) {
      const bx = x + 14 + j * 26 + (j > 3 ? 8 : 0);
      ctx.fillStyle = '#10301a'; ctx.beginPath(); ctx.arc(bx, sy + 26, 10, 0, 7); ctx.fill(); ctx.fillStyle = '#2f7a45'; ctx.beginPath(); ctx.arc(bx, sy + 26, 6, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.beginPath(); ctx.arc(bx - 3, sy + 23, 2, 0, 7); ctx.fill();
    }
  }
  // grote vaten langs de muur
  off = (bgX * 0.65) % 230;
  for (let x = -230; x < W + 230; x += 230) {
    const bx = x - off + 20, by = 232, bw = 92, bh = 108;
    const bg = ctx.createLinearGradient(bx, 0, bx + bw, 0); bg.addColorStop(0, '#4a260c'); bg.addColorStop(0.4, '#8f5424'); bg.addColorStop(1, '#3d1f09');
    ctx.fillStyle = bg; ctx.strokeStyle = '#1e1005'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(bx + 8, by); ctx.quadraticCurveTo(bx - 8, by + bh / 2, bx + 8, by + bh); ctx.lineTo(bx + bw - 8, by + bh); ctx.quadraticCurveTo(bx + bw + 8, by + bh / 2, bx + bw - 8, by); ctx.closePath(); ctx.fill(); ctx.stroke();
    for (const yy of [14, bh / 2 - 3, bh - 22]) { ctx.fillStyle = '#34343a'; ctx.fillRect(bx - 3, by + yy, bw + 6, 7); }
    ctx.fillStyle = '#c9a227'; ctx.beginPath(); ctx.arc(bx + bw / 2, by + bh / 2 + 10, 7, 0, 7); ctx.fill(); ctx.fillStyle = '#6a5210'; ctx.fillRect(bx + bw / 2 - 2, by + bh / 2 + 10, 4, 18);
    ctx.fillStyle = 'rgba(150,20,60,.8)'; ctx.beginPath(); ctx.ellipse(bx + bw / 2, by + bh / 2 + 36 + (time * 40 % 14), 2, 3, 0, 0, 7); ctx.fill();
  }
  // lantaarns
  off = (bgX * 0.55) % 400;
  for (let i = -1; i < 3; i++) {
    const x = i * 400 + 200 - off, fl = 0.85 + 0.15 * Math.sin(time * 13 + i * 3);
    const gl = ctx.createRadialGradient(x, 80, 4, x, 80, 150 * fl); gl.addColorStop(0, 'rgba(255,170,60,.55)'); gl.addColorStop(1, 'rgba(255,170,60,0)'); ctx.fillStyle = gl; ctx.fillRect(x - 160, 0, 320, 260);
    ctx.strokeStyle = '#111'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 60); ctx.stroke();
    ctx.fillStyle = '#222'; ctx.fillRect(x - 11, 58, 22, 5); ctx.fillStyle = `rgba(255,200,90,${0.7 + 0.3 * fl})`; ctx.fillRect(x - 8, 63, 16, 24); ctx.fillStyle = '#222'; ctx.fillRect(x - 11, 87, 22, 5);
  }
  // vloer van natuursteen met wijnplassen
  g = ctx.createLinearGradient(0, GROUND, 0, H); g.addColorStop(0, '#6a5853'); g.addColorStop(1, '#2a201e'); ctx.fillStyle = g; ctx.fillRect(0, GROUND, W, H - GROUND);
  ctx.fillStyle = '#1d1210'; ctx.fillRect(0, GROUND, W, 4);
  off = bgX % 120; ctx.strokeStyle = 'rgba(15,8,6,.7)'; ctx.lineWidth = 3;
  [GROUND + 38, GROUND + 76].forEach((yy, r) => { ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(W, yy); ctx.stroke(); for (let x = -120 + r * 55; x < W + 120; x += 120) { ctx.beginPath(); ctx.moveTo(x - off, yy - 38); ctx.lineTo(x - off, yy); ctx.stroke(); } });
  const po = bgX % 420; for (let x = -420; x < W + 420; x += 420) { ctx.fillStyle = 'rgba(130,20,55,.55)'; ctx.beginPath(); ctx.ellipse(x - po + 200, GROUND + 24, 56, 7, 0, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(255,170,190,.25)'; ctx.beginPath(); ctx.ellipse(x - po + 190, GROUND + 22, 30, 2, 0, 0, 7); ctx.fill(); }
  ctx.fillStyle = 'rgba(80,10,45,.14)'; ctx.fillRect(0, 0, W, H);
}
function drawBrewery() { // brouwerij: koperen ketels, stalen tanks, leidingen en stoom
  ctx.fillStyle = '#4a2012'; ctx.fillRect(0, 0, W, GROUND);
  let off = (bgX * 0.3) % 44;
  const tones = ['#8a4426', '#9a5030', '#7e3d22', '#a35a36'];
  for (let r = 0; r < 19; r++) for (let x = -44; x < W + 44; x += 44) {
    const k = (Math.floor((x + bgX * 0.3) / 44) * 5 + r * 11) % 4; ctx.fillStyle = tones[(k + 4) % 4]; ctx.fillRect(x - off + (r % 2) * 22, r * 18 + 1, 42, 16);
  }
  let g = ctx.createLinearGradient(0, 0, 0, GROUND); g.addColorStop(0, 'rgba(0,0,0,.45)'); g.addColorStop(1, 'rgba(0,0,0,.12)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, GROUND);
  // stalen gistingstanks
  off = (bgX * 0.4) % 520;
  for (let i = -1; i < 3; i++) {
    const x = i * 520 - off + 60, tw = 120;
    const sg = ctx.createLinearGradient(x, 0, x + tw, 0); sg.addColorStop(0, '#7b858c'); sg.addColorStop(0.35, '#eef3f6'); sg.addColorStop(1, '#6a747b');
    ctx.fillStyle = sg; ctx.fillRect(x, 80, tw, 230); ctx.beginPath(); ctx.ellipse(x + tw / 2, 80, tw / 2, 14, 0, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.18)'; for (const yy of [140, 200, 260]) ctx.fillRect(x, yy, tw, 4);
    ctx.fillStyle = '#4a545b'; ctx.beginPath(); ctx.arc(x + tw / 2, 165, 15, 0, 7); ctx.fill(); ctx.fillStyle = '#c5ced4'; ctx.beginPath(); ctx.arc(x + tw / 2, 165, 10, 0, 7); ctx.fill();
    ctx.fillStyle = '#5a636a'; ctx.fillRect(x + 6, 310, 8, 30); ctx.fillRect(x + tw - 14, 310, 8, 30);
  }
  // leidingen
  off = (bgX * 0.3) % 160;
  for (const py of [34, 56]) {
    const pg = ctx.createLinearGradient(0, py, 0, py + 12); pg.addColorStop(0, '#cfd6da'); pg.addColorStop(0.5, '#8d979d'); pg.addColorStop(1, '#5f696f'); ctx.fillStyle = pg; ctx.fillRect(0, py, W, 12);
    for (let x = -160; x < W + 160; x += 160) { ctx.fillStyle = '#444b50'; ctx.fillRect(x - off + 20, py - 3, 8, 18); if (py === 34) { ctx.fillStyle = '#d6232a'; ctx.beginPath(); ctx.arc(x - off + 24, py - 8, 7, 0, 7); ctx.fill(); } }
  }
  // koperen ketels met stoom
  off = (bgX * 0.6) % 340;
  for (let i = -1; i < 3; i++) {
    const x = i * 340 - off + 150, kw = 140, ky = 190, kh = 130;
    const cg = ctx.createLinearGradient(x, 0, x + kw, 0); cg.addColorStop(0, '#7a3a14'); cg.addColorStop(0.35, '#e69a52'); cg.addColorStop(1, '#8e4519');
    ctx.fillStyle = cg; ctx.strokeStyle = '#3a1a08'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.roundRect(x, ky, kw, kh, [10, 10, 4, 4]); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(x + kw / 2, ky, kw / 2, 26, 0, Math.PI, 0); ctx.fill(); ctx.stroke();
    ctx.fillStyle = cg; ctx.fillRect(x + kw / 2 - 9, ky - 58, 18, 36); ctx.strokeRect(x + kw / 2 - 9, ky - 58, 18, 36);
    ctx.fillStyle = 'rgba(60,25,8,.5)'; for (let j = 0; j < 9; j++) { ctx.beginPath(); ctx.arc(x + 10 + j * 15, ky + 12, 2.2, 0, 7); ctx.fill(); }
    ctx.fillStyle = '#2a1608'; ctx.beginPath(); ctx.arc(x + kw / 2, ky + 62, 25, 0, 7); ctx.fill();
    const wg = ctx.createRadialGradient(x + kw / 2, ky + 62, 2, x + kw / 2, ky + 62, 22); wg.addColorStop(0, '#ffd25e'); wg.addColorStop(1, '#c27a0b'); ctx.fillStyle = wg; ctx.beginPath(); ctx.arc(x + kw / 2, ky + 62, 21, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,246,223,.8)'; for (let j = 0; j < 5; j++) { ctx.beginPath(); ctx.arc(x + kw / 2 - 12 + j * 6, ky + 76 - ((time * 26 + j * 17) % 30), 2 + (j % 2), 0, 7); ctx.fill(); }
    for (let j = 0; j < 4; j++) { const t = ((time * 0.5 + j * 0.25 + i * 0.1) % 1); ctx.fillStyle = `rgba(255,255,255,${0.5 * (1 - t)})`; ctx.beginPath(); ctx.arc(x + kw / 2 + Math.sin(t * 5 + j) * 8, ky - 62 - t * 70, 7 + t * 14, 0, 7); ctx.fill(); }
  }
  // tegelvloer met schuimplassen
  g = ctx.createLinearGradient(0, GROUND, 0, H); g.addColorStop(0, '#d2c1a4'); g.addColorStop(1, '#8a7a62'); ctx.fillStyle = g; ctx.fillRect(0, GROUND, W, H - GROUND);
  ctx.fillStyle = '#4a3a2a'; ctx.fillRect(0, GROUND, W, 4);
  const base = Math.floor(bgX / 55), ox = bgX % 55;
  for (let i = -1; i < 16; i++) for (let r = 0; r < 2; r++) if ((base + i + r) % 2 === 0) { ctx.fillStyle = 'rgba(80,60,40,.22)'; ctx.fillRect(i * 55 - ox, GROUND + 4 + r * 55, 55, 55); }
  const po = bgX % 380; for (let x = -380; x < W + 380; x += 380) { ctx.fillStyle = 'rgba(255,246,223,.8)'; ctx.beginPath(); ctx.ellipse(x - po + 190, GROUND + 26, 50, 7, 0, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(240,170,40,.45)'; ctx.beginPath(); ctx.ellipse(x - po + 190, GROUND + 28, 38, 4, 0, 0, 7); ctx.fill(); }
  ctx.fillStyle = 'rgba(255,170,60,.08)'; ctx.fillRect(0, 0, W, H);
}
function drawCocktailBar() { // cocktailbar: neon, verlichte flessen, lichtsnoeren en een glanzende vloer
  let g = ctx.createLinearGradient(0, 0, 0, GROUND); g.addColorStop(0, '#120826'); g.addColorStop(1, '#2d1457'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, GROUND);
  let off = (bgX * 0.35) % 300;
  const COLS = ['#ff3d81', '#00e5ff', '#ffd43b', '#7cff6b', '#b46bff'];
  // verlichte flessenplanken
  for (let i = -1; i < 4; i++) {
    const x = i * 300 - off + 20, k = Math.floor((bgX * 0.35) / 300) + i;
    const bl = ctx.createLinearGradient(0, 80, 0, 190); bl.addColorStop(0, 'rgba(255,61,129,.0)'); bl.addColorStop(0.5, 'rgba(255,61,129,.22)'); bl.addColorStop(1, 'rgba(0,229,255,.0)'); ctx.fillStyle = bl; ctx.fillRect(x - 10, 80, 250, 120);
    for (const sy of [120, 190]) {
      ctx.fillStyle = '#0a0414'; ctx.fillRect(x, sy + 24, 230, 6); ctx.fillStyle = 'rgba(0,229,255,.7)'; ctx.fillRect(x, sy + 30, 230, 2);
      for (let j = 0; j < 7; j++) { const bx = x + 14 + j * 32, col = COLS[(((k * 3 + j + (sy > 150 ? 2 : 0)) % 5) + 5) % 5]; ctx.fillStyle = col; ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.roundRect(bx - 7, sy - 8, 14, 32, 4); ctx.fill(); ctx.fillRect(bx - 3, sy - 22, 6, 16); ctx.globalAlpha = 1; ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(bx - 5, sy - 4, 2, 18); }
    }
  }
  // neonbord
  off = (bgX * 0.5) % 640;
  for (let i = -1; i < 2; i++) {
    const x = i * 640 - off + 300, fl = 0.8 + 0.2 * Math.sin(time * 9 + i);
    ctx.save(); ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 22 * fl; ctx.fillStyle = `rgba(160,250,255,${fl})`; ctx.font = "400 40px 'Lilita One', Nunito, system-ui, sans-serif"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('COCKTAILS', x, 62);
    ctx.shadowColor = '#ff3d81'; ctx.strokeStyle = '#ff7ab5'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - 90, 90); ctx.lineTo(x + 90, 90); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 14, 98); ctx.lineTo(x + 14, 98); ctx.lineTo(x, 118); ctx.closePath(); ctx.moveTo(x, 118); ctx.lineTo(x, 132); ctx.moveTo(x - 9, 132); ctx.lineTo(x + 9, 132); ctx.stroke();
    ctx.restore(); ctx.textAlign = 'left';
  }
  // lichtsnoeren
  off = (bgX * 0.5) % 200;
  ctx.strokeStyle = '#05020c'; ctx.lineWidth = 2; ctx.beginPath(); for (let x = -200; x < W + 200; x += 8) { const xx = x - off, yy = 14 + Math.abs(Math.sin((xx + 200) / 200 * Math.PI)) * 22; if (x === -200) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy); } ctx.stroke();
  for (let x = -200; x < W + 200; x += 40) { const xx = x - off, yy = 14 + Math.abs(Math.sin((xx + 200) / 200 * Math.PI)) * 22, col = COLS[((Math.floor((x + bgX * 0.5) / 40) % 5) + 5) % 5]; const gl = ctx.createRadialGradient(xx, yy + 5, 1, xx, yy + 5, 16); gl.addColorStop(0, col); gl.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = gl; ctx.fillRect(xx - 16, yy - 11, 32, 32); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(xx, yy + 5, 2.5, 0, 7); ctx.fill(); }
  // bar met neonrand en barkrukken
  g = ctx.createLinearGradient(0, 252, 0, GROUND); g.addColorStop(0, '#3b2060'); g.addColorStop(1, '#1a0d33'); ctx.fillStyle = g; ctx.fillRect(0, 252, W, GROUND - 252);
  ctx.fillStyle = '#6a4aa0'; ctx.fillRect(0, 252, W, 7); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(0, 252, W, 2);
  ctx.save(); ctx.shadowColor = '#ff3d81'; ctx.shadowBlur = 14; ctx.fillStyle = '#ff7ab5'; ctx.fillRect(0, GROUND - 14, W, 3); ctx.restore();
  off = (bgX * 0.7) % 230;
  for (let x = -230; x < W + 230; x += 230) {
    const sx = x - off + 115, col = COLS[((Math.floor((x + bgX * 0.7) / 230) % 5) + 5) % 5];
    ctx.strokeStyle = '#0a0414'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(sx, 300); ctx.lineTo(sx, 336); ctx.stroke();
    ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(sx, 298, 17, 6, 0, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.ellipse(sx - 5, 296, 8, 2, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#0a0414'; ctx.beginPath(); ctx.ellipse(sx, 337, 13, 3, 0, 0, 7); ctx.fill();
  }
  // glanzende vloer met neonweerspiegeling
  g = ctx.createLinearGradient(0, GROUND, 0, H); g.addColorStop(0, '#241040'); g.addColorStop(1, '#0a0418'); ctx.fillStyle = g; ctx.fillRect(0, GROUND, W, H - GROUND);
  ctx.fillStyle = '#0a0414'; ctx.fillRect(0, GROUND, W, 4);
  const base = Math.floor(bgX / 50), ox = bgX % 50;
  for (let i = -1; i < 18; i++) for (let r = 0; r < 2; r++) if ((base + i + r) % 2 === 0) { ctx.fillStyle = 'rgba(255,255,255,.06)'; ctx.fillRect(i * 50 - ox, GROUND + 4 + r * 50, 50, 50); }
  for (let i = 0; i < 4; i++) { const rx = ((i * 260 - bgX * 0.9) % 1040 + 1040) % 1040 - 120, rg = ctx.createLinearGradient(rx, GROUND, rx + 80, H); rg.addColorStop(0, i % 2 ? 'rgba(255,61,129,.28)' : 'rgba(0,229,255,.25)'); rg.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = rg; ctx.fillRect(rx, GROUND + 4, 70, H - GROUND); }
  ctx.fillStyle = 'rgba(140,60,220,.08)'; ctx.fillRect(0, 0, W, H);
}
// --- buitenomgevingen: tarweveld, druivenveld, fruitplantage ---
function skyBase(top, mid, bot) { const g = ctx.createLinearGradient(0, 0, 0, GROUND); g.addColorStop(0, top); g.addColorStop(0.62, mid); g.addColorStop(1, bot); ctx.fillStyle = g; ctx.fillRect(0, 0, W, GROUND); }
function sunClouds(sx, sy) {
  const sg = ctx.createRadialGradient(sx, sy, 6, sx, sy, 130); sg.addColorStop(0, 'rgba(255,252,210,1)'); sg.addColorStop(0.25, 'rgba(255,240,160,.8)'); sg.addColorStop(1, 'rgba(255,240,160,0)'); ctx.fillStyle = sg; ctx.fillRect(sx - 150, 0, 300, 230);
  ctx.fillStyle = '#fffbe0'; ctx.beginPath(); ctx.arc(sx, sy, 30, 0, 7); ctx.fill();
  const off = (bgX * 0.1) % 520;
  for (let i = -1; i < 3; i++) { const x = i * 520 - off + 120; ctx.fillStyle = 'rgba(255,255,255,.88)'; for (const [dx, dy, r] of [[0, 0, 24], [26, -9, 30], [58, 0, 22], [30, 8, 26]]) { ctx.beginPath(); ctx.arc(x + dx, 62 + dy, r, 0, 7); ctx.fill(); } }
}
function hillLayer(par, base, amp, col, period) {
  const off = bgX * par; ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, GROUND);
  for (let x = 0; x <= W; x += 10) ctx.lineTo(x, base - Math.sin((x + off) / period) * amp - Math.sin((x + off) / (period * 0.43) + 1.3) * amp * 0.4);
  ctx.lineTo(W, GROUND); ctx.closePath(); ctx.fill();
}
function dirtPath(top, bot, pebble) {
  const g = ctx.createLinearGradient(0, GROUND, 0, H); g.addColorStop(0, top); g.addColorStop(1, bot); ctx.fillStyle = g; ctx.fillRect(0, GROUND, W, H - GROUND);
  ctx.fillStyle = 'rgba(40,25,10,.5)'; ctx.fillRect(0, GROUND, W, 4);
  ctx.fillStyle = '#5a9a3a'; for (let x = -10; x < W + 10; x += 9) { const gx = x - (bgX % 9); ctx.beginPath(); ctx.moveTo(gx, GROUND + 3); ctx.lineTo(gx + 2, GROUND - 7 - ((x * 7) % 5)); ctx.lineTo(gx + 5, GROUND + 3); ctx.fill(); }
  ctx.strokeStyle = 'rgba(50,30,10,.28)'; ctx.lineWidth = 3; for (const y of [GROUND + 42, GROUND + 80]) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  const po = bgX % 160; ctx.fillStyle = pebble; for (let x = -160; x < W + 160; x += 53) for (let r = 0; r < 3; r++) { ctx.beginPath(); ctx.ellipse(x - po + (r * 29) % 50, GROUND + 14 + r * 32, 3 + (x + r) % 3, 2, 0, 0, 7); ctx.fill(); }
}
function drawWheat() {
  skyBase('#5fb8f2', '#bfe6ff', '#fff0b8'); sunClouds(640, 74);
  hillLayer(0.12, 215, 18, '#c8b25a', 150);
  // windmolen en schuur
  let off = (bgX * 0.22) % 900;
  for (let i = -1; i < 3; i++) {
    const x = i * 900 - off + 260;
    ctx.fillStyle = '#9a6a42'; ctx.beginPath(); ctx.moveTo(x - 20, 250); ctx.lineTo(x + 20, 250); ctx.lineTo(x + 13, 150); ctx.lineTo(x - 13, 150); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#6a3a22'; ctx.beginPath(); ctx.moveTo(x - 17, 150); ctx.lineTo(x + 17, 150); ctx.lineTo(x, 128); ctx.closePath(); ctx.fill();
    ctx.save(); ctx.translate(x, 150); ctx.rotate(time * 0.7 + i); ctx.fillStyle = '#efe6cc'; ctx.strokeStyle = '#8a7a5a'; ctx.lineWidth = 1.5;
    for (let b = 0; b < 4; b++) { ctx.rotate(Math.PI / 2); ctx.fillRect(-2, -6, 4, -58); ctx.fillRect(2, -58, 13, 26); ctx.strokeRect(2, -58, 13, 26); }
    ctx.restore(); ctx.fillStyle = '#4a3a2a'; ctx.beginPath(); ctx.arc(x, 150, 4, 0, 7); ctx.fill();
  }
  off = (bgX * 0.2) % 1100;
  for (let i = -1; i < 2; i++) { const x = i * 1100 - off + 780; ctx.fillStyle = '#b5362c'; ctx.fillRect(x, 195, 80, 55); ctx.fillStyle = '#8a2a22'; ctx.beginPath(); ctx.moveTo(x - 6, 197); ctx.lineTo(x + 40, 160); ctx.lineTo(x + 86, 197); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.strokeRect(x + 26, 216, 28, 34); ctx.beginPath(); ctx.moveTo(x + 26, 216); ctx.lineTo(x + 54, 250); ctx.moveTo(x + 54, 216); ctx.lineTo(x + 26, 250); ctx.stroke(); }
  hillLayer(0.3, 250, 10, '#d9bd55', 120);
  // wuivend korenveld
  for (let r = 0; r < 7; r++) {
    const y = 240 + r * ((GROUND - 240) / 7), sc = 0.55 + r * 0.13, step = 6 * sc, o2 = (bgX * (0.35 + r * 0.09)) % (step * 4);
    ctx.strokeStyle = r % 2 ? '#c99a24' : '#dcae30'; ctx.lineWidth = 1.5 * sc; ctx.beginPath();
    for (let x = -step * 4; x < W + step * 4; x += step) { const sw = Math.sin(time * 2 + (x + bgX * 0.4) * 0.04 + r) * 3 * sc; ctx.moveTo(x - o2, y + 8); ctx.lineTo(x - o2 + sw, y - 22 * sc); }
    ctx.stroke(); ctx.strokeStyle = '#f2cd5a'; ctx.lineWidth = 3.2 * sc; ctx.beginPath();
    for (let x = -step * 4; x < W + step * 4; x += step) { const sw = Math.sin(time * 2 + (x + bgX * 0.4) * 0.04 + r) * 3 * sc; ctx.moveTo(x - o2 + sw, y - 22 * sc); ctx.lineTo(x - o2 + sw * 1.1, y - 30 * sc); }
    ctx.stroke();
  }
  // hek
  off = (bgX * 0.7) % 90; ctx.strokeStyle = '#7a5a34'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 296); ctx.lineTo(W, 296); ctx.moveTo(0, 312); ctx.lineTo(W, 312); ctx.stroke();
  ctx.fillStyle = '#8a6a3e'; for (let x = -90; x < W + 90; x += 90) ctx.fillRect(x - off, 286, 7, 54);
  dirtPath('#b98a54', '#7a5430', 'rgba(70,45,20,.5)');
  ctx.fillStyle = 'rgba(255,230,130,.1)'; ctx.fillRect(0, 0, W, H);
}
function drawVineyard() {
  skyBase('#6aa7e8', '#d6e8f7', '#ffe8c4'); sunClouds(160, 80);
  hillLayer(0.1, 205, 22, '#9fbf78', 170); hillLayer(0.2, 232, 16, '#7da95a', 140);
  let off = (bgX * 0.2) % 1000;
  for (let i = -1; i < 2; i++) { // kasteeltje op de heuvel
    const x = i * 1000 - off + 520;
    ctx.fillStyle = '#d9c9a3'; ctx.fillRect(x, 168, 110, 62); ctx.fillRect(x - 14, 140, 30, 90); ctx.fillRect(x + 96, 140, 30, 90);
    ctx.fillStyle = '#7a3a2a'; for (const tx of [x - 14, x + 96]) { ctx.beginPath(); ctx.moveTo(tx - 4, 140); ctx.lineTo(tx + 15, 112); ctx.lineTo(tx + 34, 140); ctx.closePath(); ctx.fill(); }
    ctx.beginPath(); ctx.moveTo(x - 4, 168); ctx.lineTo(x + 55, 140); ctx.lineTo(x + 114, 168); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#5a3a22'; ctx.beginPath(); ctx.roundRect(x + 46, 196, 18, 34, [9, 9, 0, 0]); ctx.fill(); ctx.fillStyle = '#4a4a5a'; for (const wx of [x + 14, x + 84]) ctx.fillRect(wx, 182, 10, 14);
  }
  // wijnranken in rijen
  for (const [par, y0, sc] of [[0.35, 262, 0.7], [0.55, 282, 0.9]]) {
    const o2 = (bgX * par) % 60; ctx.fillStyle = '#3f7a2a';
    for (let x = -60; x < W + 60; x += 30) { ctx.beginPath(); ctx.ellipse(x - o2, y0, 22 * sc, 17 * sc, 0, 0, 7); ctx.fill(); }
    ctx.fillStyle = '#4d9234'; for (let x = -45; x < W + 60; x += 30) { ctx.beginPath(); ctx.ellipse(x - o2, y0 - 5, 16 * sc, 12 * sc, 0, 0, 7); ctx.fill(); }
    ctx.fillStyle = '#5a2a82'; for (let x = -50; x < W + 60; x += 30) { for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.arc(x - o2 + (k % 2) * 4 - 2, y0 + 8 * sc + k * 4 * sc, 3.4 * sc, 0, 7); ctx.fill(); } }
  }
  off = (bgX * 0.7) % 100; ctx.strokeStyle = '#8a8a90'; ctx.lineWidth = 1.5; ctx.beginPath(); for (const wy of [290, 308]) { ctx.moveTo(0, wy); ctx.lineTo(W, wy); } ctx.stroke();
  ctx.fillStyle = '#6a4a28'; for (let x = -100; x < W + 100; x += 100) ctx.fillRect(x - off, 280, 7, 60);
  dirtPath('#a8a39a', '#6a665e', 'rgba(60,58,52,.55)');
  ctx.fillStyle = 'rgba(150,80,200,.07)'; ctx.fillRect(0, 0, W, H);
}
function drawFruit() {
  skyBase('#3fc5ff', '#aee9ff', '#fff3c0'); sunClouds(130, 72);
  hillLayer(0.1, 220, 14, '#6fc27a', 160);
  // palmbomen
  let off = (bgX * 0.3) % 420;
  for (let i = -1; i < 3; i++) {
    const x = i * 420 - off + 180, sw = Math.sin(time * 1.5 + i) * 4;
    ctx.strokeStyle = '#7a5530'; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, 262); ctx.quadraticCurveTo(x + 14, 200, x + 6 + sw * 0.4, 138); ctx.stroke();
    ctx.strokeStyle = '#2f8f3f'; ctx.lineWidth = 5;
    for (let f = 0; f < 7; f++) { const a = -Math.PI + f * (Math.PI / 6) + sw * 0.02; ctx.beginPath(); ctx.moveTo(x + 6, 138); ctx.quadraticCurveTo(x + 6 + Math.cos(a) * 34, 120 + Math.sin(a) * 20 - 12, x + 6 + Math.cos(a) * 62 + sw, 138 + Math.sin(a) * 6 + 22); ctx.stroke(); }
    ctx.fillStyle = '#5a3a1a'; ctx.beginPath(); ctx.arc(x + 2, 142, 4, 0, 7); ctx.arc(x + 10, 144, 4, 0, 7); ctx.fill();
  }
  // fruitkraam
  off = (bgX * 0.5) % 900;
  for (let i = -1; i < 2; i++) {
    const x = i * 900 - off + 560;
    ctx.fillStyle = '#8a5a2e'; ctx.fillRect(x, 230, 8, 80); ctx.fillRect(x + 142, 230, 8, 80); ctx.fillRect(x, 276, 150, 34);
    for (let k = 0; k < 6; k++) { ctx.fillStyle = k % 2 ? '#e63946' : '#fff4e0'; ctx.beginPath(); ctx.moveTo(x - 8 + k * 26, 214); ctx.lineTo(x - 8 + (k + 1) * 26, 214); ctx.lineTo(x - 2 + (k + 1) * 25, 240); ctx.lineTo(x - 2 + k * 25, 240); ctx.closePath(); ctx.fill(); }
    for (let k = 0; k < 8; k++) { ctx.fillStyle = ['#ff9f1c', '#e63946', '#ffd43b', '#6bbf3a'][k % 4]; ctx.beginPath(); ctx.arc(x + 14 + k * 17, 272 + (k % 2) * 2, 8, 0, 7); ctx.fill(); }
  }
  // sinaasappelbomen
  off = (bgX * 0.62) % 260;
  for (let x = -260; x < W + 260; x += 260) {
    const tx = x - off + 100; ctx.fillStyle = '#6a4224'; ctx.fillRect(tx - 5, 262, 10, 78);
    ctx.fillStyle = '#2f8a3a'; for (const [dx, dy, r] of [[0, 244, 40], [-30, 262, 30], [30, 262, 30], [0, 222, 30]]) { ctx.beginPath(); ctx.arc(tx + dx, dy, r, 0, 7); ctx.fill(); }
    ctx.fillStyle = '#ff9f1c'; for (let k = 0; k < 9; k++) { ctx.beginPath(); ctx.arc(tx - 36 + (k * 17) % 72, 214 + (k * 23) % 60, 5.5, 0, 7); ctx.fill(); }
  }
  dirtPath('#e9d6a0', '#bfa56a', 'rgba(130,100,50,.45)');
  ctx.fillStyle = 'rgba(255,170,40,.07)'; ctx.fillRect(0, 0, W, H);
}
function drawFinish() { // finishboog met geblokte vlag
  const x = finishObj.x, top = GROUND - 190;
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(x + 60, GROUND + 2, 70, 6, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#2b2b30'; ctx.fillRect(x, top, 9, GROUND - top); ctx.fillRect(x + 111, top, 9, GROUND - top);
  const cw = 10;
  for (let i = 0; i < 12; i++) for (let j = 0; j < 3; j++) { ctx.fillStyle = (i + j) % 2 ? '#fff' : '#111'; ctx.fillRect(x + i * cw, top + j * cw, cw, cw); }
  ctx.strokeStyle = '#111'; ctx.lineWidth = 1.5; ctx.strokeRect(x, top, cw * 12, cw * 3);
  ctx.fillStyle = '#ffc933'; ctx.font = '800 16px Nunito, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillText('FINISH ' + FINISH + ' m', x + 60, top - 8); ctx.textAlign = 'left';
}
function drawDisco(a) { // dansvloer: gekleurde spots, discobal en lichtgevende tegels
  ctx.fillStyle = `rgba(60,10,110,${0.3 * a})`; ctx.fillRect(0, 0, W, H);
  const base = Math.floor(bgX / 40), ox = bgX % 40;
  for (let i = -1; i < 21; i++) for (let r = 0; r < 3; r++) if ((base + i + r) % 2 === 0) {
    ctx.fillStyle = `hsla(${(((base + i) * 37 + r * 90 + time * 60) % 360 + 360) % 360},90%,60%,${0.22 * a})`; ctx.fillRect(i * 40 - ox, GROUND + 6 + r * 34, 40, 34);
  }
  const bx = 400, by = 34;
  for (let k = 0; k < 5; k++) {
    const ang = Math.PI / 2 + Math.sin(time * 0.9 + k * 1.3) * 0.7 + (k - 2) * 0.28, len = 340, wd = 0.09;
    const g = ctx.createLinearGradient(bx, by, bx + Math.cos(ang) * len, by + Math.sin(ang) * len);
    g.addColorStop(0, `hsla(${(k * 70 + time * 50) % 360},95%,65%,${0.34 * a})`); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + Math.cos(ang - wd) * len, by + Math.sin(ang - wd) * len); ctx.lineTo(bx + Math.cos(ang + wd) * len, by + Math.sin(ang + wd) * len); ctx.closePath(); ctx.fill();
  }
  ctx.globalAlpha = a; ctx.strokeStyle = '#222'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(bx, 0); ctx.lineTo(bx, by); ctx.stroke();
  const gb = ctx.createRadialGradient(bx - 5, by + 8, 2, bx, by + 16, 18); gb.addColorStop(0, '#fff'); gb.addColorStop(1, '#6f7590');
  ctx.fillStyle = gb; ctx.beginPath(); ctx.arc(bx, by + 16, 16, 0, 7); ctx.fill();
  for (let i = 0; i < 12; i++) { const an = i * 0.9 + time * 2.5; ctx.fillStyle = `hsl(${(i * 40 + time * 80) % 360},90%,75%)`; ctx.fillRect(bx + Math.cos(an) * 11 - 1.5, by + 16 + Math.sin(an * 1.3) * 11 - 1.5, 3, 3); }
  ctx.globalAlpha = 1;
}
function drawBouncer() {
  const b = bouncer, d = b.def, fall = b.state === 'fall';
  let pose = fall ? 'faint' : (b.idle ? 'idle' : 'run');
  if (b.act && b.act.type === 'hop') pose = 'jump'; else if (b.act && b.act.type === 'duck') pose = 'duck';
  drawChar(ctx, d.char, b.x, GROUND - b.h, { pose, t: b.ph, scale: d.scale, faint: fall ? Math.min(1, b.fallT / 0.4) : 0, fwd: true, mood: d.mood, prop: d.prop, airH: b.h });
  if (!fall && b.age < 2.8 && b.x > 0) {
    ctx.font = '800 14px Nunito, system-ui, sans-serif'; const line = d.lines[mode], tw = ctx.measureText(line).width + 18;
    const tx = Math.max(b.x + 10, 100), ty = GROUND - 150;
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.roundRect(tx - 6, ty - 22, tw, 28, 10); ctx.fill();
    ctx.beginPath(); ctx.moveTo(tx + 6, ty + 5); ctx.lineTo(tx + 14, ty + 15); ctx.lineTo(tx + 22, ty + 5); ctx.fill();
    ctx.fillStyle = '#111'; ctx.textBaseline = 'middle'; ctx.fillText(line, tx + 3, ty - 8);
  }
  if (fall && b.fallT > 0.35) drawStars(b.x + 70, GROUND - 6, b.fallT);
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
}
const BADGE = { x: 14, y: 10, w: 150, h: 42 };
function pill(x, y, w, h) {
  const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, 'rgba(40,22,12,.82)'); g.addColorStop(1, 'rgba(18,9,5,.82)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(x, y, w, h, h / 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,214,140,.35)'; ctx.lineWidth = 1.5; ctx.stroke();
}
function drawHUD() {
  pill(BADGE.x, BADGE.y, BADGE.w, BADGE.h); pill(176, BADGE.y, 96, BADGE.h);
  if (sips > 0) { // gouden slokken
    pill(282, BADGE.y, 92, BADGE.h); GOLDMODE = true;
    if (mode === 1) drawBottle(302, 31, 0.6); else if (mode === 3) drawCocktail(292, 15, 20, 32, 0.5); else drawWine(294, 17, 16, 28, 0.5);
    GOLDMODE = false; ctx.fillStyle = '#ffd43b'; ctx.font = '800 21px Nunito, system-ui, sans-serif'; ctx.textBaseline = 'middle'; ctx.fillText('×' + sips, 324, 32);
  }
  drawPortrait(BADGE.x + 21, BADGE.y + 21, 16);
  ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff'; ctx.font = '800 21px Nunito, system-ui, sans-serif';
  const ds = String(Math.floor(score)), dw = ctx.measureText(ds).width;
  ctx.fillText(ds, BADGE.x + 46, BADGE.y + 22);
  ctx.fillStyle = '#e9c88a'; ctx.font = '700 13px Nunito, system-ui, sans-serif'; ctx.fillText('m', BADGE.x + 50 + dw, BADGE.y + 25);
  if (mode === 1) drawBottle(197, 31, 0.6); else if (mode === 3) drawCocktail(187, 15, 20, 32, 0.5); else drawWine(189, 17, 16, 28, 0.4);
  ctx.fillStyle = '#fff'; ctx.font = '800 21px Nunito, system-ui, sans-serif'; ctx.fillText(itemCount, 216, 32);
  ctx.textAlign = 'right'; ctx.font = '700 14px Nunito, system-ui, sans-serif'; ctx.fillStyle = '#ffe9b8'; ctx.fillText('Best ' + best + ' m', W - 16, 30); ctx.textAlign = 'left';
  if (bonus) {
    const txt = { wine: '🍷 Wijnkelder', beer: '🍺 Brouwerij', cocktail: '🍹 Cocktailbar', wheat: '🌾 Tarwe veld', vineyard: '🍇 Druivenveld', fruit: '🍊 Fruitplantage' }[bonusKind] + ` · nog ${Math.max(0, Math.ceil(bonus.until - score))} m`;
    ctx.font = '800 14px Nunito, system-ui, sans-serif'; const tw = ctx.measureText(txt).width + 28; pill(W / 2 + 110 - tw / 2, 12, tw, 28);
    ctx.fillStyle = '#ffe9b8'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(txt, W / 2 + 110, 27); ctx.textAlign = 'left';
  }
  const pr = Math.min(1, score / FINISH);
  ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.beginPath(); ctx.roundRect(BADGE.x + 8, 57, 250, 8, 4); ctx.fill();
  ctx.fillStyle = '#ffc933'; ctx.beginPath(); ctx.roundRect(BADGE.x + 8, 57, Math.max(8, 250 * pr), 8, 4); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = '700 11px Nunito, system-ui, sans-serif'; ctx.textBaseline = 'middle'; ctx.fillText('🏁 ' + FINISH + ' m', BADGE.x + 262, 62);
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
  if (bonusBlend > 0.01) { ctx.globalAlpha = Math.min(1, bonusBlend); ({ wine: drawCellar, cocktail: drawCocktailBar, beer: drawBrewery, wheat: drawWheat, vineyard: drawVineyard, fruit: drawFruit }[bonusKind] || drawBrewery)(); ctx.globalAlpha = 1; }
  if (state === 'menu') { vignette(); return; }
  if (zoneBlend * (1 - bonusBlend) > 0.01) drawDisco(zoneBlend * (1 - bonusBlend));
  for (const m of motes) { ctx.fillStyle = `rgba(255,236,170,${0.25 + 0.2 * Math.sin(time * 2 + m.p)})`; ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, 7); ctx.fill(); }
  for (const c of items) drawItem(c, Math.sin(time * 5 + c.x * 0.05) * 3);
  obstacles.forEach(drawObstacle);
  if (finishObj) drawFinish();
  const fa = (state === 'faint' || state === 'over') ? Math.min(1, faintT / 0.35) : 0;
  let pose = 'run', py = player.y;
  if (state === 'ready' || state === 'finished') pose = 'idle';
  else if (fa) pose = 'faint';
  else if (state === 'won') { pose = 'cheer'; py = player.y - Math.abs(Math.sin(wonT * 7)) * 18; }
  else if (!player.on && !player.duck) pose = 'jump';
  else if (player.duck) pose = 'duck'; // ook in de lucht: opgevouwen naar beneden
  for (const d of dust) { ctx.fillStyle = `rgba(${d.col || '214,186,150'},${0.55 * (1 - d.t / 0.6)})`; ctx.beginPath(); ctx.arc(d.x, d.y, d.r * (1 + d.t * 2), 0, 7); ctx.fill(); }
  if (bouncer) drawBouncer();
  const dI = Math.min(1, drunk / 2);
  ctx.save(); if (dI > 0 && !fa) { ctx.translate(player.x, py); ctx.rotate(Math.sin(performance.now() / 260) * 0.13 * dI); ctx.translate(-player.x + Math.sin(performance.now() / 410) * 7 * dI, -py); }
  drawChar(ctx, player.f, player.x, py, { pose, t: phase, scale: 1.0, faint: fa, airH: GROUND - py, fwd: false });
  ctx.restore();
  if (fa) { const th = fa * Math.PI / 2; drawStars(player.x - 70 * Math.sin(th), player.y - 70 * Math.cos(th) - 9 * fa, faintT); }
  vignette();
  drawHUD();
  if (flash > 0) { ctx.globalAlpha = Math.min(1, flash) * 0.8; ctx.fillStyle = flashCol; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
  if (state === 'play') drawButtons();
  if (state === 'play' && hintT < 5) {
    ctx.globalAlpha = Math.min(1, 5 - hintT); ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.beginPath(); ctx.roundRect(W / 2 - 250, 70, 500, 30, 15); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = '15px Nunito, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText({ 1: 'Pak flesjes om je bier leeg te drinken', 2: 'Pak wijnglazen om je wijn leeg te drinken', 3: 'Pak cocktails om je cocktail leeg te drinken' }[mode] + ' · shotjes vullen weer bij', W / 2, 85);
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
  // dronken: dubbel beeld, wazig en een zwaaiend scherm
  const dI = state === 'menu' ? 0 : Math.min(1, drunk / 2), t = performance.now() / 1000;
  if (dI > 0) {
    ctx.save(); ctx.globalAlpha = 0.32 * dI; ctx.drawImage(cv, Math.sin(t * 2.1) * 9 * dI, Math.cos(t * 1.7) * 3 * dI); ctx.restore();
    cv.style.filter = `blur(${(1.6 * dI).toFixed(2)}px) saturate(${1 + 0.4 * dI})`;
    cv.style.transform = `rotate(${(Math.sin(t * 1.6) * 1.4 * dI).toFixed(2)}deg) scale(${1 + 0.02 * dI})`;
  } else if (cv.style.filter) { cv.style.filter = ''; cv.style.transform = ''; }
}
function loop(ts) {
  const dt = Math.min(0.05, ((ts - (lastT || ts)) / 1000)); lastT = ts;
  update(dt); render(ts);
  if (!$('editor').classList.contains('hidden')) drawPreview(ts);
  requestAnimationFrame(loop);
}

/* ---------- invoer ---------- */
const JUMP = ['ArrowUp', 'Space', 'KeyW'], DUCK = ['ArrowDown', 'KeyS'];
const ended = () => state === 'over' || state === 'ready' || ((state === 'won' || state === 'finished') && overShown);
addEventListener('keydown', e => {
  if (/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
  if (JUMP.includes(e.code)) { e.preventDefault(); if (!e.repeat) { if (ended()) primary(); else jump(); } }
  if (DUCK.includes(e.code)) { e.preventDefault(); input.duck = true; }
  if (e.code === 'Escape' && state !== 'menu') goHome();
});
addEventListener('keyup', e => { if (DUCK.includes(e.code)) input.duck = false; });

function pointerPos(e) { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height }; }
const active = new Map();
cv.addEventListener('pointerdown', e => {
  e.preventDefault();
  const pp = pointerPos(e);
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
