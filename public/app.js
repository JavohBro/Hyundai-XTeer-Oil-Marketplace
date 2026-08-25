// ════════════════════════════════════════════════════
//  Hyundai Xteer Oil – Telegram Mini App
// ════════════════════════════════════════════════════

const tg = window.Telegram?.WebApp;
if (tg) { tg.ready(); tg.expand(); }

// ─── State ───────────────────────────────────────────
const S = {
  page: 'catalog',
  prevPage: 'catalog',
  products: [],
  filteredProducts: [],
  activeCategory: 'all',
  searchQuery: '',
  cart: [],
  orders: [],
  profile: null,
  me: null,
  settings: { currency: 'UZS' },
  isAdmin: false,
  adminSection: 'stats',
  adminOrderFilter: 'all',
  editingProduct: null,
  newImageFiles: [],
  keepExistingImages: true,
};

// ─── API helper ──────────────────────────────────────
async function api(url, opts = {}) {
  const initData = tg?.initData || '';
  const isForm = opts.body instanceof FormData;
  const headers = { 'X-Init-Data': initData };
  if (!isForm) headers['Content-Type'] = 'application/json';
  Object.assign(headers, opts.headers || {});
  const res = await fetch(url, { ...opts, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Ошибка сети' }));
    throw new Error(err.error || 'Ошибка запроса');
  }
  return res.json();
}

// ─── Cart ─────────────────────────────────────────────
const Cart = {
  load() { S.cart = JSON.parse(localStorage.getItem('xteer_cart') || '[]'); },
  save() { localStorage.setItem('xteer_cart', JSON.stringify(S.cart)); },
  add(product, qty = 1) {
    const ex = S.cart.find(i => i.product_id === product.id);
    if (ex) ex.quantity = Math.min(ex.quantity + qty, product.quantity);
    else S.cart.push({ product_id: product.id, name: product.name, price: product.price, litres: product.litres, viscosity: product.viscosity, image: product.images?.[0] || '', quantity: qty, max: product.quantity });
    this.save();
    updateCartBadge();
  },
  remove(id) { S.cart = S.cart.filter(i => i.product_id !== id); this.save(); updateCartBadge(); },
  setQty(id, qty) {
    const item = S.cart.find(i => i.product_id === id);
    if (!item) return;
    if (qty <= 0) this.remove(id);
    else { item.quantity = Math.min(qty, item.max || 9999); this.save(); }
    updateCartBadge();
  },
  total() { return S.cart.reduce((t, i) => t + i.price * i.quantity, 0); },
  count() { return S.cart.reduce((t, i) => t + i.quantity, 0); },
  clear() { S.cart = []; this.save(); updateCartBadge(); },
};

// ─── Toast ────────────────────────────────────────────
let toastTimer;
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2500);
}

// ─── Alert / Confirm ──────────────────────────────────
function showAlert(msg) {
  if (tg?.showAlert) return new Promise(r => tg.showAlert(msg, r));
  return new Promise(r => { alert(msg); r(); });
}
function showConfirm(msg) {
  if (tg?.showConfirm) return new Promise(r => tg.showConfirm(msg, ok => r(ok)));
  return new Promise(r => r(confirm(msg)));
}

// ─── Format helpers ───────────────────────────────────
function fmt(price) { return price.toLocaleString('ru'); }
function fmtDate(str) {
  return new Date(str).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
const STATUS_LABELS = { pending: 'Ожидает', confirmed: 'Подтверждён', shipped: 'Отправлен', delivered: 'Доставлен', cancelled: 'Отменён' };

// ─── Cart badge ───────────────────────────────────────
function updateCartBadge() {
  const badge = document.getElementById('cart-badge');
  const cnt = Cart.count();
  if (cnt > 0) { badge.textContent = cnt > 99 ? '99+' : cnt; badge.classList.remove('hidden'); }
  else badge.classList.add('hidden');
}

// ─── Navigation ───────────────────────────────────────
function navigate(page, push = true) {
  if (page === S.page) return;
  const old = document.getElementById(`pg-${S.page}`);
  const next = document.getElementById(`pg-${page}`);
  if (!next) return;
  if (old) old.classList.remove('active');
  next.classList.add('active');
  if (push) S.prevPage = S.page;
  S.page = page;
  // Update nav buttons
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.page === page));
  // Back button
  const mainPages = ['catalog', 'cart', 'orders', 'profile', 'help', 'admin'];
  if (tg) {
    if (mainPages.includes(page)) tg.BackButton.hide();
    else { tg.BackButton.show(); }
  }
  // Render
  renderPage(page);
}

function goBack() {
  if (S.page === 'product') navigate(S.prevPage);
  else if (S.page === 'order-detail') navigate('orders');
  else navigate('catalog');
}

function renderPage(page) {
  switch (page) {
    case 'catalog':     renderCatalog(); break;
    case 'product':     /* rendered on open */ break;
    case 'cart':        renderCart(); break;
    case 'orders':      renderOrders(); break;
    case 'profile':     renderProfile(); break;
    case 'help':        renderHelp(); break;
    case 'admin':       renderAdmin(); break;
  }
}

// ─── CATALOG ─────────────────────────────────────────
async function renderCatalog() {
  const el = document.getElementById('pg-catalog');
  el.innerHTML = `
    <div class="page-header">
      <div class="header-row">
        <div>
          <h1>Hyundai Xteer Oil</h1>
          <p>Корейское качество для вашего авто</p>
        </div>
        <img src="/assets/LOGO_2.png" style="height:36px;border-radius:8px;object-fit:contain;" onerror="this.style.display='none'">
      </div>
    </div>
    <div class="search-bar">
      <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <input id="search-input" type="search" placeholder="Поиск масла..." value="${S.searchQuery}">
    </div>
    <div class="cat-scroll" id="cat-scroll"></div>
    <div class="product-grid" id="product-grid"></div>
    <div class="scroll-pad"></div>
  `;

  document.getElementById('search-input').addEventListener('input', e => {
    S.searchQuery = e.target.value;
    filterAndRenderProducts();
  });

  renderCatPills();

  if (S.products.length === 0) {
    try {
      S.products = await api('/api/products');
    } catch { S.products = []; }
  }
  filterAndRenderProducts();
}

const CATEGORIES = ['all', 'Моторное масло', 'Трансмиссионное масло', 'Гидравлическое масло', 'Другое'];
const CAT_LABELS = { all: 'Все', 'Моторное масло': 'Моторное', 'Трансмиссионное масло': 'Трансмиссионное', 'Гидравлическое масло': 'Гидравлическое', 'Другое': 'Другое' };

