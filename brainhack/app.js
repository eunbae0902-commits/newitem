/* 브레인핵 — 조직과 시장을 읽는 사고 훈련
 * 서버 없이 동작하는 iPhone 홈 화면용 웹앱. 모든 기록은 이 기기의 localStorage에만 저장됩니다. */
'use strict';

/* ---------- 콘텐츠 ---------- */
const MODELS = [
  { id: 'incentive', group: '조직', name: '인센티브 구조', q: '누가 무엇으로 보상받는가?',
    body: '사람은 성격보다 평가 지표대로 움직입니다. 부서 간 갈등의 대부분은 지표가 서로 부딪혀서 생깁니다.',
    apply: '영업은 매출로, 지원팀은 비용으로 평가받습니다. 회의 전에 참석자 각자의 지표를 적어 보면 누가 어떤 안에 반대할지 미리 보입니다.',
    drill: 'incentive', src: 'Charlie Munger, 「The Psychology of Human Misjudgment」(1995)' },
  { id: 'leverage', group: '조직', name: '레버리지 포인트', q: '어디를 건드리면 시스템 전체가 움직이는가?',
    body: '예산이나 인원 같은 숫자를 바꾸는 개입이 가장 약하고, 규칙과 정보 흐름과 목표를 바꾸는 개입이 가장 강합니다.',
    apply: '인력 충원을 요청하기보다 보고 체계나 정보가 흐르는 길을 다시 설계하는 제안이 수석급 해법입니다.',
    drill: 'process', src: 'Donella Meadows, 「Leverage Points: Places to Intervene in a System」(1999)' },
  { id: 'map', group: '조직', name: '지도와 영토', q: '보고서와 현장은 어디서 다른가?',
    body: '경영진은 지도(보고서, 도면, 지표)를 보고, 현장은 영토(실제 동선, 사람, 병목)에서 움직입니다.',
    apply: '대구·김포·청주 신축을 모두 겪은 경험이 영토 지식입니다. 둘 사이의 차이를 찾아 보고하는 일 자체가 가치입니다.',
    drill: 'process', src: 'Alfred Korzybski, 『Science and Sanity』(1933)' },
  { id: 'second', group: '시장', name: '2차적 사고', q: '그다음엔 무슨 일이 일어나는가?',
    body: '1차 사고는 모두가 합니다. 초과 수익은 2차, 3차 효과를 먼저 읽는 쪽에서 나옵니다.',
    apply: 'AI 붐 → 데이터센터 전력 수요 급증 → 전력망이 병목 → 전력·SMR 수혜. 여기서 한 단계 더 나아가 봅니다.',
    drill: 'second', src: 'Howard Marks, 『투자에 대한 생각』(2011)' },
  { id: 'pendulum', group: '시장', name: '진자 운동', q: '지금 시장 심리는 공포와 탐욕 중 어디쯤인가?',
    body: '시장은 적정 지점에 머무르지 않고 공포와 탐욕 사이를 오갑니다. 극단일수록 반대편으로 돌아갈 힘이 큽니다.',
    apply: 'DCA는 진자 위치와 상관없이 돌아갑니다. 추가 매수 여력을 언제 쓸지는 진자를 보고 정합니다.',
    drill: 'second', src: 'Howard Marks, 『마켓 사이클의 법칙』(2018)' },
  { id: 'first', group: '시장', name: '제1원리', q: '이것을 이루는 근본 사실은 무엇인가?',
    body: '유추와 통념을 걷어내고 더 쪼갤 수 없는 사실까지 내려간 뒤 거기서 다시 쌓아 올립니다.',
    apply: '비트코인을 공급 고정, 네트워크 효과, 제도권 편입으로 분해하고, 어떤 근본이 무너지면 판단을 바꿀지 미리 정해 둡니다.',
    drill: 'first', src: 'Aristotle, 『형이상학』 / Farnam Street, First Principles' },
];

const PATCHES = [
  { id: 'premortem', name: '사전 부검', q: '1년 뒤 이 결정이 완전히 실패했다면, 이유는?',
    body: '결정하기 전에 실패를 가정하고 원인을 거꾸로 찾습니다. 과잉 확신과 집단 동조를 깨는 데 가장 효과적입니다.',
    apply: 'CEO 보고 전에 "이 보고가 깨진다면 어떤 질문 때문일까?"를 쓰면 예상 질문 대비가 자동으로 끝납니다.',
    drill: 'premortem', src: 'Gary Klein, 「Performing a Project Premortem」, HBR (2007)' },
  { id: 'journal', name: '의사결정 일지', q: '결과가 아니라 판단 과정이 좋았는가?',
    body: '상황, 선택지, 이유, 예상, 감정을 결정 당시에 적어 두고 나중에 결과와 비교합니다. 운과 실력을 분리하는 장치입니다.',
    apply: '좋은 결과가 늘 좋은 판단에서 나오지는 않습니다. 사분면(실력·행운·불운·교훈)으로 나눠 보면 내 판단의 진짜 실력이 보입니다.',
    drill: null, src: 'Annie Duke, 『Thinking in Bets』(2018)' },
  { id: 'inversion', name: '역발상', q: '어떻게 하면 확실히 망할까?',
    body: '성공 방법을 묻는 대신 실패 방법을 묻고 그것을 피합니다. 실패 목록이 곧 금지 원칙이 됩니다.',
    apply: '100억 목표를 망치는 법: 레버리지, 몰빵, 해킹으로 인한 자산 분실, 건강 악화. 이것이 그대로 금지 목록입니다.',
    drill: 'inversion', src: 'Charlie Munger, 「Invert, always invert」' },
];

const BUGS = [
  { id: 'confirm', name: '확증 편향', q: '반대 근거를 하나라도 찾아봤는가?', ex: '원하는 정보만 모읍니다. 강세 뉴스만 읽거나 내 방식이 맞다는 증거만 수집합니다.' },
  { id: 'experience', name: '경험의 함정', q: '과거와 지금의 조건이 정말 같은가?', ex: '지난번에 통한 공식을 그대로 반복합니다. 김포에서 통한 방식이 청주에서도 통한다는 보장은 없습니다.' },
  { id: 'loss', name: '손실 회피', q: '이미 쓴 비용 때문에 결정을 미루고 있지 않은가?', ex: '손실의 고통을 이익의 약 2배로 느낍니다. 손절을 못 하거나 실패한 프로젝트를 끝내지 못합니다.' },
  { id: 'fomo', name: 'FOMO·군중 심리', q: '남들이 하니까 서두르고 있지 않은가?', ex: '급등장에 추격 매수하거나 윗선이 좋아하는 의견에 동조합니다.' },
  { id: 'overconf', name: '과잉 확신', q: '확신도가 근거보다 높지 않은가?', ex: '일정과 예산을 낙관하고 레버리지를 키웁니다. 2025년 12월 선물 중단은 이 버그를 규칙으로 막은 사례입니다.' },
];

const AREAS = ['조직', '시장', '자산', '개인'];
const EMOTIONS = ['차분', '확신', '설렘', '불안', '조급', '피곤'];

