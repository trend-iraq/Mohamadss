// ============================================
//  ترند العراق - النسخة المُحسّنة
//  أهم التعديلات:
//  1) الصور والفيديو تُرفع إلى Bunny CDN ويُحفظ الرابط فقط (بدل Base64)
//  2) كاش محلي دائم + عرض فوري للمنتجات المخزّنة
//  3) إصلاح الاشتراك المزدوج بالمنتجات
//  4) البحث لا يفقد التركيز + السلة تُحفظ بعد تحديث الصفحة
//  5) إصلاح زر "إرسال نسخة عبر واتساب"
//  6) فحص المخزون + كلفة التوصيل + ترقيم الطلبات
// ============================================
import { db, auth } from './firebase-config.js';
import {
  collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc,
  query, orderBy, limit, onSnapshot, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  signInWithEmailAndPassword, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// ============================================
//  ⚙️ إعدادات لازم تملأها (اقرأ ملف التعليمات)
// ============================================

// --- Bunny.net CDN لرفع الصور والفيديو ---
// إذا تركت accessKey فارغاً سيعود النظام تلقائياً لطريقة Base64 القديمة
// مع حدود أصغر بكثير حتى لا يتوقف المتجر.
const BUNNY = {
  zone: 'trendiraq',                             // اسم Storage Zone
  accessKey: '925c56f0-933a-40ae-91b96d6d795c-b27a-4c42',  // كلمة مرور الـ Storage Zone
  storageHost: 'storage.bunnycdn.com',           // غيّرها حسب منطقة الزون (مثلاً ny. أو uk.)
  cdnUrl: 'https://trendiraq.b-cdn.net'          // رابط الـ Pull Zone
};
const CDN_READY = () => Boolean(BUNNY.accessKey && BUNNY.zone && BUNNY.cdnUrl);

// --- معرّفات حسابات الأدمن ---
// اتركها فارغة ليدخل أي حساب مسجَّل، أو ضع UID حسابك من Firebase Console
// (Authentication ← Users ← انسخ User UID). حماية البيانات الفعلية في firestore.rules
const ADMIN_UIDS = ['tKPI5DbbgVMIbg75dQl413kSNYK2'];
const isAdminUser = (u) => !!u && (ADMIN_UIDS.length === 0 || ADMIN_UIDS.includes(u.uid));

// ============================================
//  الثوابت
// ============================================
const IRAQI_GOVERNORATES = ['بغداد','البصرة','نينوى / الموصل','أربيل','النجف','كربلاء','بابل / الحلة','ديالى / بعقوبة','ذي قار / الناصرية','صلاح الدين / تكريت','الأنبار / الرمادي','كركوك','دهوك','السليمانية','ميسان / العمارة','المثنى / السماوة','القادسية / الديوانية','واسط / الكوت','حلبجة'];

const DEFAULT_SETTINGS = {
  storeName:'ترند العراق', tagline:'وجهتك الأولى للموضة والتقنية في العراق', city:'بغداد، العراق',
  whatsappNumber:'9647700000000', phoneDisplay:'07700000000',
  currency:'د.ع', freeShippingMin:50000, shippingCost:0,
  themeColor:'red', backgroundStyle:'cream',
  floatingWhatsappEnabled:true, floatingWhatsappPosition:'left',
  whatsappCheckoutEnabled:true, directCheckoutEnabled:true,
  heroEnabled:true, heroBadge:'🔥 التريند الآن في العراق', heroTitle:'اكتشف أحدث صيحات الموضة',
  announcementEnabled:true, announcementText:'🚚 توصيل لجميع المحافظات • 💵 الدفع عند الاستلام • 🔥 خصومات تصل إلى 30%',
};

const THEMES = {
  red:{name:'أحمر',primary:'#dc2626',dark:'#991b1b',light:'#fef2f2'},
  blue:{name:'أزرق',primary:'#2563eb',dark:'#1e40af',light:'#eff6ff'},
  green:{name:'أخضر',primary:'#16a34a',dark:'#14532d',light:'#f0fdf4'},
  purple:{name:'بنفسجي',primary:'#9333ea',dark:'#581c87',light:'#faf5ff'},
  orange:{name:'برتقالي',primary:'#ea580c',dark:'#9a3412',light:'#fff7ed'},
  pink:{name:'وردي',primary:'#db2777',dark:'#9d174d',light:'#fdf2f8'},
  teal:{name:'تركوازي',primary:'#0d9488',dark:'#134e4a',light:'#f0fdfa'},
  black:{name:'أسود',primary:'#0f172a',dark:'#000000',light:'#f8fafc'},
};

const BACKGROUNDS = {
  cream:{name:'كريمي',color:'#fafaf9'}, white:{name:'أبيض',color:'#ffffff'},
  gray:{name:'رمادي',color:'#f3f4f6'}, warm:{name:'دافئ',color:'#fff7ed'},
  cool:{name:'بارد',color:'#f8fafc'}, dark:{name:'داكن',color:'#1c1917'},
};

const CATEGORIES = [
  {id:'all',name:'الكل',icon:'🛍️'},{id:'fashion',name:'الموضة',icon:'👕'},
  {id:'electronics',name:'إلكترونيات',icon:'📱'},{id:'beauty',name:'العناية والجمال',icon:'💄'},
  {id:'home',name:'المنزل',icon:'🏠'},{id:'kids',name:'الأطفال',icon:'🧸'},{id:'sports',name:'الرياضة',icon:'⚽'}
];

const STATUS_MAP = {
  pending:{label:'قيد المعالجة',cls:'status-pending'},
  confirmed:{label:'مؤكد',cls:'status-confirmed'},
  shipped:{label:'قيد التوصيل',cls:'status-shipped'},
  delivered:{label:'تم التسليم',cls:'status-delivered'},
  cancelled:{label:'ملغي',cls:'status-cancelled'},
};

const MAX_IMAGES = 5;
const ORDERS_PAGE = 200;              // أقصى عدد طلبات تُحمّل في اللوحة
const CART_KEY = 'ti_cart_v2';
const SETTINGS_KEY = 'ti_settings_v2';

const PLACEHOLDER = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23e7e5e4" width="100" height="100"/><text x="50" y="55" text-anchor="middle" fill="%23a8a29e" font-size="10">صورة</text></svg>';

// ============================================
//  الحالة العامة
// ============================================
const state = {
  settings: { ...DEFAULT_SETTINGS },
  products: [],
  orders: [],
  cart: [],
  category: 'all',
  search: '',
  view: 'store',
  user: null,
  productsUnsub: null,
  ordersUnsub: null,
  shellReady: false,
  firstPaintDone: false,
};

// ============================================
//  أدوات مساعدة
// ============================================
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const escapeHtml = (str) => String(str ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const formatPrice = (p, c) => new Intl.NumberFormat('en-US').format(Math.round(p || 0)) + ' ' + (c || state.settings.currency);
const isDataUrl = (s) => typeof s === 'string' && s.startsWith('data:');

function showToast(msg, type = 'success') {
  const old = $('.toast');
  if (old) old.remove();
  const t = document.createElement('div');
  t.className = 'toast' + (type === 'error' ? ' error' : '');
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2800);
}

// إنشاء مودال مع ربط الإغلاق تلقائياً (بدون تسريب مستمعات)
function mountModal(html) {
  closeModal();
  const wrap = document.createElement('div');
  wrap.innerHTML = html.trim();
  const overlay = wrap.firstElementChild;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay || e.target.closest('[data-close]')) closeModal();
  });
  document.body.style.overflow = 'hidden';
  return overlay;
}

function closeModal() {
  $$('.modal-overlay, .cart-drawer').forEach(m => m.remove());
  document.body.style.overflow = '';
}

// إغلاق المودال بزر الرجوع / Escape
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

// ============================================
//  معالجة الوسائط + الرفع إلى CDN
// ============================================

// ضغط الصورة مع الحفاظ على النسبة (بدل القص المربّع القديم)
function compressImage(file, maxSize, quality, mime = 'image/webp') {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) return reject(new Error('ملف غير صالح'));
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      c.toBlob(
        (blob) => blob ? resolve(blob) : c.toBlob(b2 => b2 ? resolve(b2) : reject(new Error('فشل ضغط الصورة')), 'image/jpeg', quality),
        mime, quality
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('فشل تحميل الصورة')); };
    img.src = url;
  });
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(new Error('فشل قراءة الملف'));
    r.readAsDataURL(blob);
  });
}

function dataUrlToBlob(dataUrl) {
  const [head, body] = dataUrl.split(',');
  const mime = (head.match(/data:([^;]+)/) || [])[1] || 'application/octet-stream';
  const bin = atob(body);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

async function uploadToBunny(blob, path) {
  const res = await fetch(`https://${BUNNY.storageHost}/${BUNNY.zone}/${path}`, {
    method: 'PUT',
    headers: { AccessKey: BUNNY.accessKey, 'Content-Type': 'application/octet-stream' },
    body: blob
  });
  if (!res.ok) throw new Error(`فشل الرفع إلى CDN (${res.status})`);
  return `${BUNNY.cdnUrl.replace(/\/$/, '')}/${path}`;
}

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

// ترجع { full, thumb }: نسخة كبيرة للتفاصيل ونسخة صغيرة للشبكة
async function processProductImage(file) {
  if (CDN_READY()) {
    const [full, thumb] = await Promise.all([
      compressImage(file, 1000, 0.82),
      compressImage(file, 400, 0.78)
    ]);
    const id = uid();
    const [fullUrl, thumbUrl] = await Promise.all([
      uploadToBunny(full, `products/${id}.webp`),
      uploadToBunny(thumb, `products/${id}-t.webp`)
    ]);
    return { full: fullUrl, thumb: thumbUrl };
  }
  // احتياطي بدون CDN: حجم أصغر بكثير حتى لا يتضخّم مستند Firestore
  const blob = await compressImage(file, 500, 0.7, 'image/jpeg');
  const dataUrl = await blobToDataUrl(blob);
  return { full: dataUrl, thumb: dataUrl };
}

async function processProductVideo(file) {
  if (!file || !file.type.startsWith('video/')) throw new Error('ملف غير صالح');
  if (CDN_READY()) {
    if (file.size > 40 * 1024 * 1024) throw new Error('حجم الفيديو يجب أن يكون أقل من 40 ميجا');
    const ext = (file.name.split('.').pop() || 'mp4').toLowerCase().replace(/[^a-z0-9]/g, '');
    return await uploadToBunny(file, `products/${uid()}.${ext}`);
  }
  // بدون CDN: حد Firestore للمستند 1 ميجا، لذلك 600 كيلوبايت هو السقف الآمن
  if (file.size > 600 * 1024) {
    throw new Error('بدون CDN الحد الأقصى للفيديو 600 كيلوبايت. فعّل Bunny CDN لرفع فيديوهات أكبر');
  }
  return await blobToDataUrl(file);
}

// ============================================
//  Firebase: القراءة
// ============================================
async function loadSettings() {
  try {
    const snap = await getDoc(doc(db, 'settings', 'main'));
    if (snap.exists()) {
      state.settings = { ...DEFAULT_SETTINGS, ...snap.data() };
      try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings)); } catch (_) {}
    }
  } catch (err) {
    console.error('فشل تحميل الإعدادات:', err);
  }
}

