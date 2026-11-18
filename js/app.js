import { getStore } from './store.js';
import { drawNames } from './draw.js';
import { burst } from './confetti.js';
import {
  esc, safeUrl, safeImg, domainOf, firstName, initials, colorFor, fmtDate, fmtWhen,
  compressImage, blobToDataUrl, wait, reducedMotion, findByName, normName,
} from './util.js';
import { ADMIN_EMAILS } from './firebase-config.js';

const DEMO_ADMIN = ADMIN_EMAILS[0] || 'you@example.com';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const app = $('#app');
const nav = $('#tabs');

let store;
let DEMO = false;
const S = { user: null, me: null, inExchange: false, isAdmin: false, config: {}, people: [], tab: 'match', viewing: null, match: undefined };

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
};

const TABS = [
  { id: 'match', label: 'My Match', icon: ICON.gift },
  { id: 'lists', label: 'Wishlists', icon: ICON.list },
  { id: 'mine', label: 'My List', icon: ICON.heart },
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
    if (g) { e.preventDefault(); go(g.dataset.go, { viewing: g.dataset.person || null }); }
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
      <label for="yourname">Your first and last name</label>
      <input id="yourname" autocomplete="name" autocapitalize="words" placeholder="Example: Rose Garcia" value="${esc(prefill)}" required>
      <p class="help">Type it the way the organizer wrote it on the list.</p>
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
        ? `<div class="callout"><strong>Did you mean:</strong><div class="suggest">${res.suggestions.map((p) => `<button type="button" class="btn btn-secondary btn-block" data-pid="${esc(p.id)}">${esc(p.name)}</button>`).join('')}</div><p class="help">Not you? Check the spelling, or ask the organizer how your name is listed.</p></div>`
        : `<div class="callout warn"><strong>We couldn't find that name.</strong><p>Check the spelling, or try your full name. If it still doesn't work, ask the organizer how your name is listed.</p></div>`;
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
    S.match = undefined;
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
  nav.innerHTML = tabs.map((t) => `<button data-tab="${t.id}" ${S.tab === t.id ? 'aria-current="page"' : ''}>${t.icon}<span>${t.label}</span></button>`).join('');
  nav.hidden = false;
}

const VIEWS = { match: renderMatch, lists: renderLists, mine: renderMine, admin: renderAdmin };

