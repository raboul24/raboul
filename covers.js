/* Procedural planner covers. Each cover draws itself through a tiny adapter API so the same art
   renders on a <canvas> (the app) and into PDF content streams (the export):
     d.rect(x, y, w, h, fill)               filled rectangle
     d.poly(points, fill)                    filled polygon  [[x, y], ...]
     d.polyline(points, stroke, lw, closed)  stroked line
   Coordinates are in page units (W x H, origin top-left). */
(() => {
'use strict';

const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const hexRgb = h => { h = h.replace('#', ''); return [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16)); };
const mixHex = (a, b, t) => { const A = hexRgb(a), B = hexRgb(b); return '#' + A.map((v, i) => Math.round(v * (1 - t) + B[i] * t).toString(16).padStart(2, '0')).join(''); };

const arc = (cx, cy, r, a0, a1, n = 48) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + (a1 - a0) * i / n; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; });
const circle = (cx, cy, r, n = 36) => arc(cx, cy, r, 0, Math.PI * 2, n).slice(0, -1);
const gradient = (d, W, H, c1, c2, steps = 40) => { for (let i = 0; i < steps; i++) d.rect(0, H * i / steps, W, H / steps + 1, mixHex(c1, c2, i / (steps - 1))); };
const star = (cx, cy, r, inner = 0.28) => { const p = []; for (let i = 0; i < 8; i++) { const a = -Math.PI / 2 + i * Math.PI / 4, rr = i % 2 ? r * inner : r; p.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]); } return p; };
const sparkles = (d, W, H, n, seed, color, rMin, rMax, area = [0, 0, W, H]) => {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const x = area[0] + r() * (area[2] - area[0]), y = area[1] + r() * (area[3] - area[1]), s = rMin + r() * (rMax - rMin);
    d.poly(r() < 0.35 ? star(x, y, s) : circle(x, y, s * 0.28, 8), mixHex(color, '#ffffff', r() * 0.3));
  }
};
/* a crescent: the part of circle A that is not inside circle B */
function crescent(cx, cy, r, dx, dy, rb) {
  const A = circle(cx, cy, r, 120), inB = p => Math.hypot(p[0] - (cx + dx), p[1] - (cy + dy)) < rb;
  let start = A.findIndex((p, i) => inB(A[(i + A.length - 1) % A.length]) && !inB(p));
  if (start < 0) return A;
  const run = []; for (let k = 0; k < A.length; k++) { const p = A[(start + k) % A.length]; if (inB(p)) break; run.push(p); }
  const inA = p => Math.hypot(p[0] - cx, p[1] - cy) < r;
  const Bp = circle(cx + dx, cy + dy, rb, 120).filter(inA);
  const last = run[run.length - 1], d0 = Math.hypot(Bp[0][0] - last[0], Bp[0][1] - last[1]), d1 = Math.hypot(Bp[Bp.length - 1][0] - last[0], Bp[Bp.length - 1][1] - last[1]);
  return run.concat(d0 < d1 ? Bp : Bp.reverse());
}
const hills = (d, W, base, amp, color, seed, freq = 1) => {
  const r = rng(seed), ph = r() * 6, pts = [];
  for (let x = 0; x <= W; x += W / 40) pts.push([x, base + Math.sin(x / W * Math.PI * 2 * freq + ph) * amp + Math.sin(x / W * 9 + ph) * amp * 0.25]);
  d.poly(pts.concat([[W, 4000], [0, 4000]]), color);
};
const pine = (d, x, y, h, color) => { for (let i = 0; i < 3; i++) { const w = h * (0.34 - i * 0.06), top = y - h + i * h * 0.26; d.poly([[x, top], [x + w, top + h * 0.42], [x - w, top + h * 0.42]], color); } d.rect(x - h * 0.03, y - h * 0.1, h * 0.06, h * 0.1, color); };
const flower = (d, x, y, r, petal, center) => { for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5; d.poly(circle(x + Math.cos(a) * r * 0.9, y + Math.sin(a) * r * 0.9, r * 0.62, 10), petal); } d.poly(circle(x, y, r * 0.5, 10), center); };
const leaf = (d, x, y, len, ang, color) => {
  const w = len * 0.28, p = [];
  for (let i = 0; i <= 12; i++) { const t = i / 12, s = Math.sin(t * Math.PI) * w; p.push([t * len, -s]); }
  for (let i = 12; i >= 0; i--) { const t = i / 12, s = Math.sin(t * Math.PI) * w; p.push([t * len, s]); }
  const c = Math.cos(ang), s = Math.sin(ang); d.poly(p.map(([px, py]) => [x + px * c - py * s, y + px * s + py * c]), color);
};

