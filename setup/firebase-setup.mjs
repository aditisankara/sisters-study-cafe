#!/usr/bin/env node
/* ============================================================
   Sisters' Café — one-shot Firebase setup for Cloud Sync
   ------------------------------------------------------------
   You provide a Google OAuth access token (cloud-platform scope).
   This script then does EVERYTHING else:
     • enables the required Google APIs
     • adds Firebase to the project
     • creates the Firestore (default) database
     • publishes the security rules
     • enables Anonymous sign-in
     • authorizes your web domain(s)
     • creates a Web App and fetches its config
   …and prints the firebaseConfig block to paste into the app.

   Node 18+ (uses global fetch). No dependencies.

   USAGE
     node setup/firebase-setup.mjs --project <PROJECT_ID> --token <ACCESS_TOKEN>

   Common flags
     --project <id>     existing Firebase/GCP project id      (required)
     --token <token>    Google OAuth access token             (or env GOOGLE_TOKEN)
     --create           create the project first (id + --name)
     --name <text>      display name when --create is used
     --location <loc>   Firestore location (default: nam5)
     --domain <host>    extra authorized domain (repeatable)
                        default: aditisankara.github.io + localhost
     --out <file>       also write the config JSON to <file>

   Getting a token WITHOUT installing anything:
     1. open  https://developers.google.com/oauthplayground
     2. in "Input your own scopes" paste:
          https://www.googleapis.com/auth/cloud-platform
     3. Authorize APIs  →  sign in  →  "Exchange authorization code for tokens"
     4. copy the "Access token" (valid ~1 hour) and pass it as --token
   Or, if you have gcloud:  --token "$(gcloud auth print-access-token)"
   ============================================================ */

const RULES = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /households/{doc} {
      allow read, write: if request.auth != null;
    }
  }
}`;

const APIS = [
  'firebase.googleapis.com',
  'firestore.googleapis.com',
  'identitytoolkit.googleapis.com',
  'firebaserules.googleapis.com',
  'serviceusage.googleapis.com',
  'cloudresourcemanager.googleapis.com',
];

/* ---------- args ---------- */
const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? def : (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true);
};
const optAll = (name) => args.reduce((acc, a, i) => (a === `--${name}` ? [...acc, args[i + 1]] : acc), []);

const PROJECT = opt('project');
const TOKEN = opt('token') === true ? undefined : (opt('token') || process.env.GOOGLE_TOKEN);
const CREATE = !!opt('create', false);
const NAME = opt('name', PROJECT);
const LOCATION = opt('location', 'nam5');
const OUT = opt('out');
const DOMAINS = [...new Set(['aditisankara.github.io', 'localhost', ...optAll('domain').filter(Boolean)])];

if (!PROJECT || !TOKEN) {
  console.error('\n  Missing --project and/or --token.');
  console.error('  See the usage notes at the top of this file (or setup/README.md).\n');
  process.exit(1);
}

/* ---------- http helper ---------- */
const H = { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' };
let step = 0;
const log = (msg) => console.log(`  ${msg}`);
const head = (msg) => console.log(`\n${String(++step).padStart(2, ' ')}. ${msg}`);

async function req(method, url, body, { okStatuses = [], label = '' } = {}) {
  const res = await fetch(url, { method, headers: H, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* keep text */ }
  if (!res.ok && !okStatuses.includes(res.status)) {
    const detail = json?.error?.message || text || res.statusText;
    throw new Error(`${label || method + ' ' + url} → HTTP ${res.status}: ${detail}`);
  }
  return { ok: res.ok, status: res.status, json, text };
}

async function poll(opBaseUrl, op, tries = 60) {
  if (!op || op.done) return op;
  let name = op.name;
  for (let i = 0; i < tries; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const { json } = await req('GET', `${opBaseUrl}/${name}`, null, { label: 'poll op' });
    if (json?.done) {
      if (json.error) throw new Error(`operation failed: ${json.error.message}`);
      return json;
    }
    process.stdout.write('.');
  }
  process.stdout.write('\n');
  throw new Error('operation timed out');
}

/* ---------- steps ---------- */
async function checkToken() {
  head('Checking access token');
  const { json } = await req('GET', `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${encodeURIComponent(TOKEN)}`,
    null, { label: 'tokeninfo' });
  const scopes = (json.scope || '').split(/\s+/);
  const good = scopes.includes('https://www.googleapis.com/auth/cloud-platform')
    || scopes.includes('https://www.googleapis.com/auth/firebase');
  log(`token ok · expires in ~${Math.round((json.expires_in || 0) / 60)} min`);
  if (!good) log('⚠️  token is missing cloud-platform scope — some calls may 403');
}

async function createProject() {
  if (!CREATE) return;
  head(`Creating GCP project "${PROJECT}"`);
  const { json, status } = await req('POST', 'https://cloudresourcemanager.googleapis.com/v1/projects',
    { projectId: PROJECT, name: NAME }, { okStatuses: [409], label: 'create project' });
  if (status === 409) { log('project already exists — continuing'); return; }
  await poll('https://cloudresourcemanager.googleapis.com/v1', json);
  log('created');
}

async function enableApis() {
  head('Enabling required Google APIs');
  const { json } = await req('POST',
    `https://serviceusage.googleapis.com/v1/projects/${PROJECT}/services:batchEnable`,
    { serviceIds: APIS }, { label: 'batchEnable' });
  await poll('https://serviceusage.googleapis.com/v1', json);
  log(APIS.join(', '));
}

