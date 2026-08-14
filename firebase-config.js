// ============================================
//  إعدادات Firebase - ترند العراق
//  التعديل الأهم: تفعيل الكاش المحلي الدائم
//  حتى تظهر المنتجات فوراً في الزيارات اللاحقة
// ============================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  getFirestore
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
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

// الكاش الدائم (IndexedDB): الزيارة الثانية تعرض المنتجات من الجهاز فوراً
// ثم تُحدَّث من السيرفر في الخلفية. هذا يقضي على تأخير الثانية عند الدخول.
let db;
try {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
  });
} catch (err) {
  // متصفح قديم أو وضع تصفح متخفٍّ لا يدعم IndexedDB
  console.warn('تعذّر تفعيل الكاش الدائم، سيتم استخدام الذاكرة فقط:', err);
  db = getFirestore(app);
}

export { db, app };
export const auth = getAuth(app);
