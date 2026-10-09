/* 하루나 — 마음이 쉬어가는 나만의 기록 공간
 * 앱인토스 미니앱용. 서버 없이 동작하며 기록과 사진은 이 기기의 IndexedDB에만 저장됩니다. */
'use strict';

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const LS = {
  get(k, d) { try { const v = localStorage.getItem('haruna.' + k); return v === null ? d : v; } catch { return d; } },
  set(k, v) { try { localStorage.setItem('haruna.' + k, v); } catch {} },
  del(k) { try { localStorage.removeItem('haruna.' + k); } catch {} },
};

// ---------- 기분 ----------
const MOODS = [
  { v: 5, label: '매우 좋음', color: '#8CC773', deep: '#4F8A3C', cheer: '이런 날이 더 많아지면 좋겠어요' },
  { v: 4, label: '좋음', color: '#93D2CB', deep: '#3E8C84', cheer: '소소한 행복을 잘 챙겼네요' },
  { v: 3, label: '보통', color: '#F7D26E', deep: '#B08A1E', cheer: '평범한 하루도 소중해요' },
  { v: 2, label: '힘듦', color: '#AFC3EE', deep: '#5A73B0', cheer: '오늘은 푹 쉬어도 괜찮아요' },
  { v: 1, label: '매우 힘듦', color: '#F2A093', deep: '#C2584A', cheer: '많이 힘들었죠, 잘 버텨냈어요' },
];
const moodOf = (v) => MOODS.find((m) => m.v === v) || MOODS[2];

function faceInner(v) {
  const m = moodOf(v), ink = '#4A3F35';
  const st = `stroke="${ink}" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round" fill="none"`;
  let s = `<circle cx="50" cy="50" r="50" fill="${m.color}"/>`;
  s += v === 5
    ? `<path d="M25 46 Q33 34 41 46 M59 46 Q67 34 75 46" ${st}/>`
    : `<ellipse cx="33" cy="43" rx="5.5" ry="6" fill="${ink}"/><ellipse cx="67" cy="43" rx="5.5" ry="6" fill="${ink}"/>`;
  if (v >= 4) s += `<ellipse cx="24" cy="58" rx="8" ry="4.3" fill="#EF7F7F" opacity=".4"/><ellipse cx="76" cy="58" rx="8" ry="4.3" fill="#EF7F7F" opacity=".4"/>`;
  if (v === 1) s += `<path d="M24 27 L38 32 M76 27 L62 32" ${st}/>`;
  const y = v >= 3 ? 62 : 70, half = v === 5 ? 13 : 10;
  const curve = { 5: 20, 4: 13, 3: 2.5, 2: -9, 1: -13 }[v];
  const d = `M${50 - half} ${y} Q50 ${y + curve} ${50 + half} ${y}`;
  s += v === 5 ? `<path d="${d} Z" fill="${ink}" ${st.replace('fill="none"', '')}/>` : `<path d="${d}" ${st}/>`;
  return s;
}
const faceSVG = (v, size = 44) =>
  `<svg class="face" width="${size}" height="${size}" viewBox="0 0 100 100" role="img" aria-label="${moodOf(v).label}">${faceInner(v)}</svg>`;

// ---------- 아이콘 ----------
const I = (d, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ${extra}>${d}</svg>`;
const ICON = {
  gear: I('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
  down: I('<path d="m6 9 6 6 6-6"/>', 'stroke-width="3"'),
  left: I('<path d="m15 18-6-6 6-6"/>'),
  right: I('<path d="m9 18 6-6-6-6"/>'),
  back: I('<path d="m15 18-6-6 6-6"/>', 'stroke-width="2.5"'),
  star: I('<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>'),
  starFill: I('<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" fill="currentColor"/>'),
  photo: I('<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>'),
  x: I('<path d="M18 6 6 18M6 6l12 12"/>', 'stroke-width="3"'),
  pencil: I('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>'),
  trash: I('<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6"/>'),
  lock: I('<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'),
  up: I('<path d="M12 15V3M7 8l5-5 5 5"/><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/>'),
  downl: I('<path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 15v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"/>'),
  theme: I('<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 0 0 18z" fill="currentColor"/>'),
  phone: I('<rect x="6" y="2" width="12" height="20" rx="3"/><path d="M11 18h2"/>'),
  help: I('<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7M12 17h.01"/>'),
  shield: I('<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/>'),
  info: I('<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01"/>'),
  leaf: I('<path d="M5 19c0-8 5-14 15-14 0 10-6 15-14 15"/><path d="M5 19 13 11"/>'),
  share: I('<path d="M12 3v12M8 7l4-4 4 4"/><path d="M6 11H5v10h14V11h-1"/>'),
};

// ---------- 날짜 ----------
const pad = (n) => String(n).padStart(2, '0');
const keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const dateOf = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
const todayKey = () => keyOf(new Date());
const addDays = (k, n) => { const d = dateOf(k); d.setDate(d.getDate() + n); return keyOf(d); };
const WD = ['일', '월', '화', '수', '목', '금', '토'];
const fmtDay = (k) => { const d = dateOf(k); return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WD[d.getDay()]})`; };
const fmtFull = (k) => `${k.slice(0, 4)}년 ${fmtDay(k)}`;
const fmtMonth = (ym) => `${ym.slice(0, 4)}년 ${Number(ym.slice(5, 7))}월`;
const fmtShort = (k) => { const d = dateOf(k); return `${d.getMonth() + 1}/${d.getDate()}`; };
const fmtTime = (ts) => { const d = new Date(ts), h = d.getHours(); return `${h < 12 ? '오전' : '오후'} ${h % 12 || 12}:${pad(d.getMinutes())}`; };
const shiftMonth = (ym, n) => { const d = new Date(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)) - 1 + n, 1); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; };

