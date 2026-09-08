/* Template. The real firebase-config.js is git-ignored and injected at deploy
   time from the FIREBASE_CONFIG GitHub repo secret (see .github/workflows/deploy.yml).

   For LOCAL testing only: copy this to firebase-config.js and fill in your
   project's web config. Firebase web values are not secrets, but keep this
   local copy out of git anyway (it already is).

     cp firebase-config.example.js firebase-config.js

   Leave it null to use the in-app "paste config" flow instead. */
window.CAFE_FIREBASE_CONFIG = null;
/*
window.CAFE_FIREBASE_CONFIG = {
  apiKey: "...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.firebasestorage.app",
  messagingSenderId: "...",
  appId: "1:...:web:...",
};
*/