const COVERS = [
  { id: 'frame', label: 'Golden Frame', ink: '#6b5636', draw(d, W, H, th) {
    const paper = th.paper, gold = th.accent;
    d.rect(0, 0, W, H, paper);
    const m = W * 0.07; [m, m * 1.7].forEach((o, k) => d.polyline([[o, o], [W - o, o], [W - o, H - o], [o, H - o]], gold, k ? 0.8 : 2, true));
    [[m, m], [W - m, m], [W - m, H - m], [m, H - m]].forEach(([x, y]) => d.poly(circle(x, y, 5, 4).map(([a, b]) => [a, b]), gold));
    d.polyline([[W * 0.3, H * 0.62], [W * 0.7, H * 0.62]], gold, 0.8);
    [0.47, 0.5, 0.53].forEach(f => d.poly(circle(W * f, H * 0.62, 1.8, 8), gold));
  } },
  { id: 'stars', label: 'Starry Night', ink: '#f0dca8', draw(d, W, H) {
    gradient(d, W, H, '#2b2150', '#4a3a78'); sparkles(d, W, H, 90, 7, '#f5d9a8', 3, 11);
    sparkles(d, W, H, 60, 17, '#e9b8c8', 1.5, 5);
  } },
  { id: 'meadow', label: 'Moonlit Meadow', ink: '#f2e2b8', draw(d, W, H) {
    gradient(d, W, H, '#1c2b4a', '#3d5a63'); sparkles(d, W, H, 40, 3, '#f5e6b8', 1.5, 6, [0, 0, W, H * 0.55]);
    d.poly(crescent(W * 0.72, H * 0.17, W * 0.09, W * 0.04, -W * 0.02, W * 0.08), '#f6e6b4');
    hills(d, W, H * 0.66, H * 0.03, '#263d3a', 5, 1.2); hills(d, W, H * 0.76, H * 0.035, '#1b2f2c', 9, 1.6); hills(d, W, H * 0.88, H * 0.03, '#12221f', 2, 1);
    const r = rng(11); for (let i = 0; i < 26; i++) d.poly(circle(r() * W, H * (0.68 + r() * 0.28), 1.6 + r() * 1.4, 8), '#f1d98a');
    const q = rng(4); for (let i = 0; i < 18; i++) flower(d, q() * W, H * (0.8 + q() * 0.15), 4, '#e6a9b8', '#f2d98a');
  } },
  { id: 'vines', label: 'Wildflower Vines', ink: '#f3e2c0', draw(d, W, H) {
    d.rect(0, 0, W, H, '#27371f'); const r = rng(21);
    for (let c = 0; c < 4; c++) {
      const x0 = W * (0.12 + c * 0.25), pts = [];
      for (let y = -10; y <= H + 10; y += 10) pts.push([x0 + Math.sin(y / 70 + c * 1.7) * W * 0.07, y]);
      d.polyline(pts, '#4d6b3c', 2.2, false);
      for (let i = 4; i < pts.length - 2; i += 3) {
        const [x, y] = pts[i], side = i % 2 ? 1 : -1; leaf(d, x, y, 22 + r() * 10, side > 0 ? -0.5 : Math.PI + 0.5, '#5a7d44');
        if (i % 6 === 1) flower(d, x + side * 14, y - 10, 6, '#d98fa3', '#f1d28a');
      }
    }
  } },
  { id: 'crescent', label: 'Crescent Sky', ink: '#f1e1bb', draw(d, W, H) {
    gradient(d, W, H, '#2b2f5b', '#50507e'); sparkles(d, W, H, 55, 13, '#f2dca6', 1.5, 6, [0, 0, W, H * 0.7]);
    d.poly(crescent(W * 0.5, H * 0.25, W * 0.2, W * 0.09, -W * 0.04, W * 0.17), '#f4e3b2');
    const cl = (x, y, s, c) => [[0, 0, 1], [-1.1, 0.3, 0.8], [1.1, 0.35, 0.85], [-0.4, 0.45, 0.9], [0.5, 0.5, 0.8]].forEach(([a, b, k]) => d.poly(circle(x + a * s, y + b * s * 0.6, s * 0.7 * k, 22), c));
    cl(W * 0.28, H * 0.86, W * 0.18, '#8a8cb4'); cl(W * 0.72, H * 0.9, W * 0.2, '#767aa6'); cl(W * 0.5, H * 0.97, W * 0.26, '#656a98');
  } },
  { id: 'forest', label: 'Enchanted Forest', ink: '#f0deb2', draw(d, W, H) {
    gradient(d, W, H, '#162a3a', '#2c4a45'); d.poly(circle(W * 0.5, H * 0.2, W * 0.11, 40), '#efe0b0'); d.poly(circle(W * 0.5, H * 0.2, W * 0.15, 40), mixHex('#2a4348', '#efe0b0', 0.12));
    sparkles(d, W, H, 30, 31, '#f5e6b8', 1.2, 4, [0, 0, W, H * 0.4]);
    const r = rng(8); [['#243f3f', 0.62, 0.17], ['#1b3333', 0.76, 0.22], ['#12261f', 0.92, 0.28]].forEach(([c, y, h]) => { for (let x = -10; x < W + 30; x += 38 + r() * 20) pine(d, x, H * y + r() * 14, H * (h + r() * 0.06), c); });
    for (let i = 0; i < 24; i++) d.poly(circle(r() * W, H * (0.5 + r() * 0.45), 1.5 + r() * 1.5, 8), '#f1d98a');
  } },
  { id: 'arch', label: 'Celestial Arch', ink: '#f0dba6', draw(d, W, H) {
    gradient(d, W, H, '#1d2748', '#35406b'); const cx = W / 2, top = H * 0.2, r = W * 0.34;
    const outline = (rr, lw) => d.polyline(arc(cx, top + r, rr, Math.PI, Math.PI * 2, 60).concat([[cx + rr, H * 0.82], [cx - rr, H * 0.82]]), '#e6cd8e', lw, true);
    outline(r, 2); outline(r * 0.88, 0.8);
    sparkles(d, W, H, 26, 5, '#f5e2a8', 2, 7, [cx - r * 0.7, top + r * 0.3, cx + r * 0.7, H * 0.78]);
    d.poly(crescent(cx, top + r * 0.9, r * 0.26, r * 0.1, -r * 0.04, r * 0.22), '#f4e3b2');
    d.poly(star(cx, top + r * 0.5, r * 0.07, 0.3), '#f4e3b2');
  } },
  { id: 'botanical', label: 'Botanical Line', ink: '#4c5a38', draw(d, W, H) {
    d.rect(0, 0, W, H, '#f1ead9'); const r = rng(2);
    [[W * 0.18, '#7c8d5c'], [W * 0.5, '#98a572'], [W * 0.82, '#6f8355']].forEach(([x0, c], k) => {
      const pts = []; for (let y = H * 0.95; y > H * (0.42 - k % 2 * 0.06); y -= 8) pts.push([x0 + Math.sin(y / 55 + k) * 14, y]);
      d.polyline(pts, c, 1.6, false);
      pts.forEach(([x, y], i) => { if (i % 4 === 2) { leaf(d, x, y, 26 + r() * 10, -0.7, c); leaf(d, x, y, 26 + r() * 10, Math.PI + 0.7, c); } });
      const [tx, ty] = pts[pts.length - 1]; d.poly(circle(tx, ty - 6, 5, 10), '#d8b0a0');
    });
    d.polyline([[W * 0.08, H * 0.95], [W * 0.92, H * 0.95]], '#b59a6b', 1);
  } },
];

/* adapter: draw onto a 2D canvas */
function drawToCanvas(canvas, id, theme) {
  const cover = COVERS.find(c => c.id === id); if (!cover) return;
  const ctx = canvas.getContext('2d'), W = canvas.width, H = canvas.height;
  const d = {
    rect: (x, y, w, h, f) => { ctx.fillStyle = f; ctx.fillRect(x, y, w, h); },
    poly: (pts, f) => { ctx.fillStyle = f; ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.fill(); },
    polyline: (pts, s, lw, closed) => { ctx.strokeStyle = s; ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); if (closed) ctx.closePath(); ctx.stroke(); },
  };
  cover.draw(d, W, H, theme || { paper: '#f6f1e7', accent: '#b59a6b' });
}

window.JournalCovers = { list: COVERS, drawToCanvas, mixHex };
})();