// تحميل الإعدادات المخزّنة محلياً فوراً (قبل أي اتصال بالشبكة)
function loadCachedSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) state.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (_) {}
}

function sortByCreated(list) {
  return list.sort((a, b) => {
    const at = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a._localCreatedAt || 0);
    const bt = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b._localCreatedAt || 0);
    return bt - at;
  });
}

// اشتراك واحد فقط بالمنتجات (كان يُستدعى مرتين في النسخة السابقة)
function subscribeProducts() {
  if (state.productsUnsub) return;
  state.productsUnsub = onSnapshot(collection(db, 'products'), (snap) => {
    state.products = sortByCreated(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    reconcileCart();
    if (state.view === 'store') renderStore();
    else renderAdmin();
    hideLoading();
  }, (err) => {
    console.error('خطأ في تحميل المنتجات:', err);
    hideLoading();
    showToast('تعذّر تحميل المنتجات', 'error');
  });
}

function subscribeOrders() {
  if (state.ordersUnsub || !state.user) return;
  const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(ORDERS_PAGE));
  state.ordersUnsub = onSnapshot(q, (snap) => {
    state.orders = sortByCreated(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    if (state.view === 'admin') renderAdmin();
  }, (err) => {
    console.error('خطأ في تحميل الطلبات:', err);
  });
}

function unsubscribeOrders() {
  if (state.ordersUnsub) { state.ordersUnsub(); state.ordersUnsub = null; }
  state.orders = [];
}

// ============================================
//  Firebase: الكتابة
// ============================================
async function saveSettings(data) {
  try {
    const clean = { ...data };
    delete clean.id;
    await setDoc(doc(db, 'settings', 'main'), clean, { merge: true });
    state.settings = { ...DEFAULT_SETTINGS, ...clean };
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings)); } catch (_) {}
    return true;
  } catch (err) {
    console.error(err);
    showToast('فشل الحفظ', 'error');
    return false;
  }
}

async function saveProduct(data, id = null) {
  try {
    if (id) {
      await updateDoc(doc(db, 'products', id), { ...data, updatedAt: serverTimestamp() });
    } else {
      await addDoc(collection(db, 'products'), {
        ...data, createdAt: serverTimestamp(), _localCreatedAt: Date.now()
      });
    }
    return true;
  } catch (err) {
    console.error(err);
    showToast(err?.code === 'permission-denied' ? 'لا تملك صلاحية الحفظ' : 'فشل الحفظ', 'error');
    return false;
  }
}

async function deleteProduct(id) {
  try { await deleteDoc(doc(db, 'products', id)); return true; }
  catch (err) { console.error(err); showToast('فشل الحذف', 'error'); return false; }
}

async function createOrder(orderData) {
  try {
    const orderNumber = `T${Date.now().toString().slice(-6)}`;
    const ref = await addDoc(collection(db, 'orders'), {
      ...orderData, orderNumber, status: 'pending',
      createdAt: serverTimestamp(), _localCreatedAt: Date.now()
    });
    // نُرجع البيانات كاملة حتى يعمل زر "إرسال نسخة عبر واتساب"
    return { id: ref.id, orderNumber, ...orderData };
  } catch (err) {
    console.error(err);
    return null;
  }
}

async function updateOrderStatus(id, status) {
  try { await updateDoc(doc(db, 'orders', id), { status, updatedAt: serverTimestamp() }); return true; }
  catch (err) { console.error(err); showToast('فشل التحديث', 'error'); return false; }
}

async function deleteOrder(id) {
  try { await deleteDoc(doc(db, 'orders', id)); return true; }
  catch (err) { console.error(err); showToast('فشل الحذف', 'error'); return false; }
}

// ============================================
//  السلة (محفوظة في الجهاز)
// ============================================
function saveCart() {
  try { localStorage.setItem(CART_KEY, JSON.stringify(state.cart)); } catch (_) {}
}

function loadCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    state.cart = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(state.cart)) state.cart = [];
  } catch (_) { state.cart = []; }
}

// تحديث السلة بعد وصول المنتجات: حذف المحذوف، تصحيح السعر والمخزون
function reconcileCart() {
  if (!state.cart.length || !state.products.length) return;
  let changed = false;
  state.cart = state.cart.filter(item => {
    const p = state.products.find(x => x.id === item.id);
    if (!p) { changed = true; return false; }
    if (p.price !== item.price) { item.price = p.price; changed = true; }
    if (p.name !== item.name) { item.name = p.name; changed = true; }
    const max = typeof p.stock === 'number' ? p.stock : 999;
    if (max > 0 && item.qty > max) { item.qty = max; changed = true; }
    return true;
  });
  if (changed) { saveCart(); updateCartBadge(); }
}

function productStock(p) {
  return typeof p?.stock === 'number' ? p.stock : 999;
}

function addToCart(product) {
  const stock = productStock(product);
  if (stock <= 0) { showToast('هذا المنتج غير متوفر حالياً', 'error'); return; }
  const existing = state.cart.find(i => i.id === product.id);
  if (existing) {
    if (existing.qty >= stock) { showToast(`الكمية المتاحة ${stock} فقط`, 'error'); return; }
    existing.qty++;
  } else {
    // نخزّن رابط الصورة فقط، وإذا كانت Base64 نتركها فارغة (توفير مساحة)
    const img = product.thumb || (product.thumbs && product.thumbs[0]) || (product.images && product.images[0]) || product.image || '';
    state.cart.push({
      id: product.id, name: product.name, price: product.price,
      image: isDataUrl(img) ? '' : img, qty: 1
    });
  }
  saveCart();
  showToast('✓ تمت الإضافة إلى السلة');
  updateCartBadge();
}

function updateCartQty(id, delta) {
  const item = state.cart.find(i => i.id === id);
  if (!item) return;
  const p = state.products.find(x => x.id === id);
  const max = productStock(p);
  const next = item.qty + delta;
  if (next > max) { showToast(`الكمية المتاحة ${max} فقط`, 'error'); return; }
  item.qty = Math.max(1, next);
  saveCart();
  renderCart();
  updateCartBadge();
}

function removeFromCart(id) {
  state.cart = state.cart.filter(i => i.id !== id);
  saveCart();
  renderCart();
  updateCartBadge();
}

const cartSubtotal = () => state.cart.reduce((s, i) => s + (i.price || 0) * i.qty, 0);
const cartCount = () => state.cart.reduce((s, i) => s + i.qty, 0);

// كلفة التوصيل: مجانية إذا تجاوز المجموع الحد أو إذا لم تُحدَّد كلفة
function shippingFee() {
  const cost = Number(state.settings.shippingCost) || 0;
  const min = Number(state.settings.freeShippingMin) || 0;
  if (cost <= 0) return 0;
  if (min > 0 && cartSubtotal() >= min) return 0;
  return cost;
}

const cartTotal = () => cartSubtotal() + shippingFee();

function updateCartBadge() {
  const badge = $('#cartBadge');
  if (!badge) return;
  const c = cartCount();
  badge.textContent = c;
  badge.style.display = c > 0 ? 'flex' : 'none';
}

// صورة عنصر السلة: من السلة أو من المنتج الأصلي إن كانت مفقودة
function cartItemImage(it) {
  if (it.image) return it.image;
  const p = state.products.find(x => x.id === it.id);
  return (p && (p.thumb || (p.thumbs && p.thumbs[0]) || (p.images && p.images[0]) || p.image)) || PLACEHOLDER;
}

// ============================================
//  واتساب
// ============================================
function buildWhatsAppMessage(items, customerInfo, totals) {
  const s = state.settings;
  let msg = `🛍️ *طلب جديد من ${s.storeName}*\n\n`;
  items.forEach((it, i) => {
    msg += `${i + 1}. ${it.name}\n   ${it.qty} × ${formatPrice(it.price)} = ${formatPrice(it.price * it.qty)}\n\n`;
  });
  if (totals && totals.shipping > 0) {
    msg += `المنتجات: ${formatPrice(totals.subtotal)}\nالتوصيل: ${formatPrice(totals.shipping)}\n`;
  }
  msg += `\n💰 *الإجمالي: ${formatPrice(totals ? totals.total : items.reduce((s2, i) => s2 + i.price * i.qty, 0))}*\n\n`;
  if (customerInfo) {
    msg += `📋 *بيانات الزبون:*\nالاسم: ${customerInfo.name}\nالهاتف: ${customerInfo.phone}\nالمحافظة: ${customerInfo.governorate}\nالعنوان: ${customerInfo.address}\n`;
    if (customerInfo.notes) msg += `ملاحظات: ${customerInfo.notes}\n`;
  } else {
    msg += `📍 الرجاء إرسال الاسم والعنوان والمحافظة ورقم الهاتف`;
  }
  return msg;
}

function openWhatsApp(msg) {
  const num = String(state.settings.whatsappNumber || '').replace(/\D/g, '');
  if (!num) { showToast('رقم الواتساب غير مضبوط', 'error'); return; }
  window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
}

function checkoutWhatsApp() {
  if (state.cart.length === 0) return;
  openWhatsApp(buildWhatsAppMessage(state.cart, null, {
    subtotal: cartSubtotal(), shipping: shippingFee(), total: cartTotal()
  }));
}

// ============================================
//  الثيم
// ============================================
function applyTheme() {
  const t = THEMES[state.settings.themeColor] || THEMES.red;
  const bg = BACKGROUNDS[state.settings.backgroundStyle] || BACKGROUNDS.cream;
  const root = document.documentElement;
  root.style.setProperty('--primary', t.primary);
  root.style.setProperty('--primary-dark', t.dark);
  root.style.setProperty('--primary-light', t.light);
  root.style.setProperty('--bg', bg.color);
  document.body.classList.toggle('dark-mode', state.settings.backgroundStyle === 'dark');
  const meta = $('#themeColorMeta') || $('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', t.primary);
}

function hideLoading() {
  if (state.firstPaintDone) return;
  state.firstPaintDone = true;
  window.__storeReady = true;
  const ls = $('#loadingScreen');
  if (ls) ls.style.display = 'none';
  const app = $('#app');
  if (app) app.style.display = 'block';
}

// ============================================
//  عرض المتجر
//  ملاحظة: الهيكل يُبنى مرة واحدة، والمنتجات فقط تُحدَّث
//  حتى لا يفقد حقل البحث التركيز أثناء الكتابة
// ============================================
function renderStore(rebuildShell = false) {
  if (!$('#app')) return;
  applyTheme();
  if (!state.shellReady || rebuildShell) buildStoreShell();
  renderProductSections();
  updateCartBadge();
  hideLoading();
}