// ---------- 저장소 (IndexedDB) ----------
const DB = (() => {
  let dbp;
  const open = () => dbp || (dbp = new Promise((res, rej) => {
    const r = indexedDB.open('haruna', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('entries', { keyPath: 'day' });
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  }));
  const tx = async (mode, fn) => {
    const db = await open();
    return new Promise((res, rej) => {
      const t = db.transaction('entries', mode);
      const req = fn(t.objectStore('entries'));
      t.oncomplete = () => res(req ? req.result : undefined);
      t.onerror = () => rej(t.error);
      t.onabort = () => rej(t.error);
    });
  };
  return {
    all: () => tx('readonly', (s) => s.getAll()),
    put: (e) => tx('readwrite', (s) => s.put(e)),
    del: (day) => tx('readwrite', (s) => s.delete(day)),
    clear: () => tx('readwrite', (s) => s.clear()),
  };
})();

/** day(YYYY-MM-DD) → { day, mood, text, favorite, createdAt, updatedAt, photos: [{ id, full: Blob, thumb: Blob }] } */
const E = new Map();
const sortedEntries = (desc = true) => [...E.values()].sort((a, b) => (desc ? b.day.localeCompare(a.day) : a.day.localeCompare(b.day)));

const urlCache = new WeakMap();
function blobURL(b) {
  let u = urlCache.get(b);
  if (!u) { u = URL.createObjectURL(b); urlCache.set(b, u); }
  return u;
}

async function saveEntry(day, draft) {
  const old = E.get(day), now = Date.now();
  const e = {
    day, mood: draft.mood, text: draft.text.trim(), photos: draft.photos.slice(),
    favorite: old ? old.favorite : false, createdAt: old ? old.createdAt : now, updatedAt: now,
  };
  await DB.put(e);
  E.set(day, e);
  return !old;
}

// ---------- 사진 ----------
const MAX_PHOTOS = 4;
function loadImage(file) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); res(img); };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('이미지를 열 수 없어요')); };
    img.src = url;
  });
}
function resize(img, max, q) {
  const w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
  const s = Math.min(1, max / Math.max(w, h));
  const c = document.createElement('canvas');
  c.width = Math.round(w * s); c.height = Math.round(h * s);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return new Promise((r) => c.toBlob(r, 'image/jpeg', q));
}
async function makePhoto(file) {
  const img = await loadImage(file);
  return { id: uid(), full: await resize(img, 1600, 0.82), thumb: await resize(img, 480, 0.75) };
}

// ---------- 키워드 ----------
const PARTICLES = ['에서는', '에게서', '으로는', '이랑', '에서', '에게', '까지', '부터', '처럼', '보다', '으로', '하고', '한테', '이나', '이는',
  '하게', '했던', '하는', '은', '는', '이', '가', '을', '를', '에', '와', '과', '도', '로', '의', '랑', '만', '께', '한'].sort((a, b) => b.length - a.length);
const PREDICATE = ['었다', '았다', '했다', '였다', '겠다', '어요', '아요', '해요', '했어', '었어', '았어', '니다', '네요', '는데', '지만', '면서',
  '해서', '어서', '아서', '나서', '러서', '워서', '고서', '같다', '싶다', '좋다', '했고', '었고', '았고', '어야', '아야', '겠어', '자고', '려고', '는지', '을까'];
const STEM = new Set(['있', '없', '했', '었', '았', '겠', '되', '하', '였']);
const STOP = new Set(['오늘', '그리고', '그래서', '하지만', '그런데', '정말', '너무', '진짜', '조금', '많이', '그냥', '이런', '그런', '저런', '우리',
  '나는', '내가', '하루', '다시', '계속', '아직', '이제', '모두', '같이', '함께', '어제', '내일', '요즘', '다들', '그게', '이게', '뭔가']);
function keywords(texts, limit = 12) {
  const counts = new Map();
  for (const t of texts) {
    const seen = new Set();
    for (const raw of t.toLowerCase().split(/[^0-9a-z가-힣]+/)) {
      if (raw.length < 2 || raw.endsWith('다') || PREDICATE.some((p) => raw.endsWith(p))) continue;
      let w = raw;
      for (let pass = 0; pass < 2; pass++) {
        const p = PARTICLES.find((q) => w.endsWith(q) && w.length > q.length);
        if (!p) break;
        w = w.slice(0, -p.length);
      }
      if (w.length < 2 || STEM.has(w[w.length - 1]) || STOP.has(w) || /^\d+$/.test(w)) continue;
      if (!seen.has(w)) { seen.add(w); counts.set(w, (counts.get(w) || 0) + 1); }
    }
  }
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, limit);
}

// ---------- 상태 ----------
const S = {
  tab: 'today',
  day: todayKey(),
  draft: null, base: '', draftDay: null,
  recMode: 'calendar',
  month: todayKey().slice(0, 7),
  selDay: todayKey(),
  favFilter: 'fav',
  period: LS.get('period', '30'),
  detail: null,
};
const newDraft = (e) => (e ? { mood: e.mood, text: e.text, photos: e.photos.slice() } : { mood: 0, text: '', photos: [] });
const sig = (d) => `${d.mood}|${d.text}|${d.photos.map((p) => p.id).join(',')}`;
const isDirty = () => S.draft && sig(S.draft) !== S.base;

const view = $('#view');
function render() {
  document.querySelectorAll('#tabbar button').forEach((b) => b.classList.toggle('on', b.dataset.tab === S.tab));
  ({ today: renderToday, records: renderRecords, stats: renderStats, favorites: renderFavorites })[S.tab]();
}

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.remove('show'), 1700);
}

// ---------- 공용 컴포넌트 ----------
function mountMoodPicker(el, draft, onChange) {
  el.classList.add('mood-picker');
  const paint = () => {
    el.innerHTML = MOODS.map((m) => {
      const sel = draft.mood === m.v, dim = draft.mood && !sel;
      return `<button class="mood ${sel ? 'sel' : ''} ${dim ? 'dim' : ''}" data-v="${m.v}" aria-pressed="${sel}">
        <span class="mf" style="--c:${m.color}">${faceSVG(m.v, 48)}</span><span class="ml">${m.label}</span></button>`;
    }).join('');
  };
  el.onclick = (ev) => {
    const b = ev.target.closest('button[data-v]');
    if (!b) return;
    draft.mood = Number(b.dataset.v);
    paint();
    onChange();
  };
  paint();
}

