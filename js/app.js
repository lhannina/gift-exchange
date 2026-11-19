import { getStore } from './store.js';
import { drawNames, shuffle } from './draw.js';
import { burst } from './confetti.js';
import {
  esc, safeUrl, safeImg, domainOf, firstName, initials, colorFor, fmtDate, fmtWhen,
  compressImage, blobToDataUrl, wait, reducedMotion, findByName, normName, sha256,
} from './util.js';
import { ADMIN_EMAILS } from './firebase-config.js';

const DEMO_ADMIN = ADMIN_EMAILS[0] || 'you@example.com';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const app = $('#app');
const nav = $('#tabs');

let store;
let DEMO = false;
const S = { user: null, me: null, inExchange: false, isAdmin: false, config: {}, people: [], tab: 'match', viewing: null, match: undefined, assign: undefined, recipThread: undefined, unread: 0, unsub: null, prefill: '' };

/* ---------------- icons ---------------- */
const svg = (d) => `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const ICON = {
  gift: svg('<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 0 1 0 5"/>'),
  list: svg('<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>'),
  heart: svg('<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z"/>'),
  gear: svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
  cart: svg('<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/>'),
  ext: svg('<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3"/>'),
  x: svg('<path d="M18 6 6 18M6 6l12 12"/>'),
  back: svg('<path d="m15 18-6-6 6-6"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>'),
  camera: svg('<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>'),
  cal: svg('<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>'),
  money: svg('<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/>'),
  note: svg('<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>'),
  check: svg('<path d="M20 6 9 17l-5-5"/>'),
  chat: svg('<path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-3.8-.8L3 21l1.9-5.1A8.4 8.4 0 0 1 3 11.5 8.5 8.5 0 0 1 12 3a8.5 8.5 0 0 1 9 8.5z"/>'),
  send: svg('<path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/>'),
};

const TABS = [
  { id: 'match', label: 'My Match', icon: ICON.gift },
  { id: 'lists', label: 'Wishlists', icon: ICON.list },
  { id: 'mine', label: 'My List', icon: ICON.heart },
  { id: 'chat', label: 'Messages', icon: ICON.chat },
  { id: 'admin', label: 'Organizer', icon: ICON.gear, admin: true },
];

/* ---------------- boot ---------------- */
boot();

async function boot() {
  initTextSize();
  $('#signout').addEventListener('click', async () => {
    if (await confirmBox('Sign out?', 'You can sign back in with your organizer email and password.', 'Sign out')) store.signOut();
  });
  nav.addEventListener('click', (e) => {
    const b = e.target.closest('[data-tab]');
    if (b) go(b.dataset.tab);
  });
  app.addEventListener('click', (e) => {
    const z = e.target.closest('[data-zoom]');
    if (z) return zoomImage(z.dataset.zoom, z.dataset.title);
    const g = e.target.closest('[data-go]');
    if (g) { e.preventDefault(); go(g.dataset.go, { viewing: g.dataset.person || null, prefill: g.dataset.prefill || '' }); }
  });

  try {
    ({ store, DEMO } = await getStore());
  } catch (e) {
    console.error(e);
    app.innerHTML = msgCard('We could not start the app', 'Please check your internet connection, then refresh the page.');
    return;
  }
  if (DEMO) showDemoBanner();
  store.onUser((u) => {
    if (u) return startSession(u);
    store.startGuest().catch((e) => {
      console.error(e);
      app.innerHTML = msgCard('We could not start the app', 'Please check your internet connection, then refresh the page.');
    });
  });
}

function initTextSize() {
  const sizes = [100, 115, 130];
  let i = +(localStorage.getItem('giftx-text') || 0);
  const apply = () => {
    document.documentElement.style.fontSize = sizes[i] + '%';
    $('#textsize').setAttribute('aria-label', `Text size: ${['normal', 'large', 'extra large'][i]}. Tap to change.`);
    $('#textsize .lvl').textContent = ['A', 'A+', 'A++'][i];
  };
  $('#textsize').addEventListener('click', () => { i = (i + 1) % sizes.length; localStorage.setItem('giftx-text', i); apply(); });
  apply();
}

function showDemoBanner() {
  const b = $('#demo-banner');
  b.hidden = false;
  b.innerHTML = `<span><strong>Demo mode.</strong> Data saves only in this browser. Add your Firebase settings to go live.</span><button class="link-btn" id="reset-demo">Reset demo</button>`;
  $('#reset-demo').addEventListener('click', async () => {
    if (await confirmBox('Reset the demo?', 'This clears all demo people, wishlists and the draw.', 'Reset', true)) store.resetDemo();
  });
}

function setTitle() {
  const name = S.config.eventName || 'Gift Exchange';
  $('#event-name').textContent = name;
  document.title = name;
}

function setUserBar(me) {
  $('#who').textContent = me ? `Hi, ${firstName(me.name)}` : '';
  $('#signout').hidden = !(me && S.isAdmin);
}

/* ---------------- helpers ---------------- */
const loading = (t = 'Loading…') => `<div class="loading" role="status"><span class="spinner" aria-hidden="true"></span>${esc(t)}</div>`;
const msgCard = (title, text, extra = '') => `<section class="panel center"><h1 class="page-title">${esc(title)}</h1><p class="lead">${text}</p>${extra}</section>`;
const avatar = (p, cls = '') => `<span class="avatar ${cls}" style="--c:${colorFor(p.id || p.name)}" aria-hidden="true">${esc(initials(p.name))}</span>`;
const personName = (id) => S.people.find((p) => p.id === id)?.name || 'Someone';

function toast(msg, kind = 'ok') {
  const t = $('#toast');
  t.className = `toast show ${kind}`;
  t.textContent = msg;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => (t.className = 'toast'), 3800);
}

function addSnow(el, n = 26) {
  if (!el || reducedMotion()) return;
  el.innerHTML = Array.from({ length: n }, () => {
    const size = 3 + Math.random() * 6;
    return `<i style="left:${Math.random() * 100}%;width:${size}px;height:${size}px;animation-duration:${6 + Math.random() * 8}s;animation-delay:-${Math.random() * 10}s;opacity:${0.35 + Math.random() * 0.5}"></i>`;
  }).join('');
}

function authMessage(e) {
  const code = e?.code || '';
  const map = {
    'auth/invalid-verification-code': "That code isn't right. Please check the text message and try again.",
    'auth/code-expired': 'That code has expired. Tap "Text me a new code".',
    'auth/too-many-requests': 'Too many tries. Please wait a few minutes and try again.',
    'auth/quota-exceeded': 'Too many codes were sent today. Please try again later.',
    'auth/network-request-failed': 'No internet connection. Please check your Wi-Fi or data and try again.',
    'auth/billing-not-enabled': 'Text messages are not turned on for this site yet. Please tell the organizer.',
    'auth/captcha-check-failed': 'Something went wrong. Please refresh the page and try again.',
  };
  return map[code] || 'Something went wrong. Please try again.';
}

/* ---------------- modal ---------------- */
function openModal({ title, html, actions = [], dismissable = true, onClose, onOpen }) {
  const root = $('#modal-root');
  const wrap = document.createElement('div');
  wrap.className = 'modal-backdrop';
  wrap.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="m-title">
    <header class="modal-head"><h2 id="m-title" tabindex="-1">${esc(title)}</h2>
      <button class="close-btn" data-close aria-label="Close">${ICON.x}<span>Close</span></button></header>
    <div class="modal-body">${html}</div>
    ${actions.length ? `<footer class="modal-foot">${actions.map((a, i) => `<button class="btn ${a.kind || 'btn-secondary'}" data-act="${i}">${esc(a.label)}</button>`).join('')}</footer>` : ''}
  </div>`;
  root.appendChild(wrap);
  document.body.classList.add('modal-open');
  const prev = document.activeElement;
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    wrap.remove();
    if (!root.children.length) document.body.classList.remove('modal-open');
    onClose?.();
    prev?.focus?.();
  };
  wrap.addEventListener('click', (e) => {
    if ((dismissable && e.target === wrap) || e.target.closest('[data-close]')) return close();
    const b = e.target.closest('[data-act]');
    if (b) actions[+b.dataset.act].onClick?.({ close, el: wrap, btn: b });
  });
  wrap.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  setTimeout(() => ($('[autofocus]', wrap) || $('#m-title', wrap)).focus(), 40);
  onOpen?.(wrap, close);
  return { close, el: wrap };
}