function renderCatPills() {
  const scroll = document.getElementById('cat-scroll');
  if (!scroll) return;
  scroll.innerHTML = CATEGORIES.map(c => `
    <button class="cat-pill ${S.activeCategory === c ? 'active' : ''}" data-cat="${c}">${CAT_LABELS[c]}</button>
  `).join('');
  scroll.querySelectorAll('.cat-pill').forEach(b => b.addEventListener('click', () => {
    S.activeCategory = b.dataset.cat;
    renderCatPills();
    filterAndRenderProducts();
  }));
}

function filterAndRenderProducts() {
  const grid = document.getElementById('product-grid');
  if (!grid) return;
  let list = S.products;
  if (S.activeCategory !== 'all') list = list.filter(p => p.category === S.activeCategory);
  if (S.searchQuery) {
    const q = S.searchQuery.toLowerCase();
    list = list.filter(p => p.name.toLowerCase().includes(q) || (p.viscosity || '').toLowerCase().includes(q) || (p.brand || '').toLowerCase().includes(q));
  }
  S.filteredProducts = list;
  if (list.length === 0) {
    grid.innerHTML = `<div class="empty" style="grid-column:span 2"><div class="empty-icon">🔍</div><div class="empty-title">Ничего не найдено</div><div class="empty-sub">Попробуйте изменить запрос</div></div>`;
    return;
  }
  grid.innerHTML = list.map(productCard).join('');
  grid.querySelectorAll('.product-card').forEach(c => c.addEventListener('click', () => openProduct(parseInt(c.dataset.id))));
  grid.querySelectorAll('.product-card-add').forEach(b => b.addEventListener('click', e => {
    e.stopPropagation();
    const p = S.products.find(pr => pr.id === parseInt(b.dataset.id));
    if (!p || p.quantity <= 0) return;
    Cart.add(p);
    b.classList.add('pop');
    setTimeout(() => b.classList.remove('pop'), 250);
    toast(`${p.name} добавлен в корзину`);
  }));
}

function productCard(p) {
  const img = p.images?.[0] ? `<img src="${p.images[0]}" alt="" loading="lazy">` : `<div class="no-img">🛢</div>`;
  const inStock = p.quantity > 0;
  return `
  <div class="product-card ${!inStock ? 'out-of-stock' : ''}" data-id="${p.id}">
    <div class="product-card-img">
      ${img}
      ${!inStock ? '<span class="out-of-stock-tag">Нет в наличии</span>' : ''}
    </div>
    <div class="product-card-body">
      <div class="product-card-name">${p.name}</div>
      <div class="product-card-sub">${[p.viscosity, p.litres].filter(Boolean).join(' · ') || p.brand || ''}</div>
      <div class="product-card-footer">
        <div class="product-card-price">${fmt(p.price)} <span style="font-size:11px;font-weight:400;color:var(--text2)">${S.settings.currency}</span></div>
        ${inStock ? `<button class="product-card-add" data-id="${p.id}">+</button>` : ''}
      </div>
    </div>
  </div>`;
}

// ─── PRODUCT DETAIL ───────────────────────────────────
function openProduct(id) {
  const p = S.products.find(pr => pr.id === id);
  if (!p) return;
  S.prevPage = S.page;
  const el = document.getElementById('pg-product');
  el.innerHTML = renderProductDetail(p);
  document.querySelectorAll('.page').forEach(pg => pg.classList.remove('active'));
  el.classList.add('active');
  S.page = 'product';
  if (tg) { tg.BackButton.show(); }
  initCarousel(p.images || []);
  initQtyControls(p);
}

function renderProductDetail(p) {
  const imgs = p.images && p.images.length > 0 ? p.images : [];
  const slideHTML = imgs.length
    ? imgs.map(img => `<div class="carousel-slide"><img src="${img}" alt=""></div>`).join('')
    : `<div class="carousel-slide"><div class="no-img-lg">🛢</div></div>`;
  const dots = imgs.length > 1 ? `<div class="carousel-dots">${imgs.map((_, i) => `<div class="dot ${i === 0 ? 'active' : ''}"></div>`).join('')}</div>` : '';
  const tags = [p.category, p.viscosity, p.litres ? `${p.litres}` : ''].filter(Boolean).map(t => `<span class="tag">${t}</span>`).join('');
  const inStock = p.quantity > 0;
  return `
  <div class="product-detail-back">
    <button class="back-btn" id="pd-back"><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>Назад</button>
  </div>
  <div class="carousel" id="carousel">
    <div class="carousel-track-wrap"><div class="carousel-track" id="carousel-track">${slideHTML}</div></div>
    ${dots}
  </div>
  <div class="product-info">
    <div class="product-title">${p.name}</div>
    <div class="product-brand">${p.brand || ''}</div>
    <div class="product-tags">${tags}</div>
    <div class="product-price-row">
      <div class="product-price">${fmt(p.price)}</div>
      <div class="product-price-cur">${S.settings.currency}</div>
    </div>
    ${p.description ? `<div class="product-desc">${p.description}</div>` : ''}
    ${inStock ? `
    <div class="qty-row">
      <div class="qty-label">Количество</div>
      <div class="qty-ctrl">
        <button class="qty-btn" id="qty-minus">−</button>
        <input class="qty-val" id="qty-val" type="text" inputmode="numeric" value="1">
        <button class="qty-btn" id="qty-plus">+</button>
      </div>
    </div>
    <div class="stock-note">В наличии: ${p.quantity} шт.</div>
    <button class="btn btn-primary btn-full" id="pd-add-cart">Добавить в корзину</button>
    ` : `<div class="empty-icon" style="text-align:center;font-size:40px;margin:20px 0">😔</div><div style="text-align:center;color:var(--text2);font-size:15px;margin-bottom:20px">Нет в наличии</div>`}
  </div>
  <div class="scroll-pad"></div>
  `;
}

function initCarousel(imgs) {
  if (imgs.length <= 1) return;
  const track = document.getElementById('carousel-track');
  const dots = document.querySelectorAll('.dot');
  let cur = 0;
  let startX = 0;

  function goTo(i) {
    cur = Math.max(0, Math.min(i, imgs.length - 1));
    track.style.transform = `translateX(${-cur * 100}%)`;
    dots.forEach((d, idx) => d.classList.toggle('active', idx === cur));
  }

  track.parentElement.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
  track.parentElement.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 40) goTo(dx < 0 ? cur + 1 : cur - 1);
  }, { passive: true });
}

