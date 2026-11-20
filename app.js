(() => {
'use strict';

/* ---------- constants ---------- */
const SUITS = ['S','H','D','C'];
const SUIT_NAME = {S:'Spades',H:'Hearts',D:'Diamonds',C:'Clubs'};
const RED = {H:true,D:true};
const RANKS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
const UNITS = ['reps','sec','cal','m'];
const SUIT_MULTS = [0.5,1,2,3,5];
const K_SETTINGS='wd.settings.v1', K_GAME='wd.game.v1', K_CUSTOM='wd.custom.v1';

const s = (name, unit='reps', mult=1) => ({name, unit, mult});
const PRESETS = [
  {id:'classic', name:'Bodyweight Classic', suits:{S:s('Push-ups'),H:s('Squats'),D:s('Sit-ups'),C:s('Burpees')}},
  {id:'upper',   name:'Upper Body',         suits:{S:s('Push-ups'),H:s('Pull-ups','reps',0.5),D:s('Dips'),C:s('Pike push-ups')}},
  {id:'lower',   name:'Lower Body',         suits:{S:s('Squats'),H:s('Lunges'),D:s('Glute bridges'),C:s('Jump squats')}},
  {id:'core',    name:'Core',               suits:{S:s('Crunches'),H:s('Leg raises'),D:s('Russian twists'),C:s('Plank','sec',2)}},
  {id:'kb',      name:'Kettlebell / DB',    suits:{S:s('Swings'),H:s('Goblet squats'),D:s('Rows'),C:s('Thrusters')}},
  {id:'cardio',  name:'Cardio Blast',       suits:{S:s('Jumping jacks','reps',2),H:s('Mountain climbers','reps',2),D:s('High knees','reps',2),C:s('Burpees')}},
];

const DEFAULTS = {
  presetId:'classic',
  suits: clone(PRESETS[0].suits),
  face:{J:11,Q:12,K:13,A:14},
  faceFixedOn:false, faceFixed:10,
  mult:1,
  jokers:false, joker1:'2 min rest', joker2:'Burpees ×20',
  haptics:true, wake:true,
  rest:30,
};
const REST_MIN=5, REST_MAX=600, REST_STEP=5;
const clampRest = v => Math.min(REST_MAX, Math.max(REST_MIN, Math.round(+v||30)));

/* ---------- storage ---------- */
function clone(o){return JSON.parse(JSON.stringify(o));}
function load(k,d){try{const v=JSON.parse(localStorage.getItem(k));return v==null?d:v;}catch(e){return d;}}
function save(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}
let settings = Object.assign(clone(DEFAULTS), load(K_SETTINGS,{}));
settings.face = Object.assign(clone(DEFAULTS.face), settings.face||{});
settings.rest = clampRest(settings.rest);
let custom = load(K_CUSTOM, []);
let game = load(K_GAME, null);
const saveSettings = () => save(K_SETTINGS, settings);
const saveGame = () => save(K_GAME, game);

/* ---------- dom ---------- */
const $ = id => document.getElementById(id);
const el = (tag, cls, html) => {const e=document.createElement(tag); if(cls) e.className=cls; if(html!=null) e.innerHTML=html; return e;};
const esc = t => String(t).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* ---------- suit art ---------- */
const SUIT_PATH = {
  S:'<path d="M50 4C38 22 6 40 6 64c0 15 12 25 25 25 8 0 14-4 17-9-1 8-5 14-12 18h28c-7-4-11-10-12-18 3 5 9 9 17 9 13 0 25-10 25-25C94 40 62 22 50 4z"/>',
  H:'<path d="M50 94C44 86 5 62 5 33 5 17 17 6 30 6c9 0 16 5 20 13 4-8 11-13 20-13 13 0 25 11 25 27 0 29-39 53-45 61z"/>',
  D:'<path d="M50 3L87 50 50 97 13 50z"/>',
  C:'<circle cx="50" cy="27" r="20"/><circle cx="26" cy="58" r="20"/><circle cx="74" cy="58" r="20"/><circle cx="50" cy="52" r="12"/><path d="M45 56c0 16-4 29-13 40h36c-9-11-13-24-13-40z"/>',
};
const INK = suit => RED[suit] ? '#d21f36' : '#151a24';
function pip(suit, cx, cy, size, flip){
  const sc = size/100, x = cx - size/2, y = cy - size/2;
  const rot = flip ? ` rotate(180 ${cx} ${cy})` : '';
  return `<g transform="${rot.trim()}"><g transform="translate(${x} ${y}) scale(${sc})" fill="${INK(suit)}">${SUIT_PATH[suit]}</g></g>`;
}
function suitIcon(suit, size=24){
  return `<svg viewBox="0 0 100 100" width="${size}" height="${size}" aria-label="${SUIT_NAME[suit]}"><g fill="${INK(suit)}">${SUIT_PATH[suit]}</g></svg>`;
}
function suitIconLight(suit, size=24){ // for dark backgrounds
  const c = RED[suit] ? '#ff4d61' : '#e9edf5';
  return `<svg viewBox="0 0 100 100" width="${size}" height="${size}"><g fill="${c}">${SUIT_PATH[suit]}</g></svg>`;
}

const C_ = 78, M_ = 125, R_ = 172, T_ = 80, B_ = 270, MID = 175;
const q1 = T_ + (B_-T_)/3, q2 = T_ + 2*(B_-T_)/3;
const PIPS = {
  '2':[[M_,T_],[M_,B_]],
  '3':[[M_,T_],[M_,MID],[M_,B_]],
  '4':[[C_,T_],[R_,T_],[C_,B_],[R_,B_]],
  '5':[[C_,T_],[R_,T_],[M_,MID],[C_,B_],[R_,B_]],
  '6':[[C_,T_],[R_,T_],[C_,MID],[R_,MID],[C_,B_],[R_,B_]],
  '7':[[C_,T_],[R_,T_],[M_,(T_+MID)/2],[C_,MID],[R_,MID],[C_,B_],[R_,B_]],
  '8':[[C_,T_],[R_,T_],[M_,(T_+MID)/2],[C_,MID],[R_,MID],[M_,(MID+B_)/2],[C_,B_],[R_,B_]],
  '9':[[C_,T_],[R_,T_],[C_,q1],[R_,q1],[M_,MID],[C_,q2],[R_,q2],[C_,B_],[R_,B_]],
  '10':[[C_,T_],[R_,T_],[M_,(T_+q1)/2],[C_,q1],[R_,q1],[C_,q2],[R_,q2],[M_,(q2+B_)/2],[C_,B_],[R_,B_]],
};

let uid = 0;
const CROWN = {
  K:'<path d="M-34 18 L-38 -14 L-20 2 L0 -22 L20 2 L38 -14 L34 18 Z" /><rect x="-36" y="18" width="72" height="9" rx="2"/>',
  Q:'<path d="M-30 16 L-34 -8 L-17 4 L0 -14 L17 4 L34 -8 L30 16 Z"/><rect x="-32" y="16" width="64" height="8" rx="2"/><circle cx="-34" cy="-11" r="4.5"/><circle cx="0" cy="-18" r="5"/><circle cx="34" cy="-11" r="4.5"/>',
  J:'<path d="M-32 20 C-30 -6 -12 -20 8 -18 C24 -16 34 -6 36 4 C26 -2 16 0 12 8 L 30 20 Z"/><rect x="-34" y="18" width="68" height="8" rx="2"/><circle cx="36" cy="4" r="5"/>',
};
function cardFrontSVG(id){
  const n = ++uid;
  if (id[0]==='X') return jokerSVG(id, n);
  const suit = id[0], rank = id.slice(1), ink = INK(suit);
  const rankTxt = (x,y,flip) => `<g ${flip?`transform="rotate(180 125 175)"`:''}>
      <text x="${x}" y="${y}" text-anchor="middle" font-family="Georgia,'Times New Roman',serif" font-weight="700" font-size="${rank==='10'?36:40}" fill="${ink}" letter-spacing="${rank==='10'?-3:0}">${rank}</text>
      ${pip(suit, x, y+20, 26, false)}</g>`;
  let body = '';
  if (PIPS[rank]) {
    const size = (rank==='10'||rank==='9') ? 42 : 46;
    body = PIPS[rank].map(([x,y]) => pip(suit, x, y, size, y > MID+1)).join('');
  } else if (rank==='A') {
    body = (suit==='S'
      ? `<circle cx="125" cy="175" r="78" fill="none" stroke="${ink}" stroke-width="1.5" opacity=".35"/><circle cx="125" cy="175" r="70" fill="none" stroke="${ink}" stroke-width="4" opacity=".12"/>`
      : '') + pip(suit, 125, 175, suit==='S'?110:100, false);
  } else {
    const g = `fg${n}`, red = RED[suit];
    const c1 = red ? '#fff3ef' : '#f1f4fb', c2 = red ? '#f7cfc9' : '#cdd5e8';
    const half = `<g>
        <g transform="translate(125 76)" fill="#d9a43a" stroke="#8a6416" stroke-width="1.5">${CROWN[rank]}</g>
        <text x="125" y="160" text-anchor="middle" font-family="Georgia,'Times New Roman',serif" font-weight="700" font-size="66" fill="${ink}">${rank}</text>
        ${pip(suit, 76, 136, 24, false)}${pip(suit, 174, 136, 24, false)}
      </g>`;
    body = `<defs><linearGradient id="${g}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>
      <rect x="50" y="40" width="150" height="270" rx="8" fill="url(#${g})" stroke="#d9a43a" stroke-width="3"/>
      <rect x="56" y="46" width="138" height="258" rx="5" fill="none" stroke="${ink}" stroke-opacity=".35" stroke-width="1.2"/>
      ${half}<g transform="rotate(180 125 175)">${half}</g>
      <line x1="62" y1="175" x2="188" y2="175" stroke="#d9a43a" stroke-width="2"/>
      <g transform="translate(125 175) rotate(45)"><rect x="-9" y="-9" width="18" height="18" fill="#d9a43a" stroke="#8a6416" stroke-width="1.5"/></g>`;
  }
  return `<svg viewBox="0 0 250 350" xmlns="http://www.w3.org/2000/svg">${paper(n)}${body}${rankTxt(24,46,false)}${rankTxt(24,46,true)}</svg>`;
}
function paper(n){
  return `<defs><linearGradient id="pp${n}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffefa"/><stop offset="1" stop-color="#f1ede2"/></linearGradient></defs>
    <rect x="0.5" y="0.5" width="249" height="349" rx="15" fill="url(#pp${n})" stroke="#cfc8b6"/>`;
}
function jokerSVG(id, n){
  const star = (cx,cy,r,f) => { let p=''; for(let i=0;i<10;i++){const a=Math.PI/5*i-Math.PI/2, rr=i%2?r*.45:r; p+=`${(cx+rr*Math.cos(a)).toFixed(1)},${(cy+rr*Math.sin(a)).toFixed(1)} `;} return `<polygon points="${p}" fill="${f}"/>`; };
  const corner = flip => `<g ${flip?'transform="rotate(180 125 175)"':''} font-family="Georgia,serif" font-weight="700" font-size="20" fill="#b3122a" text-anchor="middle">
    ${'JOKER'.split('').map((c,i)=>`<text x="24" y="${40+i*21}">${c}</text>`).join('')}${star(24,158,11,'#151a24')}</g>`;
  return `<svg viewBox="0 0 250 350" xmlns="http://www.w3.org/2000/svg">${paper(n)}
    <defs><radialGradient id="jg${n}" cx=".5" cy=".45" r=".6"><stop offset="0" stop-color="#ffe9a8"/><stop offset="1" stop-color="#e0a530"/></radialGradient></defs>
    <rect x="50" y="40" width="150" height="270" rx="10" fill="url(#jg${n})" stroke="#8a6416" stroke-width="2"/>
    <g transform="translate(125 150)">
      <path d="M-50 20 C-46 -20 -30 -46 -4 -50 C-16 -30 -14 -10 -2 8 Z" fill="#b3122a"/>
      <path d="M50 20 C46 -20 30 -46 4 -50 C16 -30 14 -10 2 8 Z" fill="#151a24"/>
      <path d="M-8 10 C-4 -26 4 -26 8 10 Z" fill="#1f5fbf"/>
      <circle cx="-4" cy="-50" r="7" fill="#d9a43a" stroke="#8a6416"/><circle cx="4" cy="-50" r="7" fill="#d9a43a" stroke="#8a6416"/>
      <rect x="-54" y="18" width="108" height="14" rx="7" fill="#151a24"/>
    </g>
    ${star(125,230,26,'#b3122a')}
    <text x="125" y="290" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-size="22" letter-spacing="4" fill="#151a24">BONUS</text>
    ${corner(false)}${corner(true)}</svg>`;
}
function cardBackSVG(){
  const n = ++uid;
  return `<svg viewBox="0 0 250 350" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <pattern id="bp${n}" width="22" height="22" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="22" height="22" fill="#b3122a"/><path d="M0 11h22M11 0v22" stroke="#fff" stroke-opacity=".16" stroke-width="2"/>
        <circle cx="11" cy="11" r="3" fill="#fff" fill-opacity=".18"/>
      </pattern>
      <linearGradient id="bs${n}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".18"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></linearGradient>
    </defs>
    <rect x="0.5" y="0.5" width="249" height="349" rx="15" fill="#fffefa" stroke="#cfc8b6"/>
    <rect x="12" y="12" width="226" height="326" rx="9" fill="url(#bp${n})"/>
    <rect x="22" y="22" width="206" height="306" rx="6" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="2.5"/>
    <g transform="translate(125 175)">
      <circle r="44" fill="#8e0d20" stroke="#fff" stroke-opacity=".6" stroke-width="2.5"/>
      <g transform="translate(-21 -21) scale(.42)" fill="#fff" fill-opacity=".9">${SUIT_PATH.S}</g>
    </g>
    <rect x="12" y="12" width="226" height="326" rx="9" fill="url(#bs${n})"/>
  </svg>`;
}

/* ---------- reps ---------- */
function baseValue(rank){
  if (/^\d+$/.test(rank)) return +rank;
  if (rank==='A') return +settings.face.A || 0;
  if (settings.faceFixedOn) return +settings.faceFixed || 0;
  return +settings.face[rank] || 0;
}
function computeDraw(id){
  if (id[0]==='X') return {id, joker:true, exercise:(id==='X1'?settings.joker1:settings.joker2) || 'Bonus', reps:null, unit:''};
  const suit = id[0], rank = id.slice(1), cfg = settings.suits[suit];
  const reps = Math.max(1, Math.round(baseValue(rank) * (+settings.mult||1) * (+cfg.mult||1)));
  return {id, suit, exercise: cfg.name || SUIT_NAME[suit], unit: cfg.unit || 'reps', reps};
}

/* ---------- deck / game ---------- */
function fullDeck(withJokers){
  const d = [];
  for (const su of SUITS) for (const r of RANKS) d.push(su + r);
  if (withJokers) d.push('X1','X2');
  return d;
}
function randInt(n){ // unbiased
  const a = new Uint32Array(1), lim = Math.floor(0x100000000 / n) * n;
  let x; do { crypto.getRandomValues(a); x = a[0]; } while (x >= lim);
  return x % n;
}
function fisherYates(arr){
  for (let i = arr.length - 1; i > 0; i--) { const j = randInt(i + 1); [arr[i], arr[j]] = [arr[j], arr[i]]; }
  return arr;
}
function newGame(){
  const deck = fisherYates(fullDeck(settings.jokers));
  game = {deck, size: deck.length, drawn: [], accum: 0, runSince: null, finished: false, startedAt: Date.now(), restEnd: null, restDur: 0};
  saveGame();
}
const inProgress = () => game && !game.finished && game.drawn.length > 0;
const elapsed = () => !game ? 0 : game.accum + (game.runSince ? Date.now() - game.runSince : 0);
function pauseTimer(){ if (game && game.runSince){ game.accum += Date.now() - game.runSince; game.runSince = null; saveGame(); } }
function resumeTimer(){ if (game && !game.runSince && !game.finished){ game.runSince = Date.now(); saveGame(); } }
function fmt(ms){
  const t = Math.floor(ms/1000), h = Math.floor(t/3600), m = Math.floor(t%3600/60), sec = t%60;
  return h ? `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}` : `${m}:${String(sec).padStart(2,'0')}`;
}

/* ---------- screens ---------- */
let screen = 'setup';
function show(name){
  screen = name;
  for (const n of ['setup','workout','finish']) $(n).classList.toggle('hidden', n !== name);
  window.scrollTo(0,0);
  if (name === 'workout') { requestWake(); renderWorkout(); }
  else releaseWake();
  if (name === 'setup') renderSetup();
  if (name === 'finish') renderFinish();
}

/* ---------- setup ---------- */
let editingId = null;
function allPresets(){ return PRESETS.concat(custom); }
function renderPresets(){
  const list = $('presetList'); list.innerHTML = '';
  for (const p of allPresets()) {
    const b = el('div', 'preset' + (p.id === settings.presetId ? ' on' : '')); b.setAttribute('role','button'); b.tabIndex = 0;
    b.dataset.id = p.id;
    b.innerHTML = `<b>${esc(p.name)}</b><span>${SUITS.map(k => esc(p.suits[k].name)).join(' · ')}</span>` +
      (p.custom ? `<em class="tag">MINE</em><button class="del" aria-label="Delete preset" data-del="${p.id}">×</button><button class="edit" aria-label="Edit preset" data-edit="${p.id}">✎</button>` : '');
    if (p.id === editingId) b.classList.add('editing');
    b.addEventListener('click', e => {
      const del = e.target.closest('[data-del]');
      if (del) { e.stopPropagation(); deletePreset(del.dataset.del); return; }
      const ed = e.target.closest('[data-edit]');
      applyPreset(p);
      if (ed) { editingId = p.id; $('presetName').value = p.name; renderSetup(); toast(`Editing “${p.name}”: change anything, then Update`); return; }
      if (editingId && editingId !== p.id) editingId = null;
      renderSetup(); toast(`${p.name} loaded`);
    });
    list.appendChild(b);
  }
}
const PRESET_KEYS = ['face','faceFixedOn','faceFixed','mult','jokers','joker1','joker2','rest'];
function applyPreset(p){
  settings.presetId = p.id; settings.suits = clone(p.suits);
  if (p.custom) for (const k of PRESET_KEYS) if (p[k] !== undefined) settings[k] = clone(p[k]);
  saveSettings();
}
function renderSuitEditor(){
  const box = $('suitEditor'); box.innerHTML = '';
  for (const k of SUITS) {
    const cfg = settings.suits[k];
    const row = el('div', 'suit-row');
    row.innerHTML = `<div class="suit-badge">${suitIcon(k,24)}</div>
      <input type="text" maxlength="28" value="${esc(cfg.name)}" aria-label="${SUIT_NAME[k]} exercise" data-suit="${k}">
      <div class="suit-extra">
        <select data-mult="${k}" aria-label="${SUIT_NAME[k]} multiplier">${SUIT_MULTS.map(m=>`<option value="${m}" ${+cfg.mult===m?'selected':''}>×${m}</option>`).join('')}</select>
        <select data-unit="${k}" aria-label="${SUIT_NAME[k]} unit">${UNITS.map(u=>`<option ${cfg.unit===u?'selected':''}>${u}</option>`).join('')}</select>
      </div>`;
    box.appendChild(row);
  }
  box.querySelectorAll('[data-suit]').forEach(i => i.addEventListener('input', () => { settings.suits[i.dataset.suit].name = i.value; saveSettings(); }));
  box.querySelectorAll('[data-mult]').forEach(i => i.addEventListener('change', () => { settings.suits[i.dataset.mult].mult = +i.value; saveSettings(); }));
  box.querySelectorAll('[data-unit]').forEach(i => i.addEventListener('change', () => { settings.suits[i.dataset.unit].unit = i.value; saveSettings(); }));
}
function renderSetup(){
  renderPresets(); renderSuitEditor();
  for (const r of ['J','Q','K','A']) $('v'+r).value = settings.face[r];
  $('faceFixedOn').checked = settings.faceFixedOn; $('faceFixed').value = settings.faceFixed;
  $('faceFixedRow').classList.toggle('hidden', !settings.faceFixedOn);
  ['vJ','vQ','vK'].forEach(i => $(i).disabled = settings.faceFixedOn);
  document.querySelectorAll('#multSeg button').forEach(b => b.classList.toggle('on', +b.dataset.m === +settings.mult));
  $('jokersOn').checked = settings.jokers; $('jokerFields').classList.toggle('hidden', !settings.jokers);
  $('joker1').value = settings.joker1; $('joker2').value = settings.joker2;
  $('hapticsOn').checked = settings.haptics; $('wakeOn').checked = settings.wake;
  if (document.activeElement !== $('restSec')) $('restSec').value = settings.rest;
  const ep = editingId && custom.find(x => x.id === editingId);
  if (editingId && !ep) editingId = null;
  $('savePresetBtn').textContent = ep ? 'Update' : 'Save';
  $('cancelEditBtn').classList.toggle('hidden', !ep);
  const ip = inProgress();
  $('resumeBtn').classList.toggle('hidden', !ip);
  if (ip) $('resumeInfo').textContent = `· ${game.deck.length} left`;
  $('startBtn').textContent = ip ? 'New shuffle & start' : 'Shuffle & Start';
}
function bindSetup(){
  for (const r of ['J','Q','K','A']) $('v'+r).addEventListener('input', e => { settings.face[r] = Math.max(0, +e.target.value || 0); saveSettings(); });
  $('faceFixedOn').addEventListener('change', e => { settings.faceFixedOn = e.target.checked; saveSettings(); renderSetup(); });
  $('faceFixed').addEventListener('input', e => { settings.faceFixed = Math.max(0, +e.target.value || 0); saveSettings(); });
  $('multSeg').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; settings.mult = +b.dataset.m; saveSettings(); renderSetup(); });
  $('jokersOn').addEventListener('change', e => { settings.jokers = e.target.checked; saveSettings(); renderSetup(); });
  $('joker1').addEventListener('input', e => { settings.joker1 = e.target.value; saveSettings(); });
  $('joker2').addEventListener('input', e => { settings.joker2 = e.target.value; saveSettings(); });
  $('hapticsOn').addEventListener('change', e => { settings.haptics = e.target.checked; saveSettings(); });
  $('wakeOn').addEventListener('change', e => { settings.wake = e.target.checked; saveSettings(); });
  $('savePresetBtn').addEventListener('click', savePreset);
  $('cancelEditBtn').addEventListener('click', () => { editingId = null; $('presetName').value = ''; renderSetup(); });
  $('restSec').addEventListener('change', e => setRest(e.target.value));
  $('setRestMinus').addEventListener('click', () => setRest(settings.rest - REST_STEP));
  $('setRestPlus').addEventListener('click', () => setRest(settings.rest + REST_STEP));
  $('presetName').addEventListener('keydown', e => { if (e.key === 'Enter') savePreset(); });
  $('resumeBtn').addEventListener('click', () => { show('workout'); });
  $('startBtn').addEventListener('click', async () => {
    if (inProgress() && !(await confirmBox('Start a new shuffle?', `You have ${game.deck.length} cards left in this workout. Reshuffling resets the whole deck.`, 'Reshuffle'))) return;
    await startNew();
  });
}
function savePreset(){
  const name = $('presetName').value.trim();
  if (!name) { toast('Give it a name first'); $('presetName').focus(); return; }
  const editing = editingId && custom.find(p => p.id === editingId);
  const existing = editing || custom.find(p => p.name.toLowerCase() === name.toLowerCase());
  const p = existing || {id: 'c' + Date.now(), name, custom: true};
  p.name = name; p.suits = clone(settings.suits);
  for (const k of PRESET_KEYS) p[k] = clone(settings[k]);
  editingId = null;
  if (!existing) custom.push(p);
  save(K_CUSTOM, custom);
  settings.presetId = p.id; saveSettings();
  $('presetName').value = '';
  renderSetup(); toast(existing ? `Updated “${name}”` : `Saved “${name}”`);
}
async function deletePreset(id){
  const p = custom.find(x => x.id === id); if (!p) return;
  if (!(await confirmBox('Delete preset?', `“${p.name}” will be removed.`, 'Delete'))) return;
  custom = custom.filter(x => x.id !== id); save(K_CUSTOM, custom);
  if (editingId === id) { editingId = null; $('presetName').value = ''; }
  if (settings.presetId === id) settings.presetId = null;
  saveSettings(); renderSetup();
}

