/* MD공사 — 매장 개편 공사 현황판
 * 서버 없이 동작하는 iPhone 홈 화면용 웹앱. 모든 기록은 이 기기의 localStorage에만 저장됩니다.
 * 이 저장소는 Public이므로 실제 회사 데이터는 코드에 넣지 않습니다. */
'use strict';

/* ---------- 기준 ---------- */
const TYPES = ['신규 입점', '리뉴얼', '매장 이동', '철수 원복'];

// 단계별 표준 점검 항목. id는 저장 키이므로 바꾸지 않습니다(문구는 바꿔도 됨).
const PHASES = [
  { id: 'pre', name: '착공 전', short: '착공 전 점검', items: [
    { id: 'draw', t: '인테리어 도면 검토·승인', s: '평면·천장·전기·설비 도면, 법정 피난 동선과 방화셔터 하강선 침범 여부' },
    { id: 'apply', t: '공사 신청서·안전 서약서 접수', s: '공사 기간, 작업 시간, 현장 책임자, 비상 연락망' },
    { id: 'crew', t: '작업자 명단·보험 증빙 확인', s: '출입증 발급, 산재·영업배상 보험, 신분 확인' },
    { id: 'fire', t: '방재실 협의 (감지기·스프링클러)', s: '감지기 일시 차단 범위와 시간, 작업 종료 후 원복 담당 지정' },
    { id: 'fence', t: '가설 가림막·안내 사인 계획', s: '고객 동선 차단 범위, 오픈 예정 안내 그래픽' },
    { id: 'dock', t: '자재 반입 동선·시간 협의', s: '하역장 예약, 화물 엘리베이터, 영업시간 외 반입' },
    { id: 'notice', t: '인근 매장·협력사 사전 고지', s: '소음·분진 예상 시간, 담당자 연락처 공유' },
  ] },
  { id: 'during', name: '공사 중', short: '공사 중 관리', items: [
    { id: 'permit', t: '일일 작업 허가 확인', s: '당일 작업 내용, 인원, 화기작업 여부' },
    { id: 'hot', t: '화기작업 허가·감시자 배치', s: '용접·절단 시 소화기 2대 이상, 불티 비산 방지포, 작업 후 30분 이상 잔불 감시' },
    { id: 'dust', t: '분진·소음·냄새 관리', s: '영업시간 중 소음 작업 금지, 집진기·비닐 보양' },
    { id: 'waste', t: '폐기물 당일 반출', s: '공용 통로·피난 동선 적치 금지' },
    { id: 'patrol', t: '일일 순회 점검 기록', s: '안전모·안전대 착용, 사다리·전선 정리, 개구부 덮개' },
    { id: 'restore', t: '작업 종료 후 소방 설비 원복', s: '감지기 차단 해제 확인, 방재실 통보' },
  ] },
  { id: 'post', name: '준공·오픈', short: '준공·오픈 점검', items: [
    { id: 'flame', t: '방염 성능 확인', s: '커튼·카펫·벽지·합판 등 실내장식물 방염 확인서(필증) 수령' },
    { id: 'fireinsp', t: '소방 설비 완료 점검', s: '감지기·스프링클러 헤드 위치, 유도등·피난 표지 가림 여부' },
    { id: 'elec', t: '전기 안전 점검', s: '분전반 용량, 누전차단기, 조명·간판 결선' },
    { id: 'sign', t: '간판·사인물 설치 승인', s: '디자인 가이드 준수, 고정 상태' },
    { id: 'defect', t: '하자·원상복구 확인', s: '바닥·천장·공용부 마감 손상, 가림막 철거 흔적' },
    { id: 'pos', t: 'POS·통신·CCTV 개통', s: '매출 집계 연동, 비상벨' },
    { id: 'final', t: '오픈 전 최종 합동 순회', s: '영업·시설·안전 합동 점검, 오픈 당일 대응 인력' },
  ] },
];
const ALL_ITEMS = PHASES.flatMap((ph) => ph.items.map((it) => ({ ...it, phase: ph.id })));

// 기준 탭: 현장에서 다시 꺼내 보는 수칙
const RULES = [
  { name: '야간 작업 수칙', q: '영업 종료 후 작업은 사람이 가장 적을 때 사고가 납니다.', items: [
    '작업 시작·종료 시각을 방재실과 보안팀에 통보하고 출입 명단과 대조합니다.',
    '화기작업은 감시자 없이 시작하지 않습니다. 작업 후 잔불 감시 시간을 지킵니다.',
    '감지기를 차단했다면 원복 확인 전까지 현장 책임자가 퇴근하지 않습니다.',
    '단독 작업을 금지하고 2인 1조로 움직입니다.',
  ] },
  { name: '영업 중 공사 원칙', q: '고객 경험이 공사 일정보다 먼저입니다.', items: [
    '소음·분진 작업은 영업시간 밖으로 미룹니다. 불가피하면 인근 매장에 시간을 먼저 알립니다.',
    '피난 동선, 소화전, 방화셔터 하강선에는 자재를 한 순간도 두지 않습니다.',
    '가림막에는 오픈 예정일과 브랜드 안내를 넣어 공사 자체를 기대감으로 바꿉니다.',
  ] },
  { name: '오픈 일정 지키는 법', q: '오픈 지연의 대부분은 착공 전에 이미 결정됩니다.', items: [
    '도면 승인과 방재실 협의를 착공 3일 전까지 끝냅니다. 앱은 이때부터 경고를 띄웁니다.',
    '방염 확인서와 간판 승인은 준공 직전에 몰리므로 공사 중에 미리 요청합니다.',
    '오픈 3일 전 합동 순회 날짜를 착공일에 함께 잡아 둡니다.',
  ] },
  { name: 'CEO 보고 구조', q: '숫자 → 위험 → 대응 순서로 한 장에 담습니다.', items: [
    '현황: 진행·예정·지연·완료 건수와 이번 주 오픈 매장.',
    '위험: 지연 건과 원인, 오픈 영향 여부. 미해결 이슈는 담당과 기한을 함께 적습니다.',
    '대응: 이미 한 조치와 결정이 필요한 사항을 나눕니다. 현황 탭의 "주간 보고 복사"가 이 순서로 초안을 만듭니다.',
  ] },
];