function confirmBox(title, message, okLabel = 'Yes', danger = false) {
  return new Promise((res) => {
    let answered = false;
    openModal({
      title,
      html: `<p class="modal-msg">${message}</p>`,
      onClose: () => !answered && res(false),
      actions: [
        { label: 'Cancel', kind: 'btn-secondary', onClick: ({ close }) => { answered = true; res(false); close(); } },
        { label: okLabel, kind: danger ? 'btn-danger' : 'btn-primary', onClick: ({ close }) => { answered = true; res(true); close(); } },
      ],
    });
  });
}

function zoomImage(src, title = '') {
  openModal({ title: title || 'Picture', html: `<img class="zoomed" src="${esc(src)}" alt="${esc(title)}">` });
}

/* ---------------- login ---------------- */
function loginShell(title, text, formHtml) {
  S.me = null;
  nav.hidden = true;
  setUserBar(null);
  $('#event-name').textContent = S.config.eventName || 'Gift Exchange';
  app.innerHTML = `
  <section class="hero">
    <div class="snowfield" aria-hidden="true"></div>
    <div class="hero-inner">
      <div class="mini-gift" aria-hidden="true"><span class="lid"></span><span class="box"></span></div>
      <h1>${title}</h1>
      <p>${text}</p>
    </div>
  </section>
  <div class="panel login-form">${formHtml}</div>`;
  addSnow($('.snowfield'));
}

function renderLogin(prefill = '') {
  loginShell('Welcome to the Gift Exchange!', 'Type your name to get started. No password needed.', `
    <form id="name-form" novalidate>
      <label for="yourname">Your name</label>
      <input id="yourname" autocomplete="off" autocapitalize="words" placeholder="Example: Mom or Bob" value="${esc(prefill)}" required>
      <p class="help">Type the name the organizer used for you, like Mom, Grandpa, or Bob.</p>
      <button class="btn btn-primary btn-lg btn-block" id="go-btn">Continue</button>
      <div id="name-result" role="alert"></div>
    </form>
    <div class="org-link"><button type="button" class="btn btn-ghost" id="org-btn">Organizer? Sign in here</button></div>`);

  const input = $('#yourname');
  const out = $('#name-result');
  input.focus();
  $('#org-btn').addEventListener('click', renderAdminLogin);

  const pick = (p) => {
    if (p.claimedBy && p.claimedBy !== S.user.uid) {
      out.innerHTML = `<div class="callout warn"><strong>${esc(p.name)} has already joined.</strong><p>If that's you and you're on a new phone or computer, ask the organizer to reset your name. Then come back and try again.</p></div>`;
      return;
    }
    renderConfirm(p, input.value);
  };

  $('#name-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    out.innerHTML = '';
    if (!input.value.trim()) { out.innerHTML = '<p class="form-error">Please type your name.</p>'; input.focus(); return; }
    const btn = $('#go-btn');
    btn.disabled = true; btn.textContent = 'Looking…';
    try {
      const people = await store.listParticipants();
      const res = findByName(input.value, people);
      if (res.type === 'match') return pick(res.person);
      out.innerHTML = res.suggestions.length
        ? `<div class="callout"><strong>Did you mean:</strong><div class="suggest">${res.suggestions.map((p) => `<button type="button" class="btn btn-secondary btn-block" data-pid="${esc(p.id)}">${esc(p.name)}</button>`).join('')}</div><p class="help">Not you? Check the spelling, or ask the organizer what name they used for you.</p></div>`
        : `<div class="callout warn"><strong>We couldn't find "${esc(input.value.trim())}".</strong><p>Check the spelling, or try the name the family calls you (like Mom or Grandpa). Still stuck? Ask the organizer what name they used for you.</p></div>`;
      $$('[data-pid]', out).forEach((b) => b.addEventListener('click', () => pick(res.suggestions.find((p) => p.id === b.dataset.pid))));
    } catch (ex) {
      console.error(ex);
      out.innerHTML = '<p class="form-error">Something went wrong. Please check your internet and try again.</p>';
    } finally {
      btn.disabled = false; btn.textContent = 'Continue';
    }
  });
}

function renderConfirm(p, typed) {
  loginShell(`Are you ${esc(p.name)}?`, 'Please make sure this is really you.', `
    <div class="confirm-who">${avatar(p, 'xl-plain')}<strong>${esc(p.name)}</strong></div>
    <button class="btn btn-primary btn-lg btn-block" id="yes">Yes, that's me</button>
    <button class="btn btn-secondary btn-lg btn-block" id="no">No, go back</button>
    <p class="help center">This phone or computer will remember you, so you won't have to do this again.</p>
    <p class="form-error center" id="claim-error" role="alert"></p>`);
  $('#no').addEventListener('click', () => renderLogin(typed));
  $('#yes').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true; btn.textContent = 'Joining…';
    try {
      await store.claim(p.id, S.user.uid);
      toast(`Welcome, ${firstName(p.name)}!`);
      await startSession(S.user);
    } catch (ex) {
      console.error(ex);
      $('#claim-error').textContent = 'Someone already joined with that name. If that was not you, tell the organizer.';
      btn.disabled = false; btn.textContent = "Yes, that's me";
    }
  });
}

function renderAdminLogin() {
  loginShell('Organizer sign in', 'Use the organizer email and password.', `
    <form id="admin-form" novalidate>
      <label for="a-email">Email</label>
      <input id="a-email" type="email" autocomplete="username" required>
      <label for="a-pw">Password</label>
      <input id="a-pw" type="password" autocomplete="current-password" required>
      ${DEMO ? `<p class="help">Demo: <strong>${esc(DEMO_ADMIN)}</strong>, password <strong>demo</strong></p>` : ''}
      <button class="btn btn-primary btn-lg btn-block" id="a-btn">Sign in</button>
      <p class="form-error" id="a-err" role="alert"></p>
    </form>
    <div class="org-link"><button type="button" class="btn btn-ghost" id="back-btn">Back</button></div>`);
  $('#a-email').focus();
  $('#back-btn').addEventListener('click', () => renderLogin());
  $('#admin-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('#a-btn');
    $('#a-err').textContent = '';
    btn.disabled = true; btn.textContent = 'Signing in…';
    try {
      await store.adminSignIn($('#a-email').value.trim(), $('#a-pw').value);
    } catch (ex) {
      console.error(ex);
      $('#a-err').textContent = 'That email or password is not right.';
      btn.disabled = false; btn.textContent = 'Sign in';
    }
  });
}

/* ---------------- session ---------------- */
async function startSession(u) {
  S.user = u;
  app.innerHTML = loading();
  try {
    S.isAdmin = store.isAdmin(u);
    const [me, config] = await Promise.all([store.getMyPerson(u.uid), store.getConfig()]);
    S.config = config;
    setTitle();
    if (!me && !S.isAdmin) return renderLogin();
    S.inExchange = !!me;
    S.me = me || { id: null, name: 'Organizer' };
    S.people = await store.listParticipants();
    S.match = undefined; S.assign = undefined; S.recipThread = undefined;
    setUserBar(S.me);
    go(S.tab === 'admin' && !S.isAdmin ? 'match' : S.tab);
  } catch (e) {
    console.error(e);
    app.innerHTML = msgCard('Something went wrong', 'Please check your internet connection and refresh the page.');
  }
}

function renderTabs() {
  const tabs = TABS.filter((t) => !t.admin || S.isAdmin);
  nav.style.setProperty('--n', tabs.length);
  nav.classList.toggle('five', tabs.length >= 5);
  nav.innerHTML = tabs.map((t) => {
    const badge = t.id === 'chat' && S.unread ? `<span class="tab-badge" aria-label="${S.unread} new">${S.unread}</span>` : '';
    return `<button data-tab="${t.id}" ${S.tab === t.id ? 'aria-current="page"' : ''}><span class="tab-icon">${t.icon}${badge}</span><span>${t.label}</span></button>`;
  }).join('');
  nav.hidden = false;
}

const VIEWS = { match: renderMatch, lists: renderLists, mine: renderMine, chat: renderChat, admin: renderAdmin };

async function go(tab, opts = {}) {
  S.unsub?.();
  S.unsub = null;
  S.tab = tab;
  S.viewing = opts.viewing || null;
  S.prefill = opts.prefill || '';
  renderTabs();
  refreshUnread();
  window.scrollTo(0, 0);
  app.innerHTML = loading();
  try {
    await VIEWS[tab]();
  } catch (e) {
    console.error(e);
    app.innerHTML = msgCard('Something went wrong', 'Please check your internet connection and try again.', `<button class="btn btn-primary" data-go="${tab}">Try again</button>`);
  }
}

async function getMatch() {
  if (S.assign === undefined) S.assign = S.inExchange && S.config.drawDone ? await store.getAssignment(S.me.id) : null;
  S.match = S.assign?.receiver || null;
  return S.match;
}

