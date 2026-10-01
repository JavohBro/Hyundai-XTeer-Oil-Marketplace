// ═══ Carmon Oil — website ═══
const $  = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

const LOCAL_PRODUCTS = [{"id":101,"name":"Hyundai XTeer TOP PAO C3 5W-30 1L","description":"Premium PAO-based fully synthetic passenger-car engine oil. Visible pack claims: ACEA C3, ILSAC GF-6 and MB 229.51.","litres":"1L","price":null,"quantity":200,"images":["assets/products/hyundai-xteer-c3-5w30-1l.png"],"brand":"Hyundai XTeer","viscosity":"5W-30","category":"passenger","is_active":1,"sort_order":1,"fuel":"diesel,gasoline","name_en":"Hyundai XTeer TOP PAO C3 5W-30 1L","desc_en":"Premium PAO-based fully synthetic passenger-car engine oil. Pack claims include ACEA C3, ILSAC GF-6 and MB 229.51.","specs":["PAO based","100% fully synthetic","ACEA C3","ILSAC GF-6","MB 229.51"]},{"id":102,"name":"Hyundai XTeer TOP PAO C5 0W-20 1L","description":"Premium PAO-based fully synthetic engine oil for passenger cars. Visible pack claims: ACEA C5, ILSAC GF-6 and MB 229.71.","litres":"1L","price":null,"quantity":200,"images":["assets/products/hyundai-xteer-c5-0w20-1l.png"],"brand":"Hyundai XTeer","viscosity":"0W-20","category":"passenger","is_active":1,"sort_order":2,"fuel":"diesel,gasoline","name_en":"Hyundai XTeer TOP PAO C5 0W-20 1L","desc_en":"Premium PAO-based fully synthetic passenger-car engine oil. Pack claims include ACEA C5, ILSAC GF-6 and MB 229.71.","specs":["PAO based","100% fully synthetic","ACEA C5","ILSAC GF-6","MB 229.71"]},{"id":103,"name":"SK ZIC X7 5W-30 1L","description":"Fully synthetic VHVI passenger-car engine oil. The supplied pack shows ZIC X7, SAE 5W-30 and 1L packaging.","litres":"1L","price":null,"quantity":200,"images":["assets/products/sk-zic-x7-5w30-1l.jpg"],"brand":"SK ZIC","viscosity":"5W-30","category":"passenger","is_active":1,"sort_order":3,"fuel":"diesel,gasoline","name_en":"SK ZIC X7 5W-30 1L","desc_en":"Fully synthetic VHVI passenger-car engine oil. Supplied pack: ZIC X7, SAE 5W-30, 1L.","specs":["Fully synthetic","VHVI technology","SAE 5W-30"]},{"id":104,"name":"SK ZIC X7 0W-30 1L","description":"SK ZIC X7 passenger-car engine oil in SAE 0W-30 viscosity and 1L packaging, based on the supplied product photo.","litres":"1L","price":null,"quantity":200,"images":["assets/products/sk-zic-x7-0w30-1l.png"],"brand":"SK ZIC","viscosity":"0W-30","category":"passenger","is_active":1,"sort_order":4,"fuel":"diesel,gasoline","name_en":"SK ZIC X7 0W-30 1L","desc_en":"SK ZIC X7 passenger-car engine oil in SAE 0W-30 viscosity and 1L packaging.","specs":["ZIC X7","SAE 0W-30","1L packaging"]},{"id":105,"name":"SK ZIC X9 LS 5W-30 1L","description":"SK ZIC X9 LS fully synthetic low-SAPS passenger-car engine oil in SAE 5W-30 viscosity and 1L packaging.","litres":"1L","price":null,"quantity":200,"images":["assets/products/sk-zic-x9ls-5w30-1l.png"],"brand":"SK ZIC","viscosity":"5W-30","category":"passenger","is_active":1,"sort_order":5,"fuel":"diesel,gasoline","name_en":"SK ZIC X9 LS 5W-30 1L","desc_en":"SK ZIC X9 LS fully synthetic low-SAPS passenger-car engine oil in SAE 5W-30 viscosity.","specs":["X9 LS","Low SAPS","Fully synthetic","SAE 5W-30"]},{"id":106,"name":"SK ZIC X9 LS 5W-40 1L","description":"SK ZIC X9 LS fully synthetic low-SAPS passenger-car engine oil in SAE 5W-40 viscosity and 1L packaging.","litres":"1L","price":null,"quantity":200,"images":["assets/products/sk-zic-x9ls-5w40-1l.png"],"brand":"SK ZIC","viscosity":"5W-40","category":"passenger","is_active":1,"sort_order":6,"fuel":"diesel,gasoline","name_en":"SK ZIC X9 LS 5W-40 1L","desc_en":"SK ZIC X9 LS fully synthetic low-SAPS passenger-car engine oil in SAE 5W-40 viscosity.","specs":["X9 LS","Low SAPS","Fully synthetic","SAE 5W-40"]}];

const S = {
  products: [], cat: 'all', brand: 'all', fuel: 'all', q: '',
  cart: [], me: null, cfg: {}, cur: 'UZS',
  orders: [], adminTab: 'stats', orderFilter: 'all', newImgs: [],
  lang: null, langLock: false
};

// ── i18n ──
const LS_LANG = 'carmon_lang';
const t    = (k, v) => I18N.t(S.lang || I18N.DEFAULT, k, v);
const catL = (k, full) => I18N.catLabel(S.lang || I18N.DEFAULT, k, full);
const stL  = s => t('st.' + s);
// Product text in the current language (falls back to the Russian base fields)
const pn    = p => I18N.pname(p, S.lang || I18N.DEFAULT);
const pd    = p => I18N.pdesc(p, S.lang || I18N.DEFAULT);
const fuelL = p => I18N.fuelLabels(S.lang || I18N.DEFAULT, p.fuel);