/* ---------- 저장 ---------- */
const KEY = 'mdwork-v1';
const fresh = () => ({ v: 1, jobs: [], ui: {} });
let S = load();
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return normalize(JSON.parse(raw));
  } catch (e) { /* 저장소를 못 쓰는 환경이면 새로 시작 */ }
  return fresh();
}
function normalize(d) {
  if (!d || typeof d !== 'object') return fresh();
  const jobs = Array.isArray(d.jobs) ? d.jobs.filter((j) => j && typeof j === 'object' && j.id && isKey(j.start) && isKey(j.open)) : [];
  jobs.forEach((j) => {
    j.checks = j.checks && typeof j.checks === 'object' ? j.checks : {};
    j.logs = Array.isArray(j.logs) ? j.logs : [];
  });
  return { v: 1, jobs, ui: d.ui && typeof d.ui === 'object' ? d.ui : {} };
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
const isKey = (k) => typeof k === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(k);
function parseKey(k) { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); }
const daysBetween = (a, b) => Math.round((parseKey(b) - parseKey(a)) / 86400000);
function addDays(k, n) { const d = parseKey(k); d.setDate(d.getDate() + n); return dkey(d); }
const WD = ['일', '월', '화', '수', '목', '금', '토'];
function fmt(k) { const d = parseKey(k); return `${d.getMonth() + 1}/${d.getDate()}(${WD[d.getDay()]})`; }
function weekStart(k) { const d = parseKey(k); const off = (d.getDay() + 6) % 7; return addDays(k, -off); }
const dday = (n) => (n === 0 ? 'D-DAY' : n > 0 ? `D-${n}` : `D+${-n}`);

/* ---------- 상태 계산 ---------- */
const STATUS = {
  wait: { name: '예정', cls: 'signal' },
  go: { name: '진행', cls: 'accent' },
  late: { name: '지연', cls: 'bad' },
  done: { name: '완료', cls: 'good' },
};
function status(j, today = dkey()) {
  if (j.done) return 'done';
  if (today < j.start) return 'wait';
  if (today <= j.open) return 'go';
  return 'late';
}
function phaseItems(j, ph) {
  const p = PHASES.find((x) => x.id === ph);
  // 화기작업이 없는 공사는 화기 항목을 점검 대상에서 뺍니다.
  return p.items.filter((it) => !(it.id === 'hot' && !j.hot));
}
function progress(j) {
  const items = PHASES.flatMap((p) => phaseItems(j, p.id).map((it) => `${p.id}.${it.id}`));
  const done = items.filter((k) => j.checks[k]).length;
  return { done, total: items.length, pct: items.length ? Math.round((done / items.length) * 100) : 0 };
}
const left = (j, ph) => phaseItems(j, ph).filter((it) => !j.checks[`${ph}.${it.id}`]).length;
const openIssues = (j) => j.logs.filter((l) => !l.done).length;

// 현황판 경고: 일정과 점검 상태를 엮어 지금 손대야 할 것만 고릅니다.
function risks(today = dkey()) {
  const out = [];
  S.jobs.forEach((j) => {
    const st = status(j, today);
    if (st === 'done') return;
    const toStart = daysBetween(today, j.start);
    const toOpen = daysBetween(today, j.open);
    if (st === 'late') out.push({ j, lvl: 'bad', w: 0, t: `${j.name} 오픈 ${-toOpen}일 지연`, s: '오픈 예정일이 지났습니다. 완료 처리하거나 일정을 고쳐 주세요.' });
    const pre = left(j, 'pre');
    if (pre && toStart <= 3 && toStart >= -3) out.push({ j, lvl: toStart <= 0 ? 'bad' : 'warn', w: 1, t: `${j.name} 착공 ${dday(toStart)} · 착공 전 점검 ${pre}건 남음`, s: '도면 승인, 방재실 협의, 작업자 보험부터 확인하세요.' });
    const post = left(j, 'post');
    if (st === 'go' && post && toOpen <= 3) out.push({ j, lvl: toOpen <= 1 ? 'bad' : 'warn', w: 2, t: `${j.name} 오픈 ${dday(toOpen)} · 준공 점검 ${post}건 남음`, s: '방염 확인서와 소방 점검이 오픈의 마지막 관문입니다.' });
    const iss = openIssues(j);
    if (iss) out.push({ j, lvl: 'warn', w: 3, t: `${j.name} 미해결 이슈 ${iss}건`, s: j.logs.filter((l) => !l.done).map((l) => l.t).slice(0, 2).join(' · ') });
  });
  return out.sort((a, b) => (a.lvl === b.lvl ? a.w - b.w : a.lvl === 'bad' ? -1 : 1));
}
const byOpen = (a, b) => (a.open === b.open ? a.start.localeCompare(b.start) : a.open.localeCompare(b.open));

/* ---------- 아이콘 ---------- */
const ICON = {
  dash: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>',
  jobs: '<svg viewBox="0 0 24 24"><path d="M3 9l1.5-5h15L21 9"/><path d="M3 9h18v2a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0z"/><path d="M5 13v8h14v-8"/><path d="M10 21v-5h4v5"/></svg>',
  plan: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/><path d="M7 13h6M10 17h7"/></svg>',
  rules: '<svg viewBox="0 0 24 24"><path d="M12 3l8 4v5c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V7z"/><path d="M8.5 12l2.5 2.5 4.5-5"/></svg>',
  gear: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  close: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  chev: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>',
};