function mountEditor(el, draft, onChange) {
  el.innerHTML = `<div class="card editor">
    <textarea rows="6" placeholder="오늘 있었던 일을&#10;자유롭게 적어보세요..."></textarea>
    <div class="photo-row"></div></div>`;
  const ta = $('textarea', el), row = $('.photo-row', el);
  ta.value = draft.text;
  const grow = () => { ta.style.height = 'auto'; ta.style.height = Math.max(140, ta.scrollHeight) + 'px'; };
  ta.addEventListener('input', () => { draft.text = ta.value; grow(); onChange(); });
  requestAnimationFrame(grow);

  let loading = false;
  const paint = () => {
    const full = draft.photos.length >= MAX_PHOTOS;
    row.innerHTML = `<label class="photo-add ${full || loading ? 'off' : ''}" aria-label="사진 추가">
        ${loading ? '<span class="spinner"></span>' : ICON.photo}<span>${draft.photos.length}/${MAX_PHOTOS}</span>
        <input type="file" accept="image/*" multiple></label>` +
      draft.photos.map((p) => `<div class="thumb"><img src="${blobURL(p.thumb)}" alt=""><button data-id="${p.id}" aria-label="사진 삭제">${ICON.x}</button></div>`).join('');
    $('input', row).onchange = async (ev) => {
      const files = [...ev.target.files].slice(0, MAX_PHOTOS - draft.photos.length);
      if (!files.length) return;
      loading = true; paint();
      for (const f of files) {
        try { draft.photos.push(await makePhoto(f)); } catch { toast('사진을 불러오지 못했어요'); }
      }
      loading = false; paint(); onChange();
    };
  };
  row.onclick = (ev) => {
    const b = ev.target.closest('button[data-id]');
    if (!b) return;
    draft.photos = draft.photos.filter((p) => p.id !== b.dataset.id);
    paint(); onChange();
  };
  paint();
}

function cardHTML(e, showDate = true) {
  const m = moodOf(e.mood), p = e.photos[0];
  const star = e.favorite ? `<span class="star-ico">${ICON.starFill}</span>` : '';
  return `<button class="card entry-card" data-action="open" data-day="${e.day}">
    <div class="ec-main">
      ${showDate ? `<div class="ec-date"><span>${fmtFull(e.day)}</span>${star}</div>` : ''}
      <div class="ec-mood">${faceSVG(e.mood, 26)}<b style="color:${m.deep}">${m.label}</b>${showDate ? '' : `<span class="grow"></span>${star}`}</div>
      <p class="ec-text ${e.text ? '' : 'muted'}">${e.text ? esc(e.text) : '적은 글 없이 기분만 남겼어요'}</p>
    </div>
    ${p ? `<div class="ec-thumb"><img src="${blobURL(p.thumb)}" alt="">${e.photos.length > 1 ? `<span>+${e.photos.length - 1}</span>` : ''}</div>` : ''}
  </button>`;
}

const emptyHTML = (title, msg, btn, action, day = '') => `<div class="card empty">
  <img src="mascot.png" alt=""><b>${title}</b><p>${msg}</p>
  ${btn ? `<button class="pill-btn" data-action="${action}" data-day="${day}">${btn}</button>` : ''}</div>`;

// ---------- 오늘 ----------

const MEADOW = `<svg class="meadow" viewBox="0 0 390 260" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
  <defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="sky1"/><stop offset="1" class="sky2"/></linearGradient></defs>
  <rect width="390" height="260" fill="url(#sky)"/>
  <ellipse cx="40" cy="250" rx="190" ry="70" class="hill2"/>
  <ellipse cx="360" cy="255" rx="190" ry="66" class="hill2"/>
  <ellipse cx="195" cy="295" rx="330" ry="78" class="hill1"/>
  ${[[38, 205, 8, '#fff'], [78, 232, 6, '#FFE3E3'], [118, 200, 5, '#fff'], [282, 203, 5.5, '#fff'], [328, 228, 8, '#FFE3E3'], [362, 196, 6, '#fff']]
    .map(([x, y, r, c]) => `<g transform="translate(${x} ${y})">${[0, 72, 144, 216, 288].map((a) => `<circle r="${r * 0.5}" cy="${-r * 0.55}" fill="${c}" transform="rotate(${a})"/>`).join('')}<circle r="${r * 0.33}" fill="#F6C94E"/></g>`).join('')}
</svg>`;

function renderToday() {
  const day = S.day;
  if (!S.draft || S.draftDay !== day || !isDirty()) {
    S.draft = newDraft(E.get(day)); S.base = sig(S.draft); S.draftDay = day;
  }
  view.innerHTML = `
    <section class="hero">${MEADOW}
      <img class="mascot" src="mascot.png" alt="" data-action="bounce">
      <div class="hero-top"><h1>하루나</h1><button class="icon-btn glass" data-action="settings" aria-label="설정">${ICON.gear}</button></div>
    </section>
    <div class="today-body">
      <label class="date-btn"><span>${fmtDay(day)}</span>${ICON.down}<input type="date" id="dateInput" max="${todayKey()}" value="${day}" aria-label="날짜 바꾸기"></label>
      <div class="bubble" id="bubble"></div>
      <div id="moodPicker"></div>
      <div id="editor" style="width:100%"></div>
      <button class="primary-btn" id="saveBtn" data-action="save"></button>
      <p class="hint" id="saveHint"></p>
      <p class="footer-note">오늘도 수고했어요 ♥</p>
    </div>`;
  const update = () => {
    const d = S.draft, has = E.has(S.day);
    $('#bubble').textContent = d.mood ? moodOf(d.mood).cheer : (S.day === todayKey() ? '오늘 하루는 어떠셨나요?' : '이날 하루는 어떠셨나요?');
    const btn = $('#saveBtn');
    btn.textContent = has ? '기록 수정하기' : S.day === todayKey() ? '오늘 기록하기' : '이날 기록하기';
    btn.disabled = !d.mood || (has && !isDirty());
    $('#saveHint').textContent = d.mood ? (has && !isDirty() ? '저장된 기록이에요' : '') : '기분을 먼저 골라주세요';
  };
  mountMoodPicker($('#moodPicker'), S.draft, update);
  mountEditor($('#editor'), S.draft, update);
  update();

  const di = $('#dateInput');
  di.onchange = () => {
    const v = di.value;
    if (!v || v === S.day) return;
    if (v > todayKey()) { di.value = S.day; toast('미래의 날짜는 기록할 수 없어요'); return; }
    if (isDirty() && !confirm('작성 중인 내용이 있어요.\n저장하지 않고 다른 날짜로 이동할까요?')) { di.value = S.day; return; }
    S.day = v; S.draft = null;
    renderToday();
  };
}