/* ---------------- unread messages ---------------- */
const seenKey = (tid, role) => `giftx-seen-${tid}-${role}`;
const getSeen = (tid, role) => +(localStorage.getItem(seenKey(tid, role)) || 0);
const markSeen = (tid, role, at) => { if (at > getSeen(tid, role)) localStorage.setItem(seenKey(tid, role), at); };

// role 'santa' = I'm writing to the person I drew. role 'recipient' = I'm talking to my own Secret Santa.
async function getThreads() {
  if (!S.inExchange || !S.config.drawDone) return { santa: null, recipient: null };
  await getMatch();
  if (S.recipThread === undefined) S.recipThread = await store.getRecipientThread(S.me.id);
  return { santa: S.me.revealed ? S.assign?.thread || null : null, recipient: S.recipThread };
}

async function unreadFor(tid, role) {
  if (!tid) return { count: 0, last: null };
  const msgs = await store.recentMessages(tid); // newest first
  const other = role === 'santa' ? 'recipient' : 'santa';
  const seen = getSeen(tid, role);
  return { count: msgs.filter((m) => m.from === other && m.at > seen).length, last: msgs[0] || null };
}

async function refreshUnread() {
  try {
    const t = await getThreads();
    const [a, b] = await Promise.all([unreadFor(t.santa, 'santa'), unreadFor(t.recipient, 'recipient')]);
    const n = a.count + b.count;
    if (n !== S.unread) { S.unread = n; renderTabs(); }
  } catch (e) { console.warn(e); }
}

/* ---------------- MY MATCH ---------------- */
function eventInfo() {
  const c = S.config;
  const rows = [];
  if (c.exchangeDate) rows.push(`<li>${ICON.cal}<div><span class="lbl">Gift exchange day</span>${esc(fmtDate(c.exchangeDate))}</div></li>`);
  if (c.budget) rows.push(`<li>${ICON.money}<div><span class="lbl">Spending limit</span>${esc(c.budget)}</div></li>`);
  if (c.message) rows.push(`<li>${ICON.note}<div><span class="lbl">Note from the organizer</span>${esc(c.message)}</div></li>`);
  return rows.length ? `<section class="panel info"><h2>Event details</h2><ul class="info-list">${rows.join('')}</ul></section>` : '';
}

async function renderMatch() {
  if (!S.inExchange) {
    app.innerHTML = msgCard("You're the organizer", 'You are not in the exchange yourself. To take part, add your name on the <strong>Organizer</strong> tab and tap <strong>This is me</strong>.', `<button class="btn btn-primary btn-lg" data-go="admin">Go to Organizer</button>`) + eventInfo();
    return;
  }
  if (!S.config.drawDone) {
    app.innerHTML = `
      <section class="hero">
        <div class="snowfield" aria-hidden="true"></div>
        <div class="hero-inner">
          <div class="mini-gift wiggle" aria-hidden="true"><span class="lid"></span><span class="box"></span></div>
          <h1>Hi ${esc(firstName(S.me.name))}!</h1>
          <p class="waiting-big">You're in!</p>
          <p>Waiting for everyone to join. Once everyone is in, names will be drawn and the gift exchange begins.</p>
        </div>
      </section>
      <section class="panel">
        <h2>While you wait</h2>
        <p>Add a few gift ideas to your wishlist so your Secret Santa knows what you'd like.</p>
        <button class="btn btn-primary btn-lg btn-block" data-go="mine">${ICON.heart} Add to my wishlist</button>
      </section>
      ${eventInfo()}`;
    addSnow($('.snowfield'));
    return;
  }
  const rid = await getMatch();
  const r = S.people.find((p) => p.id === rid);
  if (!r) {
    // Joined after names were drawn. The organizer adds them from the Organizer tab.
    app.innerHTML = `
      <section class="hero">
        <div class="snowfield" aria-hidden="true"></div>
        <div class="hero-inner">
          <div class="mini-gift wiggle" aria-hidden="true"><span class="lid"></span><span class="box"></span></div>
          <h1>Hi ${esc(firstName(S.me.name))}!</h1>
          <p class="waiting-big">You're in!</p>
          <p>Names were already drawn, so the organizer will add you soon. Check back here to open your present.</p>
        </div>
      </section>
      <section class="panel">
        <h2>While you wait</h2>
        <p>Add a few gift ideas to your wishlist so your Secret Santa knows what you'd like.</p>
        <button class="btn btn-primary btn-lg btn-block" data-go="mine">${ICON.heart} Add to my wishlist</button>
      </section>
      ${eventInfo()}`;
    addSnow($('.snowfield'));
    return;
  }
  if (S.me.revealed) showResult(r, false);
  else showGift(r, true);
  if (S.unread) app.insertAdjacentHTML('afterbegin', `<button class="new-msg" data-go="chat">${ICON.chat}<span>You have <strong>${S.unread} new message${S.unread > 1 ? 's' : ''}</strong>. Tap to read.</span></button>`);
}