/* ---------- 화면 뼈대 ---------- */
let tab = 'dash';
let jobFilter = 'active';
let weekOffset = 0;
const TABS = [['dash', '현황'], ['jobs', '공사'], ['plan', '일정'], ['rules', '기준']];
const TITLES = { dash: '공사 현황', jobs: '공사 목록', plan: '공정 일정', rules: '현장 기준' };

function shell() {
  $('#app').innerHTML = `
    <header class="topbar" id="topbar">
      <div class="brand"><span class="mark">MD_WORKS</span><h1 id="title"></h1></div>
      <div class="top-actions">
        <button class="icon-btn add" data-act="new" aria-label="공사 등록">${ICON.plus}</button>
        <button class="icon-btn" data-act="settings" aria-label="설정">${ICON.gear}</button>
      </div>
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

const isStandalone = () => window.navigator.standalone === true || (window.matchMedia && matchMedia('(display-mode: standalone)').matches);

/* ---------- 현황 ---------- */
function counts(today = dkey()) {
  const c = { wait: 0, go: 0, late: 0, done: 0 };
  const month = today.slice(0, 7);
  S.jobs.forEach((j) => {
    const st = status(j, today);
    if (st === 'done') { if ((j.doneAt || j.open).slice(0, 7) === month) c.done += 1; } else c[st] += 1;
  });
  return c;
}

function viewDash() {
  const today = dkey();
  if (!S.jobs.length) return emptyStart();
  const c = counts(today);
  const active = S.jobs.filter((j) => status(j, today) !== 'done').sort(byOpen);
  const next = active.find((j) => j.open >= today);
  const onsite = active.filter((j) => j.start <= today && today <= j.open);
  const rs = risks(today);
  const soon = active.filter((j) => daysBetween(today, j.open) >= 0 && daysBetween(today, j.open) <= 14);
  return `
    ${!isStandalone() && !S.ui.hideInstall ? `<section class="card install-hint"><div class="txt"><b>홈 화면에 추가하세요</b><span class="muted">앱처럼 열리고 기록이 안정적으로 남습니다.</span></div><button class="btn ghost" data-act="install">방법</button></section>` : ''}
    ${next ? `<button class="card hero" data-act="view" data-id="${next.id}" style="text-align:left">
      <span class="label">다음 오픈</span>
      <div class="row"><div class="big">${esc(next.floor ? `${next.floor} ` : '')}${esc(next.name)}</div><div class="dd">${dday(daysBetween(today, next.open))}</div></div>
      <p>${fmt(next.open)} 오픈 · ${esc(next.type)} · 점검 ${progress(next).pct}%</p>
    </button>` : ''}
    <div class="stats">
      ${[['go', '진행'], ['wait', '예정'], ['late', '지연'], ['done', '이달 완료']].map(([k, nm]) =>
        `<button class="stat ${k}" data-act="filter" data-v="${k}"><b>${c[k]}</b><span>${nm}</span></button>`).join('')}
    </div>
    <section class="card">
      <div class="section-title" style="margin:0 0 8px"><h2>지금 챙길 것</h2><span class="label">${rs.length} ALERTS</span></div>
      ${rs.length ? rs.map((r) => `<button class="alert ${r.lvl}" data-act="view" data-id="${r.j.id}"><i class="dot"></i><div><div class="t">${esc(r.t)}</div>${r.s ? `<div class="s">${esc(r.s)}</div>` : ''}</div></button>`).join('')
        : '<p class="muted" style="font-size:14px">경고가 없습니다. 일정과 점검이 모두 정상입니다.</p>'}
    </section>
    <div class="section-title"><h2>오늘 현장 ${onsite.length}곳</h2><span class="label">${esc(fmt(today))}</span></div>
    <div class="stack">${onsite.length ? onsite.map(jobItem).join('') : '<div class="empty">오늘 작업 중인 현장이 없습니다.</div>'}</div>
    <div class="section-title"><h2>2주 안에 오픈</h2></div>
    <div class="stack">${soon.length ? soon.map(jobItem).join('') : '<div class="empty">14일 안에 오픈하는 매장이 없습니다.</div>'}</div>
    <button class="btn ghost block" data-act="report">주간 보고 복사</button>`;
}

function emptyStart() {
  return `
    <section class="card stack">
      <span class="label">MD 개편 공사 현황판</span>
      <h2>첫 공사를 등록하세요</h2>
      <p class="muted" style="font-size:14px">매장명과 착공일·오픈일만 넣으면 착공 전부터 오픈까지 20개 표준 점검 항목, 지연 경고, 공정표, 주간 보고 초안이 자동으로 따라옵니다.</p>
      <div class="btn-row"><button class="btn" data-act="new">공사 등록</button><button class="btn ghost" data-act="sample">예시로 둘러보기</button></div>
    </section>
    <section class="card stack">
      <h2>기록은 이 기기에만</h2>
      <p class="muted" style="font-size:14px">서버로 보내지 않습니다. 회사 내부 정보는 브랜드명 대신 약칭을 써도 됩니다. 설정에서 백업할 수 있습니다.</p>
    </section>`;
}

function jobItem(j) {
  const today = dkey();
  const st = status(j, today);
  const pr = progress(j);
  const iss = openIssues(j);
  const dd = st === 'wait' ? `착공 ${dday(daysBetween(today, j.start))}` : st === 'done' ? `${fmt(j.doneAt || j.open)} 완료` : `오픈 ${dday(daysBetween(today, j.open))}`;
  return `<button class="entry ${st === 'late' ? 'late' : ''}" data-act="view" data-id="${j.id}">
    <div class="top"><span class="title">${esc(j.floor ? `${j.floor} · ` : '')}${esc(j.name)}</span><span class="chip ${STATUS[st].cls}">${STATUS[st].name}</span></div>
    <div class="sub">${esc(j.type)} · ${fmt(j.start)} ~ ${fmt(j.open)} · <b>${dd}</b>${j.contractor ? ` · ${esc(j.contractor)}` : ''}</div>
    ${j.night || j.hot || iss ? `<div class="chips">${j.night ? '<span class="chip">야간</span>' : ''}${j.hot ? '<span class="chip signal">화기작업</span>' : ''}${iss ? `<span class="chip bad">이슈 ${iss}</span>` : ''}</div>` : ''}
    <div class="prog"><div class="track"><div class="fill ${pr.pct === 100 ? 'full' : ''}" style="width:${pr.pct}%"></div></div><span class="n">${pr.done}/${pr.total}</span></div>
  </button>`;
}

/* ---------- 공사 목록 ---------- */
const FILTERS = [['active', '진행 중'], ['go', '진행'], ['wait', '예정'], ['late', '지연'], ['done', '완료'], ['all', '전체']];
function viewJobs() {
  const today = dkey();
  const match = (j) => {
    const st = status(j, today);
    if (jobFilter === 'all') return true;
    if (jobFilter === 'active') return st !== 'done';
    return st === jobFilter;
  };
  const n = (k) => S.jobs.filter((j) => { const st = status(j, today); return k === 'all' || (k === 'active' ? st !== 'done' : st === k); }).length;
  const list = S.jobs.filter(match).sort(jobFilter === 'done' ? (a, b) => byOpen(b, a) : byOpen);
  return `
    <div class="seg" role="tablist">${FILTERS.map(([k, nm]) => `<button class="${k === jobFilter ? 'on' : ''}" data-act="filter" data-v="${k}">${nm}<span class="n">${n(k)}</span></button>`).join('')}</div>
    <div class="stack">${list.length ? list.map(jobItem).join('')
      : `<div class="empty"><b>해당하는 공사가 없습니다</b><button class="btn" data-act="new">공사 등록</button></div>`}</div>`;
}

/* ---------- 일정 ---------- */
function viewPlan() {
  const today = dkey();
  const from = addDays(weekStart(today), weekOffset * 7);
  const to = addDays(from, 27);
  const rows = S.jobs.filter((j) => j.start <= to && j.open >= from).sort((a, b) => a.start.localeCompare(b.start));
  const col = (k) => daysBetween(from, k) + 1;
  const todayCol = col(today);
  const head = Array.from({ length: 4 }, (_, w) => {
    const k = addDays(from, w * 7);
    return `<span class="wk" style="grid-column:${w * 7 + 1} / span 7">${fmt(k).replace(/\(.\)/, '')}</span>`;
  }).join('');
  const bar = (j) => {
    const st = status(j, today);
    const s = Math.max(1, col(j.start));
    const e = Math.min(28, col(j.open));
    const cut = `${j.start < from ? ' cut-l' : ''}${j.open > to ? ' cut-r' : ''}`;
    return `<div class="g-row"><button class="g-name" data-act="view" data-id="${j.id}">${esc(j.name)}<small>${esc(j.floor || j.type)}</small></button>
      <div class="g-days">
        <i class="g-bar ${st}${cut}" style="grid-column:${s} / ${e + 1}" title="${esc(`${fmt(j.start)} ~ ${fmt(j.open)}`)}"></i>
        ${j.open <= to ? `<i class="g-open" style="grid-column:${e}" title="오픈"></i>` : ''}
        ${todayCol >= 1 && todayCol <= 28 ? `<i class="g-today" style="grid-column:${todayCol}"></i>` : ''}
      </div></div>`;
  };
  return `
    <section class="card stack">
      <div class="gantt-nav">
        <button class="btn ghost" data-act="week" data-v="-1" aria-label="이전 주">‹</button>
        <b>${fmt(from)} ~ ${fmt(to)}</b>
        <button class="btn ghost" data-act="week" data-v="1" aria-label="다음 주">›</button>
      </div>
      ${weekOffset ? '<button class="btn ghost" data-act="week" data-v="0">이번 주로</button>' : ''}
      ${rows.length ? `<div class="gantt">
        <div class="g-head"><span></span><div class="g-days">${head}</div></div>
        ${rows.map(bar).join('')}
      </div>` : '<div class="empty">이 4주 동안 걸친 공사가 없습니다.</div>'}
      <div class="legend"><span><i style="background:var(--signal)"></i>예정</span><span><i style="background:var(--accent)"></i>진행</span><span><i style="background:var(--bad)"></i>지연</span><span><i style="background:var(--good)"></i>완료</span><span><i style="background:var(--bad);width:2px"></i>오늘</span><span>◆ 오픈</span></div>
    </section>
    ${weekList(from, to)}`;
}
function weekList(from, to) {
  // 4주 안의 착공·오픈 이벤트를 날짜순으로
  const ev = [];
  S.jobs.forEach((j) => {
    if (j.start >= from && j.start <= to) ev.push({ k: j.start, t: '착공', j });
    if (j.open >= from && j.open <= to) ev.push({ k: j.open, t: '오픈', j });
  });
  ev.sort((a, b) => a.k.localeCompare(b.k) || (a.t === '오픈' ? -1 : 1));
  if (!ev.length) return '';
  return `<div class="section-title"><h2>착공·오픈 일정</h2></div>
    <section class="card">${ev.map((e) => `<button class="alert" data-act="view" data-id="${e.j.id}"><span class="chip ${e.t === '오픈' ? 'good' : 'accent'}">${e.t}</span>
      <div><div class="t">${esc(e.j.name)}</div><div class="s">${fmt(e.k)}${e.j.floor ? ` · ${esc(e.j.floor)}` : ''}</div></div></button>`).join('')}</section>`;
}

/* ---------- 기준 ---------- */
function viewRules() {
  const block = (list, start) => list.map((m, i) => `
    <details class="guide">
      <summary><span class="idx">${String(start + i).padStart(2, '0')}</span><span><div class="nm">${esc(m.name)}</div><div class="qq">${esc(m.q)}</div></span><span class="chev">${ICON.chev}</span></summary>
      <div class="body">${m.body}</div>
    </details>`).join('');
  const phases = PHASES.map((p) => ({ name: `${p.name} 점검 ${p.items.length}항목`, q: p.items.map((it) => it.t).slice(0, 3).join(', ') + ' …',
    body: `<ol>${p.items.map((it) => `<li><b>${esc(it.t)}</b><br><span class="muted">${esc(it.s)}</span></li>`).join('')}</ol>` }));
  const rules = RULES.map((r) => ({ name: r.name, q: r.q, body: `<ul>${r.items.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` }));
  return `
    <div class="section-title"><h2>표준 점검 항목</h2><span class="label">${ALL_ITEMS.length} ITEMS</span></div>
    <div class="stack">${block(phases, 1)}</div>
    <div class="section-title"><h2>현장 수칙</h2></div>
    <div class="stack">${block(rules, 4)}</div>
    <p class="note"><span class="label">참고</span>방염·소방 기준은 「소방시설 설치 및 관리에 관한 법률」과 「화재의 예방 및 안전관리에 관한 법률」을 따릅니다. 점포별 세부 절차는 사내 공사 관리 규정이 우선합니다.</p>`;
}

const VIEWS = { dash: viewDash, jobs: viewJobs, plan: viewPlan, rules: viewRules };

/* ---------- 시트 ---------- */
let sheetSubmit = null;
let sheetJob = null;
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
  sheetSubmit = null; sheetJob = null;
}
// 시트가 열려 있으면 닫힌 뒤에 다음 시트를 엽니다.
function then(fn) { if (!$('#sheet').hidden) { closeSheet(); setTimeout(fn, 270); } else fn(); }
function confirmSheet(title, msg, okLabel, onOk) {
  openSheet(title, `<p class="muted">${esc(msg)}</p>
    <div class="btn-row"><button type="button" class="btn ghost" data-act="close">취소</button><button type="submit" class="btn danger">${esc(okLabel)}</button></div>`, () => { onOk(); });
}

/* ---------- 공사 등록·수정 ---------- */
function openForm(j) {
  const x = j || { type: TYPES[0], start: dkey(), open: addDays(dkey(), 14) };
  openSheet(j ? '공사 수정' : '공사 등록', `
    <div class="field"><label for="f-name">매장·브랜드</label><input type="text" id="f-name" value="${esc(x.name)}" placeholder="예: 3F 컨템포러리 A" autocomplete="off"></div>
    <div class="field"><label for="f-floor">층·구역</label><input type="text" id="f-floor" value="${esc(x.floor)}" placeholder="예: 3F 동측" autocomplete="off"></div>
    <div class="field"><span class="flabel">공사 유형</span>
      <div class="seg" id="f-type" role="radiogroup">${TYPES.map((t) => `<button type="button" role="radio" aria-checked="${t === x.type}" class="${t === x.type ? 'on' : ''}" data-act="seg">${t}</button>`).join('')}</div></div>
    <div class="two">
      <div class="field"><label for="f-start">착공일</label><input type="date" id="f-start" value="${esc(x.start)}"></div>
      <div class="field"><label for="f-open">오픈일</label><input type="date" id="f-open" value="${esc(x.open)}"></div>
    </div>
    <div class="field"><label for="f-contractor">시공사</label><input type="text" id="f-contractor" value="${esc(x.contractor)}" placeholder="인테리어 업체" autocomplete="off"></div>
    <div class="field"><label for="f-contact">현장 책임자 연락처</label><input type="tel" id="f-contact" value="${esc(x.contact)}" placeholder="이름 010-0000-0000" autocomplete="off"></div>
    <div class="toggles">
      <label><input type="checkbox" id="f-night" ${x.night ? 'checked' : ''}><span><b>야간 작업</b><span>영업 종료 후 작업. 방재실·보안 통보 대상</span></span></label>
      <label><input type="checkbox" id="f-hot" ${x.hot ? 'checked' : ''}><span><b>화기작업 있음</b><span>용접·절단·그라인더. 화기 허가와 감시자 항목이 점검에 추가됩니다</span></span></label>
    </div>
    <div class="field"><label for="f-note">메모</label><textarea id="f-note" placeholder="특이 사항, 협의 내용">${esc(x.note)}</textarea></div>
    <button type="submit" class="btn block">${j ? '저장' : '등록'}</button>`, () => {
    const v = (id) => $(`#f-${id}`).value.trim();
    const data = {
      name: v('name'), floor: v('floor'), contractor: v('contractor'), contact: v('contact'), note: v('note'),
      type: ($('#f-type .on') || {}).textContent || TYPES[0], start: v('start'), open: v('open'),
      night: $('#f-night').checked, hot: $('#f-hot').checked,
    };
    if (!data.name) { toast('매장·브랜드를 입력하세요.'); $('#f-name').focus(); return false; }
    if (!isKey(data.start) || !isKey(data.open)) { toast('착공일과 오픈일을 입력하세요.'); return false; }
    if (data.open < data.start) { toast('오픈일이 착공일보다 빠릅니다.'); return false; }
    let id;
    if (j) { Object.assign(j, data); id = j.id; } else {
      id = uid();
      S.jobs.push({ id, created: new Date().toISOString(), checks: {}, logs: [], done: false, ...data });
    }
    save(); render();
    toast(j ? '저장했습니다.' : '등록했습니다. 착공 전 점검부터 시작하세요.');
    setTimeout(() => viewJob(id), 280);
  });
}

