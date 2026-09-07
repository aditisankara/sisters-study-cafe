# sisters cafe — study tracker

**Live:** <https://aditisankara.github.io/sisters-study-cafe/>

A cozy, offline-first study tracker. **No paid anything.**
Pure HTML/CSS/JS + a service worker. Data lives in your browser (`localStorage`),
with **optional** end-to-end-encrypted cloud sync via your own free Firebase project.

## Features

- **Multiple profiles**, each with its own data, one of 4 aesthetic themes (Café, Matcha, Midnight, Sakura), and an independent **light / dark** mode — 8 looks total. Toggle with the 🌙 button in the header or in Settings.
- **Task dump** — brain-dump tasks fast, triage later. Drag them into the planner.
- **Daily & weekly planner** — 7-day columns, drag-and-drop scheduling, inline editing.
- **Calendar** — month view with deadlines / exams / events. Link tasks to events (auto-sets due dates).
- **Focus timer** — Pomodoro-style, default 45 min (fully editable), break phases, progress ring, alarm, session log, daily goal.
- **Reminders** — everything due in the next 7 days (and the rest of the month), with optional browser notifications and a morning digest.
- **Calendar sync** — export `.ics` and import into Google Calendar / Apple Calendar for native phone + laptop alerts (free).
- **Stats & gamification** — focus streaks, levels, 26-week heatmap, 7-day bar chart, 10 achievements, confetti.
- **Widget mode** — `?widget=1` compact view (timer + next 7 days + today's tasks) to pin to a home screen.
- **PWA** — installable on desktop, Android, and iOS; works fully offline.
- **Cloud sync (optional)** — live phone↔laptop sync of all profiles & data. End-to-end encrypted (AES-GCM, key derived from your passphrase) *before* it leaves the device, so Firebase only ever stores ciphertext. Uses the Firebase free "Spark" plan — no credit card. Off by default.
- **Backup** — export/import JSON to move between devices without any account.
- **Keyboard shortcuts** — `g` then `d/p/c/f/r/s/t` to navigate; `space` to start/pause the timer.

## Run it

It needs to be served over HTTP (for the service worker), not opened as a `file://`.

```bash
# any static server works, e.g.
npx serve .
# or
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Deploy for free

Push to GitHub and enable **GitHub Pages** (Settings → Pages → deploy from branch).
Also works on Netlify / Cloudflare Pages / Vercel free tiers — it's just static files.

## First run

After you create a profile, the dashboard shows a **Getting started** checklist
(install the app, enable reminders, add a task, plan a day, add a deadline, do a
focus session, optionally turn on sync). It ticks itself off as you go and hides
when finished.

## Cross-device sync setup (optional, free)

**Fastest path — the setup script.** Create a bare Firebase project (one click),
grab a Google access token from the OAuth Playground, then:

```bash
node setup/firebase-setup.mjs --project YOUR_PROJECT_ID --token PASTE_TOKEN
```

It provisions Firestore, rules, Anonymous auth, authorized domains and a Web App,
and prints the `firebaseConfig` to paste into Settings → Cloud sync. Full details
in [`setup/README.md`](setup/README.md).

**Manual path.** Settings → **Cloud sync** has an in-app walkthrough. Short version:

1. Create a free Firebase project at <https://console.firebase.google.com> (Spark plan, no card).
2. **Firestore Database → Create** (production mode).
3. **Authentication → Anonymous → Enable.**
4. Firestore **Rules**:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{db}/documents {
       match /households/{doc} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```
5. Project **Settings → Your apps → Web app** → copy the `firebaseConfig` object.
6. In the app: paste that config + a long **passphrase**. Repeat on every device with the
   **same** config and **same** passphrase. Data syncs live (last-write-wins).

The passphrase is the real key — it encrypts everything client-side (AES-GCM, PBKDF2).
Firebase stores only an opaque blob at `households/h_<hash(passphrase)>`.

## "Real" native widgets

True OS home-screen widgets (Android App Widgets / iOS WidgetKit) require a native
wrapper and can't be done from a pure web app. The included **widget mode** + "Add to
Home Screen" is the free, no-store-account way to get a glanceable shortcut. For native
alarms, the `.ics` export into Google/Apple Calendar is the recommended path.
