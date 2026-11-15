import { initBackdrop } from '../../lib/backdropScene';

/**
 * Canvas scenes and scroll behaviour for the landing page. Imperative on
 * purpose: three canvases redraw every frame, which React state would only
 * slow down. LandingPage.jsx renders the markup; this animates it.
 *
 * Returns a cleanup function (stops the frame loop, observers and listeners).
 */
export function initLanding(root) {
  const $ = (selector) => root.querySelector(selector);
  const observers = [];
  const observe = (Type, callback, options) => {
    const o = new Type(callback, options);
    observers.push(o);
    return o;
  };
  const abort = new AbortController();
  let alive = true, raf = 0;

  const LANES = ['security', 'reliability', 'performance', 'maintainability', 'testing', 'scalability'];
  const SHORT = ['sec', 'rel', 'perf', 'maint', 'test', 'scale'];
  const MAX_PR = 220;

  // Example issues. prs = pull requests where it was found; fixedBy = the PR after which it was gone.
  const ISSUES = [
    { id: 42, lane: 0, sev: 'high', title: 'OAuth callback redirects without validating the target', file: 'backend/src/controllers/auth.controller.js', prs: [18, 57, 131, 212], fixedBy: 96 },
    { id: 51, lane: 1, sev: 'medium', title: 'Unhandled promise rejection in the review worker', file: 'backend/src/queues/review.worker.js', prs: [24, 61, 140] },
    { id: 63, lane: 2, sev: 'high', title: 'One database query per review when loading repo history', file: 'backend/src/services/analytics.service.js', prs: [33, 88, 150, 190], fixedBy: 120 },
    { id: 77, lane: 3, sev: 'low', title: 'Severity colours defined twice in separate components', file: 'frontend/src/components/FindingCard.jsx', prs: [45, 102] },
    { id: 85, lane: 4, sev: 'medium', title: 'New endpoint added without a controller test', file: 'backend/src/routes/repos.routes.js', prs: [52, 77, 119, 163, 205] },
    { id: 98, lane: 5, sev: 'medium', title: 'List endpoint returns every row with no pagination', file: 'backend/src/controllers/review.controller.js', prs: [70, 158], fixedBy: 110 },
    { id: 104, lane: 0, sev: 'critical', title: 'Webhook signature compared with a plain equality check', file: 'backend/src/middleware/verifyGitHubSignature.js', prs: [96, 171] },
  ];

  const rnd = (i, n) => ((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1;
  const ONE_OFFS = Array.from({ length: 34 }, (_, i) => ({ pr: 4 + Math.floor(rnd(i, 1) * 214), lane: Math.floor(rnd(i, 2) * 6) }));

  const canvas = $('#strip');
  const ctx = canvas.getContext('2d');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let W = 0, H = 0, selected = 0, dots = [];
  // Autoplay cycles through the issues until the visitor chooses one; it waits while they hover or tab through.
  let autoplay = !reduce, paused = false;

  const css = (name) => getComputedStyle(root).getPropertyValue(name).trim();
  const C = () => ({ line: css('--line'), strong: css('--line-strong'), ink: css('--ink'), ink2: css('--ink-2'), muted: css('--muted'), mint: css('--mint'), ret: css('--return') });
  const SEV = { critical: '#f85149', high: '#ef7d38', medium: '#d6a02b', low: '#8b9690' };
  // Read once: the palette is fixed, and asking the browser for styles every frame forces extra work.
  const COLORS = C();
  const FONT_MONO = css('--font-mono');

  function size() {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function geometry() {
    const narrow = W < 620;
    const left = narrow ? 44 : 118, right = 14, top = 34, bottom = 36;
    const laneH = (H - top - bottom) / LANES.length;
    return {
      narrow, left, top, bottom, laneH,
      x: (pr) => left + ((pr - 1) / (MAX_PR - 1)) * (W - left - right),
      y: (lane) => top + laneH * (lane + 0.72),
    };
  }

  const quad = (a, c, b, t) => (1 - t) * (1 - t) * a + 2 * (1 - t) * t * c + t * t * b;

  function draw(now) {
    const c = COLORS, g = geometry();
    ctx.clearRect(0, 0, W, H);
    ctx.font = `${g.narrow ? 10 : 11}px ${FONT_MONO}`;
    ctx.textBaseline = 'middle';

    // lanes
    LANES.forEach((name, i) => {
      const y = g.y(i);
      ctx.strokeStyle = c.line; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(g.left, y); ctx.lineTo(W, y); ctx.stroke();
      ctx.fillStyle = ISSUES[selected].lane === i ? c.ink : c.muted;
      ctx.textAlign = 'left';
      ctx.fillText(g.narrow ? SHORT[i] : name, 0, y);
    });

    // PR axis
    ctx.textAlign = 'center'; ctx.fillStyle = c.muted;
    for (let pr = 20; pr <= MAX_PR; pr += g.narrow ? 40 : 20) {
      const x = g.x(pr);
      ctx.strokeStyle = c.line; ctx.beginPath(); ctx.moveTo(x, g.top - 6); ctx.lineTo(x, H - g.bottom + 6); ctx.stroke();
      ctx.fillText('#' + pr, x, H - g.bottom + 20);
    }

    // findings seen once
    ctx.fillStyle = c.muted;
    ONE_OFFS.forEach((o) => { ctx.beginPath(); ctx.arc(g.x(o.pr), g.y(o.lane), 2, 0, 6.3); ctx.fill(); });

    // recurring issues
    dots = [];
    const order = ISSUES.map((_, i) => i).sort((a, b) => (a === selected) - (b === selected));
    order.forEach((idx) => {
      const issue = ISSUES[idx], on = idx === selected, y = g.y(issue.lane);
      const segs = [];
      for (let i = 0; i < issue.prs.length - 1; i++) {
        const x1 = g.x(issue.prs[i]), x2 = g.x(issue.prs[i + 1]);
        const back = issue.fixedBy && issue.prs[i + 1] > issue.fixedBy;
        const lift = Math.min(g.laneH * 0.95, 14 + (x2 - x1) * 0.22);
        segs.push({ x1, x2, cy: y - lift * 2, back });
        ctx.strokeStyle = on ? (back ? c.ret : c.mint) : c.strong;
        ctx.lineWidth = on ? 1.8 : 1;
        ctx.globalAlpha = on ? 1 : 0.7;
        ctx.beginPath(); ctx.moveTo(x1, y); ctx.quadraticCurveTo((x1 + x2) / 2, y - lift * 2, x2, y); ctx.stroke();
        ctx.globalAlpha = 1;
      }

      let cameBack = false;
      issue.prs.forEach((pr) => {
        const x = g.x(pr);
        if (issue.fixedBy && pr > issue.fixedBy) cameBack = true;
        dots.push({ x, y, idx });
        ctx.beginPath(); ctx.arc(x, y, on ? 5 : 3, 0, 6.3);
        ctx.fillStyle = on ? (cameBack ? c.ret : c.mint) : c.ink2;
        ctx.fill();
        if (on) {
          ctx.fillStyle = c.ink; ctx.textAlign = 'center';
          ctx.fillText('#' + pr, Math.max(g.left + 14, Math.min(W - 18, x)), y + 16);
        }
      });

      if (on && issue.fixedBy) {
        const x = g.x(issue.fixedBy);
        ctx.strokeStyle = c.muted; ctx.lineWidth = 1.2; ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.moveTo(x, y - g.laneH * 0.55); ctx.lineTo(x, y + 6); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = c.ink2; ctx.textAlign = 'center';
        ctx.fillText('fixed', x, y - g.laneH * 0.55 - 8);
      }

      // a point of light retraces the issue's path
      if (on && !reduce && segs.length) {
        const t = ((now / 1100) % segs.length);
        const s = segs[Math.floor(t)], f = t - Math.floor(t);
        const px = quad(s.x1, (s.x1 + s.x2) / 2, s.x2, f), py = quad(y, s.cy, y, f);
        const glow = ctx.createRadialGradient(px, py, 0, px, py, 12);
        const col = s.back ? c.ret : c.mint;
        glow.addColorStop(0, col); glow.addColorStop(1, 'transparent');
        ctx.globalAlpha = 0.55; ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(px, py, 12, 0, 6.3); ctx.fill();
        ctx.globalAlpha = 1; ctx.fillStyle = c.ink; ctx.beginPath(); ctx.arc(px, py, 2.2, 0, 6.3); ctx.fill();
      }
    });
  }

  // fingerprint whorl: one ridge lights up per sighting
  function whorl(issue) {
    let h = 2166136261; const s = String(issue.id);
    for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
    let a = h >>> 0;
    const rand = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const pt = (r, d) => { const q = (d - 90) * Math.PI / 180; return (16 + r * Math.cos(q)).toFixed(2) + ' ' + (16 + r * Math.sin(q)).toFixed(2); };
    const color = SEV[issue.sev];
    let out = `<circle cx="16" cy="16" r="1.3" fill="${color}"/>`;
    for (let k = 0; k < 5; k++) {
      const r = 3.4 + k * 2.6, parts = k === 0 ? 1 : 1 + Math.floor(rand() * 2.4), start = rand() * 360, span = 360 / parts;
      for (let j = 0; j < parts; j++) {
        const from = start + j * span, len = span - (24 + rand() * 46);
        out += `<path d="M${pt(r, from)} A${r} ${r} 0 ${len > 180 ? 1 : 0} 1 ${pt(r, from + len)}" stroke="${k < issue.prs.length ? color : 'var(--line-strong)'}" stroke-width="1.5" stroke-linecap="round"/>`;
      }
    }
    return out;
  }

  function readout() {
    const issue = ISSUES[selected];
    $('#print').innerHTML = whorl(issue);
    $('#r-id').textContent = '[ FP-' + String(issue.id).padStart(4, '0') + ' ]';
    const sev = $('#r-sev'); sev.textContent = issue.sev; sev.style.color = SEV[issue.sev];
    $('#r-cat').textContent = LANES[issue.lane];
    $('#r-title').textContent = issue.title;
    $('#r-file').textContent = issue.file;
    $('#r-count').style.color = issue.fixedBy ? 'var(--return)' : 'var(--mint)';
    $('#r-count').textContent = issue.prs.length + '×';
    const state = issue.fixedBy ? 'var(--return)' : 'var(--mint)';
    $('.readout').style.setProperty('--sel', state);
    picker.style.setProperty('--sel', state);
    [...picker.children].forEach((b, i) => b.setAttribute('aria-pressed', String(i === selected)));
    const trail = $('#r-trail'); trail.textContent = '';
    const add = (text, cls) => { const li = document.createElement('li'); li.textContent = text; if (cls) li.className = cls; trail.appendChild(li); };
    let fixedShown = false;
    issue.prs.forEach((pr, i) => {
      if (issue.fixedBy && pr > issue.fixedBy && !fixedShown) { add('fixed by #' + issue.fixedBy, 'was-fixed'); fixedShown = true; add('#' + pr + ' came back', 'back'); return; }
      add('#' + pr + (i === 0 ? ' first seen' : ' again'), i === 0 ? 'first' : (fixedShown ? 'back' : ''));
    });
  }

  function select(i, byUser) {
    selected = (i + ISSUES.length) % ISSUES.length;
    if (byUser) autoplay = false;
    // announce to screen readers only when the visitor chose it, not on every automatic change
    $('.readout').setAttribute('aria-live', byUser ? 'polite' : 'off');
    readout();
    if (reduce) draw(0);
  }

  canvas.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    let best = null, bd = 26 * 26;
    dots.forEach((d) => { const q = (d.x - x) ** 2 + (d.y - y) ** 2; if (q < bd) { bd = q; best = d; } });
    if (best && best.idx !== selected) select(best.idx, true);
  });
  canvas.addEventListener('pointerdown', (e) => canvas.dispatchEvent(new PointerEvent('pointermove', e)));
  const picker = $('#picker');
  picker.textContent = '';
  ISSUES.forEach((issue, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = 'FP-' + String(issue.id).padStart(4, '0') + ' \u00d7' + issue.prs.length;
    b.setAttribute('aria-label', issue.title + ', seen ' + issue.prs.length + ' times');
    b.addEventListener('click', () => select(i, true));
    picker.appendChild(b);
  });
  const stripEl = $('#memory');
  [['pointerenter', true], ['pointerleave', false], ['focusin', true], ['focusout', false]].forEach(([type, value]) => {
    stripEl.addEventListener(type, () => { paused = value; }, { signal: abort.signal });
  });
  $('#prev').addEventListener('click', () => select(selected - 1, true));
  $('#next').addEventListener('click', () => select(selected + 1, true));

  // ---- hero whorl: ridges turn at their own pace while light travels outward.
  // Two passes are mint (seen again); every third is purple (it came back).
  const wc = $('#whorl'), wx = wc.getContext('2d');
  const RIDGES = 22;
  const ridgeSeed = (k, n) => rnd(k + 40, n);
  const RING = Array.from({ length: RIDGES }, (_, k) => {
    const parts = k < 2 ? 1 : 2 + Math.floor(ridgeSeed(k, 1) * 3);
    return {
      parts,
      gaps: Array.from({ length: parts }, (_, j) => 0.18 + ridgeSeed(k, 2 + j) * 0.5),
      phase: ridgeSeed(k, 9) * 6.283,
      speed: (k % 2 ? 1 : -1) * (0.03 + ridgeSeed(k, 10) * 0.07),
    };
  });
  let wS = 0, px = 0, py = 0, tx = 0, ty = 0, lastTone = '';
  const wordEl = $('h1 em');
  function sizeWhorl() {
    const r = wc.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    wS = r.width; wc.width = wc.height = Math.round(wS * dpr); wx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function drawWhorl(now) {
    const c = COLORS, t = now / 1000;
    px += (tx - px) * 0.04; py += (ty - py) * 0.04;
    wx.clearRect(0, 0, wS, wS);
    const cx = wS / 2 + px * 18, cy = wS / 2 + py * 18, step = (wS * 0.47) / RIDGES;
    const pass = (t * 5.2) % (RIDGES + 12), front = pass - 4;
    const tone = Math.floor((t * 5.2) / (RIDGES + 12)) % 3 === 2 ? c.ret : c.mint;
    // Recolour "before." at the moment the band of light reaches the word.
    if (tone !== lastTone && front >= 0) {
      const wr = wc.getBoundingClientRect(), er = wordEl.getBoundingClientRect();
      const ox = wr.left + cx, oy = wr.top + cy;
      const dx = Math.max(er.left - ox, 0, ox - er.right), dy = Math.max(er.top - oy, 0, oy - er.bottom);
      const reach = Math.min(Math.hypot(dx, dy), step * RIDGES);
      if (step * (front + 1) >= reach) { lastTone = tone; root.style.setProperty('--tone', tone); }
    }
    // a dark disc behind the ridges keeps the sky from muddying them
    const back = wx.createRadialGradient(cx, cy, 0, cx, cy, wS * 0.5);
    back.addColorStop(0, 'rgba(7,11,10,0.92)'); back.addColorStop(0.75, 'rgba(7,11,10,0.8)'); back.addColorStop(1, 'rgba(7,11,10,0)');
    wx.fillStyle = back; wx.fillRect(0, 0, wS, wS);
    wx.lineCap = 'round';
    RING.forEach((ring, k) => {
      const r = step * (k + 1), glow = Math.max(0, 1 - Math.abs(k - front) / 3.2);
      const rot = ring.phase + t * ring.speed, span = 6.283 / ring.parts;
      wx.lineWidth = Math.max(2, step * 0.38) + glow * 1.8;
      wx.strokeStyle = glow > 0.02 ? tone : '#56695f';
      wx.globalAlpha = glow > 0.02 ? 0.55 + glow * 0.45 : 1;
      wx.shadowColor = tone; wx.shadowBlur = glow * 26;
      for (let j = 0; j < ring.parts; j++) {
        const a0 = rot + j * span, a1 = a0 + span * (1 - ring.gaps[j]);
        wx.beginPath();
        // slightly squashed and drifting upward, so it reads as a print, not a target
        wx.ellipse(cx + px * k * 0.5, cy - k * step * 0.07 + py * k * 0.5, r, r * 0.88, -0.35, a0, a1);
        wx.stroke();
      }
    });
    wx.shadowBlur = 0; wx.globalAlpha = 1;
    wx.fillStyle = tone; wx.beginPath(); wx.arc(cx, cy, Math.max(3, step * 0.3), 0, 6.3); wx.fill();
  }
  window.addEventListener('pointermove', (e) => {
    tx = e.clientX / window.innerWidth - 0.5; ty = e.clientY / window.innerHeight - 0.5;
  }, { passive: true, signal: abort.signal });
  observe(ResizeObserver, () => { sizeWhorl(); drawWhorl(reduce ? 4200 : performance.now()); }).observe(wc);
  sizeWhorl();

  const stopBackdrop = initBackdrop($('#bg'));

  const SECTIONS = ['memory', 'how', 'what', 'start', 'creator'].map((id) => root.querySelector('#' + id));
  const timer = setTimeout(() => {
    // if the browser isn't advancing animations, leave everything visible
    if (!(document.timeline && document.timeline.currentTime > 200)) { root.classList.add('still'); return; }
    if (reduce || !('IntersectionObserver' in window)) return;
    const io = observe(IntersectionObserver, (es) => es.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    }), { threshold: 0.05 }); // no bottom inset: the last items sit at the very end of the page
    // each group fades in together; items inside a group follow one another
    const GROUPS = ['#memory > .wrap', '#how > h2', '#how .steps > li', '#what > h2', '#what .gets > div', '#start > h2', '#start > .cta-col', '#creator > .eyebrow', '#creator .maker-row > *'];
    GROUPS.forEach((selector) => {
      root.querySelectorAll(selector).forEach((el, n) => {
        if (el.getBoundingClientRect().top < window.innerHeight * 0.92) return; // already on screen
        el.style.setProperty('--reveal-delay', n * 110 + 'ms');
        el.classList.add('reveal'); io.observe(el);
      });
    });
  }, 900);
  if ('IntersectionObserver' in window) {
    // mark the nav link of whichever section is in the middle of the screen
    const links = [...root.querySelectorAll('.bar nav a')];
    const spy = observe(IntersectionObserver, (es) => es.forEach((e) => {
      if (!e.isIntersecting) return;
      links.forEach((a) => {
        if (a.getAttribute('href') === '#' + e.target.id) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
      });
    }), { rootMargin: '-40% 0px -55% 0px' });
    SECTIONS.forEach((el) => spy.observe(el));
    spy.observe($('#top'));
  }
  const seen = { strip: true, whorl: true };
  if ('IntersectionObserver' in window) {
    observe(IntersectionObserver, (es) => es.forEach((e) => { seen.strip = e.isIntersecting; })).observe(canvas);
    observe(IntersectionObserver, (es) => es.forEach((e) => { seen.whorl = e.isIntersecting; })).observe(wc);
  }
  let lastAuto = 0;
  function frame(now) {
    if (!alive) return;
    if (autoplay && !paused && now - lastAuto > 6500) { lastAuto = now; if (now > 6500) select(selected + 1, false); }
    if (seen.strip) draw(now);
    if (seen.whorl) drawWhorl(now);
    raf = requestAnimationFrame(frame);
  }

  observe(ResizeObserver, () => { size(); draw(performance.now()); }).observe(canvas);
  size(); readout();
  if (reduce) { draw(0); drawWhorl(4200); } else raf = requestAnimationFrame(frame);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => alive && draw(performance.now()));

  return () => {
    alive = false;
    cancelAnimationFrame(raf);
    clearTimeout(timer);
    abort.abort();
    stopBackdrop();
    observers.forEach((o) => o.disconnect());
  };
}