// ── API ──
async function api(url, opts = {}) {
  const isForm = opts.body instanceof FormData;
  const res = await fetch(url, {
    credentials: 'same-origin',
    ...opts,
    headers: { ...(isForm ? {} : { 'Content-Type': 'application/json' }), ...(opts.headers || {}) }
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || t('app.req_err'));
  return res.json();
}

// ── Utils ──
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = n => Number(n).toLocaleString('ru');
const fmtDate = s => new Date(s).toLocaleString(I18N.locale(S.lang), { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

let tT;
function toast(m) {
  const t = $('#toast'); t.textContent = m; t.classList.add('on');
  clearTimeout(tT); tT = setTimeout(() => t.classList.remove('on'), 2600);
}

// ── Cart (localStorage) ──
const Cart = {
  load() { try { S.cart = JSON.parse(localStorage.getItem('xteer_web_cart') || '[]'); } catch { S.cart = []; } },
  save() { localStorage.setItem('xteer_web_cart', JSON.stringify(S.cart)); paintCount(); },
  add(p, q = 1) {
    const e = S.cart.find(i => i.product_id === p.id);
    if (e) e.quantity = Math.min(e.quantity + q, p.quantity);
    else S.cart.push({ product_id: p.id, name: pn(p), price: p.price, litres: p.litres, viscosity: p.viscosity, image: p.images?.[0] || '', quantity: Math.min(q, p.quantity), max: p.quantity });
    this.save();
  },
  set(id, q) {
    const i = S.cart.find(x => x.product_id === id); if (!i) return;
    if (q <= 0) return this.del(id);
    i.quantity = Math.min(q, i.max || 999); this.save();
  },
  del(id) { S.cart = S.cart.filter(i => i.product_id !== id); this.save(); },
  clear() { S.cart = []; this.save(); },
  // Unpriced items ("price on request") are carried at null and excluded from the sum
  total() { return S.cart.reduce((t, i) => t + (i.price == null ? 0 : i.price * i.quantity), 0); },
  hasTbd() { return S.cart.some(i => i.price == null); },
  count() { return S.cart.reduce((t, i) => t + i.quantity, 0); }
};
// "150 000 UZS", "150 000 UZS + Price on request" or just "Price on request"
function sumLabel(total, tbd, cur = S.cur) {
  const s = `${fmt(total)} ${esc(cur)}`;
  return tbd ? (total > 0 ? `${s} + ${esc(t('price.ask'))}` : esc(t('price.ask'))) : s;
}
const itemsTbd = items => items.some(i => i.price == null);
function paintCount() {
  const el = $('#cart-count'), c = Cart.count();
  if (!el) return;
  el.textContent = c > 99 ? '99+' : c;
  el.classList.toggle('hidden', c === 0);
}

// ── Modal / Drawer ──
function openModal(html, cls = '') {
  const card = $('#modal-card');
  card.className = 'modal-card' + (cls ? ' ' + cls : '');
  card.innerHTML = html;
  $('#modal').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}
function closeModal() {
  if (S.langLock) return;
  $('#modal').classList.add('hidden');
  document.body.style.overflow = '';
}
function openDrawer(title, body, foot) {
  $('#drawer-title').textContent = title;
  $('#drawer-body').innerHTML = body;
  $('#drawer-foot').innerHTML = foot || '';
  $('#drawer').classList.remove('hidden');
  $('#scrim').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}
function closeDrawer() {
  $('#drawer').classList.add('hidden');
  $('#scrim').classList.add('hidden');
  document.body.style.overflow = '';
}

// ═══ LANGUAGE ═══
// Static chrome (header nav, footer, floating button, <title>) — everything
// outside #main that the router does not repaint.
function paintStatic() {
  $$('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  document.documentElement.lang = S.lang || I18N.DEFAULT;
  document.title = t('meta.title');
  const md = document.querySelector('meta[name="description"]');
  if (md) md.setAttribute('content', t('meta.desc'));
  const L = I18N.LANGS.find(l => l.code === S.lang);
  $('#lang-btn-flag').textContent = '';
  $('#lang-btn-code').textContent = L ? L.code.toUpperCase() : '';
}

function applyLang(code, { persist = true, sync = true } = {}) {
  S.lang = I18N.normalize(code);
  if (persist) try { localStorage.setItem(LS_LANG, S.lang); } catch {}
  if (sync && S.me?.authenticated) api('/api/lang', { method: 'POST', body: JSON.stringify({ lang: S.lang }) }).catch(() => {});
  paintStatic();
}

// `force` = first visit: no close button, scrim/Escape do nothing until a choice is made.
function openLangPicker(force = false) {
  S.langLock = force;
  openModal(`
    ${force ? '' : `<button class="modal-x" id="mx"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>`}
    <div class="lang-pick">
      <img class="lang-pick-logo" src="assets/logo.png" alt="Carmon Oil" onerror="this.style.display='none'">
      <h2>${I18N.LANGS.map(l => esc(I18N.t(l.code, 'lang.title'))).join(' · ')}</h2>
      <p>${esc(t('lang.sub'))}</p>
      <div class="lang-grid">
        ${I18N.LANGS.map(l => `<button class="lang-card${S.lang === l.code ? ' on' : ''}" data-lang="${l.code}"><span>${esc(l.name)}</span></button>`).join('')}
      </div>
    </div>`, 'lang-modal');
  if (!force) $('#mx').onclick = closeModal;
  $$('.lang-card').forEach(b => b.onclick = () => {
    applyLang(b.dataset.lang);
    S.langLock = false;
    closeModal();
    paintAuth();
    router();
  });
}

// ═══ ROUTER ═══
const routes = {
  '': homePage, '/': homePage, '/catalog': catalogPage, '/orders': ordersPage, '/help': helpPage,
  '/logistics': logisticsPage, '/business': businessPage, '/compare-brands': compareBrandsPage,
  '/presentation': presentationPage,
  '/process': processPage,
  '/article/viscosity': () => articlePage('viscosity'),
  '/article/fuel': () => articlePage('fuel'),
  '/article/genuine': () => articlePage('genuine'),
  '/article/delivery': () => articlePage('delivery'),
  '/admin': adminPage
};
function router() {
  const raw = location.hash.replace(/^#/, '') || '/';
  const [path, query = ''] = raw.split('?');
  const params = new URLSearchParams(query);
  if (path === '/catalog') {
    S.cat = params.get('cat') || 'all';
    S.brand = params.get('brand') || 'all';
    S.fuel = 'all';
    S.q = '';
  }
  const fn = path.startsWith('/brand/') ? () => brandPage(brandFromPath(path)) : (routes[path] || homePage);
  $$('[data-route]').forEach(el => {
    const route = el.dataset.route;
    const active = (route === 'home' && path === '/') ||
      ((route === 'products' || route === 'brands' || route === 'catalog') && path === '/catalog') || route === 'compare-brands' && path === '/compare-brands' ||
      route === path.replace(/^\//, '');
    el.classList.toggle('on', active);
  });
  $$('.nav-menu').forEach(m => m.classList.remove('open'));
  $$('.nav-menu-trigger').forEach(b => b.setAttribute('aria-expanded', 'false'));
  $('#hdr-nav').classList.remove('open');
  window.scrollTo(0, 0);
  fn();
}

// ═══ CATALOG ═══
const CATS = ['all', ...I18N.CATS.map(c => c.key)];
const BRANDS = [
  { id: 'all',           label: 'Все',           logo: null },
  { id: 'Kixx',          label: 'Kixx',          logo: 'assets/kixx-logo.png' },
  { id: 'Hyundai XTeer', label: 'Hyundai XTeer', logo: 'assets/hyundailogo1.png' },
  { id: 'SK ZIC',        label: 'SK ZIC',        logo: 'assets/SK-ZIC-LOGO.png' },
  { id: 'Castrol',       label: 'Castrol',       logo: 'assets/Castrol-Logo-2001.png' },
  { id: 'S-OIL',         label: 'S-OIL',         logo: 'assets/S-OIL_Logo.svg.webp' },
  { id: 'Shell',         label: 'Shell',         logo: 'assets/Color-Shell-Logo.png' },
  { id: 'SpeedMate',     label: 'SpeedMate',     logo: 'assets/speedmate-logo.png' },
  { id: 'Mobil',         label: 'Mobil',         logo: 'assets/mobil-logo.png' },
  { id: 'Autous',        label: 'Autous',        logo: 'assets/autous-logo.png' },
  { id: 'Hyundai Mobis', label: 'Hyundai Mobis', logo: 'assets/Hyundai_Mobis-Logo.wine.png' },
];
const BRAND_IDS = BRANDS.slice(1).map(b => b.id);
const BRAND_STORIES = {
  'Kixx': 'Korean lubricant solutions for passenger cars, commercial vehicles and modern service networks.',
  'Hyundai XTeer': 'Hyundai XTeer engine oils and fluids for passenger-car and heavy-duty applications.',
  'SK ZIC': 'SK ZIC product families with application-led options across engine and driveline categories.',
  'Castrol': 'A recognized global lubricant range presented for confirmed product and destination availability.',
  'S-OIL': 'South Korean lubricant products for automotive, commercial and industrial requirements.',
  'Shell': 'Global lubricant brand options selected by application, product specification and supply need.',
  'SpeedMate': 'Service-oriented Korean product range for workshops, fleets and distribution partners.',
  'Mobil': 'Global automotive lubricant options for everyday vehicle and fleet requirements.',
  'Autous': 'Product families prepared for automotive applications and export-focused catalogue review.',
  'Hyundai Mobis': 'Hyundai Mobis product references for vehicle parts, service and aftermarket supply conversations.'
};

const BRAND_PROFILES = {
  'Kixx': { eyebrow: 'Korean lubricant range', title: 'Kixx for everyday performance.', benefits: ['Application-led product selection', 'Passenger and commercial supply conversations', 'Product availability checked by destination'] },
  'Hyundai XTeer': { eyebrow: 'Hyundai lubricant range', title: 'Hyundai XTeer for modern vehicle applications.', benefits: ['Passenger-car engine oil focus', 'Viscosity and specification-led selection', 'Real pack data shown where available'] },
  'SK ZIC': { eyebrow: 'SK lubricant range', title: 'SK ZIC across engine and driveline needs.', benefits: ['Engine and driveline product families', 'Clear viscosity and pack references', 'Suitable for workshop and fleet discussions'] },
  'Castrol': { eyebrow: 'Global lubricant range', title: 'Castrol options for confirmed supply requests.', benefits: ['Brand-specific product sourcing', 'Application and destination review', 'Product list prepared before quotation'] },
  'S-OIL': { eyebrow: 'South Korean lubricant range', title: 'S-OIL for automotive and industrial conversations.', benefits: ['South Korean sourcing reference', 'Automotive and industrial request support', 'Availability confirmed per product'] },
  'Shell': { eyebrow: 'Global lubricant range', title: 'Shell options matched to the application.', benefits: ['Application-led product review', 'Destination-specific availability check', 'Documentation discussed before supply'] },
  'SpeedMate': { eyebrow: 'Korean service range', title: 'SpeedMate for workshop and fleet supply.', benefits: ['Service-network oriented selection', 'Workshop and fleet request support', 'Product and packaging confirmation'] },
  'Mobil': { eyebrow: 'Global lubricant range', title: 'Mobil options for vehicle and fleet requirements.', benefits: ['Vehicle and fleet application review', 'Product sourcing by specification', 'Availability confirmed before quotation'] },
  'Autous': { eyebrow: 'Carmon Oil catalogue range', title: 'Autous product families for export review.', benefits: ['Export-focused catalogue review', 'Application and product-family matching', 'Technical details shown when confirmed'] },
  'Hyundai Mobis': { eyebrow: 'Hyundai aftermarket reference', title: 'Hyundai Mobis for aftermarket conversations.', benefits: ['Aftermarket supply discussion', 'Brand and destination confirmation', 'Product list prepared for review'] }
};

function brandSlug(name) { return encodeURIComponent(name); }
function brandFromPath(path) { try { return decodeURIComponent(path.slice('/brand/'.length)); } catch { return path.slice('/brand/'.length); } }
function uniqueValues(items, fn) { return [...new Set(items.map(fn).filter(Boolean))]; }
function productApplications(items) {
  return uniqueValues(items.flatMap(p => (p.fuel || '').split(',').map(x => x.trim()).filter(Boolean)), x => x);
}
function productDataForBrand(brand) {
  return S.products.filter(p => p.brand === brand);
}

function brandProductsHandlers(scope = document) {
  scope.querySelectorAll('.brand-product-card').forEach(c => c.onclick = () => openProduct(+c.dataset.id));
}

function initBrandShowcase() {
  const feature = $('#lp-brand-feature');
  const choices = $$('.lp-brand-choice');
  if (!feature || !choices.length) return;
  const paint = brandId => {
    const b = BRANDS.find(x => x.id === brandId) || BRANDS[1];
    const idx = Math.max(0, BRANDS.findIndex(x => x.id === b.id));
    feature.classList.remove('brand-switching');
    void feature.offsetWidth;
    feature.classList.add('brand-switching');
    feature.querySelector('.lp-brand-feature-index').textContent = `${String(idx).padStart(2, '0')} / FEATURED BRAND`;
    feature.querySelector('.lp-brand-feature-logo img').src = b.logo;
    feature.querySelector('.lp-brand-feature-logo img').alt = b.label;
    feature.querySelector('.lp-brand-feature-copy h3').textContent = b.label;
    feature.querySelector('.lp-brand-feature-copy p').textContent = BRAND_STORIES[b.id] || 'Product availability is confirmed by application and destination.';
    feature.querySelector('.lp-brand-feature-cta').href = `#/brand/${brandSlug(b.id)}`;
    feature.querySelector('.lp-brand-feature-cta').innerHTML = `Explore ${esc(b.label)} <span>↗</span>`;
    choices.forEach(c => c.classList.toggle('on', c.dataset.brand === b.id));
  };
  choices.forEach(c => c.onclick = () => paint(c.dataset.brand));
  paint(BRANDS[1].id);
}

// Jump to the shop with a filter preselected (from logos / category bubbles)
function goCatalog(opts = {}) {
  if (opts.brand !== undefined) S.brand = opts.brand;
  if (opts.cat !== undefined) S.cat = opts.cat;
  if (opts.fuel !== undefined) S.fuel = opts.fuel;
  if (location.hash === '#/catalog') { catalogPage(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  else location.hash = '#/catalog';
}

const CAT_ICONS = { passenger: '🚗', heavy: '🚛', transmission: '⚙️', brake: '🛑', grease: '🛢️', others: '📦' };
const ART = [
  { icon: '🧪', img: 'assets/viscosity.jpg', bg: 'linear-gradient(135deg,#fde7dc,#f9c9b4)' },
  { icon: '⛽', img: 'assets/gasoline.jpg',  bg: 'linear-gradient(135deg,#e3f0ff,#c6dcff)' },
  { icon: '✅', img: 'assets/product.jpg',   bg: 'linear-gradient(135deg,#e6f7ea,#c9ecd2)' },
  { icon: '🚚', img: 'assets/delivery.jpg',  bg: 'linear-gradient(135deg,#fff3d6,#ffe3a3)' },
];

// ═══ HOME (landing) ═══
function homePage() {
  // Bubbles sit on the panel's slanted edge: the edge runs from (EDGE_TOP%, 0) to (EDGE_BOT%, 100)
  const EDGE_TOP = 50, EDGE_BOT = 12;
  const cats = I18N.CATS.filter(c => c.key !== 'brake');
  const bubbles = cats.map((c, i) => {
    const y = 8 + 84 * (i / (cats.length - 1));
    const x = EDGE_TOP + (EDGE_BOT - EDGE_TOP) * (y / 100);
    return `<button type="button" class="lp-bubble${i === 2 ? ' on' : ''}" style="left:${x.toFixed(2)}%;top:${y.toFixed(2)}%" data-cat="${c.key}">
      <span class="lp-bubble-i">${CAT_ICONS[c.key] || '•'}</span><span class="lp-bubble-l">${esc(catL(c.key))}</span></button>`;
  }).join('');

  $('#main').innerHTML = `
  <section class="lp-hero">
    <div class="lp-hero-in">
      <div class="lp-hero-txt">
        <div class="lp-kicker lp-kicker-or" style="margin-bottom:16px">Made in Korea · Trusted Worldwide</div>
        <h1>${t('home.hero_title')}</h1>
        <p>${esc(t('home.hero_sub'))}</p>
        <div class="lp-actions">
          <a class="btn-or" href="#/catalog">${esc(t('home.hero_cta'))} <span class="arr">→</span></a>
          <a class="btn-gl" href="#/business">${esc(t('home.hero_tg'))}</a>
        </div>
        <div class="lp-hero-badges">
          <span class="lp-hero-badge-txt"><span class="lp-hero-badge-flag">KR</span> Engineered in Korea</span>
          <span class="lp-hero-badge-txt">Technical product information</span>
          <span class="lp-hero-badge-txt">Supply support</span>
        </div>
      </div>
    </div>
  </section>

  <!-- SECTION 2: Global Lubrication Solutions -->
  <section class="lp-section-two" data-section="2">
    <div class="lp-section-two-overlay"></div>
    <div class="lp-section-two-inner">
      <div class="lp-section-two-kicker">Global Lubrication Solutions</div>
      <h2>Improving B2B and B2C Markets with Premium<br class="lp-section-two-break"> Engine Oils and Reliable Global Logistics.</h2>
      <p>We provide premium automotive and industrial lubrication solutions for engines,<br class="lp-section-two-break"> fleets, workshops and international distribution partners.</p>
      <a class="lp-section-two-btn" href="#/business">Talk to Carmon <span>→</span></a>
    </div>
  </section>

  <section class="lp-proof">
    <div class="wrap lp-proof-grid">
      <div class="lp-proof-item"><b>KR</b><span>Products from South Korea</span></div>
      <div class="lp-proof-item"><b>6</b><span>Core product categories</span></div>
      <div class="lp-proof-item"><b>B2B</b><span>Distributor support</span></div>
      <div class="lp-proof-item"><b>10</b><span>Confirmed delivery markets</span></div>
      <div class="lp-proof-item"><b>24/7</b><span>Online request intake</span></div>
    </div>
  </section>

  <section class="lp-paths-sec">
    <div class="wrap">
      <div class="lp-cats-hd">
        <div class="lp-cats-hd-left">
          <div class="lp-kicker">Choose Your Route</div>
          <h2>One supply partner.<br>Two clear journeys.</h2>
          <p>Find a suitable product for your vehicle, or start a supply conversation for your workshop, fleet or distribution business.</p>
        </div>
      </div>
      <div class="lp-path-grid">
        <article class="lp-path-card lp-path-card--consumer">
          <div class="lp-path-num">01 / FOR DRIVERS &amp; WORKSHOPS</div>
          <h3>Find the right oil for your vehicle.</h3>
          <p>Browse passenger-car oils by brand, viscosity and application. Every product stays inquiry-led with technical details before purchase.</p>
          <a href="#/catalog">Browse passenger oils <span>↗</span></a>
        </article>
        <article class="lp-path-card lp-path-card--business">
          <div class="lp-path-num">02 / FOR DISTRIBUTORS</div>
          <h3>Build a reliable supply program.</h3>
          <p>Discuss wholesale volumes, product availability, destination and export coordination with the Carmon team.</p>
          <a href="#/business">Start a B2B conversation <span>↗</span></a>
        </article>
      </div>
    </div>
  </section>

  <section class="lp-cats-sec">
    <div class="wrap">
      <div class="lp-cats-hd">
        <div class="lp-cats-hd-left">
          <div class="lp-kicker">Product Categories</div>
          <h2>Our Product Categories</h2>
          <p>Lubricant solutions for passenger cars, heavy-duty diesel, racing, transmission and industrial applications.</p>
        </div>
        <a class="btn-or" href="#/catalog">View All Products <span class="arr">→</span></a>
      </div>
      <div class="lp-catgrid">
        <div class="lp-catcard" data-cat="passenger">
          <div class="lp-catcard-top" style="background:#0d1e2e url('/assets/passenger_oil.jpg') center/cover no-repeat"><span>PASSENGER CAR<br>ENGINE OILS</span></div>
          <div class="lp-catcard-body"><h3>Passenger Car Oils</h3><p>Maximum engine and fuel efficiency.</p></div>
        </div>
        <div class="lp-catcard" data-cat="heavy">
          <div class="lp-catcard-top" style="background:#121f2c url('/assets/heavy_duty.jpg') center/cover no-repeat"><span>HEAVY-DUTY<br>DIESEL</span></div>
          <div class="lp-catcard-body"><h3>Heavy-Duty Diesel Oils</h3><p>Engineered for durability and performance.</p></div>
        </div>
        <div class="lp-catcard" data-cat="transmission">
          <div class="lp-catcard-top" style="background:#0f2438 url('/assets/transmission.jpg') center/cover no-repeat"><span>TRANSMISSION<br>FLUIDS</span></div>
          <div class="lp-catcard-body"><h3>Transmission Fluids</h3><p>Advanced protection for smooth operation.</p></div>
        </div>
        <div class="lp-catcard" data-cat="grease">
          <div class="lp-catcard-top" style="background:#181c10 url('/assets/product.jpg') center/cover no-repeat"><span>GREASE &<br>HYDRAULICS</span></div>
          <div class="lp-catcard-body"><h3>Grease &amp; Hydraulics</h3><p>Chassis and hydraulic lubrication.</p></div>
        </div>
        <div class="lp-catcard" data-cat="others">
          <div class="lp-catcard-top" style="background:#1e1a0e url('/assets/industrial.jpg') center/cover no-repeat"><span>INDUSTRIAL<br>OILS</span></div>
          <div class="lp-catcard-body"><h3>Industrial Oils</h3><p>Reliable lubrication for industrial applications.</p></div>
        </div>
      </div>
    </div>
  </section>

  <section class="lp-partners-sec">
    <div class="wrap">
      <div class="lp-cats-hd">
        <div class="lp-cats-hd-left">
          <div class="lp-kicker">Our Partners</div>
          <h2>Brands We Work With</h2>
          <p>Recognized Korean and global lubricant brands. Availability confirmed per product and destination.</p>
        </div>
        <a class="btn-or" href="#/catalog">View All Brands <span class="arr">→</span></a>
      </div>
      <div class="lp-brand-showcase" id="lp-brand-showcase">
        <div class="lp-brand-feature" id="lp-brand-feature">
          <div class="lp-brand-feature-glow"></div>
          <div class="lp-brand-feature-top"><span class="lp-brand-feature-index">01 / FEATURED BRAND</span><span class="lp-brand-feature-status">KOREAN &amp; GLOBAL RANGE</span></div>
          <div class="lp-brand-feature-logo"><img src="${esc(BRANDS[1].logo)}" alt="${esc(BRANDS[1].label)}"></div>
          <div class="lp-brand-feature-copy"><h3>${esc(BRANDS[1].label)}</h3><p>${esc(BRAND_STORIES[BRANDS[1].label])}</p><a class="lp-brand-feature-cta" href="#/brand/${brandSlug(BRANDS[1].id)}">Explore ${esc(BRANDS[1].label)} <span>↗</span></a></div>
        </div>
        <div class="lp-brand-choice-grid">
          ${BRANDS.slice(1).map((b, i) => `<button type="button" class="lp-brand-choice${i === 0 ? ' on' : ''}" data-brand="${esc(b.id)}" aria-label="Explore ${esc(b.label)}"><span class="lp-brand-choice-no">${String(i + 1).padStart(2, '0')}</span><span class="lp-brand-choice-logo"><img src="${esc(b.logo)}" alt="${esc(b.label)}"></span><span class="lp-brand-choice-name">${esc(b.label)}</span><span class="lp-brand-choice-arrow">↗</span></button>`).join('')}
        </div>
      </div>
      <div class="lp-brand-ticker" aria-label="Carmon Oil brands"><div class="lp-brand-ticker-track">${[...BRANDS.slice(1), ...BRANDS.slice(1)].map(b => `<span><img src="${esc(b.logo)}" alt="${esc(b.label)}"><b>${esc(b.label)}</b></span>`).join('')}</div></div>
    </div>
  </section>


  <section class="lp-logistics-sec">
    <div class="wrap">
      <div class="lp-kicker">Built for Global Distribution</div>
      <div class="lp-logistics-hd">
        <div>
          <h2>Reliable Logistics.<br>Clear Supply Process.</h2>
          <p>From product selection and documentation to order preparation, loading and agreed delivery.</p>
          <a class="btn-or" href="#/logistics">Learn More About Logistics <span class="arr">→</span></a>
          <div class="lp-ticks">
            <span>✓ Export-ready documentation</span>
            <span>✓ Warehouse and loading coordination</span>
            <span>✓ Partner-aligned delivery support</span>
            <span>✓ Product and destination confirmation</span>
          </div>
        </div>
        <div class="lp-logistics-photo-single">
          <img src="assets/shipp.png" alt="Global Shipping">
        </div>
      </div>
    </div>
  </section>

  <section class="lp-services-sec">
    <div class="wrap">
      <div class="lp-kicker">Our Services</div>
      <div class="lp-cats-hd" style="margin-bottom:40px">
        <div class="lp-cats-hd-left">
          <h2>Services for Lubricant Businesses</h2>
          <p>From product sourcing to export coordination, Carmon Oil supports distributors, workshops and international buyers.</p>
        </div>
      </div>
      <div class="lp-svc-grid">
        <div class="lp-svc">
          <span class="lp-svc-num">01</span>
          <h3>Global Export</h3>
          <h4>Partner Supply</h4>
          <p>Product sourcing and distribution support for overseas buyers and strategic partners.</p>
          <a href="#/business">Explore Service <span class="arr">→</span></a>
        </div>
        <div class="lp-svc">
          <span class="lp-svc-num">02</span>
          <h3>Wholesale Supply</h3>
          <h4>Distributor Networks</h4>
          <p>Supply conversations for distributors, workshops, service networks and fleet operators.</p>
          <a href="#/business">Explore Service <span class="arr">→</span></a>
        </div>
        <div class="lp-svc">
          <span class="lp-svc-num">03</span>
          <h3>Brand Sourcing</h3>
          <h4>Recognized Brands</h4>
          <p>Help finding suitable products from confirmed Korean and global lubricant brands.</p>
          <a href="#/business">Explore Service <span class="arr">→</span></a>
        </div>
      </div>
    </div>
  </section>

  <section class="lp-world-sec">
    <div class="lp-world-copy">
      <div class="lp-kicker lp-kicker-or">World-Class Logistics</div>
      <h2>Export Efficiency</h2>
      <p>We coordinate the supply chain from product sourcing and order preparation to loading, documentation and agreed delivery.</p>
      <div class="lp-ticks" style="margin-top:20px">
        <span>✓ Export-ready documentation</span>
        <span>✓ Warehouse and loading coordination</span>
        <span>✓ Partner-aligned delivery support</span>
      </div>
    </div>
    <div class="lp-world-img">
      <img src="assets/shipping.png" alt="Export Efficiency">
    </div>
  </section>

  <section class="lp-production-sec">
    <div class="wrap lp-production-top">
      <div>
        <div class="lp-kicker lp-kicker-or">Carmon Oil Production Project</div>
        <h2>Complete Product Introduction</h2>
        <p>The production catalogue brings together Carmon Oil, Speedmate and SK AUTOUS product families, technical introductions and application-led ranges.</p>
      </div>
      <a class="btn-or" href="#/catalog">View Catalogue <span class="arr">↓</span></a>
    </div>
    <div class="wrap">
      <div class="lp-production-hero">
        <div class="lp-production-hero-left">
          <h3>Product Range. Technical Detail.<br>Export Ready.</h3>
          <p>Explore the Carmon Oil, Speedmate and SK AUTOUS product families — technical introductions and product-story ranges now available in our catalogue.</p>
        </div>
        <div class="lp-production-hero-right">
          <a class="lp-btn-outline" href="#/catalog">Explore Product Families <span class="arr">↓</span></a>
          <a class="btn-or" href="#/business">Request Product List <span class="arr">→</span></a>
        </div>
      </div>
      <div class="lp-prod-family-grid">
        <div class="lp-prod-family"><span class="lp-svc-num">01 / PCMO</span><h4>Passenger Car Motor Oils</h4><p>Gasoline, diesel and LPG applications with fully synthetic, synthetic and mineral ranges.</p><div class="lp-prod-skus">FX-S · FX-SE · FX-PAO · FX-1 · FX-2 · FX-3</div></div>
        <div class="lp-prod-family"><span class="lp-svc-num">02 / HDDEO</span><h4>Heavy-Duty Diesel Oils</h4><p>Engine oils for modern diesel engines, light trucks and demanding operating conditions.</p><div class="lp-prod-skus">K4 · J4 · I4 · H4 · F4</div></div>
        <div class="lp-prod-family"><span class="lp-svc-num">03 / DRIVELINE</span><h4>Transmission Fluids</h4><p>Automatic, continuously variable and dual-clutch transmission support across vehicle platforms.</p></div>
        <div class="lp-prod-family"><span class="lp-svc-num">04 / GEAR</span><h4>Automotive Gear Oils</h4><p>High-quality gear oils for smooth shifting, wear protection and stable performance.</p></div>
        <div class="lp-prod-family"><span class="lp-svc-num">05 / SK AUTOUS</span><h4>SK AUTOUS Engine Oils</h4><p>Low-SAPS, gasoline, diesel and power oil introductions for modern vehicle applications.</p></div>
        <div class="lp-prod-family"><span class="lp-svc-num">06 / POWER</span><h4>Diesel Power Oils</h4><p>Performance-focused diesel engine families developed for protection, economy and durability.</p></div>
        <div class="lp-prod-family"><span class="lp-svc-num">07 / SK DRIVELINE</span><h4>SK AUTOUS Driveline</h4><p>Automatic and CVT fluid introductions with broad OEM application references.</p></div>
        <div class="lp-prod-family"><span class="lp-svc-num">08 / TECHNICAL</span><h4>Specifications &amp; Benefits</h4><p>Product pages include viscosity, approvals, key characteristics, benefits and application notes.</p><div class="lp-prod-skus" style="color:rgba(255,255,255,.4)">Verify final SKU data against current official technical sheets.</div></div>
      </div>
    </div>
  </section>

  <section class="lp-presentation-sec">
    <div class="wrap">
      <div class="lp-presentation-top">
        <div>
          <div class="lp-kicker lp-kicker-or">Carmon Oil Presentation</div>
          <h2>Product Range. Brand Story. Export Ready.</h2>
          <p>Explore the full Carmon Oil presentation with product families, technical introductions and visual references from the production catalogue.</p>
        </div>
        <a class="btn-or" href="/assets/carmon-oil-presentation.pdf" target="_blank" rel="noopener">Open Full Presentation <span class="arr">↗</span></a>
      </div>
      <div class="lp-presentation-frame">
        <iframe src="/assets/carmon-oil-presentation.pdf" title="Carmon Oil Presentation" loading="lazy"></iframe>
      </div>
    </div>
  </section>

  <section class="lp-techcat-sec">
    <div class="wrap">
      <div class="lp-cats-hd">
        <div class="lp-cats-hd-left">
          <div class="lp-kicker">Technical Excellence in Every Drop</div>
          <h2>Technical Product Catalog</h2>
          <p>Compare products by application, viscosity, packaging and confirmed technical standards.</p>
        </div>
        <a class="btn-or" href="#/catalog">View Technical Data <span class="arr">→</span></a>
      </div>
      <div class="lp-techcat-grid" id="lp-techcat-grid">
        ${[1,2,3,4,5].map(() => `<div class="lp-techcat-card lp-techcat-card--loading"><div class="lp-techcat-img"></div><div class="lp-techcat-body"><div class="lp-skel lp-skel-sm"></div><div class="lp-skel lp-skel-md"></div><div class="lp-skel lp-skel-sm"></div></div></div>`).join('')}
      </div>
    </div>
  </section>

  <section class="lp-finder-sec lp-finder-sec--tool" id="finder">
    <div class="wrap">
      <div class="lp-finder-heading">
        <div>
          <div class="lp-kicker lp-kicker-or">Product Finder</div>
          <h2>Start with the application.<br>Leave with a shortlist.</h2>
        </div>
        <p>Choose a brand and viscosity to see the matching Carmon products currently represented in this catalogue.</p>
      </div>
      <form class="finder-tool" id="finder-tool">
        <label><span>Brand</span><select id="finder-brand"><option value="all">All brands</option><option value="Hyundai XTeer">Hyundai XTeer</option><option value="SK ZIC">SK ZIC</option></select></label>
        <label><span>Viscosity</span><select id="finder-viscosity"><option value="all">All viscosities</option></select></label>
        <label><span>Application</span><select id="finder-application"><option value="passenger">Passenger cars</option><option value="all">All applications</option></select></label>
        <button class="finder-submit" type="submit">Find products <span>→</span></button>
      </form>
      <div class="finder-results" id="finder-results" aria-live="polite"></div>
      <div class="lp-finder-business">
        <div><b>Buying for a workshop, fleet or distribution business?</b><span>Request a product list, availability check or export quotation.</span></div>
        <a class="btn-or" href="#/business">Request a B2B quote <span class="arr">↗</span></a>
      </div>
    </div>
  </section>

  <section class="delivery-section">
    <div class="delivery-inner">
      <div class="delivery-header anim">
        <div class="delivery-label">${esc(t('delivery.label'))}</div>
        <h2 class="lp-h">${esc(t('delivery.title'))}</h2>
      </div>
      <div class="delivery-stage">
        <canvas id="delivery-canvas"></canvas>
        <div class="delivery-country-overlay">
          <div id="delivery-flag" class="delivery-flag">🇺🇿</div>
          <div id="delivery-name" class="delivery-name">${esc(t('country.uz'))}</div>
        </div>
        <button class="delivery-arrow delivery-arrow-l" id="delivery-prev">‹</button>
        <button class="delivery-arrow delivery-arrow-r" id="delivery-next">›</button>
      </div>
      <div class="delivery-dots" id="delivery-dots"></div>
    </div>
  </section>

  <section class="lp-testi">
    <div class="wrap">
      <h2 class="lp-h anim">${esc(t('home.testi_title'))}</h2>
      <p class="lp-sub anim">${esc(t('home.testi_sub'))}</p>
      <div class="lp-testi-g">
        ${[1, 2, 3].map(i => `<figure class="lp-quote anim">
          <blockquote>“${esc(t(`testi.${i}q`))}”</blockquote>
          <figcaption><span class="lp-av">${esc(t(`testi.${i}n`)[0] || '•')}</span><div><b>${esc(t(`testi.${i}n`))}</b><span>${esc(t(`testi.${i}r`))}</span></div></figcaption>
        </figure>`).join('')}
      </div>
    </div>
  </section>

  <section class="lp-art">
    <div class="wrap">
      <h2 class="lp-h anim">${esc(t('home.art_title'))}</h2>
      <p class="lp-sub anim">${esc(t('home.art_sub'))}</p>
      <div class="lp-art-g">
        ${ART.map((a, i) => `<a class="lp-card anim" href="#/article/${['viscosity','fuel','genuine','delivery'][i]}">
          <div class="lp-card-i" style="background:${a.bg}"><img src="${a.img}" alt="" loading="lazy" onerror="this.remove()">${a.icon}</div>
          <div class="lp-card-b"><b>${esc(t(`art.${i + 1}t`))}</b><span>${esc(t(`art.${i + 1}s`))}</span></div>
        </a>`).join('')}
      </div>
    </div>
  </section>

  <section class="lp-faq">
    <div class="wrap">
      <h2 class="lp-h anim">${esc(t('home.faq_title'))}</h2>
      <p class="lp-sub anim">${esc(t('home.faq_sub'))}</p>
      <div class="lp-faq-l anim">
        ${[1, 2, 3, 4, 5, 6].map(n => `<details${n === 1 ? ' open' : ''}><summary>${esc(t(`faq.q${n}`))}<span class="lp-faq-x"></span></summary><p>${esc(t(`faq.a${n}`))}</p></details>`).join('')}
      </div>
    </div>
  </section>

  <section class="lp-touch lp-touch2">
    <div class="wrap lp-touch2-in">
      <h2 class="lp-h anim">${esc(t('home.touch_title'))}</h2>
      <p class="lp-sub anim">${esc(t('home.touch_sub'))}</p>
      <form class="lp-lead2 anim" id="lead">
        <input type="text" name="company" placeholder="${esc(t('home.touch_company'))}" autocomplete="organization">
        <input type="text" name="country" placeholder="${esc(t('home.touch_country'))}" autocomplete="country-name">
        <input type="text" name="contact" placeholder="${esc(t('home.touch_contact'))}" required autocomplete="tel">
        <textarea name="message" rows="4" placeholder="${esc(t('home.touch_msg'))}"></textarea>
        <button class="btn-or" type="submit">${esc(t('home.touch_btn'))} <span class="arr">→</span></button>
        <div class="lp-lead-msg" id="lead-msg"></div>
      </form>
      <div class="lp-touch2-info">
        <div><b>${esc(t('home.touch_sales'))}:</b> +82 10-3768-2270 · carmon1lubricants@gmail.com · @carmon_oil_admin</div>
        <div><b>${esc(t('home.touch_hours'))}:</b> 09:00–17:00 · Incheon, South Korea</div>
      </div>
    </div>
  </section>`;

  $$('.lp-client').forEach(b => b.onclick = () => goCatalog({ brand: b.dataset.b, cat: 'all' }));
  $$('.lp-bubble').forEach(b => b.onclick = () => goCatalog({ cat: b.dataset.cat, brand: 'all' }));
  $$('.lp-catcard').forEach(c => c.onclick = () => goCatalog({ cat: c.dataset.cat, brand: 'all' }));
  initBrandShowcase();
  $('#lead').onsubmit = async e => {
    e.preventDefault();
    const f = e.target, msg = $('#lead-msg');
    const company = f.company.value.trim(), country = f.country.value.trim();
    const contact = f.contact.value.trim(), message = f.message.value.trim();
    if (contact.length < 3) { msg.textContent = t('home.touch_err'); msg.className = 'lp-lead-msg err'; return; }
    const btn = f.querySelector('button'); btn.disabled = true;
    try {
      await api('/api/lead', { method: 'POST', body: JSON.stringify({ company, country, contact, message }) });
      msg.textContent = t('home.touch_ok'); msg.className = 'lp-lead-msg ok'; f.reset();
    } catch (er) { msg.textContent = er.message; msg.className = 'lp-lead-msg err'; }
    btn.disabled = false;
  };
  requestAnimationFrame(() => { initAnimations(); initDeliveryMap();
 initProductFinder(); });

  // Load technical catalog products async
  Promise.resolve(S.products).then(products => {
    const grid = $('#lp-techcat-grid');
    if (!grid) return;
    const ps = products.slice(0, 5);
    if (!ps.length) { grid.innerHTML = ''; return; }
    grid.innerHTML = ps.map(p => {
      const img = (p.images && p.images[0]) || '';
      const name = p.name || '';
      const spec = [p.viscosity, p.litres].filter(Boolean).join(' · ');
      return `<div class="lp-techcat-card" onclick="location.hash='#/catalog'" style="cursor:pointer">
        <div class="lp-techcat-img">${img ? `<img src="${esc(img)}" alt="${esc(name)}" loading="lazy">` : '<div style="font-size:40px;opacity:.3">🛢</div>'}</div>
        <div class="lp-techcat-body">
          <div class="lp-techcat-brand">${esc(p.brand || 'PRODUCT DATA')}</div>
          <h4>${esc(name)}</h4>
          <p>${esc(spec)}</p>
        </div>
      </div>`;
    }).join('');
  }).catch(() => {});
}

function initProductFinder() {
  const form = $('#finder-tool'); if (!form) return;
  const brand = $('#finder-brand'), viscosity = $('#finder-viscosity'), application = $('#finder-application'), results = $('#finder-results');
  const values = [...new Set(S.products.map(p => p.viscosity).filter(Boolean))];
  viscosity.innerHTML = '<option value="all">All viscosities</option>' + values.map(v => `<option value="${esc(v)}">${esc(v)}</option>`).join('');
  const render = () => {
    const bs = brand.value, vs = viscosity.value, as = application.value;
    const matches = S.products.filter(p => (bs === 'all' || p.brand === bs) && (vs === 'all' || p.viscosity === vs) && (as === 'all' || p.category === as));
    results.innerHTML = matches.length ? matches.map(p => `<button type="button" class="finder-result" data-id="${p.id}"><span class="finder-result-image"><img src="${esc(p.images?.[0] || '')}" alt=""></span><span><b>${esc(p.name)}</b><small>${esc(p.brand)} · ${esc(p.viscosity)} · ${esc(p.litres)}</small></span><strong>↗</strong></button>`).join('') : '<div class="finder-empty">No matching products in the current catalogue. <a href="#/business">Ask our team for a recommendation.</a></div>';
    $$('.finder-result').forEach(b => b.onclick = () => openProduct(+b.dataset.id));
  };
  [brand, viscosity, application].forEach(el => el.addEventListener('change', render));
  form.addEventListener('submit', e => { e.preventDefault(); render(); });
  render();
}

// Coverflow carousel in the delivery block: cards fan out from the centre and
// roll with a springy easing (defined in CSS). Auto-advances, arrows, swipe,
// click a side card to bring it to the front.

// Header dropdowns work on hover for desktop and on click/tap for touch devices.
function initNavMenus() {
  $$('.nav-menu').forEach(menu => {
    const trigger = menu.querySelector('.nav-menu-trigger');
    if (!trigger) return;
    trigger.onclick = e => {
      e.preventDefault();
      const open = menu.classList.toggle('open');
      trigger.setAttribute('aria-expanded', String(open));
      $$('.nav-menu').filter(x => x !== menu).forEach(x => x.classList.remove('open'));
    };
  });
  document.addEventListener('click', e => {
    if (e.target.closest('.nav-menu')) return;
    $$('.nav-menu').forEach(m => m.classList.remove('open'));
    $$('.nav-menu-trigger').forEach(b => b.setAttribute('aria-expanded', 'false'));
  });
}

// ═══ CATALOG (shop) ═══
function catalogPage() {
  $('#main').innerHTML = `
  <div class="wrap" id="catalog-section">
    <div class="sec-head">
      <div class="catalog-route-kicker">${S.brand !== 'all' ? 'Brand collection' : S.cat !== 'all' ? 'Product line' : 'Carmon Oil catalogue'}</div>
      <h1>${esc(S.brand !== 'all' ? S.brand : S.cat !== 'all' ? catL(S.cat, true) : t('catalog.title'))}</h1>
      <p>${esc(S.brand !== 'all' ? `Products currently represented for ${S.brand}. Select a product to review its available viscosity and pack details.` : S.cat !== 'all' ? `Browse the ${catL(S.cat, true).toLowerCase()} product line and open any product for its available specifications.` : t('hero.p'))}</p>
      ${(S.brand !== 'all' || S.cat !== 'all') ? '<a class="catalog-reset" href="#/catalog">View full catalogue →</a>' : ''}
    </div>
    <div class="brands-strip-logos brands-strip-logos--compact">
      ${BRANDS.slice(1).map(b => `<button type="button" class="brands-strip-logo${S.brand === b.id ? ' on' : ''}" data-b="${esc(b.id)}" aria-label="${esc(b.label)}"><img src="${esc(b.logo)}" alt="${esc(b.label)}"></button>`).join('')}
    </div>
    <div class="toolbar">
      <div class="search">
        <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input id="q" type="search" placeholder="${esc(t('catalog.search'))}" value="${esc(S.q)}">
      </div>
      <div class="pills" id="pills"></div>
      <div class="pills pills-fuel" id="fuel-pills"></div>
    </div>
    <div id="grid" class="grid"></div>
  </div>`;

  $('#q').addEventListener('input', e => { S.q = e.target.value; paintGrid(); });
  // Brand logos double as filters (toggle off when the active one is clicked again)
  $$('.brands-strip-logo').forEach(b => b.onclick = () => {
    S.brand = S.brand === b.dataset.b ? 'all' : b.dataset.b;
    $$('.brands-strip-logo').forEach(x => x.classList.toggle('on', x.dataset.b === S.brand));
    paintBrandPills(); paintGrid();
  });
  paintBrandPills(); paintPills(); paintFuelPills(); paintGrid();
  requestAnimationFrame(() => initAnimations());
}

function paintFuelPills() {
  const el = $('#fuel-pills'); if (!el) return;
  el.innerHTML = `<span class="pills-label">${esc(t('fuel.label'))}:</span>` +
    ['all', ...I18N.FUELS].map(f => `<button class="pill pill-sm${S.fuel === f ? ' on' : ''}" data-f="${f}">${esc(f === 'all' ? t('cat.all') : t('fuel.' + f))}</button>`).join('');
  $$('#fuel-pills .pill').forEach(b => b.onclick = () => { S.fuel = b.dataset.f; paintFuelPills(); paintGrid(); });
}

function paintBrandPills() {
  const el = $('#brand-pills'); if (!el) return;
  el.innerHTML = BRANDS.map(b =>
    `<button class="brand-pill${S.brand === b.id ? ' on' : ''}" data-b="${esc(b.id)}">` +
    (b.logo ? `<img src="${esc(b.logo)}" alt="${esc(b.label)}">` : `<span>${esc(t('cat.all'))}</span>`) +
    `</button>`
  ).join('');
  $$('#brand-pills .brand-pill').forEach(btn => btn.onclick = () => {
    S.brand = btn.dataset.b; paintBrandPills(); paintGrid();
  });
}

function paintPills() {
  $('#pills').innerHTML = CATS.map(c => `<button class="pill${S.cat === c ? ' on' : ''}" data-c="${esc(c)}">${esc(c === 'all' ? t('cat.all') : catL(c))}</button>`).join('');
  $$('#pills .pill').forEach(b => b.onclick = () => { S.cat = b.dataset.c; paintPills(); paintGrid(); });
}

function paintGrid() {
  const g = $('#grid'); if (!g) return;
  let list = S.products;
  if (S.brand !== 'all') list = list.filter(p => p.brand === S.brand);
  if (S.cat !== 'all') list = list.filter(p => p.category === S.cat);
  if (S.fuel !== 'all') list = list.filter(p => (p.fuel || '').split(',').includes(S.fuel));
  if (S.q) {
    const q = S.q.toLowerCase();
    list = list.filter(p => [p.name, pn(p), p.viscosity, p.brand, p.litres].some(v => (v || '').toLowerCase().includes(q)));
  }
  if (!list.length) {
    g.innerHTML = `<div class="empty" style="grid-column:1/-1"><div class="empty-i">🔍</div><h3>${esc(t('empty.title'))}</h3><p>${esc(t('empty.sub'))}</p></div>`;
    return;
  }
  g.innerHTML = list.map(cardHTML).join('');
  $$('#grid .card').forEach(c => c.onclick = () => openProduct(+c.dataset.id));
  $$('#grid .card-add').forEach(b => b.onclick = e => {
    e.stopPropagation();
    const p = S.products.find(x => x.id === +b.dataset.id);
    if (p?.quantity > 0) { Cart.add(p); toast(t('toast.added', { name: pn(p) })); }
  });
  initAnimations();
}

function initAnimations() {
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } });
  }, { threshold: 0.08 });
  document.querySelectorAll('.anim,.anim-left,.anim-right').forEach(el => {
    if (!el.classList.contains('visible')) obs.observe(el);
  });
}

function initDeliveryMap() {
  const canvas = document.getElementById('delivery-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const DELIVERY_COUNTRIES = [
    { key: 'country.uz', flag: '🇺🇿',
      pts: [
        // NW block (Karakalpakstan) — top edge with small bump, clockwise
        [10,28],[25,18],[55,15],[83,5],[105,3],[120,15],
        // NE slope of the block down to the waist
        [140,35],[165,40],[185,60],[195,85],[210,100],
        // Tashkent shelf — flat top across the middle
        [225,95],[235,90],[255,90],[285,93],[305,88],[320,85],
        // east edge stepping down-right
        [325,100],[345,110],[360,135],[365,160],[375,180],[390,190],[405,200],
        // neck into Fergana valley
        [415,215],[435,210],[450,195],[470,175],[490,163],[515,153],[530,155],
        // Fergana — top, east tip, bottom
        [525,170],[540,195],[565,200],[590,215],[570,230],[545,245],
        [520,235],[500,238],[475,225],[450,238],[440,250],
        // south — Surkhandarya tail going down to the tip
        [440,280],[425,295],[435,315],[430,345],[410,365],[400,380],
        // back up the long SW diagonal
        [370,360],[345,335],[315,300],[280,265],[245,235],[220,205],[210,185],
        // underside of the waist, west to the block's notch
        [190,175],[150,165],[140,160],[135,145],[105,138],[90,143],[75,145],
        // notch + bottom-left corner of the NW block
        [50,155],[50,193],[10,193]
      ]},
    { key: 'country.kg', flag: '🇰🇬',
      pts: [
        // top-left squarish bump, clockwise
        [96,140],[93,91],[131,73],[163,80],[179,108],[219,105],
        // tall spike at top centre-left
        [238,65],[254,45],[271,70],
        // undulating top edge east: bump, notch, bump
        [306,87],[354,84],[394,77],[420,66],[441,80],[462,96],
        [487,87],[511,96],[530,112],[546,140],[572,157],
        // east tip and the underside coming back west
        [588,178],[564,196],[522,206],[494,224],[448,234],
        [413,252],[364,248],[326,262],[284,273],
        // bay between main body and Batken (opens to the right)
        [256,287],[228,262],[184,245],[149,241],[133,266],[184,276],[228,283],
        // Batken — right side, bottom, left
        [249,297],[242,322],[210,329],[172,322],[137,315],
        [102,327],[67,332],[32,315],[14,280],[44,266],[91,262],
        // back up the main body's left edge
        [96,227],[102,187]
      ]},
    { key: 'country.kz', flag: '🇰🇿',
      pts: [
        // west tip and the small NW bump, clockwise
        [6,162],[31,152],[59,134],[70,120],[98,120],[108,138],
        [143,144],[178,148],[206,148],
        // tall northern head with the single dot on top
        [206,78],[227,54],[269,43],[311,40],[350,26],[367,43],[381,64],
        // step down the head's right side
        [416,74],[444,74],[462,92],[472,113],[493,134],
        // eastern arm out to the tip
        [521,144],[556,152],[591,166],[580,186],[556,200],
        // east side bump, then the SE slope
        [552,228],[574,242],[556,260],[532,278],[510,302],[482,320],
        // ragged southern edge going west
        [448,334],[416,320],[395,334],[374,316],[353,330],
        // small southern protrusion
        [346,351],[311,354],[290,337],[280,316],[255,306],[220,306],
        // notch above Mangystau
        [206,284],[178,278],[150,281],[140,302],
        // Mangystau chunk hanging bottom-left
        [129,330],[112,354],[73,351],[56,323],[52,288],[66,267],
        // west coast back up to the tip
        [45,246],[20,225],[6,197]
      ]},
    { key: 'country.ru', flag: '🇷🇺',
      pts: [
        // NW corner and the northern coast going east, clockwise
        [48,145],[66,131],[102,123],[129,105],[151,100],[174,118],[201,131],
        // island-ish bump on the northern edge
        [237,105],[259,131],[309,127],[336,109],[367,127],[408,118],[444,123],
        // Taymyr rising into the Chukotka stack at the top-right
        [462,105],[485,95],[507,73],[525,46],[547,28],[570,41],[579,77],
        // east coast coming down
        [590,123],[575,159],[557,185],[539,208],[525,239],[543,264],[525,289],
        // ragged southern border going west
        [498,302],[475,311],[444,293],[417,311],[390,320],[359,307],
        [327,325],[300,336],[273,354],[255,336],[233,318],[210,307],
        [179,300],[147,291],[129,307],[107,296],[79,289],[57,300],
        // Kaliningrad-ish nub at the bottom-left, then up the west edge
        [30,293],[12,271],[32,253],[39,226],[21,199],[32,172]
      ]},
    { key: 'country.tm', flag: '🇹🇲',
      pts: [[359,343],[356,305],[330,303],[290,263],[262,258],[223,235],[198,230],[182,239],[159,238],[134,264],[103,272],[96,240],[101,193],[74,177],[83,146],[59,144],[67,105],[100,116],[131,102],[106,75],[96,49],[67,60],[64,93],[53,64],[68,49],[108,39],[132,52],[157,88],[175,86],[215,85],[209,62],[239,46],[268,20],[316,44],[320,80],[333,90],[371,88],[383,96],[400,143],[441,174],[464,195],[500,218],[547,237],[546,265],[536,264],[519,251],[514,268],[484,276],[477,313],[457,326],[429,333],[422,354],[395,360],[359,343]]},
    { key: 'country.az', flag: '🇦🇿',
      pts: [[112,221],[134,246],[166,246],[166,261],[195,315],[145,303],[109,259],[97,223],[112,221]],
      pts2: [[284,81],[316,87],[329,63],[372,25],[410,75],[447,142],[480,146],[503,172],[443,180],[430,253],[418,286],[391,308],[393,355],[375,360],[330,310],[355,264],[334,236],[307,243],[221,313],[220,247],[187,231],[156,206],[177,176],[138,143],[153,119],[125,103],[110,78],[128,63],[182,90],[221,95],[231,84],[195,33],[214,20],[234,23],[284,81]]},
    { key: 'country.ly', flag: '🇱🇾',
      pts: [[247,278],[232,287],[219,273],[184,262],[175,247],[157,235],[147,240],[139,226],[138,215],[125,197],[134,186],[132,170],[135,157],[133,145],[137,125],[136,113],[129,91],[140,85],[142,75],[139,64],[154,54],[161,46],[172,39],[173,20],[199,29],[208,26],[227,31],[256,42],[266,64],[286,69],[317,80],[341,92],[351,85],[362,74],[357,55],[364,43],[380,31],[395,27],[425,33],[432,44],[440,44],[447,48],[469,51],[475,59],[467,71],[470,82],[464,98],[471,118],[471,207],[471,299],[471,349],[446,349],[445,360],[357,312],[270,264],[247,278]]},
    { key: 'country.vn', flag: '🇻🇳',
      pts: [[351,61],[321,81],[303,103],[298,119],[315,143],[335,173],[355,188],[369,206],[379,249],[376,289],[358,304],[332,319],[314,339],[287,360],[279,345],[285,330],[269,317],[288,307],[311,306],[301,292],[338,274],[341,246],[336,231],[340,208],[334,192],[318,176],[304,155],[285,128],[259,114],[265,106],[279,100],[271,80],[244,80],[234,59],[221,40],[233,35],[250,35],[272,32],[291,20],[301,29],[321,33],[318,46],[328,55],[351,61]]},
    { key: 'country.th', flag: '🇹🇭',
      pts: [[325,210],[305,199],[285,200],[289,182],[269,182],[267,207],[255,241],[248,261],[249,278],[264,279],[273,300],[277,320],[290,333],[303,336],[315,348],[307,357],[293,360],[291,348],[273,338],[269,342],[260,333],[256,322],[244,309],[233,298],[229,311],[225,299],[228,284],[234,262],[245,238],[257,217],[249,196],[249,185],[246,172],[231,154],[226,142],[234,138],[242,118],[233,103],[219,86],[208,66],[217,61],[227,36],[243,35],[256,25],[269,20],[279,27],[280,41],[295,42],[290,66],[290,87],[314,73],[321,77],[334,77],[339,69],[356,70],[373,89],[374,112],[392,132],[391,151],[384,162],[363,159],[334,163],[319,182],[325,210]]},
    { key: 'country.ge', flag: '🇬🇪',
      pts: [[154,277],[166,229],[146,152],[97,110],[51,97],[20,63],[30,49],[101,69],[224,87],[339,141],[353,162],[404,144],[482,168],[508,214],[560,241],[539,256],[580,317],[569,331],[523,324],[461,291],[440,310],[324,328],[243,272],[154,277]]},
  ];

  const BASE_W = 600, BASE_H = 380;
  let currentIdx = 0;
  let mapTimer;
  let rafId;

  function resize() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight || 420;
  }
  resize();

  const SPACING = 16;
  const dots = [];
  for (let x = SPACING / 2; x < canvas.width; x += SPACING) {
    for (let y = SPACING / 2; y < canvas.height; y += SPACING) {
      dots.push({ x, y, r: 1.5, targetR: 1.5, active: false });
    }
  }

  function makePath(country) {
    const scale = Math.min(canvas.width / BASE_W, canvas.height / BASE_H) * 0.82;
    const ox = (canvas.width - BASE_W * scale) / 2;
    const oy = (canvas.height - BASE_H * scale) / 2;
    const p = new Path2D();
    const addPoly = pts => {
      pts.forEach(([px, py], i) => {
        const x = px * scale + ox, y = py * scale + oy;
        i === 0 ? p.moveTo(x, y) : p.lineTo(x, y);
      });
      p.closePath();
    };
    addPoly(country.pts);
    if (country.pts2) addPoly(country.pts2);
    return p;
  }

  function goTo(idx) {
    currentIdx = idx;
    const path = makePath(DELIVERY_COUNTRIES[idx]);
    dots.forEach(d => {
      d.active = ctx.isPointInPath(path, d.x, d.y);
      d.targetR = d.active ? 5.5 : 1.5;
    });
    const flagEl = document.getElementById('delivery-flag');
    const nameEl = document.getElementById('delivery-name');
    if (flagEl) flagEl.textContent = DELIVERY_COUNTRIES[idx].flag;
    if (nameEl) nameEl.textContent = t(DELIVERY_COUNTRIES[idx].key);
    document.querySelectorAll('.dmap-dot').forEach((el, i) => el.classList.toggle('on', i === idx));
    clearInterval(mapTimer);
    mapTimer = setInterval(() => goTo((currentIdx + 1) % DELIVERY_COUNTRIES.length), 4000);
  }

  function draw() {
    if (!canvas.isConnected) { cancelAnimationFrame(rafId); clearInterval(mapTimer); return; }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    dots.forEach(d => {
      d.r += (d.targetR - d.r) * 0.09;
      ctx.beginPath();
      ctx.arc(d.x, d.y, Math.max(0.4, d.r), 0, Math.PI * 2);
      const alpha = 0.08 + Math.max(0, (d.r - 1.5) / (5.5 - 1.5)) * 0.88;
      ctx.fillStyle = 'rgba(0,0,0,' + alpha.toFixed(2) + ')';
      ctx.fill();
    });
    rafId = requestAnimationFrame(draw);
  }

  const dotsEl = document.getElementById('delivery-dots');
  if (dotsEl) {
    DELIVERY_COUNTRIES.forEach((_, i) => {
      const btn = document.createElement('button');
      btn.className = 'dmap-dot' + (i === 0 ? ' on' : '');
      btn.onclick = () => goTo(i);
      dotsEl.appendChild(btn);
    });
  }

  const prevBtn = document.getElementById('delivery-prev');
  const nextBtn = document.getElementById('delivery-next');
  if (prevBtn) prevBtn.onclick = () => goTo((currentIdx - 1 + DELIVERY_COUNTRIES.length) % DELIVERY_COUNTRIES.length);
  if (nextBtn) nextBtn.onclick = () => goTo((currentIdx + 1) % DELIVERY_COUNTRIES.length);

  goTo(0);
  draw();
}

function cardHTML(p) {
  const img = p.images?.[0] ? `<img src="${esc(p.images[0])}" alt="${esc(pn(p))}" loading="lazy">` : `<div class="ph">🛢</div>`;
  const ok = p.quantity > 0;
  const priced = p.price !== null && p.price !== undefined;
  const sub = [p.viscosity, p.litres, ...fuelL(p)].filter(Boolean).join(' · ') || p.brand || '';
  return `<article class="card${ok ? '' : ' dim'}" data-id="${p.id}">
    <div class="card-img">${img}${ok ? '' : `<span class="tag-out">${esc(t('stock.out'))}</span>`}</div>
    <div class="card-b">
      <div class="card-n">${esc(pn(p))}</div>
      <div class="card-s">${esc(sub)}</div>
      <div class="card-f">
        <div class="card-p">${priced ? `${fmt(p.price)} <span>${esc(S.cur)}</span>` : `<span class="card-ask">Price on request</span>`}</div>
        <span class="card-view">View details <b>↗</b></span>
      </div>
    </div>
  </article>`;
}

// ── Product modal ──
function openProduct(id) {
  const p = S.products.find(x => x.id === id); if (!p) return;
  const imgs = p.images?.length ? p.images : [];
  const priced = p.price !== null && p.price !== undefined;
  const ok = p.quantity > 0;
  const chips = [catL(p.category, true), p.viscosity, p.litres].filter(Boolean).map(x => `<span class="chip">${esc(x)}</span>`).join('')
    + fuelL(p).map(x => `<span class="chip chip-fuel">${esc(x)}</span>`).join('');
  const desc = pd(p);

  openModal(`
    <button class="modal-x" id="mx" aria-label="${esc(t('close'))}"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
    <div class="pd">
      <div class="pd-media">
        <div class="pd-main" id="pdm">${imgs.length ? `<img src="${esc(imgs[0])}" alt="${esc(pn(p))}">` : `<div class="ph">🛢</div>`}</div>
        ${imgs.length > 1 ? `<div class="pd-thumbs">${imgs.map((im, i) => `<div class="pd-thumb${i === 0 ? ' on' : ''}" data-i="${i}"><img src="${esc(im)}" alt=""></div>`).join('')}</div>` : ''}
      </div>
      <div class="pd-info">
        <div class="pd-cat">${esc(catL(p.category, true))}</div>
        <h2 class="pd-title">${esc(pn(p))}</h2>
        <div class="pd-brand">${esc(p.brand || '')}</div>
        <div class="pd-tags">${chips}</div>
        ${p.specs?.length ? `<div class="pd-specs">${p.specs.map(s => `<span>${esc(s)}</span>`).join('')}</div>` : ''}
        <div class="pd-price">${priced ? `${fmt(p.price)} <span>${esc(S.cur)}</span>` : 'Price on request'}</div>
        <div class="pd-stock">${p.quantity > 0 ? esc(t('stock.in', { n: p.quantity })) : '😔 ' + esc(t('stock.out'))}</div>
        ${desc ? `<div class="pd-desc">${TextFmt.toHtml(desc)}</div>` : ''}
        ${!priced ? `<div class="note" style="margin-bottom:14px">${esc(t('price.tbd'))} · <a href="https://t.me/carmon_oil_admin?text=${encodeURIComponent(p.name)}" target="_blank" rel="noopener" style="text-decoration:underline">${esc(t('price.ask_btn'))}</a></div>` : ''}
        ${ok ? `
        <div class="qty">
          <div class="qbox">
            <button id="qm" aria-label="${esc(t('less'))}">−</button>
            <input id="qv" type="text" inputmode="numeric" value="1" aria-label="${esc(t('qty'))}">
            <button id="qp" aria-label="${esc(t('more'))}">+</button>
          </div>
          <button class="btn btn-p" id="addc" style="flex:1">${esc(t('add'))}</button>
        </div>` : ''}
      </div>
    </div>`);

  $('#mx').onclick = closeModal;
  let cur = 0;
  const bindZoom = () => { const im = $('#pdm img'); if (im) im.onclick = () => openLightbox(imgs, cur); };
  bindZoom();
  imgs.length > 1 && $$('.pd-thumb').forEach(th => th.onclick = () => {
    $$('.pd-thumb').forEach(x => x.classList.remove('on')); th.classList.add('on');
    cur = +th.dataset.i;
    $('#pdm').innerHTML = `<img src="${esc(imgs[cur])}" alt="">`;
    bindZoom();
  });
  if (ok) {
    const qi = $('#qv');
    const clamp = v => {
      const n = parseInt(v, 10);
      if (!n || n < 1) return 1;
      return Math.min(n, p.quantity);
    };
    // Allow free typing (so "50" isn't blocked mid-entry at "5"), then settle on blur
    qi.oninput  = () => { qi.value = qi.value.replace(/\D/g, ''); };
    qi.onblur   = () => {
      const n = clamp(qi.value);
      if (parseInt(qi.value, 10) > p.quantity) toast(t('toast.max', { n: p.quantity }));
      qi.value = n;
    };
    qi.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); qi.blur(); } };
    $('#qm').onclick = () => { qi.value = clamp(clamp(qi.value) - 1); };
    $('#qp').onclick = () => {
      const cur = clamp(qi.value);
      if (cur >= p.quantity) return toast(t('toast.max', { n: p.quantity }));
      qi.value = cur + 1;
    };
    $('#addc').onclick = () => {
      Cart.add(p, clamp(qi.value));
      toast(t('toast.added', { name: pn(p) }));
      closeModal();
    };
  }
}

