/* 의존성 없는 캔버스 캔들 차트 (캔들 + 거래량 + 이동평균선 + 크로스헤어) */
(function () {
  'use strict';

  const AXIS_W = 74;
  const AXIS_H = 22;
  const MA = [
    { n: 5, color: '#e5a50a' },
    { n: 20, color: '#c23fd1' },
    { n: 60, color: '#2b9a66' },
  ];

  function css(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  class CandleChart {
    constructor(canvas, opts = {}) {
      this.cv = canvas;
      this.ctx = canvas.getContext('2d');
      this.data = [];
      this.bw = 9;            // 캔들 하나의 폭(간격 포함)
      this.offset = 0;        // 오른쪽 끝에서 몇 봉 스크롤했는지
      this.hover = null;      // {x, y}
      this.lines = [];        // [{price, color, label, dash}]
      this.tf = '15';
      this.fmt = opts.fmt || ((v) => v.toLocaleString());
      this.onHover = opts.onHover || (() => {});
      this.pointers = new Map();
      this.dirty = true;
      this._bind();
      this._resize();
      new ResizeObserver(() => this._resize()).observe(canvas.parentElement);
      const loop = () => {
        if (this.dirty) { this.dirty = false; this._draw(); }
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    }

    setData(data, tf) {
      this.data = data.slice();
      if (tf) this.tf = tf;
      this.offset = 0;
      this._computeMA();
      this.dirty = true;
    }

    /** 실시간 체결가로 마지막 캔들 갱신 / 새 캔들 추가 */
    tick(price, vol, ts, intervalMs) {
      const d = this.data;
      if (!d.length) return;
      const last = d[d.length - 1];
      if (ts >= last.t + intervalMs) {
        const t = last.t + Math.floor((ts - last.t) / intervalMs) * intervalMs;
        d.push({ t, o: price, h: price, l: price, c: price, v: vol || 0 });
        if (d.length > 1000) d.shift();
        if (this.offset > 0) this.offset += 1;
      } else {
        last.c = price;
        if (price > last.h) last.h = price;
        if (price < last.l) last.l = price;
        last.v += vol || 0;
      }
      this._computeMA(true);
      this.dirty = true;
    }

    setLines(lines) { this.lines = lines || []; this.dirty = true; }
    redraw() { this.dirty = true; }

    zoom(f, anchorX) {
      const old = this.bw;
      this.bw = Math.max(3, Math.min(40, this.bw * f));
      if (anchorX != null) {
        const plotW = this.w - AXIS_W;
        const fromRight = (plotW - anchorX) / old;
        this.offset = Math.max(0, this.offset + fromRight - (plotW - anchorX) / this.bw);
        this._clampOffset();
      }
      this.dirty = true;
    }

    _clampOffset() {
      const maxOff = Math.max(0, this.data.length - 10);
      this.offset = Math.max(0, Math.min(maxOff, this.offset));
    }

    _computeMA(lastOnly) {
      const d = this.data;
      for (const m of MA) {
        const from = lastOnly ? Math.max(0, d.length - 2) : 0;
        for (let i = from; i < d.length; i++) {
          if (i < m.n - 1) { d[i]['ma' + m.n] = null; continue; }
          let s = 0;
          for (let k = i - m.n + 1; k <= i; k++) s += d[k].c;
          d[i]['ma' + m.n] = s / m.n;
        }
      }
    }

    _resize() {
      const r = this.cv.parentElement.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      this.w = Math.max(100, r.width);
      this.h = Math.max(100, r.height);
      this.cv.width = this.w * dpr;
      this.cv.height = this.h * dpr;
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.dirty = true;
    }

    _bind() {
      const cv = this.cv;
      let dragX = null, dragOff = 0, pinchD = null, pinchBw = 0;
      cv.addEventListener('pointerdown', (e) => {
        cv.setPointerCapture(e.pointerId);
        this.pointers.set(e.pointerId, e);
        if (this.pointers.size === 1) { dragX = e.offsetX; dragOff = this.offset; }
        if (this.pointers.size === 2) {
          const [a, b] = [...this.pointers.values()];
          pinchD = Math.abs(a.clientX - b.clientX); pinchBw = this.bw; dragX = null;
        }
      });
      cv.addEventListener('pointermove', (e) => {
        if (this.pointers.has(e.pointerId)) this.pointers.set(e.pointerId, e);
        if (this.pointers.size === 2 && pinchD) {
          const [a, b] = [...this.pointers.values()];
          const d = Math.abs(a.clientX - b.clientX);
          this.bw = Math.max(3, Math.min(40, pinchBw * (d / Math.max(20, pinchD))));
          this.dirty = true;
          return;
        }
        if (dragX != null && this.pointers.size === 1) {
          this.offset = dragOff + (e.offsetX - dragX) / this.bw;
          this._clampOffset();
        }
        this.hover = { x: e.offsetX, y: e.offsetY };
        this.dirty = true;
      });
      const up = (e) => {
        this.pointers.delete(e.pointerId);
        if (this.pointers.size < 2) pinchD = null;
        if (this.pointers.size === 0) dragX = null;
        if (e.pointerType !== 'mouse') { this.hover = null; this.dirty = true; }
      };
      cv.addEventListener('pointerup', up);
      cv.addEventListener('pointercancel', up);
      cv.addEventListener('pointerleave', () => { this.hover = null; this.dirty = true; this.onHover(null); });
      cv.addEventListener('wheel', (e) => {
        e.preventDefault();
        this.zoom(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.offsetX);
      }, { passive: false });
    }

    _timeLabel(t, prev) {
      const d = new Date(t);
      const p = (n) => String(n).padStart(2, '0');
      if (this.tf === 'D') {
        if (!prev || new Date(prev).getFullYear() !== d.getFullYear()) return d.getFullYear() + '';
        return `${p(d.getMonth() + 1)}/${p(d.getDate())}`;
      }
      if (prev && new Date(prev).getDate() !== d.getDate()) return `${p(d.getMonth() + 1)}/${p(d.getDate())}`;
      return `${p(d.getHours())}:${p(d.getMinutes())}`;
    }

    _draw() {
      const ctx = this.ctx, W = this.w, H = this.h;
      const d = this.data;
      const RISE = css('--rise'), FALL = css('--fall'), GRID = css('--chart-grid'),
        TXT = css('--chart-text'), BG = css('--panel'), FG = css('--text');
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);
      if (!d.length) return;

      const plotW = W - AXIS_W;
      const priceH = Math.floor((H - AXIS_H) * 0.78);
      const volTop = priceH + 6;
      const volH = H - AXIS_H - volTop;
      const bw = this.bw;
      const rightPad = 4; // 오른쪽 여백(봉)
      const count = Math.ceil(plotW / bw) + 1;
      const endF = d.length - 1 - this.offset + rightPad;
      const end = Math.min(d.length - 1, Math.floor(endF));
      const start = Math.max(0, Math.floor(endF - count));
      const xOf = (i) => plotW - (endF - i) * bw - bw / 2;

      let hi = -Infinity, lo = Infinity, vmax = 0;
      for (let i = start; i <= end; i++) {
        const c = d[i];
        if (c.h > hi) hi = c.h;
        if (c.l < lo) lo = c.l;
        if (c.v > vmax) vmax = c.v;
      }
      if (!isFinite(hi)) return;
      if (hi === lo) { hi *= 1.001; lo *= 0.999; }
      const pad = (hi - lo) * 0.08;
      hi += pad; lo -= pad;
      const yOf = (p) => 8 + (hi - p) / (hi - lo) * (priceH - 16);
      const pOf = (y) => hi - (y - 8) / (priceH - 16) * (hi - lo);

      // 그리드 + 가격축
      ctx.font = '11px -apple-system, "Apple SD Gothic Neo", sans-serif';
      ctx.textBaseline = 'middle';
      const steps = Math.max(3, Math.floor(priceH / 55));
      const rawStep = (hi - lo) / steps;
      const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
      const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= rawStep) || rawStep;
      ctx.strokeStyle = GRID; ctx.lineWidth = 1;
      for (let p = Math.ceil(lo / step) * step; p <= hi; p += step) {
        const y = Math.round(yOf(p)) + 0.5;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(plotW, y); ctx.stroke();
        ctx.fillStyle = TXT; ctx.textAlign = 'left';
        ctx.fillText(this.fmt(p), plotW + 6, y);
      }
      // 시간축
      ctx.textAlign = 'center';
      const every = Math.max(1, Math.round(90 / bw));
      for (let i = start; i <= end; i++) {
        if (i % every !== 0) continue;
        const x = Math.round(xOf(i)) + 0.5;
        ctx.strokeStyle = GRID;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H - AXIS_H); ctx.stroke();
        ctx.fillStyle = TXT;
        ctx.fillText(this._timeLabel(d[i].t, i - every >= 0 ? d[i - every].t : null), x, H - AXIS_H / 2);
      }
      ctx.strokeStyle = GRID;
      ctx.beginPath(); ctx.moveTo(plotW + 0.5, 0); ctx.lineTo(plotW + 0.5, H); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, H - AXIS_H + 0.5); ctx.lineTo(W, H - AXIS_H + 0.5); ctx.stroke();

      // 캔들 + 거래량
      const body = Math.max(1, Math.floor(bw * 0.72));
      for (let i = start; i <= end; i++) {
        const c = d[i];
        const x = xOf(i);
        const up = c.c >= c.o;
        ctx.fillStyle = up ? RISE : FALL;
        ctx.strokeStyle = up ? RISE : FALL;
        const cx = Math.round(x) + 0.5;
        ctx.beginPath(); ctx.moveTo(cx, yOf(c.h)); ctx.lineTo(cx, yOf(c.l)); ctx.stroke();
        const y1 = yOf(Math.max(c.o, c.c)), y2 = yOf(Math.min(c.o, c.c));
        ctx.fillRect(Math.round(x - body / 2), Math.round(y1), body, Math.max(1, Math.round(y2 - y1)));
        if (vmax > 0) {
          const vh = c.v / vmax * (volH - 4);
          ctx.globalAlpha = 0.45;
          ctx.fillRect(Math.round(x - body / 2), volTop + volH - vh, body, vh);
          ctx.globalAlpha = 1;
        }
      }

      // 이동평균선
      ctx.lineWidth = 1.2;
      for (const m of MA) {
        ctx.strokeStyle = m.color;
        ctx.beginPath();
        let started = false;
        for (let i = start; i <= end; i++) {
          const v = d[i]['ma' + m.n];
          if (v == null) continue;
          const x = xOf(i), y = yOf(v);
          if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.lineWidth = 1;

      // 추가 라인(평단가, 미체결 주문)
      const label = (y, text, color) => {
        ctx.fillStyle = color;
        ctx.fillRect(plotW, y - 9, AXIS_W, 18);
        ctx.fillStyle = '#fff'; ctx.textAlign = 'left';
        ctx.fillText(text, plotW + 5, y);
      };
      for (const ln of this.lines) {
        if (ln.price < lo || ln.price > hi) continue;
        const y = Math.round(yOf(ln.price)) + 0.5;
        ctx.strokeStyle = ln.color; ctx.setLineDash(ln.dash || [6, 4]);
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(plotW, y); ctx.stroke();
        ctx.setLineDash([]);
        if (ln.label) {
          ctx.font = 'bold 10.5px -apple-system, sans-serif';
          const tw = ctx.measureText(ln.label).width + 10;
          ctx.fillStyle = ln.color; ctx.fillRect(4, y - 9, tw, 18);
          ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.fillText(ln.label, 9, y);
          ctx.font = '11px -apple-system, "Apple SD Gothic Neo", sans-serif';
        }
        label(y, this.fmt(ln.price), ln.color);
      }

      // 현재가 라인
      const last = d[d.length - 1];
      const ly = Math.round(yOf(last.c)) + 0.5;
      const lc = last.c >= last.o ? RISE : FALL;
      if (ly > 0 && ly < priceH) {
        ctx.strokeStyle = lc; ctx.setLineDash([2, 3]);
        ctx.beginPath(); ctx.moveTo(0, ly); ctx.lineTo(plotW, ly); ctx.stroke();
        ctx.setLineDash([]);
        label(ly, this.fmt(last.c), lc);
      }

      // 크로스헤어
      let hovered = null;
      if (this.hover && this.hover.x < plotW && this.hover.y < H - AXIS_H) {
        const { x, y } = this.hover;
        const idx = Math.round(endF - (plotW - x - bw / 2) / bw);
        if (idx >= 0 && idx < d.length) hovered = d[idx];
        ctx.strokeStyle = TXT; ctx.setLineDash([3, 3]);
        const sx = hovered ? Math.round(xOf(idx)) + 0.5 : x;
        ctx.beginPath(); ctx.moveTo(sx, 0); ctx.lineTo(sx, H - AXIS_H); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(plotW, y + 0.5); ctx.stroke();
        ctx.setLineDash([]);
        if (y < priceH) label(y, this.fmt(pOf(y)), FG === '#333333' ? '#444' : '#555');
        if (hovered) {
          const t = this._timeLabel(hovered.t, null);
          const dt = new Date(hovered.t);
          const txt = this.tf === 'D' ? `${dt.getFullYear()}.${dt.getMonth() + 1}.${dt.getDate()}` : `${dt.getMonth() + 1}/${dt.getDate()} ${t}`;
          const tw = ctx.measureText(txt).width + 12;
          ctx.fillStyle = '#555'; ctx.fillRect(sx - tw / 2, H - AXIS_H, tw, AXIS_H);
          ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(txt, sx, H - AXIS_H / 2);
        }
      }
      this.onHover(hovered || last, !!hovered);
    }
  }

  CandleChart.MA = MA;
  window.CandleChart = CandleChart;
})();