async function addFirebase() {
  head('Adding Firebase to the project');
  const { json, status } = await req('POST',
    `https://firebase.googleapis.com/v1beta1/projects/${PROJECT}:addFirebase`, {},
    { okStatuses: [409], label: 'addFirebase' });
  if (status === 409) { log('already a Firebase project'); return; }
  await poll('https://firebase.googleapis.com/v1beta1', json);
  log('done');
}

async function createFirestore() {
  head(`Creating Firestore database (location: ${LOCATION})`);
  const { json, status } = await req('POST',
    `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases?databaseId=(default)`,
    { type: 'FIRESTORE_NATIVE', locationId: LOCATION },
    { okStatuses: [409], label: 'create firestore' });
  if (status === 409) { log('default database already exists'); return; }
  await poll('https://firestore.googleapis.com/v1', json);
  log('created');
}

async function publishRules() {
  head('Publishing Firestore security rules');
  const { json: rs } = await req('POST',
    `https://firebaserules.googleapis.com/v1/projects/${PROJECT}/rulesets`,
    { source: { files: [{ name: 'firestore.rules', content: RULES }] } }, { label: 'create ruleset' });
  const rulesetName = rs.name;
  const relBody = { name: `projects/${PROJECT}/releases/cloud.firestore`, rulesetName };
  const first = await req('POST', `https://firebaserules.googleapis.com/v1/projects/${PROJECT}/releases`,
    relBody, { okStatuses: [409], label: 'create release' });
  if (first.status === 409) {
    await req('PATCH', `https://firebaserules.googleapis.com/v1/projects/${PROJECT}/releases/cloud.firestore`,
      { release: relBody }, { label: 'update release' });
  }
  log('rules live: households/{doc} readable/writable by any signed-in user');
}

const AUTH_CONFIG_URL = `https://identitytoolkit.googleapis.com/admin/v2/projects/${PROJECT}/config`;

async function configureAuth() {
  head('Enabling Anonymous sign-in + authorizing domains');

  let got = await req('GET', AUTH_CONFIG_URL, null, { okStatuses: [404], label: 'get auth config' });
  if (got.status === 404) {
    log('auth not initialized on this project yet — initializing…');
    await req('POST',
      `https://identitytoolkit.googleapis.com/v2/projects/${PROJECT}/identityPlatform:initializeAuth`,
      {}, { okStatuses: [409], label: 'initializeAuth' });
    for (let i = 0; i < 10 && got.status === 404; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      got = await req('GET', AUTH_CONFIG_URL, null, { okStatuses: [404], label: 'get auth config (retry)' });
      if (got.status === 404) process.stdout.write('.');
    }
    if (got.status === 404) throw new Error('auth config still not available after initializeAuth');
  }

  const cfg = got.json || {};
  const domains = [...new Set([...(cfg.authorizedDomains || []), ...DOMAINS])];
  await req('PATCH',
    `${AUTH_CONFIG_URL}?updateMask=signIn.anonymous.enabled,authorizedDomains`,
    { signIn: { anonymous: { enabled: true } }, authorizedDomains: domains },
    { label: 'patch auth config' });
  log(`anonymous: enabled · authorized domains: ${domains.join(', ')}`);
}