const DRILLS = {
  premortem: { name: '사전 부검', tag: 'PATCH', short: '실패를 가정하고 원인을 거꾸로 찾기',
    lead: '결정을 내리기 전에, 1년 뒤 이 결정이 완전히 실패했다고 가정하고 원인을 적습니다.',
    fields: [
      { k: 'title', type: 'text', label: '검토할 결정·계획', ph: '예: 연말 VIP 행사 동선 변경안 CEO 보고' },
      { k: 'causes', type: 'list', label: '1년 뒤 완전히 실패했다. 이유는?', ph: '실패 원인', min: 3 },
      { k: 'guards', type: 'area', label: '지금 할 수 있는 예방책', ph: '원인별로 미리 막을 방법' },
    ] },
  inversion: { name: '역발상', tag: 'PATCH', short: '확실히 망하는 법을 적고 금지 원칙 만들기',
    lead: '"어떻게 성공할까?" 대신 "어떻게 하면 확실히 망할까?"를 묻습니다. 답이 곧 금지 목록입니다.',
    fields: [
      { k: 'title', type: 'text', label: '목표', ph: '예: 2030년 자산 10억' },
      { k: 'fails', type: 'list', label: '이 목표를 확실히 망치는 방법은?', ph: '망하는 방법', min: 3 },
      { k: 'rule', type: 'area', label: '그래서 지킬 원칙 한 줄', ph: '예: 어떤 경우에도 레버리지는 쓰지 않는다' },
    ] },
  second: { name: '2차적 사고', tag: 'MARKET', short: '뉴스 하나를 3차 효과까지 밀어붙이기',
    lead: '모두가 떠올리는 1차 효과에서 멈추지 말고 "그다음엔?"을 두 번 더 묻습니다.',
    fields: [
      { k: 'title', type: 'text', label: '사건·뉴스', ph: '예: 빅테크 3사 데이터센터 투자 확대 발표' },
      { k: 'first', type: 'area', label: '1차 효과 (모두가 하는 생각)', ph: '' },
      { k: 'second', type: 'area', label: '2차 효과', ph: '' },
      { k: 'third', type: 'area', label: '3차 효과', ph: '' },
      { k: 'pendulum', type: 'range', label: '지금 시장 심리', left: '공포', right: '탐욕' },
      { k: 'action', type: 'area', label: '내 행동과 지켜볼 신호', ph: '아직 가격에 반영되지 않은 것은?' },
    ] },
  incentive: { name: '인센티브 맵', tag: 'ORG', short: '참석자별 평가 지표와 예상 행동 그리기',
    lead: '회의나 협상 전에 참석자 각자가 무엇으로 평가받는지 적으면 반응이 예측됩니다.',
    fields: [
      { k: 'title', type: 'text', label: '회의·상황', ph: '예: 4분기 시설 개선 예산 협의' },
      { k: 'people', type: 'rows', label: '참석자별 인센티브', cols: ['사람·부서', '평가받는 지표', '예상 행동'], min: 2 },
      { k: 'insight', type: 'area', label: '그래서 어떻게 설득하고 설계할까', ph: '모두의 지표가 함께 오르는 안은?' },
    ] },
  first: { name: '제1원리 분해', tag: 'MARKET', short: '근본 사실과 철회 조건 정하기',
    lead: '통념을 걷어내고 더 쪼갤 수 없는 사실까지 내려갑니다. 그리고 어떤 사실이 무너지면 판단을 바꿀지 미리 정합니다.',
    fields: [
      { k: 'title', type: 'text', label: '대상 (자산·사업·문제)', ph: '예: 비트코인 장기 보유' },
      { k: 'facts', type: 'list', label: '근본 사실', ph: '더 쪼갤 수 없는 사실', min: 3 },
      { k: 'kill', type: 'list', label: '이것이 무너지면 판단을 바꾼다', ph: '철회 조건', min: 2 },
      { k: 'note', type: 'area', label: '메모', ph: '' },
    ] },
  process: { name: '지도 vs 영토', tag: 'ORG', short: '프로세스의 설계 의도와 실제 운영 비교',
    lead: '매주 회사 프로세스 하나를 골라 설계 의도와 실제 운영 사이의 틈을 찾습니다. 쌓이면 그대로 승진 포트폴리오가 됩니다.',
    fields: [
      { k: 'title', type: 'text', label: '프로세스', ph: '예: 협력사 야간 반입 승인 절차' },
      { k: 'design', type: 'area', label: '설계 의도 (지도)', ph: '이 프로세스는 원래 무엇을 위해 만들어졌나' },
      { k: 'real', type: 'area', label: '실제 운영 (영토)', ph: '현장에서는 실제로 어떻게 굴러가나' },
      { k: 'gap', type: 'area', label: '그 사이의 틈', ph: '' },
      { k: 'fix', type: 'area', label: '레버리지 포인트와 개선안', ph: '숫자보다 규칙·정보 흐름·목표를 바꿀 수 있는가' },
    ] },
};
const DRILL_ORDER = ['incentive', 'process', 'second', 'first', 'premortem', 'inversion'];

const MISSIONS = [
  { id: 'm1', t: '회사 결정 1건에 사전 부검', s: '영역을 조직으로 두고 사전 부검 1회', test: (d) => d.drills.some((x) => x.type === 'premortem' && x.area === '조직'), go: ['drill', 'premortem', '조직'] },
  { id: 'm2', t: '투자 판단 1건에 2차적 사고', s: '뉴스 하나를 3차 효과까지', test: (d) => d.drills.some((x) => x.type === 'second'), go: ['drill', 'second', '시장'] },
  { id: 'm3', t: '의사결정 일지 첫 기록', s: '상황·선택지·이유·예상·감정 5가지', test: (d) => d.decisions.length > 0, go: ['decision'] },
  { id: 'm4', t: '인센티브 맵 1회', s: '회의 하나의 참석자 지표 그리기', test: (d) => d.drills.some((x) => x.type === 'incentive'), go: ['drill', 'incentive', '조직'] },
  { id: 'm5', t: '지도 vs 영토 프로세스 분석 2건', s: '청주점 프로세스에서 틈 찾기', test: (d) => d.drills.filter((x) => x.type === 'process').length >= 2, go: ['drill', 'process', '조직'] },
  { id: 'm6', t: '결정 하나를 되돌아보기', s: '결과와 판단 과정을 나눠 평가', test: (d) => d.decisions.some((x) => x.review), go: ['tab', 'journal'] },
];

/* ---------- 저장 ---------- */
const KEY = 'brainhack-v1';
const fresh = () => ({ v: 1, start: dkey(), daily: {}, drills: [], decisions: [], ui: {} });
let S = load();
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return normalize(JSON.parse(raw));
  } catch (e) { /* 저장소를 못 쓰는 환경이면 새로 시작 */ }
  return fresh();
}
function normalize(d) {
  const f = fresh();
  if (!d || typeof d !== 'object') return f;
  return {
    v: 1,
    start: typeof d.start === 'string' ? d.start : f.start,
    daily: d.daily && typeof d.daily === 'object' ? d.daily : {},
    drills: Array.isArray(d.drills) ? d.drills : [],
    decisions: Array.isArray(d.decisions) ? d.decisions : [],
    ui: d.ui && typeof d.ui === 'object' ? d.ui : {},
  };
}
let storageWarned = false;
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {
    if (!storageWarned) { storageWarned = true; toast('이 기기에 저장하지 못했습니다. 설정에서 백업을 복사해 두세요.'); }
  }
}