function initQtyControls(p) {
  const minus = document.getElementById('qty-minus');
  const plus  = document.getElementById('qty-plus');
  const val   = document.getElementById('qty-val');
  const addBtn = document.getElementById('pd-add-cart');
  const backBtn = document.getElementById('pd-back');
  if (backBtn) backBtn.addEventListener('click', goBack);
  if (!minus) return;

  const clamp = v => {
    const n = parseInt(v, 10);
    if (!n || n < 1) return 1;
    return Math.min(n, p.quantity);
  };
  // Free typing while entering, clamped once the field is left
  val.addEventListener('input', () => { val.value = val.value.replace(/\D/g, ''); });
  val.addEventListener('blur', () => {
    if (parseInt(val.value, 10) > p.quantity) toast(`Доступно только ${p.quantity} шт.`);
    val.value = clamp(val.value);
  });
  val.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); val.blur(); } });

  minus.addEventListener('click', () => { val.value = clamp(clamp(val.value) - 1); });
  plus.addEventListener('click', () => {
    const cur = clamp(val.value);
    if (cur >= p.quantity) return toast(`Доступно только ${p.quantity} шт.`);
    val.value = cur + 1;
  });
  addBtn.addEventListener('click', () => {
    Cart.add(p, clamp(val.value));
    toast(`${p.name} добавлен в корзину`);
    val.value = 1;
    tg?.HapticFeedback?.notificationOccurred('success');
  });
}

// ─── CART ─────────────────────────────────────────────
function renderCart() {
  const el = document.getElementById('pg-cart');
  if (S.cart.length === 0) {
    el.innerHTML = `
      <div class="page-header"><h1>Корзина</h1></div>
      <div class="empty">
        <div class="empty-icon">🛒</div>
        <div class="empty-title">Корзина пуста</div>
        <div class="empty-sub">Добавьте товары из каталога</div>
        <button class="btn btn-primary" style="margin-top:8px" onclick="navigate('catalog')">Перейти в каталог</button>
      </div>`;
    return;
  }
  const total = Cart.total();
  el.innerHTML = `
    <div class="page-header"><h1>Корзина</h1><p>${Cart.count()} товар(а/ов)</p></div>
    <div class="cart-list" id="cart-list"></div>
    <div class="notes-section">
      <label>Комментарий к заказу (необязательно)</label>
      <textarea class="form-textarea" id="cart-notes" rows="2" placeholder="Например: позвоните за час до доставки"></textarea>
    </div>
    <div class="cart-summary">
      <div class="cart-summary-row"><span>Товаров</span><span>${Cart.count()} шт.</span></div>
      <div class="cart-summary-total"><span>Итого</span><span>${fmt(total)} ${S.settings.currency}</span></div>
    </div>
    <div class="cart-actions">
      <button class="btn btn-primary btn-full" id="checkout-btn">Оформить заказ</button>
    </div>
    <div class="scroll-pad"></div>`;

  const list = document.getElementById('cart-list');
  list.innerHTML = S.cart.map(cartItem).join('');
  bindCartEvents();
  document.getElementById('checkout-btn').addEventListener('click', doCheckout);
}

function cartItem(item) {
  const img = item.image ? `<img src="${item.image}" alt="">` : `<div class="no-img-sm">🛢</div>`;
  const sub = [item.litres, item.viscosity].filter(Boolean).join(' · ');
  return `
  <div class="cart-item" data-id="${item.product_id}">
    <div class="cart-item-img">${img}</div>
    <div class="cart-item-info">
      <div class="cart-item-name">${item.name}</div>
      ${sub ? `<div class="cart-item-sub">${sub}</div>` : ''}
      <div class="cart-item-footer">
        <div class="cart-item-price">${fmt(item.price * item.quantity)} ${S.settings.currency}</div>
        <div style="display:flex;align-items:center;gap:4px">
          <div class="cart-qty-ctrl">
            <button class="cart-qty-btn cart-minus" data-id="${item.product_id}">−</button>
            <input class="cart-qty-val cart-qty-input" type="text" inputmode="numeric" data-id="${item.product_id}" value="${item.quantity}">
            <button class="cart-qty-btn cart-plus" data-id="${item.product_id}">+</button>
          </div>
          <button class="cart-remove cart-del" data-id="${item.product_id}">✕</button>
        </div>
      </div>
    </div>
  </div>`;
}

function bindCartEvents() {
  document.querySelectorAll('.cart-minus').forEach(b => b.addEventListener('click', () => {
    const id = parseInt(b.dataset.id);
    const item = S.cart.find(i => i.product_id === id);
    if (item) Cart.setQty(id, item.quantity - 1);
    renderCart();
  }));
  document.querySelectorAll('.cart-plus').forEach(b => b.addEventListener('click', () => {
    const id = parseInt(b.dataset.id);
    const item = S.cart.find(i => i.product_id === id);
    if (!item) return;
    if (item.quantity >= (item.max || 9999)) { toast(`Доступно только ${item.max} шт.`); return; }
    Cart.setQty(id, item.quantity + 1);
    renderCart();
  }));
  document.querySelectorAll('.cart-del').forEach(b => b.addEventListener('click', () => {
    Cart.remove(parseInt(b.dataset.id));
    renderCart();
  }));
  // Typed quantity: commit on blur/Enter so the list isn't re-rendered mid-entry
  document.querySelectorAll('.cart-qty-input').forEach(inp => {
    inp.addEventListener('input', () => { inp.value = inp.value.replace(/\D/g, ''); });
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); inp.blur(); } });
    inp.addEventListener('change', () => {
      const id = parseInt(inp.dataset.id);
      const item = S.cart.find(i => i.product_id === id);
      if (!item) return;
      let v = parseInt(inp.value, 10);
      if (!v || v < 1) v = 1;
      if (v > (item.max || 9999)) { v = item.max; toast(`Доступно только ${item.max} шт.`); }
      Cart.setQty(id, v);
      renderCart();
    });
  });
}