async function webAppConfig() {
  head('Getting Web App config');
  let { json: list } = await req('GET',
    `https://firebase.googleapis.com/v1beta1/projects/${PROJECT}/webApps`, null, { label: 'list web apps' });
  let app = (list.apps || [])[0];
  if (!app) {
    const { json: op } = await req('POST',
      `https://firebase.googleapis.com/v1beta1/projects/${PROJECT}/webApps`,
      { displayName: "Sisters' Café Study Tracker" }, { label: 'create web app' });
    const done = await poll('https://firebase.googleapis.com/v1beta1', op);
    app = done.response;
  }
  const appId = app.appId || (app.name || '').split('/').pop();
  const { json: conf } = await req('GET',
    `https://firebase.googleapis.com/v1beta1/projects/${PROJECT}/webApps/${appId}/config`, null,
    { label: 'get web app config' });
  return conf;
}

/* ---------- main ---------- */
(async () => {
  console.log(`\n☕  Sisters' Café — Firebase cloud-sync setup`);
  console.log(`    project: ${PROJECT}${CREATE ? '  (will create)' : ''}\n`);
  try {
    await checkToken();
    await createProject();
    await enableApis();
    await addFirebase();
    await createFirestore();
    await publishRules();

    let authManual = null;
    try {
      await configureAuth();
    } catch (e) {
      authManual = e.message;
      log(`⚠️  couldn't finish auth setup automatically (${e.message})`);
    }

    const conf = await webAppConfig();

    const clean = {
      apiKey: conf.apiKey,
      authDomain: conf.authDomain,
      projectId: conf.projectId,
      storageBucket: conf.storageBucket,
      messagingSenderId: conf.messagingSenderId,
      appId: conf.appId,
    };

    console.log(`\n${'='.repeat(60)}`);
    console.log(`✅  All set. Paste this into the app → Settings → Cloud sync:\n`);
    console.log(JSON.stringify(clean, null, 2));
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Then pick a passphrase and repeat the same config + passphrase on every device.\n`);

    if (authManual) {
      console.log(`⚠️  Auth wasn't fully configured by the script. Finish it by hand (2 clicks):`);
      console.log(`   • Firebase console → Authentication → Get started → Anonymous → Enable`);
      console.log(`   • Authentication → Settings → Authorized domains → add: ${DOMAINS.join(', ')}`);
      console.log(`   then re-run this script to confirm, or just proceed.\n`);
    }

    if (OUT && typeof OUT === 'string') {
      const { writeFileSync } = await import('node:fs');
      writeFileSync(OUT, JSON.stringify(clean, null, 2));
      console.log(`(also written to ${OUT})\n`);
    }

    if (opt('write-config', false)) {
      const { writeFileSync } = await import('node:fs');
      const { fileURLToPath } = await import('node:url');
      const path = await import('node:path');
      const target = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'firebase-config.js');
      const body = `/* Public Firebase web config — safe to commit. Security = Firestore rules + your passphrase.\n`
        + `   Generated by setup/firebase-setup.mjs on ${new Date().toISOString()}. */\n`
        + `window.CAFE_FIREBASE_CONFIG = ${JSON.stringify(clean, null, 2)};\n`;
      writeFileSync(target, body);
      console.log(`📝  Wrote ${target}`);
      console.log(`    Commit & push it so nobody has to paste config in the app:`);
      console.log(`      git add firebase-config.js && git commit -m "wire cloud sync config" && git push\n`);
    }
  } catch (err) {
    console.error(`\n❌  ${err.message}\n`);
    console.error(`   If it's a 403/permission error: make sure the token has the`);
    console.error(`   cloud-platform scope and your account owns/can edit the project.\n`);
    process.exit(1);
  }
})();
