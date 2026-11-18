// Name-drawing logic. Pure functions, no Firebase. Safe to test on its own.
//
// people: array of ids (phone numbers)
// rules:  array of { giver, receiver } meaning "giver must NOT draw receiver" (one-way)
// noSwap: if true, two people can't draw each other (A->B and B->A)

function rand(n) {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return a[0] % n;
}

export function shuffle(list) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const fail = (type, who = null) => ({ ok: false, type, who });

export function drawNames(people, rules = [], { noSwap = false } = {}) {
  const ids = [...new Set(people)];
  if (ids.length < 2) return fail('tooFew');
  if (noSwap && ids.length < 3) return fail('tooFewNoSwap');

  const blocked = new Map(ids.map((id) => [id, new Set([id])]));
  for (const r of rules) {
    if (blocked.has(r.giver)) blocked.get(r.giver).add(r.receiver);
  }
  const allowed = new Map(ids.map((g) => [g, ids.filter((r) => !blocked.get(g).has(r))]));

  for (const [g, list] of allowed) if (!list.length) return fail('noOptions', g);
  for (const r of ids) if (!ids.some((g) => allowed.get(g).includes(r))) return fail('unreachable', r);

  const ok = (g, r, map) => !blocked.get(g).has(r) && !(noSwap && map[r] === g);

  // 1) Fair random draw: shuffle and keep the first result that follows every rule.
  for (let t = 0; t < 5000; t++) {
    const p = shuffle(ids);
    const map = {};
    let good = true;
    for (let i = 0; i < ids.length; i++) {
      if (!ok(ids[i], p[i], map)) { good = false; break; }
      map[ids[i]] = p[i];
    }
    if (good) return { ok: true, pairs: map };
  }

  // 2) Tight rules: randomized search, most-restricted person first.
  const order = shuffle(ids).sort((a, b) => allowed.get(a).length - allowed.get(b).length);
  const map = {};
  const used = new Set();
  let steps = 0;
  const search = (i) => {
    if (i === order.length) return true;
    if (++steps > 300000) return false;
    const g = order[i];
    for (const r of shuffle(allowed.get(g))) {
      if (used.has(r) || !ok(g, r, map)) continue;
      map[g] = r; used.add(r);
      if (search(i + 1)) return true;
      delete map[g]; used.delete(r);
    }
    return false;
  };
  return search(0) ? { ok: true, pairs: { ...map } } : fail('impossible');
}