/* ---------- shuffle ---------- */
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
async function startNew(){
  newGame();
  $('shuffleOverlay').classList.remove('hidden');
  buzz([15,40,15,40,15]);
  await wait(reduceMotion ? 50 : 1300);
  $('shuffleOverlay').classList.add('hidden');
  game.runSince = null; game.accum = 0; game.restEnd = null; saveGame(); // workout timer starts on first card flip
  lastShownId = null;
  show('workout');
}

/* ---------- workout ---------- */
let busy = false, lastShownId = null;
function makeCard(id, faceUp){
  const c = el('div', 'card3d' + (faceUp ? ' flipped' : ''));
  c.innerHTML = `<div class="face back">${cardBackSVG()}</div>` + (id ? `<div class="face front">${cardFrontSVG(id)}</div>` : '');
  if (id) c.dataset.card = id;
  return c;
}
function renderWorkout(){
  if (!game) { newGame(); }
  const slot = $('cardSlot');
  const last = game.drawn[game.drawn.length - 1];
  if (!slot.firstChild || lastShownId !== (last ? last.id : null)) {
    slot.innerHTML = '';
    slot.appendChild(makeCard(last ? last.id : null, !!last));
    lastShownId = last ? last.id : null;
  }
  renderReadout(last, false);
  renderStats();
}
function renderReadout(d, animate){
  const ro = $('readout');
  ro.classList.toggle('red', !!(d && RED[d.suit]));
  if (!d) { $('repsText').innerHTML = 'Tap to draw'; $('exerciseText').innerHTML = `${game.deck.length} cards shuffled`; }
  else if (d.joker) { $('repsText').innerHTML = 'JOKER'; $('exerciseText').textContent = d.exercise; }
  else { $('repsText').innerHTML = `${d.reps}<span class="unit">${esc(d.unit)}</span>`; $('exerciseText').textContent = d.exercise; }
  if (animate) { ro.classList.remove('pop'); void ro.offsetWidth; ro.classList.add('pop'); }
}
function totalsData(){
  const rows = [], idx = {};
  for (const k of SUITS) { const c = settings.suits[k]; const key = (c.name||SUIT_NAME[k]) + '|' + c.unit; if (!(key in idx)) { idx[key] = rows.length; rows.push({suit:k, name:c.name||SUIT_NAME[k], unit:c.unit, total:0, cards:0}); } }
  const jokers = [];
  for (const d of game.drawn) {
    if (d.joker) { jokers.push(d.exercise); continue; }
    const key = d.exercise + '|' + d.unit;
    if (!(key in idx)) { idx[key] = rows.length; rows.push({suit:d.suit, name:d.exercise, unit:d.unit, total:0, cards:0}); }
    rows[idx[key]].total += d.reps; rows[idx[key]].cards++;
  }
  return {rows, jokers};
}
function renderTotals(box){
  const {rows, jokers} = totalsData();
  box.innerHTML = rows.map(r => `<div class="tot">${suitIconLight(r.suit,22)}<div><div class="tn">${esc(r.name)}</div><div class="tv">${r.total}<small>${esc(r.unit)}</small></div></div></div>`).join('') +
    (jokers.length ? `<div class="tot joker"><svg viewBox="0 0 24 24"><path d="M12 2l3 7h7l-5.6 4.3 2.1 7.2L12 16.3 5.5 20.5l2.1-7.2L2 9h7z" fill="#e8b84a"/></svg><div><div class="tn">Jokers</div><div class="tv" style="font-size:15px">${jokers.map(esc).join(' · ')}</div></div></div>` : '');
}
function renderStats(){
  $('remaining').textContent = game.deck.length; $('deckSize').textContent = game.size;
  $('progressBar').style.width = (100 * game.drawn.length / game.size) + '%';
  $('drawnCount').textContent = game.drawn.length ? `(${game.drawn.length})` : '';
  renderTotals($('totals'));
  const h = $('history');
  h.innerHTML = game.drawn.length ? game.drawn.slice().reverse().map(d => d.joker
      ? `<div class="mini jk" title="${esc(d.exercise)}">JOKER</div>`
      : `<div class="mini ${RED[d.suit]?'r':''}">${d.id.slice(1)}${suitIcon(d.suit,16)}</div>`).join('')
    : '<span class="muted" style="font-size:14px">No cards yet</span>';
  const empty = game.deck.length === 0;
  $('drawBtn').textContent = empty ? 'Finish workout' : (game.drawn.length ? 'Next card' : 'Draw first card');
  $('timer').textContent = fmt(elapsed());
  const started = game.drawn.length > 0;
  $('pauseBtn').classList.toggle('paused', started && !game.runSince && !game.finished);
  $('pauseBtn').disabled = !started;
  $('pausedVeil').classList.toggle('hidden', !started || !!game.runSince || game.finished || empty || !!game.restEnd);
  renderRest();
}
async function draw(){
  if (busy || !game) return;
  if (game.restEnd) stopRest();
  if (game.deck.length === 0) { finishGame(); return; }
  if (!game.runSince) resumeTimer();
  busy = true; $('drawBtn').disabled = true;
  const id = game.deck.pop();
  const d = computeDraw(id);
  game.drawn.push(d);
  if (game.deck.length === 0) { pauseTimer(); }
  saveGame();
  buzz(25);
  const slot = $('cardSlot');
  const old = slot.firstChild;
  const card = makeCard(id, false);
  card.classList.add('deal-in');
  if (old) { old.classList.add('deal-out'); setTimeout(() => old.remove(), 320); }
  slot.appendChild(card);
  lastShownId = id;
  await wait(reduceMotion ? 10 : 120);
  card.classList.add('flipped');
  await wait(reduceMotion ? 10 : 260);
  renderReadout(d, true);
  renderStats();
  await wait(reduceMotion ? 10 : 200);
  card.classList.remove('deal-in');
  busy = false; $('drawBtn').disabled = false;
}
function finishGame(){
  pauseTimer(); game.finished = true; game.finishedAt = Date.now(); saveGame();
  buzz([40,60,40,60,120]);
  show('finish');
}
function renderFinish(){
  $('finishTime').textContent = fmt(elapsed());
  const {rows} = totalsData();
  const all = rows.reduce((a,r) => a + (r.unit === 'reps' ? r.total : 0), 0);
  $('finishSub').textContent = `${game.drawn.length} cards · workout time`;
  renderTotals($('finishTotals'));
  $('finishTotals').insertAdjacentHTML('beforeend', `<div class="total-all"><b>${all}</b> total reps</div>`);
}
function bindWorkout(){
  $('drawBtn').addEventListener('click', draw);
  $('cardSlot').addEventListener('click', draw);
  $('backBtn').addEventListener('click', () => { if (game && game.restEnd) stopRest(); show('setup'); });
  $('pauseBtn').addEventListener('click', () => { if (!game || game.finished || !game.drawn.length) return; if (game.runSince) { stopRest(); pauseTimer(); } else resumeTimer(); renderStats(); });
  $('restBtn').addEventListener('click', startRest);
  $('restMinus').addEventListener('click', () => setRest(settings.rest - REST_STEP));
  $('restPlus').addEventListener('click', () => setRest(settings.rest + REST_STEP));
  $('restSkip').addEventListener('click', e => { e.stopPropagation(); stopRest(); draw(); });
  $('restCancel').addEventListener('click', e => { e.stopPropagation(); stopRest(); renderStats(); });
  $('restVeil').addEventListener('click', e => e.stopPropagation());
  $('pausedVeil').addEventListener('click', () => { resumeTimer(); renderStats(); });
  $('resetBtn').addEventListener('click', async () => {
    if (game && game.drawn.length && game.deck.length && !(await confirmBox('Shuffle all?', `${game.drawn.length} cards drawn, ${game.deck.length} left. This puts every card back and resets the timer.`, 'Shuffle all'))) return;
    await startNew();
  });
  $('againBtn').addEventListener('click', () => startNew());
  $('toSetupBtn').addEventListener('click', () => show('setup'));
  setInterval(() => { if (screen === 'workout' && game) $('timer').textContent = fmt(elapsed()); restTick(); }, 250);
}

