/* ============================================================
   sisters cafe — iOS home-screen widget (Scriptable)
   ------------------------------------------------------------
   Shows today's tasks, next reminders and focus minutes, pulled
   live from your cloud-synced data. Everything is decrypted
   on-device with your passphrase — same as the web app.

   SETUP (once):
     1. Install "Scriptable" from the App Store (free).
     2. Scriptable → + → paste this whole file → name it "sisters cafe".
     3. Run it once (▶ in the editor). It asks for your sync
        passphrase — the same one you use in the app. It's saved to
        the iOS Keychain, not iCloud, not this file.
     4. Home screen → long-press → + → Scriptable → add a widget →
        long-press the widget → Edit Widget → Script: "sisters cafe".
        (Optional) set "Parameter" to a profile name to pin the widget
        to that profile; otherwise it follows your active profile.

   Tap the widget to open the full app.
   iOS refreshes widgets on its own schedule (~every 15–60 min);
   this asks for a refresh ~every 20 min.
   ============================================================ */

/* No credentials in this file. The Firebase web config is read at runtime
   from the deployed site (where it's already public and domain-restricted),
   then cached for offline use. */
const APP_URL = "https://aditisankara.github.io/sisters-study-cafe/";
const KEYCHAIN_KEY = "cafe-sync-passphrase";
const CACHE_FILE = "sisters-cafe-widget-cache.json";
const FBCONF_CACHE = "sisters-cafe-fbconf.json";

const THEMES = {
  cafe:     { light: { bg: "#f5ece1", fg: "#3a2c20", sub: "#7a6552", accent: "#c98a5b" }, dark: { bg: "#1e1813", fg: "#f3e8d9", sub: "#bda98f", accent: "#d99a68" } },
  matcha:   { light: { bg: "#eef2e6", fg: "#263021", sub: "#5f7256", accent: "#7fa25a" }, dark: { bg: "#151a13", fg: "#e8efdf", sub: "#a9ba9d", accent: "#9dc077" } },
  midnight: { light: { bg: "#f1f0fb", fg: "#232135", sub: "#6f6b8c", accent: "#7c6cf0" }, dark: { bg: "#14131f", fg: "#ece9f7", sub: "#a29fbd", accent: "#9b8cff" } },
  sakura:   { light: { bg: "#fdeef2", fg: "#4a2a37", sub: "#9b6c7e", accent: "#e28fae" }, dark: { bg: "#1f151a", fg: "#f6e3ea", sub: "#c8a3b1", accent: "#e89db8" } },
};

/* ---------------- crypto (runs inside a WebView for crypto.subtle) ---------------- */
const CRYPTO_LIB = `
  const _enc = new TextEncoder();
  const _dec = new TextDecoder();
  const _unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  async function _sha256hex(str) {
    const h = await crypto.subtle.digest('SHA-256', _enc.encode(str));
    return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  async function _deriveKey(pass) {
    const base = await crypto.subtle.importKey('raw', _enc.encode(pass), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: _enc.encode('sisters-cafe-study-salt-v1'), iterations: 150000, hash: 'SHA-256' },
      base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
  }
  async function _docId(pass) { return 'h_' + (await _sha256hex('cafe-study-household::' + pass)).slice(0, 40); }
  async function _decrypt(pass, payload) {
    const key = await _deriveKey(pass);
    const [ivB, ctB] = payload.split(':');
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: _unb64(ivB) }, key, _unb64(ctB));
    return _dec.decode(pt);
  }
`;

function _delay(ms) { return new Promise((res) => { Timer.schedule(ms, false, res); }); }

/* Runs an async crypto expression in a WebView (for crypto.subtle) and reads
   the result back by polling a global — avoids every evaluateJavaScript
   return-type quirk (the "unsupported type" error). */