/* ---------- 유틸 ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
function dkey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function parseKey(k) { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); }
const daysBetween = (a, b) => Math.round((parseKey(b) - parseKey(a)) / 86400000);
function addDays(k, n) { const d = parseKey(k); d.setDate(d.getDate() + n); return dkey(d); }
const WD = ['일', '월', '화', '수', '목', '금', '토'];
function fmt(k) { const d = parseKey(k); return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WD[d.getDay()]})`; }
function weekStart(k) { const d = parseKey(k); const off = (d.getDay() + 6) % 7; return addDays(k, -off); }
const has = (v) => (Array.isArray(v) ? v.some((x) => (typeof x === 'string' ? x.trim() : Object.values(x || {}).some((y) => String(y).trim()))) : String(v ?? '').trim() !== '');

const ICON = {
  today: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4"/></svg>',
  drills: '<svg viewBox="0 0 24 24"><path d="M5 7l4 5-4 5M12 17h7"/></svg>',
  journal: '<svg viewBox="0 0 24 24"><path d="M6 3h10l3 3v15H6z"/><path d="M9 9h7M9 13h7M9 17h4"/></svg>',
  models: '<svg viewBox="0 0 24 24"><circle cx="6" cy="6" r="2.2"/><circle cx="18" cy="7" r="2.2"/><circle cx="12" cy="17" r="2.2"/><path d="M8 7l8 0M7.2 7.9l3.7 7.3M16.9 8.9l-3.7 6.3"/></svg>',
  gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  plus: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  chev: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg>',
};

/* ---------- 계산 ---------- */
function activeDays() {
  const set = new Set();
  for (const [k, v] of Object.entries(S.daily)) if (has(v.incentive) || has(v.map)) set.add(k);
  S.drills.forEach((x) => set.add(x.date));
  S.decisions.forEach((x) => set.add(x.date));
  return set;
}
function streak() {
  const set = activeDays();
  let k = dkey();
  if (!set.has(k)) k = addDays(k, -1);
  let n = 0;
  while (set.has(k)) { n++; k = addDays(k, -1); }
  return n;
}
const programDay = () => daysBetween(S.start, dkey()) + 1;
function modelOfDay() { return MODELS[((daysBetween('2026-01-01', dkey()) % MODELS.length) + MODELS.length) % MODELS.length]; }
function quadrant(r) {
  if (!r) return null;
  if (r.process === 'good' && r.outcome === 'good') return 'skill';
  if (r.process === 'bad' && r.outcome === 'good') return 'luck';
  if (r.process === 'good' && r.outcome === 'bad') return 'unluck';
  return 'lesson';
}
const QUAD = {
  skill: { name: '실력', cls: 'good', desc: '좋은 판단, 좋은 결과' },
  luck: { name: '행운', cls: 'signal', desc: '나쁜 판단, 좋은 결과' },
  unluck: { name: '불운', cls: 'accent', desc: '좋은 판단, 나쁜 결과' },
  lesson: { name: '교훈', cls: 'bad', desc: '나쁜 판단, 나쁜 결과' },
};

/* ---------- 화면 뼈대 ---------- */
let tab = 'today';
const TABS = [['today', '오늘'], ['drills', '훈련'], ['journal', '결정 일지'], ['models', '모델']];
const TITLES = { today: '오늘의 훈련', drills: '훈련 도구', journal: '결정 일지', models: '사고 모델' };

function shell() {
  $('#app').innerHTML = `
    <header class="topbar" id="topbar">
      <div class="brand"><span class="mark">BRAIN_HACK</span><h1 id="title"></h1></div>
      <button class="icon-btn" data-act="settings" aria-label="설정">${ICON.gear}</button>
    </header>
    <main class="view" id="view"></main>
    <nav class="tabbar" aria-label="탭">
      ${TABS.map(([id, nm]) => `<button data-tab="${id}" class="${id === tab ? 'on' : ''}">${ICON[id]}<span>${nm}</span></button>`).join('')}
    </nav>
    <div class="scrim" id="scrim" hidden></div>
    <section class="sheet" id="sheet" role="dialog" aria-modal="true" hidden></section>
    <div class="toast" id="toast" role="status"></div>`;
  window.addEventListener('scroll', () => $('#topbar').classList.toggle('scrolled', window.scrollY > 4), { passive: true });
}

function render() {
  $('#title').textContent = TITLES[tab];
  $$('.tabbar button').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
  $('#view').innerHTML = VIEWS[tab]();
}

/* ---------- 오늘 ---------- */
const isStandalone = () => window.navigator.standalone === true || (window.matchMedia && matchMedia('(display-mode: standalone)').matches);
const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent);

function viewToday() {
  const today = dkey();
  const day = programDay();
  const set = activeDays();
  const st = streak();
  const m = modelOfDay();
  const daily = S.daily[today] || {};
  const done = MISSIONS.filter((x) => x.test(S)).length;
  const due = S.decisions.filter((x) => !x.review && x.reviewAt && x.reviewAt <= today);
  const ws = weekStart(today);
  const wk = (fn) => S.drills.filter((x) => x.date >= ws && fn(x)).length;
  const weekSecond = wk((x) => x.type === 'second');
  const weekProcess = wk((x) => x.type === 'process');
  const weekDecision = S.decisions.filter((x) => x.date >= ws).length;

  const cells = Array.from({ length: 30 }, (_, i) => {
    const k = addDays(S.start, i);
    return `<i class="${set.has(k) ? 'done' : ''} ${k === today ? 'today' : ''}" title="${fmt(k)}"></i>`;
  }).join('');

  const showInstall = isIOS() && !isStandalone() && !S.ui.hideInstall;

  return `
    ${showInstall ? `<div class="card install-hint">
      <div class="txt"><b>홈 화면에 추가하세요</b>Safari 공유 버튼 → 홈 화면에 추가. 앱처럼 전체 화면으로 열립니다.</div>
      <button class="btn ghost" data-act="install">방법</button>
    </div>` : ''}

    <section class="card program" aria-label="30일 설치 프로그램">
      <div class="row">
        <div>
          <div class="label">30일 설치 프로그램</div>
          <div class="dday num">${day > 30 ? '완료' : `D+${day}`}<small>${day > 30 ? `${day - 1}일 경과` : '/ 30'}</small></div>
        </div>
        <div class="streak"><div class="label">연속 훈련</div><b class="num">${st}일</b></div>
      </div>
      <div class="cells" aria-hidden="true">${cells}</div>
      <div class="muted" style="font-size:13px">미션 ${done}/${MISSIONS.length} 완료 · 시작일 ${fmt(S.start)}</div>
      ${day > 30 ? '<button class="btn ghost block" data-act="restart">다음 30일 시작하기</button>' : ''}
    </section>

    <section class="card model-today">
      <div class="label">오늘의 모델 · ${esc(m.group)} · ${esc(m.name)}</div>
      <p class="q">${esc(m.q)}</p>
      <p>${esc(m.apply)}</p>
      <button class="btn" data-act="drill" data-type="${m.drill}" data-area="${m.group}">이 모델로 훈련하기</button>
    </section>

    ${due.length ? `<div class="section-title"><h2>되돌아볼 결정</h2><span class="label">${due.length}건</span></div>
      <div class="stack">${due.map(decisionItem).join('')}</div>` : ''}

    <div class="section-title"><h2>매일 루틴</h2><span class="label">${fmt(today)}</span></div>
    <section class="card ritual">
      <div class="when"><span class="dot"></span><span class="label">출근길 5분</span></div>
      <h2>인센티브 스캔</h2>
      <p class="muted" style="font-size:14px;margin-bottom:8px">오늘 회의 참석자들은 각자 무엇으로 평가받는가?</p>
      <textarea id="r-incentive" data-daily="incentive" placeholder="예: 영업팀장은 이번 달 매출 목표 미달. 행사 예산 증액안에 찬성할 가능성이 높다.">${esc(daily.incentive)}</textarea>
      <div class="saved" id="s-incentive"></div>
    </section>
    <section class="card ritual">
      <div class="when night"><span class="dot"></span><span class="label">퇴근 전 3분</span></div>
      <h2>지도와 영토</h2>
      <p class="muted" style="font-size:14px;margin-bottom:8px">오늘 보고서와 현장이 달랐던 장면 한 줄.</p>
      <textarea id="r-map" data-daily="map" placeholder="예: 동선 도면상 하역장은 B2 한 곳이지만, 실제 오후 피크엔 B1 임시 하역이 상시화돼 있다.">${esc(daily.map)}</textarea>
      <div class="saved" id="s-map"></div>
    </section>

    <div class="section-title"><h2>이번 주</h2><span class="label">${fmt(ws)}부터</span></div>
    <section class="card">
      ${weekRow('2차적 사고 훈련', '투자 뉴스 하나를 3차 효과까지', weekSecond, 1, ['second', '시장'])}
      ${weekRow('지도 vs 영토', '회사 프로세스 하나 분석', weekProcess, 1, ['process', '조직'])}
      ${weekRow('결정 일지', '중요한 결정 하나 기록', weekDecision, 1, null)}
    </section>

    <div class="section-title"><h2>30일 미션</h2><span class="label">${done}/${MISSIONS.length}</span></div>
    <section class="card">
      ${MISSIONS.map((x) => {
        const on = x.test(S);
        return `<div class="mission ${on ? 'on' : ''}">
          <span class="check ${on ? 'on' : ''}">${on ? ICON.check : ''}</span>
          <div><div class="t">${esc(x.t)}</div><div class="s">${esc(x.s)}</div></div>
          ${on ? '' : `<button class="go" data-act="mission" data-id="${x.id}">시작</button>`}
        </div>`;
      }).join('')}
    </section>`;
}
function weekRow(t, s, n, goal, go) {
  const on = n >= goal;
  return `<div class="mission ${on ? 'on' : ''}">
    <span class="check ${on ? 'on' : ''}">${on ? ICON.check : ''}</span>
    <div><div class="t">${esc(t)} <span class="faint num" style="font-size:13px">${n}회</span></div><div class="s">${esc(s)}</div></div>
    ${on ? '' : go ? `<button class="go" data-act="drill" data-type="${go[0]}" data-area="${go[1]}">시작</button>` : '<button class="go" data-act="decision">기록</button>'}
  </div>`;
}

