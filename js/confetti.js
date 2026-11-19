// Lightweight confetti, no libraries.
const COLORS = ['#b3262e', '#1f6f4f', '#e0a526', '#ffffff', '#f3c14b', '#d94a52'];
let canvas, ctx, parts = [], raf = null;

function resize() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = innerWidth * dpr;
  canvas.height = innerHeight * dpr;
  canvas.style.width = innerWidth + 'px';
  canvas.style.height = innerHeight + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

export function burst(x, y, count = 170) {
  canvas ||= document.getElementById('confetti');
  ctx ||= canvas.getContext('2d');
  resize();
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) count = 40;
  for (let i = 0; i < count; i++) {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.3;
    const speed = 7 + Math.random() * 10;
    parts.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 3,
      w: 7 + Math.random() * 7,
      h: 10 + Math.random() * 9,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      tilt: Math.random() * Math.PI,
      vt: 0.08 + Math.random() * 0.12,
      color: COLORS[(Math.random() * COLORS.length) | 0],
      round: Math.random() < 0.3,
    });
  }
  if (!raf) loop();
}

function loop() {
  ctx.clearRect(0, 0, innerWidth, innerHeight);
  for (const p of parts) {
    p.vx *= 0.985;
    p.vy = p.vy * 0.985 + 0.3;
    p.x += p.vx;
    p.y += p.vy;
    p.rot += p.vr;
    p.tilt += p.vt;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.scale(1, Math.cos(p.tilt));
    ctx.fillStyle = p.color;
    if (p.round) { ctx.beginPath(); ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2); ctx.fill(); }
    else ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    ctx.restore();
  }
  parts = parts.filter((p) => p.y < innerHeight + 40);
  if (parts.length) raf = requestAnimationFrame(loop);
  else { ctx.clearRect(0, 0, innerWidth, innerHeight); raf = null; }
}