// ═══ LIGHTBOX ═══
// Full-screen viewer for product photos; keyboard arrows / swipe move between them.
function openLightbox(imgs, idx = 0) {
  if (!imgs?.length) return;
  let i = idx;
  let lb = $('#lightbox');
  if (!lb) { lb = document.createElement('div'); lb.id = 'lightbox'; lb.className = 'lightbox'; document.body.appendChild(lb); }
  const many = imgs.length > 1;
  const go = d => { i = (i + d + imgs.length) % imgs.length; paint(); };
  const paint = () => {
    lb.innerHTML = `
      <button class="lb-x" aria-label="${esc(t('close'))}"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
      ${many ? `<button class="lb-nav lb-prev" aria-label="${esc(t('less'))}">‹</button><button class="lb-nav lb-next" aria-label="${esc(t('more'))}">›</button>` : ''}
      <img src="${esc(imgs[i])}" alt="">
      ${many ? `<div class="lb-count">${i + 1} / ${imgs.length}</div>` : ''}`;
    lb.querySelector('.lb-x').onclick = closeLightbox;
    if (many) { lb.querySelector('.lb-prev').onclick = e => { e.stopPropagation(); go(-1); }; lb.querySelector('.lb-next').onclick = e => { e.stopPropagation(); go(1); }; }
    lb.querySelector('img').onclick = e => e.stopPropagation();
  };
  paint();
  lb.onclick = closeLightbox;
  let sx = 0;
  lb.ontouchstart = e => { sx = e.touches[0].clientX; };
  lb.ontouchend = e => { const dx = e.changedTouches[0].clientX - sx; if (many && Math.abs(dx) > 40) go(dx < 0 ? 1 : -1); };
  lb.onkeydown = null;
  lb._keys = e => {
    if (e.key === 'ArrowRight' && many) go(1);
    else if (e.key === 'ArrowLeft' && many) go(-1);
  };
  document.addEventListener('keydown', lb._keys);
  lb.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}
