import { db, auth } from './firebase-config.js';
import {
  collection, doc, getDocs, getDoc, setDoc, addDoc, updateDoc, deleteDoc,
  query, orderBy, onSnapshot, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  signInWithEmailAndPassword, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// ===== الثوابت =====
const IRAQI_GOVERNORATES = ['بغداد','البصرة','نينوى / الموصل','أربيل','النجف','كربلاء','بابل / الحلة','ديالى / بعقوبة','ذي قار / الناصرية','صلاح الدين / تكريت','الأنبار / الرمادي','كركوك','دهوك','السليمانية','ميسان / العمارة','المثنى / السماوة','القادسية / الديوانية','واسط / الكوت','حلبجة'];

const DEFAULT_SETTINGS = {
  storeName:'ترند العراق', tagline:'وجهتك الأولى للموضة والتقنية في العراق', city:'بغداد، العراق',
  whatsappNumber:'9647700000000', phoneDisplay:'07700000000',
  currency:'د.ع', freeShippingMin:50000, themeColor:'red', backgroundStyle:'cream',
  storeTheme:'modern',
  // أجور التوصيل
  shippingEnabled: true,
  shippingFee: 5000,
  freeShippingEnabled: true,
  shippingByGovernorate: false,
  governorateShipping: {},
  floatingWhatsappEnabled:true, floatingWhatsappPosition:'left',
  whatsappCheckoutEnabled:true, directCheckoutEnabled:true,
  heroEnabled:true, heroBadge:'🔥 التريند الآن في العراق', heroTitle:'اكتشف أحدث صيحات الموضة',
  announcementEnabled:true, announcementText:'🚚 توصيل لجميع المحافظات • 💵 الدفع عند الاستلام • 🔥 خصومات تصل إلى 30%',
  // إعدادات جديدة - ميزات احترافية
  soundOnNewOrder: true,           // صوت عند طلب جديد للأدمن
  reviewsEnabled: true,            // تفعيل تقييمات الزبائن
  loyaltyEnabled: false,           // برنامج النقاط
  loyaltyPointsPer1000: 10,       // عدد النقاط لكل 1000 د.ع
  loyaltyPointsValue: 10,         // قيمة كل 100 نقطة بالدينار
  showProductCounter: true,        // إظهار "تم بيع X" / "باقي Y"
  countdownEnabled: false,         // عرض محدود بوقت
  countdownEndDate: '',           // تاريخ انتهاء العرض
  countdownText: '🔥 عرض ينتهي قريباً',
  faqEnabled: true,                // صفحة الأسئلة الشائعة
  banners: [],                     // سلايدر البانرات [{image, title, link}]
  testimonials: [],                // شهادات الزبائن
  faqs: [                          // الأسئلة الشائعة الافتراضية
    {q:'كم يستغرق التوصيل؟', a:'التوصيل خلال 24-72 ساعة لجميع المحافظات العراقية'},
    {q:'ما طرق الدفع المتاحة؟', a:'الدفع نقداً عند الاستلام في جميع المحافظات'},
    {q:'هل يمكنني إرجاع المنتج؟', a:'نعم، يمكنك الإرجاع أو الاستبدال خلال 7 أيام من الاستلام بشرط الحفاظ على المنتج'},
    {q:'كيف أتتبع طلبي؟', a:'استخدم رقم طلبك في صفحة "تتبع الطلب" أو تواصل معنا عبر الواتساب'}
  ],
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
  cream:{name:'كريمي',color:'#fafaf9'},
  white:{name:'أبيض',color:'#ffffff'},
  gray:{name:'رمادي',color:'#f3f4f6'},
  warm:{name:'دافئ',color:'#fff7ed'},
  cool:{name:'بارد',color:'#f8fafc'},
  dark:{name:'داكن',color:'#1c1917'},
};

// ===== ثيمات المتجر الاحترافية =====
const STORE_THEMES = {
  modern: {
    name: 'عصري (افتراضي)',
    icon: '✨',
    description: 'تصميم عصري نظيف بزوايا ناعمة',
  },
  luxury: {
    name: 'فاخر',
    icon: '👑',
    description: 'تصميم راقي بألوان ذهبية وخطوط أنيقة',
  },
  minimal: {
    name: 'بسيط',
    icon: '⚪',
    description: 'تصميم بسيط نظيف يركز على المنتجات',
  },
  vibrant: {
    name: 'حيوي',
    icon: '🌈',
    description: 'تصميم جريء بألوان متدرجة ومتحركة',
  },
  classic: {
    name: 'كلاسيكي',
    icon: '🏛️',
    description: 'تصميم تقليدي رسمي مناسب للمتاجر الكبرى',
  },
};

const DEFAULT_CATEGORIES = [
  {id:'fashion',name:'الموضة',icon:'👕',subcategories:[
    {id:'fashion_men',name:'رجالي',icon:'👔'},
    {id:'fashion_women',name:'نسائي',icon:'👗'},
    {id:'fashion_shoes',name:'أحذية',icon:'👟'},
    {id:'fashion_bags',name:'حقائب',icon:'👜'}
  ]},
  {id:'electronics',name:'إلكترونيات',icon:'📱',subcategories:[
    {id:'elec_phones',name:'هواتف',icon:'📱'},
    {id:'elec_accessories',name:'إكسسوارات',icon:'🔌'},
    {id:'elec_audio',name:'سماعات',icon:'🎧'},
    {id:'elec_chargers',name:'شواحن',icon:'🔋'}
  ]},
  {id:'beauty',name:'العناية والجمال',icon:'💄',subcategories:[]},
  {id:'home',name:'المنزل',icon:'🏠',subcategories:[]},
  {id:'kids',name:'الأطفال',icon:'🧸',subcategories:[]},
  {id:'sports',name:'الرياضة',icon:'⚽',subcategories:[]}
];

// قائمة "الكل" تُضاف تلقائياً في كل عرض، ولا تُخزّن
const ALL_CATEGORY = {id:'all',name:'الكل',icon:'🛍️'};

// للوصول السريع (سيتم تعبئته من state.categories)
function getAllCategories() {
  return [ALL_CATEGORY, ...(state.categories || DEFAULT_CATEGORIES)];
}

const STATUS_MAP = {
  pending:{label:'قيد المعالجة',cls:'status-pending'},
  confirmed:{label:'مؤكد',cls:'status-confirmed'},
  shipped:{label:'قيد التوصيل',cls:'status-shipped'},
  delivered:{label:'تم التسليم',cls:'status-delivered'},
  cancelled:{label:'ملغي',cls:'status-cancelled'},
};

// ===== الحالة العامة =====
const state = {
  settings: { ...DEFAULT_SETTINGS },
  products: [],
  orders: [],
  categories: [...DEFAULT_CATEGORIES],
  coupons: [],                    // الكوبونات
  reviews: [],                    // التقييمات
  appliedCoupon: null,            // الكوبون المطبّق حالياً
  cart: [],
  wishlist: [],                   // المفضلة (تُحفظ في localStorage)
  category: 'all',
  subcategory: 'all',
  search: '',
  view: 'store',
  user: null,
  unsubscribers: [],
  darkMode: false,                // الوضع الليلي للزبائن
  productViews: {},               // إحصائيات المشاهدات
  productSales: {},               // إحصائيات المبيعات
};

// ===== localStorage helpers (للبيانات المحلية فقط على جهاز الزبون) =====
function loadLocal(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch { return fallback; }
}
function saveLocal(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

// تحميل البيانات المحلية
function loadLocalData() {
  state.wishlist = loadLocal('trendiraq_wishlist', []);
  state.darkMode = loadLocal('trendiraq_darkmode', false);
}

// ===== أدوات مساعدة =====
const $ = (sel) => document.querySelector(sel);
const escapeHtml = (str) => String(str || '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const formatPrice = (p, c) => new Intl.NumberFormat('en-US').format(p || 0) + ' ' + (c || state.settings.currency);

function showToast(msg, type = 'success') {
  const old = $('.toast');
  if (old) old.remove();
  const t = document.createElement('div');
  t.className = 'toast' + (type === 'error' ? ' error' : '');
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2800);
}

// ضغط الصور تلقائياً
function processImage(file, maxSize = 600, quality = 0.82) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) return reject(new Error('ملف غير صالح'));
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = maxSize; c.height = maxSize;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, maxSize, maxSize);
        const s = Math.max(maxSize / img.width, maxSize / img.height);
        const w = img.width * s, h = img.height * s;
        ctx.drawImage(img, (maxSize - w) / 2, (maxSize - h) / 2, w, h);
        resolve(c.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => reject(new Error('فشل تحميل الصورة'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('فشل قراءة الملف'));
    reader.readAsDataURL(file);
  });
}

// ===== Firebase: تحميل البيانات =====
async function loadSettings() {
  try {
    const snap = await getDoc(doc(db, 'settings', 'main'));
    if (snap.exists()) {
      state.settings = { ...DEFAULT_SETTINGS, ...snap.data() };
    } else {
      state.settings = { ...DEFAULT_SETTINGS };
    }
  } catch (err) {
    console.error('فشل تحميل الإعدادات:', err);
    state.settings = { ...DEFAULT_SETTINGS };
  }
}

async function loadCategories() {
  try {
    const snap = await getDoc(doc(db, 'settings', 'categories'));
    if (snap.exists() && snap.data().list && snap.data().list.length > 0) {
      state.categories = snap.data().list;
    } else {
      state.categories = [...DEFAULT_CATEGORIES];
    }
  } catch (err) {
    console.error('فشل تحميل الأقسام:', err);
    state.categories = [...DEFAULT_CATEGORIES];
  }
}

// ===== التقييمات =====
async function submitReview(productId, reviewData) {
  try {
    const review = {
      productId,
      ...reviewData,
      createdAt: serverTimestamp(),
      _localCreatedAt: Date.now(),
      approved: false  // تحتاج موافقة الأدمن قبل الظهور
    };
    await addDoc(collection(db, 'reviews'), review);
    return true;
  } catch (err) {
    console.error('فشل إرسال التقييم:', err);
    return false;
  }
}

async function loadReviews() {
  try {
    const snap = await getDocs(collection(db, 'reviews'));
    state.reviews = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    state.reviews = [];
  }
}

function getProductReviews(productId, onlyApproved = true) {
  return state.reviews.filter(r => 
    r.productId === productId && (!onlyApproved || r.approved)
  );
}

function getProductRating(productId) {
  const reviews = getProductReviews(productId, true);
  if (reviews.length === 0) return { avg: 0, count: 0 };
  const sum = reviews.reduce((s, r) => s + (r.rating || 0), 0);
  return {
    avg: sum / reviews.length,
    count: reviews.length
  };
}

async function approveReview(reviewId, approved = true) {
  try {
    await updateDoc(doc(db, 'reviews', reviewId), { approved });
    const r = state.reviews.find(x => x.id === reviewId);
    if (r) r.approved = approved;
    return true;
  } catch (err) {
    return false;
  }
}

async function deleteReview(reviewId) {
  try {
    await deleteDoc(doc(db, 'reviews', reviewId));
    state.reviews = state.reviews.filter(r => r.id !== reviewId);
    return true;
  } catch (err) {
    return false;
  }
}

// رسم النجوم
function renderStars(rating, size = 'md', interactive = false) {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    const filled = rating >= i;
    const half = !filled && rating >= i - 0.5;
    stars.push(`<span class="star ${filled ? 'filled' : half ? 'half' : ''} ${interactive ? 'interactive' : ''}" ${interactive ? `data-star="${i}"` : ''}>★</span>`);
  }
  return `<span class="stars stars-${size}">${stars.join('')}</span>`;
}

// ===== الكوبونات =====
async function loadCoupons() {
  try {
    const snap = await getDoc(doc(db, 'settings', 'coupons'));
    if (snap.exists() && snap.data().list) {
      state.coupons = snap.data().list;
    } else {
      state.coupons = [];
    }
  } catch (err) {
    state.coupons = [];
  }
}

async function saveCoupons(list) {
  try {
    await setDoc(doc(db, 'settings', 'coupons'), { list });
    state.coupons = list;
    return true;
  } catch (err) {
    showToast('فشل حفظ الكوبونات', 'error');
    return false;
  }
}

// التحقق من صلاحية الكوبون
function validateCoupon(code) {
  if (!code) return null;
  const coupon = state.coupons.find(c => 
    c.code.toUpperCase() === code.toUpperCase() && c.active !== false
  );
  if (!coupon) return null;
  // التحقق من تاريخ الانتهاء
  if (coupon.expires) {
    const expDate = new Date(coupon.expires);
    if (expDate < new Date()) return null;
  }
  // الحد الأدنى للطلب
  if (coupon.minOrder && cartTotal() < coupon.minOrder) return null;
  return coupon;
}

// حساب خصم الكوبون
function getCouponDiscount() {
  if (!state.appliedCoupon) return 0;
  const c = state.appliedCoupon;
  const subtotal = cartTotal() - cartBogoDiscount();
  if (c.type === 'percent') return Math.floor(subtotal * (c.value / 100));
  if (c.type === 'fixed') return Math.min(c.value, subtotal);
  return 0;
}

// ===== المفضلة (Wishlist) =====
function toggleWishlist(productId) {
  if (state.wishlist.includes(productId)) {
    state.wishlist = state.wishlist.filter(id => id !== productId);
    showToast('تمت الإزالة من المفضلة');
  } else {
    state.wishlist.push(productId);
    showToast('❤️ تمت الإضافة للمفضلة');
    const product = state.products.find(p => p.id === productId);
    if (product) trackAddToWishlist(product);
  }
  saveLocal('trendiraq_wishlist', state.wishlist);
}

function isInWishlist(productId) {
  return state.wishlist.includes(productId);
}

// ===== الإحصائيات =====
function calculateProductSales() {
  const sales = {};
  state.orders.forEach(order => {
    if (order.status === 'cancelled') return;
    (order.items || []).forEach(item => {
      sales[item.id] = (sales[item.id] || 0) + (item.qty || 1);
    });
  });
  return sales;
}

function getProductSalesCount(productId) {
  return state.productSales[productId] || 0;
}

// ===== برنامج النقاط =====
function calculateLoyaltyPoints(orderTotal) {
  if (!state.settings.loyaltyEnabled) return 0;
  const per1000 = state.settings.loyaltyPointsPer1000 || 10;
  return Math.floor(orderTotal / 1000) * per1000;
}

// ===== إشعار الأدمن (صوت) =====
let adminSoundLastCount = 0;
function playNewOrderSound() {
  try {
    const audio = new Audio('data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tAwAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAAcAAAAUAABKDgADBgkLDhEUFhkcHyEkJyovMTQ3OjxBQ0ZJTE5RVFdaXF9hZGdqbXBxdHd5fH+ChIeKjI+SlZecn6Gjpqmsr7G0tre6vL/CxcjLztDT1tfa3eHk5+rs7vH09/r9');
    audio.volume = 0.5;
    audio.play().catch(() => {}); // تجاهل لو ممنوع
  } catch {}
  // اهتزاز الجوال إن أمكن
  if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
}

async function saveCategories(list) {
  try {
    await setDoc(doc(db, 'settings', 'categories'), { list });
    state.categories = list;
    return true;
  } catch (err) {
    console.error(err);
    showToast('فشل حفظ الأقسام', 'error');
    return false;
  }
}

function subscribeProducts() {
  // ترتيب محلي بدل orderBy لتجنّب مشكلة serverTimestamp المتأخر
  const unsub = onSnapshot(collection(db, 'products'), (snap) => {
    const products = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    // ترتيب محلي: المنتجات بدون createdAt (الجديدة) تظهر أولاً، ثم الباقي بالأحدث
    products.sort((a, b) => {
      const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a._localCreatedAt || Date.now());
      const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b._localCreatedAt || Date.now());
      return bTime - aTime;
    });
    state.products = products;
    if (state.view === 'store') render();
    else if (state.view === 'admin') renderAdmin();
  }, (err) => {
    console.error('خطأ في تحميل المنتجات:', err);
  });
  state.unsubscribers.push(unsub);
}

function subscribeOrders() {
  if (!state.user) return;
  const unsub = onSnapshot(collection(db, 'orders'), (snap) => {
    const orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    orders.sort((a, b) => {
      const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a._localCreatedAt || Date.now());
      const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b._localCreatedAt || Date.now());
      return bTime - aTime;
    });
    
    // تشغيل صوت عند طلب جديد
    const newPendingCount = orders.filter(o => o.status === 'pending').length;
    if (state.orders.length > 0 && orders.length > state.orders.length && state.settings.soundOnNewOrder) {
      playNewOrderSound();
      showToast('🔔 طلب جديد!');
    }
    
    state.orders = orders;
    state.productSales = calculateProductSales();
    if (state.view === 'admin') renderAdmin();
  }, (err) => {
    console.error('خطأ في تحميل الطلبات:', err);
  });
  state.unsubscribers.push(unsub);
}

function subscribeReviews() {
  const unsub = onSnapshot(collection(db, 'reviews'), (snap) => {
    const newReviews = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    
    // إشعار صوتي عند تقييم جديد للأدمن
    if (state.user && state.reviews.length > 0 && newReviews.length > state.reviews.length && state.settings.soundOnNewOrder) {
      const newOnes = newReviews.filter(n => !state.reviews.find(r => r.id === n.id));
      if (newOnes.some(r => !r.approved)) {
        playNewOrderSound();
        showToast('⭐ تقييم جديد!');
      }
    }
    
    state.reviews = newReviews;
    if (state.view === 'admin') renderAdmin();
    else if (state.view === 'store') {
      // تحديث النجوم على البطاقات إذا كانت مرئية
      const productsSection = $('#products-section');
      if (productsSection) render();
    }
  });
  state.unsubscribers.push(unsub);
}

function unsubscribeAll() {
  state.unsubscribers.forEach(fn => fn && fn());
  state.unsubscribers = [];
}

// ===== Firebase: عمليات الكتابة =====
async function saveSettings(data) {
  try {
    await setDoc(doc(db, 'settings', 'main'), data, { merge: true });
    state.settings = { ...DEFAULT_SETTINGS, ...data };
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
        ...data, 
        createdAt: serverTimestamp(),
        _localCreatedAt: Date.now()  // قيمة فورية تستخدم حتى يصل serverTimestamp
      });
    }
    return true;
  } catch (err) {
    console.error(err);
    showToast('فشل الحفظ', 'error');
    return false;
  }
}

async function deleteProduct(id) {
  try {
    await deleteDoc(doc(db, 'products', id));
    return true;
  } catch (err) {
    console.error(err);
    showToast('فشل الحذف', 'error');
    return false;
  }
}

async function createOrder(orderData) {
  try {
    const orderNumber = `T${Date.now().toString().slice(-6)}`;
    const ref = await addDoc(collection(db, 'orders'), {
      ...orderData,
      orderNumber,
      status: 'pending',
      createdAt: serverTimestamp(),
      _localCreatedAt: Date.now()
    });
    return { id: ref.id, orderNumber };
  } catch (err) {
    console.error(err);
    return null;
  }
}

async function updateOrderStatus(id, status) {
  try {
    await updateDoc(doc(db, 'orders', id), { status, updatedAt: serverTimestamp() });
    return true;
  } catch (err) {
    console.error(err);
    return false;
  }
}

async function deleteOrder(id) {
  try {
    await deleteDoc(doc(db, 'orders', id));
    return true;
  } catch (err) {
    console.error(err);
    return false;
  }
}

// ===== السلة =====
// ===== Facebook Pixel Tracking =====
function fbTrack(event, params = {}) {
  try {
    if (typeof fbq !== 'undefined') {
      fbq('track', event, params);
      console.log('📊 FB Pixel:', event, params);
    }
  } catch (err) {
    console.warn('Pixel error:', err);
  }
}

function trackViewContent(product) {
  fbTrack('ViewContent', {
    content_ids: [product.id],
    content_name: product.name,
    content_type: 'product',
    value: product.price,
    currency: 'IQD'
  });
}

function trackAddToCart(product, qty = 1) {
  fbTrack('AddToCart', {
    content_ids: [product.id],
    content_name: product.name,
    content_type: 'product',
    value: product.price * qty,
    currency: 'IQD',
    contents: [{ id: product.id, quantity: qty, item_price: product.price }]
  });
}

function trackInitiateCheckout() {
  const total = cartTotal() - cartBogoDiscount() - getCouponDiscount();
  fbTrack('InitiateCheckout', {
    content_ids: state.cart.map(i => i.id),
    contents: state.cart.map(i => ({ id: i.id, quantity: i.qty, item_price: i.price })),
    num_items: state.cart.reduce((s, i) => s + i.qty, 0),
    value: total,
    currency: 'IQD'
  });
}

