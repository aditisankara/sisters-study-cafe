# One-command cloud-sync setup

`firebase-setup.mjs` provisions everything Cloud Sync needs on a **free** Firebase
project, so in the app you only paste the resulting config + a passphrase.

## What you do

1. **Create the project shell** (the one click that can't be scripted safely):
   go to <https://console.firebase.google.com> → **Add project** → give it a name →
   accept defaults → done. Note the **Project ID** (looks like `my-study-app-3f9c`).

   *(Or let the script create it: add `--create --name "My Study App"`. Works only
   if your Google account can create projects and isn't inside a managed org.)*

2. **Get an access token** — no install needed:
   - open <https://developers.google.com/oauthplayground>
   - left panel → "Input your own scopes" → paste
     `https://www.googleapis.com/auth/cloud-platform`
   - **Authorize APIs** → sign in with the same Google account → **Exchange
     authorization code for tokens**
   - copy the **Access token** (valid ~1 hour)

   With `gcloud` instead: `gcloud auth print-access-token`

3. **Run it:**

   ```bash
   node setup/firebase-setup.mjs --project YOUR_PROJECT_ID --token PASTE_TOKEN_HERE --write-config
   ```

   `--write-config` also writes the config into `firebase-config.js` at the repo
   root. Commit + push that file and **the app is wired to your project** — from
   then on every device only needs a passphrase, no config pasting:

   ```bash
   git add firebase-config.js && git commit -m "wire cloud sync config" && git push
   ```

   It enables the APIs, adds Firebase, creates Firestore, publishes the security
   rules, turns on Anonymous sign-in, authorizes `aditisankara.github.io` +
   `localhost`, creates a Web App, and prints a `firebaseConfig` block.

4. **Lock the API key to your site** (do this if you committed `firebase-config.js`).
   Firebase web keys aren't secrets, but you can still make the committed one
   useless anywhere but your domain:
   - <https://console.cloud.google.com/apis/credentials> → pick your project
   - under **API keys**, open the auto-created "Browser key (auto created by Firebase)"
   - **Application restrictions → Websites** → **Add**:
     - `aditisankara.github.io/*`
     - `localhost/*`
   - Save. (Takes a few minutes to apply.)

5. **In the app** (every device): Settings → ☁️ Cloud sync.
   - If `firebase-config.js` is wired: just enter a passphrase → Enable.
   - Otherwise: paste the config block too. Same passphrase everywhere.

## Flags

| flag | meaning |
|---|---|
| `--project <id>` | existing project id (required unless `--create`) |
| `--token <tok>` | OAuth access token (or set `GOOGLE_TOKEN`) |
| `--create` | create the project first (with `--name`) |
| `--location <loc>` | Firestore location, default `nam5` (US multi-region; e.g. `eur3`, `us-central1`) |
| `--domain <host>` | extra authorized domain, repeatable (e.g. a custom domain) |
| `--out <file>` | also write the config JSON to a file |

## Safe to re-run

Every step treats "already exists" as success, so running it again just
reconciles settings. Nothing is destructive.

## Costs

Everything here is on the Firebase **Spark** (free) plan — no card. A study
tracker's whole dataset is a few KB; you won't get near the free quotas.