async function go(tab, opts = {}) {
  S.tab = tab;
  S.viewing = opts.viewing || null;
  renderTabs();
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
  if (S.match === undefined) S.match = S.inExchange && S.config.drawDone ? await store.getAssignment(S.me.id) : null;
  return S.match;
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
    S.people = await store.listParticipants();
    const joined = S.people.filter((p) => p.claimedBy).length;
    const allIn = joined === S.people.length;
    app.innerHTML = `
      <section class="hero">
        <div class="snowfield" aria-hidden="true"></div>
        <div class="hero-inner">
          <div class="mini-gift wiggle" aria-hidden="true"><span class="lid"></span><span class="box"></span></div>
          <h1>Hi ${esc(firstName(S.me.name))}!</h1>
          <p>${allIn ? "Everyone's here! Names will be drawn soon." : "You're in! We're waiting for everyone to join."}</p>
        </div>
      </section>
      <section class="panel">
        <h2>Who's joined (${joined} of ${S.people.length})</h2>
        <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="${S.people.length}" aria-valuenow="${joined}"><span style="width:${S.people.length ? (joined / S.people.length) * 100 : 0}%"></span></div>
        <ul class="joined-list">${S.people.map((p) => `<li class="${p.claimedBy ? 'in' : ''}">${p.claimedBy ? ICON.check : '<span class="dot" aria-hidden="true"></span>'}<span>${esc(p.name)}</span><span class="sr">${p.claimedBy ? 'joined' : 'not joined yet'}</span></li>`).join('')}</ul>
        <p class="help">Names get drawn once everyone has joined.</p>
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
    app.innerHTML = msgCard("We couldn't find your match", 'Please ask the organizer to check the drawing.');
    return;
  }
  if (S.me.revealed) showResult(r, false);
  else showGift(r, true);
}

function showGift(r, persist) {
  app.innerHTML = `
    <section class="stage">
      <div class="snowfield" aria-hidden="true"></div>
      <p class="kicker">${esc(firstName(S.me.name))}, your match is ready!</p>
      <h1 class="stage-title">Who did you get?</h1>
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
        <button class="btn btn-on-dark btn-block" id="replay">Watch the surprise again</button>
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
function itemCard(it, { editable = false } = {}) {
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
    ${items.length ? `<div class="items">${items.map((it) => itemCard(it)).join('')}</div>`
      : `<section class="panel center"><div class="img-ph big" aria-hidden="true">${ICON.gift}</div><p class="lead">${esc(firstName(p.name))} hasn't added any gift ideas yet. Check back later!</p></section>`}`;
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

/* ---------------- ORGANIZER ---------------- */
async function renderAdmin() {
  if (!S.isAdmin) return go('match');
  const [people, rules, config] = await Promise.all([store.listParticipants(), store.listRules(), store.getConfig()]);
  S.people = people;
  S.config = config;
  const c = config;
  const joined = people.filter((p) => p.claimedBy);
  const waiting = people.filter((p) => !p.claimedBy);
  const allIn = people.length >= 2 && !waiting.length;
  const opened = people.filter((p) => p.revealed).length;
  const opts = () => `<option value="">Choose a person</option>` + people.map((p) => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('');
  const siteUrl = location.href.split('#')[0].split('?')[0];
  const invite = `You're invited to our ${c.eventName || 'Gift Exchange'}! Open this link: ${siteUrl} and type your first and last name. Once everyone has joined, names get drawn and you can tap the present to see who you got!`;
  const status = (p) => {
    if (!p.claimedBy) return '<span class="status">Hasn\'t joined yet</span>';
    if (c.drawDone) return `<span class="status yes">${p.revealed ? 'Opened present' : 'Joined, not opened yet'}</span>`;
    return `<span class="status yes">Joined ${esc(fmtWhen(p.claimedAt))}</span>`;
  };

  app.innerHTML = `
    <h1 class="page-title">Organizer</h1>
    <p class="lead">Only organizers can see this page. Work through the steps in order.</p>
    ${c.drawDone
      ? `<div class="notice ok">${ICON.check}<span>Names were drawn on ${esc(fmtWhen(c.drawnAt))}. <strong>${opened} of ${people.length}</strong> people have opened their present.</span></div>`
      : `<div class="notice ${allIn ? 'ok' : ''}">${ICON.check}<span><strong>${joined.length} of ${people.length}</strong> people have joined.${allIn ? ' Everyone is in. You can draw names!' : ''}</span></div>`}

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
        <button class="btn btn-primary">Save event details</button>
      </form>
    </section>

    <section class="panel">
      <h2><span class="step">2</span> People (${people.length})</h2>
      <p class="help">Write names the way people will type them, first and last. Each name must be different.</p>
      <form id="add-person" class="form inline-form two">
        <div><label for="p-name">Name</label><input id="p-name" placeholder="Example: Rose Garcia" autocapitalize="words"></div>
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
        ? `<p>Names are drawn. Each person can now open their present on the <strong>My Match</strong> tab.</p>
           <p class="help">Changed people or rules? Redo the draw so the changes count. Everyone will get a new person.</p>
           <div class="btn-row"><button class="btn btn-secondary" id="redraw" ${allIn ? '' : 'disabled'}>Redo the draw</button><button class="btn btn-ghost danger-text" id="undraw">Cancel the draw</button></div>
           ${allIn ? '' : `<p class="help">Redo is available once everyone has joined. Still waiting on: <strong>${waiting.map((p) => esc(p.name)).join(', ')}</strong>.</p>`}`
        : allIn
          ? `<p>Everyone has joined! The app picks randomly and follows your rules. Nobody (not even you) sees the full list.</p>
             <button class="btn btn-gold btn-lg btn-block" id="draw">Draw names now</button>`
          : `<p>The draw unlocks when everyone has joined.</p>
             ${people.length >= 2 ? `<p>Still waiting on: <strong>${waiting.map((p) => esc(p.name)).join(', ')}</strong></p>
             <p class="help">If someone isn't taking part after all, remove them in step 2.</p>` : '<p class="help">Add at least 2 people first.</p>'}
             <button class="btn btn-gold btn-lg btn-block" disabled>Draw names now</button>`}
      <p class="form-error" id="draw-error" role="alert"></p>
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
          await store.renameParticipant(p.id, name);
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

  const doDraw = async () => {
    const err = $('#draw-error');
    err.textContent = '';
    const res = drawNames(people.map((p) => p.id), rules, { noSwap: !!c.noSwap });
    if (!res.ok) {
      err.textContent = {
        tooFew: 'You need at least 2 people to draw names.',
        tooFewNoSwap: 'With "no swaps" turned on, you need at least 3 people.',
        noOptions: `${personName(res.who)} has nobody they're allowed to get. Remove one of their rules.`,
        unreachable: `Nobody is allowed to get ${personName(res.who)}. Remove a rule so someone can get them.`,
        impossible: 'Your rules make it impossible for everyone to get someone. Try removing a rule, or turn off "no swaps" in Event details.',
      }[res.type];
      return false;
    }
    if (c.drawDone) await store.clearDraw(people.map((p) => p.id));
    await store.saveDraw(res.pairs);
    S.match = undefined;
    if (S.me) S.me.revealed = false;
    S.config = await store.getConfig();
    return true;
  };
  $('#draw')?.addEventListener('click', async () => {
    if (!(await confirmBox('Ready to draw names?', `Names will be drawn for <strong>${people.length} people</strong>. After this, everyone can open their present.`, 'Draw names'))) return;
    if (await doDraw()) { toast('Names drawn! Everyone can open their present now.'); burst(innerWidth / 2, innerHeight / 2, 120); renderAdmin(); }
  });
  $('#redraw')?.addEventListener('click', async () => {
    if (!(await confirmBox('Redo the draw?', 'Everyone will get a <strong>new</strong> person and will need to open their present again. If someone already shopped, let them know!', 'Redo the draw', true))) return;
    if (await doDraw()) { toast('New names drawn!'); renderAdmin(); }
  });
  $('#undraw')?.addEventListener('click', async () => {
    if (!(await confirmBox('Cancel the draw?', 'This erases all matches. People will see "Waiting for names to be drawn" until you draw again.', 'Cancel the draw', true))) return;
    await store.clearDraw(people.map((p) => p.id));
    S.match = undefined;
    S.config = await store.getConfig();
    toast('The draw was cancelled.');
    renderAdmin();
  });

  $('#copy-invite').addEventListener('click', async () => {
    const t = $('#invite');
    try { await navigator.clipboard.writeText(t.value); } catch { t.select(); document.execCommand('copy'); }
    toast('Message copied! Paste it in a text or email.');
  });
}
