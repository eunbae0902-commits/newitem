/* TEDDY X 모의거래소 — 실시간 시세(업비트 공개 API) 기반 가상 트레이딩 */
(function () {
  'use strict';

  const API = 'https://api.upbit.com/v1';
  const WS_URL = 'wss://api.upbit.com/websocket/v1';
  const FEE = 0.0005;
  const MIN_ORDER = 5000;
  const STORE_KEY = 'teddyx.state.v1';

  /* =========================================================
   * 유틸
   * ========================================================= */
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const parseNum = (s) => {
    const v = parseFloat(String(s ?? '').replace(/[^\d.\-]/g, ''));
    return isFinite(v) ? v : 0;
  };
  const fmtKRW = (v) => Math.round(v || 0).toLocaleString('ko-KR');
  const fmtSigned = (v) => (v > 0 ? '+' : '') + fmtKRW(v);
  const fmtPct = (r, d = 2) => (r > 0 ? '+' : '') + (r * 100).toFixed(d) + '%';
  function priceDigits(p) {
    p = Math.abs(p);
    if (p >= 1000) return 0;
    if (p >= 100) return 1;
    if (p >= 10) return 2;
    if (p >= 1) return 3;
    if (p >= 0.1) return 4;
    if (p >= 0.01) return 5;
    return 8;
  }
  const fmtPrice = (p) => (p == null || !isFinite(p)) ? '-' :
    Number(p).toLocaleString('ko-KR', { maximumFractionDigits: priceDigits(p) });
  const fmtQty = (q) => Number(q || 0).toLocaleString('ko-KR', { maximumFractionDigits: 8 });
  const fmtMil = (v) => Math.round((v || 0) / 1e6).toLocaleString('ko-KR') + '백만';
  function fmtHuman(v) {
    const a = Math.abs(v);
    if (a >= 1e8) return (v / 1e8).toLocaleString('ko-KR', { maximumFractionDigits: 2 }) + '억';
    if (a >= 1e4) return Math.round(v / 1e4).toLocaleString('ko-KR') + '만';
    return fmtKRW(v);
  }
  const cls = (v) => (v > 0 ? 'rise' : v < 0 ? 'fall' : 'even');
  const floor8 = (q) => Math.floor(q * 1e8 + 1e-6) / 1e8;
  const qtyIn = (q) => (q > 0 ? q.toFixed(8).replace(/\.?0+$/, '') : '');
  // 업비트 원화마켓 호가 단위
  function tickSize(p) {
    if (p >= 2000000) return 1000;
    if (p >= 1000000) return 500;
    if (p >= 500000) return 100;
    if (p >= 100000) return 50;
    if (p >= 10000) return 10;
    if (p >= 1000) return 1;
    if (p >= 100) return 0.1;
    if (p >= 10) return 0.01;
    if (p >= 1) return 0.001;
    if (p >= 0.1) return 0.0001;
    if (p >= 0.01) return 0.00001;
    return 0.000001;
  }
  const roundTick = (p) => {
    const t = tickSize(p);
    return +(Math.round(p / t) * t).toFixed(8);
  };
  const timeStr = (ts, withDate = true) => {
    const d = new Date(ts), p = (n) => String(n).padStart(2, '0');
    const t = `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
    return withDate ? `${d.getFullYear() % 100}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${t}` : t;
  };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  /*
   * 업비트는 브라우저(Origin 헤더 포함) 요청을 REST·WebSocket 연결 모두 10초당 1회로 제한한다.
   * 그래서 시세·호가·체결은 WebSocket 1개로 받고, REST(차트 기록 등)는 이 대기열로 10초 간격을 지켜 보낸다.
   * 제한에 걸린 응답(429)은 CORS 헤더가 없어 네트워크 오류로 보이므로 오류도 재시도 대상으로 본다.
   */
  const REST_GAP = 10500;
  const STALE = new Error('stale');
  // 새로고침해도 직전 요청 시각을 기억해 제한에 걸리지 않게 함
  const LIMIT_KEY = 'teddyx.limits';
  const limits = (() => { try { return JSON.parse(localStorage.getItem(LIMIT_KEY) || '{}'); } catch (e) { return {}; } })();
  const markLimit = (k) => { limits[k] = Date.now(); try { localStorage.setItem(LIMIT_KEY, JSON.stringify(limits)); } catch (e) { /* ignore */ } };
  let restLast = Math.min(Date.now(), limits.rest || 0), restChain = Promise.resolve();
  function getJSON(path, isStale, tries = 3) {
    const run = async () => {
      for (let i = 0; i < tries; i++) {
        if (isStale && isStale()) throw STALE;
        const wait = restLast + REST_GAP - Date.now();
        if (wait > 0) await sleep(wait);
        if (isStale && isStale()) throw STALE;
        restLast = Date.now(); markLimit('rest');
        try {
          const r = await fetch(API + path, { cache: 'no-store' });
          if (r.ok) return r.json();
          if (r.status !== 429 && r.status < 500) throw Object.assign(new Error(r.status + ' ' + path), { fatal: true });
        } catch (e) {
          if (e.fatal) throw e;
        }
      }
      throw new Error('retry exhausted ' + path);
    };
    const p = restChain.then(run, run);
    restChain = p.catch(() => {});
    return p;
  }

  /* =========================================================
   * 상태 (브라우저 localStorage에만 저장)
   * ========================================================= */
  const DEFAULT_SEED = 10000000;
  function freshState(seed = DEFAULT_SEED) {
    return {
      v: 1,
      krw: seed,
      seed,
      holdings: {},          // { 'KRW-BTC': { qty, avg } }
      orders: [],            // 미체결 지정가 주문
      trades: [],            // 체결 내역
      realized: 0,
      favorites: ['KRW-BTC', 'KRW-ETH'],
      badges: {},
      goal: 1000000000,
      sound: true,
      theme: 'light',
      confirm: true,
      lastMarket: 'KRW-BTC',
      tf: '15',
      dca: [],
      ath: seed,
      athNotified: seed,
      createdAt: Date.now(),
      role: null,            // 'master' | 'member'
      family: null,
      pinHash: null,
    };
  }
  let S;
  try {
    S = Object.assign(freshState(), JSON.parse(localStorage.getItem(STORE_KEY) || 'null') || {});
  } catch (e) { S = freshState(); }
  let saveT = null;
  function save() {
    clearTimeout(saveT);
    saveT = setTimeout(() => {
      try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch (e) { /* 용량 초과 등 */ }
    }, 200);
  }

  /* =========================================================
   * 시장 데이터
   * ========================================================= */
  const M = {};      // 마켓 정보 { code: {kor, eng, sym} }
  const T = {};      // 시세 { code: {...} }
  let codes = [];
  let cur = S.lastMarket || 'KRW-BTC';
  let book = null;   // 선택 코인 호가
  let ticks = [];    // 선택 코인 최근 체결
  const prevListPrice = {};

  function applyTicker(o) {
    const code = o.code || o.market;
    if (!code || !M[code]) return;
    const old = T[code];
    T[code] = {
      price: o.trade_price,
      rate: o.signed_change_rate,
      chg: o.signed_change_price,
      vol: o.acc_trade_price_24h,
      high: o.high_price,
      low: o.low_price,
      prev: o.prev_closing_price,
      ts: o.trade_timestamp || o.timestamp,
    };
    if (old && old.price !== o.trade_price) onPrice(code, o.trade_price, old.price);
    if (!old && code === cur) {
      renderHead();
      if (otype === 'limit' && !$('#ofPrice').value) $('#ofPrice').value = fmtPrice(o.trade_price);
    }
  }

  /* =========================================================
   * 실시간 연결 (WebSocket, 실패 시 REST 폴링)
   * ========================================================= */
  let ws = null, pollT = null, reconnectT = null, wsFails = 0, subT = null;
  const wsOpen = () => ws && ws.readyState === 1;
  function setConn(mode) {
    const el = $('#connDot');
    el.className = 'conn ' + (mode === 'ws' ? 'on' : mode === 'poll' ? 'poll' : '');
    el.title = mode === 'ws' ? '실시간 연결됨' : mode === 'poll' ? '재연결 중(지연 있음)' : '연결 끊김';
  }
  function subPayload() {
    return JSON.stringify([{ ticket: 'tx-' + uid() }, { type: 'ticker', codes }, { type: 'orderbook', codes: [cur] }, { type: 'trade', codes: [cur] }, { format: 'DEFAULT' }]);
  }
  /** 선택 코인이 바뀌면 같은 연결에 구독을 다시 보냄 (새 연결을 만들지 않음) */
  function resubscribe() {
    clearTimeout(subT);
    subT = setTimeout(() => { if (wsOpen()) ws.send(subPayload()); }, 250);
  }
  function connectWS() {
    clearTimeout(reconnectT);
    const since = Date.now() - Math.min(Date.now(), limits.ws || 0);
    if (since < 10500) { setConn('poll'); reconnectT = setTimeout(connectWS, 10500 - since); return; }
    markLimit('ws');
    if (ws) { ws._manual = true; try { ws.close(); } catch (e) { /* ignore */ } }
    let sock;
    try { sock = new WebSocket(WS_URL); } catch (e) { onWsFail(); return; }
    ws = sock;
    sock.binaryType = 'arraybuffer';
    const dec = new TextDecoder();
    sock.onopen = () => { wsFails = 0; sock.send(subPayload()); };
    sock.onmessage = (ev) => {
      let m;
      try { m = JSON.parse(typeof ev.data === 'string' ? ev.data : dec.decode(ev.data)); } catch (e) { return; }
      if (m.type === 'ticker') { applyTicker(m); setConn('ws'); stopPoll(); }
      else if (m.code !== cur) return;
      else if (m.type === 'orderbook') { book = m; queueBook(); }
      else if (m.type === 'trade') onTrade(m);
    };
    sock.onclose = () => { if (!sock._manual && ws === sock) onWsFail(); };
  }
  function onWsFail() {
    setConn('poll');
    startPoll();
    wsFails++;
    // 연결도 10초당 1회 제한 → 12초부터 점점 늘려 재시도
    reconnectT = setTimeout(connectWS, Math.min(60000, 12000 * wsFails) + Math.random() * 2000);
  }
  // 실시간 연결이 끊긴 동안에만 REST로 시세를 가끔 갱신
  function startPoll() {
    if (pollT) return;
    const run = async () => {
      if (wsOpen()) return stopPoll();
      try { (await getJSON('/ticker/all?quote_currencies=KRW', wsOpen)).forEach(applyTicker); } catch (e) { if (e !== STALE) setConn('off'); }
    };
    pollT = setInterval(run, 20000);
    run();
  }
  function stopPoll() { if (pollT) { clearInterval(pollT); pollT = null; } }
  // 앱을 다시 켰을 때(백그라운드 복귀) 연결이 끊겨 있으면 바로 재연결
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && codes.length && !wsOpen() && (!ws || ws.readyState !== 0)) {
      clearTimeout(reconnectT); reconnectT = setTimeout(connectWS, 800);
    }
  });

  /* =========================================================
   * 가격 변경 → 주문 체결 / 차트 / 효과
   * ========================================================= */
  function onPrice(code, price) {
    matchOrders(code, price);
    if (code === cur) {
      renderHead(true);
      if (!wsOpen()) chartTick(price, 0, Date.now());
    }
  }
  function onTrade(m) {
    ticks.unshift({ p: m.trade_price, v: m.trade_volume, s: m.ask_bid, t: m.trade_timestamp });
    if (ticks.length > 60) ticks.length = 60;
    chartTick(m.trade_price, m.trade_volume, m.trade_timestamp);
    queueTrades();
  }

  /* =========================================================
   * 매매 엔진
   * ========================================================= */
  const lockedKrw = () => S.orders.filter((o) => o.side === 'bid').reduce((s, o) => s + o.lock, 0);
  const lockedQty = (code) => S.orders.filter((o) => o.side === 'ask' && o.market === code).reduce((s, o) => s + o.qty, 0);
  const availKrw = () => Math.max(0, S.krw - lockedKrw());
  const availQty = (code) => Math.max(0, (S.holdings[code]?.qty || 0) - lockedQty(code));
  const lastPrice = (code) => T[code]?.price || 0;
  function bestAsk(code) { return code === cur && book?.orderbook_units?.[0]?.ask_price || lastPrice(code); }
  function bestBid(code) { return code === cur && book?.orderbook_units?.[0]?.bid_price || lastPrice(code); }

  /** 실제 체결 처리 */
  function execute(code, side, price, qty, kind) {
    const amount = price * qty;
    const fee = amount * FEE;
    const h = S.holdings[code] || { qty: 0, avg: 0 };
    let pnl = null, pnlRate = null;
    if (side === 'bid') {
      S.krw -= amount + fee;
      const nq = h.qty + qty;
      h.avg = (h.qty * h.avg + qty * price) / nq;
      h.qty = nq;
      S.holdings[code] = h;
    } else {
      S.krw += amount - fee;
      pnl = (price - h.avg) * qty - fee;
      pnlRate = h.avg ? (price - h.avg) / h.avg : 0;
      S.realized += pnl;
      h.qty = floor8(h.qty - qty);
      if (h.qty <= 1e-9) delete S.holdings[code]; else S.holdings[code] = h;
    }
    if (Math.abs(S.krw) < 1e-6) S.krw = 0;
    const tr = { id: uid(), ts: Date.now(), market: code, side, kind, price, qty, amount, fee, pnl, pnlRate };
    S.trades.unshift(tr);
    if (S.trades.length > 2000) S.trades.length = 2000;
    save();
    celebrate(tr);
    checkBadges(tr);
    refreshAll();
    return tr;
  }

  /** 주문 접수 */
  function placeOrder({ code, side, type, price, qty, total }) {
    const name = M[code]?.kor || code;
    if (type === 'market') {
      if (side === 'bid') {
        const p = bestAsk(code);
        if (!p) return fail('시세 정보가 없습니다.');
        if (total < MIN_ORDER) return fail(`최소 주문금액은 ${fmtKRW(MIN_ORDER)} KRW 입니다.`);
        if (total * (1 + FEE) > availKrw() + 1e-6) return fail('주문가능 금액이 부족합니다.');
        return execute(code, 'bid', p, floor8(total / p), 'market');
      }
      const p = bestBid(code);
      if (!p) return fail('시세 정보가 없습니다.');
      if (qty <= 0) return fail('주문수량을 입력하세요.');
      if (qty > availQty(code) + 1e-12) return fail('매도가능 수량이 부족합니다.');
      if (p * qty < MIN_ORDER) return fail(`최소 주문금액은 ${fmtKRW(MIN_ORDER)} KRW 입니다.`);
      return execute(code, 'ask', p, qty, 'market');
    }
    // 지정가
    if (!(price > 0)) return fail('주문가격을 입력하세요.');
    if (!(qty > 0)) return fail('주문수량을 입력하세요.');
    if (price * qty < MIN_ORDER) return fail(`최소 주문금액은 ${fmtKRW(MIN_ORDER)} KRW 입니다.`);
    const mkt = lastPrice(code);
    if (side === 'bid') {
      if (price * qty * (1 + FEE) > availKrw() + 1e-6) return fail('주문가능 금액이 부족합니다.');
      if (mkt && price >= mkt) return execute(code, 'bid', Math.min(price, bestAsk(code) || mkt), qty, 'limit');
      S.orders.push({ id: uid(), market: code, side, price, qty, lock: price * qty * (1 + FEE), ts: Date.now() });
    } else {
      if (qty > availQty(code) + 1e-12) return fail('매도가능 수량이 부족합니다.');
      if (mkt && price <= mkt) return execute(code, 'ask', Math.max(price, bestBid(code) || mkt), qty, 'limit');
      S.orders.push({ id: uid(), market: code, side, price, qty, lock: 0, ts: Date.now() });
    }
    save();
    toast(`${name} ${side === 'bid' ? '매수' : '매도'} 주문 접수`, `${fmtPrice(price)} KRW · ${fmtQty(qty)} ${M[code]?.sym || ''} — 가격 도달 시 체결`, side);
    sfx('order');
    refreshAll();
    return true;
  }
  function fail(msg) { toast('⚠️ 확인해 주세요', msg, 'fail'); sfx('error'); return false; }
  /** 입금·회수처럼 외부에서 돈이 바뀐 직후엔 신고가 기준점을 현재 자산으로 맞춤 (가짜 신고가 알림 방지) */
  function rebaseAth() { const t = portfolio().total; S.ath = t; S.athNotified = t; }

  function matchOrders(code, price) {
    if (!S.orders.length) return;
    const hit = S.orders.filter((o) => o.market === code && (o.side === 'bid' ? price <= o.price : price >= o.price));
    if (!hit.length) return;
    S.orders = S.orders.filter((o) => !hit.includes(o));
    for (const o of hit) {
      if (o.side === 'ask' && availQty(code) + 1e-12 < o.qty) continue; // 보유수량을 직접 줄인 경우
      execute(code, o.side, o.price, o.qty, 'limit');
    }
  }
  function cancelOrder(id) {
    const o = S.orders.find((x) => x.id === id);
    S.orders = S.orders.filter((x) => x.id !== id);
    save();
    if (o) toast('주문 취소', `${M[o.market]?.kor || o.market} ${o.side === 'bid' ? '매수' : '매도'} ${fmtPrice(o.price)}`, 'fail');
    refreshAll();
  }

  /* =========================================================
   * 포트폴리오 계산
   * ========================================================= */
  function portfolio() {
    let buy = 0, evalSum = 0;
    const rows = [];
    for (const [code, h] of Object.entries(S.holdings)) {
      const p = lastPrice(code) || h.avg;
      const b = h.qty * h.avg, e = h.qty * p;
      buy += b; evalSum += e;
      rows.push({ code, qty: h.qty, avg: h.avg, price: p, buy: b, eval: e, pnl: e - b, rate: b ? (e - b) / b : 0 });
    }
    rows.sort((a, b) => b.eval - a.eval);
    const total = S.krw + evalSum;
    return { rows, buy, eval: evalSum, pnl: evalSum - buy, rate: buy ? (evalSum - buy) / buy : 0, total, seedRate: S.seed ? (total - S.seed) / S.seed : 0 };
  }

  /* =========================================================
   * 렌더링: 헤더 총자산
   * ========================================================= */
  let lastTotal = null;
  function renderTop() {
    const pf = portfolio();
    const v = $('#taValue'), r = $('#taRate');
    v.textContent = fmtKRW(pf.total) + ' KRW';
    r.textContent = fmtPct(pf.seedRate);
    r.className = 'ta-rate ' + (pf.seedRate > 0 ? 'up' : pf.seedRate < 0 ? 'down' : '');
    if (lastTotal != null && Math.abs(pf.total - lastTotal) >= 1) {
      v.classList.remove('flash-up', 'flash-down');
      void v.offsetWidth;
      v.classList.add(pf.total > lastTotal ? 'flash-up' : 'flash-down');
      setTimeout(() => v.classList.remove('flash-up', 'flash-down'), 400);
    }
    lastTotal = pf.total;
    // 총자산 신고가 알림
    if (pf.total > S.ath) {
      S.ath = pf.total;
      if (pf.rows.length && pf.total >= S.athNotified * 1.01) {
        S.athNotified = pf.total;
        toast('🚀 총자산 신고가 경신!', `${fmtKRW(pf.total)} KRW (원금 대비 ${fmtPct(pf.seedRate)})`, 'win');
        sfx('ath');
        confetti(60);
      }
      save();
    }
    if (S.goal && pf.total >= S.goal) unlock('goal');
    if (pf.seedRate >= 1) unlock('x2');
    return pf;
  }

  /* =========================================================
   * 렌더링: 코인 목록
   * ========================================================= */
  let listTab = 'krw', sortKey = 'vol', sortAsc = false, search = '';
  function renderList() {
    const q = search.trim().toLowerCase();
    let list = codes.filter((c) => T[c]);
    if (listTab === 'mine') list = list.filter((c) => S.holdings[c]);
    if (listTab === 'fav') list = list.filter((c) => S.favorites.includes(c));
    if (q) list = list.filter((c) => { const m = M[c]; return m.kor.includes(q) || m.eng.toLowerCase().includes(q) || m.sym.toLowerCase().includes(q); });
    const key = { name: (c) => M[c].kor, price: (c) => T[c].price, rate: (c) => T[c].rate, vol: (c) => T[c].vol }[sortKey];
    list.sort((a, b) => {
      const x = key(a), y = key(b);
      const r = typeof x === 'string' ? x.localeCompare(y, 'ko') : x - y;
      return sortAsc ? r : -r;
    });
    if (!list.length) {
      $('#clBody').innerHTML = `<div class="empty">${listTab === 'mine' ? '보유 중인 코인이 없어요' : listTab === 'fav' ? '관심 코인을 ☆로 추가해 보세요' : '검색 결과가 없어요'}</div>`;
      return;
    }
    $('#clBody').innerHTML = list.map((c) => {
      const t = T[c], m = M[c], h = S.holdings[c];
      const pv = prevListPrice[c];
      const flash = pv == null || pv === t.price ? '' : t.price > pv ? ' up' : ' dn';
      prevListPrice[c] = t.price;
      let mine = '';
      if (h) {
        const r = (t.price - h.avg) / h.avg;
        mine = ` · <span class="mine">보유 ${fmtPct(r, 1)}</span>`;
      }
      const k = cls(t.rate);
      return `<div class="cl-row${c === cur ? ' sel' : ''}" data-code="${c}">
        <div class="nm"><b>${m.kor}</b><small>${m.sym}/KRW${mine}</small></div>
        <div class="p ${k}${flash}">${fmtPrice(t.price)}</div>
        <div class="r ${k}">${fmtPct(t.rate)}<small>${fmtPrice(t.chg)}</small></div>
        <div class="v">${fmtMil(t.vol)}</div>
      </div>`;
    }).join('');
  }

  /* =========================================================
   * 렌더링: 선택 코인 헤더
   * ========================================================= */
  let lastHeadPrice = null;
  function renderHead(fromTick) {
    const t = T[cur], m = M[cur];
    if (!m) return;
    $('#chKor').textContent = m.kor;
    $('#chCode').textContent = m.sym + '/KRW';
    $('#chFav').textContent = S.favorites.includes(cur) ? '★' : '☆';
    if (!t) return;
    const k = cls(t.rate);
    const pe = $('#chPrice');
    pe.textContent = fmtPrice(t.price);
    pe.className = 'ch-trade ' + k;
    if (fromTick && lastHeadPrice != null && lastHeadPrice !== t.price) {
      const c = t.price > lastHeadPrice ? 'flash-up-bg' : 'flash-dn-bg';
      pe.classList.add(c);
      setTimeout(() => pe.classList.remove(c), 250);
    }
    lastHeadPrice = t.price;
    $('#chChange').innerHTML = `<span class="${k}">${fmtPct(t.rate)} ${t.chg > 0 ? '▲' : t.chg < 0 ? '▼' : ''}${fmtPrice(Math.abs(t.chg))}</span>`;
    $('#chHigh').textContent = fmtPrice(t.high);
    $('#chLow').textContent = fmtPrice(t.low);
    $('#chVol').textContent = fmtMil(t.vol);
    const h = S.holdings[cur];
    const mine = $('#chMine');
    if (h) {
      const r = (t.price - h.avg) / h.avg;
      mine.innerHTML = `<span class="${cls(r)}">${fmtPct(r)} (${fmtSigned((t.price - h.avg) * h.qty)})</span>`;
    } else mine.textContent = '없음';
    document.title = `${fmtPrice(t.price)} ${m.sym} | TEDDY X`;
  }

  /* =========================================================
   * 차트
   * ========================================================= */
  const chart = new CandleChart($('#chart'), {
    fmt: fmtPrice,
    onHover: (c, isHover) => {
      if (!c) return;
      const ma = CandleChart.MA.map((m) => c['ma' + m.n] != null ? `<b style="color:${m.color}">MA${m.n} ${fmtPrice(c['ma' + m.n])}</b>` : '').join('');
      const k = c.c >= c.o ? 'rise' : 'fall';
      $('#chartLegend').innerHTML = `${isHover ? '' : ''}시 <b class="${k}">${fmtPrice(c.o)}</b>고 <b class="${k}">${fmtPrice(c.h)}</b>저 <b class="${k}">${fmtPrice(c.l)}</b>종 <b class="${k}">${fmtPrice(c.c)}</b>${ma}`;
    },
  });
  const tfMs = (tf) => (tf === 'D' ? 86400000 : Number(tf) * 60000);
  let chartReq = 0, chartKey = '';
  const candleCache = {}; // { 'KRW-BTC|15': { data, at } } — 같은 차트를 다시 볼 때 요청 없이 즉시 표시
  async function loadChart() {
    const my = ++chartReq;
    const key = cur + '|' + S.tf;
    if (chartKey && chart.data.length) candleCache[chartKey] = { data: chart.data, at: candleCache[chartKey]?.at || Date.now() };
    chartKey = key;
    const cached = candleCache[key];
    const loading = $('#chartLoading');
    if (cached) {
      chart.setData(cached.data, S.tf);
      updateChartLines();
      loading.classList.add('hidden');
      if (Date.now() - cached.at < 5 * 60000) return;
    } else {
      chart.setData([], S.tf); // 기록이 오기 전까지 실시간 체결로 캔들을 그려 나감
      loading.textContent = '차트 불러오는 중… (요청 제한으로 최대 10초)';
      loading.classList.remove('hidden');
    }
    try {
      const path = S.tf === 'D' ? `/candles/days?market=${cur}&count=200` : `/candles/minutes/${S.tf}?market=${cur}&count=200`;
      const raw = await getJSON(path, () => my !== chartReq);
      if (my !== chartReq) return;
      const data = raw.reverse().map((c) => ({
        t: Date.parse(c.candle_date_time_utc + 'Z'),
        o: c.opening_price, h: c.high_price, l: c.low_price, c: c.trade_price, v: c.candle_acc_trade_volume,
      }));
      candleCache[key] = { data, at: Date.now() };
      chart.setData(data, S.tf);
      updateChartLines();
      loading.classList.add('hidden');
    } catch (e) {
      if (e === STALE || my !== chartReq) return;
      if (!chart.data.length) loading.textContent = '차트 기록을 잠시 후 다시 불러올게요.';
      else loading.classList.add('hidden');
      setTimeout(() => { if (my === chartReq) loadChart(); }, 15000);
    }
  }
  function chartTick(p, v, ts) { chart.tick(p, v, ts || Date.now(), tfMs(S.tf)); }
  function updateChartLines() {
    const lines = [];
    const h = S.holdings[cur];
    if (h) lines.push({ price: h.avg, color: '#e5a50a', label: '내 평단', dash: [6, 3] });
    for (const o of S.orders.filter((x) => x.market === cur)) {
      lines.push({ price: o.price, color: o.side === 'bid' ? '#c84a31' : '#1261c4', label: o.side === 'bid' ? '매수 대기' : '매도 대기', dash: [2, 3] });
    }
    chart.setLines(lines);
  }

  /* =========================================================
   * 호가 / 체결
   * ========================================================= */
  let bookQueued = false, tradesQueued = false;
  function queueBook() { if (!bookQueued) { bookQueued = true; requestAnimationFrame(renderBook); } }
  function queueTrades() { if (!tradesQueued) { tradesQueued = true; requestAnimationFrame(renderTrades); } }
  function renderBook() {
    bookQueued = false;
    const el = $('#obBook');
    if (!book || !book.orderbook_units) { el.innerHTML = '<div class="empty">호가 불러오는 중…</div>'; return; }
    const units = book.orderbook_units;
    const prev = T[cur]?.prev || 0;
    const last = T[cur]?.price;
    const max = Math.max(...units.map((u) => Math.max(u.ask_size, u.bid_size)));
    const pct = (p) => prev ? fmtPct(p / prev - 1) : '';
    const asks = units.slice().reverse().map((u) => `
      <div class="ob-row ask${u.ask_price === last ? ' cur' : ''}">
        <div class="sz l"><i style="width:${u.ask_size / max * 100}%"></i><span>${fmtQty(+u.ask_size.toFixed(3))}</span></div>
        <div class="px ${cls(u.ask_price - prev)}" data-px="${u.ask_price}"><span>${fmtPrice(u.ask_price)}</span><small>${pct(u.ask_price)}</small></div>
        <div></div>
      </div>`).join('');
    const bids = units.map((u) => `
      <div class="ob-row bid${u.bid_price === last ? ' cur' : ''}">
        <div></div>
        <div class="px ${cls(u.bid_price - prev)}" data-px="${u.bid_price}"><span>${fmtPrice(u.bid_price)}</span><small>${pct(u.bid_price)}</small></div>
        <div class="sz r"><i style="width:${u.bid_size / max * 100}%"></i><span>${fmtQty(+u.bid_size.toFixed(3))}</span></div>
      </div>`).join('');
    const mid = `<div class="ob-mid"><span>매도잔량 ${fmtQty(+(book.total_ask_size || 0).toFixed(3))}</span><span>매수잔량 ${fmtQty(+(book.total_bid_size || 0).toFixed(3))}</span></div>`;
    const first = !el.dataset.code || el.dataset.code !== cur;
    el.innerHTML = asks + mid + bids;
    if (first) {
      el.dataset.code = cur;
      el.scrollTop = Math.max(0, (el.scrollHeight - el.clientHeight) / 2);
    }
  }
  function renderTrades() {
    tradesQueued = false;
    const el = $('#obTrades');
    if (el.classList.contains('hidden')) return;
    el.innerHTML = `<div class="tr-row tr-head"><span>체결시간</span><span>체결가격</span><span>체결량</span></div>` +
      (ticks.length ? ticks.map((t) => `<div class="tr-row"><span>${timeStr(t.t, false)}</span><span>${fmtPrice(t.p)}</span><span class="${t.s === 'BID' ? 'rise' : 'fall'}">${fmtQty(+t.v.toFixed(4))}</span></div>`).join('') : '<div class="empty">체결 대기 중…</div>');
  }

  /* =========================================================
   * 주문 폼
   * ========================================================= */
  let side = 'bid', otype = 'limit';
  function setSide(s) {
    side = s;
    $$('#orderTabs button').forEach((b) => b.classList.toggle('active', b.dataset.side === s));
    const isOpen = s === 'open';
    $('#orderForm').classList.toggle('hidden', isOpen);
    $('#openOrders').classList.toggle('hidden', !isOpen);
    if (isOpen) { renderOpenOrders(); return; }
    $('#lblPrice').textContent = s === 'bid' ? '매수가격' : '매도가격';
    const btn = $('#ofSubmit');
    btn.textContent = s === 'bid' ? '매수' : '매도';
    btn.className = 'btn ' + (s === 'bid' ? 'buy' : 'sell');
    applyType();
    resetForm(true);
  }
  function applyType() {
    $$('#ordType button').forEach((b) => b.classList.toggle('active', b.dataset.type === otype));
    const mk = otype === 'market';
    $('#rowPrice').classList.toggle('hidden', mk);
    $('#rowQty').classList.toggle('hidden', mk && side === 'bid');
    $('#rowTotal').classList.toggle('hidden', mk && side === 'ask');
    renderAvail();
  }
  function renderAvail() {
    const m = M[cur];
    if (side === 'bid') {
      $('#ofAvail').textContent = fmtKRW(availKrw());
      $('#ofAvailUnit').textContent = 'KRW';
    } else {
      $('#ofAvail').textContent = fmtQty(availQty(cur));
      $('#ofAvailUnit').textContent = m?.sym || '';
    }
    $('#ofQtyUnit').textContent = `(${m?.sym || ''})`;
  }
  function resetForm(keepPrice) {
    if (!keepPrice || !parseNum($('#ofPrice').value)) $('#ofPrice').value = T[cur] ? fmtPrice(T[cur].price) : '';
    $('#ofQty').value = '';
    $('#ofTotal').value = '';
  }
  function syncFromQty() {
    const p = parseNum($('#ofPrice').value), q = parseNum($('#ofQty').value);
    $('#ofTotal').value = p && q ? fmtKRW(p * q) : '';
  }
  function syncFromTotal() {
    const p = parseNum($('#ofPrice').value), t = parseNum($('#ofTotal').value);
    if (otype === 'limit') $('#ofQty').value = p && t ? qtyIn(floor8(t / p)) : '';
  }
  function fillPct(pct) {
    const p = otype === 'market' ? (side === 'bid' ? bestAsk(cur) : bestBid(cur)) : parseNum($('#ofPrice').value);
    if (side === 'bid') {
      const total = Math.floor(availKrw() * pct / 100 / (1 + FEE));
      $('#ofTotal').value = fmtKRW(total);
      if (otype === 'limit' && p) $('#ofQty').value = qtyIn(floor8(total / p));
    } else {
      const q = floor8(availQty(cur) * pct / 100);
      $('#ofQty').value = qtyIn(q);
      if (p) $('#ofTotal').value = fmtKRW(q * p);
    }
  }
  function submitOrder() {
    const req = {
      code: cur, side, type: otype,
      price: roundTick(parseNum($('#ofPrice').value)),
      qty: parseNum($('#ofQty').value),
      total: parseNum($('#ofTotal').value),
    };
    const go = () => { if (placeOrder(req)) { resetForm(true); } };
    if (!S.confirm) return go();
    const m = M[cur];
    const isMk = otype === 'market';
    const est = isMk
      ? (side === 'bid' ? req.total : req.qty * bestBid(cur))
      : req.price * req.qty;
    const rows = [
      ['주문유형', `${isMk ? '시장가' : '지정가'} ${side === 'bid' ? '매수' : '매도'}`],
      ['코인', `${m.kor} (${m.sym})`],
      !isMk && ['주문가격', fmtPrice(req.price) + ' KRW'],
      !(isMk && side === 'bid') && ['주문수량', fmtQty(req.qty) + ' ' + m.sym],
      ['주문총액', fmtKRW(est) + ' KRW'],
      ['수수료(예상)', fmtKRW(est * FEE) + ' KRW'],
    ].filter(Boolean);
    modal(`${side === 'bid' ? '매수' : '매도'} 주문 확인`,
      `<dl>${rows.map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join('')}</dl>
       <label class="check"><input type="checkbox" id="mSkip" /> 다음부터 확인창 없이 바로 주문</label>`,
      () => { if ($('#mSkip').checked) { S.confirm = false; save(); } go(); },
      side === 'bid' ? 'buy' : 'sell');
  }
  function renderOpenOrders() {
    const n = S.orders.length;
    $('#openCnt').textContent = n ? n : '';
    const el = $('#openOrders');
    if (el.classList.contains('hidden')) return;
    if (!n) { el.innerHTML = '<div class="empty">미체결 주문이 없어요</div>'; return; }
    el.innerHTML = S.orders.slice().reverse().map((o) => {
      const m = M[o.market] || { kor: o.market, sym: '' };
      const p = lastPrice(o.market);
      const gap = p ? (o.price / p - 1) : 0;
      return `<div class="oo-item">
        <div><b class="${o.side === 'bid' ? 'rise' : 'fall'}">${o.side === 'bid' ? '매수' : '매도'}</b> ${m.kor}
          <div>${fmtPrice(o.price)} KRW × ${fmtQty(o.qty)} ${m.sym}</div>
          <div class="oo-meta">${timeStr(o.ts)} · 현재가 대비 ${fmtPct(gap)}</div></div>
        <button data-cancel="${o.id}">취소</button>
      </div>`;
    }).join('');
  }

  /* =========================================================
   * 투자내역 화면
   * ========================================================= */
  const PALETTE = ['#f7931a', '#627eea', '#c84a31', '#1261c4', '#2b9a66', '#c23fd1', '#e5a50a', '#00a3bf', '#9aa1ad'];
  let histFilter = 'all';
  function renderInvest() {
    const pf = portfolio();
    $('#sKrw').textContent = fmtKRW(S.krw);
    $('#sTotal').textContent = fmtKRW(pf.total);
    $('#sBuy').textContent = fmtKRW(pf.buy);
    $('#sEval').textContent = fmtKRW(pf.eval);
    $('#sPnl').innerHTML = `<span class="${cls(pf.pnl)}">${fmtSigned(pf.pnl)}</span>`;
    $('#sRate').innerHTML = `<span class="${cls(pf.rate)}">${fmtPct(pf.rate)}</span>`;
    $('#sAvail').textContent = fmtKRW(availKrw());
    $('#sRealized').innerHTML = `<span class="${cls(S.realized)}">${fmtSigned(S.realized)}</span>`;
    $('#sSeed').textContent = fmtKRW(S.seed);
    $('#sSeedRate').innerHTML = `<span class="${cls(pf.seedRate)}">${fmtPct(pf.seedRate)}</span>`;
    const gp = S.goal ? Math.min(1, pf.total / S.goal) : 0;
    $('#goalLabel').textContent = fmtHuman(S.goal) + '원';
    $('#goalPct').textContent = (gp * 100).toFixed(2) + '%';
    $('#goalFill').style.width = (gp * 100) + '%';

    $('#holdTbl tbody').innerHTML = pf.rows.length ? pf.rows.map((r) => {
      const m = M[r.code] || { kor: r.code, sym: '' };
      return `<tr>
        <td><b>${m.kor}</b><small>${m.sym}</small></td>
        <td>${fmtQty(r.qty)}</td>
        <td>${fmtPrice(r.avg)}</td>
        <td class="${cls(r.price - r.avg)}">${fmtPrice(r.price)}</td>
        <td>${fmtKRW(r.buy)}</td>
        <td>${fmtKRW(r.eval)}</td>
        <td class="${cls(r.pnl)}">${fmtSigned(r.pnl)}<small class="${cls(r.pnl)}">${fmtPct(r.rate)}</small></td>
        <td><button class="go" data-goto="${r.code}">거래</button></td>
      </tr>`;
    }).join('') : '<tr><td colspan="8" class="empty" style="text-align:center">보유 코인이 없어요. 거래소에서 첫 매수를 해보세요!</td></tr>';

    // 포트폴리오 도넛
    const parts = [{ name: 'KRW', v: S.krw }].concat(pf.rows.map((r) => ({ name: M[r.code]?.sym || r.code, v: r.eval })));
    parts.sort((a, b) => b.v - a.v);
    const top = parts.slice(0, 7);
    const rest = parts.slice(7).reduce((s, p) => s + p.v, 0);
    if (rest > 0) top.push({ name: '기타', v: rest });
    drawDonut(top, pf.total);

    const list = S.trades.filter((t) => histFilter === 'all' || t.side === histFilter).slice(0, 300);
    $('#histTbl tbody').innerHTML = list.length ? list.map((t) => {
      const m = M[t.market] || { kor: t.market, sym: '' };
      return `<tr>
        <td>${timeStr(t.ts)}</td>
        <td><b>${m.kor}</b><small>${m.sym}</small></td>
        <td class="${t.side === 'bid' ? 'rise' : 'fall'}">${t.side === 'bid' ? '매수' : '매도'}<small>${t.kind === 'market' ? '시장가' : t.kind === 'dca' ? '자동적립' : '지정가'}</small></td>
        <td>${fmtPrice(t.price)}</td>
        <td>${fmtQty(t.qty)}</td>
        <td>${fmtKRW(t.amount)}</td>
        <td>${fmtKRW(t.fee)}</td>
        <td class="${t.pnl == null ? '' : cls(t.pnl)}">${t.pnl == null ? '-' : fmtSigned(t.pnl) + `<small class="${cls(t.pnl)}">${fmtPct(t.pnlRate)}</small>`}</td>
      </tr>`;
    }).join('') : '<tr><td colspan="8" class="empty" style="text-align:center">거래내역이 없어요</td></tr>';
    renderBadges();
  }
  function drawDonut(parts, total) {
    const cv = $('#donut'), ctx = cv.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    cv.width = 220 * dpr; cv.height = 220 * dpr; cv.style.width = '220px'; cv.style.height = '220px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, 220, 220);
    let a = -Math.PI / 2;
    const sum = parts.reduce((s, p) => s + Math.max(0, p.v), 0) || 1;
    parts.forEach((p, i) => {
      const ang = Math.max(0, p.v) / sum * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(110, 110); ctx.arc(110, 110, 100, a, a + ang); ctx.closePath();
      ctx.fillStyle = p.name === 'KRW' ? '#9aa1ad' : PALETTE[i % PALETTE.length];
      ctx.fill();
      a += ang;
    });
    ctx.beginPath(); ctx.arc(110, 110, 62, 0, Math.PI * 2);
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--panel'); ctx.fill();
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text');
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '12px sans-serif'; ctx.fillText('총 보유자산', 110, 96);
    ctx.font = 'bold 17px sans-serif'; ctx.fillText(fmtHuman(total), 110, 120);
    $('#donutLegend').innerHTML = parts.map((p, i) => `<li><i style="background:${p.name === 'KRW' ? '#9aa1ad' : PALETTE[i % PALETTE.length]}"></i>${p.name}<span>${(p.v / sum * 100).toFixed(1)}%</span></li>`).join('');
  }

  /* =========================================================
   * 업적 배지
   * ========================================================= */
  const BADGES = [
    { id: 'first', ico: '👣', name: '첫 발걸음', desc: '첫 거래 체결' },
    { id: 't10', ico: '⚡', name: '손이 빠른 자', desc: '거래 10회' },
    { id: 't100', ico: '💎', name: '거래소 VIP', desc: '거래 100회' },
    { id: 'win5', ico: '😎', name: '익절의 맛', desc: '+5% 이상 익절' },
    { id: 'win20', ico: '🎰', name: '잭팟', desc: '+20% 이상 익절' },
    { id: 'win100', ico: '🚀', name: '더블업', desc: '+100% 이상 익절' },
    { id: 'cut', ico: '🧊', name: '손절도 실력', desc: '-5% 이하에서 매도' },
    { id: 'r1m', ico: '💵', name: '백만원 클럽', desc: '누적 실현수익 100만' },
    { id: 'r10m', ico: '💰', name: '천만원 클럽', desc: '누적 실현수익 1,000만' },
    { id: 'r100m', ico: '🏦', name: '억대 트레이더', desc: '누적 실현수익 1억' },
    { id: 'div5', ico: '🧺', name: '분산투자의 정석', desc: '5종목 동시 보유' },
    { id: 'btc1', ico: '🟠', name: '1 BTC 클럽', desc: '비트코인 1개 이상 보유' },
    { id: 'dca', ico: '🤖', name: '꾸준함의 힘', desc: 'DCA 봇 첫 자동매수' },
    { id: 'x2', ico: '👑', name: '자산 2배', desc: '원금 대비 +100%' },
    { id: 'goal', ico: '🎯', name: '목표 달성', desc: '목표 자산 도달' },
  ];
  function unlock(id) {
    if (S.badges[id]) return;
    const b = BADGES.find((x) => x.id === id);
    if (!b) return;
    S.badges[id] = Date.now();
    save();
    setTimeout(() => {
      toast(`🏆 업적 달성: ${b.ico} ${b.name}`, b.desc, 'win');
      sfx('badge');
      confetti(80);
    }, 900);
  }
  function checkBadges(tr) {
    const n = S.trades.length;
    unlock('first');
    if (n >= 10) unlock('t10');
    if (n >= 100) unlock('t100');
    if (tr && tr.side === 'ask') {
      if (tr.pnlRate >= 0.05) unlock('win5');
      if (tr.pnlRate >= 0.2) unlock('win20');
      if (tr.pnlRate >= 1) unlock('win100');
      if (tr.pnlRate <= -0.05) unlock('cut');
    }
    if (tr && tr.kind === 'dca') unlock('dca');
    if (S.realized >= 1e6) unlock('r1m');
    if (S.realized >= 1e7) unlock('r10m');
    if (S.realized >= 1e8) unlock('r100m');
    if (Object.keys(S.holdings).length >= 5) unlock('div5');
    if ((S.holdings['KRW-BTC']?.qty || 0) >= 1) unlock('btc1');
  }
  function renderBadges() {
    const on = BADGES.filter((b) => S.badges[b.id]).length;
    $('#badgeCount').textContent = `${on} / ${BADGES.length}`;
    $('#badges').innerHTML = BADGES.map((b) => `<div class="badge${S.badges[b.id] ? ' on' : ''}" title="${S.badges[b.id] ? timeStr(S.badges[b.id]) + ' 달성' : '미달성'}">
      <div class="ico">${b.ico}</div><b>${b.name}</b><small>${b.desc}</small></div>`).join('');
  }

  /* =========================================================
   * 자산관리 화면
   * ========================================================= */
  function fillCoinSelects() {
    const opts = codes.slice().sort((a, b) => (T[b]?.vol || 0) - (T[a]?.vol || 0))
      .map((c) => `<option value="${c}">${M[c].kor} (${M[c].sym})</option>`).join('');
    $('#mCoin').innerHTML = opts;
    $('#dCoin').innerHTML = opts;
    $('#mCoin').value = cur;
    $('#dCoin').value = 'KRW-BTC';
    loadHoldingEditor();
  }
  function loadHoldingEditor() {
    const c = $('#mCoin').value, h = S.holdings[c];
    $('#mQty').value = h ? fmtQty(h.qty) : '';
    $('#mAvg').value = h ? fmtPrice(h.avg) : (T[c] ? fmtPrice(T[c].price) : '');
  }
  function renderManage() {
    $('#mKrw').textContent = fmtKRW(S.krw) + ' KRW';
    $('#sGoal').placeholder = fmtKRW(S.goal);
    $('#sSeedInput').placeholder = fmtKRW(DEFAULT_SEED);
    $('#dcaList').innerHTML = S.dca.length ? S.dca.map((d) => {
      const m = M[d.market] || { kor: d.market };
      const lbl = { 1: '1분', 5: '5분', 30: '30분', 60: '1시간', 1440: '매일', 10080: '매주' }[d.min] || d.min + '분';
      return `<li><div class="info"><b>${m.kor}</b> ${fmtKRW(d.amount)}원 · ${lbl}
        <small>${d.on ? '다음 실행 ' + timeStr(d.next) : '일시정지'} · 누적 ${d.runs || 0}회 ${fmtKRW(d.spent || 0)}원</small></div>
        <button data-dca-run="${d.id}">지금 실행</button>
        <button data-dca-toggle="${d.id}">${d.on ? '정지' : '재개'}</button>
        <button data-dca-del="${d.id}">삭제</button></li>`;
    }).join('') : '<li class="muted">등록된 봇이 없어요. 대표님의 DCA 원칙을 여기서 연습해 보세요.</li>';
  }
  function runDca(d, manual) {
    if (!T[d.market]) return;
    if (d.amount * (1 + FEE) > availKrw()) {
      if (manual) fail('KRW 잔고가 부족해 자동매수를 건너뜁니다.');
      else { toast('🤖 DCA 봇', `${M[d.market]?.kor} 잔고 부족으로 이번 회차를 건너뛰었어요.`, 'fail'); }
      return;
    }
    const p = bestAsk(d.market);
    const tr = execute(d.market, 'bid', p, floor8(d.amount / p), 'dca');
    d.runs = (d.runs || 0) + 1;
    d.spent = (d.spent || 0) + tr.amount;
    save();
    renderManage();
  }
  function dcaLoop() {
    const now = Date.now();
    let changed = false;
    for (const d of S.dca) {
      if (!d.on || now < d.next) continue;
      d.next = now + d.min * 60000;
      changed = true;
      runDca(d);
    }
    if (changed) { save(); renderManage(); }
  }

  /* =========================================================
   * 도파민 효과: 사운드 / 컨페티 / 토스트 / 플로팅 텍스트
   * ========================================================= */
  let actx = null;
  function audio() {
    if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
    if (actx.state === 'suspended') actx.resume();
    return actx;
  }
  function tone(freq, start, dur, type = 'triangle', vol = 0.15) {
    const a = audio(); if (!a) return;
    const o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.value = freq;
    const t = a.currentTime + start;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(a.destination);
    o.start(t); o.stop(t + dur + 0.05);
  }
  function sfx(kind, level = 1) {
    if (!S.sound) return;
    switch (kind) {
      case 'buy': tone(988, 0, 0.12, 'square', 0.06); tone(1319, 0.08, 0.3, 'square', 0.06); break;
      case 'order': tone(660, 0, 0.1, 'sine', 0.1); tone(880, 0.07, 0.15, 'sine', 0.1); break;
      case 'win': {
        const notes = [523, 659, 784, 1047, 1319, 1568, 2093];
        const n = Math.min(notes.length, 3 + level);
        for (let i = 0; i < n; i++) tone(notes[i], i * 0.07, 0.35, 'triangle', 0.12);
        if (level >= 3) for (let i = 0; i < 8; i++) tone(2000 + Math.random() * 1500, 0.5 + i * 0.05, 0.08, 'square', 0.03);
        break;
      }
      case 'lose': tone(392, 0, 0.18, 'sine', 0.1); tone(330, 0.15, 0.3, 'sine', 0.1); break;
      case 'badge': [784, 988, 1175, 1568].forEach((f, i) => tone(f, i * 0.09, 0.4, 'triangle', 0.1)); break;
      case 'ath': [659, 880, 1109, 1319].forEach((f, i) => tone(f, i * 0.06, 0.3, 'sine', 0.1)); break;
      case 'error': tone(220, 0, 0.2, 'sawtooth', 0.05); break;
    }
  }

  const fx = $('#fx'), fctx = fx.getContext('2d');
  let parts = [], fxRunning = false;
  function sizeFx() {
    const dpr = window.devicePixelRatio || 1;
    fx.width = innerWidth * dpr; fx.height = innerHeight * dpr;
    fctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  sizeFx();
  addEventListener('resize', sizeFx);
  function confetti(n = 120, opts = {}) {
    const colors = ['#ffd34d', '#ff7a2e', '#c84a31', '#1261c4', '#3ddc84', '#c23fd1', '#ffffff'];
    const W = innerWidth, H = innerHeight;
    for (let i = 0; i < n; i++) {
      const fromSide = i % 2 ? 1 : -1;
      parts.push({
        x: opts.rain ? Math.random() * W : W / 2 + fromSide * W * 0.25 * Math.random(),
        y: opts.rain ? -20 - Math.random() * H * 0.6 : H * 0.55,
        vx: opts.rain ? (Math.random() - 0.5) * 2 : (Math.random() - 0.5) * 14,
        vy: opts.rain ? 2 + Math.random() * 3 : -10 - Math.random() * 10,
        r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3,
        s: 6 + Math.random() * 6,
        c: colors[(Math.random() * colors.length) | 0],
        e: opts.emoji ? opts.emoji[(Math.random() * opts.emoji.length) | 0] : null,
        life: 0,
      });
    }
    if (!fxRunning) { fxRunning = true; requestAnimationFrame(fxLoop); }
  }
  function fxLoop() {
    const W = innerWidth, H = innerHeight;
    fctx.clearRect(0, 0, W, H);
    parts = parts.filter((p) => p.y < H + 40 && p.life < 400);
    for (const p of parts) {
      p.life++;
      p.vy += 0.32; p.vx *= 0.99; p.vy = Math.min(p.vy, p.e ? 6 : 8);
      p.x += p.vx; p.y += p.vy; p.r += p.vr;
      fctx.save(); fctx.translate(p.x, p.y); fctx.rotate(p.r);
      if (p.e) { fctx.font = `${p.s * 2.6}px serif`; fctx.fillText(p.e, -p.s, p.s); }
      else { fctx.fillStyle = p.c; fctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); }
      fctx.restore();
    }
    if (parts.length) requestAnimationFrame(fxLoop); else { fxRunning = false; fctx.clearRect(0, 0, W, H); }
  }
  function floater(html, color, mega) {
    const el = document.createElement('div');
    el.className = 'floater' + (mega ? ' mega' : '');
    el.style.color = color;
    el.innerHTML = html;
    $('#floaters').appendChild(el);
    setTimeout(() => el.remove(), 2300);
  }
  function toast(title, body, kind = '') {
    const el = document.createElement('div');
    el.className = 'toast ' + kind;
    el.innerHTML = `<b>${title}</b><span>${body}</span>`;
    const box = $('#toasts');
    box.prepend(el);
    while (box.children.length > 4) box.lastChild.remove();
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }, kind === 'win' ? 4200 : 2800);
  }
  function celebrate(tr) {
    const m = M[tr.market] || { kor: tr.market, sym: '' };
    if (tr.side === 'bid') {
      toast(`${m.kor} 매수 체결${tr.kind === 'dca' ? ' 🤖' : ''}`, `${fmtPrice(tr.price)} KRW × ${fmtQty(tr.qty)} ${m.sym} = ${fmtKRW(tr.amount)}원`, 'bid');
      sfx('buy');
      confetti(18);
      return;
    }
    const r = tr.pnlRate || 0;
    if (tr.pnl > 0) {
      const level = r >= 0.5 ? 4 : r >= 0.2 ? 3 : r >= 0.05 ? 2 : 1;
      toast(`💸 ${m.kor} 익절!`, `실현수익 ${fmtSigned(tr.pnl)}원 (${fmtPct(r)})`, 'win');
      floater(`+${fmtKRW(tr.pnl)}원<small>${fmtPct(r)}</small>`, '#e5a50a', level >= 3);
      sfx('win', level);
      confetti(60 + level * 60);
      if (level >= 2) setTimeout(() => confetti(40 * level, { rain: true, emoji: ['💰', '🪙', '💵', '🔥'] }), 300);
      if (level >= 3) { document.body.classList.add('shake'); setTimeout(() => document.body.classList.remove('shake'), 600); }
    } else {
      toast(`${m.kor} 매도 체결`, `실현손익 ${fmtSigned(tr.pnl)}원 (${fmtPct(r)}) — 다음 기회를 노려요`, 'ask');
      floater(`${fmtSigned(tr.pnl)}원<small>${fmtPct(r)}</small>`, '#1261c4');
      sfx('lose');
    }
  }

  /* =========================================================
   * 가족 모드
   *  - 마스터 기기만 ECDSA 개인키를 보유 → 지급/회수/초기화 코드에 서명
   *  - 가족 기기는 초대 시 받은 마스터 공개키로 서명을 검증한 코드만 반영
   *  - 서버 없이 링크(#tx=...)로 주고받으며, 각 코드는 1회만 사용 가능
   * ========================================================= */
  const te = new TextEncoder(), td = new TextDecoder();
  const b64u = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const unb64u = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));
  const ALG = { name: 'ECDSA', namedCurve: 'P-256' };
  const SIG = { name: 'ECDSA', hash: 'SHA-256' };
  const isMaster = () => S.role === 'master';
  const isMember = () => S.role === 'member';
  const linkOf = (code) => `${location.origin}${location.pathname}#tx=${code}`;
  let unlocked = false;
  // 링크로 들어오는 문자열은 화면에 그대로 쓰이므로 태그 문자 제거 + 길이 제한
  const clean = (v, n = 20) => String(v ?? '').replace(/[<>&"'`]/g, '').slice(0, n);
  const num = (v) => (Number.isFinite(Number(v)) ? Math.round(Number(v)) : NaN);

  async function sha256Hex(str) {
    const h = await crypto.subtle.digest('SHA-256', te.encode(str));
    return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  async function signCode(obj) {
    const body = te.encode(JSON.stringify(obj));
    const key = await crypto.subtle.importKey('jwk', S.family.priv, ALG, false, ['sign']);
    const sig = await crypto.subtle.sign(SIG, key, body);
    return b64u(body) + '.' + b64u(sig);
  }
  const plainCode = (obj) => b64u(te.encode(JSON.stringify(obj))) + '.';
  async function verifyCode(code, pub) {
    const [b, s] = code.split('.');
    if (!s) return false;
    try {
      const key = await crypto.subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', x: pub.x, y: pub.y, ext: true }, ALG, false, ['verify']);
      return await crypto.subtle.verify(SIG, key, unb64u(s), unb64u(b));
    } catch (e) { return false; }
  }
  function decodeCode(input) {
    let code = String(input || '').trim();
    const m = code.match(/#tx=([A-Za-z0-9_\-.]+)/);
    if (m) code = m[1];
    if (!/^[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]*$/.test(code)) return null;
    try { return { code, p: JSON.parse(td.decode(unb64u(code.split('.')[0]))) }; } catch (e) { return null; }
  }

  async function becomeMaster() {
    const kp = await crypto.subtle.generateKey(ALG, true, ['sign', 'verify']);
    const priv = await crypto.subtle.exportKey('jwk', kp.privateKey);
    const pub = await crypto.subtle.exportKey('jwk', kp.publicKey);
    S.role = 'master';
    S.family = { id: uid(), mn: '대표님', pub: { x: pub.x, y: pub.y }, priv, members: [], issued: [], reports: {} };
    unlocked = true;
    save(); applyRole();
  }

  /** 링크/붙여넣기로 들어온 코드 처리 */
  async function handleCode(input) {
    const d = decodeCode(input);
    if (!d) return fail('올바른 코드가 아니에요.');
    const { code, p } = d;
    if (p.t === 'inv') return acceptInvite(code, p);
    if (p.t === 'grant') return acceptGrant(code, p);
    if (p.t === 'rep') return acceptReport(p);
    if (p.t === 'board') return acceptBoard(code, p);
    fail('알 수 없는 코드예요.');
  }

  async function acceptInvite(code, p) {
    if (!p.pk || !(await verifyCode(code, p.pk))) return fail('초대 코드가 손상됐어요.');
    p.name = clean(p.name, 12); p.emoji = clean(p.emoji, 4); p.mn = clean(p.mn, 12); p.amt = num(p.amt);
    if (!(p.amt >= 0)) return fail('초대 코드가 손상됐어요.');
    if (isMaster()) return fail('마스터 기기에서는 초대 링크를 쓸 수 없어요. 가족 폰에서 열어주세요.');
    const join = () => {
      const keep = { theme: S.theme, sound: S.sound, favorites: S.favorites, tf: S.tf, lastMarket: S.lastMarket, welcomed: true };
      S = Object.assign(freshState(p.amt), keep);
      S.role = 'member';
      S.family = {
        id: p.fam, mn: p.mn, pub: p.pk, mid: p.mid, name: p.name, emoji: p.emoji,
        used: [p.n], grants: [{ amt: p.amt, op: 'add', memo: '시작 투자금', ts: Date.now() }], board: null,
      };
      save(); applyRole(); refreshAll(); renderList();
      $('#onboard').classList.add('hidden');
      toast(`${p.emoji} ${p.name}님, 가족 거래소에 오신 걸 환영해요!`, `${p.mn}이 투자금 ${fmtKRW(p.amt)}원을 보내줬어요.`, 'win');
      sfx('badge'); confetti(140); setTimeout(() => confetti(60, { rain: true, emoji: ['💵', '💰', '🪙'] }), 300);
    };
    if (isMember()) {
      if (S.family.id === p.fam && S.family.mid === p.mid && S.family.used.includes(p.n)) return toast('이미 참여 중이에요', `${S.family.emoji} ${S.family.name}`, '');
      return modal('초대 링크로 다시 시작', `<p>지금 기기의 투자 기록이 모두 지워지고<br><b>${p.emoji} ${p.name}</b> 계정으로 새로 시작해요.</p>`, join, 'danger');
    }
    join();
  }

  async function acceptGrant(code, p) {
    if (!isMember()) return fail('지급 코드는 가족 기기에서만 받을 수 있어요.');
    const F = S.family;
    if (p.fam !== F.id || p.mid !== F.mid) return fail(`이 코드는 ${F.name}님 것이 아니에요.`);
    if (F.used.includes(p.n)) return fail('이미 사용한 코드예요.');
    if (!(await verifyCode(code, F.pub))) return fail('마스터가 발급한 코드가 아니에요.');
    p.amt = num(p.amt); p.memo = clean(p.memo, 30);
    if (!Number.isFinite(p.amt) || (p.op === 'reset' && p.amt < 0)) return fail('코드가 손상됐어요.');
    F.used.push(p.n);
    if (p.op === 'reset') {
      const keep = { theme: S.theme, sound: S.sound, favorites: S.favorites, tf: S.tf, lastMarket: S.lastMarket, welcomed: true, role: 'member', family: F };
      S = Object.assign(freshState(p.amt), keep);
      F.grants.unshift({ amt: p.amt, op: 'reset', memo: p.memo || '새 출발', ts: Date.now() });
      toast('🔄 계정 초기화', `${fmtKRW(p.amt)}원으로 새로 시작해요.`, 'win');
      confetti(100);
    } else {
      let amt = p.amt;
      if (amt < 0) amt = -Math.min(-amt, availKrw()); // 주문가능 금액까지만 회수
      S.krw += amt;
      S.seed = Math.max(0, S.seed + amt);
      F.grants.unshift({ amt, op: 'add', memo: p.memo || '', ts: Date.now() });
      if (amt >= 0) {
        toast(`💸 ${F.mn}이 ${fmtKRW(amt)}원을 보냈어요!`, p.memo || '투자금 충전 완료', 'win');
        floater(`+${fmtKRW(amt)}원<small>투자금 도착</small>`, '#e5a50a');
        sfx('win', 2); confetti(80, { rain: true, emoji: ['💵', '💰', '🪙'] });
      } else {
        toast('투자금 회수', `${fmtKRW(amt)}원 (${p.memo || '마스터 회수'})`, 'ask');
        sfx('lose');
      }
    }
    if (F.grants.length > 100) F.grants.length = 100;
    rebaseAth(); save(); refreshAll(); renderList();
  }

  function acceptReport(p) {
    if (!isMaster()) return fail('성적표는 마스터 기기에서만 받을 수 있어요.');
    const F = S.family;
    const mem = F.members.find((m) => m.mid === p.mid);
    if (p.fam !== F.id || !mem) return fail('우리 가족 성적표가 아니에요.');
    p.total = num(p.total); p.seed = num(p.seed); p.ts = num(p.ts);
    if (!Number.isFinite(p.total) || !Number.isFinite(p.seed) || !Number.isFinite(p.ts)) return fail('성적표가 손상됐어요.');
    const prev = F.reports[p.mid];
    if (prev && prev.ts >= p.ts) return toast('이미 반영된 성적표예요', mem.name, '');
    F.reports[p.mid] = p;
    save(); renderFamily();
    toast(`${mem.emoji} ${mem.name}님 성적표 도착`, `총자산 ${fmtKRW(p.total)}원 · 원금 대비 ${fmtPct(p.seed ? p.total / p.seed - 1 : 0)}`, 'bid');
    sfx('order');
  }

  async function acceptBoard(code, p) {
    if (!isMember()) return isMaster() ? toast('마스터 기기에는 이미 랭킹이 있어요', '', '') : fail('가족 기기에서 열어주세요.');
    if (p.fam !== S.family.id || !(await verifyCode(code, S.family.pub))) return fail('우리 가족 랭킹이 아니에요.');
    S.family.board = p;
    save(); renderFamily();
    toast('🏁 가족 랭킹 업데이트', '자산관리 탭에서 확인하세요', 'bid');
  }

  /* ---------- 마스터: 코드 발급 ---------- */
  function shareModal(title, desc, code) {
    const url = linkOf(code);
    modal(title, `<p class="muted">${desc}</p><textarea class="share-box" readonly>${url}</textarea>
      <div class="form-line" style="margin-top:8px"><button class="btn ghost" id="shCopy">📋 복사</button>${navigator.share ? '<button class="btn" id="shShare">📤 카톡 등으로 보내기</button>' : ''}</div>`,
      null, '', '닫기');
    $('#modalCancel').classList.add('hidden');
    const ta = $('#modalBody .share-box');
    ta.onclick = () => ta.select();
    $('#shCopy').onclick = async () => {
      try { await navigator.clipboard.writeText(url); } catch (e) { ta.select(); document.execCommand('copy'); }
      toast('링크 복사 완료', '메신저에 붙여넣어 보내세요', 'bid');
    };
    const sh = $('#shShare');
    if (sh) sh.onclick = () => navigator.share({ title: 'TEDDY X', text: title, url }).catch(() => {});
  }
  async function issueInvite(mem) {
    const F = S.family;
    const code = await signCode({ t: 'inv', fam: F.id, mn: F.mn, pk: F.pub, mid: mem.mid, name: mem.name, emoji: mem.emoji, amt: mem.start, n: uid(), ts: Date.now() });
    shareModal(`${mem.emoji} ${mem.name}님 초대 링크`, `${mem.name}님 폰에서 이 링크를 열면 시작 투자금 <b>${fmtKRW(mem.start)}원</b>으로 가족 거래소에 참여해요.`, code);
  }
  async function issueGrant(mem, op, amt, memo) {
    const F = S.family;
    const n = uid();
    const code = await signCode({ t: 'grant', fam: F.id, mid: mem.mid, op, amt, memo, n, ts: Date.now() });
    F.issued.unshift({ n, mid: mem.mid, op, amt, memo, ts: Date.now() });
    if (F.issued.length > 300) F.issued.length = 300;
    if (op === 'reset') { mem.granted = amt; mem.start = amt; } else mem.granted = (mem.granted || 0) + amt;
    save(); renderFamily();
    const label = op === 'reset' ? `${fmtKRW(amt)}원으로 초기화` : amt >= 0 ? `${fmtKRW(amt)}원 지급` : `${fmtKRW(-amt)}원 회수`;
    shareModal(`${mem.emoji} ${mem.name}님 ${label} 코드`, `${mem.name}님이 이 링크를 열면 바로 반영돼요. 코드는 <b>1회만</b> 사용할 수 있어요.`, code);
  }
  function selfRow() {
    const pf = portfolio();
    const name = isMaster() ? S.family.mn : S.family.name;
    const emoji = isMaster() ? '👑' : S.family.emoji;
    return { mid: isMaster() ? 'master' : S.family.mid, name, emoji, total: pf.total, seed: S.seed, ts: Date.now(), me: true };
  }
  async function shareBoard() {
    const F = S.family;
    const rows = [selfRow()].concat(F.members.filter((m) => F.reports[m.mid]).map((m) => {
      const r = F.reports[m.mid];
      return { mid: m.mid, name: m.name, emoji: m.emoji, total: r.total, seed: r.seed, ts: r.ts };
    })).map(({ me, ...r }) => r);
    const code = await signCode({ t: 'board', fam: F.id, rows, ts: Date.now() });
    shareModal('🏁 가족 랭킹 공유', '가족이 이 링크를 열면 각자 앱에서 현재 랭킹을 볼 수 있어요.', code);
  }
  function sendReport() {
    const F = S.family, pf = portfolio();
    const code = plainCode({ t: 'rep', fam: F.id, mid: F.mid, name: F.name, emoji: F.emoji, total: Math.round(pf.total), seed: Math.round(S.seed), realized: Math.round(S.realized), trades: S.trades.length, ts: Date.now() });
    shareModal('📤 내 성적표', `${F.mn}에게 이 링크를 보내면 가족 랭킹에 반영돼요.`, code);
  }

  /* ---------- 렌더 ---------- */
  function applyRole() {
    const b = document.body;
    b.classList.toggle('role-master', isMaster());
    b.classList.toggle('role-member', isMember());
    b.classList.toggle('has-family', isMember() || (isMaster() && S.family.members.length > 0));
    const badge = $('#roleBadge');
    if (isMaster()) { badge.textContent = '👑 마스터'; badge.className = 'role-badge master'; }
    else if (isMember()) { badge.textContent = `${S.family.emoji} ${S.family.name}`; badge.className = 'role-badge'; }
    else { badge.textContent = ''; }
    const lbl = isMember() ? '내 지갑' : '자산관리';
    $('#navManage').textContent = lbl;
    $('#mtabManage').textContent = lbl;
  }
  function renderBoard() {
    let rows;
    if (isMaster()) {
      const F = S.family;
      rows = [selfRow()].concat(F.members.map((m) => {
        const r = F.reports[m.mid];
        return r ? { mid: m.mid, name: m.name, emoji: m.emoji, total: r.total, seed: r.seed, ts: r.ts } : { mid: m.mid, name: m.name, emoji: m.emoji, none: true };
      }));
      $('#boardTime').textContent = '성적표를 받으면 갱신돼요';
    } else {
      const bd = S.family.board;
      rows = (bd ? bd.rows.filter((r) => r.mid !== S.family.mid) : []).concat([selfRow()]);
      $('#boardTime').textContent = bd ? `${timeStr(bd.ts)} 기준 (내 기록은 실시간)` : '마스터가 랭킹을 공유하면 보여요';
    }
    const rate = (r) => (r.none || !r.seed ? -Infinity : r.total / r.seed - 1);
    rows.sort((a, b) => rate(b) - rate(a));
    const medal = ['🥇', '🥈', '🥉'];
    $('#board').innerHTML = rows.map((r, i) => {
      const rt = rate(r);
      return `<div class="board-row${r.me ? ' me' : ''}">
        <div class="rk">${r.none ? '-' : medal[i] || i + 1}</div><div class="av">${r.emoji}</div>
        <div class="nm"><b>${r.name}${r.me ? ' (나)' : ''}</b><small>${r.none ? '아직 성적표 없음' : `총자산 ${fmtHuman(r.total)}원 · 원금 ${fmtHuman(r.seed)}원`}</small></div>
        <div class="rt ${r.none ? '' : cls(rt)}">${r.none ? '-' : fmtPct(rt)}<small>${r.none || r.me ? '' : timeStr(r.ts)}</small></div>
      </div>`;
    }).join('');
  }
  function renderFamily() {
    applyRole();
    if (isMaster()) {
      const F = S.family;
      $('#fMembers').innerHTML = F.members.length ? F.members.map((m) => {
        const r = F.reports[m.mid];
        return `<li data-mid="${m.mid}"><div class="av">${m.emoji}</div>
          <div class="mi"><b>${m.name}</b><small>누적 지급 ${fmtKRW(m.granted || 0)}원${r ? ` · 최근 총자산 ${fmtKRW(r.total)}원 (${fmtPct(r.seed ? r.total / r.seed - 1 : 0)})` : ''}</small></div>
          <div class="ma"><input inputmode="numeric" placeholder="금액" class="fm-amt" />
            <button class="plus" data-act="add">＋지급</button><button class="minus" data-act="sub">－회수</button>
            <button data-act="reset">초기화</button><button data-act="invite">초대링크</button><button data-act="del">삭제</button></div></li>`;
      }).join('') : '<li class="muted" style="display:block">아직 초대한 가족이 없어요. 이름과 시작 투자금을 넣고 초대 링크를 만들어 보세요.</li>';
    }
    if (isMember()) {
      const F = S.family;
      $('#wTitle').textContent = `${F.emoji} ${F.name}의 지갑`;
      $('#wMaster').textContent = `마스터: 👑 ${F.mn}`;
      $('#wGrants').innerHTML = F.grants.slice(0, 15).map((g) => `<li><span>${g.op === 'reset' ? '🔄 초기화' : g.amt >= 0 ? '💸 받음' : '↩️ 회수'} <small>${g.memo || ''}</small></span><span><b class="${g.amt >= 0 ? 'rise' : 'fall'}">${g.op === 'reset' ? fmtKRW(g.amt) : fmtSigned(g.amt)}원</b> <small>${timeStr(g.ts)}</small></span></li>`).join('');
    }
    if (document.body.classList.contains('has-family')) renderBoard();
  }

  /* ---------- PIN 잠금 (마스터 기기) ---------- */
  function requestPin(then) {
    modal('🔒 마스터 PIN 입력', '<input id="pinIn" type="password" inputmode="numeric" maxlength="8" placeholder="PIN" autocomplete="off" style="text-align:center;font-size:20px;letter-spacing:6px" />', async () => {
      const v = $('#pinIn') ? $('#pinIn').value : '';
      if ((await sha256Hex('tx-pin:' + v)) === S.pinHash) { unlocked = true; then && then(); }
      else { fail('PIN이 맞지 않아요.'); }
    }, '', '잠금 해제');
    setTimeout(() => $('#pinIn') && $('#pinIn').focus(), 50);
  }
  /** 자산을 바꾸는 동작 전에 호출: 마스터 + (PIN 설정 시) 잠금 해제 상태여야 함 */
  function masterOk() {
    if (!isMaster()) { fail('자산 조정은 마스터만 할 수 있어요.'); return false; }
    if (S.pinHash && !unlocked) { requestPin(); return false; }
    return true;
  }

  function bindFamily() {
    $('#obJoin').onclick = () => { $('#obJoinBox').classList.remove('hidden'); $('#obCode').focus(); };
    $('#obJoinGo').onclick = () => handleCode($('#obCode').value);
    $('#obMaster').onclick = async () => {
      await becomeMaster();
      $('#onboard').classList.add('hidden');
      refreshAll();
      toast('👑 마스터 모드 시작', '자산관리 탭에서 가족을 초대해 보세요.', 'win');
      confetti(80);
    };
    $('#wRedeem').onclick = () => { handleCode($('#wCode').value); $('#wCode').value = ''; };
    $('#btnInstall').onclick = installApp;
    $$('.paste-btn').forEach((b) => b.onclick = async () => {
      const el = $('#' + b.dataset.paste);
      try { el.value = (await navigator.clipboard.readText()).trim(); } catch (e) { el.focus(); toast('붙여넣기', '입력칸을 길게 눌러 붙여넣어 주세요.', ''); }
    });
    $('#wReport').onclick = sendReport;
    $('#fInvite').onclick = () => {
      if (!masterOk()) return;
      const name = clean($('#fName').value.trim(), 12), amt = Math.round(parseNum($('#fAmt').value));
      if (!name) return fail('이름을 입력하세요.');
      if (amt < MIN_ORDER) return fail(`시작 투자금은 ${fmtKRW(MIN_ORDER)}원 이상이어야 해요.`);
      const mem = { mid: uid(), name, emoji: $('#fEmoji').value, start: amt, granted: amt, created: Date.now() };
      S.family.members.push(mem);
      $('#fName').value = ''; $('#fAmt').value = '';
      save(); renderFamily();
      issueInvite(mem);
    };
    $('#fMembers').onclick = (e) => {
      const b = e.target.closest('button[data-act]'); if (!b) return;
      if (!masterOk()) return;
      const li = b.closest('li'), F = S.family;
      const mem = F.members.find((m) => m.mid === li.dataset.mid); if (!mem) return;
      const amt = Math.round(parseNum(li.querySelector('.fm-amt').value));
      const act = b.dataset.act;
      if (act === 'invite') return issueInvite(mem);
      if (act === 'del') {
        return modal('가족 삭제', `<p>${mem.emoji} ${mem.name}님을 목록에서 지울까요?<br><small class="muted">상대 폰의 데이터는 그대로 남아요.</small></p>`, () => {
          F.members = F.members.filter((m) => m !== mem); delete F.reports[mem.mid]; save(); renderFamily();
        }, 'danger');
      }
      if (amt <= 0) return fail('금액을 입력하세요.');
      if (act === 'add') return issueGrant(mem, 'add', amt, '마스터 지급');
      if (act === 'sub') return issueGrant(mem, 'add', -amt, '마스터 회수');
      if (act === 'reset') {
        return modal('계정 초기화 코드', `<p>${mem.emoji} ${mem.name}님의 코인·거래내역을 모두 지우고<br><b>${fmtKRW(amt)}원</b>으로 새로 시작하게 할까요?</p>`, () => issueGrant(mem, 'reset', amt, '새 출발'), 'danger');
      }
    };
    $('#fReportAdd').onclick = () => { handleCode($('#fReportIn').value); $('#fReportIn').value = ''; };
    $('#fBoardShare').onclick = shareBoard;
    $('#sPinSet').onclick = async () => {
      if (!masterOk()) return;
      const v = $('#sPin').value.trim();
      if (!v) { S.pinHash = null; save(); toast('PIN 해제', '마스터 잠금을 껐어요.', ''); return; }
      if (!/^\d{4,8}$/.test(v)) return fail('PIN은 숫자 4~8자리로 입력하세요.');
      S.pinHash = await sha256Hex('tx-pin:' + v);
      $('#sPin').value = ''; save();
      toast('🔒 PIN 설정 완료', '앱을 다시 열면 자산관리 진입 시 PIN을 물어봐요.', 'bid');
    };
    const onHash = () => {
      if (!location.hash.startsWith('#tx=')) return;
      const code = location.hash;
      history.replaceState(null, '', location.pathname + location.search);
      handleCode(code);
    };
    addEventListener('hashchange', onHash);
    return onHash;
  }

  /* ---------- 앱 설치 (홈 화면) ---------- */
  const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  let installEvt = null;
  addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e; });
  addEventListener('appinstalled', () => { installEvt = null; toast('📲 설치 완료!', '홈 화면의 TX 아이콘으로 실행하세요.', 'win'); confetti(80); });
  async function installApp() {
    if (installEvt) { installEvt.prompt(); await installEvt.userChoice.catch(() => {}); installEvt = null; return; }
    const ua = navigator.userAgent;
    const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
    const inApp = /KAKAOTALK|NAVER|Instagram|FBAN|FBAV|Line\//i.test(ua);
    const steps = inApp
      ? `<ol class="install-steps"><li>지금은 <b>카톡 등 앱 안의 브라우저</b>예요.</li><li>오른쪽 아래(또는 위) <b>⋮ / 공유</b> → <b>${ios ? 'Safari로 열기' : '다른 브라우저로 열기(Chrome)'}</b></li><li>열린 화면에서 이 버튼을 다시 눌러 주세요.</li></ol>`
      : ios
        ? `<ol class="install-steps"><li><b>Safari</b> 아래쪽 <b>공유 버튼(□↑)</b>을 눌러요.</li><li>목록을 내려 <b>홈 화면에 추가</b>를 눌러요.</li><li>오른쪽 위 <b>추가</b> → 홈 화면에 <b>TX 아이콘</b>이 생겨요.</li></ol>`
        : `<ol class="install-steps"><li><b>Chrome</b> 오른쪽 위 <b>⋮</b> 메뉴를 눌러요.</li><li><b>앱 설치</b> 또는 <b>홈 화면에 추가</b>를 눌러요.</li><li><b>설치</b> → 홈 화면에 <b>TX 아이콘</b>이 생겨요.</li></ol>`;
    modal('📲 앱으로 설치하기', steps + `<p class="muted tiny" style="margin-top:12px">⚠️ 설치한 앱은 브라우저와 저장공간이 따로일 수 있어요. 가족은 <b>앱을 먼저 설치</b>한 뒤, 초대·지급 링크를 <b>복사해서 앱 안에 붙여넣기</b> 하세요.</p>`, null, '', '확인');
    $('#modalCancel').classList.add('hidden');
  }

  /** 시작 시 역할 결정: 링크로 들어왔으면 처리, 역할이 없으면 선택 화면 */
  function startFamily(onHash) {
    document.body.classList.toggle('standalone', isStandalone());
    if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch(() => {});
    applyRole();
    const hasCode = location.hash.startsWith('#tx=');
    if (!S.role && !(hasCode && decodeCode(location.hash)?.p?.t === 'inv')) $('#onboard').classList.remove('hidden');
    if (hasCode) onHash();
  }

  /* =========================================================
   * 모달
   * ========================================================= */
  let modalOk = null;
  function modal(title, html, onOk, okClass = '', okText = '확인') {
    $('#modalTitle').textContent = title;
    $('#modalBody').innerHTML = html;
    $('#modalOk').className = 'btn ' + okClass;
    $('#modalOk').textContent = okText;
    $('#modalCancel').classList.remove('hidden');
    modalOk = onOk;
    $('#modal').classList.remove('hidden');
  }
  const closeModal = () => { $('#modal').classList.add('hidden'); modalOk = null; };

  /* =========================================================
   * 화면 전환
   * ========================================================= */
  let view = 'exchange';
  const isMobile = () => matchMedia('(max-width: 860px)').matches;
  function go(v, mtab) {
    if (v === 'manage' && isMaster() && S.pinHash && !unlocked) return requestPin(() => go(v, mtab));
    view = v;
    $$('.view').forEach((el) => el.classList.toggle('active', el.id === 'view-' + v));
    $$('.topnav button').forEach((b) => b.classList.toggle('active', b.dataset.view === v));
    const tab = mtab || (v === 'exchange' ? (document.body.classList.contains('m-detail') ? 'detail' : 'list') : v);
    if (v === 'exchange') {
      document.body.classList.toggle('m-list', tab === 'list');
      document.body.classList.toggle('m-detail', tab === 'detail');
      chart.redraw();
    }
    $$('#bottomTab button').forEach((b) => b.classList.toggle('active', b.dataset.mtab === tab));
    if (v === 'invest') renderInvest();
    if (v === 'manage') { renderManage(); renderFamily(); }
    window.scrollTo(0, 0);
  }

  function selectMarket(code, openDetail) {
    if (!M[code]) code = 'KRW-BTC';
    const changed = code !== cur;
    cur = code; S.lastMarket = code; save();
    book = null; ticks = []; lastHeadPrice = null;
    $('#obBook').dataset.code = '';
    renderHead(); renderBook(); renderTrades(); renderAvail();
    if (changed || !chart.data.length) loadChart();
    resubscribe();
    if (otype === 'limit') $('#ofPrice').value = T[code] ? fmtPrice(T[code].price) : '';
    $('#ofQty').value = ''; $('#ofTotal').value = '';
    $('#mCoin').value = code; loadHoldingEditor();
    renderList();
    if (openDetail && isMobile()) go('exchange', 'detail');
  }

  function refreshAll() {
    renderTop();
    renderAvail();
    renderHead();
    renderOpenOrders();
    updateChartLines();
    if (view === 'invest') renderInvest();
    if (view === 'manage') { renderManage(); renderFamily(); }
  }

  /* =========================================================
   * 이벤트 바인딩
   * ========================================================= */
  function bind() {
    document.addEventListener('pointerdown', () => audio(), { once: true });
    $$('.topnav button').forEach((b) => b.onclick = () => go(b.dataset.view));
    $('.brand').onclick = () => go('exchange', isMobile() ? 'list' : undefined);
    $('#topAssets').onclick = () => go('invest');
    $$('#bottomTab button, .m-back').forEach((b) => b.onclick = () => {
      const t = b.dataset.mtab;
      go(t === 'list' || t === 'detail' ? 'exchange' : t, t);
    });

    $('#btnSound').onclick = () => { S.sound = !S.sound; save(); applyPrefs(); if (S.sound) sfx('order'); };
    $('#btnTheme').onclick = () => { S.theme = S.theme === 'dark' ? 'light' : 'dark'; save(); applyPrefs(); };

    // 코인 목록
    $('#clBody').onclick = (e) => { const r = e.target.closest('.cl-row'); if (r) selectMarket(r.dataset.code, true); };
    $('#clSearch').oninput = (e) => { search = e.target.value; renderList(); };
    $$('#clTabs button').forEach((b) => b.onclick = () => {
      listTab = b.dataset.list;
      $$('#clTabs button').forEach((x) => x.classList.toggle('active', x === b));
      renderList();
    });
    $$('.cl-head span').forEach((s) => s.onclick = () => {
      if (sortKey === s.dataset.sort) sortAsc = !sortAsc; else { sortKey = s.dataset.sort; sortAsc = sortKey === 'name'; }
      $$('.cl-head span').forEach((x) => { x.classList.toggle('sorted', x === s); x.classList.toggle('asc', x === s && sortAsc); });
      renderList();
    });
    $('#chFav').onclick = () => {
      const i = S.favorites.indexOf(cur);
      if (i >= 0) S.favorites.splice(i, 1); else S.favorites.push(cur);
      save(); renderHead(); renderList();
    };

    // 차트
    $$('#tfSeg button').forEach((b) => {
      b.classList.toggle('active', b.dataset.tf === S.tf);
      b.onclick = () => {
        S.tf = b.dataset.tf; save();
        $$('#tfSeg button').forEach((x) => x.classList.toggle('active', x === b));
        loadChart();
      };
    });
    $('#zoomIn').onclick = () => chart.zoom(1.25);
    $('#zoomOut').onclick = () => chart.zoom(0.8);

    // 호가/체결 탭
    $$('#obTabs button').forEach((b) => b.onclick = () => {
      $$('#obTabs button').forEach((x) => x.classList.toggle('active', x === b));
      $('#obBook').classList.toggle('hidden', b.dataset.ob !== 'book');
      $('#obTrades').classList.toggle('hidden', b.dataset.ob !== 'trades');
      renderTrades();
    });
    $('#obBook').onclick = (e) => {
      const px = e.target.closest('[data-px]');
      if (!px) return;
      if (side === 'open') setSide('bid');
      otype = 'limit'; applyType();
      $('#ofPrice').value = fmtPrice(+px.dataset.px);
      syncFromQty();
    };

    // 주문 폼
    $$('#orderTabs button').forEach((b) => b.onclick = () => setSide(b.dataset.side));
    $$('#ordType button').forEach((b) => b.onclick = () => { otype = b.dataset.type; applyType(); $('#ofQty').value = ''; $('#ofTotal').value = ''; });
    const step = (dir) => {
      const p = parseNum($('#ofPrice').value) || lastPrice(cur);
      const t = tickSize(dir > 0 ? p : p - tickSize(p) / 2);
      $('#ofPrice').value = fmtPrice(Math.max(t, roundTick(p + dir * t)));
      syncFromQty();
    };
    $('#priceUp').onclick = () => step(1);
    $('#priceDown').onclick = () => step(-1);
    $('#ofPrice').oninput = syncFromQty;
    $('#ofQty').oninput = syncFromQty;
    $('#ofTotal').oninput = syncFromTotal;
    $('#ofTotal').onblur = () => { const v = parseNum($('#ofTotal').value); if (v) $('#ofTotal').value = fmtKRW(v); };
    $('#ofPrice').onblur = () => { const v = parseNum($('#ofPrice').value); if (v) $('#ofPrice').value = fmtPrice(roundTick(v)); syncFromQty(); };
    $$('#pctRow button').forEach((b) => b.onclick = () => fillPct(+b.dataset.pct));
    $('#ofReset').onclick = () => resetForm(false);
    $('#ofSubmit').onclick = submitOrder;
    $('#openOrders').onclick = (e) => { const b = e.target.closest('[data-cancel]'); if (b) cancelOrder(b.dataset.cancel); };

    // 투자내역
    $('#holdTbl').onclick = (e) => { const b = e.target.closest('[data-goto]'); if (b) { go('exchange', 'detail'); selectMarket(b.dataset.goto); } };
    $$('#histFilter button').forEach((b) => b.onclick = () => {
      histFilter = b.dataset.h;
      $$('#histFilter button').forEach((x) => x.classList.toggle('active', x === b));
      renderInvest();
    });

    // 자산관리: KRW
    const setKrw = (nv) => {
      if (!masterOk()) return;
      nv = Math.max(lockedKrw(), Math.round(nv));
      const delta = nv - S.krw;
      S.krw = nv;
      if ($('#mSeedSync').checked) S.seed = Math.max(0, Math.round(S.seed + delta));
      rebaseAth(); save(); refreshAll();
      toast('💰 KRW 잔고 변경', `${fmtSigned(delta)}원 → 보유 ${fmtKRW(S.krw)}원`, delta >= 0 ? 'bid' : 'ask');
      if (delta > 0) { sfx('buy'); confetti(30, { rain: true, emoji: ['💵', '💰'] }); }
    };
    $$('.quick-btns button').forEach((b) => b.onclick = () => setKrw(S.krw + Number(b.dataset.krw)));
    $('#mKrwSet').onclick = () => {
      const v = parseNum($('#mKrwInput').value);
      if (!$('#mKrwInput').value.trim()) return fail('금액을 입력하세요.');
      setKrw(v); $('#mKrwInput').value = '';
    };
    // 자산관리: 코인
    $('#mCoin').onchange = loadHoldingEditor;
    $('#mAvgNow').onclick = () => { const c = $('#mCoin').value; if (T[c]) $('#mAvg').value = fmtPrice(T[c].price); };
    $('#mCoinSet').onclick = () => {
      if (!masterOk()) return;
      const c = $('#mCoin').value, q = parseNum($('#mQty').value), a = parseNum($('#mAvg').value) || lastPrice(c);
      const old = S.holdings[c];
      const oldCost = old ? old.qty * old.avg : 0;
      if (q < lockedQty(c)) return fail('미체결 매도 주문 수량보다 적게 설정할 수 없어요.');
      if (q <= 0) delete S.holdings[c]; else S.holdings[c] = { qty: q, avg: a };
      if ($('#mCoinSeed').checked) S.seed = Math.max(0, Math.round(S.seed + (q * a - oldCost)));
      save(); checkBadges(); refreshAll(); renderList();
      toast('🪙 보유코인 설정 완료', `${M[c].kor} ${fmtQty(q)} ${M[c].sym} · 평단 ${fmtPrice(a)}원`, 'bid');
    };
    $('#mCoinDel').onclick = () => {
      if (!masterOk()) return;
      const c = $('#mCoin').value, old = S.holdings[c];
      if (!old) return;
      if (lockedQty(c) > 0) return fail('미체결 매도 주문을 먼저 취소하세요.');
      delete S.holdings[c];
      if ($('#mCoinSeed').checked) S.seed = Math.max(0, Math.round(S.seed - old.qty * old.avg));
      save(); refreshAll(); renderList(); loadHoldingEditor();
      toast('보유코인 삭제', M[c].kor, 'ask');
    };
    // DCA
    $('#dAdd').onclick = () => {
      const amt = parseNum($('#dAmt').value);
      if (amt < MIN_ORDER) return fail(`1회 매수금액은 ${fmtKRW(MIN_ORDER)}원 이상이어야 해요.`);
      const min = Number($('#dInt').value);
      S.dca.push({ id: uid(), market: $('#dCoin').value, amount: amt, min, on: true, next: Date.now() + min * 60000, runs: 0, spent: 0 });
      $('#dAmt').value = '';
      save(); renderManage();
      toast('🤖 DCA 봇 등록', `${M[$('#dCoin').value].kor} ${fmtKRW(amt)}원씩 적립 매수`, 'bid');
    };
    $('#dcaList').onclick = (e) => {
      const b = e.target.closest('button'); if (!b) return;
      const id = b.dataset.dcaRun || b.dataset.dcaToggle || b.dataset.dcaDel;
      const d = S.dca.find((x) => x.id === id); if (!d) return;
      if (b.dataset.dcaRun) runDca(d, true);
      if (b.dataset.dcaToggle) { d.on = !d.on; if (d.on) d.next = Date.now() + d.min * 60000; }
      if (b.dataset.dcaDel) S.dca = S.dca.filter((x) => x !== d);
      save(); renderManage();
    };
    // 설정
    $('#sGoalSet').onclick = () => {
      const g = parseNum($('#sGoal').value);
      if (g <= 0) return fail('목표 금액을 입력하세요.');
      S.goal = g; $('#sGoal').value = ''; save(); renderManage(); renderInvest();
      toast('🎯 목표 자산 설정', fmtHuman(g) + '원', 'bid');
    };
    $('#sReset').onclick = () => {
      if (!masterOk()) return;
      const seed = parseNum($('#sSeedInput').value) || DEFAULT_SEED;
      modal('전체 초기화', `<p>보유코인·거래내역·미체결·배지가 모두 삭제되고<br><b>${fmtKRW(seed)} KRW</b>로 새로 시작합니다.</p>`, () => {
        const keep = { theme: S.theme, sound: S.sound, goal: S.goal, favorites: S.favorites, tf: S.tf, lastMarket: S.lastMarket, role: S.role, family: S.family, pinHash: S.pinHash, welcomed: true };
        S = Object.assign(freshState(seed), keep);
        save(); refreshAll(); renderList(); loadHoldingEditor();
        toast('새 출발!', `${fmtKRW(seed)} KRW 지급 완료`, 'win');
        confetti(120);
      }, 'danger');
    };
    $('#sExport').onclick = () => {
      const blob = new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `teddyx-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    };
    $('#sImport').onchange = async (e) => {
      const f = e.target.files[0]; if (!f) return;
      if (!masterOk()) { e.target.value = ''; return; }
      try {
        const obj = JSON.parse(await f.text());
        if (typeof obj.krw !== 'number' || typeof obj.holdings !== 'object') throw new Error('형식 오류');
        S = Object.assign(freshState(), obj);
        save(); applyPrefs(); applyRole(); refreshAll(); renderList(); loadHoldingEditor();
        toast('백업 복원 완료', `총 ${S.trades.length}건의 거래내역`, 'win');
      } catch (err) { fail('백업 파일을 읽을 수 없어요.'); }
      e.target.value = '';
    };

    // 모달
    $('#modalCancel').onclick = closeModal;
    $('#modal').onclick = (e) => { if (e.target.id === 'modal') closeModal(); };
    $('#modalOk').onclick = () => { const f = modalOk; closeModal(); if (f) f(); };
    document.addEventListener('keydown', (e) => {
      if ($('#modal').classList.contains('hidden')) return;
      if (e.key === 'Escape') closeModal();
      if (e.key === 'Enter') $('#modalOk').click();
    });
  }

  function applyPrefs() {
    document.documentElement.dataset.theme = S.theme;
    $('#btnTheme').textContent = S.theme === 'dark' ? '☀️' : '🌙';
    $('#btnSound').textContent = S.sound ? '🔊' : '🔇';
    document.querySelector('meta[name=theme-color]').content = S.theme === 'dark' ? '#0b1a3a' : '#093687';
    chart.redraw();
  }

  /* =========================================================
   * 시작
   * ========================================================= */
  async function init() {
    applyPrefs();
    bind();
    startFamily(bindFamily());
    setSide('bid');
    await boot();
  }
  const MARKET_KEY = 'teddyx.markets.v1';
  function setMarkets(list) {
    list.forEach(([code, kor, eng]) => { if (code.startsWith('KRW-')) M[code] = { kor, eng, sym: code.slice(4) }; });
    codes = Object.keys(M);
  }
  /** 신규 상장 반영: 하루 한 번만 마켓 목록을 REST로 갱신 */
  async function refreshMarkets() {
    try {
      const all = await getJSON('/market/all?isDetails=false');
      const list = all.filter((m) => m.market.startsWith('KRW-')).map((m) => [m.market, m.korean_name, m.english_name]);
      if (!list.length) return;
      const before = codes.length;
      setMarkets(list);
      try { localStorage.setItem(MARKET_KEY, JSON.stringify({ at: Date.now(), list })); } catch (e) { /* ignore */ }
      if (codes.length !== before) { fillCoinSelects(); resubscribe(); }
    } catch (e) { /* 다음 실행 때 다시 시도 */ }
  }
  async function boot() {
    // 시작 시 REST 요청 없이: 내장(또는 저장된) 마켓 목록 → WebSocket 스냅샷으로 전체 시세 수신
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(MARKET_KEY) || 'null'); } catch (e) { /* ignore */ }
    setMarkets(saved?.list?.length ? saved.list : (window.TX_MARKETS || []));
    if (!saved || Date.now() - saved.at > 86400000) setTimeout(refreshMarkets, 30000);
    fillCoinSelects();
    connectWS();
    selectMarket(cur);
    refreshAll();
    renderList();

    setInterval(renderList, 1000);
    setInterval(() => { renderTop(); if (view === 'invest') renderInvest(); renderOpenOrders(); }, 1000);
    setInterval(dcaLoop, 5000);
    dcaLoop();

    if (isMaster() && !S.trades.length && !Object.keys(S.holdings).length && !S.welcomed) {
      S.welcomed = true; save();
      setTimeout(() => {
        toast('대표님, TEDDY X에 오신 걸 환영합니다! 🎉', `가상 시드 ${fmtKRW(S.krw)}원이 지급됐어요. 자산관리 탭에서 마음대로 조정할 수 있어요.`, 'win');
        confetti(100);
      }, 600);
    }
  }

  init();
})();