function trackPurchase(order) {
  fbTrack('Purchase', {
    content_ids: (order.items || []).map(i => i.id),
    contents: (order.items || []).map(i => ({ id: i.id, quantity: i.qty, item_price: i.price })),
    num_items: (order.items || []).reduce((s, i) => s + i.qty, 0),
    value: order.total || 0,
    currency: 'IQD'
  });
}

function trackSearch(query) {
  if (!query || query.length < 2) return;
  fbTrack('Search', {
    search_string: query
  });
}

function trackAddToWishlist(product) {
  fbTrack('AddToWishlist', {
    content_ids: [product.id],
    content_name: product.name,
    value: product.price,
    currency: 'IQD'
  });
}

function addToCart(product, selectedOptions = {}) {
  const mainImage = (product.images && product.images[0]) || product.image || '';
  // معرّف فريد للمنتج+الخيارات (نفس المنتج بخيارين مختلفين = منتجين منفصلين في السلة)
  const optionsKey = Object.keys(selectedOptions).length > 0 
    ? '|' + Object.entries(selectedOptions).map(([k,v]) => `${k}:${v}`).join('|')
    : '';
  const cartItemId = product.id + optionsKey;
  
  const existing = state.cart.find(i => i.cartItemId === cartItemId);
  if (existing) {
    existing.qty++;
  } else {
    state.cart.push({ 
      id: product.id,
      cartItemId: cartItemId,
      name: product.name, 
      price: product.price, 
      image: mainImage, 
      qty: 1,
      bogo: !!product.bogo,
      selectedOptions: selectedOptions
    });
  }
  showToast('✓ تمت الإضافة إلى السلة');
  updateCartBadge();
  trackAddToCart(product);
}

// اطلب الآن: شراء سريع لمنتج واحد فقط (يتجاوز السلة)
function buyNow(product, selectedOptions = {}) {
  // حفظ السلة الحالية لاسترجاعها لاحقاً
  state._savedCart = [...state.cart];
  
  // وضع المنتج فقط في السلة
  const mainImage = (product.images && product.images[0]) || product.image || '';
  const optionsKey = Object.keys(selectedOptions).length > 0 
    ? '|' + Object.entries(selectedOptions).map(([k,v]) => `${k}:${v}`).join('|')
    : '';
  const cartItemId = product.id + optionsKey;
  
  state.cart = [{ 
    id: product.id,
    cartItemId: cartItemId,
    name: product.name, 
    price: product.price, 
    image: mainImage, 
    qty: 1,
    bogo: !!product.bogo,
    selectedOptions: selectedOptions
  }];
  
  // فتح خيارات الدفع مباشرة
  const s = state.settings;
  if (s.directCheckoutEnabled && !s.whatsappCheckoutEnabled) {
    showDirectCheckout(true);
  } else if (!s.directCheckoutEnabled && s.whatsappCheckoutEnabled) {
    checkoutWhatsApp();
    restoreCart();
  } else {
    showCheckoutChoice(true);
  }
  trackInitiateCheckout();
}

// استرجاع السلة بعد إلغاء الطلب السريع
function restoreCart() {
  if (state._savedCart) {
    state.cart = state._savedCart;
    delete state._savedCart;
    updateCartBadge();
  }
}

function updateCartQty(id, delta) {
  const item = state.cart.find(i => i.cartItemId === id || i.id === id);
  if (!item) return;
  item.qty = Math.max(1, item.qty + delta);
  renderCart();
  updateCartBadge();
}

function removeFromCart(id) {
  state.cart = state.cart.filter(i => i.cartItemId !== id && i.id !== id);
  renderCart();
  updateCartBadge();
}

function cartTotal() {
  return state.cart.reduce((s, i) => s + i.price * i.qty, 0);
}

// حساب خصم 1+1=3 (لكل 3 قطع، واحدة مجانية)
// السعر موحد، فالأمر بسيط: لكل 3 قطع، خصم سعر قطعة واحدة
function cartBogoDiscount() {
  let totalDiscount = 0;
  state.cart.forEach(item => {
    if (item.bogo && item.qty >= 3) {
      // كم مجموعة من 3؟
      const freeCount = Math.floor(item.qty / 3);
      // الخصم = عدد المجموعات × سعر القطعة
      totalDiscount += freeCount * item.price;
    }
  });
  return totalDiscount;
}

// المجموع بعد خصم 1+1=3 (قبل الشحن)
function cartTotalAfterBogo() {
  return cartTotal() - cartBogoDiscount();
}

// كم قطعة مجانية في السلة؟
function getBogoFreeItemsCount() {
  let total = 0;
  state.cart.forEach(item => {
    if (item.bogo && item.qty >= 3) {
      total += Math.floor(item.qty / 3);
    }
  });
  return total;
}

// حساب أجور التوصيل
function getShippingFee(governorate = '') {
  const s = state.settings;
  if (!s.shippingEnabled) return 0;
  const subtotal = cartTotalAfterBogo(); // المبلغ بعد خصم 1+1=3
  // التوصيل المجاني فوق مبلغ معين
  if (s.freeShippingEnabled && s.freeShippingMin > 0 && subtotal >= s.freeShippingMin) {
    return 0;
  }
  // التوصيل حسب المحافظة
  if (s.shippingByGovernorate && governorate && s.governorateShipping?.[governorate] !== undefined) {
    return s.governorateShipping[governorate];
  }
  // التوصيل الموحّد
  return s.shippingFee || 0;
}

// المجموع النهائي = المنتجات (بعد خصم 1+1=3) + الشحن
function grandTotal(governorate = '') {
  return cartTotalAfterBogo() + getShippingFee(governorate);
}

function cartCount() {
  return state.cart.reduce((s, i) => s + i.qty, 0);
}

function updateCartBadge() {
  const badge = $('#cartBadge');
  if (badge) {
    const c = cartCount();
    badge.textContent = c;
    badge.style.display = c > 0 ? 'flex' : 'none';
  }
}

// ===== واتساب =====
function checkoutWhatsApp(customerInfo = null) {
  if (state.cart.length === 0) return;
  const s = state.settings;
  const subtotal = cartTotal();
  const bogoDiscount = cartBogoDiscount();
  const couponDiscount = getCouponDiscount();
  const afterDiscounts = subtotal - bogoDiscount - couponDiscount;
  const shipping = customerInfo ? getShippingFee(customerInfo.governorate) : (s.shippingEnabled ? s.shippingFee : 0);
  const total = Math.max(0, afterDiscounts + shipping);
  const freeItems = getBogoFreeItemsCount();
  
  let msg = `🛍️ *طلب جديد من ${s.storeName}*\n\n`;
  state.cart.forEach((it, i) => {
    msg += `${i+1}. ${it.name}${it.bogo ? ' 🎁' : ''}\n`;
    if (it.selectedOptions && Object.keys(it.selectedOptions).length > 0) {
      const optsStr = Object.entries(it.selectedOptions).map(([k, v]) => `${k}: ${v}`).join(' • ');
      msg += `   📋 ${optsStr}\n`;
    }
    msg += `   ${it.qty} × ${formatPrice(it.price)} = ${formatPrice(it.price * it.qty)}\n\n`;
  });
  msg += `\n💰 *المجموع: ${formatPrice(subtotal)}*\n`;
  if (bogoDiscount > 0) {
    msg += `🎁 *عرض 1+1=3: -${formatPrice(bogoDiscount)} (${freeItems} قطعة مجاناً!)*\n`;
  }
  if (couponDiscount > 0 && state.appliedCoupon) {
    msg += `🏷️ *كوبون ${state.appliedCoupon.code}: -${formatPrice(couponDiscount)}*\n`;
  }
  if (shipping > 0) {
    msg += `🚚 *أجور التوصيل: ${formatPrice(shipping)}*\n`;
  } else if (s.shippingEnabled) {
    msg += `🚚 *التوصيل: مجاني* 🎉\n`;
  }
  msg += `💵 *الإجمالي: ${formatPrice(total)}*\n\n`;
  
  if (customerInfo) {
    msg += `📋 *بيانات الزبون:*\nالاسم: ${customerInfo.name}\nالهاتف: ${customerInfo.phone}\nالمحافظة: ${customerInfo.governorate}\nالعنوان: ${customerInfo.address}\n`;
    if (customerInfo.notes) msg += `ملاحظات: ${customerInfo.notes}\n`;
  } else {
    msg += `📍 الرجاء إرسال الاسم والعنوان والمحافظة ورقم الهاتف`;
  }
  window.open(`https://wa.me/${s.whatsappNumber}?text=${encodeURIComponent(msg)}`, '_blank');
}

// تطبيق الثيم
function applyTheme() {
  const t = THEMES[state.settings.themeColor] || THEMES.red;
  const bg = BACKGROUNDS[state.settings.backgroundStyle] || BACKGROUNDS.cream;
  const root = document.documentElement;
  root.style.setProperty('--primary', t.primary);
  root.style.setProperty('--primary-dark', t.dark);
  root.style.setProperty('--primary-light', t.light);
  root.style.setProperty('--bg', bg.color);
  document.body.classList.toggle('dark-mode', state.settings.backgroundStyle === 'dark');
  
  // تطبيق نمط المتجر (الثيم)
  const storeTheme = state.settings.storeTheme || 'modern';
  // إزالة كل ثيمات سابقة
  Object.keys(STORE_THEMES).forEach(key => {
    document.body.classList.remove('theme-' + key);
  });
  // تطبيق الثيم الحالي
  document.body.classList.add('theme-' + storeTheme);
  
  const themeColorMeta = document.querySelector('meta[name="theme-color"]');
  if (themeColorMeta) themeColorMeta.setAttribute('content', t.primary);
}

// ===== العرض: المتجر =====
function render() {
  applyTheme();
  const s = state.settings;
  const filtered = state.products.filter(p => 
    (state.category === 'all' || p.category === state.category) &&
    (state.subcategory === 'all' || p.subcategory === state.subcategory) &&
    (!state.search || (p.name || '').toLowerCase().includes(state.search.toLowerCase()))
  );
  const featured = state.products.filter(p => p.featured);
  const showHero = s.heroEnabled && state.category === 'all' && !state.search;
  const showFeatured = state.category === 'all' && !state.search && featured.length > 0;
  
  // العثور على القسم الحالي وأقسامه الفرعية
  const currentCat = state.categories.find(c => c.id === state.category);
  const subcategories = currentCat?.subcategories || [];
  const showSubcategories = state.category !== 'all' && subcategories.length > 0;
  
  $('#app').innerHTML = `
    ${s.announcementEnabled ? `<div class="announcement-bar">${escapeHtml(s.announcementText)}</div>` : ''}
    <header class="header">
      <div class="header-content">
        <div class="logo">
          <div class="logo-icon"><img src="assets/logo.webp" alt="ترند العراق" class="logo-icon-img" /></div>
          <div>
            <h1>${escapeHtml(s.storeName)}</h1>
            <p>TREND IRAQ</p>
          </div>
        </div>
        <div class="header-actions">
          <button class="icon-btn" data-action="toggle-dark" title="${state.darkMode ? 'الوضع النهاري' : 'الوضع الليلي'}">${state.darkMode ? '☀️' : '🌙'}</button>
          <button class="icon-btn wishlist-header-btn" data-action="open-wishlist" title="المفضلة">
            🤍${state.wishlist.length > 0 ? `<span class="cart-badge">${state.wishlist.length}</span>` : ''}
          </button>
          <button class="icon-btn" data-action="admin-login" title="لوحة التحكم">⚙️</button>
          <button class="icon-btn" data-action="open-cart">
            🛒
            <span class="cart-badge" id="cartBadge" style="display:none;">0</span>
          </button>
        </div>
      </div>
      <div class="search-bar">
        <input type="text" id="searchInput" placeholder="ابحث عن منتج..." value="${escapeHtml(state.search)}" />
      </div>
      <div class="categories-bar">
        <div class="categories">
          ${getAllCategories().map(c => `
            <button class="cat-btn ${state.category === c.id ? 'active' : ''}" data-cat="${c.id}">
              ${c.icon} ${escapeHtml(c.name)}
              ${c.subcategories && c.subcategories.length > 0 ? '<span class="has-subs">▾</span>' : ''}
            </button>
          `).join('')}
        </div>
      </div>
      ${showSubcategories ? `
        <div class="subcategories-bar">
          <div class="subcategories">
            <button class="subcat-btn ${state.subcategory === 'all' ? 'active' : ''}" data-subcat="all">
              📋 الكل في ${escapeHtml(currentCat.name)}
            </button>
            ${subcategories.map(sc => `
              <button class="subcat-btn ${state.subcategory === sc.id ? 'active' : ''}" data-subcat="${sc.id}">
                ${sc.icon} ${escapeHtml(sc.name)}
              </button>
            `).join('')}
          </div>
        </div>
      ` : ''}
    </header>
    
    ${showHero ? `
      <section class="hero">
        <div class="hero-content">
          <div class="hero-badge">${escapeHtml(s.heroBadge)}</div>
          <h2>${escapeHtml(s.heroTitle)}</h2>
          <p>${escapeHtml(s.tagline)}</p>
          <div class="hero-buttons">
            <button class="btn-primary" data-action="scroll-products">تسوق الآن ←</button>
            ${s.whatsappCheckoutEnabled ? `
              <a class="btn-whatsapp" href="https://wa.me/${s.whatsappNumber}" target="_blank" rel="noopener">
                💬 تواصل واتساب
              </a>
            ` : ''}
          </div>
        </div>
      </section>
    ` : ''}
    
    ${state.category === 'all' && !state.search ? `
      <section class="features">
        <div class="features-grid">
          <div class="feature">
            <div class="feature-icon">🚚</div>
            <div><h4>توصيل سريع</h4><p>لجميع المحافظات</p></div>
          </div>
          <div class="feature">
            <div class="feature-icon">🛡️</div>
            <div><h4>دفع آمن</h4><p>عند الاستلام</p></div>
          </div>
          <div class="feature">
            <div class="feature-icon">🔄</div>
            <div><h4>استبدال مجاني</h4><p>خلال 7 أيام</p></div>
          </div>
          <div class="feature">
            <div class="feature-icon">📞</div>
            <div><h4>دعم 24/7</h4><p>دائماً متاحون</p></div>
          </div>
        </div>
      </section>
    ` : ''}
    
    ${showFeatured ? `
      <section class="section">
        <div class="section-header">
          <h3>🔥 الأكثر رواجاً</h3>
        </div>
        <div class="products-grid">
          ${featured.map(renderProductCard).join('')}
        </div>
      </section>
    ` : ''}
    
    <section class="section" id="products-section">
      <div class="section-header">
        <h3>${state.search ? `نتائج: ${escapeHtml(state.search)}` : state.category === 'all' ? 'كل المنتجات' : escapeHtml(getAllCategories().find(c => c.id === state.category)?.name || '')}</h3>
        <span style="font-size:14px;color:var(--text-muted);">${filtered.length} منتج</span>
      </div>
      ${filtered.length === 0 ? `
        <div class="empty-state">
          <div class="empty-icon">📦</div>
          <p>لا توجد منتجات</p>
        </div>
      ` : `
        <div class="products-grid">
          ${filtered.map(renderProductCard).join('')}
        </div>
      `}
    </section>
    
    <footer class="footer">
      <div class="footer-content">
        <div class="footer-section">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
            <div class="logo-icon"><img src="assets/logo.webp" alt="ترند العراق" class="logo-icon-img" /></div>
            <h4 style="font-family:'Cairo',sans-serif;font-size:24px;font-weight:900;">${escapeHtml(s.storeName)}</h4>
          </div>
          <p>${escapeHtml(s.tagline)}</p>
        </div>
        <div class="footer-section">
          <h5>تواصل معنا</h5>
          <a href="https://wa.me/${s.whatsappNumber}" target="_blank">💬 واتساب: ${escapeHtml(s.phoneDisplay)}</a>
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
      <a class="float-whatsapp ${s.floatingWhatsappPosition}" href="https://wa.me/${s.whatsappNumber}" target="_blank" rel="noopener">
        💬
      </a>
    ` : ''}
  `;
  
  updateCartBadge();
  attachStoreEvents();
}

function renderProductCard(p) {
  const discount = p.oldPrice ? Math.round((1 - p.price / p.oldPrice) * 100) : 0;
  const placeholderImg = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23e7e5e4" width="100" height="100"/><text x="50" y="55" text-anchor="middle" fill="%23a8a29e" font-size="10">صورة</text></svg>';
  const mainImage = (p.images && p.images.length > 0) ? p.images[0] : (p.image || placeholderImg);
  const hasVideo = !!p.video;
  const extraImagesCount = (p.images?.length || 0) - 1;
  const inWishlist = isInWishlist(p.id);
  const sales = getProductSalesCount(p.id);
  // منتج جديد (آخر 7 أيام)
  const isNew = p.createdAt?.toMillis ? (Date.now() - p.createdAt.toMillis() < 7 * 24 * 60 * 60 * 1000) : false;
  // مخزون منخفض
  const lowStock = p.stock && p.stock <= 5 && p.stock > 0;
  
  return `
    <div class="product-card">
      <button class="wishlist-btn ${inWishlist ? 'active' : ''}" data-wishlist="${p.id}" title="إضافة للمفضلة">
        ${inWishlist ? '❤️' : '🤍'}
      </button>
      <div class="product-image-wrapper" data-product-id="${p.id}" data-action="view-product">
        <img class="product-image" src="${escapeHtml(mainImage)}" alt="${escapeHtml(p.name)}" onerror="this.src='${placeholderImg}'" />
        ${discount > 0 ? `<div class="discount-badge">-${discount}%</div>` : ''}
        <div class="product-badges-top">
          ${p.featured ? `<div class="featured-badge">🔥 تريند</div>` : ''}
          ${isNew ? `<div class="new-badge">🆕 جديد</div>` : ''}
        </div>
        ${p.bogo ? `<div class="bogo-badge">🎁 1+1=3</div>` : ''}
        ${hasVideo ? `<div class="has-video-badge">▶ فيديو</div>` : (extraImagesCount > 0 ? `<div class="has-video-badge">📷 +${extraImagesCount}</div>` : '')}
      </div>
      <div class="product-info">
        <h4 class="product-name" data-product-id="${p.id}" data-action="view-product">${escapeHtml(p.name)}</h4>
        ${state.settings.reviewsEnabled && (() => {
          const rating = getProductRating(p.id);
          if (rating.count === 0) return '';
          return `<div class="card-rating">${renderStars(rating.avg, 'sm')}<span class="rating-count">(${rating.count})</span></div>`;
        })()}
        ${state.settings.showProductCounter && (sales > 0 || lowStock) ? `
          <div class="product-stats">
            ${sales > 0 ? `<span class="stat-sold">🛒 تم بيع ${sales}+</span>` : ''}
            ${lowStock ? `<span class="stat-low-stock">⚠️ باقي ${p.stock} فقط</span>` : ''}
          </div>
        ` : ''}
        <div class="product-prices">
          <span class="price-current">${formatPrice(p.price)}</span>
          ${p.oldPrice ? `<span class="price-old">${formatPrice(p.oldPrice)}</span>` : ''}
        </div>
        <div class="product-buttons">
          <button class="btn-buy-now" data-product-id="${p.id}" data-action="buy-now" title="اطلب الآن">⚡ اطلب</button>
          <button class="btn-add-cart" data-product-id="${p.id}" data-action="add-cart" title="أضف للسلة">🛒</button>
          <button class="btn-share" data-share-product="${p.id}" title="مشاركة">🔗</button>
        </div>
      </div>
    </div>
  `;
}

function attachStoreEvents() {
  $('#searchInput')?.addEventListener('input', (e) => {
    state.search = e.target.value;
    clearTimeout(window._searchTimer);
    window._searchTimer = setTimeout(() => {
      render();
      if (state.search.length >= 3) trackSearch(state.search);
    }, 250);
  });
  
  document.querySelectorAll('[data-cat]').forEach(b => {
    b.addEventListener('click', () => {
      state.category = b.dataset.cat;
      state.subcategory = 'all'; // إعادة تعيين القسم الفرعي عند تغيير الرئيسي
      render();
    });
  });
  
  document.querySelectorAll('[data-subcat]').forEach(b => {
    b.addEventListener('click', () => {
      state.subcategory = b.dataset.subcat;
      render();
    });
  });
  
  document.querySelectorAll('[data-action]').forEach(el => {
    el.addEventListener('click', (e) => {
      const a = el.dataset.action;
      const id = el.dataset.productId;
      if (a === 'view-product') {
        const p = state.products.find(x => x.id === id);
        if (p) showProductModal(p);
      } else if (a === 'add-cart') {
        e.stopPropagation();
        const p = state.products.find(x => x.id === id);
        if (p) {
          // إذا كان فيه خيارات، افتح تفاصيل المنتج ليختار
          if (p.optionGroups && p.optionGroups.length > 0) {
            showProductModal(p);
          } else {
            addToCart(p);
          }
        }
      } else if (a === 'buy-now') {
        e.stopPropagation();
        const p = state.products.find(x => x.id === id);
        if (p) {
          if (p.optionGroups && p.optionGroups.length > 0) {
            showProductModal(p);
          } else {
            buyNow(p);
          }
        }
      } else if (a === 'open-cart') {
        renderCart();
      } else if (a === 'admin-login') {
        showAdminLoginModal();
      } else if (a === 'scroll-products') {
        $('#products-section')?.scrollIntoView({ behavior: 'smooth' });
      } else if (a === 'open-wishlist') {
        renderWishlistModal();
      } else if (a === 'toggle-dark') {
        state.darkMode = !state.darkMode;
        document.body.classList.toggle('user-dark-mode', state.darkMode);
        saveLocal('trendiraq_darkmode', state.darkMode);
        // تحديث الأيقونة
        el.innerHTML = state.darkMode ? '☀️' : '🌙';
      } else if (a === 'open-track-order') {
        renderTrackOrderModal();
      } else if (a === 'open-faq') {
        renderFaqModal();
      }
    });
  });
  
  // معالج: زر المفضلة
  document.querySelectorAll('[data-wishlist]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.wishlist;
      toggleWishlist(id);
      btn.classList.toggle('active');
      btn.innerHTML = isInWishlist(id) ? '❤️' : '🤍';
    });
  });
  
  // معالج: زر المشاركة
  document.querySelectorAll('[data-share-product]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.dataset.shareProduct;
      const p = state.products.find(x => x.id === id);
      if (!p) return;
      const url = window.location.origin + window.location.pathname + '?product=' + id;
      const text = `${p.name} - ${formatPrice(p.price)}\n${state.settings.storeName}`;
      if (navigator.share) {
        try {
          await navigator.share({ title: p.name, text, url });
        } catch {}
      } else {
        try {
          await navigator.clipboard.writeText(url);
          showToast('✓ تم نسخ الرابط');
        } catch {
          window.open(`https://wa.me/?text=${encodeURIComponent(text + '\n' + url)}`);
        }
      }
    });
  });
}

