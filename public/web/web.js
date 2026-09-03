// ═══ Carmon Oil — website ═══
const $  = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

const S = {
  products: [], cat: 'all', brand: 'all', q: '',
  cart: [], me: null, cfg: {}, cur: 'UZS',
  orders: [], adminTab: 'stats', orderFilter: 'all', newImgs: [],
  lang: null, langLock: false
};

// ── i18n ──
const LS_LANG = 'carmon_lang';
const t    = (k, v) => I18N.t(S.lang || I18N.DEFAULT, k, v);
const catL = (k, full) => I18N.catLabel(S.lang || I18N.DEFAULT, k, full);
const stL  = s => t('st.' + s);

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
    else S.cart.push({ product_id: p.id, name: p.name, price: p.price, litres: p.litres, viscosity: p.viscosity, image: p.images?.[0] || '', quantity: Math.min(q, p.quantity), max: p.quantity });
    this.save();
  },
  set(id, q) {
    const i = S.cart.find(x => x.product_id === id); if (!i) return;
    if (q <= 0) return this.del(id);
    i.quantity = Math.min(q, i.max || 999); this.save();
  },
  del(id) { S.cart = S.cart.filter(i => i.product_id !== id); this.save(); },
  clear() { S.cart = []; this.save(); },
  total() { return S.cart.reduce((t, i) => t + i.price * i.quantity, 0); },
  count() { return S.cart.reduce((t, i) => t + i.quantity, 0); }
};
function paintCount() {
  const el = $('#cart-count'), c = Cart.count();
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
  $('#lang-btn-flag').textContent = L ? L.flag : '🌐';
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
      <img class="lang-pick-logo" src="/assets/logo.png" alt="Carmon Oil" onerror="this.style.display='none'">
      <h2>${I18N.LANGS.map(l => esc(I18N.t(l.code, 'lang.title'))).join(' · ')}</h2>
      <p>${esc(t('lang.sub'))}</p>
      <div class="lang-grid">
        ${I18N.LANGS.map(l => `<button class="lang-card${S.lang === l.code ? ' on' : ''}" data-lang="${l.code}"><span>${l.flag}</span><span>${esc(l.name)}</span></button>`).join('')}
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
const routes = { '': catalogPage, '/': catalogPage, '/orders': ordersPage, '/help': helpPage, '/admin': adminPage };
function router() {
  const hash = location.hash.replace(/^#/, '') || '/';
  const fn = routes[hash] || catalogPage;
  $$('.hdr-nav a').forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + (hash === '/' ? '/' : hash)));
  $('#hdr-nav').classList.remove('open');
  window.scrollTo(0, 0);
  fn();
}

// ═══ CATALOG ═══
const CATS = ['all', ...I18N.CATS.map(c => c.key)];
const BRANDS = [
  { id: 'all',           label: 'Все',           logo: null },
  { id: 'Hyundai XTeer', label: 'Hyundai XTeer', logo: '/assets/hyundailogo1.png' },
  { id: 'SK ZIC',        label: 'SK ZIC',        logo: '/assets/SK-ZIC-LOGO.png' },
  { id: 'Nexus',         label: 'Nexus',         logo: '/assets/nexus-logo.png' },
  { id: 'Apex',          label: 'Apex',          logo: '/assets/apex-logo.png' },
  { id: 'Autous',        label: 'Autous',        logo: '/assets/autous-logo.png' },
  { id: 'Kixx',          label: 'Kixx',          logo: '/assets/kixx-logo.png' },
];
const BRAND_IDS = BRANDS.slice(1).map(b => b.id);