function closeLightbox() {
  const lb = $('#lightbox'); if (!lb || lb.classList.contains('hidden')) return;
  lb.classList.add('hidden');
  if (lb._keys) document.removeEventListener('keydown', lb._keys);
  // the product modal underneath still wants the page locked
  if ($('#modal').classList.contains('hidden') && $('#drawer').classList.contains('hidden')) document.body.style.overflow = '';
}

// ═══ CART DRAWER ═══
function openCart() {
  if (!S.cart.length) {
    openDrawer(t('cart.title'), `<div class="empty"><div class="empty-i">🛒</div><h3>${esc(t('cart.empty'))}</h3><p>${esc(t('cart.empty_sub'))}</p></div>`, '');
    return;
  }
  const body = S.cart.map(i => `
    <div class="ci">
      <div class="ci-img">${i.image ? `<img src="${esc(i.image)}" alt="">` : `<div class="ph" style="font-size:24px">🛢</div>`}</div>
      <div class="ci-b">
        <div class="ci-n">${esc(i.name)}</div>
        <div class="ci-s">${esc([i.litres, i.viscosity].filter(Boolean).join(' · '))}</div>
        <div class="ci-f">
          <div class="ci-p">${i.price == null ? esc(t('price.ask')) : `${fmt(i.price * i.quantity)} ${esc(S.cur)}`}</div>
          <div style="display:flex;gap:6px;align-items:center">
            <div class="qbox qbox-sm">
              <button data-m="${i.product_id}" aria-label="${esc(t('less'))}">−</button>
              <input type="text" inputmode="numeric" data-q="${i.product_id}" value="${i.quantity}" aria-label="${esc(t('qty'))}">
              <button data-p="${i.product_id}" aria-label="${esc(t('more'))}">+</button>
            </div>
            <button class="ci-x" data-x="${i.product_id}" aria-label="${esc(t('admin.delete'))}"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
          </div>
        </div>
      </div>
    </div>`).join('');

  const foot = `
    <div class="sum"><span>${esc(t('cart.items'))}</span><span>${Cart.count()} ${esc(t('pcs'))}</span></div>
    <div class="sum-t"><span>${esc(t('cart.total'))}</span><span>${sumLabel(Cart.total(), Cart.hasTbd())}</span></div>
    ${Cart.hasTbd() ? `<div class="src" style="margin:-8px 0 12px">${esc(t('price.tbd'))}</div>` : ''}
    <button class="btn btn-p btn-full" id="tocheck">${esc(t('cart.checkout'))}</button>`;

  openDrawer(t('cart.title'), body, foot);

  $$('#drawer [data-m]').forEach(b => b.onclick = () => { const i = S.cart.find(x => x.product_id === +b.dataset.m); Cart.set(+b.dataset.m, i.quantity - 1); openCart(); });
  $$('#drawer [data-p]').forEach(b => b.onclick = () => {
    const i = S.cart.find(x => x.product_id === +b.dataset.p);
    if (i.quantity >= (i.max || 999)) return toast(t('toast.max', { n: i.max }));
    Cart.set(+b.dataset.p, i.quantity + 1); openCart();
  });
  $$('#drawer [data-x]').forEach(b => b.onclick = () => { Cart.del(+b.dataset.x); openCart(); });
  // Typed quantity: commit on blur/Enter so the drawer isn't re-rendered mid-entry
  $$('#drawer [data-q]').forEach(inp => {
    inp.oninput   = () => { inp.value = inp.value.replace(/\D/g, ''); };
    inp.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); inp.blur(); } };
    inp.onchange  = () => {
      const id = +inp.dataset.q;
      const it = S.cart.find(x => x.product_id === id);
      if (!it) return;
      let v = parseInt(inp.value, 10);
      if (!v || v < 1) v = 1;
      if (v > (it.max || 999)) { v = it.max; toast(t('toast.max', { n: it.max })); }
      Cart.set(id, v);
      openCart();
    };
  });
  $('#tocheck').onclick = openCheckout;
}