function showGift(r, persist) {
  app.innerHTML = `
    <section class="stage">
      <div class="snowfield" aria-hidden="true"></div>
      ${persist && S.me.matchChanged
        ? `<p class="kicker">${esc(firstName(S.me.name))}, your match changed!</p>
           <h1 class="stage-title">You have a new person</h1>
           <p class="changed-note">Someone joined the exchange late, so you're buying for someone new. Sorry for the switch! Tap to see who.</p>`
        : `<p class="kicker">${esc(firstName(S.me.name))}, your match is ready!</p>
           <h1 class="stage-title">Who did you get?</h1>`}
      <div class="gift-wrap">
        <button class="giftbox" id="giftbox" aria-label="Open your present to see who you got">
          <span class="glow"></span>
          <span class="lid"><span class="bow"></span></span>
          <span class="box"></span>
        </button>
      </div>
      <p class="hint" id="hint">Tap the present to open it</p>
      <p class="secret">Make sure nobody is peeking at your screen!</p>
    </section>
    ${eventInfo()}`;
  addSnow($('.snowfield'));
  $('#giftbox').addEventListener('click', () => openGift(r, persist), { once: true });
}

async function openGift(r, persist) {
  const box = $('#giftbox');
  const hint = $('#hint');
  const fast = reducedMotion();
  hint.textContent = 'Unwrapping…';
  box.classList.add('shake');
  await wait(fast ? 0 : 1300);
  box.classList.remove('shake');
  box.classList.add('open');
  const rect = box.getBoundingClientRect();
  burst(rect.left + rect.width / 2, rect.top + rect.height * 0.35);
  await wait(fast ? 200 : 850);
  if (persist) {
    S.me.revealed = true;
    S.me.matchChanged = false;
    store.setRevealed(S.me.id).catch(console.error);
  }
  showResult(r, true);
}

function showResult(r, animate) {
  const letters = [...r.name].map((ch, i) => (ch === ' ' ? '<span class="sp"> </span>' : `<span style="--i:${i}">${esc(ch)}</span>`)).join('');
  app.innerHTML = `
    <section class="stage result ${animate ? 'animate' : ''}">
      <div class="snowfield" aria-hidden="true"></div>
      <p class="kicker">You're getting a gift for</p>
      ${avatar(r, 'xl pop')}
      <h1 class="match-name" aria-label="${esc(r.name)}">${letters}</h1>
      <p class="secret">Shh! It's a secret. Don't tell ${esc(firstName(r.name))}.</p>
      <div class="stack">
        <button class="btn btn-gold btn-lg btn-block" data-go="lists" data-person="${esc(r.id)}">${ICON.list} See ${esc(firstName(r.name))}'s wishlist</button>
        <button class="btn btn-on-dark btn-block" data-go="chat" data-person="santa">${ICON.chat} Ask ${esc(firstName(r.name))} a question</button>
        <button class="btn btn-ghost on-dark-link" id="replay">Watch the surprise again</button>
      </div>
    </section>
    ${eventInfo()}`;
  addSnow($('.snowfield'));
  $('#replay').addEventListener('click', () => showGift(r, false));
  if (animate) setTimeout(() => {
    const n = $('.match-name');
    if (!n) return;
    const b = n.getBoundingClientRect();
    burst(b.left + b.width / 2, b.top, 90);
  }, 700);
}

/* ---------------- WISHLISTS ---------------- */
function itemCard(it, { editable = false, askName = '' } = {}) {
  const img = safeImg(it.imageUrl);
  const links = (it.links || []).map(safeUrl).filter(Boolean);
  return `<article class="item ${img ? '' : 'no-img'}">
    <div class="item-img">${img
      ? `<button class="img-btn" data-zoom="${esc(img)}" data-title="${esc(it.title)}" aria-label="Show a bigger picture of ${esc(it.title)}"><img src="${esc(img)}" alt="" loading="lazy"></button>`
      : `<div class="img-ph" aria-hidden="true">${ICON.gift}</div>`}</div>
    <div class="item-body">
      <h3>${esc(it.title)}</h3>
      ${it.price ? `<p class="price">${esc(it.price)}</p>` : ''}
      ${it.details ? `<p class="detail"><span class="lbl">Size / color / style:</span> ${esc(it.details)}</p>` : ''}
      ${it.notes ? `<p class="detail">${esc(it.notes)}</p>` : ''}
      ${links.length ? `<div class="links">${links.map((u) => `<a class="btn btn-store" href="${esc(u)}" target="_blank" rel="noopener noreferrer">${ICON.cart}<span>See it at ${esc(domainOf(u))}</span>${ICON.ext}</a>`).join('')}</div>` : ''}
      ${askName ? `<button class="btn btn-ghost ask-btn" data-go="chat" data-person="santa" data-prefill="${esc(`About the ${it.title}: `)}">${ICON.chat} Ask ${esc(askName)} about this</button>` : ''}
      ${editable ? `<div class="item-actions"><button class="btn btn-secondary" data-edit="${esc(it.id)}">Edit</button><button class="btn btn-ghost danger-text" data-del="${esc(it.id)}">Remove</button></div>` : ''}
    </div>
  </article>`;
}

async function renderLists() {
  if (S.viewing) return renderPersonList(S.viewing);
  const match = S.me.revealed ? await getMatch() : null;
  const others = S.people.filter((p) => p.id !== S.me.id);
  others.sort((a, b) => (b.id === match) - (a.id === match) || a.name.localeCompare(b.name));
  const counts = await Promise.all(others.map((p) => store.listItems(p.id).then((l) => l.length).catch(() => 0)));
  app.innerHTML = `
    <h1 class="page-title">Wishlists</h1>
    <p class="lead">Tap a name to see the gifts they'd like.</p>
    ${others.length ? `<ul class="people">${others.map((p, i) => `
      <li><button class="person ${p.id === match ? 'is-match' : ''}" data-go="lists" data-person="${esc(p.id)}">
        ${avatar(p)}
        <span class="person-text"><span class="person-name">${esc(p.name)}</span>
        <span class="person-sub">${counts[i] ? `${counts[i]} gift idea${counts[i] > 1 ? 's' : ''}` : 'No ideas yet'}</span></span>
        ${p.id === match ? '<span class="badge">Your person</span>' : ''}
        <span class="chev" aria-hidden="true">›</span>
      </button></li>`).join('')}</ul>` : `<section class="panel"><p>Nobody else has been added yet.</p></section>`}`;
}

async function renderPersonList(pid) {
  const p = S.people.find((x) => x.id === pid);
  if (!p) return go('lists');
  const items = await store.listItems(pid);
  const match = S.me.revealed ? await getMatch() : null;
  app.innerHTML = `
    <button class="btn btn-ghost back-btn" data-go="lists">${ICON.back} All wishlists</button>
    <header class="person-head">${avatar(p, 'lg')}<div>
      <h1 class="page-title">${esc(firstName(p.name))}'s wishlist</h1>
      ${pid === match ? '<span class="badge">Your person</span>' : ''}
    </div></header>
    ${items.length ? `<div class="items">${items.map((it) => itemCard(it, { askName: pid === match ? firstName(p.name) : '' })).join('')}</div>`
      : `<section class="panel center"><div class="img-ph big" aria-hidden="true">${ICON.gift}</div><p class="lead">${esc(firstName(p.name))} hasn't added any gift ideas yet. Check back later!</p>
        ${pid === match ? `<button class="btn btn-primary" data-go="chat" data-person="santa" data-prefill="Hi! Is there anything you'd like for Christmas? ">${ICON.chat} Ask ${esc(firstName(p.name))} what they'd like</button>` : ''}</section>`}`;
}

/* ---------------- MY LIST ---------------- */
async function renderMine() {
  if (!S.inExchange) {
    app.innerHTML = msgCard('Not in the exchange', 'Add yourself on the Organizer tab to make a wishlist.', `<button class="btn btn-primary btn-lg" data-go="admin">Go to Organizer</button>`);
    return;
  }
  const items = await store.listItems(S.me.id);
  app.innerHTML = `
    <h1 class="page-title">My wishlist</h1>
    <p class="lead">Add things you'd love to get. Everyone in the exchange can see this list.</p>
    <button class="btn btn-primary btn-lg btn-block" id="add-item">${ICON.plus} Add a gift idea</button>
    ${items.length ? `<div class="items">${items.map((it) => itemCard(it, { editable: true })).join('')}</div>`
      : `<section class="panel center"><div class="img-ph big" aria-hidden="true">${ICON.gift}</div><p class="lead">Your list is empty. Tap <strong>Add a gift idea</strong> to start.</p></section>`}`;
  $('#add-item').addEventListener('click', () => openItemForm());
  $$('[data-edit]').forEach((b) => b.addEventListener('click', () => openItemForm(items.find((i) => i.id === b.dataset.edit))));
  $$('[data-del]').forEach((b) => b.addEventListener('click', async () => {
    const it = items.find((i) => i.id === b.dataset.del);
    if (!(await confirmBox('Remove this gift idea?', `"${esc(it.title)}" will be taken off your list.`, 'Remove', true))) return;
    await store.deleteItem(S.me.id, it.id);
    toast('Removed from your list.');
    renderMine();
  }));
}

function openItemForm(existing = null) {
  const it = existing || {};
  let photoBlob = null;
  let imageUrl = it.imageUrl || '';
  const links = it.links?.length ? it.links : [''];
  const linkRow = (v = '') => `<div class="link-row"><input type="url" inputmode="url" class="link-input" placeholder="https://www.amazon.com/..." value="${esc(v)}" aria-label="Store website link"><button type="button" class="icon-only" data-rm-link aria-label="Remove this link">${ICON.x}</button></div>`;

  openModal({
    title: existing ? 'Edit gift idea' : 'Add a gift idea',
    dismissable: false,
    html: `
      <form id="item-form" class="form" novalidate>
        <label for="f-title">What is it? <span class="req">(required)</span></label>
        <input id="f-title" value="${esc(it.title)}" placeholder="Example: Warm winter slippers" autofocus>

        <label>Picture</label>
        <div class="photo-box">
          <div class="photo-preview" id="photo-preview"></div>
          <label class="btn btn-secondary btn-block file-btn">${ICON.camera}<span>Take or choose a photo</span>
            <input type="file" accept="image/*" id="f-photo" hidden></label>
          <details class="paste-url" ${imageUrl && !/^(data|blob):/.test(imageUrl) && !/^data:/.test(imageUrl) ? 'open' : ''}>
            <summary>Or paste a picture link from a website</summary>
            <input id="f-imgurl" type="url" placeholder="https://..." value="${esc(/^(data|blob):/.test(imageUrl) || /^data:/.test(imageUrl) ? '' : imageUrl)}">
          </details>
        </div>

        <label>Where can it be bought?</label>
        <p class="help">Copy the web address of the store page and paste it here.</p>
        <div id="links">${links.map(linkRow).join('')}</div>
        <button type="button" class="btn btn-ghost" id="add-link">${ICON.plus} Add another store</button>

        <label for="f-price">About how much does it cost?</label>
        <input id="f-price" value="${esc(it.price)}" placeholder="Example: About $25">

        <label for="f-details">Size, color, or style</label>
        <input id="f-details" value="${esc(it.details)}" placeholder="Example: Women's size 8, gray">

        <label for="f-notes">Anything else your Secret Santa should know?</label>
        <textarea id="f-notes" rows="3" placeholder="Example: Any brand is fine!">${esc(it.notes)}</textarea>
        <p class="form-error" id="item-error" role="alert"></p>
      </form>`,
    actions: [
      { label: 'Cancel', kind: 'btn-secondary', onClick: ({ close }) => close() },
      { label: existing ? 'Save changes' : 'Add to my list', kind: 'btn-primary', onClick: save },
    ],
    onOpen(el) {
      const preview = $('#photo-preview', el);
      const show = (src) => {
        preview.innerHTML = src ? `<img src="${esc(src)}" alt="Gift picture preview"><button type="button" class="btn btn-ghost danger-text" id="rm-photo">Remove picture</button>` : '';
        $('#rm-photo', el)?.addEventListener('click', () => { photoBlob = null; imageUrl = ''; $('#f-imgurl', el).value = ''; show(''); });
      };
      show(safeImg(imageUrl));
      $('#f-photo', el).addEventListener('change', async (e) => {
        const f = e.target.files[0];
        if (!f) return;
        try {
          photoBlob = await compressImage(f, 700, 0.72);
          if (photoBlob.size > 450000) photoBlob = await compressImage(f, 500, 0.6);
          show(URL.createObjectURL(photoBlob));
        } catch (ex) { $('#item-error', el).textContent = ex.message; }
      });
      $('#f-imgurl', el).addEventListener('change', (e) => {
        const u = safeUrl(e.target.value);
        if (u) { photoBlob = null; imageUrl = u; show(u); }
      });
      $('#add-link', el).addEventListener('click', () => {
        $('#links', el).insertAdjacentHTML('beforeend', linkRow());
        $$('.link-input', el).at(-1).focus();
      });
      $('#links', el).addEventListener('click', (e) => {
        const b = e.target.closest('[data-rm-link]');
        if (!b) return;
        const rows = $$('.link-row', el);
        if (rows.length > 1) b.closest('.link-row').remove();
        else rows[0].querySelector('input').value = '';
      });
    },
  });

  async function save({ close, el, btn }) {
    const err = $('#item-error', el);
    err.textContent = '';
    const title = $('#f-title', el).value.trim();
    if (!title) { err.textContent = 'Please tell us what the gift is.'; $('#f-title', el).focus(); return; }
    const raw = $$('.link-input', el).map((i) => i.value.trim()).filter(Boolean);
    const clean = raw.map(safeUrl);
    if (clean.some((u) => u === null)) { err.textContent = "One of the store links doesn't look right. It should look like www.store.com/item"; return; }
    btn.disabled = true;
    btn.textContent = 'Saving…';
    try {
      let img = imageUrl;
      if (photoBlob) img = await blobToDataUrl(photoBlob);
      await store.saveItem(S.me.id, {
        title,
        links: clean,
        imageUrl: img || '',
        price: $('#f-price', el).value.trim(),
        details: $('#f-details', el).value.trim(),
        notes: $('#f-notes', el).value.trim(),
      }, existing?.id);
      close();
      toast(existing ? 'Changes saved!' : 'Added to your list!');
      renderMine();
    } catch (ex) {
      console.error(ex);
      err.textContent = 'We could not save that. Please check your internet and try again.';
      btn.disabled = false;
      btn.textContent = existing ? 'Save changes' : 'Add to my list';
    }
  }
}