async function doCheckout() {
  if (!S.profile || !S.profile.full_name || !S.profile.phone) {
    await showAlert('Для оформления заказа заполните профиль (ФИО, телефон, адрес).');
    navigate('profile');
    return;
  }
  const notes = document.getElementById('cart-notes')?.value || '';
  const ok = await showConfirm(
    `Подтвердить заказ?\n\n` +
    `Сумма: ${fmt(Cart.total())} ${S.settings.currency}\n` +
    `Доставка: ${S.profile.city}, ${S.profile.address}\n` +
    `Телефон: ${S.profile.phone}`
  );
  if (!ok) return;

  const btn = document.getElementById('checkout-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Оформляем...'; }

  try {
    const result = await api('/api/orders', {
      method: 'POST',
      body: JSON.stringify({ items: S.cart.map(i => ({ product_id: i.product_id, quantity: i.quantity })), notes })
    });
    Cart.clear();
    // Reload products to update stock
    S.products = await api('/api/products').catch(() => S.products);
    await showAlert(`✅ Заказ #${result.order_id} оформлен!\n\nМы отправили подтверждение в Telegram. Ожидайте звонка для уточнения доставки.`);
    navigate('orders');
  } catch (e) {
    await showAlert(e.message || 'Ошибка при оформлении заказа');
    if (btn) { btn.disabled = false; btn.textContent = 'Оформить заказ'; }
  }
}

// ─── ORDERS ───────────────────────────────────────────
async function renderOrders() {
  const el = document.getElementById('pg-orders');
  el.innerHTML = `<div class="page-header"><h1>Мои заказы</h1></div><div style="text-align:center;padding:40px"><div class="spinner" style="margin:auto"></div></div>`;
  try {
    S.orders = await api('/api/orders');
    renderOrdersList(el);
  } catch {
    el.innerHTML = `<div class="page-header"><h1>Мои заказы</h1></div><div class="empty"><div class="empty-icon">❌</div><div class="empty-title">Ошибка загрузки</div></div>`;
  }
}

function renderOrdersList(el) {
  if (S.orders.length === 0) {
    el.innerHTML = `
      <div class="page-header"><h1>Мои заказы</h1></div>
      <div class="empty">
        <div class="empty-icon">📋</div>
        <div class="empty-title">Заказов пока нет</div>
        <div class="empty-sub">Оформите первый заказ в каталоге</div>
        <button class="btn btn-primary" style="margin-top:8px" onclick="navigate('catalog')">В каталог</button>
      </div>`;
    return;
  }
  el.innerHTML = `
    <div class="page-header"><h1>Мои заказы</h1><p>${S.orders.length} заказ(ов)</p></div>
    <div class="order-list">${S.orders.map(orderCard).join('')}</div>
    <div class="scroll-pad"></div>`;
  el.querySelectorAll('.order-card').forEach(c => c.addEventListener('click', () => openOrderDetail(parseInt(c.dataset.id))));
}

function orderCard(o) {
  const preview = o.items.slice(0, 2).map(i => i.name).join(', ') + (o.items.length > 2 ? ` +${o.items.length - 2}` : '');
  return `
  <div class="order-card" data-id="${o.id}">
    <div class="order-card-header">
      <div><div class="order-id">Заказ #${o.id}</div><div class="order-date">${fmtDate(o.created_at)}</div></div>
      <div class="status-badge status-${o.status}">${STATUS_LABELS[o.status]}</div>
    </div>
    <div class="order-items-preview">${preview}</div>
    <div class="order-footer">
      <div class="order-total">${fmt(o.total_price)} ${o.currency}</div>
      <svg viewBox="0 0 24 24" style="width:16px;height:16px;color:var(--text2)"><polyline points="9 18 15 12 9 6"/></svg>
    </div>
  </div>`;
}

function openOrderDetail(id) {
  const o = S.orders.find(ord => ord.id === id);
  if (!o) return;
  const el = document.getElementById('pg-orders');
  el.innerHTML = `
    <div class="product-detail-back">
      <button class="back-btn" id="order-back"><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>Заказы</button>
    </div>
    <div class="order-detail">
      <div class="header-row" style="margin-bottom:16px">
        <div><div class="order-id">Заказ #${o.id}</div><div class="order-date">${fmtDate(o.created_at)}</div></div>
        <div class="status-badge status-${o.status}">${STATUS_LABELS[o.status]}</div>
      </div>
      <div class="section-title">Состав заказа</div>
      <div class="order-detail-items">
        ${o.items.map(i => `
          <div class="order-detail-item">
            <div class="order-detail-item-name">${i.name}${i.litres ? ` (${i.litres})` : ''}${i.viscosity ? ` ${i.viscosity}` : ''} × ${i.quantity}</div>
            <div class="order-detail-item-price">${fmt(i.subtotal)} ${o.currency}</div>
          </div>`).join('')}
        <div class="divider" style="margin:10px 0"></div>
        <div class="order-detail-item">
          <div style="font-weight:700">Итого</div>
          <div style="font-weight:700">${fmt(o.total_price)} ${o.currency}</div>
        </div>
      </div>
      <div class="section-title">Доставка</div>
      <div class="order-info-row"><span class="order-info-label">Город</span><span>${o.city || '—'}</span></div>
      <div class="order-info-row"><span class="order-info-label">Адрес</span><span>${o.address || '—'}</span></div>
      <div class="order-info-row"><span class="order-info-label">Телефон</span><span>${o.phone || '—'}</span></div>
      ${o.notes ? `<div class="order-info-row"><span class="order-info-label">Примечание</span><span>${o.notes}</span></div>` : ''}
    </div>
    <div class="scroll-pad"></div>`;
  document.getElementById('order-back').addEventListener('click', () => renderOrders());
}

// ─── PROFILE ──────────────────────────────────────────
function renderProfile() {
  const el = document.getElementById('pg-profile');
  const u = S.me;
  const p = S.profile;
  const initials = u ? (u.first_name[0] + (u.last_name?.[0] || '')).toUpperCase() : '?';
  const fullName = p?.full_name || [u?.first_name, u?.last_name].filter(Boolean).join(' ');

  el.innerHTML = `
    <div class="page-header"><h1>Профиль</h1></div>
    <div class="profile-header">
      <div class="avatar">${initials}</div>
      <div class="profile-name">${fullName || 'Пользователь'}</div>
      ${u?.username ? `<div class="profile-username">@${u.username}</div>` : ''}
    </div>
    <div class="form-section">
      <div class="form-group">
        <label class="form-label">ФИО *</label>
        <input id="pf-name" class="form-input" type="text" placeholder="Иванов Иван Иванович" value="${p?.full_name || fullName || ''}">
      </div>
      <div class="form-group">
        <label class="form-label">Номер телефона *</label>
        <input id="pf-phone" class="form-input" type="tel" placeholder="+998 90 123 45 67" value="${p?.phone || ''}">
      </div>
      <div class="form-group">
        <label class="form-label">Город / Регион *</label>
        <input id="pf-city" class="form-input" type="text" placeholder="Ташкент" value="${p?.city || ''}">
      </div>
      <div class="form-group">
        <label class="form-label">Адрес доставки *</label>
        <input id="pf-address" class="form-input" type="text" placeholder="ул. Амира Темура, д. 1, кв. 5" value="${p?.address || ''}">
      </div>
      <button class="btn btn-primary btn-full" id="pf-save" style="margin-top:8px">Сохранить профиль</button>
      ${p ? `<div style="text-align:center;padding:12px 0;font-size:12px;color:var(--text2)">✅ Профиль сохранён — заказы оформляются быстро</div>` : ''}
    </div>
    <div class="scroll-pad"></div>`;

  document.getElementById('pf-save').addEventListener('click', saveProfile);
}

