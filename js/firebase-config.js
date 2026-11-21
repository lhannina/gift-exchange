// =====================================================================
//  STEP 1: Paste your Firebase web app settings below.
//  Firebase console > Project settings (gear icon) > "Your apps" > Web app > Config
//
//  While apiKey still says PASTE_YOUR_API_KEY, the site runs in DEMO MODE
//  (sample people, data saved only in your browser).
// =====================================================================
export const firebaseConfig = {
  apiKey: "AIzaSyD2qQVdTTUSTMyW7eSn1fKxlnQ9ngYtjhs",
  authDomain: "gift-exchange-52181.firebaseapp.com",
  projectId: "gift-exchange-52181",
  storageBucket: "gift-exchange-52181.firebasestorage.app",
  messagingSenderId: "479948334265",
  appId: "1:479948334265:web:3fc9f294fecfa0dde0a768"
};

// =====================================================================
//  STEP 2: Organizer email(s). These people see the "Organizer" tab.
//  Create the login in Firebase console > Authentication > Users > Add user.
//  Put the SAME email(s) in firestore.rules.
//  (Demo mode: sign in as organizer with this email and password "demo".)
// =====================================================================
export const ADMIN_EMAILS = ['lsfrancia@gmail.com.com'];
