// ══════════════════════════════════════════════════
//  FIREBASE INIT (Modular SDK — Firestore only)
//  No Realtime Database is used anywhere in this project.
// ══════════════════════════════════════════════════
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBIN9V6VU272N4Q85vQoWC7FvVSc-NQuqE",
  authDomain: "pool8-2d25c.firebaseapp.com",
  projectId: "pool8-2d25c",
  storageBucket: "pool8-2d25c.firebasestorage.app",
  messagingSenderId: "314144118688",
  appId: "1:314144118688:web:08f57c12a32a7c14e976c5",
  measurementId: "G-BD0JFH2R4Y"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
