# Gift Exchange

A free Secret Santa site. People join by typing their name, add wishlists with photos and store links, and open their match with a present-unwrapping animation. Names are drawn once everyone has joined, following your "can't get" rules. Built with large text and big buttons for older users.

- **Hosting:** GitHub Pages (free)
- **Backend:** Firebase free "Spark" plan: Authentication (anonymous + organizer email) and Firestore. **No billing account, no texting costs.**
- **No build step.** Plain HTML, CSS and JavaScript.

## Try it first (demo mode)

Until you add Firebase settings, the site runs in **demo mode** with sample people. Data saves only in your browser.

```bash
cd gift-exchange
python3 -m http.server 8000
# open http://localhost:8000
```

(Double-clicking `index.html` won't work. Browsers block JavaScript modules from `file://`.)

- **As a guest:** type `Sam` or `Aunt Linda` (they haven't joined yet).
- **As the organizer:** tap "Organizer? Sign in here", use `you@example.com` and password `demo`.

---

## How joining works

1. You add everyone's name on the Organizer tab.
2. People open the link and type their name. The app finds it (it forgives capital letters, small typos, and first-name-only when it's unique) and asks **"Are you Rose Garcia?"**
3. Tapping **Yes, that's me** claims the name. That phone or computer remembers them, so they never sign in again.
4. Once a name is claimed, nobody else can take it. If someone tries, they're told to ask the organizer.
5. Everyone sees a **"Who's joined (4 of 6)"** checklist. When every name is claimed, the **Draw names** button unlocks for you.

**Reset:** if someone gets a new phone, clears their browser, uses a different browser, or the wrong person grabbed their name, tap **Reset** next to them. They type their name again. Their wishlist and match stay.

---

## Go live: setup (about 15 minutes, free)

### 1. Create the Firebase project
1. Go to <https://console.firebase.google.com> > **Create a project**. Stay on the free Spark plan.
2. Click the **</>** (Web) icon to add a web app. Copy the `firebaseConfig` block.

### 2. Turn on sign-in
1. **Build > Authentication > Get started > Sign-in method.**
2. Enable **Anonymous** (this is how guests are remembered).
3. Enable **Email/Password**.
4. **Users tab > Add user:** your email and a password. This is your organizer login.
5. **Settings tab > Authorized domains > Add domain:** `YOUR-GITHUB-USERNAME.github.io`

### 3. Create the database
1. **Build > Firestore Database > Create database.** Pick a US location, **production mode**.
2. **Rules** tab: paste everything from `firestore.rules`. Change `you@example.com` to your organizer email (lowercase). **Publish.**

### 4. Add your settings to the code
In `js/firebase-config.js`:
1. Paste your `firebaseConfig` values.
2. Set `ADMIN_EMAILS` to your organizer email (same as in the rules).

> The Firebase `apiKey` is safe in public code. The database rules protect your data.

### 5. Put it on GitHub Pages
1. Create a repository on GitHub (e.g. `gift-exchange`) and upload all files, keeping the folders.
2. **Settings > Pages > Deploy from a branch > `main`, `/ (root)` > Save.**
3. Your site: `https://YOUR-GITHUB-USERNAME.github.io/gift-exchange/`

### 6. Run the exchange
On the **Organizer** tab, in order:
1. **Event details:** name, date, spending limit, note, "no swaps" option.
2. **People:** add everyone's first and last name. Playing too? Add yourself and tap **This is me**.
3. **Who should NOT get who:** e.g. "Mom can't get Dad". One-way unless you tick "Also the other way around".
4. **Invite everyone:** copy the message, or tap "Open in Messages" to text it from your own phone.
5. **Draw names:** unlocks when everyone has joined. If someone drops out, remove them and the button unlocks.

---

## What people see

| Tab | What it does |
|---|---|
| **My Match** | Before the draw: who has joined so far. After: tap the present, it shakes, the lid flies off, confetti, the name appears letter by letter. "Watch the surprise again" replays it. |
| **Wishlists** | Everyone's lists. Your match is pinned at the top as "Your person". Tap a photo to enlarge. Each store link is its own big button. |
| **My List** | Add gift ideas: name, photo (camera or photo library, or a picture link), store links, price, size/color, notes. |
| **Organizer** | Only for `ADMIN_EMAILS`. |

## Privacy and honest limits

- Each person can read **only their own** match, locked to the device that claimed the name. Organizers can't read others' matches either.
- The "can't get" rules are visible only to organizers.
- **Anyone with the link can see the list of names** (that's how name matching works). Wishlists and matches need a claimed name.
- **Name-claiming is honor-system.** Someone who knows the link could claim another person's name first. The real person would see "already joined" and tell you, and you'd Reset it. Fine for family, not for strangers.
- The draw runs in the organizer's browser. A technical organizer could inspect it at that moment. The app never shows the full list.

## Free plan limits

Firestore's free tier allows 50,000 reads and 20,000 writes per day and 1 GB of storage. A family exchange uses a tiny fraction. Photos are shrunk on the phone and saved in the database (no paid Storage needed).

## Optional: host on Firebase instead of GitHub Pages

```bash
npm install -g firebase-tools
firebase login
firebase use --add
firebase deploy
```

Then add `YOUR-PROJECT.web.app` to Authorized domains.

## Files

```
index.html             page shell
css/styles.css         styles and animations
js/app.js              screens and interactions
js/store.js            Firebase data layer + demo mode
js/draw.js             name drawing (rules, no swaps)
js/confetti.js         confetti
js/util.js             name matching, image shrinking, helpers
js/firebase-config.js  YOUR settings go here
firestore.rules        database security rules
firebase.json          only needed for the Firebase CLI
```

## Troubleshooting

- **"We couldn't find that name."** Check how you spelled it on the Organizer tab. Full name always works.
- **"Has already joined."** Tap Reset next to that person, then have them try again.
- **Organizer tab missing.** The email must match exactly in `ADMIN_EMAILS` and `firestore.rules`.
- **"Something went wrong" right away.** Anonymous sign-in isn't enabled, the rules weren't published, or your GitHub domain isn't in Authorized domains.
