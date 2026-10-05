/**
 * Fărcașa EYV – Firebase configuration
 * NU șterge / nu goli aceste valori la modificări ulterioare.
 */
window.FARCASA_FIREBASE = {
  apiKey: "AIzaSyCdq-tUnqYw0nZcPx8NFSfoCFgdMYv7Kl4",
  authDomain: "sitetineretfarcasa2026.firebaseapp.com",
  projectId: "sitetineretfarcasa2026",
  storageBucket: "sitetineretfarcasa2026.firebasestorage.app",
  messagingSenderId: "896049704984",
  appId: "1:896049704984:web:93b94ef876abb89771d36d",

  SUPER_ADMIN_EMAILS: [
    'budeadanielm@gmail.com',
  ],

  ADMIN_EMAILS: [
    'budeadanielm@gmail.com',
    'sebastianghita54@gmail.com',
  ]
};

window.FARCASA_FIREBASE_ENABLED = function () {
  const c = window.FARCASA_FIREBASE || {};
  return !!(c.apiKey && c.projectId && c.appId);
};