/* ---------- 훈련 ---------- */
let drillFilter = '전체';
function viewDrills() {
  const list = S.drills.filter((x) => drillFilter === '전체' || x.area === drillFilter).slice().sort((a, b) => (b.created || 0) - (a.created || 0));
  return `
    <div class="tools">
      ${DRILL_ORDER.map((id) => {
        const d = DRILLS[id];
        const n = S.drills.filter((x) => x.type === id).length;
        return `<button class="tool" data-act="drill" data-type="${id}">
          <span class="label">${d.tag}</span><b>${esc(d.name)}</b><span>${esc(d.short)}</span>
          <span class="cnt">${n ? `${n}회 기록` : '아직 없음'}</span></button>`;
      }).join('')}
    </div>
    <div class="section-title"><h2>훈련 기록</h2><span class="label">${S.drills.length}건</span></div>
    <div class="seg" role="tablist">
      ${['전체', ...AREAS].map((a) => `<button class="${a === drillFilter ? 'on' : ''}" data-act="dfilter" data-v="${a}">${a}</button>`).join('')}
    </div>
    ${list.length ? `<div class="stack">${list.map(drillItem).join('')}</div>` : `<div class="empty">
      <b>${drillFilter === '전체' ? '아직 훈련 기록이 없습니다' : `${drillFilter} 영역 기록이 없습니다`}</b>
      <span style="font-size:14px">위 도구 중 하나를 골라 첫 훈련을 시작하세요. 인센티브 맵이 가장 빠릅니다.</span>
      <button class="btn" data-act="drill" data-type="incentive" data-area="조직">인센티브 맵 시작</button>
    </div>`}`;
}
function drillItem(x) {
  const d = DRILLS[x.type];
  if (!d) return '';
  const firstArea = d.fields.find((f) => f.type === 'area' && has(x.data[f.k]));
  const firstList = d.fields.find((f) => (f.type === 'list' || f.type === 'rows') && has(x.data[f.k]));
  let sub = '';
  if (firstList) {
    const v = x.data[firstList.k];
    sub = firstList.type === 'rows' ? v.filter((r) => has([r])).map((r) => r[0]).filter(Boolean).join(', ') : v.filter((s) => s.trim()).join(' · ');
  } else if (firstArea) sub = x.data[firstArea.k];
  return `<button class="entry" data-act="drillview" data-id="${x.id}">
    <div class="top"><span class="chips"><span class="chip accent">${esc(d.name)}</span><span class="chip">${esc(x.area)}</span></span><span class="faint num" style="font-size:12px">${esc(fmt(x.date))}</span></div>
    <div class="title">${esc(x.data.title || '제목 없음')}</div>
    ${sub ? `<div class="sub">${esc(sub)}</div>` : ''}
  </button>`;
}

/* ---------- 결정 일지 ---------- */
function viewJournal() {
  const all = S.decisions.slice().sort((a, b) => (b.created || 0) - (a.created || 0));
  const reviewed = all.filter((x) => x.review);
  const q = { skill: 0, luck: 0, unluck: 0, lesson: 0 };
  reviewed.forEach((x) => { q[quadrant(x.review)]++; });
  const bugCount = BUGS.map((b) => ({ ...b, n: all.filter((x) => (x.bugs || []).includes(b.id)).length }));
  const maxBug = Math.max(1, ...bugCount.map((b) => b.n));
  const top = bugCount.slice().sort((a, b) => b.n - a.n)[0];
  const confAvg = reviewed.length ? Math.round(reviewed.reduce((s, x) => s + (x.confidence || 0), 0) / reviewed.length) : null;
  const hitRate = reviewed.length ? Math.round((reviewed.filter((x) => x.review.outcome === 'good').length / reviewed.length) * 100) : null;

  return `
    <button class="btn block" data-act="decision">${ICON.plus}새 결정 기록</button>

    <section class="card">
      <div class="card-head"><h2>판단 실력 사분면</h2><span class="label">되돌아본 ${reviewed.length}건</span></div>
      <div class="quad">
        <span></span><span class="ax">결과 좋음</span><span class="ax">결과 나쁨</span>
        <span class="ax">판단<br>좋음</span>
        <div class="cell skill"><b class="num">${q.skill}</b><span>실력</span><em>반복할 패턴</em></div>
        <div class="cell unluck"><b class="num">${q.unluck}</b><span>불운</span><em>판단은 유지</em></div>
        <span class="ax">판단<br>나쁨</span>
        <div class="cell luck"><b class="num">${q.luck}</b><span>행운</span><em>가장 위험한 칸</em></div>
        <div class="cell lesson"><b class="num">${q.lesson}</b><span>교훈</span><em>버그 패치 대상</em></div>
      </div>
      ${reviewed.length ? `<div class="insight">기록 당시 평균 확신도 <b class="num">${confAvg}%</b>, 실제로 결과가 좋았던 비율 <b class="num">${hitRate}%</b>.
        ${confAvg - hitRate >= 15 ? ' 확신이 결과보다 높습니다. 과잉 확신 버그를 점검하세요.' : hitRate - confAvg >= 15 ? ' 결과가 확신보다 좋습니다. 판단을 조금 더 믿어도 됩니다.' : ' 확신과 결과가 비슷하게 맞습니다.'}</div>`
        : '<div class="insight">결정을 기록하고 되돌아보기를 마치면 칸이 채워집니다. "행운" 칸이 늘면 결과에 속고 있다는 신호입니다.</div>'}
    </section>

    <section class="card">
      <div class="card-head"><h2>자주 나타난 버그</h2><span class="label">결정 ${all.length}건</span></div>
      <div class="bars">
        ${bugCount.map((b) => `<div class="bar"><span>${esc(b.name)}</span><span class="track"><span class="fill" style="width:${(b.n / maxBug) * 100}%"></span></span><span class="n">${b.n}</span></div>`).join('')}
      </div>
      ${top && top.n ? `<div class="insight">가장 자주 체크된 버그는 <b>${esc(top.name)}</b>입니다. 다음 결정 전에 먼저 물으세요: ${esc(top.q)}</div>` : ''}
    </section>

    <div class="section-title"><h2>기록</h2><span class="label">${all.length}건</span></div>
    ${all.length ? `<div class="stack">${all.map(decisionItem).join('')}</div>` : `<div class="empty">
      <b>첫 결정을 기록하세요</b>
      <span style="font-size:14px">이번 주에 내린 결정 하나면 충분합니다. 매수, 보고 방향, 인사 판단 무엇이든 됩니다.</span>
    </div>`}`;
}
function decisionItem(x) {
  const today = dkey();
  let st;
  if (x.review) { const q = QUAD[quadrant(x.review)]; st = `<span class="chip ${q.cls}">${q.name}</span>`; }
  else if (x.reviewAt && x.reviewAt <= today) st = '<span class="chip signal">되돌아볼 때</span>';
  else if (x.reviewAt) st = `<span class="chip">D-${daysBetween(today, x.reviewAt)}</span>`;
  else st = '';
  const due = !x.review && x.reviewAt && x.reviewAt <= today;
  return `<button class="entry ${due ? 'due' : ''}" data-act="decisionview" data-id="${x.id}">
    <div class="top"><span class="chips"><span class="chip">${esc(x.area)}</span>${st}</span><span class="faint num" style="font-size:12px">${esc(fmt(x.date))}</span></div>
    <div class="title">${esc(x.title || '제목 없음')}</div>
    ${x.expect ? `<div class="sub">예상: ${esc(x.expect)}</div>` : ''}
  </button>`;
}