function buildStoreShell() {
  const s = state.settings;
  const waNum = String(s.whatsappNumber || '').replace(/\D/g, '');
  $('#app').innerHTML = `
    ${s.announcementEnabled ? `<div class="announcement-bar">${escapeHtml(s.announcementText)}</div>` : ''}
    <header class="header">
      <div class="header-content">
        <div class="logo">
          <div class="logo-icon"><img src="assets/logo.webp" alt="ترند العراق" class="logo-icon-img" width="40" height="40" /></div>
          <div>
            <h1>${escapeHtml(s.storeName)}</h1>
            <p>TREND IRAQ</p>
          </div>
        </div>
        <div class="header-actions">
          <button class="icon-btn" data-action="admin-login" title="لوحة التحكم" aria-label="لوحة التحكم">⚙️</button>
          <button class="icon-btn" data-action="open-cart" aria-label="السلة">
            🛒<span class="cart-badge" id="cartBadge" style="display:none;">0</span>
          </button>
        </div>
      </div>
      <div class="search-bar">
        <input type="search" id="searchInput" placeholder="ابحث عن منتج..." value="${escapeHtml(state.search)}" autocomplete="off" />
      </div>
      <div class="categories-bar">
        <div class="categories" id="catBar">
          ${CATEGORIES.map(c => `
            <button class="cat-btn ${state.category === c.id ? 'active' : ''}" data-cat="${c.id}">
              ${c.icon} ${escapeHtml(c.name)}
            </button>`).join('')}
        </div>
      </div>
    </header>

    <div id="dynamicSections"></div>

    <footer class="footer">
      <div class="footer-content">
        <div class="footer-section">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
            <div class="logo-icon"><img src="assets/logo.webp" alt="" class="logo-icon-img" width="40" height="40" loading="lazy" /></div>
            <h4 style="font-family:'Cairo',sans-serif;font-size:24px;font-weight:900;">${escapeHtml(s.storeName)}</h4>
          </div>
          <p>${escapeHtml(s.tagline)}</p>
        </div>
        <div class="footer-section">
          <h5>تواصل معنا</h5>
          <a href="https://wa.me/${waNum}" target="_blank" rel="noopener">💬 واتساب: ${escapeHtml(s.phoneDisplay)}</a>
          <p>📍 ${escapeHtml(s.city)}</p>
        </div>
        <div class="footer-section">
          <h5>طرق الدفع والتوصيل</h5>
          <p>💵 الدفع نقداً عند الاستلام</p>
          <p>🚚 توصيل لجميع المحافظات الـ 19</p>
        </div>
      </div>
      <div class="footer-bottom">© ${new Date().getFullYear()} ${escapeHtml(s.storeName)} - جميع الحقوق محفوظة</div>
    </footer>

    ${s.floatingWhatsappEnabled ? `
      <a class="float-whatsapp ${s.floatingWhatsappPosition}" href="https://wa.me/${waNum}" target="_blank" rel="noopener" aria-label="واتساب">💬</a>
    ` : ''}
  `;

  // البحث: يحدّث قسم المنتجات فقط، فلا يُفقد التركيز
  $('#searchInput')?.addEventListener('input', (e) => {
    state.search = e.target.value;
    clearTimeout(window._searchTimer);
    window._searchTimer = setTimeout(() => renderProductSections(), 200);
  });

  $('#catBar')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-cat]');
    if (!btn) return;
    state.category = btn.dataset.cat;
    $$('#catBar [data-cat]').forEach(b => b.classList.toggle('active', b.dataset.cat === state.category));
    renderProductSections();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  state.shellReady = true;
}

function renderProductSections() {
  const host = $('#dynamicSections');
  if (!host) return;
  const s = state.settings;
  const term = state.search.trim().toLowerCase();
  const filtered = state.products.filter(p =>
    (state.category === 'all' || p.category === state.category) &&
    (!term ||
      (p.name || '').toLowerCase().includes(term) ||
      (p.description || '').toLowerCase().includes(term))
  );
  const featured = state.products.filter(p => p.featured);
  const isHome = state.category === 'all' && !term;
  const showHero = s.heroEnabled && isHome;
  const waNum = String(s.whatsappNumber || '').replace(/\D/g, '');

  host.innerHTML = `
    ${showHero ? `
      <section class="hero">
        <div class="hero-content">
          <div class="hero-badge">${escapeHtml(s.heroBadge)}</div>
          <h2>${escapeHtml(s.heroTitle)}</h2>
          <p>${escapeHtml(s.tagline)}</p>
          <div class="hero-buttons">
            <button class="btn-primary" data-action="scroll-products">تسوق الآن ←</button>
            ${s.whatsappCheckoutEnabled ? `
              <a class="btn-whatsapp" href="https://wa.me/${waNum}" target="_blank" rel="noopener">💬 تواصل واتساب</a>
            ` : ''}
          </div>
        </div>
      </section>` : ''}

    ${isHome ? `
      <section class="features">
        <div class="features-grid">
          <div class="feature"><div class="feature-icon">🚚</div><div><h4>توصيل سريع</h4><p>لجميع المحافظات</p></div></div>
          <div class="feature"><div class="feature-icon">🛡️</div><div><h4>دفع آمن</h4><p>عند الاستلام</p></div></div>
          <div class="feature"><div class="feature-icon">🔄</div><div><h4>استبدال مجاني</h4><p>خلال 7 أيام</p></div></div>
          <div class="feature"><div class="feature-icon">📞</div><div><h4>دعم 24/7</h4><p>دائماً متاحون</p></div></div>
        </div>
      </section>` : ''}

    ${isHome && featured.length > 0 ? `
      <section class="section">
        <div class="section-header"><h3>🔥 الأكثر رواجاً</h3></div>
        <div class="products-grid">${featured.map((p, i) => renderProductCard(p, i)).join('')}</div>
      </section>` : ''}

    <section class="section" id="products-section">
      <div class="section-header">
        <h3>${term ? `نتائج: ${escapeHtml(state.search)}` : state.category === 'all' ? 'كل المنتجات' : escapeHtml(CATEGORIES.find(c => c.id === state.category)?.name || '')}</h3>
        <span style="font-size:14px;color:var(--text-muted);">${filtered.length} منتج</span>
      </div>
      ${filtered.length === 0 ? `
        <div class="empty-state">
          <div class="empty-icon">📦</div>
          <p>${state.products.length === 0 ? 'جاري تحميل المنتجات...' : 'لا توجد منتجات مطابقة'}</p>
        </div>
      ` : `<div class="products-grid">${filtered.map((p, i) => renderProductCard(p, i)).join('')}</div>`}
    </section>
  `;
}

// أول 4 صور تُحمَّل فوراً، والباقي عند التمرير (lazy)
function renderProductCard(p, index = 0) {
  const discount = p.oldPrice && p.price ? Math.round((1 - p.price / p.oldPrice) * 100) : 0;
  const img = p.thumb || (p.thumbs && p.thumbs[0]) || (p.images && p.images[0]) || p.image || PLACEHOLDER;
  const extra = Math.max(0, (p.images?.length || 0) - 1);
  const stock = productStock(p);
  const eager = index < 4;

  return `
    <div class="product-card">
      <div class="product-image-wrapper" data-product-id="${p.id}" data-action="view-product">
        <img class="product-image" src="${escapeHtml(img)}" alt="${escapeHtml(p.name)}"
             width="400" height="400"
             loading="${eager ? 'eager' : 'lazy'}" decoding="async"
             ${eager ? 'fetchpriority="high"' : ''}
             onerror="this.onerror=null;this.src='${PLACEHOLDER}'" />
        ${discount > 0 ? `<div class="discount-badge">-${discount}%</div>` : ''}
        ${p.featured ? `<div class="featured-badge">🔥 تريند</div>` : ''}
        ${p.video ? `<div class="has-video-badge">▶ فيديو</div>` : (extra > 0 ? `<div class="has-video-badge">📷 +${extra}</div>` : '')}
        ${stock <= 0 ? `<div class="sold-out-overlay">نفد المخزون</div>` : ''}
      </div>
      <div class="product-info">
        <h4 class="product-name" data-product-id="${p.id}" data-action="view-product">${escapeHtml(p.name)}</h4>
        <div class="product-prices">
          <span class="price-current">${formatPrice(p.price)}</span>
          ${p.oldPrice ? `<span class="price-old">${formatPrice(p.oldPrice)}</span>` : ''}
        </div>
        <button class="btn-add-cart" data-product-id="${p.id}" data-action="add-cart" ${stock <= 0 ? 'disabled' : ''}>
          ${stock <= 0 ? 'غير متوفر' : '🛒 أضف للسلة'}
        </button>
      </div>
    </div>`;
}

// مستمع واحد لكل النقرات في المتجر (بدل إعادة الربط في كل رسم)
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el || el.closest('.modal-overlay')) return;
  const a = el.dataset.action;
  const id = el.dataset.productId;
  if (a === 'view-product') {
    const p = state.products.find(x => x.id === id);
    if (p) showProductModal(p);
  } else if (a === 'add-cart') {
    e.stopPropagation();
    const p = state.products.find(x => x.id === id);
    if (p) addToCart(p);
  } else if (a === 'open-cart') {
    renderCart();
  } else if (a === 'admin-login') {
    if (state.user && isAdminUser(state.user)) { state.view = 'admin'; renderAdmin(); }
    else showAdminLoginModal();
  } else if (a === 'scroll-products') {
    $('#products-section')?.scrollIntoView({ behavior: 'smooth' });
  }
});