/* ---------- 공사 상세 ---------- */
function viewJob(id) {
  const j = S.jobs.find((x) => x.id === id);
  if (!j) return;
  const today = dkey();
  const st = status(j, today);
  const pr = progress(j);
  openSheet(j.name, `
    <section class="card stack">
      <div class="chips"><span class="chip ${STATUS[st].cls}">${STATUS[st].name}</span><span class="chip">${esc(j.type)}</span>${j.night ? '<span class="chip">야간</span>' : ''}${j.hot ? '<span class="chip signal">화기작업</span>' : ''}</div>
      <dl class="kv">
        ${j.floor ? `<dt>층·구역</dt><dd>${esc(j.floor)}</dd>` : ''}
        <dt>공사 기간</dt><dd>${fmt(j.start)} ~ ${fmt(j.open)} · ${daysBetween(j.start, j.open) + 1}일</dd>
        <dt>일정</dt><dd>${st === 'wait' ? `착공 ${dday(daysBetween(today, j.start))}` : st === 'done' ? `${fmt(j.doneAt || j.open)} 오픈 완료` : `오픈 ${dday(daysBetween(today, j.open))}`}</dd>
        ${j.contractor ? `<dt>시공사</dt><dd>${esc(j.contractor)}</dd>` : ''}
        ${j.contact ? `<dt>현장 책임</dt><dd>${telLink(j.contact)}</dd>` : ''}
        ${j.note ? `<dt>메모</dt><dd>${esc(j.note)}</dd>` : ''}
      </dl>
      <div class="prog"><div class="track"><div class="fill ${pr.pct === 100 ? 'full' : ''}" id="j-fill" style="width:${pr.pct}%"></div></div><span class="n" id="j-n">${pr.pct}%</span></div>
    </section>
    ${PHASES.map((p) => `
      <section class="stack">
        <div class="phase-head"><h3>${esc(p.short)}</h3><span class="label" id="ph-${p.id}">${phaseItems(j, p.id).length - left(j, p.id)}/${phaseItems(j, p.id).length}</span></div>
        <div class="checks">${phaseItems(j, p.id).map((it) => `<label><input type="checkbox" data-chk="${p.id}.${it.id}" ${j.checks[`${p.id}.${it.id}`] ? 'checked' : ''}><span><b>${esc(it.t)}</b><span>${esc(it.s)}</span></span></label>`).join('')}</div>
      </section>`).join('')}
    <section class="card stack">
      <h2>이슈·협의 로그</h2>
      <div class="log-in"><input type="text" id="log-text" placeholder="예: 스프링클러 헤드 위치 도면과 상이" autocomplete="off"><button type="button" class="btn" data-act="logadd">추가</button></div>
      <div id="logs">${logsHTML(j)}</div>
    </section>
    ${j.done ? '<button type="button" class="btn ghost block" data-act="undone">완료 취소</button>'
      : `<button type="button" class="btn good block" data-act="done">${pr.pct === 100 ? '오픈 완료 처리' : `오픈 완료 처리 (점검 ${pr.total - pr.done}건 남음)`}</button>`}
    <div class="btn-row"><button type="button" class="btn ghost" data-act="edit">수정</button><button type="button" class="btn danger" data-act="del">삭제</button></div>`);
  sheetJob = j.id;
}
function telLink(s) {
  const m = String(s).match(/0\d{1,2}-?\d{3,4}-?\d{4}/);
  return m ? esc(s).replace(esc(m[0]), `<a href="tel:${m[0].replace(/-/g, '')}">${esc(m[0])}</a>`) : esc(s);
}
function logsHTML(j) {
  if (!j.logs.length) return '<p class="faint" style="font-size:14px">도면 차이, 협력사 요청, 지연 원인을 그때그때 남기면 주간 보고에 그대로 쓰입니다.</p>';
  return [...j.logs].sort((a, b) => (a.done === b.done ? b.d.localeCompare(a.d) : a.done ? 1 : -1)).map((l) => `
    <div class="log ${l.done ? 'done' : ''}"><input type="checkbox" data-log="${l.id}" ${l.done ? 'checked' : ''} aria-label="해결"><span><span class="d">${fmt(l.d)}</span><span class="tx">${esc(l.t)}</span></span><button type="button" class="x" data-act="logdel" data-id="${l.id}" aria-label="삭제">✕</button></div>`).join('');
}
const curJob = () => S.jobs.find((x) => x.id === sheetJob);
function refreshJobSheet(j) {
  const pr = progress(j);
  const f = $('#j-fill'); if (f) { f.style.width = `${pr.pct}%`; f.classList.toggle('full', pr.pct === 100); }
  const n = $('#j-n'); if (n) n.textContent = `${pr.pct}%`;
  PHASES.forEach((p) => { const el = $(`#ph-${p.id}`); if (el) el.textContent = `${phaseItems(j, p.id).length - left(j, p.id)}/${phaseItems(j, p.id).length}`; });
  const done = $('[data-act="done"]');
  if (done) done.textContent = pr.pct === 100 ? '오픈 완료 처리' : `오픈 완료 처리 (점검 ${pr.total - pr.done}건 남음)`;
}