/* ---------- 모델 ---------- */
function viewModels() {
  const block = (arr, cls, start) => arr.map((m, i) => `
    <details class="model ${cls}">
      <summary><span class="idx">${String(start + i).padStart(2, '0')}</span>
        <span><div class="nm">${esc(m.name)}</div><div class="qq">${esc(m.q)}</div></span>
        <span class="chev">${ICON.chev}</span></summary>
      <div class="body">
        <p>${esc(m.body || m.ex)}</p>
        ${m.apply ? `<div class="apply"><span class="label">대표님 적용</span>${esc(m.apply)}</div>` : `<div class="apply"><span class="label">결정 전 질문</span>${esc(m.q)}</div>`}
        ${m.src ? `<div class="src">${esc(m.src)}</div>` : ''}
        ${m.drill ? `<button class="btn ghost" data-act="drill" data-type="${m.drill}" data-area="${m.group || '조직'}">${esc(DRILLS[m.drill].name)}로 훈련</button>`
          : m.id === 'journal' ? '<button class="btn ghost" data-act="decision">결정 기록하기</button>' : ''}
      </div>
    </details>`).join('');
  return `
    <p class="muted" style="font-size:14px;padding:0 2px">도구가 많으면 분석만 하다 실행을 못 합니다. 조직용 하나(인센티브 구조), 시장용 하나(2차적 사고)부터 몸에 익히세요.</p>
    <div class="section-title"><h2>조직을 읽는 모델</h2></div>
    <div class="stack">${block(MODELS.filter((m) => m.group === '조직'), '', 1)}</div>
    <div class="section-title"><h2>시장을 읽는 모델</h2></div>
    <div class="stack">${block(MODELS.filter((m) => m.group === '시장'), '', 4)}</div>
    <div class="section-title"><h2>버그를 막는 방어 도구</h2></div>
    <div class="stack">${block(PATCHES, '', 7)}</div>
    <div class="section-title"><h2>뇌의 버그 5가지</h2></div>
    <div class="stack">${block(BUGS, 'bug', 10)}</div>
    <p class="faint" style="font-size:12px;padding:4px 2px">근거: Daniel Kahneman, 『생각에 관한 생각』(2011) · Farnam Street Mental Models</p>`;
}

const VIEWS = { today: viewToday, drills: viewDrills, journal: viewJournal, models: viewModels };

/* ---------- 시트 ---------- */
let sheetSubmit = null;
function openSheet(title, body, onSubmit) {
  const sh = $('#sheet'); const sc = $('#scrim');
  sh.innerHTML = `<div class="sheet-head"><h2>${esc(title)}</h2><button class="icon-btn" data-act="close" aria-label="닫기">${ICON.close}</button></div>
    <form class="sheet-body" id="sheetform" novalidate>${body}</form>`;
  sheetSubmit = onSubmit || null;
  sh.hidden = false; sc.hidden = false;
  document.body.style.overflow = 'hidden';
  requestAnimationFrame(() => { sh.classList.add('on'); sc.classList.add('on'); });
  $('#sheetform').scrollTop = 0;
}
function closeSheet() {
  const sh = $('#sheet'); const sc = $('#scrim');
  sh.classList.remove('on'); sc.classList.remove('on');
  document.body.style.overflow = '';
  setTimeout(() => { if (!sh.classList.contains('on')) { sh.hidden = true; sc.hidden = true; sh.innerHTML = ''; } }, 260);
  sheetSubmit = null;
}
function confirmSheet(title, msg, okLabel, onOk) {
  openSheet(title, `<p class="muted">${esc(msg)}</p>
    <div class="btn-row"><button type="button" class="btn ghost" data-act="close">취소</button><button type="submit" class="btn danger">${esc(okLabel)}</button></div>`, () => { onOk(); });
}

/* ---------- 폼 렌더링 ---------- */
function fieldHTML(f, val) {
  const id = `f-${f.k}`;
  if (f.type === 'text') return `<div class="field"><label for="${id}">${esc(f.label)}</label><input type="text" id="${id}" value="${esc(val || '')}" placeholder="${esc(f.ph || '')}" autocomplete="off"></div>`;
  if (f.type === 'area') return `<div class="field"><label for="${id}">${esc(f.label)}</label><textarea id="${id}" placeholder="${esc(f.ph || '')}">${esc(val || '')}</textarea></div>`;
  if (f.type === 'range') {
    const v = Number.isFinite(+val) && val !== '' && val != null ? +val : 50;
    return `<div class="field"><span class="flabel">${esc(f.label)}</span><div class="range">
      <input type="range" id="${id}" min="0" max="100" step="5" value="${v}" aria-label="${esc(f.label)}">
      <div class="ends"><span>${esc(f.left)}</span><span class="val" id="${id}-v">${v}</span><span>${esc(f.right)}</span></div></div></div>`;
  }
  if (f.type === 'list') {
    const items = Array.isArray(val) && val.length ? val : Array(f.min || 3).fill('');
    return `<div class="field"><span class="flabel">${esc(f.label)}</span><div class="list-in" id="${id}">
      ${items.map((s, i) => listRow(f, s, i)).join('')}</div>
      <button type="button" class="add" data-act="addli" data-k="${f.k}">+ 한 줄 추가</button></div>`;
  }
  if (f.type === 'rows') {
    const rows = Array.isArray(val) && val.length ? val : Array.from({ length: f.min || 2 }, () => ['', '', '']);
    return `<div class="field"><span class="flabel">${esc(f.label)}</span><div class="rows-in" id="${id}">
      ${rows.map((r) => rowRow(f, r)).join('')}</div>
      <button type="button" class="add" data-act="addrow" data-k="${f.k}">+ 사람 추가</button></div>`;
  }
  return '';
}
const listRow = (f, s, i) => `<div class="li"><span class="n">${i + 1}</span><input type="text" value="${esc(s)}" placeholder="${esc(f.ph || '')}" aria-label="${esc(f.label)} ${i + 1}"></div>`;
const rowRow = (f, r) => `<div class="rw">${f.cols.map((c, j) => `<input type="text" value="${esc(r[j] || '')}" placeholder="${esc(c)}" aria-label="${esc(c)}">`).join('')}</div>`;
function readField(f) {
  const el = $(`#f-${f.k}`);
  if (!el) return '';
  if (f.type === 'text' || f.type === 'area') return el.value.trim();
  if (f.type === 'range') return +el.value;
  if (f.type === 'list') return $$('input', el).map((i) => i.value.trim()).filter(Boolean);
  if (f.type === 'rows') return $$('.rw', el).map((rw) => $$('input', rw).map((i) => i.value.trim())).filter((r) => r.some(Boolean));
  return '';
}
const segHTML = (id, opts, cur) => `<div class="seg" id="${id}" role="radiogroup">${opts.map((o) => `<button type="button" role="radio" aria-checked="${o === cur}" class="${o === cur ? 'on' : ''}" data-act="seg" data-v="${esc(o)}">${esc(o)}</button>`).join('')}</div>`;
const segVal = (id) => { const b = $(`#${id} button.on`); return b ? b.dataset.v : ''; };