async function saveToday() {
  if (!S.draft.mood) return;
  const isNew = await saveEntry(S.day, S.draft);
  S.base = sig(S.draft);
  document.activeElement && document.activeElement.blur();
  renderToday();
  toast(isNew ? '🌱 기록했어요' : '✏️ 수정했어요');
}

// ---------- 기록 ----------
function renderRecords() {
  const head = `<div class="screen-head"><h1>기록</h1></div>
    <div class="segmented" style="margin-bottom:16px">
      <button class="${S.recMode === 'calendar' ? 'on' : ''}" data-action="recMode" data-v="calendar">캘린더</button>
      <button class="${S.recMode === 'list' ? 'on' : ''}" data-action="recMode" data-v="list">목록</button></div>`;
  view.innerHTML = `<div class="screen">${head}<div class="stack">${S.recMode === 'calendar' ? calendarSection() : listSection()}</div></div>`;
  if (S.recMode === 'calendar') bindSwipe($('#calendar'));
}

function calendarSection() {
  const [y, m] = S.month.split('-').map(Number);
  const lead = new Date(y, m - 1, 1).getDay(), count = new Date(y, m, 0).getDate();
  const today = todayKey(), canNext = S.month < today.slice(0, 7);
  let cells = WD.map((w, i) => `<div class="cal-wd ${i === 0 ? 'sun' : ''}">${w}</div>`).join('');
  cells += '<div></div>'.repeat(lead);
  for (let d = 1; d <= count; d++) {
    const k = `${S.month}-${pad(d)}`, e = E.get(k), future = k > today;
    cells += `<button class="cal-day ${k === today ? 'today' : ''} ${k === S.selDay ? 'sel' : ''} ${future ? 'future' : ''}"
      data-action="selDay" data-day="${k}" ${future ? 'disabled' : ''} aria-label="${fmtDay(k)} ${e ? moodOf(e.mood).label : '기록 없음'}">
      <span class="num">${d}</span>${e ? faceSVG(e.mood, 22) : '<span class="dot"></span>'}</button>`;
  }
  const sel = E.get(S.selDay);
  const monthCount = [...E.keys()].filter((k) => k.startsWith(S.month)).length;
  return `<div class="card" id="calendar">
      <div class="cal-head"><button class="icon-btn" data-action="month" data-v="-1" aria-label="이전 달">${ICON.left}</button>
        <b>${fmtMonth(S.month)}</b>
        <button class="icon-btn" data-action="month" data-v="1" ${canNext ? '' : 'disabled'} aria-label="다음 달">${ICON.right}</button></div>
      <div class="cal-grid">${cells}</div></div>
    <div><p class="section-title">${fmtDay(S.selDay)}</p>
      ${sel ? cardHTML(sel, false) : emptyHTML('이날의 기록이 없어요', '짧은 한마디도 충분해요.', '기록하러 가기', 'writeOn', S.selDay)}</div>
    ${monthCount ? `<div class="month-note"><span style="color:var(--primary);width:16px;height:16px;display:inline-flex">${ICON.leaf}</span>${fmtMonth(S.month)}에 ${monthCount}일 기록했어요</div>` : ''}`;
}

function listSection() {
  const list = sortedEntries();
  if (!list.length) return emptyHTML('아직 기록이 없어요', '오늘의 마음부터 남겨볼까요?', '오늘 기록하기', 'writeOn', todayKey());
  let html = '', cur = '';
  for (const e of list) {
    const ym = e.day.slice(0, 7);
    if (ym !== cur) { cur = ym; html += `<p class="section-title" style="margin:8px 0 -2px">${fmtMonth(ym)}</p>`; }
    html += cardHTML(e);
  }
  return html;
}

function bindSwipe(el) {
  let x0 = null, y0 = null;
  el.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
  el.addEventListener('touchend', (e) => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
    x0 = null;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return;
    const next = shiftMonth(S.month, dx < 0 ? 1 : -1);
    if (next > todayKey().slice(0, 7)) return;
    S.month = next; renderRecords();
  }, { passive: true });
}

// ---------- 통계 ----------
const PERIODS = [['7', '최근 7일'], ['30', '최근 30일'], ['90', '최근 90일'], ['all', '전체']];

function periodEntries() {
  const all = sortedEntries(false);
  if (S.period === 'all') return all;
  const start = addDays(todayKey(), -(Number(S.period) - 1));
  return all.filter((e) => e.day >= start);
}

function streak() {
  let k = todayKey(), n = 0;
  if (!E.has(k)) k = addDays(k, -1);
  while (E.has(k)) { n++; k = addDays(k, -1); }
  return n;
}

function renderStats() {
  const list = periodEntries();
  const chips = `<div class="chips-scroll">${PERIODS.map(([v, l]) => `<button class="chip-btn ${S.period === v ? 'on' : ''}" data-action="period" data-v="${v}">${l}</button>`).join('')}</div>`;
  let body;
  if (!list.length) {
    const label = PERIODS.find(([v]) => v === S.period)[1];
    body = emptyHTML(`${label} 동안 기록이 없어요`, '기록이 쌓이면 마음의 변화가 보여요.', '오늘 기록하기', 'writeOn', todayKey());
  } else {
    const avg = Math.round(list.reduce((s, e) => s + e.mood, 0) / list.length);
    const counts = MOODS.map((m) => [m, list.filter((e) => e.mood === m.v).length]);
    const kw = keywords(list.map((e) => e.text));
    body = `
      <div class="tiles">
        <div class="card tile"><small>기록한 날</small><b>${list.length}일</b></div>
        <div class="card tile"><small>연속 기록</small><b>${streak()}일</b></div>
        <div class="card tile"><small>평균 기분</small><span class="avg">${faceSVG(avg, 22)}${moodOf(avg).label}</span></div>
      </div>
      <div class="card"><p class="section-title">기분 변화</p>${lineChart(list)}</div>
      <div class="card"><p class="section-title">기분 비율</p>
        <div class="ratio">
          <div class="donut">${donut(counts, list.length)}<div class="center"><b>총 ${list.length}일</b><small>기록했어요</small></div></div>
          <div class="legend">${counts.map(([m, n]) => `<div>${faceSVG(m.v, 16)}<span>${m.label}</span><span class="pct">${Math.round((n / list.length) * 100)}%</span></div>`).join('')}</div>
        </div></div>
      <div class="card"><p class="section-title">자주 기록한 키워드</p>
        ${kw.length ? `<div class="keywords">${kw.map(([w, n], i) => `<span class="${i < 3 ? 'top' : ''}">${esc(w)}${n > 1 ? `<em>${n}</em>` : ''}</span>`).join('')}</div>`
          : '<p class="muted" style="margin:0;font-size:14px">글을 조금 더 남기면 자주 쓰는 단어가 보여요</p>'}</div>`;
  }
  view.innerHTML = `<div class="screen"><div class="screen-head"><h1>통계</h1></div><div class="stack">${chips}${body}</div></div>`;
}