// ═══ CHECKOUT ═══
function openCheckout() {
  const p = S.me?.profile || {};
  const authed = !!S.me?.authenticated;
  const loginBtn = S.cfg.telegram_login_enabled && !authed
    ? `<div class="note">${t('ck.login_note')}<div id="tglogin" style="margin-top:12px"></div></div>` : '';
  const meName = esc([S.me?.first_name, S.me?.last_name].filter(Boolean).join(' '));

  const body = `
    ${authed ? `<div class="note">${t('ck.authed', { name: meName })}</div>` : loginBtn}
    <form id="ckf">
      <div class="f"><label>${esc(t('ck.name'))}</label><input name="full_name" required value="${esc(p.full_name || [S.me?.first_name, S.me?.last_name].filter(Boolean).join(' ') || '')}" placeholder="${esc(t('ck.name_ph'))}"></div>
      <div class="f"><label>${esc(t('ck.phone'))}</label><input name="phone" required type="tel" value="${esc(p.phone || '')}" placeholder="${esc(t('ck.phone_ph'))}"></div>
      <div class="f-row">
        <div class="f"><label>${esc(t('ck.city'))}</label><input name="city" required value="${esc(p.city || '')}" placeholder="${esc(t('ck.city_ph'))}"></div>
        <div class="f"><label>${esc(t('ck.address'))}</label><input name="address" required value="${esc(p.address || '')}" placeholder="${esc(t('ck.addr_ph'))}"></div>
      </div>
      <div class="f"><label>${esc(t('ck.notes'))}</label><textarea name="notes" placeholder="${esc(t('ck.notes_ph'))}"></textarea></div>
      <div class="f-err hidden" id="ckerr"></div>
    </form>`;

  const foot = `
    <div class="sum"><span>${esc(t('cart.items'))}</span><span>${Cart.count()} ${esc(t('pcs'))}</span></div>
    <div class="sum-t"><span>${esc(t('ck.topay'))}</span><span>${sumLabel(Cart.total(), Cart.hasTbd())}</span></div>
    ${Cart.hasTbd() ? `<div class="src" style="margin:-8px 0 12px">${esc(t('price.tbd'))}</div>` : ''}
    <button class="btn btn-p btn-full" id="place">${esc(t('ck.place'))}</button>
    <button class="btn btn-s btn-full" id="backcart" style="margin-top:8px">${esc(t('ck.back'))}</button>`;

  openDrawer(t('ck.title'), body, foot);
  if (!authed && S.cfg.telegram_login_enabled) mountTelegramLogin($('#tglogin'));
  $('#backcart').onclick = openCart;
  $('#place').onclick = placeOrder;
}

async function placeOrder() {
  const f = $('#ckf'), err = $('#ckerr'), btn = $('#place');
  const g = {
    full_name: f.full_name.value.trim(), phone: f.phone.value.trim(),
    city: f.city.value.trim(), address: f.address.value.trim()
  };
  if (!g.full_name || !g.phone || !g.city || !g.address) {
    err.textContent = t('ck.err_fields'); err.classList.remove('hidden'); return;
  }
  if (g.phone.replace(/\D/g, '').length < 7) {
    err.textContent = t('ck.err_phone'); err.classList.remove('hidden'); return;
  }
  err.classList.add('hidden');
  btn.disabled = true; btn.textContent = t('ck.placing');

  try {
    const r = await api('/api/orders', {
      method: 'POST',
      body: JSON.stringify({
        items: S.cart.map(i => ({ product_id: i.product_id, quantity: i.quantity })),
        notes: f.notes.value.trim(), guest: g
      })
    });
    Cart.clear();
    S.products = await api('/api/products').catch(() => S.products);
    closeDrawer();
    openModal(`
      <div style="padding:44px 32px;text-align:center">
        <div style="font-size:54px">✅</div>
        <h2 style="font-size:23px;font-weight:700;margin:14px 0 8px">${esc(t('ck.done_title', { id: r.order_id }))}</h2>
        <p style="color:var(--tx2);font-size:15px;line-height:1.6;max-width:34ch;margin:0 auto 22px">
          ${t('ck.done_p', { phone: esc(g.phone) })}
          ${S.me?.authenticated ? esc(t('ck.done_tg')) : ''}
        </p>
        <button class="btn btn-p" id="okd">${esc(t('ck.ok'))}</button>
      </div>`);
    $('#okd').onclick = () => { closeModal(); if (S.me?.authenticated) location.hash = '#/orders'; else router(); };
  } catch (e) {
    err.textContent = e.message; err.classList.remove('hidden');
    btn.disabled = false; btn.textContent = t('ck.place');
  }
}

// ═══ TELEGRAM LOGIN ═══
function mountTelegramLogin(host) {
  if (!host || !S.cfg.bot_username) return;
  const s = document.createElement('script');
  s.async = true;
  s.src = 'https://telegram.org/js/telegram-widget.js?22';
  s.setAttribute('data-telegram-login', S.cfg.bot_username);
  s.setAttribute('data-size', 'medium');
  s.setAttribute('data-radius', '10');
  s.setAttribute('data-auth-url', location.href + '#/login');
  s.setAttribute('data-request-access', 'write');
  s.setAttribute('data-lang', S.lang || 'ru');
  host.appendChild(s);
}

// ═══ ORDERS ═══
async function ordersPage() {
  if (!S.me?.authenticated) {
    $('#main').innerHTML = `<div class="wrap"><div class="empty">
      <div class="empty-i">🔒</div><h3>${esc(t('orders.login_title'))}</h3>
      <p>${esc(t('orders.login_p'))}</p>
      <div id="tgl2" style="margin-top:10px"></div></div></div>`;
    mountTelegramLogin($('#tgl2'));
    return;
  }
  $('#main').innerHTML = `<div class="wrap"><div class="sec-head"><h1>${esc(t('orders.title'))}</h1></div><div class="spin"></div></div>`;
  try {
    S.orders = await api('/api/orders');
    const list = S.orders.length ? `<div class="olist">${S.orders.map(oCard).join('')}</div>`
      : `<div class="empty"><div class="empty-i">📋</div><h3>${esc(t('orders.none'))}</h3><p>${esc(t('orders.none_sub'))}</p><a class="btn btn-p" href="#/">${esc(t('orders.to_catalog'))}</a></div>`;
    $('#main').innerHTML = `<div class="wrap"><div class="sec-head"><h1>${esc(t('orders.title'))}</h1><p>${esc(t('orders.count', { n: S.orders.length }))}</p></div>${list}</div>`;
  } catch (e) {
    $('#main').innerHTML = `<div class="wrap"><div class="empty"><div class="empty-i">⚠️</div><h3>${esc(t('orders.err'))}</h3><p>${esc(e.message)}</p></div></div>`;
  }
}

function oCard(o) {
  return `<div class="ocard">
    <div class="ocard-h">
      <div><div class="ocard-id">${esc(t('orders.one', { id: o.id }))}</div><div class="ocard-d">${fmtDate(o.created_at)}</div></div>
      <span class="st st-${o.status}">${esc(stL(o.status))}</span>
    </div>
    <div class="oitems">${o.items.map(i => `${esc(i.name)}${i.litres ? ` (${esc(i.litres)})` : ''} × ${i.quantity}`).join('<br>')}</div>
    <div class="ocard-f">
      <span class="ocard-t">${sumLabel(o.total_price, itemsTbd(o.items), o.currency)}</span>
      <span class="src">${esc(o.city || '')}</span>
    </div>
  </div>`;
}