/* ---------- 훈련 폼/상세 ---------- */
function openDrill(type, area, existing) {
  const d = DRILLS[type];
  if (!d) return;
  const data = existing ? existing.data : {};
  const ar = existing ? existing.area : area || '조직';
  openSheet(existing ? `${d.name} 수정` : d.name, `
    <p class="lead">${esc(d.lead)}</p>
    <div class="field"><span class="flabel">영역</span>${segHTML('f-area', AREAS, ar)}</div>
    ${d.fields.map((f) => fieldHTML(f, data[f.k])).join('')}
    <button type="submit" class="btn block">${existing ? '수정 저장' : '훈련 기록 저장'}</button>`, () => {
    const out = {};
    d.fields.forEach((f) => { out[f.k] = readField(f); });
    if (!out.title) { toast(`${d.fields[0].label}을(를) 적어 주세요.`); $('#f-title').focus(); return false; }
    if (existing) { existing.data = out; existing.area = segVal('f-area') || ar; existing.updated = Date.now(); }
    else S.drills.push({ id: uid(), type, area: segVal('f-area') || ar, date: dkey(), created: Date.now(), data: out });
    save(); render(); toast(existing ? '수정했습니다.' : `${d.name} 기록을 저장했습니다.`);
    if (existing) setTimeout(() => viewDrill(existing.id), 280);
  });
}
function valueHTML(f, v) {
  if (!has(v) && f.type !== 'range') return '';
  let inner;
  if (f.type === 'list') inner = `<${f.k === 'fails' ? 'ul class="never"' : 'ol'}>${v.map((s) => `<li>${esc(s)}</li>`).join('')}</${f.k === 'fails' ? 'ul' : 'ol'}>`;
  else if (f.type === 'rows') inner = `<div class="mini-wrap"><table class="mini"><thead><tr>${f.cols.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead>
    <tbody>${v.map((r) => `<tr>${f.cols.map((_, j) => `<td>${esc(r[j] || '')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  else if (f.type === 'range') {
    if (v === '' || v == null) return '';
    inner = `<div class="gauge"><i style="left:${+v}%"></i></div><div class="range"><div class="ends"><span>${esc(f.left)}</span><span class="val">${+v}</span><span>${esc(f.right)}</span></div></div>`;
  } else inner = `<div class="v">${esc(v)}</div>`;
  return `<div class="kv"><span class="label">${esc(f.label)}</span>${inner}</div>`;
}
function viewDrill(id) {
  const x = S.drills.find((y) => y.id === id);
  if (!x) return;
  const d = DRILLS[x.type];
  openSheet(d.name, `
    <div class="chips"><span class="chip accent">${esc(d.name)}</span><span class="chip">${esc(x.area)}</span><span class="chip">${esc(fmt(x.date))}</span></div>
    <h2 style="font-size:20px;margin-top:-4px">${esc(x.data.title)}</h2>
    ${d.fields.filter((f) => f.k !== 'title').map((f) => valueHTML(f, x.data[f.k])).join('')}
    <div class="divider"></div>
    <div class="btn-row"><button type="button" class="btn ghost" data-act="drilledit" data-id="${x.id}">수정</button>
    <button type="button" class="btn danger" data-act="drilldel" data-id="${x.id}">삭제</button></div>`);
}

/* ---------- 결정 폼/상세/리뷰 ---------- */
function openDecision(existing) {
  const x = existing || {};
  const reviewAt = x.reviewAt || addDays(dkey(), 30);
  openSheet(existing ? '결정 수정' : '새 결정 기록', `
    <p class="lead">결과가 나오기 전, 지금 이 순간의 판단을 그대로 남깁니다. 나중에 결과와 과정을 따로 평가합니다.</p>
    <div class="field"><label for="d-title">무엇을 결정했나</label><input type="text" id="d-title" value="${esc(x.title || '')}" placeholder="예: BTC 이번 달 DCA 금액 유지" autocomplete="off"></div>
    <div class="field"><span class="flabel">영역</span>${segHTML('d-area', AREAS, x.area || '시장')}</div>
    <div class="field"><label for="d-context">① 상황</label><textarea id="d-context" placeholder="지금 무슨 일이 있고, 무엇을 알고 있나">${esc(x.context || '')}</textarea></div>
    <div class="field"><label for="d-options">② 선택지</label><textarea id="d-options" placeholder="고려한 대안들 (하지 않는 것도 선택지)">${esc(x.options || '')}</textarea></div>
    <div class="field"><label for="d-reason">③ 선택 이유</label><textarea id="d-reason" placeholder="왜 이걸 골랐나">${esc(x.reason || '')}</textarea></div>
    <div class="field"><label for="d-expect">④ 예상 결과</label><textarea id="d-expect" placeholder="언제, 무엇이, 어떻게 될 것이라 보나">${esc(x.expect || '')}</textarea></div>
    <div class="field"><span class="flabel">⑤ 지금 감정 상태</span>${segHTML('d-emotion', EMOTIONS, x.emotion || '')}</div>
    <div class="field"><span class="flabel">확신도</span><div class="range">
      <input type="range" id="d-conf" min="50" max="100" step="5" value="${x.confidence || 70}" aria-label="확신도">
      <div class="ends"><span>반반</span><span class="val" id="d-conf-v">${x.confidence || 70}%</span><span>확실</span></div></div></div>
    <div class="field"><span class="flabel">버그 점검</span><p class="hint">지금 작동 중일 수 있는 버그에 체크하세요. 솔직할수록 나중에 패턴이 보입니다.</p>
      <div class="bugcheck">${BUGS.map((b) => `<label><input type="checkbox" value="${b.id}" ${(x.bugs || []).includes(b.id) ? 'checked' : ''}><span><b>${esc(b.name)}</b><span>${esc(b.q)}</span></span></label>`).join('')}</div></div>
    <div class="field"><label for="d-review">되돌아볼 날짜</label><input type="date" id="d-review" value="${esc(reviewAt)}"></div>
    <button type="submit" class="btn block">${existing ? '수정 저장' : '결정 기록 저장'}</button>`, () => {
    const out = {
      title: $('#d-title').value.trim(), area: segVal('d-area') || '시장',
      context: $('#d-context').value.trim(), options: $('#d-options').value.trim(), reason: $('#d-reason').value.trim(),
      expect: $('#d-expect').value.trim(), emotion: segVal('d-emotion'), confidence: +$('#d-conf').value,
      bugs: $$('.bugcheck input:checked').map((i) => i.value), reviewAt: $('#d-review').value || '',
    };
    if (!out.title) { toast('무엇을 결정했는지 적어 주세요.'); $('#d-title').focus(); return false; }
    if (existing) Object.assign(existing, out, { updated: Date.now() });
    else S.decisions.push({ id: uid(), date: dkey(), created: Date.now(), ...out });
    save(); render(); toast(existing ? '수정했습니다.' : `저장했습니다. ${out.reviewAt ? fmt(out.reviewAt) + '에 되돌아봅니다.' : ''}`);
    if (existing) setTimeout(() => viewDecision(existing.id), 280);
  });
}
function viewDecision(id) {
  const x = S.decisions.find((y) => y.id === id);
  if (!x) return;
  const today = dkey();
  const kv = (l, v) => (has(v) ? `<div class="kv"><span class="label">${l}</span><div class="v">${esc(v)}</div></div>` : '');
  const bugs = (x.bugs || []).map((b) => BUGS.find((y) => y.id === b)).filter(Boolean);
  let rv = '';
  if (x.review) {
    const q = QUAD[quadrant(x.review)];
    rv = `<div class="verdict" style="background:var(--${q.cls}-soft);color:var(--${q.cls})"><span class="label" style="color:inherit">되돌아본 결과 · ${esc(fmt(x.review.date))}</span><b>${q.name}</b><span>${q.desc}</span></div>
      ${kv('실제 결과', x.review.result)}${kv('배운 점', x.review.lesson)}`;
  } else {
    rv = `<button type="button" class="btn block ${x.reviewAt && x.reviewAt > today ? 'ghost' : ''}" data-act="review" data-id="${x.id}">지금 되돌아보기</button>
      ${x.reviewAt && x.reviewAt > today ? `<p class="faint" style="font-size:13px;text-align:center;margin-top:-8px">예정일 ${esc(fmt(x.reviewAt))} · D-${daysBetween(today, x.reviewAt)}</p>` : ''}`;
  }
  openSheet('결정 일지', `
    <div class="chips"><span class="chip">${esc(x.area)}</span><span class="chip">${esc(fmt(x.date))}</span>${x.emotion ? `<span class="chip">감정 ${esc(x.emotion)}</span>` : ''}<span class="chip accent num">확신 ${x.confidence}%</span></div>
    <h2 style="font-size:20px;margin-top:-4px">${esc(x.title)}</h2>
    ${kv('① 상황', x.context)}${kv('② 선택지', x.options)}${kv('③ 선택 이유', x.reason)}${kv('④ 예상 결과', x.expect)}
    ${bugs.length ? `<div class="kv"><span class="label">체크한 버그</span><div class="chips">${bugs.map((b) => `<span class="chip bad">${esc(b.name)}</span>`).join('')}</div></div>` : ''}
    <div class="divider"></div>
    ${rv}
    <div class="btn-row"><button type="button" class="btn ghost" data-act="decisionedit" data-id="${x.id}">수정</button>
    <button type="button" class="btn danger" data-act="decisiondel" data-id="${x.id}">삭제</button></div>`);
}
function openReview(id) {
  const x = S.decisions.find((y) => y.id === id);
  if (!x) return;
  openSheet('되돌아보기', `
    <p class="lead">결과와 판단 과정을 따로 평가합니다. 결과가 좋았어도 과정이 나빴다면 "나쁨"을 고르세요.</p>
    <div class="kv"><span class="label">당시 예상 · 확신 ${x.confidence}%</span><div class="v">${esc(x.expect || '기록 없음')}</div></div>
    <div class="field"><label for="v-result">실제로 어떻게 됐나</label><textarea id="v-result"></textarea></div>
    <div class="field"><span class="flabel">결과</span>${segHTML('v-outcome', ['좋음', '나쁨'], '')}</div>
    <div class="field"><span class="flabel">판단 과정</span><p class="hint">당시 가진 정보로 합리적이었나? 버그에 휘둘리지 않았나?</p>${segHTML('v-process', ['좋음', '나쁨'], '')}</div>
    <div class="field"><label for="v-lesson">배운 점과 다음 규칙</label><textarea id="v-lesson" placeholder="다음에 같은 상황이면 무엇을 다르게 할까"></textarea></div>
    <button type="submit" class="btn block">평가 저장</button>`, () => {
    const o = segVal('v-outcome'); const p = segVal('v-process');
    if (!o || !p) { toast('결과와 판단 과정을 모두 골라 주세요.'); return false; }
    x.review = { date: dkey(), result: $('#v-result').value.trim(), lesson: $('#v-lesson').value.trim(), outcome: o === '좋음' ? 'good' : 'bad', process: p === '좋음' ? 'good' : 'bad' };
    save(); render();
    const q = QUAD[quadrant(x.review)];
    toast(`${q.name}: ${q.desc}`);
    setTimeout(() => viewDecision(x.id), 280);
  });
}

/* ---------- 설정 ---------- */
function openSettings() {
  const n = S.drills.length + S.decisions.length + Object.keys(S.daily).length;
  openSheet('설정', `
    <section class="card stack">
      <h2>30일 프로그램</h2>
      <p class="muted" style="font-size:14px">시작일 ${esc(fmt(S.start))} · 오늘 D+${programDay()}. 다시 시작해도 기록은 지워지지 않습니다.</p>
      <button type="button" class="btn ghost" data-act="restart">오늘부터 다시 시작</button>
    </section>
    <section class="card stack">
      <h2>백업</h2>
      <p class="muted" style="font-size:14px">기록은 이 기기에만 저장됩니다. 한 달에 한 번 백업을 권합니다. 현재 기록 ${n}건.</p>
      <div class="btn-row"><button type="button" class="btn ghost" data-act="export">파일로 저장</button><button type="button" class="btn ghost" data-act="copy">백업 복사</button></div>
      <label class="btn ghost" for="import-file" style="cursor:pointer">백업 파일 불러오기</label>
      <input type="file" id="import-file" accept="application/json,.json" hidden>
      <textarea class="paste" id="import-text" placeholder="복사해 둔 백업을 여기에 붙여넣기"></textarea>
      <button type="button" class="btn ghost" data-act="importtext">붙여넣은 백업 불러오기</button>
    </section>
    <section class="card stack">
      <h2>홈 화면 설치</h2>
      <p class="muted" style="font-size:14px">${isStandalone() ? '이미 앱으로 실행 중입니다.' : 'Safari에서 홈 화면에 추가하면 앱처럼 전체 화면으로 열립니다.'}</p>
      <button type="button" class="btn ghost" data-act="install">설치 방법 보기</button>
    </section>
    <button type="button" class="btn danger block" data-act="wipe">모든 기록 삭제</button>
    <p class="faint" style="font-size:12px;text-align:center">브레인핵 v1 · 서버 없이 이 기기에서만 동작합니다</p>`);
}
function openInstall() {
  S.ui.hideInstall = true; save(); render();
  openSheet('홈 화면에 추가', `
    <section class="card stack"><h2>iPhone</h2><ol class="steps">
      <li><b>Safari</b>에서 이 페이지를 엽니다. 카카오톡 안에서 열었다면 오른쪽 아래 메뉴에서 Safari로 다시 엽니다.</li>
      <li>아래쪽 <b>공유</b> 버튼(사각형에서 화살표가 나오는 모양)을 누릅니다.</li>
      <li>목록을 내려 <b>홈 화면에 추가</b> → 오른쪽 위 <b>추가</b>.</li>
      <li>홈 화면의 <b>브레인핵</b> 아이콘으로 실행하면 전체 화면 앱으로 열립니다.</li></ol></section>
    <section class="card stack"><h2>꼭 알아두세요</h2>
      <p class="muted" style="font-size:14px">Safari에서 쓴 기록과 홈 화면 앱의 기록은 저장 공간이 따로입니다. 먼저 홈 화면에 추가한 뒤 그 앱에서 기록을 시작하세요. 이미 Safari에서 썼다면 설정 → 백업 복사 후 앱에서 붙여넣으면 됩니다.</p></section>`);
}
function backupJSON() { return JSON.stringify({ app: 'brainhack', exported: new Date().toISOString(), ...S }, null, 1); }
function importData(text) {
  let d;
  try { d = JSON.parse(text); } catch (e) { toast('백업 형식이 아닙니다. 내보낸 내용 전체를 붙여넣어 주세요.'); return; }
  if (!d || d.app !== 'brainhack') { toast('브레인핵 백업이 아닙니다.'); return; }
  const next = normalize(d);
  confirmSheet('백업 불러오기', `훈련 ${next.drills.length}건, 결정 ${next.decisions.length}건으로 지금 기록을 바꿉니다. 지금 기록은 사라집니다.`, '불러오기', () => {
    S = next; save(); render(); toast('백업을 불러왔습니다.');
  });
}

/* ---------- 이벤트 ---------- */
let toastTimer;
function toast(msg) {
  const t = $('#toast'); if (!t) return;
  t.textContent = msg; t.classList.add('on');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('on'), 2400);
}

function go(target) {
  if (target[0] === 'drill') openDrill(target[1], target[2]);
  else if (target[0] === 'decision') openDecision();
  else if (target[0] === 'tab') { tab = target[1]; render(); window.scrollTo(0, 0); }
}

document.addEventListener('click', (e) => {
  const tb = e.target.closest('.tabbar button');
  if (tb) { tab = tb.dataset.tab; render(); window.scrollTo(0, 0); return; }
  if (e.target.id === 'scrim') { closeSheet(); return; }
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const { act, id } = el.dataset;
  switch (act) {
    case 'close': closeSheet(); break;
    case 'settings': openSettings(); break;
    case 'install': closeSheet(); setTimeout(openInstall, $('#sheet').hidden ? 0 : 270); break;
    case 'drill': {
      const open = () => openDrill(el.dataset.type, el.dataset.area);
      if (!$('#sheet').hidden) { closeSheet(); setTimeout(open, 270); } else open();
      break;
    }
    case 'decision': {
      if (!$('#sheet').hidden) { closeSheet(); setTimeout(() => openDecision(), 270); } else openDecision();
      break;
    }
    case 'mission': go(MISSIONS.find((m) => m.id === id).go); break;
    case 'dfilter': drillFilter = el.dataset.v; render(); break;
    case 'drillview': viewDrill(id); break;
    case 'drilledit': { const x = S.drills.find((y) => y.id === id); closeSheet(); setTimeout(() => openDrill(x.type, x.area, x), 270); break; }
    case 'drilldel': confirmSheet('훈련 기록 삭제', '이 훈련 기록을 삭제합니다. 되돌릴 수 없습니다.', '삭제', () => {
      S.drills = S.drills.filter((y) => y.id !== id); save(); render(); toast('삭제했습니다.');
    }); break;
    case 'decisionview': viewDecision(id); break;
    case 'decisionedit': { const x = S.decisions.find((y) => y.id === id); closeSheet(); setTimeout(() => openDecision(x), 270); break; }
    case 'decisiondel': confirmSheet('결정 기록 삭제', '이 결정 기록과 되돌아본 내용을 삭제합니다. 되돌릴 수 없습니다.', '삭제', () => {
      S.decisions = S.decisions.filter((y) => y.id !== id); save(); render(); toast('삭제했습니다.');
    }); break;
    case 'review': openReview(id); break;
    case 'seg': {
      const wrap = el.parentElement;
      const wasOn = el.classList.contains('on');
      $$('button', wrap).forEach((b) => { b.classList.remove('on'); b.setAttribute('aria-checked', 'false'); });
      if (!(wasOn && wrap.id === 'd-emotion')) { el.classList.add('on'); el.setAttribute('aria-checked', 'true'); }
      break;
    }
    case 'addli': {
      const wrap = $(`#f-${el.dataset.k}`);
      const f = Object.values(DRILLS).flatMap((d) => d.fields).find((x) => x.k === el.dataset.k && x.type === 'list');
      wrap.insertAdjacentHTML('beforeend', listRow(f, '', $$('.li', wrap).length));
      $$('input', wrap).pop().focus();
      break;
    }
    case 'addrow': {
      const wrap = $(`#f-${el.dataset.k}`);
      wrap.insertAdjacentHTML('beforeend', rowRow(DRILLS.incentive.fields[1], ['', '', '']));
      $('input', $$('.rw', wrap).pop()).focus();
      break;
    }
    case 'restart': {
      const doIt = () => { S.start = dkey(); save(); render(); toast('오늘부터 30일 프로그램을 다시 시작합니다.'); };
      if (!$('#sheet').hidden) closeSheet();
      doIt();
      break;
    }
    case 'export': {
      try {
        const blob = new Blob([backupJSON()], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = `brainhack-${dkey()}.json`;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
        toast('백업 파일을 만들었습니다. 열리지 않으면 "백업 복사"를 쓰세요.');
      } catch (err) { toast('파일 저장이 막혀 있습니다. "백업 복사"를 쓰세요.'); }
      break;
    }
    case 'copy': {
      const txt = backupJSON();
      const fallback = () => { const ta = $('#import-text'); ta.value = txt; ta.focus(); ta.select(); toast('아래 칸의 내용을 길게 눌러 복사하세요.'); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(() => toast('백업을 복사했습니다. 메모 앱 등에 붙여넣어 보관하세요.'), fallback);
      else fallback();
      break;
    }
    case 'importtext': importData($('#import-text').value); break;
    case 'wipe': confirmSheet('모든 기록 삭제', '훈련, 결정 일지, 매일 루틴 기록을 모두 지웁니다. 먼저 백업을 권합니다.', '모두 삭제', () => {
      S = fresh(); save(); tab = 'today'; render(); toast('모든 기록을 지웠습니다.');
    }); break;
    default: break;
  }
});

document.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!sheetSubmit) return;
  const fn = sheetSubmit;
  if (fn() === false) return;
  closeSheet();
});