async function evalCrypto(expr) {
  const wv = new WebView();
  await wv.loadHTML("<html><body></body></html>", "https://localhost"); // https ⇒ secure context
  const kick = `
    ${CRYPTO_LIB}
    window.__cw = { done: false, out: null };
    (async () => {
      try {
        if (!(self.crypto && self.crypto.subtle)) { window.__cw.out = "__ERR__:WebCrypto unavailable"; }
        else {
          var r = await (${expr});
          window.__cw.out = (typeof r === "string" && r.length) ? r : ("__ERR__:bad result " + typeof r);
        }
      } catch (e) { window.__cw.out = "__ERR__:" + String((e && e.message) || e); }
      window.__cw.done = true;
    })();
    true;
  `;
  await wv.evaluateJavaScript(kick);
  let out = null;
  for (let i = 0; i < 120; i++) {
    const done = await wv.evaluateJavaScript("!!(window.__cw && window.__cw.done)");
    if (done) { out = await wv.evaluateJavaScript("window.__cw.out"); break; }
    await _delay(100);
  }
  if (typeof out !== "string") throw new Error("crypto timed out / bad bridge");
  if (out.indexOf("__ERR__:") === 0) throw new Error(out.slice(8));
  return out;
}

/* ---------------- passphrase ---------------- */
async function getPassphrase() {
  if (Keychain.contains(KEYCHAIN_KEY)) return Keychain.get(KEYCHAIN_KEY);
  return null;
}
async function promptPassphrase() {
  const a = new Alert();
  a.title = "sisters cafe sync";
  a.message = "Enter your sync passphrase (the same one from the app). Stored only in this device's Keychain.";
  a.addSecureTextField("passphrase");
  a.addAction("Save");
  a.addCancelAction("Cancel");
  const i = await a.presentAlert();
  if (i === -1) return null;
  const v = a.textFieldValue(0).trim();
  if (v) { Keychain.set(KEYCHAIN_KEY, v); return v; }
  return null;
}

/* ---------------- firebase config (fetched from the deployed site) ---------------- */
async function loadFirebaseConfig() {
  const fm = FileManager.local();
  const cp = fm.joinPath(fm.temporaryDirectory(), FBCONF_CACHE);
  try {
    const req = new Request(APP_URL + "firebase-config.js");
    req.timeoutInterval = 15;
    const text = await req.loadString();
    const m = text.match(/CAFE_FIREBASE_CONFIG\s*=\s*(\{[\s\S]*?\})\s*;/);
    if (!m) throw new Error("no config in firebase-config.js");
    const conf = JSON.parse(m[1]);
    if (!conf || !conf.apiKey) throw new Error("firebase-config.js has no apiKey");
    fm.writeString(cp, JSON.stringify(conf));
    return conf;
  } catch (e) {
    if (fm.fileExists(cp)) return JSON.parse(fm.readString(cp));
    throw new Error("could not load Firebase config (" + (e.message || e) + ")");
  }
}

/* The API key is HTTP-referrer restricted to the app's domain. Scriptable sends
   no Referer, which Google blocks — so we send the allowed one explicitly. */
const REFERER = "https://aditisankara.github.io/sisters-study-cafe/";

/* ---------------- data ---------------- */
async function fetchDB(pass) {
  const fb = await loadFirebaseConfig();
  const docId = await evalCrypto(`_docId(${JSON.stringify(pass)})`);

  const authReq = new Request(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${fb.apiKey}`);
  authReq.method = "POST";
  authReq.headers = { "Content-Type": "application/json", "Referer": REFERER, "Origin": "https://aditisankara.github.io" };
  authReq.body = JSON.stringify({ returnSecureToken: true });
  const auth = await authReq.loadJSON();
  if (!auth || !auth.idToken) throw new Error("sign-in failed (" + ((auth && auth.error && auth.error.message) || "?") + ")");

  const url = `https://firestore.googleapis.com/v1/projects/${fb.projectId}/databases/(default)/documents/households/${docId}`;
  const docReq = new Request(url);
  docReq.headers = { Authorization: "Bearer " + auth.idToken, "Referer": REFERER, "Origin": "https://aditisankara.github.io" };
  const doc = await docReq.loadJSON();
  const status = docReq.response.statusCode;
  if (status === 404) throw new Error("no synced data yet — enable Cloud sync in the app first");
  if (status !== 200) throw new Error("firestore " + status);
  const blob = doc && doc.fields && doc.fields.blob && doc.fields.blob.stringValue;
  if (!blob) throw new Error("empty sync document");

  const plain = await evalCrypto(`_decrypt(${JSON.stringify(pass)}, ${JSON.stringify(blob)})`);
  return JSON.parse(plain);
}

function todayStr() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function daysUntil(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return Math.round((new Date(y, m - 1, d) - new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())) / 86400000);
}

