# Sisters' Café — Study Tracker

A cozy, offline-first study tracker. **No accounts, no server, no paid anything.**
Pure HTML/CSS/JS + a service worker. Data lives in your browser (`localStorage`).

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
- **Backup** — export/import JSON to move between devices.
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

## "Real" native widgets

True OS home-screen widgets (Android App Widgets / iOS WidgetKit) require a native
wrapper and can't be done from a pure web app. The included **widget mode** + "Add to
Home Screen" is the free, no-store-account way to get a glanceable shortcut. For native
alarms, the `.ics` export into Google/Apple Calendar is the recommended path.