/* ---------- 주간 보고 ---------- */
function reportText() {
  const today = dkey();
  const c = counts(today);
  const active = S.jobs.filter((j) => status(j, today) !== 'done').sort(byOpen);
  const line = (j) => {
    const st = status(j, today);
    const when = st === 'wait' ? `착공 ${dday(daysBetween(today, j.start))}` : `오픈 ${dday(daysBetween(today, j.open))}`;
    return `- ${j.floor ? `${j.floor} ` : ''}${j.name} (${j.type}) ${fmt(j.start)}~${fmt(j.open)} · ${when} · 점검 ${progress(j).pct}%`;
  };
  const go = active.filter((j) => ['go', 'late'].includes(status(j, today)));
  const wait = active.filter((j) => status(j, today) === 'wait' && daysBetween(today, j.start) <= 28);
  const rs = risks(today);
  const issues = active.flatMap((j) => j.logs.filter((l) => !l.done).map((l) => `- ${j.name}: ${l.t} (${fmt(l.d)})`));
  const doneM = S.jobs.filter((j) => j.done && (j.doneAt || j.open).slice(0, 7) === today.slice(0, 7));
  return [
    `[MD 개편 공사 주간 현황] ${today} 기준`,
    '',
    `■ 요약: 진행 ${c.go} · 예정 ${c.wait} · 지연 ${c.late} · 이달 오픈 완료 ${c.done}`,
    '',
    '■ 진행 중',
    ...(go.length ? go.map(line) : ['- 없음']),
    '',
    '■ 4주 내 착공 예정',
    ...(wait.length ? wait.map(line) : ['- 없음']),
    '',
    '■ 위험 요인',
    ...(rs.length ? rs.filter((r) => !r.t.includes('미해결 이슈')).map((r) => `- ${r.t}`).concat(issues).slice(0, 12) : ['- 특이 사항 없음']),
    ...(doneM.length ? ['', '■ 이달 오픈 완료', ...doneM.map((j) => `- ${j.floor ? `${j.floor} ` : ''}${j.name} (${fmt(j.doneAt || j.open)})`)] : []),
    '',
    '■ 결정 필요 사항',
    '- ',
  ].join('\n');
}
function copyText(txt, okMsg) {
  const fallback = () => then(() => {
    openSheet('복사할 내용', `<textarea class="paste" id="copy-text" style="min-height:320px">${esc(txt)}</textarea><p class="faint" style="font-size:13px">길게 눌러 전체 선택 후 복사하세요.</p>`);
    setTimeout(() => { const ta = $('#copy-text'); if (ta) { ta.focus(); ta.select(); } }, 300);
  });
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(() => toast(okMsg), fallback);
  else fallback();
}