async function saveProfile() {
  const name    = document.getElementById('pf-name')?.value.trim();
  const phone   = document.getElementById('pf-phone')?.value.trim();
  const city    = document.getElementById('pf-city')?.value.trim();
  const address = document.getElementById('pf-address')?.value.trim();
  if (!name || !phone || !city || !address) { await showAlert('Заполните все обязательные поля'); return; }
  const btn = document.getElementById('pf-save');
  btn.disabled = true; btn.textContent = 'Сохраняем...';
  try {
    S.profile = await api('/api/profile', { method: 'POST', body: JSON.stringify({ full_name: name, phone, city, address }) });
    localStorage.setItem('xteer_profile', JSON.stringify(S.profile));
    toast('Профиль сохранён ✓');
    renderProfile();
  } catch (e) {
    await showAlert(e.message);
    btn.disabled = false; btn.textContent = 'Сохранить профиль';
  }
}

// ─── HELP ─────────────────────────────────────────────
function renderHelp() {
  const el = document.getElementById('pg-help');
  el.innerHTML = `
    <div class="page-header"><h1>Помощь</h1></div>
    <div class="help-section">
      <div class="help-card">
        <a href="https://t.me/r1m_nightrider" target="_blank">
          <div class="help-item">
            <div class="help-icon">✈️</div>
            <div>
              <div class="help-label">Telegram</div>
              <div class="help-value">@r1m_nightrider</div>
            </div>
            <svg viewBox="0 0 24 24" style="width:16px;height:16px;color:var(--text2);margin-left:auto"><polyline points="9 18 15 12 9 6"/></svg>
          </div>
        </a>
        <a href="tel:+821037682270">
          <div class="help-item">
            <div class="help-icon">📞</div>
            <div>
              <div class="help-label">Телефон</div>
              <div class="help-value">+82 10 3768 2270</div>
            </div>
            <svg viewBox="0 0 24 24" style="width:16px;height:16px;color:var(--text2);margin-left:auto"><polyline points="9 18 15 12 9 6"/></svg>
          </div>
        </a>
      </div>

      <div style="font-size:13px;font-weight:600;color:var(--text2);text-transform:uppercase;letter-spacing:0.5px;padding:16px 0 10px">Часто задаваемые вопросы</div>
      <div class="help-card">
        <div class="faq-item">
          <div class="faq-q">Откуда привозите масло?</div>
          <div class="faq-a">Мы импортируем оригинальное масло Hyundai Xteer напрямую из Южной Кореи. Полная сертификация качества.</div>
        </div>
        <div class="faq-item">
          <div class="faq-q">Как быстро доставят заказ?</div>
          <div class="faq-a">Доставка по Ташкенту: 1–2 рабочих дня. По регионам Узбекистана: 3–5 дней. Другие страны СНГ — уточняйте.</div>
        </div>
        <div class="faq-item">
          <div class="faq-q">Как оплатить заказ?</div>
          <div class="faq-a">Оплата при получении. Также возможна предоплата — уточните при подтверждении заказа.</div>
        </div>
        <div class="faq-item">
          <div class="faq-q">Можно ли вернуть товар?</div>
          <div class="faq-a">Возврат возможен в течение 7 дней при условии сохранения оригинальной упаковки. Свяжитесь с нами через Telegram.</div>
        </div>
        <div class="faq-item">
          <div class="faq-q">В какие страны доставляете?</div>
          <div class="faq-a">Узбекистан, Кыргызстан, Казахстан и другие страны СНГ. Уточните наличие доставки в вашу страну через @r1m_nightrider.</div>
        </div>
      </div>
    </div>
    <div class="scroll-pad"></div>`;
}

// ─── ADMIN PANEL ──────────────────────────────────────
function renderAdmin() {
  const el = document.getElementById('pg-admin');
  el.innerHTML = `
    <div class="page-header"><h1>Администратор</h1></div>
    <div class="admin-tabs">
      <button class="admin-tab ${S.adminSection === 'stats' ? 'active' : ''}" data-sec="stats">Статистика</button>
      <button class="admin-tab ${S.adminSection === 'products' ? 'active' : ''}" data-sec="products">Товары</button>
      <button class="admin-tab ${S.adminSection === 'orders' ? 'active' : ''}" data-sec="orders">Заказы</button>
      <button class="admin-tab ${S.adminSection === 'settings' ? 'active' : ''}" data-sec="settings">Настройки</button>
    </div>
    <div id="admin-content"></div>`;
  el.querySelectorAll('.admin-tab').forEach(t => t.addEventListener('click', () => {
    S.adminSection = t.dataset.sec;
    el.querySelectorAll('.admin-tab').forEach(x => x.classList.toggle('active', x.dataset.sec === S.adminSection));
    loadAdminSection();
  }));
  loadAdminSection();
}

async function loadAdminSection() {
  const ac = document.getElementById('admin-content');
  if (!ac) return;
  ac.innerHTML = `<div style="text-align:center;padding:40px"><div class="spinner" style="margin:auto"></div></div>`;
  switch (S.adminSection) {
    case 'stats':    await renderAdminStats(ac); break;
    case 'products': await renderAdminProducts(ac); break;
    case 'orders':   await renderAdminOrders(ac); break;
    case 'settings': renderAdminSettings(ac); break;
  }
}