// ============================================
//  مودال المنتج
// ============================================
function showProductModal(p) {
  const discount = p.oldPrice && p.price ? Math.round((1 - p.price / p.oldPrice) * 100) : 0;
  const stock = productStock(p);

  const media = [];
  const imgs = (p.images && p.images.length) ? p.images : (p.image ? [p.image] : []);
  imgs.forEach(src => media.push({ type: 'image', src }));
  if (p.video) media.push({ type: 'video', src: p.video });
  if (!media.length) media.push({ type: 'image', src: PLACEHOLDER });

  const overlay = mountModal(`
    <div class="modal-overlay">
      <div class="modal product-modal">
        <div class="product-detail">
          <div class="product-gallery">
            <button class="product-detail-close" data-close aria-label="إغلاق">×</button>
            ${discount > 0 ? `<div class="discount-badge" style="position:absolute;top:12px;right:12px;font-size:14px;padding:6px 12px;z-index:3;">خصم ${discount}%</div>` : ''}
            <div class="gallery-main" id="galleryMain">
              ${media.map((m, i) => `
                <div class="gallery-slide" data-slide="${i}">
                  ${m.type === 'image'
                    ? `<img src="${escapeHtml(m.src)}" alt="${escapeHtml(p.name)}" loading="${i === 0 ? 'eager' : 'lazy'}" decoding="async" onerror="this.onerror=null;this.src='${PLACEHOLDER}'" />`
                    : `<video src="${escapeHtml(m.src)}" controls playsinline preload="none" poster="${escapeHtml(imgs[0] || PLACEHOLDER)}"></video>`}
                </div>`).join('')}
            </div>
            ${media.length > 1 ? `
              <div class="gallery-dots">
                ${media.map((_, i) => `<button class="gallery-dot ${i === 0 ? 'active' : ''}" data-dot="${i}" aria-label="صورة ${i + 1}"></button>`).join('')}
              </div>` : ''}
          </div>

          ${media.length > 1 ? `
            <div class="gallery-thumbs">
              ${media.map((m, i) => `
                <div class="gallery-thumb ${i === 0 ? 'active' : ''} ${m.type === 'video' ? 'gallery-thumb-video' : ''}" data-thumb="${i}">
                  ${m.type === 'image'
                    ? `<img src="${escapeHtml(m.src)}" alt="" loading="lazy" decoding="async" />`
                    : `<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:20px;">▶</div>`}
                </div>`).join('')}
            </div>` : ''}

          <div class="product-detail-info">
            <h2>${escapeHtml(p.name)}</h2>
            <div class="product-detail-prices">
              <span class="price-current">${formatPrice(p.price)}</span>
              ${p.oldPrice ? `<span class="price-old">${formatPrice(p.oldPrice)}</span>` : ''}
            </div>
            ${p.description ? `<p class="description">${escapeHtml(p.description)}</p>` : ''}
            <div class="stock-info">
              <p>${stock > 0 ? `✓ متوفر${stock < 900 ? ` • ${stock} قطعة` : ''}` : '✕ نفد المخزون'}</p>
              <p class="small">💵 الدفع عند الاستلام • 🚚 توصيل لجميع المحافظات</p>
            </div>
            <button class="btn-add-cart-large" id="addFromModal" ${stock <= 0 ? 'disabled' : ''}>
              ${stock <= 0 ? 'غير متوفر حالياً' : '🛒 أضف للسلة'}
            </button>
          </div>
        </div>
      </div>
    </div>`);

  $('#addFromModal', overlay)?.addEventListener('click', () => {
    addToCart(p);
    closeModal();
  });

  const galleryMain = $('#galleryMain', overlay);
  if (galleryMain && media.length > 1) {
    const setActive = (index) => {
      $$('.gallery-dot', overlay).forEach((d, i) => d.classList.toggle('active', i === index));
      $$('.gallery-thumb', overlay).forEach((t, i) => t.classList.toggle('active', i === index));
    };
    const goToSlide = (index) => {
      const slide = $(`[data-slide="${index}"]`, galleryMain);
      if (slide) slide.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
      setActive(index);
    };
    overlay.addEventListener('click', (e) => {
      const dot = e.target.closest('[data-dot]');
      const thumb = e.target.closest('[data-thumb]');
      if (dot) goToSlide(parseInt(dot.dataset.dot));
      else if (thumb) goToSlide(parseInt(thumb.dataset.thumb));
    });
    let scrollTimer;
    galleryMain.addEventListener('scroll', () => {
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        const w = galleryMain.clientWidth || 1;
        setActive(Math.round(galleryMain.scrollLeft / w));
      }, 100);
    }, { passive: true });
  }
}

// ============================================
//  السلة
// ============================================
function renderCart() {
  const subtotal = cartSubtotal();
  const ship = shippingFee();
  const total = subtotal + ship;
  const min = Number(state.settings.freeShippingMin) || 0;

  const overlay = mountModal(`
    <div class="modal-overlay" style="align-items:flex-start;justify-content:flex-start;">
      <div class="cart-drawer">
        <div class="modal-header">
          <h3>🛒 سلة التسوق (${cartCount()})</h3>
          <button class="close-btn" data-close aria-label="إغلاق">×</button>
        </div>
        ${state.cart.length === 0 ? `
          <div class="empty-cart">
            <div class="empty-cart-icon">🛍️</div>
            <p style="margin-bottom:16px;">السلة فارغة</p>
            <button class="btn-primary" data-close style="background:var(--text);color:white;">تسوق الآن</button>
          </div>
        ` : `
          <div class="cart-items">
            ${state.cart.map(it => `
              <div class="cart-item">
                <img src="${escapeHtml(cartItemImage(it))}" alt="${escapeHtml(it.name)}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='${PLACEHOLDER}'" />
                <div class="cart-item-info">
                  <h4>${escapeHtml(it.name)}</h4>
                  <div class="price">${formatPrice(it.price)}</div>
                  <div class="qty-controls">
                    <button class="qty-btn" data-cart-qty="${it.id}" data-delta="-1">−</button>
                    <span class="qty-display">${it.qty}</span>
                    <button class="qty-btn" data-cart-qty="${it.id}" data-delta="1">+</button>
                    <button class="btn-remove" data-cart-remove="${it.id}" aria-label="حذف">🗑️</button>
                  </div>
                </div>
              </div>`).join('')}
          </div>
          <div class="cart-footer">
            ${ship > 0 ? `
              <div class="order-summary-row" style="font-size:14px;"><span>المنتجات:</span><span>${formatPrice(subtotal)}</span></div>
              <div class="order-summary-row" style="font-size:14px;"><span>التوصيل:</span><span>${formatPrice(ship)}</span></div>
            ` : ''}
            <div class="cart-total"><span>الإجمالي:</span><span>${formatPrice(total)}</span></div>
            ${min > 0 && subtotal < min && Number(state.settings.shippingCost) > 0 ? `
              <div class="shipping-hint">💡 أضف بقيمة ${formatPrice(min - subtotal)} للحصول على توصيل مجاني</div>` : ''}
            <button class="btn-checkout" id="goCheckout">إتمام الطلب</button>
          </div>
        `}
      </div>
    </div>`);

  overlay.addEventListener('click', (e) => {
    const q = e.target.closest('[data-cart-qty]');
    const r = e.target.closest('[data-cart-remove]');
    if (q) updateCartQty(q.dataset.cartQty, parseInt(q.dataset.delta));
    else if (r) removeFromCart(r.dataset.cartRemove);
  });

  $('#goCheckout', overlay)?.addEventListener('click', () => {
    if (state.cart.length === 0) return;
    const s = state.settings;
    if (s.directCheckoutEnabled && !s.whatsappCheckoutEnabled) showDirectCheckout();
    else if (!s.directCheckoutEnabled && s.whatsappCheckoutEnabled) checkoutWhatsApp();
    else showCheckoutChoice();
  });
}

function showCheckoutChoice() {
  const overlay = mountModal(`
    <div class="modal-overlay">
      <div class="modal" style="max-width:440px;">
        <div class="modal-header">
          <h3>كيف تريد إكمال طلبك؟</h3>
          <button class="close-btn" data-close aria-label="إغلاق">×</button>
        </div>
        <div class="checkout-choice">
          <button class="checkout-option primary" data-choice="direct">
            <div class="checkout-option-icon">🏪</div>
            <div class="checkout-option-text"><h4>الطلب من المتجر</h4><p>املأ معلومات التوصيل وسنتواصل معك</p></div>
            <div>←</div>
          </button>
          <button class="checkout-option whatsapp" data-choice="whatsapp">
            <div class="checkout-option-icon">💬</div>
            <div class="checkout-option-text"><h4>الطلب عبر واتساب</h4><p>تحدث معنا مباشرة لإكمال الطلب</p></div>
            <div>←</div>
          </button>
          <div style="background:#f5f5f4;padding:12px;border-radius:12px;text-align:center;font-size:12px;color:var(--text-muted);">
            💵 الدفع نقداً عند الاستلام في كلتا الحالتين
          </div>
        </div>
      </div>
    </div>`);

  overlay.addEventListener('click', (e) => {
    const b = e.target.closest('[data-choice]');
    if (!b) return;
    const c = b.dataset.choice;
    closeModal();
    if (c === 'direct') showDirectCheckout();
    else checkoutWhatsApp();
  });
}

function showDirectCheckout() {
  const subtotal = cartSubtotal();
  const ship = shippingFee();
  const total = subtotal + ship;

  const overlay = mountModal(`
    <div class="modal-overlay">
      <div class="modal">
        <div class="modal-header">
          <h3>معلومات التوصيل</h3>
          <button class="close-btn" data-close aria-label="إغلاق">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>الاسم الكامل <span class="req">*</span></label>
            <input type="text" id="cName" placeholder="مثال: أحمد محمد" autocomplete="name" />
          </div>
          <div class="form-group">
            <label>رقم الهاتف <span class="req">*</span></label>
            <input type="tel" id="cPhone" placeholder="07xxxxxxxxx" inputmode="numeric" autocomplete="tel" style="direction:ltr;text-align:left;" />
          </div>
          <div class="form-group">
            <label>المحافظة <span class="req">*</span></label>
            <select id="cGov">
              <option value="">اختر المحافظة</option>
              ${IRAQI_GOVERNORATES.map(g => `<option value="${escapeHtml(g)}">${escapeHtml(g)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>العنوان التفصيلي <span class="req">*</span></label>
            <textarea id="cAddr" rows="2" placeholder="المنطقة، الشارع، أقرب نقطة دلالة..."></textarea>
          </div>
          <div class="form-group">
            <label>ملاحظات (اختياري)</label>
            <textarea id="cNotes" rows="2" placeholder="أي ملاحظات إضافية..."></textarea>
          </div>
          <div id="checkoutError"></div>
          <div class="order-summary">
            <div class="order-summary-row"><span>عدد القطع:</span><span><strong>${cartCount()}</strong></span></div>
            <div class="order-summary-row"><span>المنتجات:</span><span><strong>${formatPrice(subtotal)}</strong></span></div>
            <div class="order-summary-row"><span>التوصيل:</span><span><strong>${ship > 0 ? formatPrice(ship) : 'مجاني'}</strong></span></div>
            <div class="order-summary-row"><span>طريقة الدفع:</span><span><strong>عند الاستلام 💵</strong></span></div>
            <div class="order-summary-row order-summary-total"><span>الإجمالي:</span><span class="price">${formatPrice(total)}</span></div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-checkout" id="submitOrderBtn">تأكيد الطلب</button>
        </div>
      </div>
    </div>`);

  $('#submitOrderBtn', overlay).addEventListener('click', async () => {
    const name = $('#cName', overlay).value.trim();
    const phone = $('#cPhone', overlay).value.trim();
    const gov = $('#cGov', overlay).value;
    const addr = $('#cAddr', overlay).value.trim();
    const notes = $('#cNotes', overlay).value.trim();
    const errEl = $('#checkoutError', overlay);

    if (!name || !phone || !gov || !addr) {
      errEl.innerHTML = `<div class="error-msg">⚠️ الرجاء تعبئة جميع الحقول المطلوبة</div>`;
      return;
    }
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 14) {
      errEl.innerHTML = `<div class="error-msg">⚠️ رقم الهاتف غير صحيح</div>`;
      return;
    }
    if (state.cart.length === 0) {
      errEl.innerHTML = `<div class="error-msg">⚠️ السلة فارغة</div>`;
      return;
    }

    const btn = $('#submitOrderBtn', overlay);
    btn.disabled = true;
    btn.textContent = 'جاري الإرسال...';

    // لا نحفظ صور Base64 داخل الطلب (كانت تُضخّم المستند وتخاطر بحد 1 ميجا)
    const items = state.cart.map(i => ({
      id: i.id, name: i.name, price: i.price, qty: i.qty,
      image: isDataUrl(i.image) ? '' : (i.image || '')
    }));

    const order = await createOrder({
      items, subtotal, shipping: ship, total,
      customer: { name, phone, governorate: gov, address: addr, notes }
    });

    if (order) {
      state.cart = [];
      saveCart();
      updateCartBadge();
      showOrderSuccess(order);
    } else {
      errEl.innerHTML = `<div class="error-msg">⚠️ فشل إرسال الطلب، حاول مرة أخرى</div>`;
      btn.disabled = false;
      btn.textContent = 'تأكيد الطلب';
    }
  });
}

function showOrderSuccess(order) {
  const overlay = mountModal(`
    <div class="modal-overlay">
      <div class="modal" style="max-width:440px;">
        <div class="success-screen">
          <div class="success-icon">✅</div>
          <h3 style="font-family:'Cairo',sans-serif;font-size:24px;font-weight:900;margin-bottom:8px;">تم استلام طلبك! 🎉</h3>
          <p style="color:var(--text-muted);">رقم الطلب:</p>
          <div class="order-number">${escapeHtml(order.orderNumber)}</div>
          <p style="font-size:14px;color:var(--text-muted);margin-bottom:24px;">سنتواصل معك قريباً لتأكيد الطلب وتحديد موعد التوصيل</p>
          <div style="display:flex;flex-direction:column;gap:8px;">
            ${state.settings.whatsappCheckoutEnabled ? `
              <button class="btn-whatsapp" id="sendWaCopy" style="width:100%;justify-content:center;">💬 إرسال نسخة عبر واتساب</button>` : ''}
            <button class="btn-cancel" data-close>إغلاق</button>
          </div>
        </div>
      </div>
    </div>`);

  // إصلاح: كانت تُقرأ order.items وهي غير موجودة، فلا يُرسل شيء
  $('#sendWaCopy', overlay)?.addEventListener('click', () => {
    const msg = buildWhatsAppMessage(order.items || [], order.customer, {
      subtotal: order.subtotal, shipping: order.shipping, total: order.total
    });
    openWhatsApp(`رقم الطلب: ${order.orderNumber}\n\n` + msg);
  });
}

// ============================================
//  الأدمن: تسجيل الدخول
// ============================================
function showAdminLoginModal() {
  const overlay = mountModal(`
    <div class="modal-overlay">
      <div class="modal" style="max-width:400px;">
        <div class="modal-header">
          <h3>🔐 دخول الأدمن</h3>
          <button class="close-btn" data-close aria-label="إغلاق">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>البريد الإلكتروني</label>
            <input type="email" id="adminEmail" placeholder="email@example.com" autocomplete="username" style="direction:ltr;text-align:left;" />
          </div>
          <div class="form-group">
            <label>كلمة المرور</label>
            <input type="password" id="adminPass" autocomplete="current-password" style="direction:ltr;text-align:left;" />
          </div>
          <div id="loginError"></div>
        </div>
        <div class="modal-footer">
          <button class="btn-save" id="loginBtn">دخول</button>
        </div>
      </div>
    </div>`);

  const submit = async () => {
    const email = $('#adminEmail', overlay).value.trim();
    const pass = $('#adminPass', overlay).value;
    const errEl = $('#loginError', overlay);
    if (!email || !pass) {
      errEl.innerHTML = `<div class="error-msg">⚠️ أدخل البريد وكلمة المرور</div>`;
      return;
    }
    const btn = $('#loginBtn', overlay);
    btn.disabled = true;
    btn.textContent = 'جاري الدخول...';
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      closeModal();
      showToast('✓ تم الدخول بنجاح');
    } catch (err) {
      console.error(err);
      errEl.innerHTML = `<div class="error-msg">⚠️ بيانات الدخول غير صحيحة</div>`;
      btn.disabled = false;
      btn.textContent = 'دخول';
    }
  };

  $('#loginBtn', overlay).addEventListener('click', submit);
  $('#adminPass', overlay).addEventListener('keypress', (e) => { if (e.key === 'Enter') submit(); });
}

async function logoutAdmin() {
  await signOut(auth);
  showToast('✓ تم تسجيل الخروج');
}

// ============================================
//  لوحة الأدمن
// ============================================
let adminTab = 'dashboard';
let adminProductsSearch = '';
let adminOrdersFilter = 'all';

function renderAdmin() {
  if (state.view !== 'admin') return;
  applyTheme();
  const s = state.settings;
  const pendingCount = state.orders.filter(o => o.status === 'pending').length;

  $('#app').innerHTML = `
    <div class="admin-page">
      <header class="admin-header">
        <div class="admin-header-top">
          <h1>⚙️ لوحة الأدمن - ${escapeHtml(s.storeName)}</h1>
          <div style="display:flex;gap:8px;">
            <button class="btn-exit-admin" id="backToStore">← العودة للمتجر</button>
            <button class="btn-exit-admin" id="logoutBtn" style="background:rgba(220,38,38,0.3);">خروج</button>
          </div>
        </div>
        <div class="admin-tabs">
          <div class="admin-tabs-inner">
            ${[
              {id:'dashboard',label:'الرئيسية',icon:'🏠'},
              {id:'products',label:'المنتجات',icon:'📦'},
              {id:'orders',label:'الطلبات',icon:'🛒',badge:pendingCount},
              {id:'settings',label:'الإعدادات',icon:'⚙️'},
              {id:'theme',label:'التصميم',icon:'🎨'}
            ].map(t => `
              <button class="admin-tab ${adminTab === t.id ? 'active' : ''}" data-admin-tab="${t.id}">
                ${t.icon} ${t.label}
                ${t.badge > 0 ? `<span class="admin-tab-badge">${t.badge}</span>` : ''}
              </button>`).join('')}
          </div>
        </div>
      </header>
      <div class="admin-content" id="adminContent"></div>
    </div>`;

  $('#backToStore').addEventListener('click', () => {
    state.view = 'store';
    state.shellReady = false;
    renderStore(true);
  });
  $('#logoutBtn').addEventListener('click', logoutAdmin);
  $$('[data-admin-tab]').forEach(b => b.addEventListener('click', () => {
    adminTab = b.dataset.adminTab;
    renderAdmin();
  }));

  if (adminTab === 'dashboard') renderAdminDashboard();
  else if (adminTab === 'products') renderAdminProducts();
  else if (adminTab === 'orders') renderAdminOrders();
  else if (adminTab === 'settings') renderAdminSettings();
  else if (adminTab === 'theme') renderAdminTheme();

  hideLoading();
}

function renderAdminDashboard() {
  const pending = state.orders.filter(o => o.status === 'pending').length;
  const revenue = state.orders.filter(o => o.status === 'delivered').reduce((s, o) => s + (o.total || 0), 0);
  const base64Count = state.products.filter(p =>
    isDataUrl(p.image) || (p.images || []).some(isDataUrl) || isDataUrl(p.video)
  ).length;

  $('#adminContent').innerHTML = `
    <div class="stats-grid">
      <button class="stat-card" data-go="products">
        <div class="stat-icon">📦</div><div class="stat-label">المنتجات</div>
        <div class="stat-value">${state.products.length}</div>
      </button>
      <button class="stat-card" data-go="orders">
        <div class="stat-icon" style="color:#ea580c;">🛒</div><div class="stat-label">قيد المعالجة</div>
        <div class="stat-value" style="color:#ea580c;">${pending}</div>
        ${pending > 0 ? `<span class="stat-pulse"></span>` : ''}
      </button>
      <div class="stat-card">
        <div class="stat-icon" style="color:#16a34a;">📋</div><div class="stat-label">إجمالي الطلبات</div>
        <div class="stat-value">${state.orders.length}</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="color:#facc15;">⭐</div><div class="stat-label">الإيرادات</div>
        <div class="stat-value" style="font-size:18px;color:#16a34a;">${formatPrice(revenue)}</div>
      </div>
    </div>

    ${base64Count > 0 ? `
      <div class="settings-card" style="border:1px solid #fca5a5;background:#fef2f2;">
        <h3>⚡ تسريع المتجر</h3>
        <p style="font-size:14px;margin-bottom:12px;">
          يوجد <strong>${base64Count}</strong> منتج صوره مخزّنة داخل قاعدة البيانات (Base64).
          هذا هو السبب الرئيسي لبطء فتح المتجر.
          ${CDN_READY()
            ? 'اضغط الزر لنقلها إلى CDN تلقائياً.'
            : '<strong>فعّل Bunny CDN أولاً</strong> بوضع مفتاح الوصول في ملف app.js.'}
        </p>
        <div id="migrateProgress"></div>
        <button class="btn-save-all" id="migrateBtn" ${CDN_READY() ? '' : 'disabled'}>
          🚀 نقل الصور القديمة إلى CDN
        </button>
      </div>` : ''}

    ${state.orders.length > 0 ? `
      <div class="settings-card">
        <h3 style="display:flex;justify-content:space-between;">
          <span>آخر الطلبات</span>
          <button data-go="orders" style="background:none;border:none;color:var(--primary);font-weight:500;cursor:pointer;font-family:inherit;">عرض الكل ←</button>
        </h3>
        <div style="display:flex;flex-direction:column;gap:8px;">
          ${state.orders.slice(0, 5).map(o => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:12px;background:#f5f5f4;border-radius:12px;">
              <div>
                <div style="font-weight:700;font-size:14px;">${escapeHtml(o.orderNumber || '')} • ${escapeHtml(o.customer?.name || '')}</div>
                <div style="font-size:12px;color:var(--text-muted);margin-top:4px;">${escapeHtml(o.customer?.governorate || '')} • ${o.items?.length || 0} منتج</div>
              </div>
              <div style="text-align:left;">
                <div style="color:var(--primary);font-weight:900;font-size:14px;">${formatPrice(o.total)}</div>
                <span class="status-badge ${STATUS_MAP[o.status]?.cls || 'status-pending'}">${STATUS_MAP[o.status]?.label || ''}</span>
              </div>
            </div>`).join('')}
        </div>
      </div>` : ''}

    <div class="settings-card" style="background:linear-gradient(135deg,#dbeafe,#e0e7ff);border:1px solid #bfdbfe;">
      <h3>💡 نصائح سريعة</h3>
      <ul style="padding:0;list-style:none;font-size:14px;line-height:2;">
        <li>• حالة الـ CDN: ${CDN_READY() ? '<strong style="color:#16a34a;">مفعّل ✓</strong>' : '<strong style="color:#dc2626;">غير مفعّل</strong>'}</li>
        <li>• غيّر رقم واتساب وكلفة التوصيل من "الإعدادات"</li>
        <li>• الصور تُضغط وتُرفع تلقائياً عند الإضافة</li>
        <li>• تُعرض آخر ${ORDERS_PAGE} طلب في اللوحة</li>
      </ul>
    </div>`;

  $$('[data-go]').forEach(b => b.addEventListener('click', () => {
    adminTab = b.dataset.go;
    renderAdmin();
  }));

  $('#migrateBtn')?.addEventListener('click', migrateBase64ToCdn);
}

// نقل الصور القديمة من Base64 إلى CDN
async function migrateBase64ToCdn() {
  if (!CDN_READY()) { showToast('فعّل Bunny CDN أولاً', 'error'); return; }
  if (!confirm('سيتم نقل كل الصور المخزّنة داخل قاعدة البيانات إلى CDN. لا تغلق الصفحة أثناء العملية. المتابعة؟')) return;

  const btn = $('#migrateBtn');
  const prog = $('#migrateProgress');
  btn.disabled = true;

  const targets = state.products.filter(p =>
    isDataUrl(p.image) || (p.images || []).some(isDataUrl) || isDataUrl(p.video)
  );
  let done = 0, failed = 0;

  for (const p of targets) {
    prog.innerHTML = `<div class="video-progress"><p style="font-weight:700;font-size:13px;">⏳ ${done + 1} من ${targets.length}...</p>
      <div class="progress-bar"><div class="progress-bar-fill" style="width:${Math.round((done / targets.length) * 100)}%;"></div></div></div>`;
    try {
      const srcList = (p.images && p.images.length) ? p.images : (p.image ? [p.image] : []);
      const newImages = [], newThumbs = [];
      for (const src of srcList) {
        if (!isDataUrl(src)) { newImages.push(src); newThumbs.push(src); continue; }
        const blob = dataUrlToBlob(src);
        const file = new File([blob], 'img.jpg', { type: blob.type });
        const { full, thumb } = await processProductImage(file);
        newImages.push(full); newThumbs.push(thumb);
      }
      let newVideo = p.video || null;
      if (isDataUrl(newVideo)) {
        const vBlob = dataUrlToBlob(newVideo);
        newVideo = await uploadToBunny(vBlob, `products/${uid()}.mp4`);
      }
      await updateDoc(doc(db, 'products', p.id), {
        images: newImages, thumbs: newThumbs,
        image: newImages[0] || null, thumb: newThumbs[0] || null,
        video: newVideo, updatedAt: serverTimestamp()
      });
      done++;
    } catch (err) {
      console.error('فشل نقل المنتج', p.id, err);
      failed++;
      done++;
    }
  }

  prog.innerHTML = '';
  btn.disabled = false;
  showToast(failed ? `اكتمل النقل مع ${failed} أخطاء` : '✓ تم نقل جميع الصور بنجاح', failed ? 'error' : 'success');
  renderAdmin();
}

function renderAdminProducts() {
  const term = adminProductsSearch.trim().toLowerCase();
  const filtered = state.products.filter(p => (p.name || '').toLowerCase().includes(term));

  $('#adminContent').innerHTML = `
    <div class="admin-toolbar">
      <input type="search" id="searchProducts" placeholder="🔍 ابحث..." value="${escapeHtml(adminProductsSearch)}" autocomplete="off" />
      <button class="btn-add-product" id="addNewProduct">+ منتج جديد</button>
    </div>
    <div id="adminProductsList">${renderAdminProductsList(filtered)}</div>`;

  // البحث يحدّث القائمة فقط (لا يعيد بناء الحقل فيبقى التركيز)
  $('#searchProducts').addEventListener('input', (e) => {
    adminProductsSearch = e.target.value;
    clearTimeout(window._adminSearchTimer);
    window._adminSearchTimer = setTimeout(() => {
      const t = adminProductsSearch.trim().toLowerCase();
      $('#adminProductsList').innerHTML = renderAdminProductsList(
        state.products.filter(p => (p.name || '').toLowerCase().includes(t))
      );
    }, 200);
  });

  $('#addNewProduct').addEventListener('click', () => showProductForm(null));

  $('#adminProductsList').addEventListener('click', async (e) => {
    const edit = e.target.closest('[data-edit-product]');
    const del = e.target.closest('[data-delete-product]');
    if (edit) {
      const p = state.products.find(x => x.id === edit.dataset.editProduct);
      if (p) showProductForm(p);
    } else if (del) {
      if (!confirm('حذف هذا المنتج؟')) return;
      const ok = await deleteProduct(del.dataset.deleteProduct);
      if (ok) showToast('✓ تم الحذف');
    }
  });
}

function renderAdminProductsList(list) {
  if (list.length === 0) {
    return `<div class="empty-state"><div class="empty-icon">📦</div>
      <p>${state.products.length === 0 ? 'ابدأ بإضافة أول منتج' : 'لا توجد نتائج'}</p></div>`;
  }
  return `<div class="products-list">
    ${list.map(p => `
      <div class="product-row">
        <img src="${escapeHtml(p.thumb || (p.thumbs && p.thumbs[0]) || (p.images && p.images[0]) || p.image || PLACEHOLDER)}"
             alt="" loading="lazy" decoding="async" onerror="this.style.opacity=0.3" />
        <div class="product-row-info">
          <h4>${escapeHtml(p.name)}
            ${p.featured ? '<span style="background:#fef9c3;color:#a16207;font-size:10px;padding:2px 6px;border-radius:4px;margin-right:4px;">تريند</span>' : ''}
            ${isDataUrl(p.image) || (p.images || []).some(isDataUrl) ? '<span style="background:#fee2e2;color:#b91c1c;font-size:10px;padding:2px 6px;border-radius:4px;margin-right:4px;">صور ثقيلة</span>' : ''}
          </h4>
          <div class="product-meta">
            <span class="price-tag">${formatPrice(p.price)}</span><span>•</span>
            <span>${escapeHtml(CATEGORIES.find(c => c.id === p.category)?.name || '')}</span><span>•</span>
            <span style="${productStock(p) <= 0 ? 'color:#dc2626;font-weight:700;' : ''}">المخزون: ${p.stock ?? 0}</span>
          </div>
        </div>
        <div class="row-actions">
          <button class="row-action edit" data-edit-product="${p.id}" aria-label="تعديل">✏️</button>
          <button class="row-action delete" data-delete-product="${p.id}" aria-label="حذف">🗑️</button>
        </div>
      </div>`).join('')}
  </div>`;
}

// ============================================
//  نموذج المنتج
// ============================================
function showProductForm(product) {
  const isEdit = !!product;
  const data = product || { name:'', price:'', oldPrice:'', category:'fashion', images:[], thumbs:[], video:'', description:'', stock:10, featured:false };

  let images = [];
  let thumbs = [];
  if (Array.isArray(data.images) && data.images.length) {
    images = [...data.images];
    thumbs = Array.isArray(data.thumbs) && data.thumbs.length === data.images.length ? [...data.thumbs] : [...data.images];
  } else if (data.image) {
    images = [data.image];
    thumbs = [data.thumb || data.image];
  }
  let video = data.video || '';

  const overlay = mountModal(`
    <div class="modal-overlay">
      <div class="modal">
        <div class="modal-header">
          <h3>${isEdit ? 'تعديل منتج' : 'منتج جديد'}</h3>
          <button class="close-btn" data-close aria-label="إغلاق">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>صور المنتج <span class="req">*</span>
              <span style="font-weight:normal;color:var(--text-muted);font-size:12px;">(حتى ${MAX_IMAGES} صور)</span>
            </label>
            <div class="images-container" id="imagesContainer"></div>
            <div class="upload-buttons">
              <input type="file" id="imageInput" accept="image/*" multiple style="display:none;" />
              <input type="file" id="videoInput" accept="video/*" style="display:none;" />
              <button type="button" class="upload-btn-small" id="addImageBtn">📷 إضافة صورة</button>
              <button type="button" class="upload-btn-small" id="addVideoBtn">🎬 إضافة فيديو</button>
            </div>
            <p style="font-size:11px;color:var(--text-muted);margin-top:8px;">
              ${CDN_READY()
                ? '⚡ الصور تُضغط وتُرفع إلى CDN تلقائياً. الفيديو حتى 40 ميجا.'
                : '⚠️ CDN غير مفعّل: الصور تُحفظ داخل قاعدة البيانات (بطيء). الفيديو حتى 600 كيلوبايت فقط.'}
            </p>
            <div id="mediaProgress"></div>
          </div>

          <div class="form-group">
            <label>اسم المنتج <span class="req">*</span></label>
            <input type="text" id="pName" value="${escapeHtml(data.name)}" />
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div class="form-group">
              <label>السعر <span class="req">*</span></label>
              <input type="number" id="pPrice" value="${data.price}" inputmode="numeric" />
            </div>
            <div class="form-group">
              <label>السعر القديم</label>
              <input type="number" id="pOldPrice" value="${data.oldPrice || ''}" placeholder="للخصم" inputmode="numeric" />
            </div>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div class="form-group">
              <label>التصنيف</label>
              <select id="pCategory">
                ${CATEGORIES.filter(c => c.id !== 'all').map(c => `
                  <option value="${c.id}" ${data.category === c.id ? 'selected' : ''}>${c.icon} ${c.name}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>المخزون</label>
              <input type="number" id="pStock" value="${data.stock ?? 0}" inputmode="numeric" />
            </div>
          </div>

          <div class="form-group">
            <label>الوصف</label>
            <textarea id="pDesc" rows="3">${escapeHtml(data.description || '')}</textarea>
          </div>

          <label class="checkbox-card">
            <input type="checkbox" id="pFeatured" ${data.featured ? 'checked' : ''} />
            <span><strong>🔥 منتج مميز</strong> (يظهر في "الأكثر رواجاً")</span>
          </label>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" data-close>إلغاء</button>
          <button class="btn-save" id="saveProductBtn">${isEdit ? 'حفظ' : 'إضافة'}</button>
        </div>
      </div>
    </div>`);

  function renderImages() {
    const c = $('#imagesContainer', overlay);
    let html = images.map((img, i) => `
      <div class="image-slot ${i === 0 ? 'main' : ''}">
        <img src="${escapeHtml(thumbs[i] || img)}" alt="" loading="lazy" />
        <button class="image-slot-remove" data-remove-image="${i}" aria-label="حذف">×</button>
      </div>`).join('');
    if (video) {
      html += `
        <div class="image-slot">
          <div style="display:flex;align-items:center;justify-content:center;height:100%;background:#1c1917;color:#fff;font-size:22px;">▶</div>
          <button class="image-slot-remove" data-remove-video aria-label="حذف">×</button>
          <div class="video-badge">▶ فيديو</div>
        </div>`;
    }
    c.innerHTML = html;
    updateButtons();
  }

  function updateButtons() {
    const addImgBtn = $('#addImageBtn', overlay);
    const addVidBtn = $('#addVideoBtn', overlay);
    if (images.length >= MAX_IMAGES) {
      addImgBtn.disabled = true;
      addImgBtn.textContent = `📷 الحد الأقصى (${MAX_IMAGES})`;
    } else {
      addImgBtn.disabled = false;
      addImgBtn.textContent = `📷 إضافة صورة (${images.length}/${MAX_IMAGES})`;
    }
    addVidBtn.textContent = `🎬 ${video ? 'تغيير الفيديو' : 'إضافة فيديو'}`;
  }

  $('#imagesContainer', overlay).addEventListener('click', (e) => {
    const rm = e.target.closest('[data-remove-image]');
    const rv = e.target.closest('[data-remove-video]');
    if (rm) {
      const i = parseInt(rm.dataset.removeImage);
      images.splice(i, 1);
      thumbs.splice(i, 1);
      renderImages();
    } else if (rv) {
      video = '';
      renderImages();
    }
  });

  renderImages();

  $('#addImageBtn', overlay).addEventListener('click', () => $('#imageInput', overlay).click());
  $('#imageInput', overlay).addEventListener('change', async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;

    const remaining = MAX_IMAGES - images.length;
    const toProcess = files.slice(0, remaining);
    if (files.length > remaining) showToast(`تمت إضافة ${remaining} صورة فقط (الحد ${MAX_IMAGES})`, 'error');

    const btn = $('#addImageBtn', overlay);
    btn.disabled = true;
    let n = 0;
    for (const file of toProcess) {
      n++;
      btn.textContent = `⏳ ${n}/${toProcess.length}...`;
      if (file.size > 25 * 1024 * 1024) { showToast(`تخطّي ${file.name} - حجم كبير`, 'error'); continue; }
      try {
        const { full, thumb } = await processProductImage(file);
        images.push(full);
        thumbs.push(thumb);
        renderImages();
      } catch (err) {
        console.error(err);
        showToast(err.message || 'فشلت معالجة صورة', 'error');
      }
    }
    updateButtons();
  });

  $('#addVideoBtn', overlay).addEventListener('click', () => $('#videoInput', overlay).click());
  $('#videoInput', overlay).addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const progress = $('#mediaProgress', overlay);
    progress.innerHTML = `<div class="video-progress"><p style="font-weight:700;font-size:13px;">⏳ جاري رفع الفيديو...</p>
      <div class="progress-bar"><div class="progress-bar-fill" style="width:60%;"></div></div></div>`;
    try {
      video = await processProductVideo(file);
      progress.innerHTML = '';
      renderImages();
      showToast('✓ تمت إضافة الفيديو');
    } catch (err) {
      progress.innerHTML = '';
      showToast(err.message || 'فشلت معالجة الفيديو', 'error');
    }
  });

  $('#saveProductBtn', overlay).addEventListener('click', async () => {
    const name = $('#pName', overlay).value.trim();
    const price = parseInt($('#pPrice', overlay).value);
    const oldPriceRaw = $('#pOldPrice', overlay).value;
    const oldPrice = oldPriceRaw ? parseInt(oldPriceRaw) : null;
    const category = $('#pCategory', overlay).value;
    const description = $('#pDesc', overlay).value.trim();
    const stock = parseInt($('#pStock', overlay).value) || 0;
    const featured = $('#pFeatured', overlay).checked;

    if (!name || !price || price <= 0 || images.length === 0) {
      showToast('الاسم والسعر وصورة واحدة على الأقل مطلوبة', 'error');
      return;
    }
    if (oldPrice && oldPrice <= price) {
      showToast('السعر القديم يجب أن يكون أكبر من السعر الحالي', 'error');
      return;
    }

    const btn = $('#saveProductBtn', overlay);
    btn.disabled = true;
    btn.textContent = 'جاري الحفظ...';

    const productData = {
      name, price, category, description, stock, featured,
      images, thumbs,
      image: images[0],
      thumb: thumbs[0] || images[0],
      oldPrice: oldPrice || null,
      video: video || null
    };

    const ok = await saveProduct(productData, isEdit ? product.id : null);
    if (ok) {
      showToast(isEdit ? '✓ تم التحديث' : '✓ تمت الإضافة');
      closeModal();
    } else {
      btn.disabled = false;
      btn.textContent = isEdit ? 'حفظ' : 'إضافة';
    }
  });
}