/* ---------- 예시 데이터 ---------- */
function loadSample() {
  const t = dkey();
  const mk = (name, floor, type, s, o, extra = {}) => ({ id: uid(), created: new Date().toISOString(), name, floor, type, start: addDays(t, s), open: addDays(t, o),
    contractor: '예시 인테리어', contact: '', note: '예시 데이터입니다. 설정에서 모두 지울 수 있습니다.', night: true, hot: false, checks: {}, logs: [], done: false, ...extra });
  const all = (ph) => Object.fromEntries(PHASES.find((p) => p.id === ph).items.map((it) => [`${ph}.${it.id}`, true]));
  S.jobs.push(
    mk('예시 컨템포러리 A', '3F', '리뉴얼', -10, 3, { hot: true, checks: { ...all('pre'), 'during.permit': true, 'during.hot': true, 'during.waste': true, 'post.flame': true },
      logs: [{ id: uid(), d: addDays(t, -2), t: '천장 스프링클러 헤드 위치 도면과 상이, 설비팀 재확인', done: false }] }),
    mk('예시 F&B 팝업', 'B1', '신규 입점', 2, 12, { checks: { 'pre.draw': true, 'pre.apply': true } }),
    mk('예시 아웃도어 B', '5F', '매장 이동', -20, -1, { checks: { ...all('pre'), ...all('during') } }),
    mk('예시 리빙 C', '6F', '리뉴얼', -30, -8, { done: true, doneAt: addDays(t, -8), checks: { ...all('pre'), ...all('during'), ...all('post') } }),
  );
  save(); render(); toast('예시 공사 4건을 넣었습니다.');
}

