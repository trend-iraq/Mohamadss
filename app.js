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
  cream:{name:'كريمي',color:'#fafaf9'},
  white:{name:'أبيض',color:'#ffffff'},
  gray:{name:'رمادي',color:'#f3f4f6'},
  warm:{name:'دافئ',color:'#fff7ed'},
  cool:{name:'بارد',color:'#f8fafc'},
  dark:{name:'داكن',color:'#1c1917'},
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

// ===== الحالة العامة =====
const state = {
  settings: { ...DEFAULT_SETTINGS },
  products: [],
  orders: [],
  cart: [],
  category: 'all',
  search: '',
  view: 'store', // store | admin
  user: null,
  unsubscribers: [],
};

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

function subscribeProducts() {
  const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
  const unsub = onSnapshot(q, (snap) => {
    state.products = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (state.view === 'store') render();
    else if (state.view === 'admin') renderAdmin();
  }, (err) => {
    console.error('خطأ في تحميل المنتجات:', err);
  });
  state.unsubscribers.push(unsub);
}

function subscribeOrders() {
  if (!state.user) return;
  const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
  const unsub = onSnapshot(q, (snap) => {
    state.orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (state.view === 'admin') renderAdmin();
  }, (err) => {
    console.error('خطأ في تحميل الطلبات:', err);
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
      await addDoc(collection(db, 'products'), { ...data, createdAt: serverTimestamp() });
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
function addToCart(product) {
  const existing = state.cart.find(i => i.id === product.id);
  if (existing) {
    existing.qty++;
  } else {
    state.cart.push({ id: product.id, name: product.name, price: product.price, image: product.image, qty: 1 });
  }
  showToast('✓ تمت الإضافة إلى السلة');
  updateCartBadge();
}

function updateCartQty(id, delta) {
  const item = state.cart.find(i => i.id === id);
  if (!item) return;
  item.qty = Math.max(1, item.qty + delta);
  renderCart();
  updateCartBadge();
}

function removeFromCart(id) {
  state.cart = state.cart.filter(i => i.id !== id);
  renderCart();
  updateCartBadge();
}

function cartTotal() {
  return state.cart.reduce((s, i) => s + i.price * i.qty, 0);
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
  let msg = `🛍️ *طلب جديد من ${s.storeName}*\n\n`;
  state.cart.forEach((it, i) => {
    msg += `${i+1}. ${it.name}\n   ${it.qty} × ${formatPrice(it.price)} = ${formatPrice(it.price * it.qty)}\n\n`;
  });
  msg += `\n💰 *الإجمالي: ${formatPrice(cartTotal())}*\n\n`;
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
  
  const themeColorMeta = document.querySelector('meta[name="theme-color"]');
  if (themeColorMeta) themeColorMeta.setAttribute('content', t.primary);
}

// ===== العرض: المتجر =====
function render() {
  applyTheme();
  const s = state.settings;
  const filtered = state.products.filter(p => 
    (state.category === 'all' || p.category === state.category) &&
    (!state.search || (p.name || '').toLowerCase().includes(state.search.toLowerCase()))
  );
  const featured = state.products.filter(p => p.featured);
  const showHero = s.heroEnabled && state.category === 'all' && !state.search;
  const showFeatured = state.category === 'all' && !state.search && featured.length > 0;
  
  $('#app').innerHTML = `
    ${s.announcementEnabled ? `<div class="announcement-bar">${escapeHtml(s.announcementText)}</div>` : ''}
    <header class="header">
      <div class="header-content">
        <div class="logo">
          <div class="logo-icon">🔥</div>
          <div>
            <h1>${escapeHtml(s.storeName)}</h1>
            <p>TREND IRAQ</p>
          </div>
        </div>
        <div class="header-actions">
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
          ${CATEGORIES.map(c => `
            <button class="cat-btn ${state.category === c.id ? 'active' : ''}" data-cat="${c.id}">
              ${c.icon} ${escapeHtml(c.name)}
            </button>
          `).join('')}
        </div>
      </div>
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
        <h3>${state.search ? `نتائج: ${escapeHtml(state.search)}` : state.category === 'all' ? 'كل المنتجات' : escapeHtml(CATEGORIES.find(c => c.id === state.category)?.name || '')}</h3>
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
            <div class="logo-icon">🔥</div>
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
  return `
    <div class="product-card">
      <div class="product-image-wrapper" data-product-id="${p.id}" data-action="view-product">
        <img class="product-image" src="${escapeHtml(p.image || placeholderImg)}" alt="${escapeHtml(p.name)}" onerror="this.src='${placeholderImg}'" />
        ${discount > 0 ? `<div class="discount-badge">-${discount}%</div>` : ''}
        ${p.featured ? `<div class="featured-badge">🔥 تريند</div>` : ''}
      </div>
      <div class="product-info">
        <h4 class="product-name" data-product-id="${p.id}" data-action="view-product">${escapeHtml(p.name)}</h4>
        <div class="product-prices">
          <span class="price-current">${formatPrice(p.price)}</span>
          ${p.oldPrice ? `<span class="price-old">${formatPrice(p.oldPrice)}</span>` : ''}
        </div>
        <button class="btn-add-cart" data-product-id="${p.id}" data-action="add-cart">🛒 أضف للسلة</button>
      </div>
    </div>
  `;
}

function attachStoreEvents() {
  $('#searchInput')?.addEventListener('input', (e) => {
    state.search = e.target.value;
    clearTimeout(window._searchTimer);
    window._searchTimer = setTimeout(() => render(), 250);
  });
  
  document.querySelectorAll('[data-cat]').forEach(b => {
    b.addEventListener('click', () => {
      state.category = b.dataset.cat;
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
        if (p) addToCart(p);
      } else if (a === 'open-cart') {
        renderCart();
      } else if (a === 'admin-login') {
        showAdminLoginModal();
      } else if (a === 'scroll-products') {
        $('#products-section')?.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
}

// ===== المودالات =====
function closeModal() {
  document.querySelectorAll('.modal-overlay, .cart-drawer').forEach(m => m.remove());
}

function showProductModal(p) {
  closeModal();
  const discount = p.oldPrice ? Math.round((1 - p.price / p.oldPrice) * 100) : 0;
  const placeholderImg = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23e7e5e4" width="100" height="100"/></svg>';
  
  const html = `
    <div class="modal-overlay" data-overlay>
      <div class="modal product-modal">
        <div class="product-detail">
          <div class="product-detail-image">
            <img src="${escapeHtml(p.image || placeholderImg)}" alt="${escapeHtml(p.name)}" />
            <button class="product-detail-close" data-close>×</button>
            ${discount > 0 ? `<div class="discount-badge" style="top:12px;right:12px;font-size:14px;padding:6px 12px;">خصم ${discount}%</div>` : ''}
          </div>
          <div class="product-detail-info">
            <h2>${escapeHtml(p.name)}</h2>
            <div class="product-detail-prices">
              <span class="price-current">${formatPrice(p.price)}</span>
              ${p.oldPrice ? `<span class="price-old">${formatPrice(p.oldPrice)}</span>` : ''}
            </div>
            <p class="description">${escapeHtml(p.description || '')}</p>
            <div class="stock-info">
              <p>✓ متوفر${p.stock ? ` • ${p.stock} قطعة` : ''}</p>
              <p class="small">💵 الدفع عند الاستلام • 🚚 توصيل لجميع المحافظات</p>
            </div>
            <button class="btn-add-cart-large" data-add-from-modal="${p.id}">
              🛒 أضف للسلة
            </button>
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
    addToCart(p);
    closeModal();
  });
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
            ${state.cart.map(it => `
              <div class="cart-item">
                <img src="${escapeHtml(it.image)}" alt="${escapeHtml(it.name)}" />
                <div class="cart-item-info">
                  <h4>${escapeHtml(it.name)}</h4>
                  <div class="price">${formatPrice(it.price)}</div>
                  <div class="qty-controls">
                    <button class="qty-btn" data-cart-qty="${it.id}" data-delta="-1">−</button>
                    <span class="qty-display">${it.qty}</span>
                    <button class="qty-btn" data-cart-qty="${it.id}" data-delta="1">+</button>
                    <button class="btn-remove" data-cart-remove="${it.id}">🗑️</button>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
          <div class="cart-footer">
            <div class="cart-total">
              <span>الإجمالي:</span>
              <span>${formatPrice(total)}</span>
            </div>
            ${total < state.settings.freeShippingMin ? `
              <div class="shipping-hint">💡 أضف بقيمة ${formatPrice(state.settings.freeShippingMin - total)} للحصول على توصيل مجاني</div>
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
  
  $('[data-checkout]')?.addEventListener('click', () => {
    if (state.cart.length === 0) return;
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

function showCheckoutChoice() {
  closeModal();
  const html = `
    <div class="modal-overlay" data-overlay>
      <div class="modal" style="max-width:440px;">
        <div class="modal-header">
          <h3>كيف تريد إكمال طلبك؟</h3>
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
    el.addEventListener('click', (e) => { if (e.target === el) closeModal(); });
  });
  
  document.querySelectorAll('[data-choice]').forEach(b => {
    b.addEventListener('click', () => {
      const c = b.dataset.choice;
      closeModal();
      if (c === 'direct') showDirectCheckout();
      else checkoutWhatsApp();
    });
  });
}

function showDirectCheckout() {
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
          <div class="order-summary">
            <div class="order-summary-row"><span>عدد المنتجات:</span><span><strong>${cartCount()}</strong></span></div>
            <div class="order-summary-row"><span>طريقة الدفع:</span><span><strong>عند الاستلام 💵</strong></span></div>
            <div class="order-summary-row order-summary-total"><span>الإجمالي:</span><span class="price">${formatPrice(total)}</span></div>
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
    el.addEventListener('click', (e) => { if (e.target === el) closeModal(); });
  });
  
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
    
    const order = await createOrder({
      items: state.cart.map(i => ({ id: i.id, name: i.name, price: i.price, qty: i.qty, image: i.image })),
      total,
      customer: { name, phone, governorate: gov, address: addr, notes }
    });
    
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
              {id:'theme',label:'التصميم',icon:'🎨'}
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
            <img src="${escapeHtml(p.image || '')}" alt="" onerror="this.style.opacity=0.3" />
            <div class="product-row-info">
              <h4>
                ${escapeHtml(p.name)}
                ${p.featured ? '<span style="background:#fef9c3;color:#a16207;font-size:10px;padding:2px 6px;border-radius:4px;margin-right:4px;">تريند</span>' : ''}
              </h4>
              <div class="product-meta">
                <span class="price-tag">${formatPrice(p.price)}</span>
                <span>•</span>
                <span>${escapeHtml(CATEGORIES.find(c => c.id === p.category)?.name || '')}</span>
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

function showProductForm(product) {
  closeModal();
  const isEdit = !!product;
  const data = product || { name:'', price:'', oldPrice:'', category:'fashion', image:'', description:'', stock:10, featured:false };
  let useUrl = !!(data.image && data.image.startsWith('http'));
  let currentImage = data.image || '';
  
  const html = `
    <div class="modal-overlay" data-overlay>
      <div class="modal">
        <div class="modal-header">
          <h3>${isEdit ? 'تعديل منتج' : 'منتج جديد'}</h3>
          <button class="close-btn" data-close>×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>صورة المنتج <span class="req">*</span></label>
            <div id="imagePreviewContainer">
              ${currentImage ? `
                <div class="image-preview">
                  <img id="previewImg" src="${escapeHtml(currentImage)}" alt="" />
                  <button class="image-remove" id="removeImg">×</button>
                </div>
              ` : ''}
            </div>
            <div class="tabs-toggle">
              <button class="tab-toggle-btn ${!useUrl ? 'active' : ''}" id="tabUpload">📤 رفع صورة</button>
              <button class="tab-toggle-btn ${useUrl ? 'active' : ''}" id="tabUrl">🔗 رابط صورة</button>
            </div>
            <div id="uploadSection" style="display:${!useUrl ? 'block' : 'none'};">
              <input type="file" id="fileInput" accept="image/*" style="display:none;" />
              <div class="upload-area" id="dropZone">
                <div class="upload-icon">📤</div>
                <p>اضغط لاختيار صورة من جهازك</p>
                <p class="small">سيتم تصغيرها وضغطها تلقائياً (600×600)</p>
              </div>
            </div>
            <div id="urlSection" style="display:${useUrl ? 'block' : 'none'};">
              <input type="text" id="imageUrl" placeholder="https://..." value="${escapeHtml(currentImage.startsWith('http') ? currentImage : '')}" style="direction:ltr;text-align:left;" />
            </div>
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
                ${CATEGORIES.filter(c => c.id !== 'all').map(c => `
                  <option value="${c.id}" ${data.category === c.id ? 'selected' : ''}>${c.icon} ${c.name}</option>
                `).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>المخزون</label>
              <input type="number" id="pStock" value="${data.stock || 0}" />
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
          <button class="btn-save" id="saveProduct">${isEdit ? 'حفظ' : 'إضافة'}</button>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', html);
  
  document.querySelectorAll('[data-close], [data-overlay]').forEach(el => {
    el.addEventListener('click', (e) => { if (e.target === el) closeModal(); });
  });
  
  $('#tabUpload')?.addEventListener('click', () => {
    useUrl = false;
    $('#uploadSection').style.display = 'block';
    $('#urlSection').style.display = 'none';
    $('#tabUpload').classList.add('active');
    $('#tabUrl').classList.remove('active');
  });
  
  $('#tabUrl')?.addEventListener('click', () => {
    useUrl = true;
    $('#uploadSection').style.display = 'none';
    $('#urlSection').style.display = 'block';
    $('#tabUrl').classList.add('active');
    $('#tabUpload').classList.remove('active');
  });
  
  $('#dropZone')?.addEventListener('click', () => $('#fileInput').click());
  
  $('#fileInput')?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      showToast('حجم الصورة كبير جداً (الحد 10 ميجا)', 'error');
      return;
    }
    const dz = $('#dropZone');
    dz.innerHTML = '<div class="upload-icon">⏳</div><p>جاري المعالجة...</p>';
    try {
      const dataUrl = await processImage(file, 600, 0.82);
      currentImage = dataUrl;
      $('#imagePreviewContainer').innerHTML = `
        <div class="image-preview">
          <img id="previewImg" src="${dataUrl}" alt="" />
          <button class="image-remove" id="removeImg">×</button>
        </div>
      `;
      $('#removeImg').addEventListener('click', () => {
        currentImage = '';
        $('#imagePreviewContainer').innerHTML = '';
      });
      dz.innerHTML = '<div class="upload-icon">📤</div><p>اضغط لاختيار صورة من جهازك</p><p class="small">سيتم تصغيرها وضغطها تلقائياً (600×600)</p>';
    } catch (err) {
      showToast('فشلت معالجة الصورة', 'error');
      dz.innerHTML = '<div class="upload-icon">📤</div><p>اضغط لاختيار صورة من جهازك</p><p class="small">سيتم تصغيرها وضغطها تلقائياً (600×600)</p>';
    }
  });
  
  $('#removeImg')?.addEventListener('click', () => {
    currentImage = '';
    $('#imagePreviewContainer').innerHTML = '';
  });
  
  $('#saveProduct').addEventListener('click', async () => {
    const name = $('#pName').value.trim();
    const price = parseInt($('#pPrice').value);
    const oldPrice = $('#pOldPrice').value ? parseInt($('#pOldPrice').value) : null;
    const category = $('#pCategory').value;
    const description = $('#pDesc').value.trim();
    const stock = parseInt($('#pStock').value) || 0;
    const featured = $('#pFeatured').checked;
    let image = currentImage;
    if (useUrl) image = $('#imageUrl').value.trim();
    
    if (!name || !price || !image) {
      showToast('يرجى تعبئة الاسم والسعر والصورة', 'error');
      return;
    }
    
    const btn = $('#saveProduct');
    btn.disabled = true;
    btn.textContent = 'جاري الحفظ...';
    
    const productData = { name, price, category, image, description, stock, featured };
    if (oldPrice) productData.oldPrice = oldPrice;
    
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
                  <p>الكمية: ${i.qty} × ${formatPrice(i.price)}</p>
                </div>
                <div class="item-total">${formatPrice(i.price * i.qty)}</div>
              </div>
            `).join('')}
            <div class="order-summary-row order-summary-total" style="margin-top:12px;padding-top:12px;border-top:2px solid var(--border);">
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
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div class="form-group">
          <label>رمز العملة</label>
          <input type="text" id="setCurrency" value="${escapeHtml(s.currency)}" />
        </div>
        <div class="form-group">
          <label>حد التوصيل المجاني</label>
          <input type="number" id="setFreeShipping" value="${s.freeShippingMin}" />
        </div>
      </div>
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
    s.freeShippingMin = parseInt($('#setFreeShipping').value) || 0;
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
  
  $('#adminContent').innerHTML = `
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

// ===== التهيئة =====
async function init() {
  // مراقبة حالة تسجيل الدخول
  onAuthStateChanged(auth, (user) => {
    state.user = user;
    if (user) {
      // تم تسجيل الدخول كأدمن
      subscribeOrders();
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
      render();
    }
  });
  
  // تحميل الإعدادات
  await loadSettings();
  
  // إذا لم يكن هناك مستخدم، حمل المنتجات وارسم المتجر
  if (!state.user) {
    subscribeProducts();
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