// ============================================
//  الطلبات
// ============================================
function renderAdminOrders() {
  if (state.orders.length === 0) {
    $('#adminContent').innerHTML = `
      <div class="empty-state"><div class="empty-icon">📭</div>
        <p>لا توجد طلبات بعد</p>
        <p class="small">ستظهر الطلبات الواردة من المتجر هنا</p></div>`;
    return;
  }

  const filtered = adminOrdersFilter === 'all' ? state.orders : state.orders.filter(o => o.status === adminOrdersFilter);

  $('#adminContent').innerHTML = `
    <div class="filter-bar">
      ${[
        {id:'all',label:'الكل'},{id:'pending',label:'قيد المعالجة'},{id:'confirmed',label:'مؤكد'},
        {id:'shipped',label:'قيد التوصيل'},{id:'delivered',label:'مُسلَّم'},{id:'cancelled',label:'ملغي'}
      ].map(f => `
        <button class="filter-btn ${adminOrdersFilter === f.id ? 'active' : ''}" data-filter="${f.id}">
          ${f.label} (${f.id === 'all' ? state.orders.length : state.orders.filter(o => o.status === f.id).length})
        </button>`).join('')}
    </div>
    <div class="orders-list">
      ${filtered.map(o => {
        const date = o.createdAt?.toDate ? o.createdAt.toDate().toLocaleString('ar-IQ') : '';
        return `
          <div class="order-card" data-order="${o.id}">
            <div class="order-card-header">
              <div>
                <div class="order-number-row">
                  <h4>${escapeHtml(o.orderNumber || '')}</h4>
                  <span class="status-badge ${STATUS_MAP[o.status]?.cls || 'status-pending'}">${STATUS_MAP[o.status]?.label || ''}</span>
                </div>
                <p class="customer">${escapeHtml(o.customer?.name || '')} • ${escapeHtml(o.customer?.governorate || '')}</p>
                <p class="meta">${o.items?.length || 0} منتج • ${escapeHtml(date)}</p>
              </div>
              <div class="order-total">
                <div class="amount">${formatPrice(o.total)}</div>
                <div class="phone">${escapeHtml(o.customer?.phone || '')}</div>
              </div>
            </div>
          </div>`;
      }).join('')}
    </div>`;

  $$('[data-filter]').forEach(b => b.addEventListener('click', () => {
    adminOrdersFilter = b.dataset.filter;
    renderAdminOrders();
  }));

  $('.orders-list').addEventListener('click', (e) => {
    const card = e.target.closest('[data-order]');
    if (!card) return;
    const o = state.orders.find(x => x.id === card.dataset.order);
    if (o) showOrderDetail(o);
  });
}