// ═══ KNOWLEDGE ARTICLES ═══
function articlePage(slug) {
  const articles = {
    viscosity: {
      kicker: 'How to Choose Oil', title: 'How to pick the right viscosity.',
      intro: 'The right viscosity helps the oil flow correctly during cold starts and protect the engine at operating temperature.',
      image: 'assets/viscosity.jpg',
      sections: [
        ['Read the SAE grade', '<p>Grades such as <b>5W-30</b> or <b>0W-20</b> describe how the oil behaves in cold and hot conditions. The number before W relates to low-temperature flow; the number after the dash describes viscosity at operating temperature.</p>'],
        ['Match the vehicle requirement', '<p>Start with the owner’s manual or the vehicle manufacturer’s current specification. Do not choose only by climate or marketing name: the required SAE grade and performance standard should match the engine.</p>'],
        ['Ask for the correct application', '<p>For a product recommendation, send us the vehicle model, engine, model year, fuel type and destination market. Carmon Oil can then prepare a suitable product shortlist for review.</p>']
      ]
    },
    fuel: {
      kicker: 'Application Guide', title: 'Diesel, gasoline or LPG?',
      intro: 'Fuel type is one of the first details to confirm when selecting engine oil because engines and operating conditions can require different standards.',
      image: 'assets/gasoline.jpg',
      sections: [
        ['Gasoline engines', '<p>Confirm the manufacturer’s required viscosity and performance category. Modern gasoline engines may also require a specific low-SAPS or fuel-economy standard.</p>'],
        ['Diesel engines', '<p>Diesel applications can have different soot, temperature and after-treatment requirements. Check whether the vehicle uses a particulate filter or other emissions equipment before choosing the oil.</p>'],
        ['LPG and mixed fleets', '<p>LPG vehicles and mixed fleets should be matched to the vehicle maker’s specification and actual operating conditions. For workshops and distributors, we can prepare options by vehicle group and application.</p>']
      ]
    },
    genuine: {
      kicker: 'Product Confidence', title: 'How to spot a genuine product.',
      intro: 'Packaging details are useful, but a genuine-product check should combine the container, documentation, seller and supply chain.',
      image: 'assets/product.jpg',
      sections: [
        ['Check the packaging', '<p>Look for consistent print quality, correct labels, intact seals, batch or lot markings and clear product information. Compare the pack with current official brand references where available.</p>'],
        ['Confirm the source', '<p>Ask who supplied the product, where it was stored and whether the batch can be connected to a clear invoice or export document. Unusually low prices and unclear provenance deserve additional caution.</p>'],
        ['Request supporting documents', '<p>For B2B orders, request the current product data sheet, packaging details and batch information before confirming the order. Final approvals and specifications should be checked against official technical documents.</p>']
      ]
    },
    delivery: {
      kicker: 'Export Guide', title: 'Delivery across the CIS.',
      intro: 'Carmon Oil prepares supply conversations around product availability, destination, documentation and the agreed delivery route.',
      image: 'assets/delivery.jpg',
      sections: [
        ['Start with the destination', '<p>Tell us the destination country, city, preferred delivery point and whether you are buying for a workshop, fleet, distributor or retail network.</p>'],
        ['Confirm the order details', '<p>We review the product list, viscosity, packaging, requested quantity and availability before preparing a quotation. Prices and lead times are confirmed per product and destination.</p>'],
        ['Prepare the shipment', '<p>The supply process can include product sourcing, order preparation, warehouse coordination, loading, documentation and agreed delivery support. Contact us for a destination-specific product list.</p>']
      ]
    }
  };
  const a = articles[slug] || articles.viscosity;
  $('#main').innerHTML = `<main class="article-page">
    <section class="article-hero" style="background-image:linear-gradient(90deg,rgba(7,22,34,.94),rgba(7,22,34,.55)),url('${a.image}')">
      <div class="wrap article-hero-in"><a class="article-back" href="#/">← Back to Carmon Oil</a><div class="lp-kicker lp-kicker-or">${a.kicker}</div><h1>${a.title}</h1><p>${a.intro}</p></div>
    </section>
    <section class="article-body"><div class="wrap article-layout"><div class="article-main">${a.sections.map(([h, body], i) => `<article class="article-block"><span>0${i + 1}</span><h2>${h}</h2>${body}</article>`).join('')}<div class="article-actions"><a class="btn-or" href="#/catalog">Explore Products <span class="arr">→</span></a><a class="article-link" href="#/business">Ask Carmon Oil <span>↗</span></a></div></div><aside class="article-aside"><div class="article-aside-kicker">Carmon Oil Guide</div><h3>Need a product recommendation?</h3><p>Share the vehicle, application, destination and required quantity. We will help prepare a shortlist for review.</p><a class="btn-or" href="#/business">Request a Quote <span class="arr">↗</span></a></aside></div></section>
  </main>`;
  requestAnimationFrame(() => initAnimations());
}

// ═══ PRESENTATION ═══
function presentationPage() {
  $('#main').innerHTML = `
    <main class="presentation-page">
      <section class="presentation-cover">
        <div class="presentation-cover-overlay"></div>
        <div class="wrap presentation-cover-in">
          <div class="lp-kicker lp-kicker-or">Carmon Oil · Production Presentation</div>
          <h1>Product Range.<br><span>Brand Story.</span><br>Export Ready.</h1>
          <p>A visual introduction to Carmon Oil, our lubricant product families and the export solutions prepared for distributors, workshops, fleets and international buyers.</p>
          <div class="presentation-actions">
            <a class="btn-or" href="#presentation-view">View Presentation <span class="arr">↓</span></a>
            <a class="btn-gl" href="/assets/carmon-oil-presentation.pdf" target="_blank" rel="noopener">Open Fullscreen <span class="arr">↗</span></a>
          </div>
          <div class="presentation-meta"><span>57-page production catalogue</span><span>Product families</span><span>Technical introductions</span><span>Export support</span></div>
        </div>
      </section>

      <section class="presentation-intro">
        <div class="wrap">
          <div class="presentation-intro-grid">
            <div>
              <div class="lp-kicker lp-kicker-or">Inside the Presentation</div>
              <h2>One catalogue.<br>Multiple supply routes.</h2>
            </div>
            <div class="presentation-intro-copy">
              <p>The Carmon Oil presentation brings together the company story, service model, lubricant families, technical references and export-focused supply process in one visual reference.</p>
              <a class="text-link" href="#/business">Request a product list <span>↗</span></a>
            </div>
          </div>
          <div class="presentation-points">
            <article><span>01</span><h3>Brand &amp; Export</h3><p>Global lubricant export positioning, Korean sourcing and partner supply.</p></article>
            <article><span>02</span><h3>Product Families</h3><p>PCMO, HDDEO, driveline, gear, SK AUTOUS engine and power ranges.</p></article>
            <article><span>03</span><h3>Technical Detail</h3><p>Viscosity, application, packaging and standards where confirmed.</p></article>
            <article><span>04</span><h3>Logistics Support</h3><p>Product selection, preparation, loading, documentation and delivery coordination.</p></article>
          </div>
        </div>
      </section>

      <section class="presentation-view" id="presentation-view">
        <div class="wrap">
          <div class="presentation-view-head">
            <div><div class="lp-kicker lp-kicker-or">Full Presentation</div><h2>Explore the Carmon Oil catalogue.</h2></div>
            <a class="btn-or" href="/assets/carmon-oil-presentation.pdf" target="_blank" rel="noopener">Open Full Presentation <span class="arr">↗</span></a>
          </div>
          <div class="presentation-pdf-frame"><iframe src="/assets/carmon-oil-presentation.pdf" title="Carmon Oil full presentation" loading="eager"></iframe></div>
        </div>
      </section>

      <section class="presentation-cta">
        <div class="wrap presentation-cta-in"><div><div class="lp-kicker lp-kicker-or">Ready to Discuss Supply?</div><h2>Turn the presentation into a product conversation.</h2></div><a class="btn-or" href="#/business">Request a B2B quote <span class="arr">↗</span></a></div>
      </section>
    </main>`;
  requestAnimationFrame(() => initAnimations());
}

// ═══ BRAND PAGES & COMPARISON ═══
function brandPage(brandName) {
  const b = BRANDS.find(x => x.id === brandName) || BRANDS[1];
  const profile = BRAND_PROFILES[b.id] || { eyebrow: 'Carmon Oil brand reference', title: `${b.label} product range.`, benefits: ['Product availability confirmed per request', 'Application-led selection', 'Destination-specific supply review'] };
  const products = productDataForBrand(b.id);
  const categories = uniqueValues(products, p => p.category).map(x => catL(x, true));
  const viscosities = uniqueValues(products, p => p.viscosity);
  const applications = productApplications(products).map(x => x.charAt(0).toUpperCase() + x.slice(1));
  const dataStatus = products.length ? 'Verified entries in current catalogue' : 'Catalogue lineup pending confirmation';
  $('#main').innerHTML = `
    <main class="brand-page">
      <section class="brand-page-hero">
        <div class="brand-page-hero-glow"></div>
        <div class="wrap brand-page-hero-in">
          <a class="article-back" href="#/compare-brands">← Back to Brand Comparison</a>
          <div class="brand-page-hero-grid">
            <div><div class="lp-kicker lp-kicker-or">${esc(profile.eyebrow)}</div><h1>${esc(profile.title)}</h1><p>${esc(BRAND_STORIES[b.id] || '')}</p><div class="brand-page-actions"><a class="btn-or" href="#brand-products">View Product Lineup <span class="arr">↓</span></a><a class="btn-gl" href="#/business">Request Brand Availability <span class="arr">↗</span></a></div></div>
            <div class="brand-page-logo-card"><span>BRAND REFERENCE</span><img src="${esc(b.logo)}" alt="${esc(b.label)}"><b>${esc(b.label)}</b></div>
          </div>
        </div>
      </section>
      <section class="brand-page-summary"><div class="wrap"><div class="brand-summary-grid"><div><div class="lp-kicker lp-kicker-or">At a glance</div><h2>Review the range.<br>Then build the request.</h2></div><p>Use this brand page to review the product records currently represented in the Carmon Oil catalogue. Final availability, commercial terms and destination support are confirmed per request.</p></div><div class="brand-stat-grid"><div><b>${products.length}</b><span>Catalogue products</span></div><div><b>${viscosities.length || '—'}</b><span>Viscosities entered</span></div><div><b>${categories.length || '—'}</b><span>Product types entered</span></div><div><b>${applications.length || '—'}</b><span>Applications entered</span></div></div></div></section>
      <section class="brand-benefits"><div class="wrap"><div class="lp-kicker lp-kicker-or">Why review ${esc(b.label)}</div><div class="brand-benefit-grid">${profile.benefits.map((x, i) => `<article><span>0${i + 1}</span><h3>${esc(x)}</h3><p>Reviewed against the product and destination details provided for the request.</p></article>`).join('')}</div></div></section>
      <section class="brand-data"><div class="wrap"><div class="brand-data-grid"><div><div class="lp-kicker lp-kicker-or">Catalogue snapshot</div><h2>What is currently entered.</h2><p class="brand-status">${esc(dataStatus)}</p></div><div class="brand-data-lists"><div><span>Product types</span><b>${esc(categories.length ? categories.join(' · ') : 'To be confirmed')}</b></div><div><span>Viscosities</span><b>${esc(viscosities.length ? viscosities.join(' · ') : 'To be confirmed')}</b></div><div><span>Applications</span><b>${esc(applications.length ? applications.join(' · ') : 'To be confirmed')}</b></div></div></div></div></section>
      <section class="brand-products" id="brand-products"><div class="wrap"><div class="brand-products-head"><div><div class="lp-kicker lp-kicker-or">${esc(b.label)} lineup</div><h2>Available products.</h2></div><a class="btn-or" href="#/compare-brands">Compare Brands <span class="arr">↗</span></a></div>${products.length ? `<div class="grid brand-product-grid">${products.map(p => `<div class="brand-product-card card" data-id="${p.id}">${cardHTML(p)}</div>`).join('')}</div>` : `<div class="brand-empty"><div class="brand-empty-mark">＋</div><h3>No confirmed products are entered for this brand yet.</h3><p>Request the current ${esc(b.label)} product list, packaging and availability for your destination.</p><a class="btn-or" href="#/business">Request Product List <span class="arr">↗</span></a></div>`}</div></section>
    </main>`;
  brandProductsHandlers($('#main'));
}

function compareBrandsPage() {
  $('#main').innerHTML = `
    <main class="compare-page">
      <section class="compare-hero"><div class="wrap compare-hero-in"><div class="lp-kicker lp-kicker-or">Carmon Oil Selection Tool</div><h1>Compare the brands<br><span>before you shortlist.</span></h1><p>Filter the current catalogue by brand, product type, viscosity and application. Then open a dedicated brand page or a product record for the details currently entered.</p></div></section>
      <section class="compare-body"><div class="wrap"><div class="compare-controls"><label><span>Brand</span><select id="compare-brand"><option value="all">All brands</option>${BRANDS.slice(1).map(b => `<option value="${esc(b.id)}">${esc(b.label)}</option>`).join('')}</select></label><label><span>Product type</span><select id="compare-category"><option value="all">All types</option>${I18N.CATS.map(c => `<option value="${esc(c.key)}">${esc(catL(c.key, true))}</option>`).join('')}</select></label><label><span>Viscosity</span><select id="compare-viscosity"><option value="all">All viscosities</option></select></label><label><span>Application</span><select id="compare-application"><option value="all">All applications</option><option value="diesel">Diesel</option><option value="gasoline">Gasoline</option><option value="lpg">LPG</option><option value="hybrid">Hybrid</option><option value="tgdi">TGDI</option></select></label></div><div class="compare-note">Showing catalogue data currently entered for Carmon Oil. Empty fields mean that the relevant product records still need to be confirmed.</div><div id="compare-results"></div></div></section>
    </main>`;
  const els = { brand: $('#compare-brand'), category: $('#compare-category'), viscosity: $('#compare-viscosity'), application: $('#compare-application'), results: $('#compare-results') };
  const values = uniqueValues(S.products, p => p.viscosity);
  els.viscosity.innerHTML = '<option value="all">All viscosities</option>' + values.map(v => `<option value="${esc(v)}">${esc(v)}</option>`).join('');
  const render = () => {
    const filtered = S.products.filter(p => (els.brand.value === 'all' || p.brand === els.brand.value) && (els.category.value === 'all' || p.category === els.category.value) && (els.viscosity.value === 'all' || p.viscosity === els.viscosity.value) && (els.application.value === 'all' || (p.fuel || '').split(',').includes(els.application.value)));
    const activeBrands = els.brand.value === 'all' ? BRANDS.slice(1) : BRANDS.filter(b => b.id === els.brand.value);
    els.results.innerHTML = `<div class="compare-table-head"><span>Brand</span><span>Product types</span><span>Viscosities</span><span>Applications</span><span>Products</span><span></span></div><div class="compare-rows">${activeBrands.map(b => { const ps = filtered.filter(p => p.brand === b.id); const cats = uniqueValues(ps, p => p.category).map(x => catL(x, true)); const vs = uniqueValues(ps, p => p.viscosity); const apps = productApplications(ps); return `<article class="compare-row${ps.length ? '' : ' compare-row--empty'}"><div class="compare-brand-cell"><img src="${esc(b.logo)}" alt="${esc(b.label)}"><strong>${esc(b.label)}</strong><a href="#/brand/${brandSlug(b.id)}">Open brand page ↗</a></div><div>${esc(cats.length ? cats.join(' · ') : '—')}</div><div>${esc(vs.length ? vs.join(' · ') : '—')}</div><div>${esc(apps.length ? apps.join(' · ') : '—')}</div><div class="compare-count">${ps.length}<small>${ps.length === 1 ? 'product' : 'products'}</small></div><div>${ps.length ? `<button class="compare-view" data-brand="${esc(b.id)}">View lineup</button>` : '<span class="compare-pending">Pending</span>'}</div></article>`; }).join('')}</div>`;
    els.results.querySelectorAll('.compare-view').forEach(btn => btn.onclick = () => location.hash = `#/brand/${brandSlug(btn.dataset.brand)}`);
  };
  Object.values(els).filter(x => x && x.tagName === 'SELECT').forEach(el => el.onchange = render);
  try { render(); } catch (err) { els.results.innerHTML = `<div class="empty"><div class="empty-i">!</div><h3>Comparison data needs review</h3><p>${esc(err.message || 'Please try again.')}</p></div>`; }
}

// ═══ LOGISTICS ═══
function logisticsPage() {
  $('#main').innerHTML = `
    <main class="info-page logistics-page">
      <section class="info-hero info-hero--logistics">
        <div class="wrap info-hero-in">
          <div class="lp-kicker lp-kicker-or">Built for Global Distribution</div>
          <h1>Reliable logistics.<br><span>Clear supply process.</span></h1>
          <p>From product selection and documentation to order preparation, loading and agreed delivery, Carmon Oil helps buyers move with a clearer plan.</p>
          <a class="btn-or" href="#/business">Plan a shipment <span class="arr">→</span></a>
        </div>
      </section>
      <section class="info-section">
        <div class="wrap">
          <div class="info-section-head"><div><div class="lp-kicker lp-kicker-or">How It Works</div><h2>From product list<br>to destination.</h2></div><p>Each route is confirmed around the product, quantity, destination and documents required for the agreed shipment.</p></div>
          <div class="info-steps">
            <article><span>01</span><h3>Choose the range</h3><p>Tell us the product family, brand, viscosity, packaging and intended application.</p></article>
            <article><span>02</span><h3>Confirm availability</h3><p>We review the requested list, destination and available supply before preparing a quotation.</p></article>
            <article><span>03</span><h3>Prepare documents</h3><p>Order preparation, loading coordination and agreed product documentation are aligned before dispatch.</p></article>
            <article><span>04</span><h3>Move the shipment</h3><p>Delivery timing and route are confirmed for the destination country, city and receiving partner.</p></article>
          </div>
        </div>
      </section>
      <section class="info-split">
        <div class="info-split-copy"><div class="lp-kicker lp-kicker-or">Export Support</div><h2>Built around your destination.</h2><p>Share the country, city, delivery point, product list and requested quantity. Carmon Oil can prepare a destination-specific supply conversation for distributors, workshops, fleets and retail networks.</p><div class="info-checks"><span>✓ Destination and product confirmation</span><span>✓ Warehouse and loading coordination</span><span>✓ Partner-aligned delivery support</span><span>✓ Documentation review before dispatch</span></div><a class="btn-or" href="#/business">Request a delivery plan <span class="arr">→</span></a></div>
        <div class="info-split-image"><img src="assets/shipping.png" alt="Carmon Oil export logistics"></div>
      </section>
      <section class="markets-section"><div class="wrap"><div class="lp-kicker lp-kicker-or">Delivery Markets</div><h2>Discuss the route for your market.</h2><div class="market-grid">${['Uzbekistan','Kyrgyzstan','Kazakhstan','Russia','Turkmenistan','Azerbaijan','Libya','Vietnam','Thailand','Georgia'].map((x, i) => `<div class="market-chip"><span>0${i + 1}</span>${x}</div>`).join('')}</div></div></section>
    </main>`;
}

