export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Turns "(210) 555-1234", "210.555.1234", "+1 210 555 1234" into "+12105551234".
// Returns null if it doesn't look like a phone number.
export function normalizePhone(input) {
  const raw = String(input || '').trim();
  const digits = raw.replace(/\D/g, '');
  if (raw.startsWith('+')) return digits.length >= 8 && digits.length <= 15 ? '+' + digits : null;
  if (digits.length === 10) return '+1' + digits;
  if (digits.length === 11 && digits[0] === '1') return '+' + digits;
  return null;
}

export function formatPhone(p) {
  const m = /^\+1(\d{3})(\d{3})(\d{4})$/.exec(p || '');
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : p || '';
}

export function safeUrl(u) {
  let s = String(u || '').trim();
  if (!s) return '';
  if (!/^https?:\/\//i.test(s)) s = 'https://' + s;
  try {
    const x = new URL(s);
    if (!/^https?:$/.test(x.protocol) || !x.hostname.includes('.')) return null;
    return x.href;
  } catch {
    return null;
  }
}

export function safeImg(u) {
  const s = String(u || '').trim();
  if (!s) return '';
  if (/^data:image\//i.test(s) || /^blob:/i.test(s)) return s;
  return safeUrl(s) || '';
}

export function domainOf(u) {
  try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return 'the store'; }
}

export const firstName = (n) => String(n || '').trim().split(/\s+/)[0] || 'Friend';

export function initials(n) {
  const parts = String(n || '?').trim().split(/\s+/).filter((w) => /^\p{L}/u.test(w));
  if (!parts.length) return '?';
  return ((parts[0]?.[0] || '?') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

const AVATAR_COLORS = ['#b3262e', '#1f6f4f', '#a8741a', '#2f5d8a', '#7a3b8f', '#b4532a', '#3d7a7a', '#8a3355'];
export function colorFor(key) {
  let h = 0;
  for (const c of String(key)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export function fmtDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  if (!m) return '';
  return new Date(+m[1], +m[2] - 1, +m[3]).toLocaleDateString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
}

export function fmtWhen(ms) {
  if (!ms) return '';
  return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// Shrinks big phone photos before upload (faster for everyone, cheaper storage).
export async function compressImage(file, max = 1200, quality = 0.82) {
  const img = await new Promise((res, rej) => {
    const url = URL.createObjectURL(file);
    const i = new Image();
    i.onload = () => { URL.revokeObjectURL(url); res(i); };
    i.onerror = () => { URL.revokeObjectURL(url); rej(new Error('That file could not be opened as a picture.')); };
    i.src = url;
  });
  const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement('canvas');
  c.width = Math.round(img.naturalWidth * scale);
  c.height = Math.round(img.naturalHeight * scale);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(img, 0, 0, c.width, c.height);
  return new Promise((res) => c.toBlob(res, 'image/jpeg', quality));
}

// ---- name matching ----
export const normName = (s) =>
  String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

function lev(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

// Finds the person someone typed. Exact full name wins, then a unique first name.
// Otherwise returns close suggestions ("Did you mean…").
export function findByName(input, people) {
  const q = normName(input);
  if (!q) return { type: 'empty' };
  const exact = people.filter((p) => normName(p.name) === q);
  if (exact.length === 1) return { type: 'match', person: exact[0] };
  const first = people.filter((p) => normName(p.name).split(' ')[0] === q);
  if (first.length === 1) return { type: 'match', person: first[0] };
  const qw = q.split(' ');
  const close = people.filter((p) => {
    const n = normName(p.name);
    return n.includes(q) || q.includes(n) || n.split(' ').some((w) => qw.includes(w)) || lev(n, q) <= 2 || lev(n.split(' ')[0], qw[0]) <= 1
      || (qw[0].length >= 3 && (n.split(' ')[0].startsWith(qw[0]) || qw[0].startsWith(n.split(' ')[0])));
  });
  return { type: 'none', suggestions: close.slice(0, 5) };
}

export const blobToDataUrl = (blob) => new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(blob); });

export async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