async function renderAdminStats(ac) {
  try {
    const stats = await api('/api/admin/stats');
    ac.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-val">${stats.totalOrders}</div><div class="stat-label">Всего заказов</div></div>
        <div class="stat-card"><div class="stat-val" style="color:var(--warning)">${stats.pendingOrders}</div><div class="stat-label">Ожидают</div></div>
        <div class="stat-card"><div class="stat-val" style="color:var(--blue)">${stats.confirmedOrders}</div><div class="stat-label">Подтверждены</div></div>
        <div class="stat-card"><div class="stat-val" style="color:var(--success)">${stats.deliveredOrders}</div><div class="stat-label">Доставлены</div></div>
        <div class="stat-card" style="grid-column:span 2">
          <div class="stat-val">${fmt(stats.totalRevenue)} ${stats.currency}</div>
          <div class="stat-label">Общая выручка</div>
        </div>
        <div class="stat-card"><div class="stat-val">${stats.totalProducts}</div><div class="stat-label">Активных товаров</div></div>
        <div class="stat-card"><div class="stat-val">${stats.totalCustomers}</div><div class="stat-label">Покупателей</div></div>
      </div>
      <div class="scroll-pad"></div>`;
  } catch { ac.innerHTML = `<div class="empty"><div class="empty-icon">❌</div><div class="empty-title">Ошибка</div></div>`; }
}

async function renderAdminProducts(ac) {
  try {
    const products = await api('/api/admin/products');
    ac.innerHTML = `
      <div style="padding:12px 16px 0">
        <button class="btn btn-primary btn-full" id="add-product-btn">+ Добавить товар</button>
      </div>
      <div class="admin-product-list">${products.map(adminProductItem).join('')}</div>
      <div class="scroll-pad"></div>`;
    document.getElementById('add-product-btn').addEventListener('click', () => openProductForm(null));
    ac.querySelectorAll('.admin-edit-btn').forEach(b => b.addEventListener('click', async () => {
      const p = products.find(x => x.id === parseInt(b.dataset.id));
      if (p) openProductForm(p);
    }));
    ac.querySelectorAll('.admin-del-btn').forEach(b => b.addEventListener('click', async () => {
      const ok = await showConfirm('Удалить товар?');
      if (!ok) return;
      await api(`/api/products/${b.dataset.id}`, { method: 'DELETE' });
      toast('Товар удалён');
      await renderAdminProducts(ac);
    }));
    ac.querySelectorAll('.admin-toggle-btn').forEach(b => b.addEventListener('click', async () => {
      const p = products.find(x => x.id === parseInt(b.dataset.id));
      if (!p) return;
      const fd = new FormData();
      fd.append('is_active', p.is_active ? '0' : '1');
      fd.append('keep_images', 'true');
      await api(`/api/products/${p.id}`, { method: 'PUT', body: fd });
      toast(p.is_active ? 'Товар скрыт' : 'Товар активирован');
      await renderAdminProducts(ac);
    }));
  } catch (e) { ac.innerHTML = `<div class="empty"><div class="empty-icon">❌</div><div class="empty-title">${e.message}</div></div>`; }
}

function adminProductItem(p) {
  const img = p.images?.[0] ? `<img src="${p.images[0]}" alt="">` : `<div class="no-img-xs">🛢</div>`;
  return `
  <div class="admin-product-item">
    <div class="admin-product-img">${img}</div>
    <div class="admin-product-info">
      <div class="admin-product-name">${p.name}${!p.is_active ? '<span class="inactive-badge">Скрыт</span>' : ''}</div>
      <div class="admin-product-sub">${[p.viscosity, p.litres].filter(Boolean).join(' · ')}</div>
      <div class="admin-product-price">${fmt(p.price)} ${S.settings.currency} · ${p.quantity} шт.</div>
    </div>
    <div class="admin-product-actions">
      <button class="icon-btn icon-btn-toggle admin-toggle-btn" data-id="${p.id}" title="${p.is_active ? 'Скрыть' : 'Показать'}">${p.is_active ? '👁' : '🙈'}</button>
      <button class="icon-btn icon-btn-edit admin-edit-btn" data-id="${p.id}">✏️</button>
      <button class="icon-btn icon-btn-delete admin-del-btn" data-id="${p.id}">🗑</button>
    </div>
  </div>`;
}

async function renderAdminOrders(ac) {
  try {
    const orders = await api('/api/orders?all=true');
    const filters = ['all', 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
    const filterLabels = { all: 'Все', pending: 'Ожидают', confirmed: 'Принятые', shipped: 'В пути', delivered: 'Доставлены', cancelled: 'Отменены' };
    const filtered = S.adminOrderFilter === 'all' ? orders : orders.filter(o => o.status === S.adminOrderFilter);

    ac.innerHTML = `
      <div class="filter-scroll">
        ${filters.map(f => `<button class="filter-pill ${S.adminOrderFilter === f ? 'active' : ''}" data-f="${f}">${filterLabels[f]}</button>`).join('')}
      </div>
      <div class="order-list">${filtered.map(o => adminOrderCard(o)).join('') || `<div class="empty"><div class="empty-icon">📋</div><div class="empty-title">Нет заказов</div></div>`}</div>
      <div class="scroll-pad"></div>`;

    ac.querySelectorAll('.filter-pill').forEach(b => b.addEventListener('click', () => {
      S.adminOrderFilter = b.dataset.f;
      renderAdminOrders(ac);
    }));
    ac.querySelectorAll('.admin-order-card').forEach(c => c.addEventListener('click', () => openAdminOrderDetail(parseInt(c.dataset.id), orders, ac)));
  } catch (e) { ac.innerHTML = `<div class="empty"><div class="empty-icon">❌</div><div class="empty-title">${e.message}</div></div>`; }
}

function adminOrderCard(o) {
  return `
  <div class="order-card admin-order-card" data-id="${o.id}">
    <div class="order-card-header">
      <div>
        <div class="order-id">Заказ #${o.id}</div>
        <div class="order-date">${fmtDate(o.created_at)}</div>
        <div class="admin-order-customer">${o.full_name || 'Неизвестен'}${o.user_username ? ` · @${o.user_username}` : ''}</div>
      </div>
      <div class="status-badge status-${o.status}">${STATUS_LABELS[o.status]}</div>
    </div>
    <div class="order-footer">
      <div class="order-total">${fmt(o.total_price)} ${o.currency}</div>
      <svg viewBox="0 0 24 24" style="width:16px;height:16px;color:var(--text2)"><polyline points="9 18 15 12 9 6"/></svg>
    </div>
  </div>`;
}

function openAdminOrderDetail(id, orders, ac) {
  const o = orders.find(x => x.id === id);
  if (!o) return;
  const statusOptions = ['pending','confirmed','shipped','delivered','cancelled'];
  const contactUrl = o.user_username ? `https://t.me/${o.user_username}` : `tg://user?id=${o.user_id}`;

  ac.innerHTML = `
    <div style="padding:16px 16px 0">
      <button class="back-btn" id="admin-order-back" style="margin-bottom:16px">
        <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>К заказам
      </button>
      <div class="header-row" style="margin-bottom:16px">
        <div><div class="order-id">Заказ #${o.id}</div><div class="order-date">${fmtDate(o.created_at)}</div></div>
        <div class="status-badge status-${o.status}">${STATUS_LABELS[o.status]}</div>
      </div>
      <div class="section-title">Покупатель</div>
      <div class="order-info-row"><span class="order-info-label">Имя</span><span>${o.full_name || '—'}</span></div>
      <div class="order-info-row"><span class="order-info-label">Телефон</span><span>${o.phone || '—'}</span></div>
      <div class="order-info-row"><span class="order-info-label">Город</span><span>${o.city || '—'}</span></div>
      <div class="order-info-row"><span class="order-info-label">Адрес</span><span>${o.address || '—'}</span></div>
      ${o.notes ? `<div class="order-info-row"><span class="order-info-label">Примечание</span><span>${o.notes}</span></div>` : ''}
      <a href="${contactUrl}" style="display:block;margin:12px 0">
        <button class="btn btn-secondary btn-full">💬 Написать покупателю</button>
      </a>
      <div class="section-title" style="margin-top:16px">Состав</div>
      <div class="order-detail-items">
        ${o.items.map(i => `
          <div class="order-detail-item">
            <div class="order-detail-item-name">${i.name}${i.litres ? ` (${i.litres})` : ''} × ${i.quantity}</div>
            <div class="order-detail-item-price">${fmt(i.subtotal)} ${o.currency}</div>
          </div>`).join('')}
        <div class="divider" style="margin:10px 0"></div>
        <div class="order-detail-item">
          <div style="font-weight:700">Итого</div>
          <div style="font-weight:700">${fmt(o.total_price)} ${o.currency}</div>
        </div>
      </div>
      <div class="section-title" style="margin-top:16px">Изменить статус</div>
      <div class="status-btns">
        ${statusOptions.map(s => `
          <button class="btn ${o.status === s ? 'btn-primary' : 'btn-secondary'} btn-full admin-status-btn" data-s="${s}" ${o.status === s ? 'disabled' : ''}>${STATUS_LABELS[s]}</button>
        `).join('')}
      </div>
    </div>
    <div class="scroll-pad"></div>`;

  document.getElementById('admin-order-back').addEventListener('click', () => renderAdminOrders(ac));
  ac.querySelectorAll('.admin-status-btn').forEach(b => b.addEventListener('click', async () => {
    const ok = await showConfirm(`Изменить статус на "${STATUS_LABELS[b.dataset.s]}"?`);
    if (!ok) return;
    try {
      await api(`/api/orders/${id}/status`, { method: 'PUT', body: JSON.stringify({ status: b.dataset.s }) });
      toast('Статус обновлён');
      await renderAdminOrders(ac);
    } catch (e) { await showAlert(e.message); }
  }));
}

function renderAdminSettings(ac) {
  ac.innerHTML = `
    <div class="settings-section">
      <div style="font-size:13px;font-weight:600;color:var(--text2);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px">Валюта</div>
      <div class="settings-card">
        <div class="settings-row">
          <span class="settings-label">Текущая валюта</span>
          <span class="settings-value" id="cur-display">${S.settings.currency}</span>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Код валюты (3 буквы)</label>
        <input id="cur-input" class="form-input" type="text" maxlength="3" placeholder="UZS" value="${S.settings.currency}"
          style="text-transform:uppercase">
        <div style="font-size:12px;color:var(--text2);margin-top:6px">Примеры: UZS, USD, RUB, KGS</div>
      </div>
      <button class="btn btn-primary btn-full" id="save-currency-btn">Сохранить</button>
    </div>
    <div class="scroll-pad"></div>`;

  const input = document.getElementById('cur-input');
  input.addEventListener('input', () => { input.value = input.value.toUpperCase(); });
  document.getElementById('save-currency-btn').addEventListener('click', async () => {
    const cur = input.value.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(cur)) { await showAlert('Введите 3 латинские буквы, например: UZS'); return; }
    try {
      S.settings = await api('/api/settings', { method: 'PUT', body: JSON.stringify({ currency: cur }) });
      document.getElementById('cur-display').textContent = S.settings.currency;
      toast(`Валюта изменена на ${S.settings.currency} ✓`);
      // Reload products to update prices display
      S.products = [];
    } catch (e) { await showAlert(e.message); }
  });
}

