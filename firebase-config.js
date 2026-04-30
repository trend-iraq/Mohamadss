// إعدادات Firebase الخاصة بمشروع ترند العراق
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyC9k_DUa2acubLtbjWbmvD8RT5JbxuC__0",
  authDomain: "trend-43645.firebaseapp.com",
  projectId: "trend-43645",
  storageBucket: "trend-43645.firebasestorage.app",
  messagingSenderId: "324962713400",
  appId: "1:324962713400:web:0c02b4bcc6ede0a0814bcd",
  measurementId: "G-GJ9RNCDBB3"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export { app };