/* ---------- 설정 ---------- */
function openSettings() {
  openSheet('설정', `
    <section class="card stack">
      <h2>백업</h2>
      <p class="muted" style="font-size:14px">기록은 이 기기에만 저장됩니다. 공사가 끝날 때마다 백업을 권합니다. 현재 공사 ${S.jobs.length}건.</p>
      <div class="btn-row"><button type="button" class="btn ghost" data-act="export">파일로 저장</button><button type="button" class="btn ghost" data-act="copy">백업 복사</button></div>
      <label class="btn ghost" for="import-file" style="cursor:pointer">백업 파일 불러오기</label>
      <input type="file" id="import-file" accept="application/json,.json" hidden>
      <textarea class="paste" id="import-text" placeholder="복사해 둔 백업을 여기에 붙여넣기"></textarea>
      <button type="button" class="btn ghost" data-act="importtext">붙여넣은 백업 불러오기</button>
    </section>
    <section class="card stack">
      <h2>완료 공사 정리</h2>
      <p class="muted" style="font-size:14px">오픈 완료 후 90일이 지난 공사를 목록에서 지웁니다. 먼저 백업하세요.</p>
      <button type="button" class="btn ghost" data-act="prune">90일 지난 완료 공사 지우기</button>
    </section>
    <section class="card stack">
      <h2>홈 화면 설치</h2>
      <p class="muted" style="font-size:14px">${isStandalone() ? '이미 앱으로 실행 중입니다.' : 'Safari에서 홈 화면에 추가하면 앱처럼 전체 화면으로 열립니다.'}</p>
      <button type="button" class="btn ghost" data-act="install">설치 방법 보기</button>
    </section>
    <button type="button" class="btn danger block" data-act="wipe">모든 기록 삭제</button>
    <p class="faint" style="font-size:12px;text-align:center">MD공사 v1 · 서버 없이 이 기기에서만 동작합니다</p>`);
}
function openInstall() {
  S.ui.hideInstall = true; save(); render();
  openSheet('홈 화면에 추가', `
    <section class="card stack"><h2>iPhone</h2><ol class="steps">
      <li><b>Safari</b>에서 이 페이지를 엽니다. 카카오톡 안에서 열었다면 오른쪽 아래 메뉴에서 Safari로 다시 엽니다.</li>
      <li>아래쪽 <b>공유</b> 버튼(사각형에서 화살표가 나오는 모양)을 누릅니다.</li>
      <li>목록을 내려 <b>홈 화면에 추가</b> → 오른쪽 위 <b>추가</b>.</li>
      <li>홈 화면의 <b>MD공사</b> 아이콘으로 실행하면 전체 화면 앱으로 열립니다.</li></ol></section>
    <section class="card stack"><h2>꼭 알아두세요</h2>
      <p class="muted" style="font-size:14px">Safari에서 쓴 기록과 홈 화면 앱의 기록은 저장 공간이 따로입니다. 먼저 홈 화면에 추가한 뒤 그 앱에서 기록을 시작하세요. 이미 Safari에서 썼다면 설정 → 백업 복사 후 앱에서 붙여넣으면 됩니다.</p></section>`);
}
function backupJSON() { return JSON.stringify({ app: 'mdwork', exported: new Date().toISOString(), ...S }, null, 1); }
function importData(text) {
  let d;
  try { d = JSON.parse(text); } catch (e) { toast('백업 형식이 아닙니다. 내보낸 내용 전체를 붙여넣어 주세요.'); return; }
  if (!d || d.app !== 'mdwork') { toast('MD공사 백업이 아닙니다.'); return; }
  const next = normalize(d);
  then(() => confirmSheet('백업 불러오기', `공사 ${next.jobs.length}건으로 지금 기록을 바꿉니다. 지금 기록은 사라집니다.`, '불러오기', () => {
    S = next; save(); render(); toast('백업을 불러왔습니다.');
  }));
}