/* ---------------- MESSAGES ---------------- */
const fmtTime = (ms) => {
  const d = new Date(ms);
  const today = new Date().toDateString() === d.toDateString();
  return today ? d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ', ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
};

async function renderChat() {
  if (!S.inExchange) {
    app.innerHTML = msgCard('Messages', 'Add yourself to the exchange on the Organizer tab to send messages.');
    return;
  }
  if (!S.config.drawDone) {
    app.innerHTML = msgCard('Messages', "Messages open once names are drawn. Then you can ask your person questions (like their shoe size) <strong>without them knowing it's you</strong>.");
    return;
  }
  await getMatch();
  if (!S.assign) {
    app.innerHTML = msgCard('Messages', "Messages open once the organizer adds you to the draw. Check back soon!");
    return;
  }
  if (S.viewing === 'santa' || S.viewing === 'recipient') return renderThread(S.viewing);

  const t = await getThreads();
  const match = S.people.find((p) => p.id === S.match);
  const [a, b] = await Promise.all([unreadFor(t.santa, 'santa'), unreadFor(t.recipient, 'recipient')]);
  const preview = (u, role) => u.last
    ? `<span class="person-sub">${u.last.from === role ? 'You: ' : ''}${esc(u.last.text.slice(0, 60))}${u.last.text.length > 60 ? '…' : ''}</span>`
    : '<span class="person-sub">No messages yet</span>';

  app.innerHTML = `
    <h1 class="page-title">Messages</h1>
    <p class="lead">Ask questions and answer them, while keeping the secret.</p>
    <ul class="people">
      <li>${S.me.revealed && match
        ? `<button class="person" data-go="chat" data-person="santa">
            ${avatar(match)}
            <span class="person-text"><span class="person-name">${esc(match.name)}</span>
            <span class="person-sub strong">The person you're buying for. They won't know it's you.</span>${preview(a, 'santa')}</span>
            ${a.count ? `<span class="count">${a.count}</span>` : ''}<span class="chev" aria-hidden="true">›</span></button>`
        : `<button class="person" data-go="match">
            <span class="avatar santa-av" aria-hidden="true">${ICON.gift}</span>
            <span class="person-text"><span class="person-name">The person you drew</span>
            <span class="person-sub">Open your present on My Match first to see who you got.</span></span>
            <span class="chev" aria-hidden="true">›</span></button>`}
      </li>
      <li><button class="person" data-go="chat" data-person="recipient">
            <span class="avatar santa-av" aria-hidden="true">?</span>
            <span class="person-text"><span class="person-name">My Secret Santa</span>
            <span class="person-sub strong">The person buying for you. You won't know who it is.</span>${preview(b, 'recipient')}</span>
            ${b.count ? `<span class="count">${b.count}</span>` : ''}<span class="chev" aria-hidden="true">›</span></button>
      </li>
    </ul>`;
}

async function renderThread(role) {
  const t = await getThreads();
  const tid = t[role];
  if (!tid) return go(role === 'santa' ? 'match' : 'chat');
  const match = S.people.find((p) => p.id === S.match);
  const isSanta = role === 'santa';
  const them = isSanta ? firstName(match?.name) : 'Secret Santa';
  const chips = isSanta
    ? ['What size do you wear?', 'What color would you like?', 'Is there anything you already have?', 'Which store do you like best?']
    : ['Thank you!', 'Good question, let me check.', 'Anything on my list is great!'];

  app.innerHTML = `
    <button class="btn btn-ghost back-btn" data-go="chat">${ICON.back} All messages</button>
    <header class="chat-head">
      ${isSanta && match ? avatar(match, 'lg') : '<span class="avatar lg santa-av" aria-hidden="true">?</span>'}
      <div><h1 class="page-title">${isSanta ? esc(match?.name || '') : 'My Secret Santa'}</h1>
      <p class="chat-sub">${isSanta
        ? `${esc(them)} sees you as <strong>"Your Secret Santa"</strong>. Your name stays hidden.`
        : 'Someone in the exchange is buying for you. Answer their questions here.'}</p></div>
    </header>
    <div class="thread" id="thread" aria-live="polite"><div class="loading"><span class="spinner"></span></div></div>
    <form class="composer" id="composer">
      <div class="chips" aria-label="Quick messages">${chips.map((c) => `<button type="button" class="chip" data-chip="${esc(c)}">${esc(c)}</button>`).join('')}</div>
      <label for="msg" class="sr">Your message</label>
      <textarea id="msg" rows="3" maxlength="1000" placeholder="${isSanta ? `Type a question for ${esc(them)}…` : 'Type a message to your Secret Santa…'}">${esc(S.prefill)}</textarea>
      <button class="btn btn-primary btn-lg btn-block" id="send">${ICON.send} Send</button>
      ${isSanta ? '<p class="help center">Tip: don\'t sign your name, or the surprise is spoiled!</p>' : ''}
    </form>`;

  const box = $('#thread');
  const input = $('#msg');
  if (S.prefill) { input.focus(); input.setSelectionRange(input.value.length, input.value.length); }

  S.unsub = store.watchMessages(tid, (msgs) => {
    if (!document.body.contains(box)) return;
    box.innerHTML = msgs.length
      ? msgs.map((m) => {
          const mine = m.from === role;
          return `<div class="bubble ${mine ? 'mine' : 'theirs'}"><span class="who">${mine ? 'You' : esc(them)}</span><p>${esc(m.text)}</p><time>${esc(fmtTime(m.at))}</time></div>`;
        }).join('')
      : `<p class="empty-chat">${isSanta ? `Ask ${esc(them)} anything about their wishlist. Sizes, colors, favorites…` : 'No messages yet. You can send a note to your Secret Santa too, like a size you forgot to add.'}</p>`;
    const last = msgs.filter((m) => m.from !== role).at(-1);
    if (last) markSeen(tid, role, last.at);
    refreshUnread();
    box.scrollTop = box.scrollHeight;
    if (msgs.length) $('.composer')?.scrollIntoView({ block: 'end' });
  });

  $$('[data-chip]').forEach((c) => c.addEventListener('click', () => {
    input.value = (input.value.trim() ? input.value.trim() + ' ' : '') + c.dataset.chip;
    input.focus();
  }));
  $('#composer').addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) { input.focus(); return; }
    const btn = $('#send');
    btn.disabled = true;
    try {
      await store.sendMessage(tid, role, text);
      input.value = '';
      S.prefill = '';
      toast('Message sent!');
    } catch (ex) {
      console.error(ex);
      toast('Your message did not send. Please try again.', 'err');
    } finally {
      btn.disabled = false;
    }
  });
}