function showOrderDetail(order) {
  const waPhone = (order.customer?.phone || '').replace(/\D/g, '').replace(/^0/, '964');
  const ship = Number(order.shipping) || 0;

  const overlay = mountModal(`
    <div class="modal-overlay">
      <div class="modal">
        <div class="modal-header">
          <h3>طلب #${escapeHtml(order.orderNumber || '')}</h3>
          <button class="close-btn" data-close aria-label="إغلاق">×</button>
        </div>
        <div class="modal-body">
          <div class="order-detail-section">
            <div class="order-detail-label">معلومات الزبون</div>
            <div class="name">${escapeHtml(order.customer?.name || '')}</div>
            <a href="tel:${escapeHtml(order.customer?.phone || '')}" class="order-contact-link">📞 ${escapeHtml(order.customer?.phone || '')}</a>
            <p style="font-size:14px;margin-top:4px;">📍 ${escapeHtml(order.customer?.governorate || '')} - ${escapeHtml(order.customer?.address || '')}</p>
            ${order.customer?.notes ? `<p style="font-size:12px;background:#fef9c3;padding:8px;border-radius:8px;margin-top:8px;">📝 ${escapeHtml(order.customer.notes)}</p>` : ''}
            <a href="https://wa.me/${waPhone}" target="_blank" rel="noopener" class="order-contact-wa">💬 تواصل عبر واتساب</a>
          </div>

          <div>
            <div class="order-detail-label">المنتجات</div>
            ${(order.items || []).map(i => `
              <div class="order-item">
                <img src="${escapeHtml(i.image || PLACEHOLDER)}" alt="" loading="lazy" onerror="this.style.opacity=0.3" />
                <div class="order-item-info">
                  <h5>${escapeHtml(i.name)}</h5>
                  <p>الكمية: ${i.qty} × ${formatPrice(i.price)}</p>
                </div>
                <div class="item-total">${formatPrice(i.price * i.qty)}</div>
              </div>`).join('')}
            ${ship > 0 ? `<div class="order-summary-row" style="margin-top:8px;"><span>التوصيل:</span><span>${formatPrice(ship)}</span></div>` : ''}
            <div class="order-summary-row order-summary-total" style="margin-top:12px;padding-top:12px;border-top:2px solid var(--border);">
              <span>الإجمالي:</span>
              <span class="price" style="color:var(--primary);font-size:18px;font-weight:900;">${formatPrice(order.total)}</span>
            </div>
          </div>

          <div style="margin-top:16px;">
            <div class="order-detail-label">حالة الطلب</div>
            <div class="order-status-grid">
              ${Object.entries(STATUS_MAP).map(([k, v]) => `
                <button class="status-btn ${order.status === k ? 'active' : ''}" data-status="${k}">${v.label}</button>`).join('')}
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-delete-order" id="deleteOrderBtn">🗑️ حذف الطلب</button>
        </div>
      </div>
    </div>`);

  overlay.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-status]');
    if (!b) return;
    const ok = await updateOrderStatus(order.id, b.dataset.status);
    if (ok) { showToast('✓ تم التحديث'); closeModal(); }
  });

  $('#deleteOrderBtn', overlay).addEventListener('click', async () => {
    if (!confirm('حذف هذا الطلب؟')) return;
    const ok = await deleteOrder(order.id);
    if (ok) { showToast('✓ تم الحذف'); closeModal(); }
  });
}