/* ---------- 이벤트 ---------- */
let toastTimer;
function toast(msg) {
  const t = $('#toast'); if (!t) return;
  t.textContent = msg; t.classList.add('on');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('on'), 2400);
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
    case 'settings': then(openSettings); break;
    case 'install': then(openInstall); break;
    case 'new': then(() => openForm()); break;
    case 'sample': loadSample(); break;
    case 'view': then(() => viewJob(id)); break;
    case 'filter': jobFilter = el.dataset.v; tab = 'jobs'; render(); window.scrollTo(0, 0); break;
    case 'week': weekOffset = el.dataset.v === '0' ? 0 : weekOffset + Number(el.dataset.v); render(); break;
    case 'report': copyText(reportText(), '주간 보고 초안을 복사했습니다. 메일이나 메신저에 붙여넣으세요.'); break;
    case 'seg': {
      $$('button', el.parentElement).forEach((b) => { b.classList.remove('on'); b.setAttribute('aria-checked', 'false'); });
      el.classList.add('on'); el.setAttribute('aria-checked', 'true');
      break;
    }
    case 'edit': { const j = curJob(); if (j) then(() => openForm(j)); break; }
    case 'del': {
      const j = curJob(); if (!j) break;
      then(() => confirmSheet('공사 삭제', `${j.name} 공사와 점검·이슈 기록을 삭제합니다. 되돌릴 수 없습니다.`, '삭제', () => {
        S.jobs = S.jobs.filter((x) => x.id !== j.id); save(); render(); toast('삭제했습니다.');
      }));
      break;
    }
    case 'done': {
      const j = curJob(); if (!j) break;
      j.done = true; j.doneAt = dkey() < j.open ? j.open : dkey(); save(); render();
      toast('오픈 완료로 처리했습니다.'); then(() => viewJob(j.id));
      break;
    }
    case 'undone': {
      const j = curJob(); if (!j) break;
      j.done = false; delete j.doneAt; save(); render(); then(() => viewJob(j.id));
      break;
    }
    case 'logadd': {
      const j = curJob(); const inp = $('#log-text'); if (!j || !inp) break;
      const t = inp.value.trim(); if (!t) { inp.focus(); break; }
      j.logs.push({ id: uid(), d: dkey(), t, done: false }); save(); render();
      inp.value = ''; $('#logs').innerHTML = logsHTML(j);
      break;
    }
    case 'logdel': {
      const j = curJob(); if (!j) break;
      j.logs = j.logs.filter((l) => l.id !== id); save(); render(); $('#logs').innerHTML = logsHTML(j);
      break;
    }
    case 'export': {
      try {
        const blob = new Blob([backupJSON()], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = `mdwork-${dkey()}.json`;
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
    case 'prune': {
      const cut = addDays(dkey(), -90);
      const old = S.jobs.filter((j) => j.done && (j.doneAt || j.open) < cut);
      if (!old.length) { toast('지울 공사가 없습니다.'); break; }
      then(() => confirmSheet('완료 공사 정리', `오픈 완료 후 90일이 지난 공사 ${old.length}건을 지웁니다.`, '지우기', () => {
        S.jobs = S.jobs.filter((j) => !old.includes(j)); save(); render(); toast(`${old.length}건을 지웠습니다.`);
      }));
      break;
    }
    case 'wipe': then(() => confirmSheet('모든 기록 삭제', '공사, 점검, 이슈 기록을 모두 지웁니다. 먼저 백업을 권합니다.', '모두 삭제', () => {
      S = fresh(); save(); tab = 'dash'; render(); toast('모든 기록을 지웠습니다.');
    })); break;
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
  const t = e.target;
  if (t.id === 'import-file' && t.files[0]) {
    const r = new FileReader();
    r.onload = () => importData(String(r.result));
    r.readAsText(t.files[0]);
    return;
  }
  const j = curJob();
  if (!j) return;
  if (t.dataset.chk) {
    if (t.checked) j.checks[t.dataset.chk] = true; else delete j.checks[t.dataset.chk];
    save(); render(); refreshJobSheet(j);
  } else if (t.dataset.log) {
    const l = j.logs.find((x) => x.id === t.dataset.log);
    if (l) { l.done = t.checked; save(); render(); $('#logs').innerHTML = logsHTML(j); }
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !$('#sheet').hidden) closeSheet();
  // 이슈 입력칸에서 Enter는 폼 제출 대신 추가
  if (e.key === 'Enter' && e.target.id === 'log-text' && !e.isComposing) { e.preventDefault(); $('[data-act="logadd"]').click(); }
});

// 자정을 넘겨 다시 열면 D-day와 경고 갱신
let lastDay = dkey();
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && dkey() !== lastDay) { lastDay = dkey(); render(); }
});

shell();
render();
