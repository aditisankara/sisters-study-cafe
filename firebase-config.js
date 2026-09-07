/* ------------------------------------------------------------------
   Public Firebase web config for cloud sync.

   SAFE TO COMMIT. Firebase web config values are not secrets — every
   web app ships them to the browser. What actually protects your data:
     1. Firestore security rules (only signed-in callers can read/write)
     2. your end-to-end passphrase (data is AES-GCM encrypted on-device
        before it's uploaded; Firebase only ever stores ciphertext)

   Fill this in once so nobody has to paste config in the app:
     • run:  node setup/firebase-setup.mjs --project <id> --token <tok> --write-config
       (it overwrites this file), then commit + push
     • or paste your firebaseConfig object below by hand
   Leave it null to fall back to the in-app "paste config" flow.
   ------------------------------------------------------------------ */
window.CAFE_FIREBASE_CONFIG = null;