// ===== المفضلة Modal =====
function renderWishlistModal() {
  closeModal();
  const wishlistProducts = state.products.filter(p => state.wishlist.includes(p.id));
  
  const html = `
    <div class="modal-overlay" data-overlay>
      <div class="modal" style="max-width:600px;">
        <div class="modal-header">
          <h3>❤️ المفضلة (${wishlistProducts.length})</h3>
          <button class="close-btn" data-close>×</button>
        </div>
        <div class="modal-body">
          ${wishlistProducts.length === 0 ? `
            <div class="empty-state">
              <div class="empty-icon">🤍</div>
              <h4>لا توجد منتجات في المفضلة</h4>
              <p>اضغط على القلب 🤍 على أي منتج لإضافته هنا</p>
            </div>
          ` : `
            <div class="wishlist-grid">
              ${wishlistProducts.map(p => `
                <div class="wishlist-item">
                  <img src="${escapeHtml((p.images?.[0]) || p.image || '')}" alt="${escapeHtml(p.name)}" data-product-id="${p.id}" data-action="view-product" />
                  <div class="wishlist-item-info">
                    <h5 data-product-id="${p.id}" data-action="view-product">${escapeHtml(p.name)}</h5>
                    <div class="price-current">${formatPrice(p.price)}</div>
                    <div class="wishlist-item-actions">
                      <button class="btn-add-cart-large" data-product-id="${p.id}" data-action="add-cart" style="flex:1;padding:8px;font-size:13px;">🛒 أضف للسلة</button>
                      <button class="btn-remove" data-wishlist="${p.id}" title="إزالة">🗑️</button>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', html);
  
  document.querySelectorAll('[data-close], [data-overlay]').forEach(el => {
    el.addEventListener('click', (e) => { if (e.target === el) closeModal(); });
  });
  
  // إعادة ربط الأحداث
  document.querySelectorAll('.modal [data-action]').forEach(el => {
    el.addEventListener('click', (e) => {
      const a = el.dataset.action;
      const id = el.dataset.productId;
      const p = state.products.find(x => x.id === id);
      if (!p) return;
      if (a === 'view-product') {
        showProductModal(p);
      } else if (a === 'add-cart') {
        if (p.optionGroups && p.optionGroups.length > 0) {
          showProductModal(p);
        } else {
          addToCart(p);
        }
      }
    });
  });
  
  document.querySelectorAll('.modal [data-wishlist]').forEach(btn => {
    btn.addEventListener('click', () => {
      toggleWishlist(btn.dataset.wishlist);
      renderWishlistModal();
    });
  });
}

// ===== تتبع الطلب Modal =====
function renderTrackOrderModal() {
  closeModal();
  const html = `
    <div class="modal-overlay" data-overlay>
      <div class="modal" style="max-width:480px;">
        <div class="modal-header">
          <h3>📍 تتبع طلبك</h3>
          <button class="close-btn" data-close>×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>رقم الطلب</label>
            <input type="text" id="trackOrderNum" placeholder="مثال: T123456" />
            <p style="font-size:12px;color:var(--text-muted);margin-top:4px;">رقم الطلب يبدأ بحرف T وأرقام</p>
          </div>
          <button class="btn-checkout" id="trackBtn">🔍 تتبع الطلب</button>
          <div id="trackResult" style="margin-top:16px;"></div>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', html);
  
  document.querySelectorAll('[data-close], [data-overlay]').forEach(el => {
    el.addEventListener('click', (e) => { if (e.target === el) closeModal(); });
  });
  
  $('#trackBtn').addEventListener('click', () => {
    const num = $('#trackOrderNum').value.trim().toUpperCase();
    if (!num) {
      $('#trackResult').innerHTML = '<div class="error-msg">⚠️ الرجاء إدخال رقم الطلب</div>';
      return;
    }
    const order = state.orders.find(o => (o.orderNumber || '').toUpperCase() === num);
    if (!order) {
      $('#trackResult').innerHTML = `
        <div class="error-msg">
          ❌ لم يتم العثور على الطلب
          <p style="font-size:12px;margin-top:6px;">تأكد من رقم الطلب أو تواصل معنا</p>
        </div>
      `;
      return;
    }
    
    const statusInfo = {
      pending: { label: 'قيد المراجعة', icon: '📥', color: '#f59e0b', step: 1 },
      confirmed: { label: 'تم التأكيد - جاري التحضير', icon: '📦', color: '#3b82f6', step: 2 },
      shipping: { label: 'في الطريق إليك', icon: '🚚', color: '#8b5cf6', step: 3 },
      delivered: { label: 'تم التسليم بنجاح', icon: '✅', color: '#10b981', step: 4 },
      cancelled: { label: 'ملغي', icon: '❌', color: '#ef4444', step: 0 }
    };
    const info = statusInfo[order.status] || statusInfo.pending;
    
    $('#trackResult').innerHTML = `
      <div class="track-result">
        <div class="track-status" style="background:${info.color};">
          ${info.icon} ${info.label}
        </div>
        ${info.step > 0 ? `
          <div class="track-progress">
            <div class="track-step ${info.step >= 1 ? 'done' : ''}">
              <div class="step-circle">📥</div>
              <div class="step-label">استلام الطلب</div>
            </div>
            <div class="track-line ${info.step >= 2 ? 'done' : ''}"></div>
            <div class="track-step ${info.step >= 2 ? 'done' : ''}">
              <div class="step-circle">📦</div>
              <div class="step-label">التحضير</div>
            </div>
            <div class="track-line ${info.step >= 3 ? 'done' : ''}"></div>
            <div class="track-step ${info.step >= 3 ? 'done' : ''}">
              <div class="step-circle">🚚</div>
              <div class="step-label">قيد الشحن</div>
            </div>
            <div class="track-line ${info.step >= 4 ? 'done' : ''}"></div>
            <div class="track-step ${info.step >= 4 ? 'done' : ''}">
              <div class="step-circle">✅</div>
              <div class="step-label">تم التسليم</div>
            </div>
          </div>
        ` : ''}
        <div class="track-details">
          <div class="track-row"><span>رقم الطلب:</span><strong>${escapeHtml(order.orderNumber || '')}</strong></div>
          <div class="track-row"><span>عدد المنتجات:</span><strong>${(order.items || []).length}</strong></div>
          <div class="track-row"><span>الإجمالي:</span><strong style="color:var(--primary);">${formatPrice(order.total || 0)}</strong></div>
          ${order.customer?.governorate ? `<div class="track-row"><span>المحافظة:</span><strong>${escapeHtml(order.customer.governorate)}</strong></div>` : ''}
        </div>
      </div>
    `;
  });
  
  // Enter key
  $('#trackOrderNum').addEventListener('keydown', e => {
    if (e.key === 'Enter') $('#trackBtn').click();
  });
}

// ===== الأسئلة الشائعة Modal =====
// ===== نموذج كتابة التقييم =====
function showReviewForm(product) {
  let selectedRating = 5;
  
  const html = `
    <div class="modal-overlay" data-overlay style="z-index:200;">
      <div class="modal" style="max-width:480px;">
        <div class="modal-header">
          <h3>⭐ قيّم المنتج</h3>
          <button class="close-btn" data-close>×</button>
        </div>
        <div class="modal-body">
          <div class="review-product-preview">
            <img src="${escapeHtml((product.images?.[0]) || product.image || '')}" alt="" />
            <div>
              <h5>${escapeHtml(product.name)}</h5>
              <div class="price-current">${formatPrice(product.price)}</div>
            </div>
          </div>
          
          <div class="form-group">
            <label>تقييمك <span class="req">*</span></label>
            <div class="rating-input" id="ratingInput">
              ${[1,2,3,4,5].map(i => `
                <span class="star-input ${i <= 5 ? 'active' : ''}" data-rating="${i}">★</span>
              `).join('')}
            </div>
            <p style="font-size:13px;color:var(--text-muted);text-align:center;margin-top:6px;" id="ratingLabel">ممتاز ⭐⭐⭐⭐⭐</p>
          </div>
          
          <div class="form-group">
            <label>اسمك <span class="req">*</span></label>
            <input type="text" id="reviewName" placeholder="مثال: أحمد محمد" />
          </div>
          
          <div class="form-group">
            <label>تعليقك (اختياري)</label>
            <textarea id="reviewComment" rows="3" placeholder="شاركنا رأيك بالمنتج..."></textarea>
          </div>
          
          <div id="reviewError"></div>
          
          <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:10px;font-size:12px;color:#92400e;">
            ⚠️ سيظهر تقييمك بعد مراجعته من إدارة المتجر
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-checkout" id="submitReviewBtn">📤 إرسال التقييم</button>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', html);
  
  // إغلاق
  document.querySelectorAll('.modal-overlay[style*="z-index:200"] [data-close], .modal-overlay[style*="z-index:200"][data-overlay]').forEach(el => {
    el.addEventListener('click', e => {
      if (e.target === el) {
        el.closest('.modal-overlay').remove();
      }
    });
  });
  
  // تفاعل النجوم
  const labels = ['', 'سيء 😞', 'متوسط 🙁', 'جيد 🙂', 'جيد جداً 😊', 'ممتاز 🤩'];
  const labelStars = ['', '⭐', '⭐⭐', '⭐⭐⭐', '⭐⭐⭐⭐', '⭐⭐⭐⭐⭐'];
  
  document.querySelectorAll('#ratingInput .star-input').forEach(star => {
    star.addEventListener('click', () => {
      selectedRating = parseInt(star.dataset.rating);
      document.querySelectorAll('#ratingInput .star-input').forEach((s, i) => {
        s.classList.toggle('active', i < selectedRating);
      });
      $('#ratingLabel').textContent = `${labels[selectedRating]} ${labelStars[selectedRating]}`;
    });
    
    // hover effect
    star.addEventListener('mouseenter', () => {
      const r = parseInt(star.dataset.rating);
      document.querySelectorAll('#ratingInput .star-input').forEach((s, i) => {
        s.classList.toggle('hover', i < r);
      });
    });
    star.addEventListener('mouseleave', () => {
      document.querySelectorAll('#ratingInput .star-input').forEach(s => s.classList.remove('hover'));
    });
  });
  
  // إرسال
  $('#submitReviewBtn').addEventListener('click', async () => {
    const name = $('#reviewName').value.trim();
    const comment = $('#reviewComment').value.trim();
    
    if (!name) {
      $('#reviewError').innerHTML = '<div class="error-msg">⚠️ الرجاء إدخال اسمك</div>';
      return;
    }
    
    const btn = $('#submitReviewBtn');
    btn.disabled = true;
    btn.textContent = 'جاري الإرسال...';
    
    const ok = await submitReview(product.id, {
      name,
      comment,
      rating: selectedRating
    });
    
    if (ok) {
      // إغلاق النموذج
      document.querySelectorAll('.modal-overlay[style*="z-index:200"]').forEach(el => el.remove());
      showToast('✓ شكراً لك! سيظهر تقييمك بعد المراجعة');
      // تحديث التقييمات
      await loadReviews();
    } else {
      $('#reviewError').innerHTML = '<div class="error-msg">⚠️ فشل الإرسال، حاول مرة أخرى</div>';
      btn.disabled = false;
      btn.textContent = '📤 إرسال التقييم';
    }
  });
}

function renderFaqModal() {
  closeModal();
  const faqs = state.settings.faqs || [];
  const html = `
    <div class="modal-overlay" data-overlay>
      <div class="modal" style="max-width:600px;">
        <div class="modal-header">
          <h3>❓ الأسئلة الشائعة</h3>
          <button class="close-btn" data-close>×</button>
        </div>
        <div class="modal-body">
          ${faqs.length === 0 ? `
            <div class="empty-state">
              <div class="empty-icon">❓</div>
              <h4>لا توجد أسئلة بعد</h4>
            </div>
          ` : `
            <div class="faq-list">
              ${faqs.map((f, i) => `
                <details class="faq-item">
                  <summary>
                    <span class="faq-q">${escapeHtml(f.q)}</span>
                    <span class="faq-arrow">▾</span>
                  </summary>
                  <div class="faq-a">${escapeHtml(f.a)}</div>
                </details>
              `).join('')}
            </div>
          `}
          <div class="faq-contact">
            <p>لم تجد إجابة سؤالك؟</p>
            <a href="https://wa.me/${state.settings.whatsappNumber}" target="_blank" class="btn-checkout" style="display:inline-block;text-decoration:none;margin-top:8px;">
              💬 تواصل معنا عبر الواتساب
            </a>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', html);
  
  document.querySelectorAll('[data-close], [data-overlay]').forEach(el => {
    el.addEventListener('click', (e) => { if (e.target === el) closeModal(); });
  });
}

// ===== المودالات =====
function closeModal() {
  document.querySelectorAll('.modal-overlay, .cart-drawer').forEach(m => m.remove());
}

function showProductModal(p) {
  closeModal();
  trackViewContent(p);
  const discount = p.oldPrice ? Math.round((1 - p.price / p.oldPrice) * 100) : 0;
  const placeholderImg = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23e7e5e4" width="100" height="100"/></svg>';
  
  // جمع كل الوسائط (صور + فيديو)
  const media = [];
  if (p.images && p.images.length > 0) {
    p.images.forEach(img => media.push({ type: 'image', src: img }));
  } else if (p.image) {
    media.push({ type: 'image', src: p.image });
  }
  if (p.video) {
    media.push({ type: 'video', src: p.video });
  }
  if (media.length === 0) {
    media.push({ type: 'image', src: placeholderImg });
  }
  
  const html = `
    <div class="modal-overlay" data-overlay>
      <div class="modal product-modal">
        <div class="product-modal-header">
          <button class="product-back-btn" data-close>
            <span>←</span>
            <span>رجوع</span>
          </button>
          <button class="product-close-btn" data-close>×</button>
        </div>
        <div class="product-detail">
          <div class="product-gallery">
            ${discount > 0 ? `<div class="discount-badge" style="position:absolute;top:12px;right:12px;font-size:14px;padding:6px 12px;z-index:3;">خصم ${discount}%</div>` : ''}
            <div class="gallery-main" id="galleryMain">
              ${media.map((m, i) => `
                <div class="gallery-slide" data-slide="${i}">
                  ${m.type === 'image' ? `
                    <img src="${escapeHtml(m.src)}" alt="${escapeHtml(p.name)}" />
                  ` : `
                    <video src="${escapeHtml(m.src)}" controls playsinline preload="metadata"></video>
                  `}
                </div>
              `).join('')}
            </div>
            ${media.length > 1 ? `
              <div class="gallery-dots">
                ${media.map((_, i) => `<button class="gallery-dot ${i === 0 ? 'active' : ''}" data-dot="${i}"></button>`).join('')}
              </div>
            ` : ''}
          </div>
          
          ${media.length > 1 ? `
            <div class="gallery-thumbs">
              ${media.map((m, i) => `
                <div class="gallery-thumb ${i === 0 ? 'active' : ''} ${m.type === 'video' ? 'gallery-thumb-video' : ''}" data-thumb="${i}">
                  ${m.type === 'image' ? `
                    <img src="${escapeHtml(m.src)}" alt="" />
                  ` : `
                    <video src="${escapeHtml(m.src)}" preload="metadata"></video>
                  `}
                </div>
              `).join('')}
            </div>
          ` : ''}
          
          <div class="product-detail-info">
            <h2>${escapeHtml(p.name)}</h2>
            <div class="product-detail-prices">
              <span class="price-current">${formatPrice(p.price)}</span>
              ${p.oldPrice ? `<span class="price-old">${formatPrice(p.oldPrice)}</span>` : ''}
            </div>
            <p class="description">${escapeHtml(p.description || '')}</p>
            ${p.bogo ? `
              <div class="bogo-banner">
                <div class="bogo-banner-icon">🎁</div>
                <div class="bogo-banner-text">
                  <div class="bogo-banner-title">عرض حصري: 1+1=3</div>
                  <div class="bogo-banner-desc">اشترِ 3 قطع وادفع ثمن قطعتين فقط!</div>
                </div>
              </div>
            ` : ''}
            
            ${p.optionGroups && p.optionGroups.length > 0 ? `
              <div class="product-option-selectors">
                ${p.optionGroups.map((group, gi) => `
                  <div class="option-selector" data-option-group-name="${escapeHtml(group.name)}">
                    <label class="option-selector-label">
                      ${escapeHtml(group.name)} <span class="req">*</span>
                    </label>
                    <div class="option-buttons">
                      ${group.values.map((val, vi) => `
                        <button type="button" class="option-btn ${vi === 0 ? 'active' : ''}" 
                                data-option-value="${gi}-${vi}"
                                data-option-text="${escapeHtml(val)}">
                          ${escapeHtml(val)}
                        </button>
                      `).join('')}
                    </div>
                  </div>
                `).join('')}
              </div>
            ` : ''}
            
            <div class="stock-info">
              <p>✓ متوفر${p.stock ? ` • ${p.stock} قطعة` : ''}</p>
              <p class="small">💵 الدفع عند الاستلام • 🚚 توصيل لجميع المحافظات</p>
            </div>
            <div class="product-detail-buttons">
              <button class="btn-buy-now-large" data-buy-from-modal="${p.id}">
                ⚡ اطلب الآن
              </button>
              <button class="btn-add-cart-large" data-add-from-modal="${p.id}">
                🛒 أضف للسلة
              </button>
            </div>
            
            ${state.settings.reviewsEnabled ? `
              <div class="reviews-section" id="reviewsSection">
                <div class="reviews-header">
                  <h4>⭐ تقييمات الزبائن</h4>
                  ${(() => {
                    const r = getProductRating(p.id);
                    return r.count > 0 ? `
                      <div class="reviews-summary">
                        <div class="reviews-avg">${r.avg.toFixed(1)}</div>
                        <div>
                          ${renderStars(r.avg, 'md')}
                          <div class="reviews-count">${r.count} تقييم</div>
                        </div>
                      </div>
                    ` : '<p style="color:var(--text-muted);font-size:13px;">لا توجد تقييمات بعد. كن أول من يقيّم!</p>';
                  })()}
                </div>
                
                <div class="reviews-list" id="reviewsList">
                  ${(() => {
                    const reviews = getProductReviews(p.id, true);
                    if (reviews.length === 0) return '';
                    return reviews.slice(0, 5).map(r => `
                      <div class="review-item">
                        <div class="review-header">
                          <div class="review-author">${escapeHtml(r.name || 'زبون')}</div>
                          ${renderStars(r.rating || 5, 'sm')}
                        </div>
                        ${r.comment ? `<p class="review-comment">${escapeHtml(r.comment)}</p>` : ''}
                      </div>
                    `).join('');
                  })()}
                </div>
                
                <button class="btn-add-review" id="openReviewFormBtn" data-product-id="${p.id}">
                  ✍️ اكتب تقييمك
                </button>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', html);
  
  document.querySelectorAll('[data-close], [data-overlay]').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target === el) closeModal();
    });
  });
  
  $(`[data-add-from-modal="${p.id}"]`)?.addEventListener('click', () => {
    const selectedOptions = collectSelectedOptions();
    if (selectedOptions === null) return; // لم يختر
    addToCart(p, selectedOptions);
    closeModal();
  });
  
  $(`[data-buy-from-modal="${p.id}"]`)?.addEventListener('click', () => {
    const selectedOptions = collectSelectedOptions();
    if (selectedOptions === null) return;
    closeModal();
    buyNow(p, selectedOptions);
  });
  
  $('#openReviewFormBtn')?.addEventListener('click', () => {
    showReviewForm(p);
  });
  
  // جمع الخيارات المختارة من الأزرار
  function collectSelectedOptions() {
    if (!p.optionGroups || p.optionGroups.length === 0) return {};
    const selected = {};
    for (const group of p.optionGroups) {
      const groupName = group.name;
      const activeBtn = document.querySelector(`[data-option-group-name="${CSS.escape(groupName)}"] .option-btn.active`);
      if (activeBtn) {
        selected[groupName] = activeBtn.dataset.optionText;
      } else {
        showToast(`الرجاء اختيار ${groupName}`, 'error');
        return null;
      }
    }
    return selected;
  }
  
  // معالج الضغط على زر خيار
  document.querySelectorAll('.option-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const parent = btn.closest('.option-buttons');
      parent.querySelectorAll('.option-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
  
  // التحكم في المعرض - النقاط والمصغرات
  const galleryMain = $('#galleryMain');
  if (galleryMain && media.length > 1) {
    // عند الضغط على نقطة أو مصغرة
    const goToSlide = (index) => {
      const slide = galleryMain.querySelector(`[data-slide="${index}"]`);
      if (slide) {
        slide.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
      }
      document.querySelectorAll('.gallery-dot').forEach((d, i) => d.classList.toggle('active', i === index));
      document.querySelectorAll('.gallery-thumb').forEach((t, i) => t.classList.toggle('active', i === index));
    };
    
    document.querySelectorAll('[data-dot]').forEach(d => {
      d.addEventListener('click', () => goToSlide(parseInt(d.dataset.dot)));
    });
    document.querySelectorAll('[data-thumb]').forEach(t => {
      t.addEventListener('click', () => goToSlide(parseInt(t.dataset.thumb)));
    });
    
    // تحديث النقاط والمصغرات عند التمرير
    let scrollTimer;
    galleryMain.addEventListener('scroll', () => {
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        const slideWidth = galleryMain.clientWidth;
        const currentIndex = Math.round(galleryMain.scrollLeft / slideWidth);
        document.querySelectorAll('.gallery-dot').forEach((d, i) => d.classList.toggle('active', i === currentIndex));
        document.querySelectorAll('.gallery-thumb').forEach((t, i) => t.classList.toggle('active', i === currentIndex));
      }, 100);
    });
  }
}