// ═══ FOR BUSINESS ═══
function businessPage() {
  $('#main').innerHTML = `
    <main class="info-page business-page">
      <section class="info-hero info-hero--business">
        <div class="wrap info-hero-in">
          <div class="lp-kicker lp-kicker-or">For Distributors, Fleets & Workshops</div>
          <h1>A product conversation<br><span>built for business.</span></h1>
          <p>Request a product list, availability check, destination-specific quotation or supply discussion. Our team will help define the next step.</p>
          <a class="btn-or" href="#business-request">Start a request <span class="arr">↓</span></a>
        </div>
      </section>
      <section class="business-services info-section"><div class="wrap"><div class="info-section-head"><div><div class="lp-kicker lp-kicker-or">Business Support</div><h2>One contact for<br>the next move.</h2></div><p>Use this page for wholesale volumes, workshop supply, fleet requirements, distributor conversations and product sourcing.</p></div><div class="info-steps"><article><span>01</span><h3>Wholesale supply</h3><p>Discuss product families, packaging, quantities and repeat supply requirements.</p></article><article><span>02</span><h3>Product sourcing</h3><p>Share a brand, viscosity or application and we will prepare a relevant shortlist.</p></article><article><span>03</span><h3>Fleet & workshop</h3><p>Describe your vehicles or equipment so the requested application can be reviewed.</p></article><article><span>04</span><h3>Export coordination</h3><p>Confirm destination, documentation and delivery expectations with the supply team.</p></article></div></div></section>
      <section class="business-request" id="business-request"><div class="wrap business-request-grid"><div><div class="lp-kicker lp-kicker-or">Request a Quote</div><h2>Tell us what you<br>need to move.</h2><p>Include the products, viscosities, quantities, destination and your preferred contact. Final availability and commercial terms are confirmed by the Carmon Oil team.</p><div class="direct-contact"><b>Direct contact</b><span>+82 10-3768-2270</span><span>carmon1lubricants@gmail.com</span><span>Telegram: @carmon_oil_admin</span><span>Incheon, South Korea · 09:00–17:00</span></div></div><form class="business-form" id="business-lead"><label>Company<input name="company" placeholder="Company name" autocomplete="organization"></label><label>Country / destination<input name="country" placeholder="Uzbekistan, Kazakhstan…" autocomplete="country-name"></label><label>Phone, email or Telegram<input name="contact" placeholder="Your preferred contact" required autocomplete="tel"></label><label>Products and requirements<textarea name="message" rows="5" placeholder="Brands, product lines, viscosities, quantities and delivery needs"></textarea></label><button class="btn-or" type="submit">Send request <span class="arr">→</span></button><div class="business-form-msg" id="business-lead-msg"></div></form></div></section>
      <section class="business-faq"><div class="wrap"><div class="lp-kicker lp-kicker-or">Before You Contact Us</div><h2>What to include in your request.</h2><div class="faq">${[['Product','Brand, category, viscosity and packaging if known.'],['Quantity','Estimated units, cartons, pallets or recurring monthly demand.'],['Destination','Country, city and preferred receiving point.'],['Business type','Distributor, workshop, fleet, retailer or industrial buyer.']].map(([q,a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join('')}</div></div></section>
    </main>`;
  const form = $('#business-lead');
  if (form) form.onsubmit = async e => {
    e.preventDefault();
    const msg = $('#business-lead-msg'), btn = form.querySelector('button');
    const data = Object.fromEntries(new FormData(form).entries());
    if (String(data.contact || '').trim().length < 3) { msg.textContent = 'Please add a phone number, email or Telegram contact.'; msg.className = 'business-form-msg err'; return; }
    btn.disabled = true;
    try { await api('/api/lead', { method: 'POST', body: JSON.stringify(data) }); msg.textContent = 'Thank you. We will review your request and contact you.'; msg.className = 'business-form-msg ok'; form.reset(); }
    catch (er) { msg.textContent = er.message || 'The request could not be sent. Please use the direct contact details.'; msg.className = 'business-form-msg err'; }
    btn.disabled = false;
  };
}

// ═══ HELP ═══
function helpPage() {
  const faqs = [1, 2, 3, 4, 5, 6].map(n => [t(`faq.q${n}`), t(`faq.a${n}`)]);
  $('#main').innerHTML = `<div class="wrap">
    <div class="sec-head"><h1>${esc(t('help.title'))}</h1><p>${esc(t('help.sub'))}</p></div>
    <div class="help-g">
      <a class="help-c" href="https://t.me/carmon_oil_admin" target="_blank" rel="noopener">
        <div class="help-i">✈️</div><div><div class="help-l">Telegram</div><div class="help-v">@carmon_oil_admin</div></div>
      </a>
      <a class="help-c" href="tel:+821037682270">
        <div class="help-i">📞</div><div><div class="help-l">${esc(t('help.phone'))}</div><div class="help-v">+82 10-3768-2270</div></div>
      </a>
    </div>
    <div class="sec-head" style="padding-top:8px"><h1 style="font-size:22px">${esc(t('help.faq'))}</h1></div>
    <div class="faq">${faqs.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div>
  </div>`;
}

// ═══ WORKING PROCESS ═══
const PROCESS_STEPS = [
  {
    n: '01', icon: '📋',
    title: 'Inquiry & Price Calculation',
    body: 'Select the products and volume you need on the website and send us a request. We check stock availability at our Incheon warehouse (South Korea) and provide you with a competitive commercial offer.'
  },
  {
    n: '02', icon: '✈️',
    title: 'Agreement & Visa Support',
    badge: 'Official Visa Support',
    body: 'Once terms are agreed, we prepare an official business invitation letter for South Korea and a complete visa document package on your behalf.'
  },
  {
    n: '03', icon: '🤝',
    title: 'Meeting in Incheon & Contract',
    body: 'We meet you at Incheon Airport, bring you to our office or warehouse, finalise logistics, sign the contract and issue the Invoice.'
  },
  {
    n: '04', icon: '📦',
    title: 'Cargo Preparation & Loading',
    badge: '100% Real Process',
    body: 'Within 2 weeks we fully prepare the shipment, build out the container, pack and dispatch to the port. You receive a real photo report of the loading process.'
  },
  {
    n: '05', icon: '📄',
    title: 'Certificates & Documents (MSDS / PDS)',
    badge: 'MSDS / PDS Certified',
    body: 'We provide a complete customs documentation package: quality certificates, MSDS safety data sheets, and PDS technical specifications compliant with your country\'s regulations.'
  },
  {
    n: '06', icon: '🚢',
    title: 'Delivery to Destination Port',
    body: 'Shipping from South Korea to your destination port takes on average 20 to 45 days. We track the shipment and keep you updated throughout transit.'
  }
];

const PROCESS_PHOTOS = [
  'photo_2026-09-29_12-26-09.png',
  'photo_2026-09-29_12-26-56.png',
  'photo_2026-09-29_12-31-11.png',
  'photo_2026-09-29_12-34-10.png',
  'photo_2026-09-29_12-36-18.png',
  'photo_2026-09-29_12-36-45.png',
  'photo_2026-09-29_12-37-54.png',
  'photo_2026-09-29_12-38-38.png'
];

function processPage() {
  $('#main').innerHTML = `
    <main class="process-page">

      <section class="process-hero">
        <div class="process-hero-overlay"></div>
        <div class="wrap process-hero-in">
          <div class="lp-kicker lp-kicker-or">Transparent Supply Chain</div>
          <h1>How We Work:<br><span>From Inquiry to Delivery</span></h1>
          <p>A transparent, step-by-step process with official visa support, real-time cargo photos, and full certification for every shipment.</p>
          <div class="process-hero-badges">
            <span class="proc-badge proc-badge--visa">Official Visa Support</span>
            <span class="proc-badge proc-badge--msds">MSDS / PDS Certified</span>
            <span class="proc-badge proc-badge--real">100% Real Process</span>
          </div>
          <a class="btn-or" href="#process-steps">See the Process <span class="arr">&#x2193;</span></a>
        </div>
      </section>

      <section class="process-steps-sec" id="process-steps">
        <div class="wrap">
          <div class="proc-head">
            <div class="lp-kicker lp-kicker-or">Step by Step</div>
            <h2>6 steps from request<br>to your warehouse.</h2>
          </div>
          <div class="proc-steps">
            ${PROCESS_STEPS.map((s, i) => `
            <article class="proc-step anim">
              <div class="proc-step-num">${esc(s.n)}</div>
              ${s.badge ? `<span class="proc-step-badge">${esc(s.badge)}</span>` : ''}
              <div class="proc-step-icon">${s.icon}</div>
              <h3>${esc(s.title)}</h3>
              <p>${esc(s.body)}</p>
              ${i < PROCESS_STEPS.length - 1 ? '<div class="proc-step-connector"></div>' : ''}
            </article>`).join('')}
          </div>
        </div>
      </section>

      <section class="proc-gallery-sec">
        <div class="wrap">
          <div class="proc-head">
            <div class="lp-kicker lp-kicker-or">Real Shipments</div>
            <h2>Our actual<br>loading operations.</h2>
            <p>Every order receives a photo report. These are real images from our Incheon warehouse and loading operations.</p>
          </div>
          <div class="proc-gallery">
            ${PROCESS_PHOTOS.map((f, i) => `<div class="proc-gallery-item anim"><img src="/assets/${esc(f)}" alt="Carmon Oil shipment photo ${i + 1}" loading="lazy"></div>`).join('')}
          </div>
        </div>
      </section>

      <section class="proc-trust-sec">
        <div class="wrap">
          <div class="proc-trust-grid">
            <article class="proc-trust-card">
              <div class="proc-trust-icon">&#x2708;&#xFE0F;</div>
              <h3>Official Visa Support</h3>
              <p>We prepare your business invitation letter and visa document package so you can visit our Incheon warehouse and sign the contract in person.</p>
            </article>
            <article class="proc-trust-card">
              <div class="proc-trust-icon">&#x1F4CB;</div>
              <h3>Full Documentation</h3>
              <p>Every shipment includes MSDS safety data sheets, PDS technical specifications, quality certificates and all customs documents required for your country.</p>
            </article>
            <article class="proc-trust-card">
              <div class="proc-trust-icon">&#x1F4F8;</div>
              <h3>Real Photo Reports</h3>
              <p>You receive photos at every stage: warehouse, packing, container loading and port dispatch. No surprises — only confirmed, verified product.</p>
            </article>
            <article class="proc-trust-card">
              <div class="proc-trust-icon">&#x1F30E;</div>
              <h3>20 to 45 Day Transit</h3>
              <p>Standard shipping from Incheon to CIS and Central Asia ports. We track every shipment and send you updates throughout the transit period.</p>
            </article>
          </div>
        </div>
      </section>

      <section class="proc-cta-sec">
        <div class="wrap proc-cta-in">
          <div>
            <div class="lp-kicker lp-kicker-or">Start the Process</div>
            <h2>Ready to place your first order?</h2>
            <p>Send us your product list and required volume. We will check stock, calculate pricing and send a commercial offer within 24 hours.</p>
          </div>
          <div class="proc-cta-actions">
            <a class="btn-or" href="#/business">Request a Quote <span class="arr">&#x2192;</span></a>
            <a class="btn-gl" href="/assets/carmon-oil-presentation.pdf" target="_blank" rel="noopener">View Catalogue <span class="arr">&#x2197;</span></a>
          </div>
        </div>
      </section>

    </main>`;
  requestAnimationFrame(() => initAnimations());
}

// ═══ ADMIN ═══
function adminPage() {
  if (!S.me?.is_admin) {
    $('#main').innerHTML = `<div class="wrap"><div class="empty"><div class="empty-i">🔒</div><h3>${esc(t('admin.only'))}</h3><p>${esc(t('admin.only_p'))}</p><div id="tgl3" style="margin-top:10px"></div></div></div>`;
    mountTelegramLogin($('#tgl3'));
    return;
  }
  const tabs = [['stats', t('admin.stats')], ['products', t('admin.products')], ['orders', t('admin.orders')], ['settings', t('admin.settings')]];
  $('#main').innerHTML = `<div class="wrap">
    <div class="sec-head"><h1>${esc(t('admin.title'))}</h1></div>
    <div class="atabs">${tabs.map(([k, l]) => `<button class="atab${S.adminTab === k ? ' on' : ''}" data-t="${k}">${esc(l)}</button>`).join('')}</div>
    <div id="ac"></div></div>`;
  $$('.atab').forEach(b => b.onclick = () => { S.adminTab = b.dataset.t; adminPage(); });
  adminSection();
}

async function adminSection() {
  const ac = $('#ac'); if (!ac) return;
  ac.innerHTML = `<div class="spin"></div>`;
  try {
    if (S.adminTab === 'stats') return aStats(ac);
    if (S.adminTab === 'products') return aProducts(ac);
    if (S.adminTab === 'orders') return aOrders(ac);
    if (S.adminTab === 'settings') return aSettings(ac);
  } catch (e) {
    ac.innerHTML = `<div class="empty"><div class="empty-i">⚠️</div><h3>${esc(t('admin.err'))}</h3><p>${esc(e.message)}</p></div>`;
  }
}

async function aStats(ac) {
  const s = await api('/api/admin/stats');
  ac.innerHTML = `<div class="stats">
    <div class="stat"><div class="stat-v">${s.totalOrders}</div><div class="stat-l">${esc(t('admin.total_orders'))}</div></div>
    <div class="stat"><div class="stat-v" style="color:var(--warn)">${s.pendingOrders}</div><div class="stat-l">${esc(t('admin.pending'))}</div></div>
    <div class="stat"><div class="stat-v" style="color:var(--info)">${s.confirmedOrders}</div><div class="stat-l">${esc(t('admin.inwork'))}</div></div>
    <div class="stat"><div class="stat-v" style="color:var(--ok)">${s.deliveredOrders}</div><div class="stat-l">${esc(t('admin.delivered'))}</div></div>
    <div class="stat"><div class="stat-v">${fmt(s.totalRevenue)} ${esc(s.currency)}</div><div class="stat-l">${esc(t('admin.revenue'))}</div></div>
    <div class="stat"><div class="stat-v">${s.totalProducts}</div><div class="stat-l">${esc(t('admin.products_n'))}</div></div>
    <div class="stat"><div class="stat-v">${s.totalCustomers}</div><div class="stat-l">${esc(t('admin.customers'))}</div></div>
    <div class="stat"><div class="stat-v" style="color:var(--tx2)">${s.cancelledOrders}</div><div class="stat-l">${esc(t('admin.cancelled'))}</div></div>
  </div>
  <div style="margin-top:24px;display:flex;gap:12px;flex-wrap:wrap;">
    <a class="btn btn-p" href="/api/admin/export/products" download="products.xlsx">📥 Export products (.xlsx)</a>
    <a class="btn btn-p" href="/api/admin/export/orders" download="orders.xlsx">📥 Export sales history (.xlsx)</a>
  </div>`;
}

async function aProducts(ac) {
  const ps = await api('/api/admin/products');
  ac.innerHTML = `
    <div style="margin-bottom:18px"><button class="btn btn-p" id="addp">${esc(t('admin.add'))}</button></div>
    <div class="tbl-wrap"><table class="tbl">
      <thead><tr><th>${esc(t('admin.th_sort'))}</th><th></th><th>${esc(t('admin.th_name'))}</th><th>${esc(t('admin.th_specs'))}</th><th>${esc(t('admin.th_price'))}</th><th>${esc(t('admin.th_stock'))}</th><th></th></tr></thead>
      <tbody>${ps.map(p => `<tr>
        <td><input class="sort-in" type="number" min="0" value="${p.sort_order ?? 0}" data-so="${p.id}" title="${esc(t('admin.f_sort_hint'))}"></td>
        <td>${p.images?.[0] ? `<img class="pimg" src="${esc(p.images[0])}" alt="">` : `<div class="pimg ph" style="font-size:18px">🛢</div>`}</td>
        <td><b>${esc(p.name)}</b>${p.is_active ? '' : `<span class="badge-off">${esc(t('admin.hidden'))}</span>`}<div class="src">${esc(p.brand || '')}</div></td>
        <td class="src">${esc([catL(p.category, true), p.viscosity, p.litres, ...fuelL(p)].filter(Boolean).join(' · '))}</td>
        <td>${p.price !== null ? `<b>${fmt(p.price)}</b> ${esc(S.cur)}` : `<span class="src">${esc(t('price.ask'))}</span>`}</td>
        <td>${p.quantity} ${esc(t('pcs'))}</td>
        <td><div class="row-acts">
          <button class="mini" data-tg="${p.id}" title="${esc(p.is_active ? t('admin.hide') : t('admin.show'))}">${p.is_active ? '👁' : '🙈'}</button>
          <button class="mini" data-ed="${p.id}" title="${esc(t('admin.edit'))}">✏️</button>
          <button class="mini" data-sh="${p.id}" title="${esc(t('admin.share'))}">📣</button>
          <button class="mini" data-dup="${p.id}" title="Duplicate">⧉</button>
          <button class="mini mini-d" data-dl="${p.id}" title="${esc(t('admin.delete'))}">🗑</button>
        </div></td>
      </tr>`).join('')}</tbody>
    </table></div>`;

  $('#addp').onclick = () => productForm(null);
  // Inline position edit: saves on change, list re-sorts on next paint
  $$('[data-so]').forEach(inp => inp.onchange = async () => {
    const fd = new FormData(); fd.append('sort_order', String(parseInt(inp.value, 10) || 0)); fd.append('keep_images', 'true');
    try { await api(`/api/products/${inp.dataset.so}`, { method: 'PUT', body: fd }); toast(t('admin.updated')); S.products = await api('/api/products').catch(() => S.products); }
    catch (e) { toast(e.message); }
  });
  $$('[data-sh]').forEach(b => b.onclick = async () => {
    b.disabled = true;
    try { await api(`/api/products/${b.dataset.sh}/share`, { method: 'POST' }); toast(t('admin.shared')); }
    catch (e) { toast(`${t('admin.share_err')}: ${e.message}`); }
    b.disabled = false;
  });
  $$('[data-dup]').forEach(b => b.onclick = async () => {
    b.disabled = true;
    try {
      const np = await api(`/api/products/${b.dataset.dup}/duplicate`, { method: 'POST' });
      toast(`Duplicated → "${np.name}"`); adminSection();
    } catch (e) { toast(e.message); b.disabled = false; }
  });
  $$('[data-ed]').forEach(b => b.onclick = () => productForm(ps.find(x => x.id === +b.dataset.ed)));
  $$('[data-tg]').forEach(b => b.onclick = async () => {
    const p = ps.find(x => x.id === +b.dataset.tg);
    const fd = new FormData(); fd.append('is_active', p.is_active ? '0' : '1'); fd.append('keep_images', 'true');
    await api(`/api/products/${p.id}`, { method: 'PUT', body: fd });
    toast(p.is_active ? t('admin.hid') : t('admin.shown')); adminSection();
  });
  $$('[data-dl]').forEach(b => b.onclick = async () => {
    if (!confirm(t('admin.del_q'))) return;
    await api(`/api/products/${b.dataset.dl}`, { method: 'DELETE' });
    toast(t('admin.deleted')); adminSection();
  });
}

