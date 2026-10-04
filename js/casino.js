/* TEDDY X 카지노 — 가상 KRW로 즐기는 슬롯 / 떡상 크래시 / 코인 플립 */
(function () {
  'use strict';
  const X = window.TX;
  if (!X) return;
  const { $, $$, fmtKRW, fmtSigned, parseNum, cls, timeStr } = X;
  const MIN_BET = 1000;

  // 암호학적 난수 (0 이상 1 미만)
  const rand = () => crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296;
  const today = () => new Date().toLocaleDateString('sv-SE');

  function C() {
    const S = X.S;
    if (!S.casino) S.casino = { net: 0, plays: 0, day: today(), dayNet: 0, log: [], crashHist: [] };
    if (S.casino.day !== today()) { S.casino.day = today(); S.casino.dayNet = 0; }
    return S.casino;
  }
  const policy = () => (X.isMember() ? X.S.casinoPolicy || { on: false, limit: 0 } : { on: true, limit: 0 });
  const unlocked = () => policy().on;

  /** 베팅 가능 여부 확인 후 잔고에서 차감 */
  function takeBet(bet) {
    if (!unlocked()) { X.fail('카지노가 잠겨 있어요.'); return false; }
    if (!(bet >= MIN_BET)) { X.fail(`최소 베팅은 ${fmtKRW(MIN_BET)}원이에요.`); return false; }
    if (bet > X.availKrw()) { X.fail('KRW 잔고가 부족해요.'); return false; }
    const lim = policy().limit;
    if (lim > 0 && -C().dayNet + bet > lim) {
      X.fail(`오늘 카지노 손실 한도(${fmtKRW(lim)}원)를 넘을 수 있어요. 내일 다시 만나요!`);
      return false;
    }
    X.S.krw -= bet;
    X.save(); X.refreshAll(); render();
    return true;
  }
  /** 결과 반영: 당첨금 지급 + 기록 */
  function settle(game, bet, pay, note) {
    const c = C();
    X.S.krw += pay;
    c.net += pay - bet; c.dayNet += pay - bet; c.plays++;
    c.log.unshift({ g: game, bet, pay, note, ts: Date.now() });
    if (c.log.length > 40) c.log.length = 40;
    X.save(); X.refreshAll(); render();
  }
  function bigWin(mult, pay) {
    const mega = mult >= 50;
    X.floater(`+${fmtKRW(pay)}원<small>${mult}배!</small>`, '#e5a50a', mega || mult >= 10);
    X.sfx('win', mega ? 4 : mult >= 10 ? 3 : 2);
    X.confetti(mega ? 260 : mult >= 10 ? 160 : 70);
    if (mult >= 10) setTimeout(() => X.confetti(mega ? 160 : 60, { rain: true, emoji: ['💰', '🪙', '💵', '💎', '🔥'] }), 300);
    if (mult >= 10) { document.body.classList.add('shake'); setTimeout(() => document.body.classList.remove('shake'), 600); }
  }

  /* ---------- 공통 렌더 ---------- */
  const GAME_NAME = { slot: '🎰 슬롯', crash: '🚀 크래시', coin: '🪙 코인' };
  function render() {
    const c = C();
    $('#cBal').textContent = fmtKRW(X.availKrw());
    const set = (id, v) => { const el = $(id); el.textContent = fmtSigned(v); el.className = cls(v); };
    set('#cToday', c.dayNet); set('#cNet', c.net);
    $('#cPlays').textContent = c.plays.toLocaleString('ko-KR');
    const open = unlocked();
    $('#cLocked').classList.toggle('hidden', open);
    $('#cGames').classList.toggle('hidden', !open);
    if (!open) $('#cLockedMsg').textContent = `${X.S.family?.mn || '마스터'}이 카지노 허용 코드를 보내주면 열려요. (내 지갑 → 코드 받기)`;
    const lim = policy().limit;
    $('#cToday').title = lim ? `하루 손실 한도 ${fmtKRW(lim)}원` : '';
    $('#cLog').innerHTML = c.log.length ? c.log.slice(0, 15).map((l) => {
      const d = l.pay - l.bet;
      return `<li><span>${GAME_NAME[l.g]} <small>${l.note || ''}</small></span><span><b class="${cls(d)}">${fmtSigned(d)}원</b> <small>${timeStr(l.ts, false)}</small></span></li>`;
    }).join('') : '<li class="muted">아직 게임 기록이 없어요.</li>';
  }

  /* ---------- 베팅 입력 ---------- */
  function betOf(id) { return Math.floor(parseNum($('#' + id).value)); }
  function defaultBets() {
    const def = Math.max(MIN_BET, Math.min(10000, Math.floor(X.availKrw() / 100 / 1000) * 1000 || MIN_BET));
    for (const id of ['slotBet', 'crashBet', 'coinBet']) if (!$('#' + id).value) $('#' + id).value = fmtKRW(def);
  }
  $$('.bet-quick').forEach((q) => q.onclick = (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const inp = $('#' + q.dataset.for);
    let v = betOf(q.dataset.for) || MIN_BET;
    if (b.dataset.m === 'max') v = Math.floor(X.availKrw());
    else v = Math.max(MIN_BET, Math.floor(v * Number(b.dataset.m)));
    inp.value = fmtKRW(Math.min(v, Math.floor(X.availKrw())));
  });
  $$('.bet-in').forEach((i) => i.addEventListener('blur', () => { const v = parseNum(i.value); if (v && i.id !== 'crashAuto') i.value = fmtKRW(v); }));
  $$('#cTabs button').forEach((b) => b.onclick = () => {
    $$('#cTabs button').forEach((x) => x.classList.toggle('active', x === b));
    $$('.game').forEach((g) => g.classList.toggle('hidden', g.id !== 'g-' + b.dataset.game));
    if (b.dataset.game === 'crash') sizeCrash();
  });

  /* =========================================================
   * 🎰 슬롯 (기댓값 97.3%)
   * ========================================================= */
  const SYM = ['🍒', '🍋', '🔔', '💎', '🟠', '7️⃣'];
  const W = [30, 24, 18, 12, 7, 3];
  const PAY3 = { '🍒': 5, '🍋': 10, '🔔': 20, '💎': 50, '🟠': 150, '7️⃣': 777 };
  const WSUM = W.reduce((a, b) => a + b, 0);
  function pick() {
    let r = rand() * WSUM;
    for (let i = 0; i < SYM.length; i++) { r -= W[i]; if (r < 0) return SYM[i]; }
    return SYM[0];
  }
  function slotMult(a, b, c) {
    if (a === b && b === c) return PAY3[a];
    return [a, b, c].filter((x) => x === '🍒').length === 2 ? 1.5 : 0;
  }
  const strips = $$('#reels .strip');
  const reelEls = $$('#reels .reel');
  strips.forEach((s) => { s.innerHTML = `<div>${SYM[(Math.random() * 6) | 0]}</div>`; });
  let spinning = false;
  function spinSlot() {
    if (spinning) return;
    const bet = betOf('slotBet');
    if (!takeBet(bet)) return;
    spinning = true;
    $('#slotSpin').disabled = true;
    reelEls.forEach((r) => r.classList.remove('win'));
    $('#slotMsg').textContent = '두근두근…';
    const res = [pick(), pick(), pick()];
    const h = reelEls[0].clientHeight || 96;
    const tick = setInterval(() => X.tone(600 + Math.random() * 500, 0, 0.04, 'square', 0.03), 90);
    strips.forEach((s, i) => {
      const n = 18 + i * 7;
      const cells = Array.from({ length: n }, () => SYM[(rand() * 6) | 0]);
      cells.push(res[i]);
      s.style.transition = 'none';
      s.style.transform = 'translateY(0)';
      s.innerHTML = cells.map((x) => `<div style="height:${h}px">${x}</div>`).join('');
      void s.offsetHeight;
      const dur = 1.1 + i * 0.45;
      s.style.transition = `transform ${dur}s cubic-bezier(.15,.85,.25,1.04)`;
      s.style.transform = `translateY(-${n * h}px)`;
      setTimeout(() => X.tone(180, 0, 0.12, 'triangle', 0.12), dur * 1000);
    });
    setTimeout(() => {
      clearInterval(tick);
      strips.forEach((s, i) => { s.style.transition = 'none'; s.style.transform = 'translateY(0)'; s.innerHTML = `<div style="height:${h}px">${res[i]}</div>`; });
      const mult = slotMult(...res);
      const pay = Math.floor(bet * mult);
      settle('slot', bet, pay, res.join(''));
      if (mult > 0) {
        reelEls.forEach((r, i) => { if (mult >= 5 || res[i] === '🍒') r.classList.add('win'); });
        $('#slotMsg').textContent = mult >= 50 ? `💥 JACKPOT ${mult}배! +${fmtKRW(pay)}원` : `🎉 ${mult}배 당첨! +${fmtKRW(pay)}원`;
        if (mult >= 5) bigWin(mult, pay); else X.sfx('order');
        if (res[0] === '7️⃣' && mult === 777) X.unlock('jackpot');
      } else {
        $('#slotMsg').textContent = '아쉽다! 한 번 더?';
      }
      spinning = false;
      $('#slotSpin').disabled = false;
    }, (1.1 + 2 * 0.45) * 1000 + 150);
  }
  $('#slotSpin').onclick = spinSlot;

  /* =========================================================
   * 🚀 떡상 크래시 (하우스 엣지 1%)
   * ========================================================= */
  const cv = $('#crashCv'), ctx = cv.getContext('2d');
  const K = 0.12; // 배수 = e^(K·초) → 2배 약 5.8초, 10배 약 19초
  let run = null; // { bet, cp, start, cashed, auto, pts, done }
  function sizeCrash() {
    const r = cv.parentElement.getBoundingClientRect(), d = window.devicePixelRatio || 1;
    cv.width = Math.max(10, r.width * d); cv.height = Math.max(10, r.height * d);
    ctx.setTransform(d, 0, 0, d, 0, 0);
    drawCrash();
  }
  addEventListener('resize', sizeCrash);
  function drawCrash() {
    const W2 = cv.width / (window.devicePixelRatio || 1), H2 = cv.height / (window.devicePixelRatio || 1);
    ctx.clearRect(0, 0, W2, H2);
    if (!run) return;
    const t = run.t || 0, m = run.m || 1;
    const maxT = Math.max(8, t * 1.15), maxM = Math.max(2, m * 1.15);
    const xOf = (tt) => 20 + (tt / maxT) * (W2 - 50);
    const yOf = (mm) => H2 - 20 - ((mm - 1) / (maxM - 1)) * (H2 - 50);
    ctx.strokeStyle = 'rgba(255,255,255,.08)';
    for (let g = 1; g <= maxM; g += Math.max(1, Math.round(maxM / 5))) {
      ctx.beginPath(); ctx.moveTo(0, yOf(g)); ctx.lineTo(W2, yOf(g)); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.font = '10px sans-serif'; ctx.fillText(g + '×', 4, yOf(g) - 3);
    }
    const grad = ctx.createLinearGradient(0, H2, W2, 0);
    grad.addColorStop(0, '#3ddc84'); grad.addColorStop(1, run.boom ? '#ff4d4d' : '#ffd34d');
    ctx.strokeStyle = grad; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath();
    const steps = 60;
    for (let i = 0; i <= steps; i++) {
      const tt = (t * i) / steps, mm = Math.exp(K * tt);
      i ? ctx.lineTo(xOf(tt), yOf(mm)) : ctx.moveTo(xOf(tt), yOf(mm));
    }
    ctx.stroke();
    ctx.font = '30px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(run.boom ? '💥' : '🚀', xOf(t), yOf(m));
    if (run.cashedAt) {
      const ct = Math.log(run.cashedAt) / K;
      ctx.fillStyle = '#3ddc84'; ctx.beginPath(); ctx.arc(xOf(ct), yOf(run.cashedAt), 6, 0, Math.PI * 2); ctx.fill();
    }
    ctx.textAlign = 'start'; ctx.textBaseline = 'alphabetic';
  }
  function setCrashBtn(mode) {
    const b = $('#crashBtn');
    b.disabled = mode === 'wait';
    b.classList.toggle('cashout', mode === 'cash');
    b.textContent = mode === 'cash' ? `💰 익절! ${fmtKRW(Math.floor(run.bet * run.m))}원` : mode === 'wait' ? '폭발 지점 확인 중…' : '🚀 발사';
  }
  function startCrash() {
    const bet = betOf('crashBet');
    const auto = parseFloat(($('#crashAuto').value || '').replace(/[^\d.]/g, ''));
    if ($('#crashAuto').value && !(auto >= 1.01)) return X.fail('자동 익절은 1.01배 이상으로 입력하세요.');
    if (!takeBet(bet)) return;
    const u = rand();
    const cp = Math.max(1, Math.floor((0.99 / (1 - u)) * 100) / 100);
    run = { bet, cp, start: performance.now(), auto: auto >= 1.01 ? auto : 0, m: 1, t: 0 };
    $('#crashMult').className = 'crash-mult';
    $('#crashSub').textContent = '상승 중… 터지기 전에 익절!';
    X.tone(300, 0, 0.3, 'sawtooth', 0.05); X.tone(600, 0.15, 0.3, 'sawtooth', 0.05);
    setCrashBtn('cash');
    run.timer = setInterval(stepCrash, 50);
  }
  let lastBeep = 1;
  function stepCrash() {
    if (!run) return;
    run.t = (performance.now() - run.start) / 1000;
    let m = Math.exp(K * run.t);
    if (!run.cashedAt && run.auto && m >= run.auto && run.auto < run.cp) cashOut(run.auto);
    if (m >= run.cp) { m = run.cp; run.m = m; return boom(); }
    run.m = m;
    $('#crashMult').textContent = m.toFixed(2) + '×';
    if (!run.cashedAt) setCrashBtn('cash');
    if (Math.floor(m) > lastBeep) { lastBeep = Math.floor(m); X.tone(400 + lastBeep * 80, 0, 0.12, 'triangle', 0.08); }
    drawCrash();
  }
  function cashOut(at) {
    if (!run || run.cashedAt || run.boom) return;
    const m = Math.floor((at || run.m) * 100) / 100;
    run.cashedAt = m;
    const pay = Math.floor(run.bet * m);
    settle('crash', run.bet, pay, `${m.toFixed(2)}배 익절`);
    $('#crashMult').classList.add('cashed');
    $('#crashSub').textContent = `✅ ${m.toFixed(2)}배 익절! +${fmtKRW(pay - run.bet)}원 — 로켓은 계속 날아가요…`;
    if (m >= 2) bigWin(Math.floor(m * 10) / 10, pay); else X.sfx('order');
    if (m >= 10) X.unlock('moon');
    setCrashBtn('wait');
  }
  function boom() {
    clearInterval(run.timer);
    run.boom = true;
    lastBeep = 1;
    $('#crashMult').textContent = run.cp.toFixed(2) + '×';
    $('#crashMult').className = 'crash-mult ' + (run.cashedAt ? 'cashed' : 'boom');
    if (!run.cashedAt) {
      settle('crash', run.bet, 0, `${run.cp.toFixed(2)}배 폭발`);
      $('#crashSub').textContent = `💥 ${run.cp.toFixed(2)}배에서 폭발! -${fmtKRW(run.bet)}원`;
      X.sfx('lose');
    } else {
      $('#crashSub').textContent = `💥 ${run.cp.toFixed(2)}배에서 폭발 · 나는 ${run.cashedAt.toFixed(2)}배에 익절 성공 😎`;
    }
    X.tone(90, 0, 0.5, 'sawtooth', 0.12);
    const c = C();
    c.crashHist.unshift(run.cp);
    if (c.crashHist.length > 12) c.crashHist.length = 12;
    X.save();
    drawCrash(); renderCrashHist();
    const done = run;
    setTimeout(() => { if (run === done) { run.finished = true; setCrashBtn('ready'); } }, 900);
  }
  function renderCrashHist() {
    $('#crashHist').innerHTML = C().crashHist.map((v) => `<span class="${v >= 2 ? 'hi' : 'lo'}">${v.toFixed(2)}×</span>`).join('');
  }
  $('#crashBtn').onclick = () => {
    if (run && !run.boom && !run.cashedAt) return cashOut();
    if (run && !run.finished) return;
    startCrash();
  };

  /* =========================================================
   * 🪙 코인 플립 (맞히면 1.95배)
   * ========================================================= */
  let rot = 0, flipping = false, streak = 0;
  function flip(side) {
    if (flipping) return;
    const bet = betOf('coinBet');
    if (!takeBet(bet)) return;
    flipping = true;
    $$('.coin-pick').forEach((b) => b.disabled = true);
    const res = rand() < 0.5 ? 'B' : 'E';
    const target = res === 'B' ? 0 : 180;
    rot += 1800 + ((target - (rot % 360)) + 360) % 360;
    $('#coin').style.transform = `rotateY(${rot}deg)`;
    $('#coinMsg').textContent = '빙글빙글…';
    for (let i = 0; i < 10; i++) X.tone(900 + i * 40, i * 0.13, 0.04, 'square', 0.025);
    setTimeout(() => {
      const win = res === side;
      const pay = win ? Math.floor(bet * 1.95) : 0;
      settle('coin', bet, pay, `${side === 'B' ? '₿' : 'Ξ'} 선택 → ${res === 'B' ? '₿' : 'Ξ'}`);
      if (win) {
        streak++;
        $('#coinMsg').textContent = `🎉 적중! +${fmtKRW(pay - bet)}원`;
        if (streak >= 3) {
          X.floater(`+${fmtKRW(pay - bet)}원<small>🔥 ${streak}연승!</small>`, '#e5a50a', streak >= 5);
          X.sfx('win', Math.min(4, streak - 1)); X.confetti(50 * streak);
        } else { X.sfx('win', 1); X.confetti(40); }
        if (streak >= 5) X.unlock('streak5');
      } else {
        streak = 0;
        $('#coinMsg').textContent = '😵 빗나감! 다음엔 맞힐 거예요';
        X.sfx('lose');
      }
      $('#coinStreak').textContent = streak >= 2 ? `🔥 ${streak}연승 중!` : '';
      flipping = false;
      $$('.coin-pick').forEach((b) => b.disabled = false);
    }, 1650);
  }
  $$('.coin-pick').forEach((b) => b.onclick = () => flip(b.dataset.side));

  /* ---------- 화면 진입 ---------- */
  X.onCasino = () => { render(); defaultBets(); renderCrashHist(); requestAnimationFrame(sizeCrash); };
  X.renderCasino = render;
})();