function renderCart() {
  closeModal();
  const total = cartTotal();
  const html = `
    <div class="modal-overlay" data-overlay style="align-items:flex-start;justify-content:flex-start;">
      <div class="cart-drawer">
        <div class="modal-header">
          <h3>🛒 سلة التسوق (${state.cart.length})</h3>
          <button class="close-btn" data-close>×</button>
        </div>
        ${state.cart.length === 0 ? `
          <div class="empty-cart">
            <div class="empty-cart-icon">🛍️</div>
            <p style="margin-bottom:16px;">السلة فارغة</p>
            <button class="btn-primary" data-close style="background:var(--text);color:white;">تسوق الآن</button>
          </div>
        ` : `
          <div class="cart-items">
            ${state.cart.map(it => {
              // رسالة تشجيعية: لو المنتج عليه عرض ولم يصل لـ 3 بعد
              let bogoHint = '';
              if (it.bogo) {
                if (it.qty < 3) {
                  const need = 3 - it.qty;
                  bogoHint = `<div class="cart-bogo-hint">🎁 أضف ${need} قطعة أخرى للحصول على ${need === 1 ? 'قطعة' : 'قطع'} مجانية!</div>`;
                } else {
                  const free = Math.floor(it.qty / 3);
                  bogoHint = `<div class="cart-bogo-success">🎉 ${free} قطعة مجانية! وفّرت ${formatPrice(free * it.price)}</div>`;
                }
              }
              return `
                <div class="cart-item ${it.bogo ? 'has-bogo' : ''}">
                  <img src="${escapeHtml(it.image)}" alt="${escapeHtml(it.name)}" />
                  <div class="cart-item-info">
                    <h4>${escapeHtml(it.name)} ${it.bogo ? '<span class="bogo-tag">🎁 1+1=3</span>' : ''}</h4>
                    ${it.selectedOptions && Object.keys(it.selectedOptions).length > 0 ? `
                      <div class="cart-item-options">
                        ${Object.entries(it.selectedOptions).map(([k, v]) => `
                          <span class="cart-option-tag">${escapeHtml(k)}: <strong>${escapeHtml(v)}</strong></span>
                        `).join('')}
                      </div>
                    ` : ''}
                    <div class="price">${formatPrice(it.price)}</div>
                    <div class="qty-controls">
                      <button class="qty-btn" data-cart-qty="${it.cartItemId || it.id}" data-delta="-1">−</button>
                      <span class="qty-display">${it.qty}</span>
                      <button class="qty-btn" data-cart-qty="${it.cartItemId || it.id}" data-delta="1">+</button>
                      <button class="btn-remove" data-cart-remove="${it.cartItemId || it.id}">🗑️</button>
                    </div>
                    ${bogoHint}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
          <div class="cart-footer">
            ${cartBogoDiscount() > 0 ? `
              <div class="cart-bogo-summary">
                <div class="cart-summary-row">
                  <span>المجموع الأصلي:</span>
                  <span style="text-decoration:line-through;color:var(--text-muted);">${formatPrice(total)}</span>
                </div>
                <div class="cart-summary-row" style="color:#16a34a;font-weight:700;">
                  <span>🎁 خصم 1+1=3 (${getBogoFreeItemsCount()} مجاناً):</span>
                  <span>−${formatPrice(cartBogoDiscount())}</span>
                </div>
              </div>
            ` : ''}
            
            <div class="coupon-section">
              ${state.appliedCoupon ? `
                <div class="coupon-applied">
                  <div class="coupon-applied-info">
                    <span class="coupon-icon">🏷️</span>
                    <div>
                      <div class="coupon-code-applied">${escapeHtml(state.appliedCoupon.code)}</div>
                      <div class="coupon-discount-applied">خصم ${formatPrice(getCouponDiscount())}</div>
                    </div>
                  </div>
                  <button class="btn-remove-coupon" id="removeCouponBtn">×</button>
                </div>
              ` : `
                <div class="coupon-input-wrapper">
                  <input type="text" id="couponInput" placeholder="🏷️ هل لديك كود خصم؟" />
                  <button id="applyCouponBtn">تطبيق</button>
                </div>
                <div id="couponMsg"></div>
              `}
            </div>
            
            <div class="cart-total">
              <span>الإجمالي:</span>
              <span>${formatPrice(Math.max(0, total - cartBogoDiscount() - getCouponDiscount()))}</span>
            </div>
            ${state.settings.freeShippingEnabled && (total - cartBogoDiscount() - getCouponDiscount()) < state.settings.freeShippingMin ? `
              <div class="shipping-hint">💡 أضف بقيمة ${formatPrice(state.settings.freeShippingMin - (total - cartBogoDiscount() - getCouponDiscount()))} للحصول على توصيل مجاني</div>
            ` : ''}
            <button class="btn-checkout" data-checkout>إتمام الطلب</button>
          </div>
        `}
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', html);
  
  document.querySelectorAll('[data-close], [data-overlay]').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target === el) closeModal();
    });
  });
  
  document.querySelectorAll('[data-cart-qty]').forEach(b => {
    b.addEventListener('click', () => updateCartQty(b.dataset.cartQty, parseInt(b.dataset.delta)));
  });
  
  document.querySelectorAll('[data-cart-remove]').forEach(b => {
    b.addEventListener('click', () => removeFromCart(b.dataset.cartRemove));
  });
  
  // معالج الكوبون
  $('#applyCouponBtn')?.addEventListener('click', () => {
    const code = $('#couponInput').value.trim();
    if (!code) return;
    const coupon = validateCoupon(code);
    if (!coupon) {
      $('#couponMsg').innerHTML = '<div class="coupon-msg-error">❌ كوبون غير صالح أو منتهي</div>';
      return;
    }
    state.appliedCoupon = coupon;
    showToast('✓ تم تطبيق الكوبون');
    renderCart();
  });
  
  $('#removeCouponBtn')?.addEventListener('click', () => {
    state.appliedCoupon = null;
    renderCart();
  });
  
  // Enter key للكوبون
  $('#couponInput')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') $('#applyCouponBtn').click();
  });
  
  $('[data-checkout]')?.addEventListener('click', () => {
    if (state.cart.length === 0) return;
    trackInitiateCheckout();
    const s = state.settings;
    if (s.directCheckoutEnabled && !s.whatsappCheckoutEnabled) {
      showDirectCheckout();
    } else if (!s.directCheckoutEnabled && s.whatsappCheckoutEnabled) {
      checkoutWhatsApp();
    } else {
      showCheckoutChoice();
    }
  });
}

function showCheckoutChoice(isBuyNow = false) {
  closeModal();
  const html = `
    <div class="modal-overlay" data-overlay>
      <div class="modal" style="max-width:440px;">
        <div class="modal-header">
          <h3>${isBuyNow ? '⚡ كيف تريد الطلب؟' : 'كيف تريد إكمال طلبك؟'}</h3>
          <button class="close-btn" data-close>×</button>
        </div>
        <div class="checkout-choice">
          <button class="checkout-option primary" data-choice="direct">
            <div class="checkout-option-icon">🏪</div>
            <div class="checkout-option-text">
              <h4>الطلب من المتجر</h4>
              <p>املأ معلومات التوصيل وسنتواصل معك</p>
            </div>
            <div>←</div>
          </button>
          <button class="checkout-option whatsapp" data-choice="whatsapp">
            <div class="checkout-option-icon">💬</div>
            <div class="checkout-option-text">
              <h4>الطلب عبر واتساب</h4>
              <p>تحدث معنا مباشرة لإكمال الطلب</p>
            </div>
            <div>←</div>
          </button>
          <div style="background:#f5f5f4;padding:12px;border-radius:12px;text-align:center;font-size:12px;color:var(--text-muted);">
            💵 الدفع نقداً عند الاستلام في كلتا الحالتين
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', html);
  
  document.querySelectorAll('[data-close], [data-overlay]').forEach(el => {
    el.addEventListener('click', (e) => { 
      if (e.target === el) {
        closeModal();
        if (isBuyNow) restoreCart(); // استرجاع السلة عند الإلغاء
      }
    });
  });
  
  document.querySelectorAll('[data-choice]').forEach(b => {
    b.addEventListener('click', () => {
      const c = b.dataset.choice;
      closeModal();
      if (c === 'direct') showDirectCheckout(isBuyNow);
      else {
        checkoutWhatsApp();
        if (isBuyNow) restoreCart();
      }
    });
  });
}

function showDirectCheckout(isBuyNow = false) {
  closeModal();
  const total = cartTotal();
  const html = `
    <div class="modal-overlay" data-overlay>
      <div class="modal">
        <div class="modal-header">
          <h3>معلومات التوصيل</h3>
          <button class="close-btn" data-close>×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>الاسم الكامل <span class="req">*</span></label>
            <input type="text" id="cName" placeholder="مثال: أحمد محمد" />
          </div>
          <div class="form-group">
            <label>رقم الهاتف <span class="req">*</span></label>
            <input type="tel" id="cPhone" placeholder="07xxxxxxxxx" />
          </div>
          <div class="form-group">
            <label>المحافظة <span class="req">*</span></label>
            <select id="cGov">
              <option value="">اختر المحافظة</option>
              ${IRAQI_GOVERNORATES.map(g => `<option value="${g}">${g}</option>`).join('')}
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
          <div class="order-summary" id="orderSummary">
            <div class="order-summary-row"><span>عدد المنتجات:</span><span><strong>${cartCount()}</strong></span></div>
            <div class="order-summary-row"><span>المجموع:</span><span><strong>${formatPrice(total)}</strong></span></div>
            ${cartBogoDiscount() > 0 ? `
              <div class="order-summary-row" style="color:#16a34a;font-weight:700;">
                <span>🎁 خصم 1+1=3:</span>
                <span>−${formatPrice(cartBogoDiscount())}</span>
              </div>
            ` : ''}
            ${getCouponDiscount() > 0 && state.appliedCoupon ? `
              <div class="order-summary-row" style="color:#16a34a;font-weight:700;">
                <span>🏷️ كوبون ${escapeHtml(state.appliedCoupon.code)}:</span>
                <span>−${formatPrice(getCouponDiscount())}</span>
              </div>
            ` : ''}
            <div class="order-summary-row" id="shippingRow"><span>أجور التوصيل:</span><span id="shippingValue"><strong>اختر المحافظة</strong></span></div>
            <div class="order-summary-row"><span>طريقة الدفع:</span><span><strong>عند الاستلام 💵</strong></span></div>
            <div class="order-summary-row order-summary-total"><span>الإجمالي:</span><span class="price" id="grandTotalValue">${formatPrice(Math.max(0, total - cartBogoDiscount() - getCouponDiscount()))}</span></div>
            ${state.settings.loyaltyEnabled ? `
              <div class="loyalty-hint">
                💯 ستحصل على <strong>${calculateLoyaltyPoints(Math.max(0, total - cartBogoDiscount() - getCouponDiscount()))}</strong> نقطة!
              </div>
            ` : ''}
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-checkout" id="submitOrderBtn">تأكيد الطلب</button>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', html);
  
  document.querySelectorAll('[data-close], [data-overlay]').forEach(el => {
    el.addEventListener('click', (e) => { 
      if (e.target === el) {
        closeModal();
        if (isBuyNow) restoreCart();
      }
    });
  });
  
  // تحديث أجور التوصيل عند تغيير المحافظة
  function updateShippingDisplay() {
    const gov = $('#cGov').value;
    const s = state.settings;
    const shippingEl = $('#shippingValue');
    const grandEl = $('#grandTotalValue');
    const afterDiscounts = Math.max(0, total - cartBogoDiscount() - getCouponDiscount());
    
    if (!s.shippingEnabled) {
      shippingEl.innerHTML = '<strong style="color:#16a34a;">مجاني 🎉</strong>';
      grandEl.textContent = formatPrice(afterDiscounts);
      return;
    }
    
    if (!gov) {
      shippingEl.innerHTML = '<strong>اختر المحافظة</strong>';
      grandEl.textContent = formatPrice(afterDiscounts) + ' + التوصيل';
      return;
    }
    
    const shipping = getShippingFee(gov);
    if (shipping === 0) {
      shippingEl.innerHTML = '<strong style="color:#16a34a;">مجاني 🎉</strong>';
    } else {
      shippingEl.innerHTML = `<strong>${formatPrice(shipping)}</strong>`;
    }
    grandEl.textContent = formatPrice(afterDiscounts + shipping);
  }
  
  $('#cGov').addEventListener('change', updateShippingDisplay);
  updateShippingDisplay(); // عرض أولي
  
  $('#submitOrderBtn')?.addEventListener('click', async () => {
    const name = $('#cName').value.trim();
    const phone = $('#cPhone').value.trim();
    const gov = $('#cGov').value;
    const addr = $('#cAddr').value.trim();
    const notes = $('#cNotes').value.trim();
    const errEl = $('#checkoutError');
    
    if (!name || !phone || !gov || !addr) {
      errEl.innerHTML = `<div class="error-msg">⚠️ الرجاء تعبئة جميع الحقول المطلوبة</div>`;
      return;
    }
    if (phone.replace(/\D/g, '').length < 10) {
      errEl.innerHTML = `<div class="error-msg">⚠️ رقم الهاتف غير صحيح</div>`;
      return;
    }
    
    const btn = $('#submitOrderBtn');
    btn.disabled = true;
    btn.textContent = 'جاري الإرسال...';
    
    const shipping = getShippingFee(gov);
    const bogoDiscount = cartBogoDiscount();
    const couponDiscount = getCouponDiscount();
    const finalTotal = Math.max(0, total - bogoDiscount - couponDiscount + shipping);
    const loyaltyPoints = calculateLoyaltyPoints(finalTotal);
    
    const order = await createOrder({
      items: state.cart.map(i => ({ id: i.id, name: i.name, price: i.price, qty: i.qty, image: i.image, bogo: !!i.bogo, selectedOptions: i.selectedOptions || {} })),
      subtotal: total,
      bogoDiscount: bogoDiscount,
      bogoFreeItems: getBogoFreeItemsCount(),
      couponCode: state.appliedCoupon?.code || null,
      couponDiscount: couponDiscount,
      shipping: shipping,
      total: finalTotal,
      loyaltyPoints: loyaltyPoints,
      customer: { name, phone, governorate: gov, address: addr, notes }
    });
    
    // إذا نجح الطلب، أعد ضبط الكوبون
    if (order) {
      state.appliedCoupon = null;
    }
    
    if (order) {
      const customerInfo = { name, phone, governorate: gov, address: addr, notes };
      state.cart = [];
      updateCartBadge();
      showOrderSuccess(order, customerInfo);
    } else {
      errEl.innerHTML = `<div class="error-msg">⚠️ فشل إرسال الطلب، حاول مرة أخرى</div>`;
      btn.disabled = false;
      btn.textContent = 'تأكيد الطلب';
    }
  });
}

