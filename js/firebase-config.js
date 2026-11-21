// =====================================================================
//  STEP 1: Paste your Firebase web app settings below.
//  Firebase console > Project settings (gear icon) > "Your apps" > Web app > Config
//
//  While apiKey still says PASTE_YOUR_API_KEY, the site runs in DEMO MODE
//  (sample people, data saved only in your browser).
// =====================================================================
export const firebaseConfig = {
  apiKey: 'PASTE_YOUR_API_KEY',
  authDomain: 'your-project.firebaseapp.com',
  projectId: 'your-project',
  storageBucket: 'your-project.firebasestorage.app',
  messagingSenderId: '000000000000',
  appId: '1:000000000000:web:0000000000000000',
};

// =====================================================================
//  STEP 2: Organizer email(s). These people see the "Organizer" tab.
//  Create the login in Firebase console > Authentication > Users > Add user.
//  Put the SAME email(s) in firestore.rules.
//  (Demo mode: sign in as organizer with this email and password "demo".)
// =====================================================================
export const ADMIN_EMAILS = ['you@example.com'];