function lineChart(list) {
  const W = 320, H = 190, L = 28, R = 10, T = 10, B = 24, pw = W - L - R, ph = H - T - B;
  const t0 = dateOf(list[0].day).getTime(), t1 = dateOf(list[list.length - 1].day).getTime();
  const span = Math.max(t1 - t0, 864e5);
  const x = (k) => L + (list.length === 1 ? pw / 2 : ((dateOf(k).getTime() - t0) / span) * pw);
  const y = (v) => T + ((5.5 - v) / 5) * ph;
  let s = '';
  for (let v = 1; v <= 5; v++) {
    s += `<line class="grid" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/>`;
    s += `<svg x="2" y="${y(v) - 8}" width="16" height="16" viewBox="0 0 100 100">${faceInner(v)}</svg>`;
  }
  const ticks = list.length === 1 ? [t0] : [0, 1, 2, 3, 4].map((i) => t0 + (span * i) / 4);
  for (const t of ticks) {
    const k = keyOf(new Date(t)), tx = list.length === 1 ? L + pw / 2 : L + ((t - t0) / span) * pw;
    s += `<text class="axis-label" x="${tx}" y="${H - 6}" text-anchor="middle">${fmtShort(k)}</text>`;
  }
  if (list.length > 1) s += `<path class="line" d="${list.map((e, i) => `${i ? 'L' : 'M'}${x(e.day).toFixed(1)} ${y(e.mood).toFixed(1)}`).join(' ')}"/>`;
  s += list.map((e) => `<circle class="pt" cx="${x(e.day).toFixed(1)}" cy="${y(e.mood).toFixed(1)}" r="${list.length > 45 ? 3.5 : 5.5}" fill="${moodOf(e.mood).color}"/>`).join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="기분 변화 차트">${s}</svg>`;
}

function donut(counts, total) {
  const r = 44, c = 2 * Math.PI * r, used = counts.filter(([, n]) => n > 0);
  const gap = used.length > 1 ? 2 : 0;
  let off = 0, s = `<circle cx="60" cy="60" r="${r}" fill="none" stroke="var(--chip)" stroke-width="18"/>`;
  for (const [m, n] of used) {
    const len = (n / total) * c;
    s += `<circle cx="60" cy="60" r="${r}" fill="none" stroke="${m.color}" stroke-width="18"
      stroke-dasharray="${Math.max(0, len - gap)} ${c - Math.max(0, len - gap)}" stroke-dashoffset="${-off}" transform="rotate(-90 60 60)"/>`;
    off += len;
  }
  return `<svg viewBox="0 0 120 120" aria-hidden="true">${s}</svg>`;
}

// ---------- 소중한 기록 ----------
function renderFavorites() {
  const list = sortedEntries().filter((e) => S.favFilter === 'all' || e.favorite);
  const body = list.length ? list.map((e) => cardHTML(e)).join('')
    : S.favFilter === 'fav' ? emptyHTML('아직 소중한 기록이 없어요', '기록을 열고 ☆를 누르면\n여기에 모아둘 수 있어요.')
      : emptyHTML('아직 기록이 없어요', '오늘의 마음부터 남겨볼까요?', '오늘 기록하기', 'writeOn', todayKey());
  view.innerHTML = `<div class="screen"><div class="screen-head"><h1>소중한 기록</h1></div>
    <div class="stack"><div class="segmented">
      <button class="${S.favFilter === 'all' ? 'on' : ''}" data-action="favFilter" data-v="all">전체</button>
      <button class="${S.favFilter === 'fav' ? 'on' : ''}" data-action="favFilter" data-v="fav">★ 즐겨찾기</button></div>
    ${body}</div></div>`;
}

// ---------- 상세 ----------
const page = $('#page');
function openDetail(day) {
  S.detail = day;
  renderDetail();
  page.scrollTop = 0;
  page.classList.add('show');
  page.setAttribute('aria-hidden', 'false');
}
function closeDetail() {
  S.detail = null;
  page.classList.remove('show');
  page.setAttribute('aria-hidden', 'true');
}
function renderDetail() {
  const e = E.get(S.detail);
  if (!e) { closeDetail(); return; }
  const m = moodOf(e.mood);
  const edited = e.updatedAt - e.createdAt > 60000;
  page.innerHTML = `
    <header class="page-head">
      <button class="icon-btn" data-action="back" aria-label="뒤로">${ICON.back}</button>
      <button class="icon-btn fav ${e.favorite ? 'on' : ''}" data-action="fav" aria-label="${e.favorite ? '즐겨찾기 해제' : '즐겨찾기'}">${e.favorite ? ICON.starFill : ICON.star}</button>
    </header>
    <div class="page-body">
      <div class="date">${fmtFull(e.day)}</div>
      <div class="mood-line">${faceSVG(e.mood, 40)}<span style="color:${m.deep}">${m.label}</span></div>
      ${e.text ? `<p class="text">${esc(e.text)}</p>` : '<p class="text muted">적은 글 없이 기분만 남겼어요</p>'}
      ${e.photos.length ? `<div class="photo-grid">${e.photos.map((p, i) => `<button data-action="viewer" data-i="${i}" aria-label="사진 ${i + 1} 크게 보기"><img src="${blobURL(p.thumb)}" alt=""></button>`).join('')}</div>` : ''}
      <div class="foot-time">${fmtTime(e.createdAt)}에 작성됨${edited ? ` · ${fmtShort(keyOf(new Date(e.updatedAt)))} ${fmtTime(e.updatedAt)} 수정` : ''}</div>
    </div>
    <footer class="page-foot">
      <button data-action="edit">${ICON.pencil}수정</button>
      <button class="danger" data-action="delete">${ICON.trash}삭제</button>
    </footer>`;
}

async function toggleFavorite() {
  const e = E.get(S.detail);
  if (!e) return;
  e.favorite = !e.favorite;
  await DB.put(e);
  renderDetail(); render();
  toast(e.favorite ? '⭐ 소중한 기록에 담았어요' : '즐겨찾기를 해제했어요');
}

async function deleteEntry() {
  const day = S.detail;
  if (!confirm('이 기록을 삭제할까요?\n삭제한 기록은 되돌릴 수 없어요.')) return;
  await DB.del(day);
  E.delete(day);
  if (S.draftDay === day) S.draft = null;
  closeDetail(); render();
  toast('기록을 삭제했어요');
}

// ---------- 사진 뷰어 ----------
function openViewer(i) {
  const e = E.get(S.detail);
  if (!e) return;
  const v = $('#viewer');
  v.innerHTML = `<div class="track">${e.photos.map((p) => `<div class="slide"><img src="${blobURL(p.full)}" alt=""></div>`).join('')}</div>
    <button class="close" data-action="closeViewer" aria-label="닫기">${ICON.x}</button>
    ${e.photos.length > 1 ? `<div class="count">${i + 1} / ${e.photos.length}</div>` : ''}`;
  v.classList.add('show');
  const track = $('.track', v);
  track.scrollLeft = i * track.clientWidth;
  track.onscroll = () => {
    const c = $('.count', v);
    if (c) c.textContent = `${Math.round(track.scrollLeft / track.clientWidth) + 1} / ${e.photos.length}`;
  };
}

// ---------- 시트 ----------
const sheet = $('#sheet'), backdrop = $('#backdrop');
function openSheet(html) {
  sheet.innerHTML = html;
  sheet.scrollTop = 0;
  sheet.classList.add('show');
  backdrop.classList.add('show');
}
function closeSheet() {
  if (sheet.dataset.guard === '1' && !confirm('수정한 내용을 저장하지 않고 닫을까요?')) return;
  sheet.dataset.guard = '';
  sheet.classList.remove('show');
  backdrop.classList.remove('show');
}

function openEdit(day) {
  const e = E.get(day);
  if (!e) return;
  const d = newDraft(e), base = sig(d);
  openSheet(`<div class="sheet-head"><button class="link" data-action="closeSheet">취소</button><b>${fmtDay(day)}</b>
      <button class="link strong" id="editSave">저장</button></div>
    <div class="sheet-body"><div id="editMood"></div><div id="editEditor"></div></div>`);
  const update = () => {
    const changed = sig(d) !== base;
    $('#editSave').disabled = !d.mood || !changed;
    sheet.dataset.guard = changed ? '1' : '';
  };
  mountMoodPicker($('#editMood'), d, update);
  mountEditor($('#editEditor'), d, update);
  update();
  $('#editSave').onclick = async () => {
    await saveEntry(day, d);
    if (S.draftDay === day) S.draft = null;
    sheet.dataset.guard = '';
    closeSheet(); renderDetail(); render();
    toast('✏️ 수정했어요');
  };
}

// ---------- 설정 ----------
const THEMES = [['system', '시스템'], ['light', '라이트'], ['dark', '다크']];
function applyTheme() {
  const t = LS.get('theme', 'system');
  if (t === 'system') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = t;
}

const row = (icon, title, sub, right = `<span class="chev">${ICON.right}</span>`, attrs = '') =>
  `<button class="row" ${attrs}><span class="ri">${ICON[icon]}</span><span class="rt"><b>${title}</b>${sub ? `<small>${sub}</small>` : ''}</span>${right}</button>`;

function openSettings() {
  const theme = LS.get('theme', 'system');
  openSheet(`<div class="sheet-head"><span></span><b>설정</b><button class="icon-btn" data-action="closeSheet" aria-label="닫기">${ICON.x}</button></div>
    <div class="sheet-body">
      <div class="group">
        <label class="row"><span class="ri">${ICON.lock}</span><span class="rt"><b>잠금 설정</b><small>비밀번호 4자리로 앱을 보호해요</small></span>
          <span class="switch"><input type="checkbox" id="lockToggle" ${LS.get('pin', '') ? 'checked' : ''}><span></span></span></label>
      </div>
      <p class="group-title">데이터 관리</p>
      <div class="group">
        ${row('up', '백업 내보내기', `기록 ${E.size}개를 파일로 저장해요`, undefined, 'data-action="export"')}
        <label class="row"><span class="ri">${ICON.downl}</span><span class="rt"><b>백업 불러오기</b><small>내보낸 백업 파일에서 기록을 복원해요</small></span>
          <span class="chev">${ICON.right}</span><input type="file" id="importFile" accept=".json,application/json"></label>
        <button class="row danger" data-action="wipe" ${E.size ? '' : 'disabled'}><span class="ri">${ICON.trash}</span><span class="rt"><b>모든 기록 삭제</b></span></button>
      </div>
      <p class="sheet-note">모든 기록은 이 기기 안에만 저장돼요. 기기를 바꾸기 전에 백업 파일을 안전한 곳에 저장해 두세요.</p>
      <p class="group-title">테마 설정</p>
      <div class="segmented">${THEMES.map(([v, l]) => `<button class="${theme === v ? 'on' : ''}" data-action="theme" data-v="${v}">${l}</button>`).join('')}</div>
      <p class="group-title">도움말</p>
      <div class="group">
        ${row('help', '자주 묻는 질문', '', undefined, 'data-action="info" data-v="faq"')}
        ${row('shield', '개인정보 처리방침', '', undefined, 'data-action="info" data-v="privacy"')}
        ${row('info', '버전', '', '<span class="rv">1.0</span>')}
      </div>
    </div>`);
  $('#lockToggle').onchange = (ev) => {
    const on = ev.target.checked;
    ev.target.checked = !on; // 비밀번호 설정/확인이 끝나야 반영
    if (on) showLock('setup', () => { toast('🔒 잠금을 켰어요'); openSettings(); });
    else showLock('disable', () => { LS.del('pin'); toast('잠금을 껐어요'); openSettings(); });
  };
  $('#importFile').onchange = (ev) => { const f = ev.target.files[0]; if (f) importBackup(f); };
}

const INFO = {
  faq: ['자주 묻는 질문', [
    ['하루에 여러 번 기록할 수 있나요?', '하루나는 하루에 한 장의 기록을 남겨요. 같은 날 다시 기록하면 그날 기록이 수정돼요.'],
    ['지난 날짜도 기록할 수 있나요?', '오늘 탭에서 날짜를 눌러 지난 날을 고르거나, 기록 탭 캘린더에서 빈 날을 고른 뒤 \'기록하러 가기\'를 누르세요.'],
    ['사진은 몇 장까지 넣을 수 있나요?', '기록 하나에 최대 4장이에요. 용량을 아끼려고 적당한 크기로 줄여서 저장해요.'],
    ['휴대폰을 바꾸면 기록이 옮겨지나요?', '기록은 이 기기에만 저장돼요. 설정 → 백업 내보내기로 파일을 만든 뒤 새 기기에서 백업 불러오기를 해주세요.'],
    ['비밀번호를 잊어버렸어요.', '잠금 화면의 \'비밀번호를 잊었어요\'를 누르면 모든 기록을 지우고 잠금을 풀 수 있어요. 백업을 자주 해두세요.'],
    ['기록이 사라질 수도 있나요?', '앱을 지우거나 기기 저장 공간이 정리되면 기록이 사라질 수 있어요. 한 달에 한 번 백업을 권해요.'],
    ['하루나는 치료나 상담 서비스인가요?', '아니에요. 하루나는 하루의 기분과 이야기를 남기는 기록 공간이에요. 마음이 많이 힘들다면 가까운 사람이나 전문 기관의 도움을 받아 보세요.'],
  ].map(([q, a]) => `<div class="card"><h3>${q}</h3><p>${a}</p></div>`).join('')],
  privacy: ['개인정보 처리방침', `<div class="card"><h3>기록은 어디에도 보내지 않아요</h3><ol>
    <li>일기, 기분, 사진은 모두 이 기기의 앱 저장 공간에만 보관돼요.</li>
    <li>서버, 광고, 분석 도구를 사용하지 않으며 회원가입도 없어요.</li>
    <li>사진은 직접 고른 것만 앱 안으로 복사돼요.</li>
    <li>잠금 비밀번호는 원래 숫자가 아닌 암호화된 값으로만 저장돼요.</li>
    <li>백업 파일은 직접 저장한 위치에만 만들어져요.</li></ol></div>`],
};
function openInfo(kind, fromSettings = true) {
  const [title, html] = INFO[kind];
  openSheet(`<div class="sheet-head">${fromSettings ? `<button class="link" data-action="settings">‹ 설정</button>` : '<span></span>'}<b>${title}</b>
    <button class="icon-btn" data-action="closeSheet" aria-label="닫기">${ICON.x}</button></div>
    <div class="sheet-body info">${html}</div>`);
}

// ---------- 백업 ----------
const blobToDataURL = (b) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(b); });
const dataURLToBlob = async (u) => (await fetch(u)).blob();

async function exportBackup() {
  if (!E.size) { toast('내보낼 기록이 없어요'); return; }
  toast('백업 파일을 만드는 중…');
  const entries = [];
  for (const e of sortedEntries(false)) {
    const photos = [];
    for (const p of e.photos) photos.push({ full: await blobToDataURL(p.full), thumb: await blobToDataURL(p.thumb) });
    entries.push({ day: e.day, mood: e.mood, text: e.text, favorite: e.favorite, createdAt: e.createdAt, updatedAt: e.updatedAt, photos });
  }
  const json = JSON.stringify({ app: 'haruna', version: 1, exportedAt: new Date().toISOString(), entries });
  const name = `haruna-backup-${todayKey().replace(/-/g, '')}.json`;
  const file = new File([json], name, { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file);
  a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

async function importBackup(file) {
  try {
    const data = JSON.parse(await file.text());
    if (data.app !== 'haruna' || !Array.isArray(data.entries)) throw new Error('format');
    let applied = 0;
    for (const it of data.entries) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(it.day) || !MOODS.some((m) => m.v === it.mood)) continue;
      const cur = E.get(it.day);
      if (cur && cur.updatedAt >= it.updatedAt) continue;
      const photos = [];
      for (const p of it.photos || []) photos.push({ id: uid(), full: await dataURLToBlob(p.full), thumb: await dataURLToBlob(p.thumb) });
      const e = { day: it.day, mood: it.mood, text: String(it.text || ''), favorite: !!it.favorite,
        createdAt: Number(it.createdAt) || Date.now(), updatedAt: Number(it.updatedAt) || Date.now(), photos };
      await DB.put(e); E.set(e.day, e); applied++;
    }
    S.draft = null;
    render(); openSettings();
    alert(applied ? `${applied}개의 기록을 불러왔어요.` : '새로 불러올 기록이 없어요.');
  } catch {
    alert('하루나 백업 파일이 아니거나 손상된 파일이에요.');
  }
}

async function wipeAll() {
  if (!confirm('모든 기록을 삭제할까요?\n백업하지 않은 기록은 되돌릴 수 없어요.')) return;
  await DB.clear(); E.clear(); S.draft = null;
  closeSheet(); closeDetail(); render();
  toast('모든 기록을 삭제했어요');
}

// ---------- 잠금 ----------
async function hashPin(pin) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('haruna:' + pin));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const lockEl = $('#lock');
let lockState = null;
function showLock(mode, onDone) {
  lockState = { mode, onDone, input: '', first: null };
  paintLock(mode === 'setup' ? '새 비밀번호 4자리를 입력해 주세요' : mode === 'disable' ? '현재 비밀번호를 입력해 주세요' : '비밀번호를 입력해 주세요');
  lockEl.classList.add('show');
}
function paintLock(msg, err = false) {
  const st = lockState, canCancel = st.mode !== 'unlock';
  lockEl.innerHTML = `<img src="mascot.png" alt=""><h2>하루나</h2><p class="${err ? 'err' : ''}">${msg}</p>
    <div class="dots" id="dots">${[0, 1, 2, 3].map((i) => `<i class="${i < st.input.length ? 'on' : ''}"></i>`).join('')}</div>
    <div class="keypad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<button data-k="${n}">${n}</button>`).join('')}
      <button class="ghost" data-k="${canCancel ? 'cancel' : ''}">${canCancel ? '취소' : ''}</button><button data-k="0">0</button><button class="ghost" data-k="del" aria-label="지우기">⌫</button></div>
    ${st.mode === 'unlock' ? '<button class="lock-foot" data-k="forgot">비밀번호를 잊었어요</button>' : ''}`;
  if (err) { const d = $('#dots'); d.classList.add('shake'); }
}
lockEl.addEventListener('click', async (ev) => {
  const b = ev.target.closest('button[data-k]');
  if (!b || !lockState || lockState.busy) return;
  const k = b.dataset.k, st = lockState;
  if (k === 'cancel') { lockEl.classList.remove('show'); lockState = null; return; }
  if (k === 'forgot') {
    if (confirm('비밀번호를 초기화하려면 모든 기록을 지워야 해요.\n정말 모든 기록을 지우고 잠금을 풀까요?')) {
      await DB.clear(); E.clear(); LS.del('pin'); S.draft = null;
      lockEl.classList.remove('show'); lockState = null; render();
    }
    return;
  }
  if (k === 'del') { st.input = st.input.slice(0, -1); paintLock(lockEl.querySelector('p').textContent); return; }
  if (!/^\d$/.test(k) || st.input.length >= 4) return;
  st.input += k;
  paintLock(lockEl.querySelector('p').textContent);
  if (st.input.length < 4) return;

  const pin = st.input;
  st.busy = true;
  await new Promise((r) => setTimeout(r, 120));
  st.busy = false;
  if (st.mode === 'setup') {
    if (!st.first) { st.first = pin; st.input = ''; paintLock('한 번 더 입력해 주세요'); return; }
    if (st.first !== pin) { st.first = null; st.input = ''; paintLock('비밀번호가 서로 달라요. 처음부터 다시 입력해 주세요', true); return; }
    LS.set('pin', await hashPin(pin));
  } else if ((await hashPin(pin)) !== LS.get('pin', '')) {
    st.input = ''; paintLock('비밀번호가 맞지 않아요', true); return;
  }
  lockEl.classList.remove('show');
  lockState = null;
  st.onDone && st.onDone();
});

function lockIfNeeded() {
  if (LS.get('pin', '') && !lockState) showLock('unlock');
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') lockIfNeeded();
  else if (S.lastToday !== todayKey()) {
    // 자정이 지나 돌아오면 '오늘'을 새 날짜로 넘깁니다 (작성 중이면 그대로 둠)
    if (S.day === S.lastToday && !isDirty()) { S.day = todayKey(); S.draft = null; }
    S.lastToday = todayKey();
    render();
  }
});

// ---------- 이벤트 ----------
document.addEventListener('click', (ev) => {
  const tab = ev.target.closest('#tabbar button[data-tab]');
  if (tab) {
    if (S.tab === tab.dataset.tab) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    S.tab = tab.dataset.tab;
    render(); window.scrollTo(0, 0);
    return;
  }
  const el = ev.target.closest('[data-action]');
  if (!el) return;
  const { action, v, day } = el.dataset;
  switch (action) {
    case 'save': saveToday(); break;
    case 'settings': openSettings(); break;
    case 'bounce': el.classList.remove('bounce'); void el.offsetWidth; el.classList.add('bounce'); break;
    case 'recMode': S.recMode = v; render(); break;
    case 'month': S.month = shiftMonth(S.month, Number(v)); render(); break;
    case 'selDay': S.selDay = day; render(); break;
    case 'writeOn':
      if (isDirty() && S.day !== day && !confirm('오늘 탭에 작성 중인 내용이 있어요.\n저장하지 않고 이동할까요?')) return;
      S.day = day; S.draft = null; S.tab = 'today'; render(); window.scrollTo(0, 0); break;
    case 'period': S.period = v; LS.set('period', v); render(); break;
    case 'favFilter': S.favFilter = v; render(); break;
    case 'open': openDetail(day); break;
    case 'back': closeDetail(); break;
    case 'fav': toggleFavorite(); break;
    case 'edit': openEdit(S.detail); break;
    case 'delete': deleteEntry(); break;
    case 'viewer': openViewer(Number(el.dataset.i)); break;
    case 'closeViewer': $('#viewer').classList.remove('show'); break;
    case 'closeSheet': closeSheet(); break;
    case 'export': exportBackup(); break;
    case 'wipe': wipeAll(); break;
    case 'theme': LS.set('theme', v); applyTheme(); openSettings(); break;
    case 'info': openInfo(v); break;
  }
});
backdrop.addEventListener('click', closeSheet);

// 상세 화면: 왼쪽 가장자리에서 오른쪽으로 밀면 뒤로
(() => {
  let x0 = null, y0 = null;
  page.addEventListener('touchstart', (e) => { const t = e.touches[0]; x0 = t.clientX < 30 ? t.clientX : null; y0 = t.clientY; }, { passive: true });
  page.addEventListener('touchend', (e) => {
    if (x0 === null) return;
    const t = e.changedTouches[0];
    if (t.clientX - x0 > 80 && Math.abs(t.clientY - y0) < 60) closeDetail();
    x0 = null;
  }, { passive: true });
})();

// ---------- 시작 ----------
(async function start() {
  applyTheme();
  S.lastToday = todayKey();
  lockIfNeeded();
  try {
    for (const e of await DB.all()) E.set(e.day, e);
  } catch {
    toast('저장 공간을 열 수 없어요. 개인정보 보호 브라우징을 꺼주세요.');
  }
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  render();
})();