/* ---------------- ORGANIZER ---------------- */
async function renderAdmin() {
  if (!S.isAdmin) return go('match');
  const [people, rules, config, history] = await Promise.all([store.listParticipants(), store.listRules(), store.getConfig(), store.getHistory()]);
  const hasLastYear = !!history.last?.hashes?.length;
  S.people = people;
  S.config = config;
  const c = config;
  const joined = people.filter((p) => p.claimedBy);
  const waiting = people.filter((p) => !p.claimedBy);
  const minPeople = c.noSwap ? 3 : 2;
  const canDraw = joined.length >= minPeople;
  const inDraw = (p) => p.inDraw ?? (c.drawDone && !!p.claimedBy); // older data had no inDraw flag
  const drawn = people.filter(inDraw);
  const late = c.drawDone ? joined.filter((p) => !inDraw(p)) : [];
  const opened = drawn.filter((p) => p.revealed).length;
  const names = (list) => list.map((p) => `<strong>${esc(p.name)}</strong>`).join(', ');
  const opts = () => `<option value="">Choose a person</option>` + people.map((p) => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('');
  const siteUrl = location.href.split('#')[0].split('?')[0];
  const invite = `You're invited to our ${c.eventName || 'Gift Exchange'}! Open this link: ${siteUrl} and type your name (the one the family calls you, like Mom or Bob). Once names are drawn, tap the present to see who you got!`;
  const status = (p) => {
    if (!p.claimedBy) return '<span class="status">Hasn\'t joined yet</span>';
    if (c.drawDone && !inDraw(p)) return '<span class="status late">Joined late, not in the draw yet</span>';
    if (c.drawDone) return `<span class="status yes">${p.revealed ? 'Opened present' : 'In the draw, not opened yet'}</span>`;
    return `<span class="status yes">Joined ${esc(fmtWhen(p.claimedAt))}</span>`;
  };

  app.innerHTML = `
    <h1 class="page-title">Organizer</h1>
    <p class="lead">Only organizers can see this page. Work through the steps in order.</p>
    ${c.drawDone
      ? `<div class="notice ok">${ICON.check}<span>Names were drawn on ${esc(fmtWhen(c.drawnAt))}. <strong>${opened} of ${drawn.length}</strong> people in the draw have opened their present.${late.length ? ` <strong>${late.length} joined late</strong> and ${late.length > 1 ? 'are' : 'is'} waiting for you in step 5.` : ''}</span></div>`
      : `<div class="notice ${!waiting.length && canDraw ? 'ok' : ''}">${ICON.check}<span><strong>${joined.length} of ${people.length}</strong> people have joined.${!waiting.length && canDraw ? ' Everyone is in!' : ''}</span></div>`}

    <section class="panel">
      <h2><span class="step">1</span> Event details</h2>
      <form id="cfg-form" class="form">
        <label for="c-name">Name of your exchange</label>
        <input id="c-name" value="${esc(c.eventName || '')}" placeholder="Example: Garcia Family Christmas">
        <label for="c-date">Gift exchange day</label>
        <input id="c-date" type="date" value="${esc(c.exchangeDate || '')}">
        <label for="c-budget">Spending limit</label>
        <input id="c-budget" value="${esc(c.budget || '')}" placeholder="Example: $30">
        <label for="c-msg">Note for everyone</label>
        <textarea id="c-msg" rows="2" placeholder="Example: Christmas Eve at Grandma's, 6 pm">${esc(c.message || '')}</textarea>
        <label class="check"><input type="checkbox" id="c-noswap" ${c.noSwap ? 'checked' : ''}><span>Don't let two people draw each other (no swaps)</span></label>
        <label class="check"><input type="checkbox" id="c-norepeat" ${c.avoidLastYear !== false ? 'checked' : ''}><span>Don't give anyone the same person as last year</span></label>
        ${hasLastYear ? '' : '<p class="help">This starts working after your first "Start a new year".</p>'}
        <button class="btn btn-primary">Save event details</button>
      </form>
    </section>

    <section class="panel">
      <h2><span class="step">2</span> People (${people.length})</h2>
      <p class="help">Use the name each person goes by, like Mom, Grandpa, or Bob. That's what they'll type to join, so tell them if it's not obvious. Each name must be different.</p>
      <form id="add-person" class="form inline-form two">
        <div><label for="p-name">Name</label><input id="p-name" placeholder="Example: Mom" autocapitalize="words"></div>
        <button class="btn btn-primary">${ICON.plus} Add person</button>
      </form>
      ${!S.inExchange && people.some((p) => !p.claimedBy) ? '<p class="help">Playing too? Add your own name, then tap <strong>This is me</strong>.</p>' : ''}
      <ul class="admin-list">${people.map((p) => `
        <li>${avatar(p)}<div class="grow"><strong>${esc(p.name)}${p.id === S.me.id ? ' (you)' : ''}</strong>${status(p)}</div>
          <span class="row-actions">
            ${!S.inExchange && !p.claimedBy ? `<button class="btn btn-ghost small" data-me="${esc(p.id)}">This is me</button>` : ''}
            <button class="btn btn-ghost small" data-edit-person="${esc(p.id)}">Edit</button>
            ${p.claimedBy ? `<button class="btn btn-ghost small" data-reset="${esc(p.id)}">Reset</button>` : ''}
            <button class="btn btn-ghost small danger-text" data-rm-person="${esc(p.id)}">Remove</button>
          </span></li>`).join('') || '<li class="muted">No one yet. Add your first person above.</li>'}
      </ul>
      ${joined.length ? '<p class="help">Use <strong>Reset</strong> if someone got a new phone, cleared their browser, or the wrong person joined with their name.</p>' : ''}
    </section>

    <section class="panel">
      <h2><span class="step">3</span> Who should NOT get who</h2>
      <p class="help">Rules only go one way. "Mom can't get Dad" still lets Dad get Mom, unless you tick the box.</p>
      <form id="add-rule" class="form">
        <div class="rule-builder">
          <select id="r-giver" aria-label="Person drawing">${opts()}</select>
          <span class="rule-word">can't get</span>
          <select id="r-receiver" aria-label="Person they can't get">${opts()}</select>
        </div>
        <label class="check"><input type="checkbox" id="r-both"><span>Also the other way around</span></label>
        <button class="btn btn-primary">Add rule</button>
      </form>
      <ul class="admin-list rules">${rules.map((r) => `
        <li><div class="grow"><strong>${esc(personName(r.giver))}</strong> <span class="rule-word">can't get</span> <strong>${esc(personName(r.receiver))}</strong></div>
          <button class="btn btn-ghost small danger-text" data-rm-rule="${esc(r.id)}">Remove</button></li>`).join('') || '<li class="muted">No rules. Anyone can get anyone (except themselves).</li>'}
      </ul>
    </section>

    <section class="panel">
      <h2><span class="step">4</span> Invite everyone</h2>
      <p class="help">Send this from your own phone or email. Free, no texting service needed.</p>
      <textarea id="invite" rows="5" readonly>${esc(invite)}</textarea>
      <div class="btn-row">
        <button class="btn btn-primary" id="copy-invite">Copy message</button>
        <a class="btn btn-secondary" href="sms:?&body=${encodeURIComponent(invite)}">Open in Messages</a>
      </div>
    </section>

    <section class="panel">
      <h2><span class="step">5</span> Draw names</h2>
      ${c.drawDone
        ? `<p>Names are drawn for <strong>${drawn.length} people</strong>. They can open their present on the <strong>My Match</strong> tab.</p>
           ${late.length ? `
             <div class="late-box">
               <h3>Joined late (${late.length})</h3>
               <p>${names(late)} ${late.length > 1 ? 'have' : 'has'} joined since you drew names. How do you want to add ${late.length > 1 ? 'them' : 'them'}?</p>
               <button class="btn btn-primary btn-block" id="late-main">Add to the main draw</button>
               <p class="help">${late.length > 1 ? 'They join the main group together.' : 'They join the main group.'} One person in the draw switches to buying for ${late.length > 1 ? 'one of them' : 'them'}. The app picks someone who hasn't opened their present yet, if it can.</p>
               ${late.length >= 2 ? `<button class="btn btn-secondary btn-block" id="late-pair">Pair the late joiners together</button>
               <p class="help">They draw each other in their own small group. Nobody in the main draw changes.${late.length === 2 ? ' With just 2, they\'ll buy for each other.' : ''}</p>` : ''}
             </div>` : ''}
           ${waiting.length ? `<p class="help">Haven't joined yet: ${names(waiting)}. If they join later, they'll show up here and you can add them.</p>` : ''}
           <p class="help">Want to start over with everyone who has joined? Redo the draw. Everyone gets a new person.</p>
           <div class="btn-row"><button class="btn btn-secondary" id="redraw" ${canDraw ? '' : 'disabled'}>Redo the draw</button><button class="btn btn-ghost danger-text" id="undraw">Cancel the draw</button></div>`
        : canDraw
          ? `<p><strong>${joined.length} people</strong> have joined.${waiting.length ? ` Still waiting on ${names(waiting)}.` : ' Everyone is in!'}</p>
             ${waiting.length ? '<p class="help">You can draw now with the people who joined. Anyone who joins later shows up here, and you can add them then.</p>' : ''}
             <p class="help">The app picks randomly and follows your rules. Nobody (not even you) sees the full list.</p>
             <button class="btn btn-gold btn-lg btn-block" id="draw">Draw names now</button>`
          : `<p>You need at least ${minPeople} people to join before drawing names.${minPeople === 3 ? ' (With "no swaps" on, the minimum is 3.)' : ''}</p>
             <button class="btn btn-gold btn-lg btn-block" disabled>Draw names now</button>`}
      <p class="form-error" id="draw-error" role="alert"></p>
    </section>

    <section class="panel">
      <h2><span class="step">6</span> Start a new year</h2>
      <p>When the holidays are over, reset the app so you can use it again next year. You choose what to keep.</p>
      <button class="btn btn-secondary btn-block" id="new-year">Start a new year</button>
    </section>`;

  const byId = (id) => people.find((x) => x.id === id);

  $('#cfg-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
      eventName: $('#c-name').value.trim(),
      exchangeDate: $('#c-date').value,
      budget: $('#c-budget').value.trim(),
      message: $('#c-msg').value.trim(),
      noSwap: $('#c-noswap').checked,
      avoidLastYear: $('#c-norepeat').checked,
    };
    await store.saveConfig(data);
    Object.assign(S.config, data);
    setTitle();
    toast('Event details saved!');
  });

  const nameTaken = (name, exceptId) => people.some((p) => p.id !== exceptId && normName(p.name) === normName(name));

  $('#add-person').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = $('#p-name').value.trim().replace(/\s+/g, ' ');
    if (!name) return toast('Please type a name.', 'err');
    if (nameTaken(name)) return toast('That name is already on the list. Add a last name to tell them apart.', 'err');
    await store.addParticipant(name);
    toast(c.drawDone ? `${name} added. Redo the draw once they join.` : `${name} added!`);
    renderAdmin();
  });
  $$('[data-me]').forEach((b) => b.addEventListener('click', async () => {
    const p = byId(b.dataset.me);
    if (!(await confirmBox(`Are you ${esc(p.name)}?`, 'This links your organizer account to this name so you can take part too.', "Yes, that's me"))) return;
    await store.claim(p.id, S.user.uid);
    await startSession(S.user);
    toast(`You're in, ${firstName(p.name)}!`);
  }));
  $$('[data-edit-person]').forEach((b) => b.addEventListener('click', () => {
    const p = byId(b.dataset.editPerson);
    openModal({
      title: 'Edit name',
      html: `<label for="e-name">Name</label><input id="e-name" value="${esc(p.name)}" autofocus>`,
      actions: [
        { label: 'Cancel', onClick: ({ close }) => close() },
        { label: 'Save', kind: 'btn-primary', onClick: async ({ close, el }) => {
          const name = $('#e-name', el).value.trim().replace(/\s+/g, ' ');
          if (!name) return;
          if (nameTaken(name, p.id)) return toast('Another person already has that name.', 'err');
          await store.renameParticipant(p, name);
          if (p.id === S.me.id) { S.me.name = name; setUserBar(S.me); }
          close(); toast('Name updated.'); renderAdmin();
        } },
      ],
    });
  }));
  $$('[data-reset]').forEach((b) => b.addEventListener('click', async () => {
    const p = byId(b.dataset.reset);
    if (!(await confirmBox(`Reset ${esc(p.name)}?`, `${esc(firstName(p.name))} will need to type their name again on their phone or computer. Their wishlist stays${c.drawDone ? ', and so does their match' : ''}.`, 'Reset'))) return;
    await store.unclaim(p);
    if (p.id === S.me.id) return startSession(S.user);
    toast(`${p.name} can join again now.`);
    renderAdmin();
  }));
  $$('[data-rm-person]').forEach((b) => b.addEventListener('click', async () => {
    const p = byId(b.dataset.rmPerson);
    if (!(await confirmBox(`Remove ${esc(p.name)}?`, `They'll be taken out of the exchange, and any rules about them will be removed.${c.drawDone ? ' <strong>Names are already drawn, so you should redo the draw.</strong>' : ''}`, 'Remove', true))) return;
    await store.deleteParticipant(p);
    await Promise.all(rules.filter((r) => r.giver === p.id || r.receiver === p.id).map((r) => store.deleteRule(r.id)));
    toast(`${p.name} removed.`);
    if (p.id === S.me.id) return startSession(S.user);
    renderAdmin();
  }));

  $('#add-rule').addEventListener('submit', async (e) => {
    e.preventDefault();
    const g = $('#r-giver').value, r = $('#r-receiver').value;
    if (!g || !r) return toast('Please choose both people.', 'err');
    if (g === r) return toast('Pick two different people. Nobody can get themselves anyway.', 'err');
    await store.addRule({ giver: g, receiver: r });
    if ($('#r-both').checked) await store.addRule({ giver: r, receiver: g });
    toast(c.drawDone ? 'Rule added. Redo the draw for it to count.' : 'Rule added!');
    renderAdmin();
  });
  $$('[data-rm-rule]').forEach((b) => b.addEventListener('click', async () => {
    await store.deleteRule(b.dataset.rmRule);
    toast('Rule removed.');
    renderAdmin();
  }));

  const pairCode = (salt, g, r) => sha256(`${salt}|${g}|${r}`);

  // Turns last year's scrambled codes back into "can't get" rules for people who are here again.
  async function lastYearRules() {
    if (c.avoidLastYear === false || !hasLastYear) return [];
    const codes = new Set(history.last.hashes);
    const out = [];
    for (const g of people) for (const r of people) {
      if (g.id !== r.id && codes.has(await pairCode(history.last.salt, g.id, r.id))) out.push({ giver: g.id, receiver: r.id });
    }
    return out;
  }

  const drawError = (res, withRepeatRule) => ({
    tooFew: 'You need at least 2 people to draw names.',
    tooFewNoSwap: 'With "no swaps" turned on, you need at least 3 people.',
    noOptions: `${personName(res.who)} has nobody they're allowed to get. Remove one of their rules.`,
    unreachable: `Nobody is allowed to get ${personName(res.who)}. Remove a rule so someone can get them.`,
    impossible: 'Your rules make it impossible for everyone to get someone. Try removing a rule, or turn off "no swaps" in Event details.',
  }[res.type]) + (withRepeatRule ? ' You can also turn off "same person as last year" in Event details.' : '');

  const doDraw = async () => {
    const err = $('#draw-error');
    err.textContent = '';
    const ids = joined.map((p) => p.id);
    const repeatRules = await lastYearRules();
    let res = drawNames(ids, [...rules, ...repeatRules], { noSwap: !!c.noSwap });
    if (!res.ok && repeatRules.length) {
      const fallback = drawNames(ids, rules, { noSwap: !!c.noSwap });
      if (!fallback.ok) { err.textContent = drawError(fallback, false); return false; }
      const ok = await confirmBox(
        "Can't avoid every repeat",
        'With this group and your rules, there is no way to give <strong>everyone</strong> a different person than last year. Draw anyway? Someone may get the same person again.',
        'Draw anyway',
      );
      if (!ok) { err.textContent = drawError(res, true); return false; }
      res = fallback;
    } else if (!res.ok) {
      err.textContent = drawError(res, false);
      return false;
    }
    if (c.drawDone) await store.clearDraw(people.map((p) => p.id));
    await store.saveDraw(res.pairs, people.map((p) => p.id));
    // Save scrambled codes of this year's pairs (never the names) for next year's check.
    const salt = crypto.getRandomValues(new Uint32Array(2)).join('-');
    const hashes = await Promise.all(Object.entries(res.pairs).map(([g, r]) => pairCode(salt, g, r)));
    await store.saveHistory({ ...history, current: { salt, hashes, at: Date.now() } });
    S.match = undefined; S.assign = undefined; S.recipThread = undefined;
    if (S.me) S.me.revealed = false;
    S.config = await store.getConfig();
    return true;
  };
  // ---- late joiners ----
  async function currentPairs() {
    const cur = history.current;
    if (!cur?.hashes?.length) return null;
    const codes = new Set(cur.hashes);
    const ids = drawn.map((p) => p.id);
    const pairs = {};
    for (const g of ids) for (const r of ids) if (g !== r && codes.has(await pairCode(cur.salt, g, r))) pairs[g] = r;
    return Object.keys(pairs).length === ids.length ? pairs : null;
  }
  async function saveCodes(pairs) {
    const salt = crypto.getRandomValues(new Uint32Array(2)).join('-');
    const hashes = await Promise.all(Object.entries(pairs).map(([g, r]) => pairCode(salt, g, r)));
    await store.saveHistory({ ...history, current: { salt, hashes, at: Date.now() } });
  }
  const redoHint = 'Redo the draw instead, or remove a rule.';

  $('#late-main')?.addEventListener('click', async () => {
    const err = $('#draw-error');
    err.textContent = '';
    const pairs = await currentPairs();
    if (!pairs) { err.textContent = `The app can't safely add people to this draw (it was made with an older version). ${redoHint}`; return; }
    const blocked = new Set([...rules, ...(await lastYearRules())].map((r) => `${r.giver}>${r.receiver}`));
    const okPair = (g, r) => g !== r && !blocked.has(`${g}>${r}`);
    const byId = (id) => people.find((p) => p.id === id);
    // Try different orders of the late joiners and different givers. Prefer givers who haven't opened.
    let best = null;
    for (let t = 0; t < 60 && !best?.unopened; t++) {
      const chain = shuffle(late.map((p) => p.id));
      const chainOk = chain.every((id, i) => i === 0 || okPair(chain[i - 1], id));
      if (!chainOk) continue;
      for (const g of shuffle(Object.keys(pairs))) {
        if (!okPair(g, chain[0]) || !okPair(chain.at(-1), pairs[g])) continue;
        const cand = { giver: g, chain, receiver: pairs[g], unopened: !byId(g).revealed };
        if (!best || (cand.unopened && !best.unopened)) best = cand;
        if (best.unopened) break;
      }
    }
    if (!best) { err.textContent = `Your rules don't leave room to add ${late.length > 1 ? 'them' : 'them'} to the main draw. ${redoHint}`; return; }
    const who = late.length > 1 ? 'them' : firstName(late[0].name);
    const ok = await confirmBox(
      `Add ${late.length > 1 ? 'them' : esc(firstName(late[0].name))} to the main draw?`,
      best.unopened
        ? `One person who <strong>hasn't opened their present yet</strong> will switch to buying for ${esc(who)}. Nobody who has already seen their match is affected.`
        : `Everyone who could make room has already opened their present, so <strong>one person will get a new match</strong>. They'll see a "Your match changed" note the next time they open the app. Their chat with their old person will be cleared.`,
      'Add to the main draw',
      !best.unopened,
    );
    if (!ok) return;
    await store.insertChain({ giver: best.giver, chain: best.chain, receiver: best.receiver, giverOpened: !best.unopened });
    const next = { ...pairs };
    const path = [best.giver, ...best.chain, best.receiver];
    for (let i = 0; i < path.length - 1; i++) next[path[i]] = path[i + 1];
    await saveCodes(next);
    S.match = undefined; S.assign = undefined; S.recipThread = undefined;
    toast(`Added! ${late.length > 1 ? 'They' : firstName(late[0].name)} can open ${late.length > 1 ? 'their presents' : 'their present'} now.`);
    renderAdmin();
  });

  $('#late-pair')?.addEventListener('click', async () => {
    const err = $('#draw-error');
    err.textContent = '';
    const ids = late.map((p) => p.id);
    const res = drawNames(ids, [...rules, ...(await lastYearRules())], { noSwap: !!c.noSwap && ids.length >= 3 });
    if (!res.ok) { err.textContent = `Your rules don't allow these ${ids.length} people to draw each other. Try "Add to the main draw" instead, or remove a rule.`; return; }
    const ok = await confirmBox(
      'Pair the late joiners together?',
      `${names(late)} will draw names among themselves. Nobody in the main draw changes.${ids.length === 2 ? ' With just 2, they\'ll buy for each other, so it won\'t be a secret between them.' : ''}`,
      'Pair them together',
    );
    if (!ok) return;
    await store.addPairs(res.pairs);
    const pairs = (await currentPairs()) || {};
    await saveCodes({ ...pairs, ...res.pairs });
    toast('Done! They can open their presents now.');
    renderAdmin();
  });

  $('#draw')?.addEventListener('click', async () => {
    if (!(await confirmBox('Ready to draw names?', `Names will be drawn for the <strong>${joined.length} people</strong> who have joined.${waiting.length ? ` Anyone else can be added when they join.` : ''}`, 'Draw names'))) return;
    if (await doDraw()) { toast('Names drawn! Everyone can open their present now.'); burst(innerWidth / 2, innerHeight / 2, 120); renderAdmin(); }
  });
  $('#redraw')?.addEventListener('click', async () => {
    if (!(await confirmBox('Redo the draw?', 'Everyone will get a <strong>new</strong> person and will need to open their present again. Messages will be cleared. If someone already shopped, let them know!', 'Redo the draw', true))) return;
    if (await doDraw()) { toast('New names drawn!'); renderAdmin(); }
  });
  $('#undraw')?.addEventListener('click', async () => {
    if (!(await confirmBox('Cancel the draw?', 'This erases all matches and messages. People will see the "who\'s joined" screen until you draw again.', 'Cancel the draw', true))) return;
    await store.clearDraw(people.map((p) => p.id));
    await store.saveHistory({ ...history, current: null });
    S.match = undefined; S.assign = undefined; S.recipThread = undefined;
    S.config = await store.getConfig();
    toast('The draw was cancelled.');
    renderAdmin();
  });

  $('#new-year').addEventListener('click', () => {
    openModal({
      title: 'Start a new year',
      dismissable: false,
      html: `
        <p class="modal-msg">This always clears <strong>last year's draw and all messages</strong>. Choose what else to clear:</p>
        <label class="check"><input type="checkbox" id="ny-wish" checked><span>Clear everyone's wishlists</span></label>
        <label class="check"><input type="checkbox" id="ny-rules"><span>Clear the "can't get" rules</span></label>
        <label class="check"><input type="checkbox" id="ny-rejoin"><span>Make everyone type their name again</span></label>
        <p class="help">Leave the last box unticked and people stay signed in on their phones from this year. The list of people and your event details are kept, so you can edit them.</p>
        <p class="help">This year's matches are remembered (as scrambled codes) so next year nobody gets the same person again.</p>
        <label for="ny-confirm">Type <strong>NEW YEAR</strong> to confirm</label>
        <input id="ny-confirm" autocomplete="off" autocapitalize="characters">
        <p class="form-error" id="ny-err" role="alert"></p>`,
      actions: [
        { label: 'Cancel', onClick: ({ close }) => close() },
        { label: 'Reset for a new year', kind: 'btn-danger', onClick: async ({ close, el, btn }) => {
          if ($('#ny-confirm', el).value.trim().toUpperCase() !== 'NEW YEAR') {
            $('#ny-err', el).textContent = 'Please type NEW YEAR in the box to confirm.';
            return;
          }
          btn.disabled = true; btn.textContent = 'Resetting…';
          try {
            await store.newYear(people, {
              clearWishlists: $('#ny-wish', el).checked,
              clearRules: $('#ny-rules', el).checked,
              rejoin: $('#ny-rejoin', el).checked,
            });
            if (history.current?.hashes?.length) await store.saveHistory({ last: history.current, current: null });
            close();
            await startSession(S.user);
            S.tab = 'admin';
            await go('admin');
            toast('All set for a new year! Update the event details next.');
          } catch (ex) {
            console.error(ex);
            $('#ny-err', el).textContent = 'Something went wrong. Please try again.';
            btn.disabled = false; btn.textContent = 'Reset for a new year';
          }
        } },
      ],
    });
  });

  $('#copy-invite').addEventListener('click', async () => {
    const t = $('#invite');
    try { await navigator.clipboard.writeText(t.value); } catch { t.select(); document.execCommand('copy'); }
    toast('Message copied! Paste it in a text or email.');
  });
}