// ─── PRODUCT FORM (Admin modal) ───────────────────────
function openProductForm(product) {
  S.editingProduct = product;
  S.newImageFiles = [];
  const isEdit = !!product;
  const p = product || {};

  const overlay = document.getElementById('modal-overlay');
  const sheet   = document.getElementById('modal-sheet');

  const existingImgsHTML = isEdit && p.images?.length
    ? `<div class="section-title" style="margin-top:12px">Текущие изображения</div>
       <div class="img-preview-grid" id="existing-imgs">
         ${p.images.map(img => `
           <div class="img-preview-item" data-img="${img}">
             <img src="${img}" alt="">
             <button class="img-preview-del" data-img="${img}">✕</button>
           </div>`).join('')}
       </div>` : '';

  sheet.innerHTML = `
    <div class="modal-handle"></div>
    <div class="modal-header">
      <div class="modal-title">${isEdit ? 'Редактировать' : 'Добавить товар'}</div>
      <button class="modal-close" id="modal-close-btn">✕</button>
    </div>
    <div class="modal-body">
      <form id="product-form">
        <div class="form-group"><label class="form-label">Название *</label>
          <input class="form-input" name="name" required placeholder="Hyundai Xteer Gasoline G700" value="${p.name || ''}">
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Бренд</label>
            <input class="form-input" name="brand" placeholder="Hyundai Xteer" value="${p.brand || 'Hyundai Xteer'}">
          </div>
          <div class="form-group"><label class="form-label">Категория</label>
            <select class="form-select" name="category">
              ${['Моторное масло','Трансмиссионное масло','Гидравлическое масло','Другое'].map(c => `<option ${(p.category||'Моторное масло')===c?'selected':''}>${c}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Вязкость</label>
            <input class="form-input" name="viscosity" placeholder="5W-30" value="${p.viscosity || ''}">
          </div>
          <div class="form-group"><label class="form-label">Объём</label>
            <input class="form-input" name="litres" placeholder="4 л" value="${p.litres || ''}">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Цена *</label>
            <input class="form-input" name="price" type="number" min="0" step="0.01" required placeholder="150000" value="${p.price || ''}">
          </div>
          <div class="form-group"><label class="form-label">Остаток (шт.)</label>
            <input class="form-input" name="quantity" type="number" min="0" placeholder="10" value="${p.quantity ?? 0}">
          </div>
        </div>
        <div class="form-group"><label class="form-label">Описание</label>
          <textarea class="form-textarea" name="description" rows="3" placeholder="Высококачественное синтетическое масло...">${p.description || ''}</textarea>
        </div>
        ${existingImgsHTML}
        <div class="section-title" style="margin-top:${isEdit?'12px':'0'}">Добавить изображения</div>
        <label class="image-upload-box" for="img-file-input">
          <div style="font-size:28px">📷</div>
          <div style="font-size:14px;font-weight:600;margin-top:4px">Выбрать фото</div>
          <div class="upload-hint">До 10 изображений · JPEG, PNG, WEBP</div>
          <input type="file" id="img-file-input" multiple accept="image/*">
        </label>
        <div class="img-preview-grid" id="new-img-previews"></div>
        <button type="submit" class="btn btn-primary btn-full" style="margin-top:16px">
          ${isEdit ? 'Сохранить изменения' : 'Добавить товар'}
        </button>
      </form>
    </div>
    <div class="scroll-pad"></div>`;

  overlay.classList.remove('hidden');
  sheet.classList.remove('hidden');
  requestAnimationFrame(() => {
    overlay.classList.add('visible');
    sheet.classList.add('visible');
  });

  // Close
  const close = () => {
    overlay.classList.remove('visible');
    sheet.classList.remove('visible');
    setTimeout(() => { overlay.classList.add('hidden'); sheet.classList.add('hidden'); }, 300);
  };
  document.getElementById('modal-close-btn').addEventListener('click', close);
  overlay.addEventListener('click', close);

  // Delete existing image
  sheet.querySelectorAll('.img-preview-del').forEach(b => b.addEventListener('click', async (e) => {
    e.preventDefault();
    const imgPath = b.dataset.img;
    if (!await showConfirm('Удалить это изображение?')) return;
    try {
      await api(`/api/products/${p.id}/image`, { method: 'DELETE', body: JSON.stringify({ image: imgPath }) });
      b.closest('.img-preview-item').remove();
      // Update local product images
      if (S.editingProduct) S.editingProduct.images = S.editingProduct.images.filter(i => i !== imgPath);
      toast('Изображение удалено');
    } catch (er) { await showAlert(er.message); }
  }));

  // New image preview
  document.getElementById('img-file-input').addEventListener('change', e => {
    S.newImageFiles = Array.from(e.target.files);
    const grid = document.getElementById('new-img-previews');
    grid.innerHTML = '';
    S.newImageFiles.forEach((f, i) => {
      const reader = new FileReader();
      reader.onload = ev => {
        const div = document.createElement('div');
        div.className = 'img-preview-item';
        div.innerHTML = `<img src="${ev.target.result}"><button class="img-preview-del" data-i="${i}">✕</button>`;
        div.querySelector('.img-preview-del').addEventListener('click', e2 => {
          e2.preventDefault();
          S.newImageFiles.splice(i, 1);
          div.remove();
        });
        grid.appendChild(div);
      };
      reader.readAsDataURL(f);
    });
  });

  // Form submit
  document.getElementById('product-form').addEventListener('submit', async e => {
    e.preventDefault();
    const form = e.target;
    const fd = new FormData();
    ['name','brand','category','viscosity','litres','price','quantity','description'].forEach(k => {
      fd.append(k, form[k].value);
    });
    fd.append('keep_images', 'true');
    S.newImageFiles.forEach(f => fd.append('images', f));

    const submitBtn = form.querySelector('button[type=submit]');
    submitBtn.disabled = true; submitBtn.textContent = 'Сохраняем...';

    try {
      if (isEdit) await api(`/api/products/${p.id}`, { method: 'PUT', body: fd });
      else await api('/api/products', { method: 'POST', body: fd });
      toast(isEdit ? 'Товар обновлён ✓' : 'Товар добавлен ✓');
      close();
      S.products = [];
      setTimeout(() => { S.adminSection = 'products'; loadAdminSection(); }, 310);
    } catch (er) {
      await showAlert(er.message);
      submitBtn.disabled = false; submitBtn.textContent = isEdit ? 'Сохранить изменения' : 'Добавить товар';
    }
  });
}

// ─── INIT ─────────────────────────────────────────────
async function init() {
  Cart.load();
  updateCartBadge();

  // Load cached profile instantly
  const cached = localStorage.getItem('xteer_profile');
  if (cached) try { S.profile = JSON.parse(cached); } catch {}

  // Nav click handlers
  document.querySelectorAll('.nav-btn').forEach(b => {
    b.addEventListener('click', () => {
      const page = b.dataset.page;
      if (page === S.page) return;
      S.prevPage = S.page;
      navigate(page);
    });
  });

  // Telegram back button
  if (tg) {
    tg.BackButton.onClick(goBack);
  }

  try {
    const [meData, settingsData] = await Promise.all([
      api('/api/me'),
      api('/api/settings'),
    ]);
    S.me = meData;
    S.isAdmin = meData.is_admin;
    S.profile = meData.profile;
    S.settings = settingsData;

    if (S.profile) localStorage.setItem('xteer_profile', JSON.stringify(S.profile));

    // Add admin tab if needed
    if (S.isAdmin) {
      const nav = document.getElementById('bottom-nav');
      const adminBtn = document.createElement('button');
      adminBtn.className = 'nav-btn';
      adminBtn.dataset.page = 'admin';
      adminBtn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M12 1l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z"/></svg><span>Админ</span>`;
      adminBtn.addEventListener('click', () => navigate('admin'));
      nav.appendChild(adminBtn);
    }
  } catch (e) {
    console.error('Init error:', e);
  }

  // Load products
  try { S.products = await api('/api/products'); } catch { S.products = []; }

  // Show app
  document.getElementById('loading').classList.add('hide');
  setTimeout(() => { document.getElementById('loading').style.display = 'none'; }, 300);
  document.getElementById('app').classList.add('visible');

  renderCatalog();
}

window.addEventListener('load', init);