// ============================================
//  الإعدادات
// ============================================
function renderAdminSettings() {
  const s = { ...state.settings };

  $('#adminContent').innerHTML = `
    <div class="settings-card">
      <h3>🏪 معلومات المتجر</h3>
      <div class="form-group"><label>اسم المتجر</label>
        <input type="text" id="setStoreName" value="${escapeHtml(s.storeName)}" /></div>
      <div class="form-group"><label>الوصف / الشعار</label>
        <input type="text" id="setTagline" value="${escapeHtml(s.tagline)}" /></div>
      <div class="form-group"><label>المدينة / العنوان</label>
        <input type="text" id="setCity" value="${escapeHtml(s.city)}" /></div>
      <div class="form-group"><label>رمز العملة</label>
        <input type="text" id="setCurrency" value="${escapeHtml(s.currency)}" /></div>
    </div>

    <div class="settings-card">
      <h3>🚚 التوصيل</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div class="form-group">
          <label>كلفة التوصيل</label>
          <input type="number" id="setShippingCost" value="${s.shippingCost || 0}" inputmode="numeric" />
          <p style="font-size:11px;color:var(--text-muted);margin-top:4px;">اتركها 0 إذا التوصيل مجاني دائماً</p>
        </div>
        <div class="form-group">
          <label>حد التوصيل المجاني</label>
          <input type="number" id="setFreeShipping" value="${s.freeShippingMin || 0}" inputmode="numeric" />
          <p style="font-size:11px;color:var(--text-muted);margin-top:4px;">فوق هذا المبلغ يصير التوصيل مجاني</p>
        </div>
      </div>
    </div>

    <div class="settings-card">
      <h3>💬 الواتساب وأزرار الطلب</h3>
      <div class="form-group">
        <label>رقم الواتساب (مع كود الدولة، بدون +)</label>
        <input type="text" id="setWaNumber" value="${escapeHtml(s.whatsappNumber)}" placeholder="9647700000000" inputmode="numeric" style="direction:ltr;text-align:left;" />
        <p style="font-size:12px;color:var(--text-muted);margin-top:4px;">📱 للعراق ابدأ بـ 964 ثم الرقم بدون الصفر الأول</p>
      </div>
      <div class="form-group">
        <label>الرقم المعروض للزبائن</label>
        <input type="text" id="setPhoneDisplay" value="${escapeHtml(s.phoneDisplay)}" placeholder="07700000000" style="direction:ltr;text-align:left;" />
      </div>

      <div class="settings-divider"></div>

      <p style="font-weight:700;margin-bottom:8px;">الزر العائم (واتساب)</p>
      <div class="toggle-row">
        <div class="toggle-row-info"><p>إظهار الزر العائم</p></div>
        <button class="toggle ${s.floatingWhatsappEnabled ? 'on' : ''}" data-toggle="floatingWhatsappEnabled"></button>
      </div>
      <div id="floatingPosition" style="display:${s.floatingWhatsappEnabled ? 'block' : 'none'};margin-top:8px;">
        <div class="toggle-row" style="flex-direction:column;align-items:stretch;">
          <p style="margin-bottom:8px;font-size:14px;">موقع الزر</p>
          <div class="position-toggle">
            <button class="position-btn ${s.floatingWhatsappPosition === 'left' ? 'active' : ''}" data-pos="left">يسار ←</button>
            <button class="position-btn ${s.floatingWhatsappPosition === 'right' ? 'active' : ''}" data-pos="right">→ يمين</button>
          </div>
        </div>
      </div>

      <div class="settings-divider"></div>

      <p style="font-weight:700;margin-bottom:8px;">طرق الطلب المتاحة</p>
      <div class="toggle-row">
        <div class="toggle-row-info"><p>الطلب من المتجر مباشرة</p><p class="desc">نموذج بمعلومات الزبون والمحافظة</p></div>
        <button class="toggle ${s.directCheckoutEnabled ? 'on' : ''}" data-toggle="directCheckoutEnabled"></button>
      </div>
      <div class="toggle-row">
        <div class="toggle-row-info"><p>الطلب عبر واتساب</p><p class="desc">إرسال الطلب لرقم الواتساب</p></div>
        <button class="toggle ${s.whatsappCheckoutEnabled ? 'on' : ''}" data-toggle="whatsappCheckoutEnabled"></button>
      </div>
    </div>

    <button class="btn-save-all" id="saveAllSettings">💾 حفظ جميع الإعدادات</button>`;

  $$('[data-toggle]').forEach(b => b.addEventListener('click', () => {
    const key = b.dataset.toggle;
    s[key] = !s[key];
    b.classList.toggle('on', s[key]);
    if (key === 'floatingWhatsappEnabled') $('#floatingPosition').style.display = s[key] ? 'block' : 'none';
  }));

  $$('[data-pos]').forEach(b => b.addEventListener('click', () => {
    s.floatingWhatsappPosition = b.dataset.pos;
    $$('[data-pos]').forEach(x => x.classList.toggle('active', x === b));
  }));

  $('#saveAllSettings').addEventListener('click', async () => {
    // تحذير: تعطيل الطريقتين معاً يمنع الزبون من الطلب نهائياً
    if (!s.directCheckoutEnabled && !s.whatsappCheckoutEnabled) {
      showToast('يجب تفعيل طريقة طلب واحدة على الأقل', 'error');
      return;
    }
    s.storeName = $('#setStoreName').value.trim() || DEFAULT_SETTINGS.storeName;
    s.tagline = $('#setTagline').value.trim();
    s.city = $('#setCity').value.trim();
    s.currency = $('#setCurrency').value.trim() || 'د.ع';
    s.shippingCost = parseInt($('#setShippingCost').value) || 0;
    s.freeShippingMin = parseInt($('#setFreeShipping').value) || 0;
    s.whatsappNumber = $('#setWaNumber').value.replace(/\D/g, '');
    s.phoneDisplay = $('#setPhoneDisplay').value.trim();

    const btn = $('#saveAllSettings');
    btn.disabled = true;
    btn.textContent = 'جاري الحفظ...';
    const ok = await saveSettings(s);
    btn.disabled = false;
    btn.textContent = '💾 حفظ جميع الإعدادات';
    if (ok) showToast('✓ تم حفظ الإعدادات');
  });
}