function showOrderSuccess(order, customerInfo) {
  closeModal();
  trackPurchase(order);
  const html = `
    <div class="modal-overlay" data-overlay>
      <div class="modal" style="max-width:440px;">
        <div class="success-screen">
          <div class="success-icon">✅</div>
          <h3 style="font-family:'Cairo',sans-serif;font-size:24px;font-weight:900;margin-bottom:8px;">تم استلام طلبك! 🎉</h3>
          <p style="color:var(--text-muted);">رقم الطلب:</p>
          <div class="order-number">${order.orderNumber}</div>
          <p style="font-size:14px;color:var(--text-muted);margin-bottom:24px;">سنتواصل معك قريباً لتأكيد الطلب وتحديد موعد التوصيل</p>
          <div style="display:flex;flex-direction:column;gap:8px;">
            ${state.settings.whatsappCheckoutEnabled ? `
              <button class="btn-whatsapp" id="sendWaCopy" style="width:100%;justify-content:center;">
                💬 إرسال نسخة عبر واتساب
              </button>
            ` : ''}
            <button class="btn-cancel" data-close>إغلاق</button>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', html);
  
  document.querySelectorAll('[data-close], [data-overlay]').forEach(el => {
    el.addEventListener('click', (e) => { if (e.target === el) closeModal(); });
  });
  
  $('#sendWaCopy')?.addEventListener('click', () => {
    // تجهيز السلة مؤقتاً للإرسال
    const tempCart = state.cart;
    state.cart = order.items || [];
    checkoutWhatsApp(customerInfo);
    state.cart = tempCart;
  });
}

// ===== الأدمن: تسجيل الدخول =====
function showAdminLoginModal() {
  closeModal();
  const html = `
    <div class="modal-overlay" data-overlay>
      <div class="modal" style="max-width:400px;">
        <div class="modal-header">
          <h3>🔐 دخول الأدمن</h3>
          <button class="close-btn" data-close>×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>البريد الإلكتروني</label>
            <input type="email" id="adminEmail" placeholder="email@example.com" />
          </div>
          <div class="form-group">
            <label>كلمة المرور</label>
            <input type="password" id="adminPass" />
          </div>
          <div id="loginError"></div>
        </div>
        <div class="modal-footer">
          <button class="btn-save" id="loginBtn">دخول</button>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', html);
  
  document.querySelectorAll('[data-close], [data-overlay]').forEach(el => {
    el.addEventListener('click', (e) => { if (e.target === el) closeModal(); });
  });
  
  const submit = async () => {
    const email = $('#adminEmail').value.trim();
    const pass = $('#adminPass').value;
    const errEl = $('#loginError');
    if (!email || !pass) {
      errEl.innerHTML = `<div class="error-msg">⚠️ أدخل البريد وكلمة المرور</div>`;
      return;
    }
    const btn = $('#loginBtn');
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
  
  $('#loginBtn').addEventListener('click', submit);
  $('#adminPass').addEventListener('keypress', (e) => { if (e.key === 'Enter') submit(); });
}

async function logoutAdmin() {
  await signOut(auth);
  state.view = 'store';
  showToast('✓ تم تسجيل الخروج');
  render();
}

// ===== لوحة الأدمن =====
let adminTab = 'dashboard';
let adminProductsSearch = '';
let adminOrdersFilter = 'all';

function renderAdmin() {
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
              {id:'theme',label:'التصميم',icon:'🎨'},
              {id:'categories',label:'الأقسام',icon:'📂'},
              {id:'shipping',label:'التوصيل',icon:'🚚'},
              {id:'coupons',label:'الكوبونات',icon:'🏷️'},
              {id:'analytics',label:'الإحصائيات',icon:'📈'},
              {id:'customers',label:'الزبائن',icon:'👥'},
              {id:'content',label:'المحتوى',icon:'📝'},
              {id:'reviews',label:'التقييمات',icon:'⭐'}
            ].map(t => `
              <button class="admin-tab ${adminTab === t.id ? 'active' : ''}" data-admin-tab="${t.id}">
                ${t.icon} ${t.label}
                ${t.badge > 0 ? `<span class="admin-tab-badge">${t.badge}</span>` : ''}
              </button>
            `).join('')}
          </div>
        </div>
      </header>
      <div class="admin-content" id="adminContent"></div>
    </div>
  `;
  
  $('#backToStore')?.addEventListener('click', () => {
    state.view = 'store';
    render();
  });
  
  $('#logoutBtn')?.addEventListener('click', logoutAdmin);
  
  document.querySelectorAll('[data-admin-tab]').forEach(b => {
    b.addEventListener('click', () => {
      adminTab = b.dataset.adminTab;
      renderAdmin();
    });
  });
  
  if (adminTab === 'dashboard') renderAdminDashboard();
  else if (adminTab === 'products') renderAdminProducts();
  else if (adminTab === 'orders') renderAdminOrders();
  else if (adminTab === 'settings') renderAdminSettings();
  else if (adminTab === 'theme') renderAdminTheme();
  else if (adminTab === 'categories') renderAdminCategories();
  else if (adminTab === 'shipping') renderAdminShipping();
  else if (adminTab === 'coupons') renderAdminCoupons();
  else if (adminTab === 'analytics') renderAdminAnalytics();
  else if (adminTab === 'customers') renderAdminCustomers();
  else if (adminTab === 'content') renderAdminContent();
  else if (adminTab === 'reviews') renderAdminReviews();
}

function renderAdminDashboard() {
  const pending = state.orders.filter(o => o.status === 'pending').length;
  const revenue = state.orders.filter(o => o.status === 'delivered').reduce((s, o) => s + (o.total || 0), 0);
  
  $('#adminContent').innerHTML = `
    <div class="stats-grid">
      <button class="stat-card" data-go="products">
        <div class="stat-icon">📦</div>
        <div class="stat-label">المنتجات</div>
        <div class="stat-value">${state.products.length}</div>
      </button>
      <button class="stat-card" data-go="orders">
        <div class="stat-icon" style="color:#ea580c;">🛒</div>
        <div class="stat-label">قيد المعالجة</div>
        <div class="stat-value" style="color:#ea580c;">${pending}</div>
        ${pending > 0 ? `<span class="stat-pulse"></span>` : ''}
      </button>
      <div class="stat-card">
        <div class="stat-icon" style="color:#16a34a;">📋</div>
        <div class="stat-label">إجمالي الطلبات</div>
        <div class="stat-value">${state.orders.length}</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="color:#facc15;">⭐</div>
        <div class="stat-label">الإيرادات</div>
        <div class="stat-value" style="font-size:18px;color:#16a34a;">${formatPrice(revenue)}</div>
      </div>
    </div>
    
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
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}
    
    <div class="settings-card" style="background:linear-gradient(135deg,#dbeafe,#e0e7ff);border:1px solid #bfdbfe;">
      <h3>💡 نصائح سريعة</h3>
      <ul style="padding:0;list-style:none;font-size:14px;line-height:2;">
        <li>• غيّر رقم واتساب من تبويب "الإعدادات"</li>
        <li>• اختر ألوان متجرك من تبويب "التصميم"</li>
        <li>• الطلبات الجديدة تظهر في تبويب "الطلبات"</li>
        <li>• ارفع صور المنتجات وستُضغط تلقائياً</li>
      </ul>
    </div>
  `;
  
  document.querySelectorAll('[data-go]').forEach(b => {
    b.addEventListener('click', () => {
      adminTab = b.dataset.go;
      renderAdmin();
    });
  });
}

function renderAdminProducts() {
  const filtered = state.products.filter(p => 
    (p.name || '').toLowerCase().includes(adminProductsSearch.toLowerCase())
  );
  
  $('#adminContent').innerHTML = `
    <div class="admin-toolbar">
      <input type="text" id="searchProducts" placeholder="🔍 ابحث..." value="${escapeHtml(adminProductsSearch)}" />
      <button class="btn-add-product" id="addNewProduct">+ منتج جديد</button>
    </div>
    
    ${filtered.length === 0 ? `
      <div class="empty-state">
        <div class="empty-icon">📦</div>
        <p>${state.products.length === 0 ? 'ابدأ بإضافة أول منتج' : 'لا توجد نتائج'}</p>
      </div>
    ` : `
      <div class="products-list">
        ${filtered.map(p => `
          <div class="product-row">
            <img src="${escapeHtml((p.images && p.images[0]) || p.image || '')}" alt="" onerror="this.style.opacity=0.3" />
            <div class="product-row-info">
              <h4>
                ${escapeHtml(p.name)}
                ${p.featured ? '<span style="background:#fef9c3;color:#a16207;font-size:10px;padding:2px 6px;border-radius:4px;margin-right:4px;">تريند</span>' : ''}
              </h4>
              <div class="product-meta">
                <span class="price-tag">${formatPrice(p.price)}</span>
                <span>•</span>
                <span>${escapeHtml(getAllCategories().find(c => c.id === p.category)?.name || '')}</span>
                <span>•</span>
                <span>المخزون: ${p.stock || 0}</span>
              </div>
            </div>
            <div class="row-actions">
              <button class="row-action edit" data-edit-product="${p.id}">✏️</button>
              <button class="row-action delete" data-delete-product="${p.id}">🗑️</button>
            </div>
          </div>
        `).join('')}
      </div>
    `}
  `;
  
  $('#searchProducts')?.addEventListener('input', (e) => {
    adminProductsSearch = e.target.value;
    clearTimeout(window._adminSearchTimer);
    window._adminSearchTimer = setTimeout(() => renderAdminProducts(), 250);
  });
  
  $('#addNewProduct')?.addEventListener('click', () => showProductForm(null));
  
  document.querySelectorAll('[data-edit-product]').forEach(b => {
    b.addEventListener('click', () => {
      const p = state.products.find(x => x.id === b.dataset.editProduct);
      if (p) showProductForm(p);
    });
  });
  
  document.querySelectorAll('[data-delete-product]').forEach(b => {
    b.addEventListener('click', async () => {
      if (!confirm('حذف هذا المنتج؟')) return;
      const ok = await deleteProduct(b.dataset.deleteProduct);
      if (ok) showToast('✓ تم الحذف');
    });
  });
}

// معالجة الفيديو مع ضغط بسيط
function processVideo(file) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('video/')) return reject(new Error('ملف غير صالح'));
    // الحد الأقصى للفيديو: 5 ميجا (لأنه يُحفظ كـ base64 في Firestore)
    if (file.size > 5 * 1024 * 1024) {
      return reject(new Error('حجم الفيديو يجب أن يكون أقل من 5 ميجا'));
    }
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error('فشل قراءة الفيديو'));
    reader.readAsDataURL(file);
  });
}

const MAX_IMAGES = 5;

function showProductForm(product) {
  closeModal();
  const isEdit = !!product;
  const data = product || { name:'', price:'', oldPrice:'', category:'fashion', images:[], video:'', description:'', stock:10, featured:false };
  
  // التوافق مع المنتجات القديمة التي لها image واحدة فقط
  let images = [];
  if (data.images && Array.isArray(data.images) && data.images.length > 0) {
    images = [...data.images];
  } else if (data.image) {
    images = [data.image];
  }
  let video = data.video || '';
  
  const html = `
    <div class="modal-overlay" data-overlay>
      <div class="modal">
        <div class="modal-header">
          <h3>${isEdit ? 'تعديل منتج' : 'منتج جديد'}</h3>
          <button class="close-btn" data-close>×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>صور المنتج <span class="req">*</span> <span style="font-weight:normal;color:var(--text-muted);font-size:12px;">(حتى 5 صور)</span></label>
            <div class="images-container" id="imagesContainer"></div>
            <div class="upload-buttons">
              <input type="file" id="imageInput" accept="image/*" multiple style="display:none;" />
              <input type="file" id="videoInput" accept="video/*" style="display:none;" />
              <button type="button" class="upload-btn-small" id="addImageBtn">📷 إضافة صورة</button>
              <button type="button" class="upload-btn-small" id="addVideoBtn">🎬 ${video ? 'تغيير الفيديو' : 'إضافة فيديو'}</button>
            </div>
            <p style="font-size:11px;color:var(--text-muted);margin-top:8px;">💡 الصور تُضغط تلقائياً (600×600). الفيديو حتى 5 ميجا.</p>
            <div id="videoProgress"></div>
          </div>
          
          <div class="form-group">
            <label>اسم المنتج <span class="req">*</span></label>
            <input type="text" id="pName" value="${escapeHtml(data.name)}" />
          </div>
          
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div class="form-group">
              <label>السعر <span class="req">*</span></label>
              <input type="number" id="pPrice" value="${data.price}" />
            </div>
            <div class="form-group">
              <label>السعر القديم</label>
              <input type="number" id="pOldPrice" value="${data.oldPrice || ''}" placeholder="للخصم" />
            </div>
          </div>
          
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div class="form-group">
              <label>التصنيف</label>
              <select id="pCategory">
                ${state.categories.map(c => `
                  <option value="${c.id}" ${data.category === c.id ? 'selected' : ''}>${c.icon} ${c.name}</option>
                `).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>المخزون</label>
              <input type="number" id="pStock" value="${data.stock || 0}" />
            </div>
          </div>
          
          <div class="form-group" id="subcategoryGroup" style="display:none;">
            <label>القسم الفرعي (اختياري)</label>
            <select id="pSubcategory">
              <option value="">— لا قسم فرعي —</option>
            </select>
          </div>
          
          <div class="form-group">
            <label>الوصف</label>
            <textarea id="pDesc" rows="3">${escapeHtml(data.description || '')}</textarea>
          </div>
          
          <label class="checkbox-card">
            <input type="checkbox" id="pFeatured" ${data.featured ? 'checked' : ''} />
            <span><strong>🔥 منتج مميز</strong> (يظهر في "الأكثر رواجاً")</span>
          </label>
          
          <label class="checkbox-card" style="background:linear-gradient(135deg,#fef3c7,#fde68a);border-color:#f59e0b;">
            <input type="checkbox" id="pBogo" ${data.bogo ? 'checked' : ''} />
            <span><strong>🎁 عرض 1+1=3</strong> (الزبون يأخذ 3 ويدفع ثمن 2)</span>
          </label>
          
          <!-- خيارات المنتج -->
          <div class="product-options-section">
            <div class="product-options-header">
              <h4>🏷️ خيارات المنتج (اختياري)</h4>
              <p class="options-hint">مثل: النوع، اللون، المقاس - يختار الزبون قبل الشراء</p>
            </div>
            <div id="optionsList"></div>
            <button type="button" class="btn-add-option-group" id="addOptionGroup">
              + إضافة مجموعة خيارات
            </button>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" data-close>إلغاء</button>
          <button class="btn-save" id="saveProduct">${isEdit ? 'حفظ' : 'إضافة'}</button>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', html);
  
  document.querySelectorAll('[data-close], [data-overlay]').forEach(el => {
    el.addEventListener('click', (e) => { if (e.target === el) closeModal(); });
  });
  
  // عرض الصور والفيديو
  function renderImages() {
    const c = $('#imagesContainer');
    let html = '';
    images.forEach((img, i) => {
      html += `
        <div class="image-slot ${i === 0 ? 'main' : ''}">
          <img src="${escapeHtml(img)}" alt="" />
          <button class="image-slot-remove" data-remove-image="${i}">×</button>
        </div>
      `;
    });
    if (video) {
      html += `
        <div class="image-slot">
          <video src="${escapeHtml(video)}" muted></video>
          <button class="image-slot-remove" data-remove-video>×</button>
          <div class="video-badge">▶ فيديو</div>
        </div>
      `;
    }
    c.innerHTML = html;
    
    // ربط أزرار الحذف
    document.querySelectorAll('[data-remove-image]').forEach(b => {
      b.addEventListener('click', () => {
        images.splice(parseInt(b.dataset.removeImage), 1);
        renderImages();
        updateButtons();
      });
    });
    $('[data-remove-video]')?.addEventListener('click', () => {
      video = '';
      renderImages();
      updateButtons();
    });
  }
  
  function updateButtons() {
    const addImgBtn = $('#addImageBtn');
    const addVidBtn = $('#addVideoBtn');
    if (images.length >= MAX_IMAGES) {
      addImgBtn.disabled = true;
      addImgBtn.innerHTML = `📷 الحد الأقصى (${MAX_IMAGES})`;
    } else {
      addImgBtn.disabled = false;
      addImgBtn.innerHTML = `📷 إضافة صورة (${images.length}/${MAX_IMAGES})`;
    }
    addVidBtn.innerHTML = `🎬 ${video ? 'تغيير الفيديو' : 'إضافة فيديو'}`;
  }
  
  renderImages();
  updateButtons();
  
  // ===== إدارة خيارات المنتج =====
  let optionGroups = (data.optionGroups || []).map(g => ({...g})); // نسخة قابلة للتعديل
  
  function renderOptionGroups() {
    const container = $('#optionsList');
    if (!optionGroups || optionGroups.length === 0) {
      container.innerHTML = '<p class="no-options">لم تضف خيارات بعد - منتج بدون خيارات</p>';
      return;
    }
    container.innerHTML = optionGroups.map((group, gi) => `
      <div class="option-group" data-group="${gi}">
        <div class="option-group-header">
          <input type="text" class="option-group-name" value="${escapeHtml(group.name || '')}" 
                 placeholder="اسم المجموعة (مثل: النوع، اللون)" data-group-name="${gi}" />
          <button type="button" class="btn-remove-group" data-remove-group="${gi}" title="حذف المجموعة">🗑️</button>
        </div>
        <div class="option-values">
          ${(group.values || []).map((val, vi) => `
            <div class="option-value-row">
              <input type="text" value="${escapeHtml(val)}" placeholder="مثال: ايفون"
                     data-group-val="${gi}-${vi}" />
              <button type="button" class="btn-remove-val" data-remove-val="${gi}-${vi}">×</button>
            </div>
          `).join('')}
          <button type="button" class="btn-add-value" data-add-value="${gi}">+ إضافة خيار</button>
        </div>
      </div>
    `).join('');
    attachOptionsEvents();
  }
  
  function attachOptionsEvents() {
    // اسم المجموعة
    document.querySelectorAll('[data-group-name]').forEach(input => {
      input.addEventListener('input', (e) => {
        const gi = parseInt(input.dataset.groupName);
        optionGroups[gi].name = e.target.value;
      });
    });
    // قيمة الخيار
    document.querySelectorAll('[data-group-val]').forEach(input => {
      input.addEventListener('input', (e) => {
        const [gi, vi] = input.dataset.groupVal.split('-').map(Number);
        optionGroups[gi].values[vi] = e.target.value;
      });
    });
    // حذف مجموعة
    document.querySelectorAll('[data-remove-group]').forEach(btn => {
      btn.addEventListener('click', () => {
        const gi = parseInt(btn.dataset.removeGroup);
        if (!confirm('حذف مجموعة الخيارات؟')) return;
        optionGroups.splice(gi, 1);
        renderOptionGroups();
      });
    });
    // حذف قيمة
    document.querySelectorAll('[data-remove-val]').forEach(btn => {
      btn.addEventListener('click', () => {
        const [gi, vi] = btn.dataset.removeVal.split('-').map(Number);
        optionGroups[gi].values.splice(vi, 1);
        renderOptionGroups();
      });
    });
    // إضافة قيمة
    document.querySelectorAll('[data-add-value]').forEach(btn => {
      btn.addEventListener('click', () => {
        const gi = parseInt(btn.dataset.addValue);
        if (!optionGroups[gi].values) optionGroups[gi].values = [];
        optionGroups[gi].values.push('');
        renderOptionGroups();
      });
    });
  }
  
  // إضافة مجموعة جديدة
  $('#addOptionGroup').addEventListener('click', () => {
    optionGroups.push({ name: '', values: [''] });
    renderOptionGroups();
  });
  
  renderOptionGroups();
  
  // معالج: تحديث الأقسام الفرعية عند تغيير القسم الرئيسي
  function updateSubcategories() {
    const catId = $('#pCategory').value;
    const cat = state.categories.find(c => c.id === catId);
    const subs = cat?.subcategories || [];
    const group = $('#subcategoryGroup');
    const select = $('#pSubcategory');
    
    if (subs.length === 0) {
      group.style.display = 'none';
      select.innerHTML = '<option value="">— لا قسم فرعي —</option>';
      return;
    }
    
    group.style.display = 'block';
    select.innerHTML = '<option value="">— لا قسم فرعي —</option>' + 
      subs.map(sc => `<option value="${sc.id}" ${data.subcategory === sc.id ? 'selected' : ''}>${sc.icon} ${escapeHtml(sc.name)}</option>`).join('');
  }
  
  $('#pCategory').addEventListener('change', updateSubcategories);
  updateSubcategories(); // عرض أولي
  
  // إضافة صور
  $('#addImageBtn').addEventListener('click', () => $('#imageInput').click());
  $('#imageInput').addEventListener('change', async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    const remaining = MAX_IMAGES - images.length;
    const filesToProcess = files.slice(0, remaining);
    
    if (files.length > remaining) {
      showToast(`تمت إضافة ${remaining} صور فقط (الحد ${MAX_IMAGES})`, 'error');
    }
    
    const btn = $('#addImageBtn');
    btn.disabled = true;
    btn.innerHTML = '⏳ جاري المعالجة...';
    
    for (const file of filesToProcess) {
      if (file.size > 10 * 1024 * 1024) {
        showToast(`تخطّي ${file.name} - حجم كبير`, 'error');
        continue;
      }
      try {
        const dataUrl = await processImage(file, 600, 0.82);
        images.push(dataUrl);
        renderImages();
      } catch (err) {
        showToast('فشلت معالجة صورة', 'error');
      }
    }
    updateButtons();
    e.target.value = ''; // مسح الإدخال للسماح برفع نفس الملف مجدداً
  });
  
  // إضافة فيديو
  $('#addVideoBtn').addEventListener('click', () => $('#videoInput').click());
  $('#videoInput').addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const progress = $('#videoProgress');
    progress.innerHTML = `
      <div class="video-progress">
        <p style="font-weight:700;font-size:13px;">⏳ جاري معالجة الفيديو...</p>
        <div class="progress-bar"><div class="progress-bar-fill" style="width:50%;"></div></div>
      </div>
    `;
    
    try {
      const dataUrl = await processVideo(file);
      video = dataUrl;
      progress.innerHTML = '';
      renderImages();
      updateButtons();
      showToast('✓ تمت إضافة الفيديو');
    } catch (err) {
      progress.innerHTML = '';
      showToast(err.message || 'فشلت معالجة الفيديو', 'error');
    }
    e.target.value = '';
  });
  
  // حفظ المنتج
  $('#saveProduct').addEventListener('click', async () => {
    const name = $('#pName').value.trim();
    const price = parseInt($('#pPrice').value);
    const oldPrice = $('#pOldPrice').value ? parseInt($('#pOldPrice').value) : null;
    const category = $('#pCategory').value;
    const subcategory = $('#pSubcategory')?.value || '';
    const description = $('#pDesc').value.trim();
    const stock = parseInt($('#pStock').value) || 0;
    const featured = $('#pFeatured').checked;
    const bogo = $('#pBogo').checked;
    
    if (!name || !price || images.length === 0) {
      showToast('يرجى تعبئة الاسم والسعر وإضافة صورة واحدة على الأقل', 'error');
      return;
    }
    
    const btn = $('#saveProduct');
    btn.disabled = true;
    btn.textContent = 'جاري الحفظ...';
    
    const productData = { 
      name, 
      price, 
      category,
      subcategory: subcategory || null,
      images,
      image: images[0],
      description, 
      stock, 
      featured,
      bogo,
      optionGroups: optionGroups
        .filter(g => g.name && g.name.trim() && g.values && g.values.some(v => v && v.trim()))
        .map(g => ({
          name: g.name.trim(),
          values: g.values.filter(v => v && v.trim()).map(v => v.trim())
        }))
    };
    if (oldPrice) productData.oldPrice = oldPrice;
    if (video) productData.video = video;
    else productData.video = null;
    
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

function renderAdminOrders() {
  const filtered = adminOrdersFilter === 'all' ? state.orders : state.orders.filter(o => o.status === adminOrdersFilter);
  
  if (state.orders.length === 0) {
    $('#adminContent').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📭</div>
        <p>لا توجد طلبات بعد</p>
        <p class="small">ستظهر الطلبات الواردة من المتجر هنا</p>
      </div>
    `;
    return;
  }
  
  $('#adminContent').innerHTML = `
    <div class="filter-bar">
      ${[
        {id:'all',label:'الكل'},
        {id:'pending',label:'قيد المعالجة'},
        {id:'confirmed',label:'مؤكد'},
        {id:'shipped',label:'قيد التوصيل'},
        {id:'delivered',label:'مُسلَّم'},
        {id:'cancelled',label:'ملغي'}
      ].map(f => `
        <button class="filter-btn ${adminOrdersFilter === f.id ? 'active' : ''}" data-filter="${f.id}">
          ${f.label} (${f.id === 'all' ? state.orders.length : state.orders.filter(o => o.status === f.id).length})
        </button>
      `).join('')}
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
                <p class="meta">${o.items?.length || 0} منتج • ${date}</p>
              </div>
              <div class="order-total">
                <div class="amount">${formatPrice(o.total)}</div>
                <div class="phone">${escapeHtml(o.customer?.phone || '')}</div>
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
  
  document.querySelectorAll('[data-filter]').forEach(b => {
    b.addEventListener('click', () => {
      adminOrdersFilter = b.dataset.filter;
      renderAdminOrders();
    });
  });
  
  document.querySelectorAll('[data-order]').forEach(c => {
    c.addEventListener('click', () => {
      const o = state.orders.find(x => x.id === c.dataset.order);
      if (o) showOrderDetail(o);
    });
  });
}

function showOrderDetail(order) {
  closeModal();
  const waPhone = (order.customer?.phone || '').replace(/\D/g, '').replace(/^0/, '964');
  
  const html = `
    <div class="modal-overlay" data-overlay>
      <div class="modal">
        <div class="modal-header">
          <h3>طلب #${escapeHtml(order.orderNumber || '')}</h3>
          <button class="close-btn" data-close>×</button>
        </div>
        <div class="modal-body">
          <div class="order-detail-section">
            <div class="order-detail-label">معلومات الزبون</div>
            <div class="name">${escapeHtml(order.customer?.name || '')}</div>
            <a href="tel:${escapeHtml(order.customer?.phone || '')}" class="order-contact-link">📞 ${escapeHtml(order.customer?.phone || '')}</a>
            <p style="font-size:14px;margin-top:4px;">📍 ${escapeHtml(order.customer?.governorate || '')} - ${escapeHtml(order.customer?.address || '')}</p>
            ${order.customer?.notes ? `<p style="font-size:12px;background:#fef9c3;padding:8px;border-radius:8px;margin-top:8px;">📝 ${escapeHtml(order.customer.notes)}</p>` : ''}
            <a href="https://wa.me/${waPhone}" target="_blank" class="order-contact-wa">💬 تواصل عبر واتساب</a>
          </div>
          
          <div>
            <div class="order-detail-label">المنتجات</div>
            ${(order.items || []).map(i => `
              <div class="order-item">
                <img src="${escapeHtml(i.image || '')}" alt="" onerror="this.style.opacity=0.3" />
                <div class="order-item-info">
                  <h5>${escapeHtml(i.name)}</h5>
                  ${i.selectedOptions && Object.keys(i.selectedOptions).length > 0 ? `
                    <p style="font-size:11px;color:var(--primary);font-weight:700;">
                      ${Object.entries(i.selectedOptions).map(([k, v]) => `${escapeHtml(k)}: ${escapeHtml(v)}`).join(' • ')}
                    </p>
                  ` : ''}
                  <p>الكمية: ${i.qty} × ${formatPrice(i.price)}</p>
                </div>
                <div class="item-total">${formatPrice(i.price * i.qty)}</div>
              </div>
            `).join('')}
            ${order.shipping !== undefined ? `
              <div class="order-summary-row" style="margin-top:8px;padding-top:8px;border-top:1px solid var(--border);">
                <span>المجموع:</span>
                <span><strong>${formatPrice(order.subtotal || order.total)}</strong></span>
              </div>
              ${order.bogoDiscount > 0 ? `
                <div class="order-summary-row" style="color:#16a34a;font-weight:700;">
                  <span>🎁 خصم 1+1=3 (${order.bogoFreeItems || 0} مجاناً):</span>
                  <span>−${formatPrice(order.bogoDiscount)}</span>
                </div>
              ` : ''}
              <div class="order-summary-row">
                <span>أجور التوصيل:</span>
                <span><strong>${order.shipping > 0 ? formatPrice(order.shipping) : 'مجاني 🎉'}</strong></span>
              </div>
            ` : ''}
            <div class="order-summary-row order-summary-total" style="margin-top:8px;padding-top:8px;border-top:2px solid var(--border);">
              <span>الإجمالي:</span>
              <span class="price" style="color:var(--primary);font-size:18px;font-weight:900;">${formatPrice(order.total)}</span>
            </div>
          </div>
          
          <div style="margin-top:16px;">
            <div class="order-detail-label">حالة الطلب</div>
            <div class="order-status-grid">
              ${[
                {id:'pending',label:'قيد المعالجة'},
                {id:'confirmed',label:'مؤكد'},
                {id:'shipped',label:'قيد التوصيل'},
                {id:'delivered',label:'تم التسليم'},
                {id:'cancelled',label:'ملغي'}
              ].map(s => `
                <button class="status-btn ${order.status === s.id ? 'active' : ''}" data-status="${s.id}">${s.label}</button>
              `).join('')}
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-delete-order" id="deleteOrder">🗑️ حذف الطلب</button>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', html);
  
  document.querySelectorAll('[data-close], [data-overlay]').forEach(el => {
    el.addEventListener('click', (e) => { if (e.target === el) closeModal(); });
  });
  
  document.querySelectorAll('[data-status]').forEach(b => {
    b.addEventListener('click', async () => {
      const ok = await updateOrderStatus(order.id, b.dataset.status);
      if (ok) {
        showToast('✓ تم التحديث');
        closeModal();
      }
    });
  });
  
  $('#deleteOrder').addEventListener('click', async () => {
    if (!confirm('حذف هذا الطلب؟')) return;
    const ok = await deleteOrder(order.id);
    if (ok) {
      showToast('✓ تم الحذف');
      closeModal();
    }
  });
}

// ===== الإعدادات =====
function renderAdminSettings() {
  const s = { ...state.settings };
  
  $('#adminContent').innerHTML = `
    <div class="settings-card">
      <h3>🏪 معلومات المتجر</h3>
      <div class="form-group">
        <label>اسم المتجر</label>
        <input type="text" id="setStoreName" value="${escapeHtml(s.storeName)}" />
      </div>
      <div class="form-group">
        <label>الوصف / الشعار</label>
        <input type="text" id="setTagline" value="${escapeHtml(s.tagline)}" />
      </div>
      <div class="form-group">
        <label>المدينة / العنوان</label>
        <input type="text" id="setCity" value="${escapeHtml(s.city)}" />
      </div>
      <div style="display:grid;grid-template-columns:1fr;gap:12px;">
        <div class="form-group">
          <label>رمز العملة</label>
          <input type="text" id="setCurrency" value="${escapeHtml(s.currency)}" />
        </div>
      </div>
      <p style="font-size:12px;color:var(--text-muted);background:var(--primary-light);padding:8px;border-radius:8px;">
        💡 إعدادات التوصيل والأقسام لها تبويبات مستقلة الآن في القائمة العلوية
      </p>
    </div>
    
    <div class="settings-card">
      <h3>💬 الواتساب وأزرار الطلب</h3>
      <div class="form-group">
        <label>رقم الواتساب (مع كود الدولة، بدون +)</label>
        <input type="text" id="setWaNumber" value="${escapeHtml(s.whatsappNumber)}" placeholder="9647700000000" style="direction:ltr;text-align:left;" />
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
        <div class="toggle-row-info">
          <p>الطلب من المتجر مباشرة</p>
          <p class="desc">نموذج بمعلومات الزبون والمحافظة</p>
        </div>
        <button class="toggle ${s.directCheckoutEnabled ? 'on' : ''}" data-toggle="directCheckoutEnabled"></button>
      </div>
      <div class="toggle-row">
        <div class="toggle-row-info">
          <p>الطلب عبر واتساب</p>
          <p class="desc">إرسال الطلب لرقم الواتساب</p>
        </div>
        <button class="toggle ${s.whatsappCheckoutEnabled ? 'on' : ''}" data-toggle="whatsappCheckoutEnabled"></button>
      </div>
    </div>
    
    <button class="btn-save-all" id="saveAllSettings">💾 حفظ جميع الإعدادات</button>
  `;
  
  // Toggles
  document.querySelectorAll('[data-toggle]').forEach(b => {
    b.addEventListener('click', () => {
      const key = b.dataset.toggle;
      s[key] = !s[key];
      b.classList.toggle('on', s[key]);
      if (key === 'floatingWhatsappEnabled') {
        $('#floatingPosition').style.display = s[key] ? 'block' : 'none';
      }
    });
  });
  
  document.querySelectorAll('[data-pos]').forEach(b => {
    b.addEventListener('click', () => {
      s.floatingWhatsappPosition = b.dataset.pos;
      document.querySelectorAll('[data-pos]').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
    });
  });
  
  $('#saveAllSettings').addEventListener('click', async () => {
    s.storeName = $('#setStoreName').value.trim();
    s.tagline = $('#setTagline').value.trim();
    s.city = $('#setCity').value.trim();
    s.currency = $('#setCurrency').value.trim();
    s.whatsappNumber = $('#setWaNumber').value.trim();
    s.phoneDisplay = $('#setPhoneDisplay').value.trim();
    
    const btn = $('#saveAllSettings');
    btn.disabled = true;
    btn.textContent = 'جاري الحفظ...';
    
    const ok = await saveSettings(s);
    if (ok) {
      showToast('✓ تم حفظ الإعدادات');
      btn.disabled = false;
      btn.textContent = '💾 حفظ جميع الإعدادات';
    }
  });
}

// ===== التصميم =====
function renderAdminTheme() {
  const s = { ...state.settings };
  const cur = THEMES[s.themeColor] || THEMES.red;
  const curStoreTheme = s.storeTheme || 'modern';
  
  $('#adminContent').innerHTML = `
    <div class="settings-card">
      <h3>✨ نمط المتجر</h3>
      <p style="font-size:13px;color:var(--text-muted);margin-bottom:12px;">اختر التصميم الذي يناسب علامتك التجارية</p>
      <div class="store-themes-grid">
        ${Object.entries(STORE_THEMES).map(([k, t]) => `
          <button class="store-theme-card ${curStoreTheme === k ? 'active' : ''}" data-store-theme="${k}">
            <div class="store-theme-preview store-theme-preview-${k}">
              <div class="preview-header"></div>
              <div class="preview-product"></div>
              <div class="preview-product"></div>
            </div>
            <div class="store-theme-info">
              <div class="store-theme-name">${t.icon} ${escapeHtml(t.name)}</div>
              <div class="store-theme-desc">${escapeHtml(t.description)}</div>
            </div>
            ${curStoreTheme === k ? '<div class="store-theme-check">✓</div>' : ''}
          </button>
        `).join('')}
      </div>
    </div>
    
    <div class="settings-card">
      <h3>🎨 لون المتجر الأساسي</h3>
      <div class="color-grid">
        ${Object.entries(THEMES).map(([k, t]) => `
          <button class="color-swatch ${s.themeColor === k ? 'active' : ''}" data-theme="${k}" style="background:${t.primary};"></button>
        `).join('')}
      </div>
      <p style="margin-top:12px;font-size:14px;color:var(--text-muted);">الحالي: <strong style="color:${cur.primary};" id="curThemeName">${cur.name}</strong></p>
    </div>
    
    <div class="settings-card">
      <h3>🖼️ خلفية المتجر</h3>
      <div class="bg-grid">
        ${Object.entries(BACKGROUNDS).map(([k, b]) => `
          <button class="bg-swatch ${s.backgroundStyle === k ? 'active' : ''}" data-bg="${k}" style="background:${b.color};color:${k === 'dark' ? '#fff' : '#1c1917'};">${b.name}</button>
        `).join('')}
      </div>
    </div>
    
    <div class="settings-card">
      <h3>⭐ القسم العلوي (Hero)</h3>
      <div class="toggle-row">
        <div class="toggle-row-info"><p>إظهار قسم Hero</p></div>
        <button class="toggle ${s.heroEnabled ? 'on' : ''}" data-toggle-theme="heroEnabled"></button>
      </div>
      <div id="heroFields" style="display:${s.heroEnabled ? 'block' : 'none'};margin-top:12px;">
        <div class="form-group">
          <label>شارة (Badge) أعلى العنوان</label>
          <input type="text" id="setHeroBadge" value="${escapeHtml(s.heroBadge)}" />
        </div>
        <div class="form-group">
          <label>العنوان الرئيسي</label>
          <input type="text" id="setHeroTitle" value="${escapeHtml(s.heroTitle)}" />
        </div>
      </div>
    </div>
    
    <div class="settings-card">
      <h3>🔔 شريط الإعلان العلوي</h3>
      <div class="toggle-row">
        <div class="toggle-row-info"><p>إظهار شريط الإعلان</p></div>
        <button class="toggle ${s.announcementEnabled ? 'on' : ''}" data-toggle-theme="announcementEnabled"></button>
      </div>
      <div id="announceFields" style="display:${s.announcementEnabled ? 'block' : 'none'};margin-top:12px;">
        <div class="form-group">
          <label>نص الإعلان</label>
          <textarea id="setAnnounceText" rows="2">${escapeHtml(s.announcementText)}</textarea>
        </div>
      </div>
    </div>
    
    <div class="preview-card" id="previewCard" style="background:linear-gradient(135deg,${cur.primary},${cur.dark});">
      <p style="font-size:12px;opacity:0.8;">معاينة الألوان:</p>
      <h4>${escapeHtml(s.storeName)}</h4>
      <p style="font-size:14px;opacity:0.9;">${escapeHtml(s.tagline)}</p>
      <button>تسوق الآن</button>
    </div>
    
    <button class="btn-save-all" id="saveTheme">💾 حفظ التصميم</button>
  `;
  
  document.querySelectorAll('[data-store-theme]').forEach(b => {
    b.addEventListener('click', () => {
      s.storeTheme = b.dataset.storeTheme;
      document.querySelectorAll('[data-store-theme]').forEach(x => {
        x.classList.remove('active');
        const check = x.querySelector('.store-theme-check');
        if (check) check.remove();
      });
      b.classList.add('active');
      if (!b.querySelector('.store-theme-check')) {
        b.insertAdjacentHTML('beforeend', '<div class="store-theme-check">✓</div>');
      }
    });
  });
  
  document.querySelectorAll('[data-theme]').forEach(b => {
    b.addEventListener('click', () => {
      s.themeColor = b.dataset.theme;
      document.querySelectorAll('[data-theme]').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      const t = THEMES[s.themeColor];
      $('#curThemeName').textContent = t.name;
      $('#curThemeName').style.color = t.primary;
      $('#previewCard').style.background = `linear-gradient(135deg, ${t.primary}, ${t.dark})`;
    });
  });
  
  document.querySelectorAll('[data-bg]').forEach(b => {
    b.addEventListener('click', () => {
      s.backgroundStyle = b.dataset.bg;
      document.querySelectorAll('[data-bg]').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
    });
  });
  
  document.querySelectorAll('[data-toggle-theme]').forEach(b => {
    b.addEventListener('click', () => {
      const key = b.dataset.toggleTheme;
      s[key] = !s[key];
      b.classList.toggle('on', s[key]);
      if (key === 'heroEnabled') $('#heroFields').style.display = s[key] ? 'block' : 'none';
      if (key === 'announcementEnabled') $('#announceFields').style.display = s[key] ? 'block' : 'none';
    });
  });
  
  $('#saveTheme').addEventListener('click', async () => {
    if ($('#setHeroBadge')) s.heroBadge = $('#setHeroBadge').value;
    if ($('#setHeroTitle')) s.heroTitle = $('#setHeroTitle').value;
    if ($('#setAnnounceText')) s.announcementText = $('#setAnnounceText').value;
    
    const btn = $('#saveTheme');
    btn.disabled = true;
    btn.textContent = 'جاري الحفظ...';
    
    const ok = await saveSettings(s);
    if (ok) {
      showToast('✓ تم حفظ التصميم');
      applyTheme();
      btn.disabled = false;
      btn.textContent = '💾 حفظ التصميم';
    }
  });
}

// ===== إدارة الأقسام =====
function renderAdminCategories() {
  const cats = state.categories || [];
  
  $('#adminContent').innerHTML = `
    <div class="settings-card">
      <h3>📂 أقسام المتجر</h3>
      <p style="font-size:13px;color:var(--text-muted);margin-bottom:12px;">
        أضف أقساماً رئيسية وأقساماً فرعية بداخلها. مثال: قسم "إلكترونيات" يحتوي "هواتف" و"سماعات".
      </p>
      
      <div id="categoriesList" class="categories-admin-list">
        ${cats.map((c, i) => `
          <div class="main-category-block">
            <div class="category-row main-cat-row">
              <button class="cat-toggle-subs" data-cat-toggle="${i}" title="عرض الأقسام الفرعية">▾</button>
              <div class="category-emoji-wrapper">
                <input type="text" class="category-emoji-input" data-cat-emoji="${i}" value="${escapeHtml(c.icon)}" maxlength="4" />
              </div>
              <input type="text" class="category-name-input" data-cat-name="${i}" value="${escapeHtml(c.name)}" placeholder="اسم القسم" />
              <div class="category-actions">
                <button class="cat-action-btn" data-cat-up="${i}" ${i === 0 ? 'disabled' : ''}>↑</button>
                <button class="cat-action-btn" data-cat-down="${i}" ${i === cats.length - 1 ? 'disabled' : ''}>↓</button>
                <button class="cat-action-btn cat-delete" data-cat-delete="${i}">🗑️</button>
              </div>
            </div>
            
            <div class="subcategories-block" id="subs-${i}">
              ${(c.subcategories || []).map((sc, si) => `
                <div class="category-row sub-cat-row">
                  <span class="sub-indicator">└</span>
                  <div class="category-emoji-wrapper">
                    <input type="text" class="category-emoji-input" data-subcat-emoji="${i}-${si}" value="${escapeHtml(sc.icon)}" maxlength="4" />
                  </div>
                  <input type="text" class="category-name-input" data-subcat-name="${i}-${si}" value="${escapeHtml(sc.name)}" placeholder="اسم القسم الفرعي" />
                  <div class="category-actions">
                    <button class="cat-action-btn cat-delete" data-subcat-delete="${i}-${si}">🗑️</button>
                  </div>
                </div>
              `).join('')}
              <button class="btn-add-subcategory" data-add-subcat="${i}">+ إضافة قسم فرعي إلى "${escapeHtml(c.name)}"</button>
            </div>
          </div>
        `).join('')}
      </div>
      
      <button class="btn-add-product" id="addNewCategory" style="width:100%;margin-top:12px;">
        + إضافة قسم رئيسي جديد
      </button>
    </div>
    
    <div class="settings-card" style="background:linear-gradient(135deg,#fef3c7,#fde68a);border:1px solid #fcd34d;">
      <h3 style="color:#92400e;">💡 كيف تعمل الأقسام الفرعية؟</h3>
      <ul style="padding:0;list-style:none;font-size:13px;line-height:2;color:#78350f;">
        <li>• عند الزبون يضغط على القسم الرئيسي، يظهر شريط الأقسام الفرعية</li>
        <li>• عند إضافة منتج، اختر القسم الرئيسي ثم القسم الفرعي (اختياري)</li>
        <li>• المنتجات بدون قسم فرعي تظهر في "الكل" داخل القسم الرئيسي</li>
        <li>• يمكنك ترك الأقسام الفرعية فارغة إذا لم تحتجها</li>
      </ul>
    </div>
    
    <button class="btn-save-all" id="saveCategoriesBtn">💾 حفظ الأقسام</button>
  `;
  
  let editingCats = JSON.parse(JSON.stringify(cats)); // نسخة عميقة
  
  // إضافة قسم رئيسي
  $('#addNewCategory').addEventListener('click', () => {
    const id = 'cat_' + Date.now();
    editingCats.push({ id, name: 'قسم جديد', icon: '📦', subcategories: [] });
    state.categories = editingCats;
    renderAdminCategories();
  });
  
  // حذف قسم رئيسي
  document.querySelectorAll('[data-cat-delete]').forEach(b => {
    b.addEventListener('click', () => {
      const idx = parseInt(b.dataset.catDelete);
      const cat = editingCats[idx];
      const subsCount = cat.subcategories?.length || 0;
      const msg = subsCount > 0 
        ? `حذف "${cat.name}" و${subsCount} قسم فرعي بداخله؟`
        : `حذف قسم "${cat.name}"؟`;
      if (!confirm(msg)) return;
      editingCats.splice(idx, 1);
      state.categories = editingCats;
      renderAdminCategories();
    });
  });
  
  // تحريك للأعلى
  document.querySelectorAll('[data-cat-up]').forEach(b => {
    b.addEventListener('click', () => {
      const idx = parseInt(b.dataset.catUp);
      if (idx === 0) return;
      [editingCats[idx-1], editingCats[idx]] = [editingCats[idx], editingCats[idx-1]];
      state.categories = editingCats;
      renderAdminCategories();
    });
  });
  
  // تحريك للأسفل
  document.querySelectorAll('[data-cat-down]').forEach(b => {
    b.addEventListener('click', () => {
      const idx = parseInt(b.dataset.catDown);
      if (idx >= editingCats.length - 1) return;
      [editingCats[idx], editingCats[idx+1]] = [editingCats[idx+1], editingCats[idx]];
      state.categories = editingCats;
      renderAdminCategories();
    });
  });
  
  // إضافة قسم فرعي
  document.querySelectorAll('[data-add-subcat]').forEach(b => {
    b.addEventListener('click', () => {
      const idx = parseInt(b.dataset.addSubcat);
      if (!editingCats[idx].subcategories) editingCats[idx].subcategories = [];
      editingCats[idx].subcategories.push({
        id: 'sub_' + Date.now(),
        name: 'قسم فرعي',
        icon: '📦'
      });
      state.categories = editingCats;
      renderAdminCategories();
    });
  });
  
  // حذف قسم فرعي
  document.querySelectorAll('[data-subcat-delete]').forEach(b => {
    b.addEventListener('click', () => {
      const [i, si] = b.dataset.subcatDelete.split('-').map(Number);
      const sc = editingCats[i].subcategories[si];
      if (!confirm(`حذف "${sc.name}"؟`)) return;
      editingCats[i].subcategories.splice(si, 1);
      state.categories = editingCats;
      renderAdminCategories();
    });
  });
  
  // تحديث الإيموجي والاسم - الأقسام الرئيسية
  document.querySelectorAll('[data-cat-emoji]').forEach(input => {
    input.addEventListener('input', (e) => {
      const idx = parseInt(input.dataset.catEmoji);
      editingCats[idx].icon = e.target.value;
    });
  });
  document.querySelectorAll('[data-cat-name]').forEach(input => {
    input.addEventListener('input', (e) => {
      const idx = parseInt(input.dataset.catName);
      editingCats[idx].name = e.target.value;
    });
  });
  
  // تحديث الإيموجي والاسم - الأقسام الفرعية
  document.querySelectorAll('[data-subcat-emoji]').forEach(input => {
    input.addEventListener('input', (e) => {
      const [i, si] = input.dataset.subcatEmoji.split('-').map(Number);
      editingCats[i].subcategories[si].icon = e.target.value;
    });
  });
  document.querySelectorAll('[data-subcat-name]').forEach(input => {
    input.addEventListener('input', (e) => {
      const [i, si] = input.dataset.subcatName.split('-').map(Number);
      editingCats[i].subcategories[si].name = e.target.value;
    });
  });
  
  // إخفاء/إظهار الأقسام الفرعية
  document.querySelectorAll('[data-cat-toggle]').forEach(b => {
    b.addEventListener('click', () => {
      const idx = b.dataset.catToggle;
      const block = $('#subs-' + idx);
      if (block.style.display === 'none') {
        block.style.display = 'block';
        b.textContent = '▾';
      } else {
        block.style.display = 'none';
        b.textContent = '▸';
      }
    });
  });
  
  // حفظ
  $('#saveCategoriesBtn').addEventListener('click', async () => {
    const cleaned = editingCats
      .filter(c => c.name && c.name.trim())
      .map(c => ({
        id: c.id || 'cat_' + Date.now() + Math.random(),
        name: c.name.trim(),
        icon: (c.icon || '📦').trim() || '📦',
        subcategories: (c.subcategories || [])
          .filter(sc => sc.name && sc.name.trim())
          .map(sc => ({
            id: sc.id || 'sub_' + Date.now() + Math.random(),
            name: sc.name.trim(),
            icon: (sc.icon || '📦').trim() || '📦'
          }))
      }));
    
    if (cleaned.length === 0) {
      showToast('يجب أن يكون هناك قسم واحد على الأقل', 'error');
      return;
    }
    
    const btn = $('#saveCategoriesBtn');
    btn.disabled = true;
    btn.textContent = 'جاري الحفظ...';
    
    const ok = await saveCategories(cleaned);
    if (ok) {
      showToast('✓ تم حفظ الأقسام');
      btn.disabled = false;
      btn.textContent = '💾 حفظ الأقسام';
    } else {
      btn.disabled = false;
      btn.textContent = '💾 حفظ الأقسام';
    }
  });
}

// ===== إدارة أجور التوصيل =====
function renderAdminShipping() {
  const s = { ...state.settings };
  
  $('#adminContent').innerHTML = `
    <div class="settings-card">
      <h3>🚚 إعدادات التوصيل</h3>
      <p style="font-size:13px;color:var(--text-muted);margin-bottom:12px;">
        تحكم في أجور التوصيل التي تُضاف لكل طلب
      </p>
      
      <div class="toggle-row">
        <div class="toggle-row-info">
          <p>تفعيل أجور التوصيل</p>
          <p class="desc">إذا كان معطّلاً، التوصيل مجاني لكل الطلبات</p>
        </div>
        <button class="toggle ${s.shippingEnabled ? 'on' : ''}" data-shipping-toggle="shippingEnabled"></button>
      </div>
      
      <div id="shippingDetails" style="display:${s.shippingEnabled ? 'block' : 'none'};">
        <div class="toggle-row" style="margin-top:12px;">
          <div class="toggle-row-info">
            <p>تكلفة موحدة لكل المحافظات</p>
            <p class="desc">مبلغ واحد للجميع (أبسط)</p>
          </div>
          <button class="toggle ${!s.shippingByGovernorate ? 'on' : ''}" id="modeUnified"></button>
        </div>
        
        <div id="unifiedMode" style="display:${!s.shippingByGovernorate ? 'block' : 'none'};margin-top:12px;">
          <div class="form-group">
            <label>أجور التوصيل (لكل طلب)</label>
            <input type="number" id="setShippingFee" value="${s.shippingFee}" placeholder="5000" />
          </div>
        </div>
        
        <div class="toggle-row" style="margin-top:12px;">
          <div class="toggle-row-info">
            <p>تكلفة مختلفة لكل محافظة</p>
            <p class="desc">حدّد مبلغ خاص لكل محافظة</p>
          </div>
          <button class="toggle ${s.shippingByGovernorate ? 'on' : ''}" id="modeByGov"></button>
        </div>
        
        <div id="byGovMode" style="display:${s.shippingByGovernorate ? 'block' : 'none'};margin-top:12px;">
          <p style="font-size:13px;color:var(--text-muted);margin-bottom:8px;">
            اترك المحافظة فارغة لتستخدم التكلفة الموحدة (${formatPrice(s.shippingFee)})
          </p>
          <div class="gov-shipping-list">
            ${IRAQI_GOVERNORATES.map(g => `
              <div class="gov-shipping-row">
                <label>${escapeHtml(g)}</label>
                <input type="number" data-gov="${escapeHtml(g)}" value="${s.governorateShipping?.[g] !== undefined ? s.governorateShipping[g] : ''}" placeholder="${s.shippingFee}" />
              </div>
            `).join('')}
          </div>
        </div>
        
        <div class="settings-divider" style="margin-top:16px;"></div>
        
        <div class="toggle-row">
          <div class="toggle-row-info">
            <p>توصيل مجاني للطلبات الكبيرة</p>
            <p class="desc">احذف أجور التوصيل عند تجاوز مبلغ معيّن</p>
          </div>
          <button class="toggle ${s.freeShippingEnabled ? 'on' : ''}" data-shipping-toggle="freeShippingEnabled"></button>
        </div>
        
        <div id="freeShippingMin" style="display:${s.freeShippingEnabled ? 'block' : 'none'};margin-top:12px;">
          <div class="form-group">
            <label>الحد الأدنى للتوصيل المجاني</label>
            <input type="number" id="setFreeShippingMin" value="${s.freeShippingMin}" placeholder="50000" />
            <p style="font-size:12px;color:var(--text-muted);margin-top:4px;">عند تجاوز هذا المبلغ، التوصيل مجاني</p>
          </div>
        </div>
      </div>
    </div>
    
    <div class="settings-card" style="background:linear-gradient(135deg,#dbeafe,#e0e7ff);border:1px solid #bfdbfe;">
      <h3 style="color:#1e40af;">📊 معاينة</h3>
      <p style="font-size:13px;line-height:1.8;color:#1e3a8a;" id="shippingPreview">
        ${s.shippingEnabled ? 
          (s.shippingByGovernorate ? 
            'التوصيل حسب المحافظة' :
            `التوصيل: ${formatPrice(s.shippingFee)} لكل طلب`) +
          (s.freeShippingEnabled ? `<br>توصيل مجاني للطلبات فوق ${formatPrice(s.freeShippingMin)}` : '')
          : 'التوصيل مجاني لجميع الطلبات 🎉'}
      </p>
    </div>
    
    <button class="btn-save-all" id="saveShippingBtn">💾 حفظ إعدادات التوصيل</button>
  `;
  
  // toggles عامة
  document.querySelectorAll('[data-shipping-toggle]').forEach(b => {
    b.addEventListener('click', () => {
      const key = b.dataset.shippingToggle;
      s[key] = !s[key];
      b.classList.toggle('on', s[key]);
      if (key === 'shippingEnabled') $('#shippingDetails').style.display = s[key] ? 'block' : 'none';
      if (key === 'freeShippingEnabled') $('#freeShippingMin').style.display = s[key] ? 'block' : 'none';
    });
  });
  
  // اختيار النمط (موحد / حسب المحافظة)
  $('#modeUnified').addEventListener('click', () => {
    s.shippingByGovernorate = false;
    $('#modeUnified').classList.add('on');
    $('#modeByGov').classList.remove('on');
    $('#unifiedMode').style.display = 'block';
    $('#byGovMode').style.display = 'none';
  });
  
  $('#modeByGov').addEventListener('click', () => {
    s.shippingByGovernorate = true;
    $('#modeByGov').classList.add('on');
    $('#modeUnified').classList.remove('on');
    $('#byGovMode').style.display = 'block';
    $('#unifiedMode').style.display = 'none';
  });
  
  // حفظ
  $('#saveShippingBtn').addEventListener('click', async () => {
    s.shippingFee = parseInt($('#setShippingFee')?.value) || 0;
    s.freeShippingMin = parseInt($('#setFreeShippingMin')?.value) || 0;
    
    // جمع تكاليف المحافظات
    const govShipping = {};
    document.querySelectorAll('[data-gov]').forEach(input => {
      const val = input.value.trim();
      if (val !== '') {
        govShipping[input.dataset.gov] = parseInt(val) || 0;
      }
    });
    s.governorateShipping = govShipping;
    
    const btn = $('#saveShippingBtn');
    btn.disabled = true;
    btn.textContent = 'جاري الحفظ...';
    
    const ok = await saveSettings(s);
    if (ok) {
      showToast('✓ تم حفظ إعدادات التوصيل');
      btn.disabled = false;
      btn.textContent = '💾 حفظ إعدادات التوصيل';
    } else {
      btn.disabled = false;
      btn.textContent = '💾 حفظ إعدادات التوصيل';
    }
  });
}

// ===== إدارة الكوبونات =====
function renderAdminCoupons() {
  const list = state.coupons || [];
  
  $('#adminContent').innerHTML = `
    <div class="settings-card">
      <h3>🏷️ كوبونات الخصم</h3>
      <p style="font-size:13px;color:var(--text-muted);margin-bottom:12px;">
        أنشئ أكواد خصم لزيادة المبيعات. الزبون يكتب الكود في السلة ليحصل على الخصم.
      </p>
      
      <div id="couponsList" class="coupons-admin-list">
        ${list.length === 0 ? `<p class="no-options">لا توجد كوبونات بعد</p>` : list.map((c, i) => `
          <div class="coupon-admin-row ${c.active === false ? 'inactive' : ''}">
            <div class="coupon-admin-info">
              <div class="coupon-admin-code">${escapeHtml(c.code)}</div>
              <div class="coupon-admin-details">
                ${c.type === 'percent' ? `${c.value}%` : formatPrice(c.value)} خصم
                ${c.minOrder ? ` • حد أدنى ${formatPrice(c.minOrder)}` : ''}
                ${c.expires ? ` • ينتهي ${c.expires}` : ''}
                ${c.active === false ? ' • <span style="color:var(--primary);">معطّل</span>' : ''}
              </div>
            </div>
            <div class="coupon-admin-actions">
              <button class="cat-action-btn" data-toggle-coupon="${i}" title="${c.active === false ? 'تفعيل' : 'تعطيل'}">${c.active === false ? '▶' : '⏸'}</button>
              <button class="cat-action-btn cat-delete" data-delete-coupon="${i}">🗑️</button>
            </div>
          </div>
        `).join('')}
      </div>
      
      <h4 style="margin-top:16px;font-size:14px;">إضافة كوبون جديد</h4>
      <div class="form-group">
        <label>كود الكوبون</label>
        <input type="text" id="newCouponCode" placeholder="مثال: SUMMER10" style="text-transform:uppercase;" />
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div class="form-group">
          <label>نوع الخصم</label>
          <select id="newCouponType">
            <option value="percent">نسبة مئوية %</option>
            <option value="fixed">مبلغ ثابت</option>
          </select>
        </div>
        <div class="form-group">
          <label>قيمة الخصم</label>
          <input type="number" id="newCouponValue" placeholder="10" />
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div class="form-group">
          <label>حد أدنى للطلب (اختياري)</label>
          <input type="number" id="newCouponMin" placeholder="0" />
        </div>
        <div class="form-group">
          <label>تاريخ الانتهاء (اختياري)</label>
          <input type="date" id="newCouponExpires" />
        </div>
      </div>
      <button class="btn-add-product" id="addCouponBtn" style="width:100%;">+ إضافة الكوبون</button>
    </div>
  `;
  
  $('#addCouponBtn').addEventListener('click', async () => {
    const code = $('#newCouponCode').value.trim().toUpperCase();
    const type = $('#newCouponType').value;
    const value = parseInt($('#newCouponValue').value);
    const minOrder = parseInt($('#newCouponMin').value) || 0;
    const expires = $('#newCouponExpires').value;
    
    if (!code || !value || value <= 0) {
      showToast('الرجاء إدخال كود وقيمة صحيحة', 'error');
      return;
    }
    if (list.find(c => c.code === code)) {
      showToast('هذا الكود موجود مسبقاً', 'error');
      return;
    }
    
    const newList = [...list, { code, type, value, minOrder, expires, active: true }];
    const ok = await saveCoupons(newList);
    if (ok) {
      showToast('✓ تم إضافة الكوبون');
      renderAdminCoupons();
    }
  });
  
  document.querySelectorAll('[data-delete-coupon]').forEach(b => {
    b.addEventListener('click', async () => {
      const idx = parseInt(b.dataset.deleteCoupon);
      if (!confirm(`حذف الكوبون "${list[idx].code}"؟`)) return;
      const newList = list.filter((_, i) => i !== idx);
      const ok = await saveCoupons(newList);
      if (ok) {
        showToast('تم الحذف');
        renderAdminCoupons();
      }
    });
  });
  
  document.querySelectorAll('[data-toggle-coupon]').forEach(b => {
    b.addEventListener('click', async () => {
      const idx = parseInt(b.dataset.toggleCoupon);
      const newList = [...list];
      newList[idx].active = newList[idx].active === false ? true : false;
      const ok = await saveCoupons(newList);
      if (ok) renderAdminCoupons();
    });
  });
}

// ===== الإحصائيات المتقدمة =====
function renderAdminAnalytics() {
  const orders = state.orders.filter(o => o.status !== 'cancelled');
  const totalRevenue = orders.reduce((s, o) => s + (o.total || 0), 0);
  const totalOrders = orders.length;
  const avgOrder = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
  
  // اليوم
  const today = new Date(); today.setHours(0,0,0,0);
  const todayOrders = orders.filter(o => {
    const t = o.createdAt?.toMillis ? o.createdAt.toMillis() : 0;
    return t >= today.getTime();
  });
  const todayRevenue = todayOrders.reduce((s, o) => s + (o.total || 0), 0);
  
  // هذا الأسبوع
  const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - 7);
  const weekOrders = orders.filter(o => {
    const t = o.createdAt?.toMillis ? o.createdAt.toMillis() : 0;
    return t >= weekStart.getTime();
  });
  const weekRevenue = weekOrders.reduce((s, o) => s + (o.total || 0), 0);
  
  // هذا الشهر
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);
  const monthOrders = orders.filter(o => {
    const t = o.createdAt?.toMillis ? o.createdAt.toMillis() : 0;
    return t >= monthStart.getTime();
  });
  const monthRevenue = monthOrders.reduce((s, o) => s + (o.total || 0), 0);
  
  // أكثر المنتجات مبيعاً
  const productSales = {};
  orders.forEach(o => (o.items || []).forEach(i => {
    if (!productSales[i.id]) productSales[i.id] = { name: i.name, qty: 0, revenue: 0 };
    productSales[i.id].qty += i.qty || 1;
    productSales[i.id].revenue += (i.price || 0) * (i.qty || 1);
  }));
  const topProducts = Object.entries(productSales)
    .sort((a, b) => b[1].qty - a[1].qty)
    .slice(0, 5);
  
  // أكثر المحافظات
  const govCount = {};
  orders.forEach(o => {
    const g = o.customer?.governorate;
    if (g) govCount[g] = (govCount[g] || 0) + 1;
  });
  const topGovs = Object.entries(govCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  
  // حالات الطلبات
  const statusCount = {
    pending: state.orders.filter(o => o.status === 'pending').length,
    confirmed: state.orders.filter(o => o.status === 'confirmed').length,
    shipping: state.orders.filter(o => o.status === 'shipping').length,
    delivered: state.orders.filter(o => o.status === 'delivered').length,
    cancelled: state.orders.filter(o => o.status === 'cancelled').length,
  };
  
  $('#adminContent').innerHTML = `
    <div class="settings-card">
      <h3>📈 إحصائيات المتجر</h3>
      <div class="stats-grid-big">
        <div class="stat-card-big" style="background:linear-gradient(135deg,#10b981,#059669);">
          <div class="stat-card-label">إجمالي المبيعات</div>
          <div class="stat-card-value">${formatPrice(totalRevenue)}</div>
          <div class="stat-card-sub">${totalOrders} طلب</div>
        </div>
        <div class="stat-card-big" style="background:linear-gradient(135deg,#3b82f6,#2563eb);">
          <div class="stat-card-label">اليوم</div>
          <div class="stat-card-value">${formatPrice(todayRevenue)}</div>
          <div class="stat-card-sub">${todayOrders.length} طلب</div>
        </div>
        <div class="stat-card-big" style="background:linear-gradient(135deg,#8b5cf6,#7c3aed);">
          <div class="stat-card-label">هذا الأسبوع</div>
          <div class="stat-card-value">${formatPrice(weekRevenue)}</div>
          <div class="stat-card-sub">${weekOrders.length} طلب</div>
        </div>
        <div class="stat-card-big" style="background:linear-gradient(135deg,#f59e0b,#d97706);">
          <div class="stat-card-label">هذا الشهر</div>
          <div class="stat-card-value">${formatPrice(monthRevenue)}</div>
          <div class="stat-card-sub">${monthOrders.length} طلب</div>
        </div>
        <div class="stat-card-big" style="background:linear-gradient(135deg,#ec4899,#db2777);">
          <div class="stat-card-label">متوسط الطلب</div>
          <div class="stat-card-value">${formatPrice(avgOrder)}</div>
          <div class="stat-card-sub">لكل طلب</div>
        </div>
        <div class="stat-card-big" style="background:linear-gradient(135deg,#06b6d4,#0891b2);">
          <div class="stat-card-label">المنتجات</div>
          <div class="stat-card-value">${state.products.length}</div>
          <div class="stat-card-sub">منتج</div>
        </div>
      </div>
    </div>
    
    <div class="settings-card">
      <h3>📦 حالات الطلبات</h3>
      <div class="status-stats">
        <div class="status-stat" style="background:#fef3c7;color:#92400e;">
          <span>📥 قيد المراجعة</span>
          <strong>${statusCount.pending}</strong>
        </div>
        <div class="status-stat" style="background:#dbeafe;color:#1e40af;">
          <span>✅ مؤكدة</span>
          <strong>${statusCount.confirmed}</strong>
        </div>
        <div class="status-stat" style="background:#ede9fe;color:#6b21a8;">
          <span>🚚 قيد الشحن</span>
          <strong>${statusCount.shipping}</strong>
        </div>
        <div class="status-stat" style="background:#d1fae5;color:#065f46;">
          <span>🎉 مسلّمة</span>
          <strong>${statusCount.delivered}</strong>
        </div>
        <div class="status-stat" style="background:#fee2e2;color:#991b1b;">
          <span>❌ ملغية</span>
          <strong>${statusCount.cancelled}</strong>
        </div>
      </div>
    </div>
    
    <div class="settings-card">
      <h3>🏆 أكثر المنتجات مبيعاً</h3>
      ${topProducts.length === 0 ? '<p class="no-options">لا توجد بيانات بعد</p>' : `
        <div class="top-list">
          ${topProducts.map((p, i) => `
            <div class="top-item">
              <div class="top-rank">#${i+1}</div>
              <div class="top-info">
                <div class="top-name">${escapeHtml(p[1].name)}</div>
                <div class="top-detail">${p[1].qty} قطعة • ${formatPrice(p[1].revenue)}</div>
              </div>
            </div>
          `).join('')}
        </div>
      `}
    </div>
    
    <div class="settings-card">
      <h3>📍 أكثر المحافظات طلباً</h3>
      ${topGovs.length === 0 ? '<p class="no-options">لا توجد بيانات بعد</p>' : `
        <div class="top-list">
          ${topGovs.map((g, i) => `
            <div class="top-item">
              <div class="top-rank">#${i+1}</div>
              <div class="top-info">
                <div class="top-name">${escapeHtml(g[0])}</div>
                <div class="top-detail">${g[1]} طلب</div>
              </div>
            </div>
          `).join('')}
        </div>
      `}
    </div>
    
    <div class="settings-card">
      <h3>📤 تصدير البيانات</h3>
      <button class="btn-add-product" id="exportOrdersBtn" style="width:100%;margin-bottom:8px;">📥 تصدير الطلبات (Excel)</button>
      <button class="btn-add-product" id="exportProductsBtn" style="width:100%;">📦 تصدير المنتجات (Excel)</button>
    </div>
  `;
  
  $('#exportOrdersBtn').addEventListener('click', () => exportOrdersCSV());
  $('#exportProductsBtn').addEventListener('click', () => exportProductsCSV());
}

// ===== تصدير CSV =====
function exportOrdersCSV() {
  if (state.orders.length === 0) {
    showToast('لا توجد طلبات للتصدير', 'error');
    return;
  }
  const headers = ['رقم الطلب','التاريخ','الاسم','الهاتف','المحافظة','العنوان','المنتجات','المجموع','الشحن','الإجمالي','الحالة','ملاحظات'];
  const rows = state.orders.map(o => {
    const date = o.createdAt?.toDate ? o.createdAt.toDate().toLocaleString('ar') : '';
    const items = (o.items || []).map(i => `${i.name} (${i.qty})`).join(' | ');
    return [
      o.orderNumber || '',
      date,
      o.customer?.name || '',
      o.customer?.phone || '',
      o.customer?.governorate || '',
      o.customer?.address || '',
      items,
      o.subtotal || o.total || 0,
      o.shipping || 0,
      o.total || 0,
      o.status || 'pending',
      o.customer?.notes || ''
    ];
  });
  downloadCSV('orders-' + Date.now() + '.csv', [headers, ...rows]);
  showToast('✓ تم التصدير');
}

function exportProductsCSV() {
  if (state.products.length === 0) {
    showToast('لا توجد منتجات', 'error');
    return;
  }
  const headers = ['الاسم','السعر','السعر القديم','المخزون','التصنيف','مميز','1+1=3','الوصف'];
  const rows = state.products.map(p => [
    p.name || '',
    p.price || 0,
    p.oldPrice || '',
    p.stock || 0,
    p.category || '',
    p.featured ? 'نعم' : 'لا',
    p.bogo ? 'نعم' : 'لا',
    p.description || ''
  ]);
  downloadCSV('products-' + Date.now() + '.csv', [headers, ...rows]);
  showToast('✓ تم التصدير');
}

function downloadCSV(filename, data) {
  const csv = data.map(row => 
    row.map(cell => {
      const s = String(cell ?? '').replace(/"/g, '""');
      return /[",\n]/.test(s) ? `"${s}"` : s;
    }).join(',')
  ).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ===== الزبائن =====
function renderAdminCustomers() {
  // استخراج الزبائن من الطلبات
  const customers = {};
  state.orders.forEach(o => {
    const phone = o.customer?.phone;
    if (!phone) return;
    if (!customers[phone]) {
      customers[phone] = {
        name: o.customer.name || '',
        phone: phone,
        governorate: o.customer.governorate || '',
        orderCount: 0,
        totalSpent: 0,
        lastOrder: 0
      };
    }
    customers[phone].orderCount++;
    if (o.status !== 'cancelled') customers[phone].totalSpent += (o.total || 0);
    const t = o.createdAt?.toMillis ? o.createdAt.toMillis() : 0;
    if (t > customers[phone].lastOrder) customers[phone].lastOrder = t;
  });
  
  const list = Object.values(customers).sort((a, b) => b.totalSpent - a.totalSpent);
  const vipThreshold = 100000; // فوق 100,000 = VIP
  
  $('#adminContent').innerHTML = `
    <div class="settings-card">
      <h3>👥 الزبائن (${list.length})</h3>
      <p style="font-size:13px;color:var(--text-muted);margin-bottom:12px;">
        قائمة الزبائن مرتّبة حسب إجمالي المشتريات. الزبائن فوق 100,000 د.ع هم زبائن VIP 👑
      </p>
      
      ${list.length === 0 ? '<p class="no-options">لا يوجد زبائن بعد</p>' : `
        <div class="customers-list">
          ${list.map(c => `
            <div class="customer-card ${c.totalSpent >= vipThreshold ? 'vip' : ''}">
              ${c.totalSpent >= vipThreshold ? '<div class="vip-badge">👑 VIP</div>' : ''}
              <div class="customer-name">${escapeHtml(c.name)}</div>
              <div class="customer-detail">
                📞 ${escapeHtml(c.phone)}
                ${c.governorate ? ` • 📍 ${escapeHtml(c.governorate)}` : ''}
              </div>
              <div class="customer-stats">
                <div class="customer-stat">
                  <div class="cs-value">${c.orderCount}</div>
                  <div class="cs-label">طلب</div>
                </div>
                <div class="customer-stat">
                  <div class="cs-value">${formatPrice(c.totalSpent)}</div>
                  <div class="cs-label">إجمالي</div>
                </div>
              </div>
              <a class="btn-customer-contact" href="https://wa.me/${c.phone.replace(/\D/g, '')}" target="_blank">💬 تواصل</a>
            </div>
          `).join('')}
        </div>
      `}
    </div>
  `;
}

// ===== المحتوى (FAQ + إعدادات إضافية) =====
function renderAdminContent() {
  const s = { ...state.settings };
  let faqs = [...(s.faqs || [])];
  
  function renderFaqs() {
    return faqs.map((f, i) => `
      <div class="faq-admin-row">
        <div class="faq-admin-fields">
          <input type="text" class="faq-q-input" data-faq-q="${i}" value="${escapeHtml(f.q)}" placeholder="السؤال" />
          <textarea class="faq-a-input" data-faq-a="${i}" rows="2" placeholder="الإجابة">${escapeHtml(f.a)}</textarea>
        </div>
        <button class="cat-action-btn cat-delete" data-faq-delete="${i}">🗑️</button>
      </div>
    `).join('');
  }
  
  $('#adminContent').innerHTML = `
    <div class="settings-card">
      <h3>🔔 إشعارات الطلبات</h3>
      <div class="toggle-row">
        <div class="toggle-row-info">
          <p>صوت تنبيه عند طلب جديد</p>
          <p class="desc">يصدر صوت ويهتز الجوال عند وصول طلب</p>
        </div>
        <button class="toggle ${s.soundOnNewOrder ? 'on' : ''}" data-content-toggle="soundOnNewOrder"></button>
      </div>
    </div>
    
    <div class="settings-card">
      <h3>📊 شارات المنتجات</h3>
      <div class="toggle-row">
        <div class="toggle-row-info">
          <p>إظهار "تم بيع X" / "باقي Y"</p>
          <p class="desc">يحفّز الزبائن للشراء بإظهار الإحصائيات</p>
        </div>
        <button class="toggle ${s.showProductCounter ? 'on' : ''}" data-content-toggle="showProductCounter"></button>
      </div>
    </div>
    
    <div class="settings-card">
      <h3>⏰ عداد تنازلي للعروض</h3>
      <div class="toggle-row">
        <div class="toggle-row-info">
          <p>تفعيل عرض محدود بوقت</p>
          <p class="desc">يظهر بانر عداد تنازلي في الصفحة الرئيسية</p>
        </div>
        <button class="toggle ${s.countdownEnabled ? 'on' : ''}" data-content-toggle="countdownEnabled"></button>
      </div>
      <div id="countdownDetails" style="display:${s.countdownEnabled ? 'block' : 'none'};">
        <div class="form-group">
          <label>نص العرض</label>
          <input type="text" id="countdownText" value="${escapeHtml(s.countdownText || '')}" />
        </div>
        <div class="form-group">
          <label>تاريخ ووقت الانتهاء</label>
          <input type="datetime-local" id="countdownEndDate" value="${s.countdownEndDate || ''}" />
        </div>
      </div>
    </div>
    
    <div class="settings-card">
      <h3>💯 برنامج النقاط</h3>
      <div class="toggle-row">
        <div class="toggle-row-info">
          <p>تفعيل نظام النقاط (Loyalty)</p>
          <p class="desc">الزبون يجمع نقاط مع كل طلب</p>
        </div>
        <button class="toggle ${s.loyaltyEnabled ? 'on' : ''}" data-content-toggle="loyaltyEnabled"></button>
      </div>
      <div id="loyaltyDetails" style="display:${s.loyaltyEnabled ? 'block' : 'none'};">
        <div class="form-group">
          <label>عدد النقاط لكل 1000 د.ع</label>
          <input type="number" id="loyaltyPointsPer1000" value="${s.loyaltyPointsPer1000 || 10}" />
        </div>
      </div>
    </div>
    
    <div class="settings-card">
      <h3>⭐ تقييمات الزبائن</h3>
      <div class="toggle-row">
        <div class="toggle-row-info">
          <p>تفعيل التقييمات</p>
          <p class="desc">الزبائن يقيّمون المنتجات بعد الشراء</p>
        </div>
        <button class="toggle ${s.reviewsEnabled ? 'on' : ''}" data-content-toggle="reviewsEnabled"></button>
      </div>
    </div>
    
    <div class="settings-card">
      <h3>❓ الأسئلة الشائعة</h3>
      <div class="toggle-row">
        <div class="toggle-row-info">
          <p>تفعيل صفحة الأسئلة الشائعة</p>
          <p class="desc">زر يظهر للزبون لرؤية الإجابات</p>
        </div>
        <button class="toggle ${s.faqEnabled ? 'on' : ''}" data-content-toggle="faqEnabled"></button>
      </div>
      <div id="faqsList">${renderFaqs()}</div>
      <button class="btn-add-product" id="addFaqBtn" style="width:100%;margin-top:8px;">+ إضافة سؤال جديد</button>
    </div>
    
    <button class="btn-save-all" id="saveContentBtn">💾 حفظ كل الإعدادات</button>
  `;
  
  // toggles
  document.querySelectorAll('[data-content-toggle]').forEach(b => {
    b.addEventListener('click', () => {
      const key = b.dataset.contentToggle;
      s[key] = !s[key];
      b.classList.toggle('on', s[key]);
      const detailsMap = {
        countdownEnabled: 'countdownDetails',
        loyaltyEnabled: 'loyaltyDetails'
      };
      if (detailsMap[key]) $('#' + detailsMap[key]).style.display = s[key] ? 'block' : 'none';
    });
  });
  
  // FAQs
  function attachFaqEvents() {
    document.querySelectorAll('[data-faq-q]').forEach(input => {
      input.addEventListener('input', e => {
        faqs[parseInt(input.dataset.faqQ)].q = e.target.value;
      });
    });
    document.querySelectorAll('[data-faq-a]').forEach(input => {
      input.addEventListener('input', e => {
        faqs[parseInt(input.dataset.faqA)].a = e.target.value;
      });
    });
    document.querySelectorAll('[data-faq-delete]').forEach(b => {
      b.addEventListener('click', () => {
        if (!confirm('حذف هذا السؤال؟')) return;
        faqs.splice(parseInt(b.dataset.faqDelete), 1);
        $('#faqsList').innerHTML = renderFaqs();
        attachFaqEvents();
      });
    });
  }
  attachFaqEvents();
  
  $('#addFaqBtn').addEventListener('click', () => {
    faqs.push({ q: '', a: '' });
    $('#faqsList').innerHTML = renderFaqs();
    attachFaqEvents();
  });
  
  // حفظ
  $('#saveContentBtn').addEventListener('click', async () => {
    s.countdownText = $('#countdownText')?.value || '';
    s.countdownEndDate = $('#countdownEndDate')?.value || '';
    s.loyaltyPointsPer1000 = parseInt($('#loyaltyPointsPer1000')?.value) || 10;
    s.faqs = faqs.filter(f => f.q.trim() && f.a.trim());
    
    const btn = $('#saveContentBtn');
    btn.disabled = true;
    btn.textContent = 'جاري الحفظ...';
    const ok = await saveSettings(s);
    if (ok) {
      showToast('✓ تم الحفظ');
      btn.textContent = '💾 حفظ كل الإعدادات';
      btn.disabled = false;
    }
  });
}

// ===== إدارة التقييمات =====
function renderAdminReviews() {
  const all = state.reviews || [];
  const pending = all.filter(r => !r.approved);
  const approved = all.filter(r => r.approved);
  
  // ربط كل تقييم بمنتجه
  function getProductInfo(productId) {
    const p = state.products.find(x => x.id === productId);
    return p ? { name: p.name, image: (p.images?.[0]) || p.image || '' } : { name: 'منتج محذوف', image: '' };
  }
  
  function renderReviewCard(r, isPending) {
    const info = getProductInfo(r.productId);
    const date = r.createdAt?.toDate ? r.createdAt.toDate().toLocaleDateString('ar') : '';
    return `
      <div class="review-admin-card ${isPending ? 'pending' : 'approved'}">
        <div class="review-admin-product">
          <img src="${escapeHtml(info.image)}" alt="" onerror="this.style.opacity=0.3" />
          <div class="review-admin-product-name">${escapeHtml(info.name)}</div>
        </div>
        <div class="review-admin-content">
          <div class="review-admin-header">
            <div>
              <strong>${escapeHtml(r.name || 'زبون')}</strong>
              ${renderStars(r.rating || 5, 'sm')}
            </div>
            <span class="review-date">${date}</span>
          </div>
          ${r.comment ? `<p class="review-comment">${escapeHtml(r.comment)}</p>` : '<p style="color:var(--text-muted);font-size:13px;">بدون تعليق</p>'}
          <div class="review-admin-actions">
            ${isPending ? `
              <button class="btn-approve-review" data-approve="${r.id}">✅ موافقة وعرض</button>
            ` : `
              <button class="btn-unapprove-review" data-unapprove="${r.id}">⏸️ إخفاء</button>
            `}
            <button class="btn-delete-review" data-delete-review="${r.id}">🗑️ حذف</button>
          </div>
        </div>
      </div>
    `;
  }
  
  $('#adminContent').innerHTML = `
    <div class="settings-card">
      <h3>⭐ التقييمات (${all.length})</h3>
      <p style="font-size:13px;color:var(--text-muted);margin-bottom:12px;">
        راجع التقييمات قبل ظهورها للزبائن. التقييمات السلبية يمكنك حذفها.
      </p>
      
      <div class="reviews-stats-row">
        <div class="review-stat-item" style="background:#fef3c7;color:#92400e;">
          <div class="rs-num">${pending.length}</div>
          <div class="rs-label">في الانتظار</div>
        </div>
        <div class="review-stat-item" style="background:#d1fae5;color:#065f46;">
          <div class="rs-num">${approved.length}</div>
          <div class="rs-label">مقبولة</div>
        </div>
        <div class="review-stat-item" style="background:#dbeafe;color:#1e40af;">
          <div class="rs-num">${all.length > 0 ? (all.reduce((s,r) => s+(r.rating||0), 0) / all.length).toFixed(1) : '0.0'}</div>
          <div class="rs-label">متوسط النجوم</div>
        </div>
      </div>
    </div>
    
    ${pending.length > 0 ? `
      <div class="settings-card">
        <h3>⏳ في انتظار الموافقة (${pending.length})</h3>
        ${pending.map(r => renderReviewCard(r, true)).join('')}
      </div>
    ` : ''}
    
    <div class="settings-card">
      <h3>✅ التقييمات المعروضة (${approved.length})</h3>
      ${approved.length === 0 ? '<p class="no-options">لا توجد تقييمات معروضة بعد</p>' : 
        approved.map(r => renderReviewCard(r, false)).join('')}
    </div>
  `;
  
  // معالجات
  document.querySelectorAll('[data-approve]').forEach(b => {
    b.addEventListener('click', async () => {
      const id = b.dataset.approve;
      b.disabled = true;
      const ok = await approveReview(id, true);
      if (ok) {
        showToast('✓ تمت الموافقة');
        renderAdminReviews();
      } else {
        b.disabled = false;
        showToast('فشلت العملية', 'error');
      }
    });
  });
  
  document.querySelectorAll('[data-unapprove]').forEach(b => {
    b.addEventListener('click', async () => {
      const id = b.dataset.unapprove;
      const ok = await approveReview(id, false);
      if (ok) {
        showToast('تم الإخفاء');
        renderAdminReviews();
      }
    });
  });
  
  document.querySelectorAll('[data-delete-review]').forEach(b => {
    b.addEventListener('click', async () => {
      if (!confirm('حذف هذا التقييم نهائياً؟')) return;
      const id = b.dataset.deleteReview;
      const ok = await deleteReview(id);
      if (ok) {
        showToast('تم الحذف');
        renderAdminReviews();
      }
    });
  });
}

// ===== التهيئة =====
async function init() {
  // مراقبة حالة تسجيل الدخول
  onAuthStateChanged(auth, (user) => {
    state.user = user;
    if (user) {
      // تم تسجيل الدخول كأدمن
      subscribeOrders();
      subscribeReviews();
      if (state.view !== 'admin') {
        state.view = 'admin';
      }
      renderAdmin();
    } else {
      // مستخدم عادي
      state.view = 'store';
      // إلغاء اشتراك الطلبات
      unsubscribeAll();
      subscribeProducts();
      subscribeReviews();
      render();
    }
  });
  
  // تحميل الإعدادات والأقسام والكوبونات والبيانات المحلية
  await loadSettings();
  await loadCategories();
  await loadCoupons();
  await loadReviews();
  loadLocalData();
  // تطبيق الوضع الليلي إن كان مفعلاً
  if (state.darkMode) document.body.classList.add('user-dark-mode');
  
  // إذا لم يكن هناك مستخدم، حمل المنتجات وارسم المتجر
  if (!state.user) {
    subscribeProducts();
    subscribeReviews();
    render();
  }
  
  // إخفاء شاشة التحميل
  setTimeout(() => {
    $('#loadingScreen').style.display = 'none';
    $('#app').style.display = 'block';
  }, 300);
}

// بدء التطبيق
init().catch(err => {
  console.error('فشل التهيئة:', err);
  $('#loadingScreen').innerHTML = `
    <div style="text-align:center;padding:24px;">
      <div style="font-size:48px;margin-bottom:16px;">⚠️</div>
      <h3 style="color:var(--primary);margin-bottom:8px;">خطأ في الاتصال</h3>
      <p style="color:var(--text-muted);">تأكد من اتصالك بالإنترنت ثم أعد تحميل الصفحة</p>
    </div>
  `;
});
