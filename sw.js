// ============================================
//  Service Worker - ترند العراق
//  استراتيجية آمنة: ملفات التطبيق من الشبكة أولاً (حتى تصل التحديثات فوراً)
//  والصور من الكاش أولاً (سرعة قصوى)
//  ⚠️ غيّر رقم النسخة عند كل تحديث للملفات
// ============================================
const VERSION = 'v2';
const APP_CACHE = `ti-app-${VERSION}`;
const IMG_CACHE = `ti-img-${VERSION}`;
const APP_SHELL = ['./', './index.html', './styles.css', './app.js', './firebase-config.js', './assets/logo.webp'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(APP_CACHE)
      .then(c => c.addAll(APP_SHELL).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== APP_CACHE && k !== IMG_CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch (_) { return; }

  // لا نتدخل أبداً في طلبات Firebase أو التحليلات
  if (/firestore|googleapis|gstatic|firebase|facebook|tiktok/i.test(url.hostname)) return;

  // الصور (CDN أو محلية): الكاش أولاً
  if (req.destination === 'image' || /\.(webp|png|jpe?g|svg|gif)$/i.test(url.pathname)) {
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(IMG_CACHE).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => hit))
    );
    return;
  }

  // ملفات التطبيق: الشبكة أولاً، والكاش احتياطي عند انقطاع الإنترنت
  if (url.origin === location.origin) {
    e.respondWith(
      fetch(req).then(res => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(APP_CACHE).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => caches.match(req).then(hit => hit || caches.match('./index.html')))
    );
  }
});