// ============================================
//  التصميم
// ============================================
function renderAdminTheme() {
  const s = { ...state.settings };
  const cur = THEMES[s.themeColor] || THEMES.red;

  $('#adminContent').innerHTML = `
    <div class="settings-card">
      <h3>🎨 لون المتجر الأساسي</h3>
      <div class="color-grid">
        ${Object.entries(THEMES).map(([k, t]) => `
          <button class="color-swatch ${s.themeColor === k ? 'active' : ''}" data-theme="${k}" style="background:${t.primary};" aria-label="${t.name}"></button>`).join('')}
      </div>
      <p style="margin-top:12px;font-size:14px;color:var(--text-muted);">الحالي: <strong style="color:${cur.primary};" id="curThemeName">${cur.name}</strong></p>
    </div>

    <div class="settings-card">
      <h3>🖼️ خلفية المتجر</h3>
      <div class="bg-grid">
        ${Object.entries(BACKGROUNDS).map(([k, b]) => `
          <button class="bg-swatch ${s.backgroundStyle === k ? 'active' : ''}" data-bg="${k}" style="background:${b.color};color:${k === 'dark' ? '#fff' : '#1c1917'};">${b.name}</button>`).join('')}
      </div>
    </div>

    <div class="settings-card">
      <h3>⭐ القسم العلوي (Hero)</h3>
      <div class="toggle-row">
        <div class="toggle-row-info"><p>إظهار قسم Hero</p></div>
        <button class="toggle ${s.heroEnabled ? 'on' : ''}" data-toggle-theme="heroEnabled"></button>
      </div>
      <div id="heroFields" style="display:${s.heroEnabled ? 'block' : 'none'};margin-top:12px;">
        <div class="form-group"><label>شارة (Badge) أعلى العنوان</label>
          <input type="text" id="setHeroBadge" value="${escapeHtml(s.heroBadge)}" /></div>
        <div class="form-group"><label>العنوان الرئيسي</label>
          <input type="text" id="setHeroTitle" value="${escapeHtml(s.heroTitle)}" /></div>
      </div>
    </div>

    <div class="settings-card">
      <h3>🔔 شريط الإعلان العلوي</h3>
      <div class="toggle-row">
        <div class="toggle-row-info"><p>إظهار شريط الإعلان</p></div>
        <button class="toggle ${s.announcementEnabled ? 'on' : ''}" data-toggle-theme="announcementEnabled"></button>
      </div>
      <div id="announceFields" style="display:${s.announcementEnabled ? 'block' : 'none'};margin-top:12px;">
        <div class="form-group"><label>نص الإعلان</label>
          <textarea id="setAnnounceText" rows="2">${escapeHtml(s.announcementText)}</textarea></div>
      </div>
    </div>

    <div class="preview-card" id="previewCard" style="background:linear-gradient(135deg,${cur.primary},${cur.dark});">
      <p style="font-size:12px;opacity:0.8;">معاينة الألوان:</p>
      <h4>${escapeHtml(s.storeName)}</h4>
      <p style="font-size:14px;opacity:0.9;">${escapeHtml(s.tagline)}</p>
      <button>تسوق الآن</button>
    </div>

    <button class="btn-save-all" id="saveTheme">💾 حفظ التصميم</button>`;

  $$('[data-theme]').forEach(b => b.addEventListener('click', () => {
    s.themeColor = b.dataset.theme;
    $$('[data-theme]').forEach(x => x.classList.toggle('active', x === b));
    const t = THEMES[s.themeColor];
    $('#curThemeName').textContent = t.name;
    $('#curThemeName').style.color = t.primary;
    $('#previewCard').style.background = `linear-gradient(135deg, ${t.primary}, ${t.dark})`;
  }));

  $$('[data-bg]').forEach(b => b.addEventListener('click', () => {
    s.backgroundStyle = b.dataset.bg;
    $$('[data-bg]').forEach(x => x.classList.toggle('active', x === b));
  }));

  $$('[data-toggle-theme]').forEach(b => b.addEventListener('click', () => {
    const key = b.dataset.toggleTheme;
    s[key] = !s[key];
    b.classList.toggle('on', s[key]);
    if (key === 'heroEnabled') $('#heroFields').style.display = s[key] ? 'block' : 'none';
    if (key === 'announcementEnabled') $('#announceFields').style.display = s[key] ? 'block' : 'none';
  }));

  $('#saveTheme').addEventListener('click', async () => {
    if ($('#setHeroBadge')) s.heroBadge = $('#setHeroBadge').value;
    if ($('#setHeroTitle')) s.heroTitle = $('#setHeroTitle').value;
    if ($('#setAnnounceText')) s.announcementText = $('#setAnnounceText').value;

    const btn = $('#saveTheme');
    btn.disabled = true;
    btn.textContent = 'جاري الحفظ...';
    const ok = await saveSettings(s);
    btn.disabled = false;
    btn.textContent = '💾 حفظ التصميم';
    if (ok) { showToast('✓ تم حفظ التصميم'); applyTheme(); }
  });
}

// ============================================
//  التهيئة
// ============================================
async function init() {
  // 1) الإعدادات المخزّنة محلياً تُطبَّق فوراً (ألوان صحيحة من أول لحظة)
  loadCachedSettings();
  applyTheme();
  loadCart();

  // 2) الاشتراك بالمنتجات فوراً - الكاش المحلي يعرضها بدون انتظار الشبكة
  subscribeProducts();

  // 3) مراقبة تسجيل الدخول (اشتراك واحد فقط بالمنتجات، بلا تكرار)
  onAuthStateChanged(auth, (user) => {
    state.user = user;
    if (user && isAdminUser(user)) {
      subscribeOrders();
      state.view = 'admin';
      state.shellReady = false;
      renderAdmin();
    } else {
      if (user && !isAdminUser(user)) {
        showToast('هذا الحساب لا يملك صلاحية الإدارة', 'error');
        signOut(auth);
      }
      unsubscribeOrders();
      state.view = 'store';
      state.shellReady = false;
      renderStore(true);
    }
  });

  // 4) العرض الأولي دون انتظار الشبكة
  renderStore(true);

  // 5) تحديث الإعدادات من السيرفر في الخلفية
  loadSettings().then(() => {
    if (state.view === 'store') renderStore(true);
  });
}

init().catch(err => {
  console.error('فشل التهيئة:', err);
  const ls = $('#loadingScreen');
  if (ls) {
    ls.innerHTML = `
      <div style="text-align:center;padding:24px;">
        <div style="font-size:48px;margin-bottom:16px;">⚠️</div>
        <h3 style="color:var(--primary);margin-bottom:8px;">خطأ في الاتصال</h3>
        <p style="color:var(--text-muted);margin-bottom:16px;">تأكد من اتصالك بالإنترنت ثم أعد تحميل الصفحة</p>
        <button onclick="location.reload()" style="background:var(--primary);color:#fff;border:none;padding:12px 24px;border-radius:12px;font-family:inherit;font-size:15px;">إعادة المحاولة</button>
      </div>`;
  }
});