/* ---------- rest timer (timestamp based, no sound) ---------- */
let lastRestSec = null;
function setRest(v){
  settings.rest = clampRest(v); saveSettings();
  $('restSec').value = settings.rest;
  $('restLabel').textContent = restFmt(settings.rest);
}
const restFmt = sec => sec >= 60 ? `${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}` : `${sec}s`;
function startRest(){
  if (!game || game.finished || busy || game.deck.length === 0) return;
  if (game.drawn.length) resumeTimer();
  game.restDur = settings.rest * 1000; game.restEnd = Date.now() + game.restDur; lastRestSec = null;
  saveGame(); buzz(20); renderStats(); restTick();
}
function stopRest(){ if (game && game.restEnd) { game.restEnd = null; saveGame(); } lastRestSec = null; renderRest(); }
function renderRest(){
  const on = !!(game && game.restEnd);
  $('restVeil').classList.toggle('hidden', !on);
  $('restLabel').textContent = restFmt(settings.rest);
  const empty = !game || game.deck.length === 0 || game.finished;
  $('restBtn').disabled = empty || on; $('restMinus').disabled = $('restPlus').disabled = false;
}
function restTick(){
  if (!game || !game.restEnd || screen !== 'workout') return;
  const left = game.restEnd - Date.now();
  if (left <= 0) {
    game.restEnd = null; saveGame(); lastRestSec = null; renderRest();
    buzz([200,90,200,90,350]);
    const f = $('flash'); f.classList.remove('go'); void f.offsetWidth; f.classList.add('go');
    if (!busy) draw(); else setTimeout(draw, 600);
    return;
  }
  const sec = Math.ceil(left / 1000);
  $('restCount').textContent = sec >= 60 ? restFmt(sec) : sec;
  $('restRing').style.setProperty('--p', Math.max(0, Math.min(1, left / (game.restDur || 1))).toFixed(4));
  $('restVeil').classList.toggle('last3', sec <= 3);
  if (sec !== lastRestSec) { if (lastRestSec !== null && sec <= 3) buzz(35); lastRestSec = sec; }
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') restTick(); });

/* ---------- helpers ---------- */
const wait = ms => new Promise(r => setTimeout(r, ms));
function buzz(p){ if (settings.haptics && navigator.vibrate) try { navigator.vibrate(p); } catch(e){} }
let toastT;
function toast(msg){ const t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 1600); }
function confirmBox(title, text, okLabel='OK'){
  return new Promise(res => {
    $('modalTitle').textContent = title; $('modalText').textContent = text; $('modalOk').textContent = okLabel;
    const m = $('modal'); m.classList.remove('hidden');
    const done = v => { m.classList.add('hidden'); $('modalOk').onclick = $('modalCancel').onclick = m.onclick = null; res(v); };
    $('modalOk').onclick = () => done(true);
    $('modalCancel').onclick = () => done(false);
    m.onclick = e => { if (e.target === m) done(false); };
  });
}
let wakeLock = null;
async function requestWake(){
  if (!settings.wake || !('wakeLock' in navigator) || wakeLock) return;
  try { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => { wakeLock = null; }); } catch(e) {}
}
function releaseWake(){ if (wakeLock) { wakeLock.release().catch(()=>{}); wakeLock = null; } }
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && screen === 'workout') requestWake(); });

/* ---------- boot ---------- */
document.querySelector('.logo').innerHTML = SUITS.map(k => suitIconLight(k, 26)).join('');
bindSetup(); bindWorkout();
if (game && game.finished) show('finish');
else if (inProgress()) show('workout');
else { if (game && !game.drawn.length) game = null; show('setup'); }
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(()=>{});
window.__wd = { get game(){ return game; }, get settings(){ return settings; }, get custom(){ return custom; }, cardSVG: cardFrontSVG, version: 2 };
})();
