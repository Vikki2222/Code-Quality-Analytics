/**
 * The moving backdrop shared by the landing page and the signed-in app: a
 * night sky with drifting stars, vertical lines rising from the bottom edge,
 * and chamfered frame lines at the sides.
 *
 * Draws on the given canvas (expected to be fixed behind the page) and
 * returns a cleanup function. With reduced motion it draws one still frame.
 */
const STAR_COLOR = '#eef3f0';
const rnd = (i, n) => ((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1;

export function initBackdrop(bc) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const bx = bc.getContext('2d');
  let bW = 0, bH = 0;
  const STARS = Array.from({ length: 150 }, (_, i) => ({ x: rnd(i, 21), y: rnd(i, 22), r: 0.4 + rnd(i, 23) * 1.1, ph: rnd(i, 24) * 6.283, sp: 0.4 + rnd(i, 25) * 1.6 }));
  // x position, how far up the hero it climbs, pulse speed
  const RISERS = [[0.438, 0.34, 0.11], [0.466, 0.22, 0.16], [0.5, 0.36, 0.09], [0.528, 0.24, 0.13], [0.552, 0.33, 0.19]];
  function sizeBg() {
    const r = bc.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    bW = r.width; bH = r.height; bc.width = Math.round(bW * dpr); bc.height = Math.round(bH * dpr); bx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  // a frame line: runs in from the edge, then bends away through a soft chamfer
  function framePath(side, y, dir) {
    const x0 = side < 0 ? 0 : bW, k = -side, flat = Math.min(70, bW * 0.07), run = Math.min(130, bW * 0.13), rise = dir * Math.min(70, bH * 0.1);
    return [[x0, y], [x0 + k * flat, y], [x0 + k * (flat + run * 0.35), y], [x0 + k * (flat + run), y + rise]];
  }
  function strokeFrame(pts) {
    bx.beginPath(); bx.moveTo(pts[0][0], pts[0][1]); bx.lineTo(pts[1][0], pts[1][1]);
    bx.quadraticCurveTo(pts[2][0], pts[2][1], pts[3][0], pts[3][1]); bx.stroke();
  }
  function drawBg(now) {
    const t = now / 1000;
    bx.clearRect(0, 0, bW, bH);

    // soft light pooling in two corners, slowly breathing
    [[0.02, 1.02, 0], [1.0, 0.05, 2.1]].forEach(([fx, fy, ph]) => {
      const br = 0.5 + 0.5 * Math.sin(t * 0.25 + ph), R = Math.max(bW, bH) * (0.42 + br * 0.08);
      const x = fx * bW + Math.cos(t * 0.13 + ph) * 30, y = fy * bH + Math.sin(t * 0.11 + ph) * 30;
      const g = bx.createRadialGradient(x, y, 0, x, y, R);
      g.addColorStop(0, 'rgba(190,225,215,' + (0.2 + br * 0.1) + ')'); g.addColorStop(0.45, 'rgba(120,160,150,0.07)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      bx.fillStyle = g; bx.fillRect(0, 0, bW, bH);
    });

    // stars drift slowly and twinkle
    bx.fillStyle = STAR_COLOR;
    const starCount = Math.min(STARS.length, Math.round((bW * bH) / 9000));
    STARS.slice(0, starCount).forEach((s) => {
      const x = ((s.x + t * 0.0025 * s.sp) % 1) * bW;
      const y = ((((s.y + t * 0.0012 * s.sp - (window.scrollY || 0) * 0.00012 * s.sp) % 1) + 1) % 1) * bH;
      bx.globalAlpha = 0.18 + 0.5 * (0.5 + 0.5 * Math.sin(t * s.sp + s.ph));
      bx.beginPath(); bx.arc(x, y, s.r, 0, 6.3); bx.fill();
    });
    bx.globalAlpha = 1;

    // vertical lines rise from the bottom edge; a pulse of light climbs each one
    const riserDim = bW < 720 ? 0.45 : 1;
    RISERS.forEach(([fx, climb, sp], i) => {
      const x = Math.round(fx * bW) + 0.5, top = bH * (1 - climb) + Math.sin(t * 0.4 + i * 1.7) * bH * 0.03;
      const g = bx.createLinearGradient(0, bH, 0, top);
      g.addColorStop(0, 'rgba(255,255,255,' + 0.16 * riserDim + ')'); g.addColorStop(1, 'rgba(255,255,255,0)');
      bx.strokeStyle = g; bx.lineWidth = 1; bx.beginPath(); bx.moveTo(x, bH); bx.lineTo(x, top); bx.stroke();
      const f = (t * sp + i * 0.37) % 1, py = bH - (bH - top) * f, len = bH * 0.09;
      const pg = bx.createLinearGradient(0, py + len, 0, py);
      pg.addColorStop(0, 'rgba(255,255,255,0)'); pg.addColorStop(1, 'rgba(255,255,255,' + (0.5 * riserDim * (1 - f)) + ')');
      bx.strokeStyle = pg; bx.lineWidth = 1.5; bx.beginPath(); bx.moveTo(x, py + len); bx.lineTo(x, py); bx.stroke();
    });

    // chamfered frame lines at the edges, with a glint running along each
    const frames = [framePath(-1, bH * 0.24, -1), framePath(1, bH * 0.24, -1), framePath(-1, bH * 0.7, 1), framePath(1, bH * 0.7, 1)];
    frames.forEach((pts, i) => {
      bx.setLineDash([]); bx.lineWidth = 1; bx.strokeStyle = bW >= 1500 ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.1)'; strokeFrame(pts);
      const total = 320, f = (t * 0.22 + i * 0.25) % 1;
      bx.setLineDash([46, total]); bx.lineDashOffset = -f * (total + 46) + 46;
      bx.lineWidth = 1.6; bx.strokeStyle = bW >= 1500 ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.4)'; strokeFrame(pts);
    });
    bx.setLineDash([]);
  }
  sizeBg();

  let raf = 0, alive = true, last = 0;
  const resize = new ResizeObserver(() => { sizeBg(); drawBg(reduce ? 2600 : performance.now()); });
  resize.observe(bc);
  function frame(now) {
    if (!alive) return;
    // a slow, ambient scene: about 30 frames a second is plenty and halves the work
    if (now - last >= 32) { last = now; drawBg(now); }
    raf = requestAnimationFrame(frame);
  }
  if (reduce) drawBg(2600); else raf = requestAnimationFrame(frame);

  return () => {
    alive = false;
    cancelAnimationFrame(raf);
    resize.disconnect();
  };
}