function catalogPage() {
  $('#main').innerHTML = `
  <section class="hero"><div class="hero-in">
    <div>
      <h1>${t('hero.title')}</h1>
      <p>${esc(t('hero.p'))}</p>
      <div class="hero-badges">
        <span class="hero-badge">${esc(t('hero.b1'))}</span>
        <span class="hero-badge">${esc(t('hero.b2'))}</span>
        <span class="hero-badge">${esc(t('hero.b3'))}</span>
      </div>
      <div class="hero-actions">
        <a class="btn-primary" href="#catalog-section">${esc(t('hero.cta'))}</a>
        <a class="btn-tg" href="https://t.me/hyundaixteeroilbot" target="_blank" rel="noopener">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248-1.97 9.289c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.48 14.013 4.52 13.1c-.658-.205-.67-.658.137-.975l10.84-4.179c.548-.2 1.027.12.85.975-.002.003-.005.003.005-.003l-.79-.67z"/></svg>
          ${esc(t('hero.tg'))}
        </a>
      </div>
    </div>
    <img class="hero-logo" src="/assets/logo.png" alt="" onerror="this.style.display='none'">
  </div></section>

  <section class="brands-strip">
    <div class="wrap">
      <p class="brands-strip-label">${esc(t('brands.label'))}</p>
      <div class="brands-strip-logos">
        ${BRANDS.slice(1).map(b => `<div class="brands-strip-logo anim"><img src="${esc(b.logo)}" alt="${esc(b.label)}"></div>`).join('')}
      </div>
    </div>
  </section>

  <section class="about-strip wrap">
    <div class="about-strip-tag anim">${esc(t('about.tag'))}</div>
    <h2 class="about-big-title anim">${t('about.title')}</h2>
    <p class="about-big-lead anim">${esc(t('about.lead'))}</p>
    <div class="about-facts anim">
      <div class="about-fact"><span class="about-fact-n">6</span><span>${esc(t('about.f1'))}</span></div>
      <div class="about-fact"><span class="about-fact-n">🇰🇷</span><span>${esc(t('about.f2'))}</span></div>
      <div class="about-fact"><span class="about-fact-n">${esc(t('about.f3n'))}</span><span>${esc(t('about.f3'))}</span></div>
    </div>
  </section>

  <section class="delivery-section">
    <div class="delivery-inner">
      <div class="delivery-header anim">
        <div class="delivery-label">${esc(t('delivery.label'))}</div>
        <h2 class="delivery-title">${esc(t('delivery.title'))}</h2>
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

  <div class="wrap" id="catalog-section">
    <div class="catalog-head anim">
      <h2 class="catalog-title">${esc(t('catalog.title'))}</h2>
    </div>
    <div class="toolbar">
      <div class="search">
        <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input id="q" type="search" placeholder="${esc(t('catalog.search'))}" value="${esc(S.q)}">
      </div>
      <div class="brand-pills" id="brand-pills"></div>
      <div class="pills" id="pills"></div>
    </div>
    <div id="grid" class="grid"></div>
  </div>`;

  $('#q').addEventListener('input', e => { S.q = e.target.value; paintGrid(); });
  paintBrandPills(); paintPills(); paintGrid();
  requestAnimationFrame(() => { initAnimations(); initDeliveryMap(); });
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
  if (S.q) {
    const q = S.q.toLowerCase();
    list = list.filter(p => [p.name, p.viscosity, p.brand, p.litres].some(v => (v || '').toLowerCase().includes(q)));
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
    if (p?.quantity > 0) { Cart.add(p); toast(t('toast.added', { name: p.name })); }
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
  const img = p.images?.[0] ? `<img src="${esc(p.images[0])}" alt="${esc(p.name)}" loading="lazy">` : `<div class="ph">🛢</div>`;
  const ok = p.quantity > 0;
  const sub = [p.viscosity, p.litres].filter(Boolean).join(' · ') || p.brand || '';
  return `<article class="card${ok ? '' : ' dim'}" data-id="${p.id}">
    <div class="card-img">${img}${ok ? '' : `<span class="tag-out">${esc(t('stock.out'))}</span>`}</div>
    <div class="card-b">
      <div class="card-n">${esc(p.name)}</div>
      <div class="card-s">${esc(sub)}</div>
      <div class="card-f">
        <div class="card-p">${fmt(p.price)} <span>${esc(S.cur)}</span></div>
        ${ok ? `<button class="card-add" data-id="${p.id}" aria-label="${esc(t('add'))}"><svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></button>` : ''}
      </div>
    </div>
  </article>`;
}

// ── Product modal ──
function openProduct(id) {
  const p = S.products.find(x => x.id === id); if (!p) return;
  const imgs = p.images?.length ? p.images : [];
  const ok = p.quantity > 0;
  const chips = [catL(p.category, true), p.viscosity, p.litres].filter(Boolean).map(x => `<span class="chip">${esc(x)}</span>`).join('');

  openModal(`
    <button class="modal-x" id="mx" aria-label="${esc(t('close'))}"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
    <div class="pd">
      <div class="pd-media">
        <div class="pd-main" id="pdm">${imgs.length ? `<img src="${esc(imgs[0])}" alt="${esc(p.name)}">` : `<div class="ph">🛢</div>`}</div>
        ${imgs.length > 1 ? `<div class="pd-thumbs">${imgs.map((im, i) => `<div class="pd-thumb${i === 0 ? ' on' : ''}" data-i="${i}"><img src="${esc(im)}" alt=""></div>`).join('')}</div>` : ''}
      </div>
      <div class="pd-info">
        <div class="pd-cat">${esc(catL(p.category, true))}</div>
        <h2 class="pd-title">${esc(p.name)}</h2>
        <div class="pd-brand">${esc(p.brand || '')}</div>
        <div class="pd-tags">${chips}</div>
        <div class="pd-price">${fmt(p.price)} <span>${esc(S.cur)}</span></div>
        <div class="pd-stock">${ok ? esc(t('stock.in', { n: p.quantity })) : '😔 ' + esc(t('stock.out'))}</div>
        ${p.description ? `<div class="pd-desc">${esc(p.description)}</div>` : ''}
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
  imgs.length > 1 && $$('.pd-thumb').forEach(th => th.onclick = () => {
    $$('.pd-thumb').forEach(x => x.classList.remove('on')); th.classList.add('on');
    $('#pdm').innerHTML = `<img src="${esc(imgs[+th.dataset.i])}" alt="">`;
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
      toast(t('toast.added', { name: p.name }));
      closeModal();
    };
  }
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
          <div class="ci-p">${fmt(i.price * i.quantity)} ${esc(S.cur)}</div>
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
    <div class="sum-t"><span>${esc(t('cart.total'))}</span><span>${fmt(Cart.total())} ${esc(S.cur)}</span></div>
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
    <div class="sum-t"><span>${esc(t('ck.topay'))}</span><span>${fmt(Cart.total())} ${esc(S.cur)}</span></div>
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
  s.setAttribute('data-auth-url', location.origin + '/auth/telegram');
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
      <span class="ocard-t">${fmt(o.total_price)} ${esc(o.currency)}</span>
      <span class="src">${esc(o.city || '')}</span>
    </div>
  </div>`;
}

// ═══ HELP ═══
function helpPage() {
  const faqs = [1, 2, 3, 4, 5, 6].map(n => [t(`faq.q${n}`), t(`faq.a${n}`)]);
  $('#main').innerHTML = `<div class="wrap">
    <div class="sec-head"><h1>${esc(t('help.title'))}</h1><p>${esc(t('help.sub'))}</p></div>
    <div class="help-g">
      <a class="help-c" href="https://t.me/r1m_nightrider" target="_blank" rel="noopener">
        <div class="help-i">✈️</div><div><div class="help-l">Telegram</div><div class="help-v">@r1m_nightrider</div></div>
      </a>
      <a class="help-c" href="tel:+821037682270">
        <div class="help-i">📞</div><div><div class="help-l">${esc(t('help.phone'))}</div><div class="help-v">+82 10 3768 2270</div></div>
      </a>
    </div>
    <div class="sec-head" style="padding-top:8px"><h1 style="font-size:22px">${esc(t('help.faq'))}</h1></div>
    <div class="faq">${faqs.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div>
  </div>`;
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
  </div>`;
}

async function aProducts(ac) {
  const ps = await api('/api/admin/products');
  ac.innerHTML = `
    <div style="margin-bottom:18px"><button class="btn btn-p" id="addp">${esc(t('admin.add'))}</button></div>
    <div class="tbl-wrap"><table class="tbl">
      <thead><tr><th></th><th>${esc(t('admin.th_name'))}</th><th>${esc(t('admin.th_specs'))}</th><th>${esc(t('admin.th_price'))}</th><th>${esc(t('admin.th_stock'))}</th><th></th></tr></thead>
      <tbody>${ps.map(p => `<tr>
        <td>${p.images?.[0] ? `<img class="pimg" src="${esc(p.images[0])}" alt="">` : `<div class="pimg ph" style="font-size:18px">🛢</div>`}</td>
        <td><b>${esc(p.name)}</b>${p.is_active ? '' : `<span class="badge-off">${esc(t('admin.hidden'))}</span>`}<div class="src">${esc(p.brand || '')}</div></td>
        <td class="src">${esc([catL(p.category, true), p.viscosity, p.litres].filter(Boolean).join(' · '))}</td>
        <td><b>${fmt(p.price)}</b> ${esc(S.cur)}</td>
        <td>${p.quantity} ${esc(t('pcs'))}</td>
        <td><div class="row-acts">
          <button class="mini" data-tg="${p.id}" title="${esc(p.is_active ? t('admin.hide') : t('admin.show'))}">${p.is_active ? '👁' : '🙈'}</button>
          <button class="mini" data-ed="${p.id}" title="${esc(t('admin.edit'))}">✏️</button>
          <button class="mini mini-d" data-dl="${p.id}" title="${esc(t('admin.delete'))}">🗑</button>
        </div></td>
      </tr>`).join('')}</tbody>
    </table></div>`;

  $('#addp').onclick = () => productForm(null);
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
          <div class="f"><label>${esc(t('admin.f_price'))}</label><input name="price" type="number" min="0" step="0.01" required value="${p.price ?? ''}"></div>
          <div class="f"><label>${esc(t('admin.f_stock'))}</label><input name="quantity" type="number" min="0" value="${p.quantity ?? 0}"></div>
        </div>
        <div class="f"><label>${esc(t('admin.f_desc'))}</label><textarea name="description" placeholder="${esc(t('admin.f_desc_ph'))}">${esc(p.description || '')}</textarea></div>
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
    ['name', 'brand', 'category', 'viscosity', 'litres', 'price', 'quantity', 'description'].forEach(k => fd.append(k, f[k].value));
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
        <td><b>${fmt(o.total_price)}</b> ${esc(o.currency)}</td>
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
    slot.innerHTML = S.cfg.telegram_login_enabled ? `<button class="btn btn-s btn-sm" id="lb">${esc(t('nav.login'))}</button>` : '';
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

  $('#btn-cart').onclick = openCart;
  $('#drawer-close').onclick = closeDrawer;
  $('#scrim').onclick = closeDrawer;
  $('#btn-menu').onclick = () => $('#hdr-nav').classList.toggle('open');
  $('#lang-btn').onclick = () => openLangPicker(false);
  $('#modal').onclick = e => { if (e.target.id === 'modal') closeModal(); };
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeModal(); closeDrawer(); } });
  window.addEventListener('hashchange', router);

  // A language remembered in this browser applies immediately, before any fetch
  let saved = null;
  try { saved = localStorage.getItem(LS_LANG); } catch {}
  if (saved && I18N.T[saved]) applyLang(saved, { sync: false });
  else paintStatic();

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
  router();

  // First visit and nothing to go on: ask before anything else
  if (!S.lang) openLangPicker(true);
}
init();