function productForm(p) {
  const ed = !!p; p = p || {}; S.newImgs = [];
  const cats = I18N.CATS.map(c => c.key);
  openModal(`
    <button class="modal-x" id="mx"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
    <div style="padding:30px">
      <h2 style="font-size:21px;font-weight:700;margin-bottom:20px">${esc(ed ? t('admin.f_edit') : t('admin.f_new'))}</h2>
      <form id="pf">
        <div class="f"><label>${esc(t('admin.f_name'))}</label><input name="name" required value="${esc(p.name || '')}" placeholder="Hyundai XTeer Gasoline G700"></div>
        <div class="f-row">
          <div class="f"><label>${esc(t('admin.f_brand'))}</label><select name="brand">${BRAND_IDS.map(b => `<option${(p.brand || 'Hyundai XTeer') === b ? ' selected' : ''}>${b}</option>`).join('')}</select></div>
          <div class="f"><label>${esc(t('admin.f_cat'))}</label><select name="category">${cats.map(c => `<option value="${esc(c)}"${(p.category || cats[0]) === c ? ' selected' : ''}>${esc(catL(c, true))}</option>`).join('')}</select></div>
        </div>
        <div class="f-row">
          <div class="f"><label>${esc(t('admin.f_visc'))}</label><input name="viscosity" value="${esc(p.viscosity || '')}" placeholder="5W-30"></div>
          <div class="f"><label>${esc(t('admin.f_vol'))}</label><input name="litres" value="${esc(p.litres || '')}" placeholder="${esc(t('admin.f_vol_ph'))}"></div>
        </div>
        <div class="f-row">
          <div class="f"><label>${esc(t('admin.f_price'))}</label><input name="price" type="number" min="0" step="0.01" value="${p.price ?? ''}" placeholder="—"></div>
          <div class="f"><label>${esc(t('admin.f_stock'))}</label><input name="quantity" type="number" min="0" value="${p.quantity ?? 0}"></div>
        </div>
        <div class="f-row">
          <div class="f"><label>${esc(t('admin.f_fuel'))}</label>
            <div class="checks">${I18N.FUELS.map(f => `<label class="check"><input type="checkbox" name="fuel" value="${f}"${(p.fuel || '').split(',').includes(f) ? ' checked' : ''}> ${esc(t('fuel.' + f))}</label>`).join('')}</div>
          </div>
          <div class="f"><label>${esc(t('admin.f_sort'))}</label><input name="sort_order" type="number" min="0" value="${p.sort_order ?? 0}"><div class="src" style="margin-top:6px">${esc(t('admin.f_sort_hint'))}</div></div>
        </div>
        <div class="f"><label>${esc(t('admin.f_desc'))}</label><textarea name="description" rows="6" placeholder="${esc(t('admin.f_desc_ph'))}">${esc(p.description || '')}</textarea><div class="src" style="margin-top:6px">${esc(t('admin.f_desc_hint'))}</div></div>
        <details class="f tr-box"${['uz','en','ko'].some(l => p['name_' + l] || p['desc_' + l]) ? ' open' : ''}>
          <summary>${esc(t('admin.f_i18n'))} <span class="src">— ${esc(t('admin.f_i18n_hint'))}</span></summary>
          ${I18N.LANGS.filter(l => l.code !== 'ru').map(l => `
            <div class="tr-lang"><div class="tr-lang-h">${l.flag} ${esc(l.name)}</div>
              <div class="f"><label>${esc(t('admin.f_name').replace(' *', ''))}</label><input name="name_${l.code}" value="${esc(p['name_' + l.code] || '')}"></div>
              <div class="f"><label>${esc(t('admin.f_desc'))}</label><textarea name="desc_${l.code}" rows="4">${esc(p['desc_' + l.code] || '')}</textarea></div>
            </div>`).join('')}
        </details>
        ${ed && p.images?.length ? `<div class="f"><label>${esc(t('admin.f_cur_photos'))}</label><div class="ups" id="exi">${p.images.map(i => `<div class="upi" data-img="${esc(i)}"><img src="${esc(i)}"><button type="button" data-rm="${esc(i)}">✕</button></div>`).join('')}</div></div>` : ''}
        <div class="f"><label>${esc(t('admin.f_add_photos'))}</label>
          <label class="up" for="fi"><div style="font-size:26px">📷</div><div style="font-size:14px;font-weight:600;margin-top:4px">${esc(t('admin.f_pick'))}</div><div class="src">${esc(t('admin.f_hint'))}</div><input type="file" id="fi" multiple accept="image/*"></label>
          <div class="ups" id="nip"></div>
        </div>
        <div class="f-err hidden" id="pfe"></div>
        <button type="submit" class="btn btn-p btn-full">${esc(ed ? t('admin.f_save') : t('admin.f_add'))}</button>
      </form>
    </div>`);

  $('#mx').onclick = closeModal;
  $$('[data-rm]').forEach(b => b.onclick = async () => {
    if (!confirm(t('admin.img_del_q'))) return;
    await api(`/api/products/${p.id}/image`, { method: 'DELETE', body: JSON.stringify({ image: b.dataset.rm }) });
    b.closest('.upi').remove(); toast(t('admin.img_deleted'));
  });
  $('#fi').onchange = e => {
    S.newImgs = [...e.target.files].slice(0, 10);
    const g = $('#nip'); g.innerHTML = '';
    S.newImgs.forEach((f, i) => {
      const r = new FileReader();
      r.onload = ev => {
        const d = document.createElement('div');
        d.className = 'upi';
        d.innerHTML = `<img src="${ev.target.result}"><button type="button">✕</button>`;
        d.querySelector('button').onclick = () => { S.newImgs = S.newImgs.filter(x => x !== f); d.remove(); };
        g.appendChild(d);
      };
      r.readAsDataURL(f);
    });
  };
  $('#pf').onsubmit = async e => {
    e.preventDefault();
    const f = e.target, btn = f.querySelector('button[type=submit]'), err = $('#pfe');
    const fd = new FormData();
    ['name', 'brand', 'category', 'viscosity', 'litres', 'price', 'quantity', 'description', 'sort_order',
     'name_uz', 'name_en', 'name_ko', 'desc_uz', 'desc_en', 'desc_ko'].forEach(k => fd.append(k, f[k].value));
    fd.append('fuel', [...f.querySelectorAll('input[name=fuel]:checked')].map(c => c.value).join(','));
    fd.append('keep_images', 'true');
    S.newImgs.forEach(x => fd.append('images', x));
    btn.disabled = true; btn.textContent = t('admin.f_saving');
    try {
      await api(ed ? `/api/products/${p.id}` : '/api/products', { method: ed ? 'PUT' : 'POST', body: fd });
      toast(ed ? t('admin.updated') : t('admin.added'));
      closeModal();
      S.products = await api('/api/products').catch(() => S.products);
      adminSection();
    } catch (er) {
      err.textContent = er.message; err.classList.remove('hidden');
      btn.disabled = false; btn.textContent = ed ? t('admin.f_save') : t('admin.f_add');
    }
  };
}

async function aOrders(ac) {
  const os = await api('/api/orders?all=true');
  const fl = [['all', t('admin.fl_all')], ['pending', t('admin.fl_pending')], ['confirmed', t('admin.fl_confirmed')], ['shipped', t('admin.fl_shipped')], ['delivered', t('admin.fl_delivered')], ['cancelled', t('admin.fl_cancelled')]];
  const list = S.orderFilter === 'all' ? os : os.filter(o => o.status === S.orderFilter);
  const SRC = { 'miniapp': t('admin.src_tg'), 'web': t('admin.src_web'), 'web-guest': t('admin.src_guest') };
  const STATUSES = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];

  ac.innerHTML = `
    <div class="pills" style="margin-bottom:18px">${fl.map(([k, l]) => `<button class="pill${S.orderFilter === k ? ' on' : ''}" data-f="${k}">${esc(l)}</button>`).join('')}</div>
    ${list.length ? `<div class="tbl-wrap"><table class="tbl">
      <thead><tr><th>#</th><th>${esc(t('admin.th_customer'))}</th><th>${esc(t('admin.th_items'))}</th><th>${esc(t('admin.th_sum'))}</th><th>${esc(t('admin.th_status'))}</th><th></th></tr></thead>
      <tbody>${list.map(o => `<tr>
        <td><b>#${o.id}</b><div class="src">${fmtDate(o.created_at)}</div></td>
        <td><b>${esc(o.full_name || t('admin.unknown'))}</b>
          <div class="src">${esc(o.phone || '')}</div>
          <div class="src">${esc(SRC[o.source] || '')}${o.user_username ? ` · @${esc(o.user_username)}` : ''}</div></td>
        <td class="src">${o.items.map(i => `${esc(i.name)} × ${i.quantity}`).join('<br>')}<div class="src">📍 ${esc(o.city || '')}, ${esc(o.address || '')}</div></td>
        <td><b>${sumLabel(o.total_price, itemsTbd(o.items), o.currency)}</b></td>
        <td><span class="st st-${o.status}">${esc(stL(o.status))}</span></td>
        <td><div class="row-acts">
          <select class="mini" style="width:auto;padding:6px 8px;font-size:12px" data-st="${o.id}">
            ${STATUSES.map(k => `<option value="${k}"${o.status === k ? ' selected' : ''}>${esc(stL(k))}</option>`).join('')}
          </select>
          ${o.user_username ? `<a class="mini" href="https://t.me/${esc(o.user_username)}" target="_blank" title="${esc(t('admin.write'))}">💬</a>` : `<a class="mini" href="tel:${esc(o.phone || '')}" title="${esc(t('admin.call'))}">📞</a>`}
        </div></td>
      </tr>`).join('')}</tbody></table></div>`
      : `<div class="empty"><div class="empty-i">📋</div><h3>${esc(t('admin.no_orders'))}</h3></div>`}`;

  $$('[data-f]').forEach(b => b.onclick = () => { S.orderFilter = b.dataset.f; adminSection(); });
  $$('[data-st]').forEach(s => s.onchange = async () => {
    try {
      await api(`/api/orders/${s.dataset.st}/status`, { method: 'PUT', body: JSON.stringify({ status: s.value }) });
      toast(t('admin.status_updated')); adminSection();
    } catch (e) { toast(e.message); }
  });
}

function aSettings(ac) {
  ac.innerHTML = `<div style="max-width:420px">
    <div class="f"><label>${esc(t('admin.cur_label'))}</label>
      <input id="cur" maxlength="3" value="${esc(S.cur)}" style="text-transform:uppercase" placeholder="UZS">
      <div class="src" style="margin-top:6px">${esc(t('admin.cur_hint'))}</div>
    </div>
    <div class="f-err hidden" id="ce"></div>
    <button class="btn btn-p" id="sc">${esc(t('admin.save'))}</button>
  </div>`;
  const inp = $('#cur');
  inp.oninput = () => inp.value = inp.value.toUpperCase().replace(/[^A-Z]/g, '');
  $('#sc').onclick = async () => {
    const v = inp.value.trim();
    const e = $('#ce');
    if (!/^[A-Z]{3}$/.test(v)) { e.textContent = t('admin.cur_err'); e.classList.remove('hidden'); return; }
    e.classList.add('hidden');
    try {
      const s = await api('/api/settings', { method: 'PUT', body: JSON.stringify({ currency: v }) });
      S.cur = s.currency; toast(t('admin.cur_saved', { cur: S.cur }));
    } catch (er) { e.textContent = er.message; e.classList.remove('hidden'); }
  };
}

// ═══ AUTH SLOT ═══
function paintAuth() {
  const slot = $('#auth-slot');
  if (S.me?.authenticated) {
    const nm = [S.me.first_name, S.me.last_name].filter(Boolean).join(' ');
    const ini = (S.me.first_name?.[0] || '?').toUpperCase();
    slot.innerHTML = `<button class="avatar-btn" id="ab"><span class="avatar-dot">${esc(ini)}</span><span class="avatar-name">${esc(nm)}</span></button>`;
    $('#ab').onclick = async () => {
      if (!confirm(t('nav.logout_q'))) return;
      await api('/auth/logout', { method: 'POST' });
      location.reload();
    };
    $('#nav-admin').hidden = !S.me.is_admin;
  } else {
    slot.innerHTML = S.cfg.telegram_login_enabled ? `<button class="nav-login-ghost" id="lb">${esc(t('nav.login'))}</button>` : '';
    const lb = $('#lb');
    if (lb) lb.onclick = () => {
      openModal(`<button class="modal-x" id="mx"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
        <div style="padding:40px 32px;text-align:center">
          <div style="font-size:46px">✈️</div>
          <h2 style="font-size:21px;font-weight:700;margin:12px 0 8px">${esc(t('login.title'))}</h2>
          <p style="color:var(--tx2);font-size:14px;line-height:1.6;max-width:32ch;margin:0 auto 20px">${esc(t('login.p'))}</p>
          <div id="tglm" style="display:flex;justify-content:center"></div>
          <p style="color:var(--tx3);font-size:12px;margin-top:18px">${esc(t('login.guest'))}</p>
        </div>`);
      $('#mx').onclick = closeModal;
      mountTelegramLogin($('#tglm'));
    };
    $('#nav-admin').hidden = true;
  }
}

// ═══ INIT ═══
async function init() {
  $('#yr').textContent = new Date().getFullYear();
  Cart.load(); paintCount();

  if ($('#btn-cart')) $('#btn-cart').onclick = openCart;
  $('#drawer-close').onclick = closeDrawer;
  $('#scrim').onclick = closeDrawer;
  $('#btn-menu').onclick = () => $('#hdr-nav').classList.toggle('open');
  initNavMenus();
  $('#lang-btn').onclick = () => openLangPicker(false);
  $('#modal').onclick = e => { if (e.target.id === 'modal') closeModal(); };
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    const lb = $('#lightbox');
    if (lb && !lb.classList.contains('hidden')) return closeLightbox();
    closeModal(); closeDrawer();
  });
  window.addEventListener('hashchange', router);

  // A language remembered in this browser applies immediately, before any fetch
  let saved = null;
  try { saved = localStorage.getItem(LS_LANG); } catch {}
  if (saved && I18N.T[saved]) applyLang(saved, { sync: false });
  else { S.lang = I18N.DEFAULT; paintStatic(); }

  const [me, st, cfg] = await Promise.all([
    api('/api/me').catch(() => ({ authenticated: false })),
    api('/api/settings').catch(() => ({ currency: 'UZS' })),
    api('/api/config').catch(() => ({}))
  ]);
  S.me = me; S.cur = st.currency || 'UZS'; S.cfg = cfg;

  // No local choice yet, but the account already picked one in the bot → reuse it
  if (!saved && me.authenticated && me.lang && I18N.T[me.lang]) applyLang(me.lang, { sync: false });
  else if (saved && me.authenticated && me.lang !== saved) applyLang(saved); // keep the account in step

  paintAuth();
  S.products = await api('/api/products').catch(() => []);
  if (!Array.isArray(S.products) || !S.products.length) S.products = LOCAL_PRODUCTS;
  router();

  // First visit and nothing to go on: ask before anything else
  if (!S.lang) openLangPicker(true);
}
init();
