// Data layer. Same functions whether running on Firebase or in demo mode.
// Free setup: Anonymous sign-in (guests) + Email/Password (organizer) + Firestore. No SMS, no Storage.
import { firebaseConfig, ADMIN_EMAILS } from './firebase-config.js';
import { wait } from './util.js';

const ADMINS = ADMIN_EMAILS.map((e) => e.trim().toLowerCase());
const isAdmin = (user) => !!user?.email && ADMINS.includes(user.email.toLowerCase());
const byName = (a, b) => String(a.name).localeCompare(String(b.name));

export async function getStore() {
  const DEMO = !firebaseConfig.apiKey || /PASTE/i.test(firebaseConfig.apiKey);
  return { DEMO, store: DEMO ? createDemoStore() : await createFirebaseStore() };
}

/* ------------------------------------------------------------------ */
/*  FIREBASE                                                           */
/* ------------------------------------------------------------------ */
async function createFirebaseStore() {
  const base = 'https://www.gstatic.com/firebasejs/10.12.2';
  const [{ initializeApp }, A, F] = await Promise.all([
    import(`${base}/firebase-app.js`),
    import(`${base}/firebase-auth.js`),
    import(`${base}/firebase-firestore.js`),
  ]);
  const fb = initializeApp(firebaseConfig);
  const auth = A.getAuth(fb);
  const db = F.getFirestore(fb);
  const { doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, addDoc, collection, query, orderBy, where, limit, onSnapshot, writeBatch } = F;
  const newId = () => doc(collection(db, 'threads')).id;

  return {
    isAdmin,
    onUser(cb) {
      A.onAuthStateChanged(auth, (u) => cb(u ? { uid: u.uid, email: u.email || null } : null));
    },
    startGuest: () => A.signInAnonymously(auth),
    adminSignIn: (email, pw) => A.signInWithEmailAndPassword(auth, email, pw),
    signOut: () => A.signOut(auth),

    async getConfig() {
      const s = await getDoc(doc(db, 'config', 'app'));
      return s.exists() ? s.data() : {};
    },
    saveConfig: (data) => setDoc(doc(db, 'config', 'app'), data, { merge: true }),

    async listParticipants() {
      const s = await getDocs(collection(db, 'participants'));
      return s.docs.map((d) => ({ id: d.id, ...d.data() })).sort(byName);
    },
    async getMyPerson(uid) {
      const c = await getDoc(doc(db, 'claims', uid));
      if (!c.exists()) return null;
      const p = await getDoc(doc(db, 'participants', c.data().personId));
      return p.exists() ? { id: p.id, ...p.data() } : null;
    },
    async claim(personId, uid) {
      const b = writeBatch(db);
      b.update(doc(db, 'participants', personId), { claimedBy: uid, claimedAt: Date.now() });
      b.set(doc(db, 'claims', uid), { personId });
      await b.commit();
    },
    async unclaim(p) {
      const b = writeBatch(db);
      b.update(doc(db, 'participants', p.id), { claimedBy: null, claimedAt: null, revealed: false });
      if (p.claimedBy) b.delete(doc(db, 'claims', p.claimedBy));
      await b.commit();
    },
    addParticipant: (name) => addDoc(collection(db, 'participants'), { name, claimedBy: null, claimedAt: null, revealed: false, createdAt: Date.now() }),
    renameParticipant: (id, name) => updateDoc(doc(db, 'participants', id), { name }),
    async deleteParticipant(p) {
      const b = writeBatch(db);
      b.delete(doc(db, 'participants', p.id));
      b.delete(doc(db, 'assignments', p.id));
      if (p.claimedBy) b.delete(doc(db, 'claims', p.claimedBy));
      await b.commit();
    },

    async listRules() {
      const s = await getDocs(collection(db, 'rules'));
      return s.docs.map((d) => ({ id: d.id, ...d.data() }));
    },
    addRule: (r) => setDoc(doc(db, 'rules', `${r.giver}_${r.receiver}`), { giver: r.giver, receiver: r.receiver }),
    deleteRule: (id) => deleteDoc(doc(db, 'rules', id)),

    async listItems(pid) {
      const s = await getDocs(query(collection(db, 'wishlists', pid, 'items'), orderBy('createdAt')));
      return s.docs.map((d) => ({ id: d.id, ...d.data() }));
    },
    async saveItem(pid, item, id) {
      if (id) return setDoc(doc(db, 'wishlists', pid, 'items', id), { ...item, updatedAt: Date.now() }, { merge: true });
      return addDoc(collection(db, 'wishlists', pid, 'items'), { ...item, createdAt: Date.now() });
    },
    deleteItem: (pid, id) => deleteDoc(doc(db, 'wishlists', pid, 'items', id)),

    // Returns { receiver, thread } or null. thread = private chat with the person you drew.
    async getAssignment(pid) {
      const s = await getDoc(doc(db, 'assignments', pid));
      return s.exists() ? s.data() : null;
    },
    setRevealed: (pid) => updateDoc(doc(db, 'participants', pid), { revealed: true }),
    async saveDraw(pairs) {
      const old = await getDocs(collection(db, 'threads'));
      const b = writeBatch(db);
      old.docs.forEach((d) => b.delete(d.ref));
      for (const [giver, receiver] of Object.entries(pairs)) {
        const tid = newId(); // random id, so the receiver can't work out who their Santa is
        b.set(doc(db, 'threads', tid), { receiver });
        b.set(doc(db, 'assignments', giver), { receiver, thread: tid });
        b.update(doc(db, 'participants', giver), { revealed: false });
      }
      b.set(doc(db, 'config', 'app'), { drawDone: true, drawnAt: Date.now() }, { merge: true });
      await b.commit();
    },
    async clearDraw(ids) {
      const old = await getDocs(collection(db, 'threads'));
      const b = writeBatch(db);
      old.docs.forEach((d) => b.delete(d.ref));
      for (const id of ids) {
        b.delete(doc(db, 'assignments', id));
        b.update(doc(db, 'participants', id), { revealed: false });
      }
      b.set(doc(db, 'config', 'app'), { drawDone: false, drawnAt: null }, { merge: true });
      await b.commit();
    },

    // Scrambled pair codes for "don't repeat last year". Organizers only.
    async getHistory() {
      const s = await getDoc(doc(db, 'admin', 'history'));
      return s.exists() ? s.data() : {};
    },
    saveHistory: (h) => setDoc(doc(db, 'admin', 'history'), h),

    // Clears last year's draw + messages, and optionally wishlists, rules and claims.
    async newYear(people, { clearWishlists, clearRules, rejoin }) {
      const ops = [];
      (await getDocs(collection(db, 'threads'))).docs.forEach((d) => ops.push((b) => b.delete(d.ref)));
      for (const p of people) {
        ops.push((b) => b.delete(doc(db, 'assignments', p.id)));
        const upd = { revealed: false };
        if (rejoin) {
          Object.assign(upd, { claimedBy: null, claimedAt: null });
          if (p.claimedBy) ops.push((b) => b.delete(doc(db, 'claims', p.claimedBy)));
        }
        ops.push((b) => b.update(doc(db, 'participants', p.id), upd));
        if (clearWishlists) {
          (await getDocs(collection(db, 'wishlists', p.id, 'items'))).docs.forEach((d) => ops.push((b) => b.delete(d.ref)));
        }
      }
      if (clearRules) (await getDocs(collection(db, 'rules'))).docs.forEach((d) => ops.push((b) => b.delete(d.ref)));
      ops.push((b) => b.set(doc(db, 'config', 'app'), { drawDone: false, drawnAt: null }, { merge: true }));
      for (let i = 0; i < ops.length; i += 400) { // Firestore batches max out at 500 writes
        const b = writeBatch(db);
        ops.slice(i, i + 400).forEach((op) => op(b));
        await b.commit();
      }
    },

    // ---- messages ----
    async getRecipientThread(pid) {
      const s = await getDocs(query(collection(db, 'threads'), where('receiver', '==', pid), limit(1)));
      return s.empty ? null : s.docs[0].id;
    },
    async recentMessages(tid) {
      const s = await getDocs(query(collection(db, 'threads', tid, 'messages'), orderBy('at', 'desc'), limit(30)));
      return s.docs.map((d) => d.data());
    },
    watchMessages(tid, cb) {
      return onSnapshot(
        query(collection(db, 'threads', tid, 'messages'), orderBy('at')),
        (s) => cb(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
        (e) => console.error(e),
      );
    },
    sendMessage: (tid, from, text) => addDoc(collection(db, 'threads', tid, 'messages'), { from, text, at: Date.now() }),
  };
}

/* ------------------------------------------------------------------ */
/*  DEMO (saved in this browser only)                                  */
/* ------------------------------------------------------------------ */
function createDemoStore() {
  const KEY = 'giftx-demo-v2';
  const SESSION = 'giftx-demo-session-v2';
  const ADMIN = ADMINS[0] || 'you@example.com';

  const seed = () => {
    const t = Date.now();
    const p = (id, name, claimed) => ({ id, name, claimedBy: claimed ? 'demo-' + id : null, claimedAt: claimed ? t : null, revealed: false });
    return {
      config: {
        eventName: 'Family Gift Exchange',
        exchangeDate: `${new Date().getFullYear()}-12-24`,
        budget: '$30',
        message: "Christmas Eve at Grandma's house. Bring your gift wrapped!",
        noSwap: true,
        drawDone: false,
      },
      participants: {
        p1: p('p1', 'Grandma Rose', true),
        p2: p('p2', 'Uncle Joe', true),
        p3: p('p3', 'Maria Lopez', true),
        p4: p('p4', 'Sam Carter', false),
        p5: p('p5', 'Aunt Linda', false),
      },
      claims: { 'demo-p1': 'p1', 'demo-p2': 'p2', 'demo-p3': 'p3' },
      rules: {},
      items: {
        p1: [
          { id: 'a1', title: 'Soft cardigan sweater', links: ['https://www.llbean.com/'], price: 'About $45', details: 'Size Medium, light blue', notes: 'Something with pockets, please!', createdAt: t },
          { id: 'a2', title: 'Large-print crossword book', links: ['https://www.amazon.com/'], price: 'About $12', details: '', notes: '', createdAt: t + 1 },
        ],
        p2: [{ id: 'b1', title: 'Coffee bean sampler', links: ['https://www.target.com/', 'https://www.amazon.com/'], price: '$20 to $30', details: 'Medium roast', notes: 'Whole beans, not ground.', createdAt: t }],
      },
      assignments: {},
    };
  };

  let db;
  try { db = JSON.parse(localStorage.getItem(KEY)) || seed(); } catch { db = seed(); }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { console.warn('Demo storage full', e); } };
  save();

  const listeners = [];
  const current = () => { try { return JSON.parse(localStorage.getItem(SESSION)); } catch { return null; } };
  const setSession = (s) => { s ? localStorage.setItem(SESSION, JSON.stringify(s)) : localStorage.removeItem(SESSION); listeners.forEach((cb) => cb(current())); };
  const tick = () => wait(120);
  const clone = (x) => JSON.parse(JSON.stringify(x));

  return {
    isAdmin,
    resetDemo() { localStorage.removeItem(KEY); localStorage.removeItem(SESSION); location.reload(); },
    onUser(cb) { listeners.push(cb); cb(current()); },
    async startGuest() { setSession({ uid: 'guest-' + Math.random().toString(36).slice(2, 10), email: null }); },
    async adminSignIn(email, pw) {
      await wait(300);
      if (email.trim().toLowerCase() !== ADMIN || pw !== 'demo') throw { code: 'auth/invalid-credential' };
      setSession({ uid: 'admin-uid', email: ADMIN });
    },
    async signOut() { setSession(null); },

    async getConfig() { await tick(); return clone(db.config); },
    async saveConfig(data) { Object.assign(db.config, data); save(); },
    async listParticipants() { await tick(); return clone(Object.values(db.participants)).sort(byName); },
    async getMyPerson(uid) { await tick(); const id = db.claims[uid]; return id && db.participants[id] ? clone(db.participants[id]) : null; },
    async claim(id, uid) {
      await wait(250);
      const p = db.participants[id];
      if (!p || p.claimedBy || db.claims[uid]) throw { code: 'permission-denied' };
      Object.assign(p, { claimedBy: uid, claimedAt: Date.now() });
      db.claims[uid] = id;
      save();
    },
    async unclaim(p) {
      const x = db.participants[p.id];
      if (x?.claimedBy) delete db.claims[x.claimedBy];
      Object.assign(x, { claimedBy: null, claimedAt: null, revealed: false });
      save();
    },
    async addParticipant(name) { const id = 'p' + Date.now(); db.participants[id] = { id, name, claimedBy: null, claimedAt: null, revealed: false }; save(); },
    async renameParticipant(id, name) { db.participants[id].name = name; save(); },
    async deleteParticipant(p) {
      const x = db.participants[p.id];
      if (x?.claimedBy) delete db.claims[x.claimedBy];
      delete db.participants[p.id];
      delete db.assignments[p.id];
      save();
    },

    async listRules() { await tick(); return Object.entries(db.rules).map(([id, r]) => ({ id, ...r })); },
    async addRule(r) { db.rules[`${r.giver}_${r.receiver}`] = { giver: r.giver, receiver: r.receiver }; save(); },
    async deleteRule(id) { delete db.rules[id]; save(); },

    async listItems(pid) { await tick(); return clone(db.items[pid] || []); },
    async saveItem(pid, item, id) {
      const list = (db.items[pid] ||= []);
      if (id) Object.assign(list.find((x) => x.id === id) || {}, item);
      else list.push({ ...item, id: 'i' + Date.now(), createdAt: Date.now() });
      save();
    },
    async deleteItem(pid, id) { db.items[pid] = (db.items[pid] || []).filter((x) => x.id !== id); save(); },

    async getAssignment(pid) { await tick(); return db.assignments[pid] ? clone(db.assignments[pid]) : null; },
    async setRevealed(pid) { if (db.participants[pid]) db.participants[pid].revealed = true; save(); },
    async saveDraw(pairs) {
      db.assignments = {};
      db.threads = {};
      for (const [g, r] of Object.entries(pairs)) {
        const tid = 't' + Math.random().toString(36).slice(2, 10);
        // Demo only: every Santa "asks" a sample question so you can see the other side of the chat.
        const sampleSanta = String(db.participants[g]?.claimedBy || '').startsWith('demo-');
        db.threads[tid] = { receiver: r, messages: sampleSanta ? [{ from: 'santa', text: "Hi! It's your Secret Santa. What size do you wear?", at: Date.now() }] : [] };
        db.assignments[g] = { receiver: r, thread: tid };
        if (db.participants[g]) db.participants[g].revealed = false;
      }
      Object.assign(db.config, { drawDone: true, drawnAt: Date.now() });
      save();
    },
    async clearDraw(ids) {
      db.threads = {};
      for (const id of ids) { delete db.assignments[id]; if (db.participants[id]) db.participants[id].revealed = false; }
      Object.assign(db.config, { drawDone: false, drawnAt: null });
      save();
    },

    async getHistory() { await tick(); return clone(db.history || {}); },
    async saveHistory(h) { db.history = clone(h); save(); },
    async newYear(people, { clearWishlists, clearRules, rejoin }) {
      db.threads = {};
      db.assignments = {};
      for (const p of Object.values(db.participants)) {
        p.revealed = false;
        if (rejoin) { if (p.claimedBy) delete db.claims[p.claimedBy]; p.claimedBy = null; p.claimedAt = null; }
      }
      if (clearWishlists) db.items = {};
      if (clearRules) db.rules = {};
      Object.assign(db.config, { drawDone: false, drawnAt: null });
      save();
    },
    async getRecipientThread(pid) { await tick(); return Object.keys(db.threads || {}).find((t) => db.threads[t].receiver === pid) || null; },
    async recentMessages(tid) { await tick(); return clone(db.threads?.[tid]?.messages || []).reverse(); },
    watchMessages(tid, cb) {
      let last = -1;
      const check = () => {
        try { db = JSON.parse(localStorage.getItem(KEY)) || db; } catch {}
        const m = db.threads?.[tid]?.messages || [];
        if (m.length !== last) { last = m.length; cb(clone(m).map((x, i) => ({ id: String(i), ...x }))); }
      };
      check();
      const t = setInterval(check, 1000);
      return () => clearInterval(t);
    },
    async sendMessage(tid, from, text) {
      const th = db.threads?.[tid];
      if (!th) throw new Error('no thread');
      th.messages.push({ from, text, at: Date.now() });
      save();
    },
  };
}