document.addEventListener('change', (e) => {
  if (e.target.id === 'import-file' && e.target.files[0]) {
    const r = new FileReader();
    r.onload = () => importData(String(r.result));
    r.readAsText(e.target.files[0]);
  }
});

const dailyTimers = {};
document.addEventListener('input', (e) => {
  const t = e.target;
  if (t.type === 'range') {
    const out = $(`#${t.id}-v`);
    if (out) out.textContent = t.id === 'd-conf' ? `${t.value}%` : t.value;
    return;
  }
  const k = t.dataset && t.dataset.daily;
  if (!k) return;
  const today = dkey();
  S.daily[today] = { ...(S.daily[today] || {}), [k]: t.value };
  const s = $(`#s-${k}`); if (s) s.textContent = '';
  clearTimeout(dailyTimers[k]);
  dailyTimers[k] = setTimeout(() => {
    if (!has(S.daily[today].incentive) && !has(S.daily[today].map)) delete S.daily[today];
    save();
    const el = $(`#s-${k}`); if (el) el.textContent = '저장됨';
  }, 500);
});
// 루틴 입력을 마치면 연속 훈련·잔디를 갱신
document.addEventListener('focusout', (e) => {
  if (e.target.dataset && e.target.dataset.daily && tab === 'today') setTimeout(() => { if (!document.activeElement || !document.activeElement.dataset.daily) { save(); render(); } }, 600);
});

document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#sheet').hidden) closeSheet(); });

// 자정을 넘겨 다시 열면 오늘 화면 갱신
let lastDay = dkey();
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && dkey() !== lastDay) { lastDay = dkey(); render(); }
});

shell();
render();