function summarize(db, profileParam) {
  const profiles = db.profiles || [];
  let prof = null;
  if (profileParam) prof = profiles.find((p) => (p.name || "").toLowerCase() === profileParam.toLowerCase());
  if (!prof) prof = profiles.find((p) => p.id === db.activeProfileId) || profiles[0];
  if (!prof) throw new Error("no profiles in synced data");
  const d = (db.data && db.data[prof.id]) || { tasks: [], events: [], sessions: [], dailyGoalMin: 120 };
  const today = todayStr();

  const tasks = (d.tasks || [])
    .filter((t) => t.scheduledFor === today && t.status !== "done")
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map((t) => t.title);

  const focusToday = (d.sessions || [])
    .filter((s) => s.type === "focus" && s.completed && (s.endedAt || "").slice(0, 10) === today)
    .reduce((a, s) => a + (s.minutes || 0), 0);

  const limit = daysUntil(today) + 7;
  const rem = [];
  (d.events || []).forEach((e) => {
    const n = daysUntil(e.date);
    if (n >= 0 && n <= 7) rem.push({ title: e.title, type: e.type, n });
  });
  (d.tasks || []).forEach((t) => {
    if (!t.due || t.status === "done") return;
    const n = daysUntil(t.due);
    if (n >= 0 && n <= 7) rem.push({ title: t.title, type: "task due", n });
  });
  rem.sort((a, b) => a.n - b.n);

  const th = THEMES[prof.theme] || THEMES.cafe;
  return {
    profile: prof.name, avatar: prof.avatar || "☕",
    theme: (th[prof.mode === "dark" ? "dark" : "light"]),
    focusToday, goal: d.dailyGoalMin || 120,
    tasks, reminders: rem,
    fetchedAt: Date.now(),
  };
}

/* ---------------- cache ---------------- */
function cachePath() { return FileManager.local().joinPath(FileManager.local().temporaryDirectory(), CACHE_FILE); }
function writeCache(obj) { try { FileManager.local().writeString(cachePath(), JSON.stringify(obj)); } catch (e) {} }
function readCache() {
  try { const p = cachePath(); if (FileManager.local().fileExists(p)) return JSON.parse(FileManager.local().readString(p)); }
  catch (e) {}
  return null;
}

/* ---------------- rendering ---------------- */
function relTime(ts) {
  const m = Math.round((Date.now() - ts) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return m + "m ago";
  return Math.round(m / 60) + "h ago";
}
function whenLabel(n) { return n === 0 ? "today" : n === 1 ? "tmrw" : n + "d"; }
const REM_ICON = { deadline: "⏰", exam: "📝", event: "📌", "task due": "✅" };

function buildWidget(s, stale) {
  const fam = config.widgetFamily || "medium";
  const t = s.theme;
  const w = new ListWidget();
  w.url = APP_URL;
  w.backgroundColor = new Color(t.bg);
  w.setPadding(14, 14, 14, 14);
  w.refreshAfterDate = new Date(Date.now() + 20 * 60 * 1000);

  const header = w.addStack();
  header.centerAlignContent();
  const title = header.addText(`${s.avatar} ${s.profile}`);
  title.font = Font.semiboldSystemFont(13);
  title.textColor = new Color(t.fg);
  header.addSpacer();
  const focus = header.addText(`${s.focusToday}/${s.goal}m`);
  focus.font = Font.mediumSystemFont(12);
  focus.textColor = new Color(t.accent);

  // focus meter (unicode blocks — no fragile layout)
  w.addSpacer(5);
  const frac = Math.max(0, Math.min(1, s.goal ? s.focusToday / s.goal : 0));
  const seg = fam === "small" ? 8 : 12;
  const filled = Math.round(frac * seg);
  const meter = w.addText("█".repeat(filled) + "░".repeat(seg - filled));
  meter.font = Font.systemFont(fam === "small" ? 9 : 10);
  meter.textColor = new Color(t.accent);

  w.addSpacer(8);

  if (fam === "small") {
    const nT = w.addText(`${s.tasks.length} task${s.tasks.length === 1 ? "" : "s"} today`);
    nT.font = Font.mediumSystemFont(13); nT.textColor = new Color(t.fg);
    w.addSpacer(2);
    const r = s.reminders[0];
    const rt = w.addText(r ? `${REM_ICON[r.type] || "•"} ${r.title} · ${whenLabel(r.n)}` : "nothing due this week");
    rt.font = Font.systemFont(11); rt.textColor = new Color(t.sub); rt.lineLimit = 2;
    w.addSpacer();
  } else {
    const maxTasks = fam === "large" ? 6 : 3;
    const lab1 = w.addText("TODAY");
    lab1.font = Font.semiboldSystemFont(9); lab1.textColor = new Color(t.sub);
    w.addSpacer(3);
    if (s.tasks.length === 0) {
      const e = w.addText("nothing planned"); e.font = Font.systemFont(12); e.textColor = new Color(t.sub);
    } else {
      s.tasks.slice(0, maxTasks).forEach((title) => {
        const row = w.addText("• " + title);
        row.font = Font.systemFont(12); row.textColor = new Color(t.fg); row.lineLimit = 1;
        w.addSpacer(2);
      });
      if (s.tasks.length > maxTasks) {
        const more = w.addText(`+${s.tasks.length - maxTasks} more`);
        more.font = Font.systemFont(10); more.textColor = new Color(t.sub);
      }
    }

    w.addSpacer(8);
    const lab2 = w.addText("NEXT 7 DAYS");
    lab2.font = Font.semiboldSystemFont(9); lab2.textColor = new Color(t.sub);
    w.addSpacer(3);
    const maxRem = fam === "large" ? 5 : 2;
    if (s.reminders.length === 0) {
      const e = w.addText("clear skies 🌤️"); e.font = Font.systemFont(12); e.textColor = new Color(t.sub);
    } else {
      s.reminders.slice(0, maxRem).forEach((r) => {
        const row = w.addStack();
        const a = row.addText(`${REM_ICON[r.type] || "•"} ${r.title}`);
        a.font = Font.systemFont(12); a.textColor = new Color(t.fg); a.lineLimit = 1;
        row.addSpacer();
        const b = row.addText(whenLabel(r.n));
        b.font = Font.mediumSystemFont(11);
        b.textColor = new Color(r.n <= 1 ? t.accent : t.sub);
        w.addSpacer(2);
      });
    }
    w.addSpacer();
  }

  const foot = w.addText((stale ? "⚠ offline · " : "") + "updated " + relTime(s.fetchedAt));
  foot.font = Font.systemFont(9);
  foot.textColor = new Color(t.sub);
  return w;
}

function errorWidget(msg) {
  const w = new ListWidget();
  w.url = APP_URL;
  w.backgroundColor = new Color("#1e1813");
  w.setPadding(16, 16, 16, 16);
  const t = w.addText("sisters cafe");
  t.font = Font.semiboldSystemFont(13); t.textColor = new Color("#f3e8d9");
  w.addSpacer(6);
  const m = w.addText(msg);
  m.font = Font.systemFont(11); m.textColor = new Color("#bda98f"); m.lineLimit = 4;
  w.addSpacer();
  const h = w.addText("tap to open the app");
  h.font = Font.systemFont(9); h.textColor = new Color("#bda98f");
  w.refreshAfterDate = new Date(Date.now() + 15 * 60 * 1000);
  return w;
}

/* ---------------- main ---------------- */
async function main() {
  let pass = await getPassphrase();

  if (!config.runsInWidget) {
    pass = await promptPassphrase() || pass;
    if (!pass) { console.log("no passphrase set"); return Script.complete(); }
  }
  if (!pass) {
    const w = errorWidget("Open Scriptable and run this script once to enter your sync passphrase.");
    Script.setWidget(w); return Script.complete();
  }

  const profileParam = (args.widgetParameter || "").trim() || null;
  let widget;
  try {
    const db = await fetchDB(pass);
    const s = summarize(db, profileParam);
    writeCache(s);
    widget = buildWidget(s, false);
  } catch (e) {
    console.log("widget error: " + e.message);
    const cached = readCache();
    if (cached) widget = buildWidget(cached, true);
    else widget = errorWidget(String(e.message || e));
  }

  if (config.runsInWidget) Script.setWidget(widget);
  else {
    const fam = config.widgetFamily;
    if (fam === "small") await widget.presentSmall();
    else if (fam === "large") await widget.presentLarge();
    else await widget.presentMedium();
  }
  Script.complete();
}

await main();
