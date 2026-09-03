// ═══ Carmon Oil — website ═══
const $  = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

const S = {
  products: [], cat: 'all', brand: 'all', q: '',
  cart: [], me: null, cfg: {}, cur: 'UZS',
  orders: [], adminTab: 'stats', orderFilter: 'all', newImgs: []
};

// ── API ──
async function api(url, opts = {}) {
  const isForm = opts.body instanceof FormData;
  const res = await fetch(url, {
    credentials: 'same-origin',
    ...opts,
    headers: { ...(isForm ? {} : { 'Content-Type': 'application/json' }), ...(opts.headers || {}) }
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Ошибка запроса');
  return res.json();
}

// ── Utils ──
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = n => Number(n).toLocaleString('ru');
const fmtDate = s => new Date(s).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const ST = { pending: 'Ожидает', confirmed: 'Подтверждён', shipped: 'Отправлен', delivered: 'Доставлен', cancelled: 'Отменён' };

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
function openModal(html) {
  $('#modal-card').innerHTML = html;
  $('#modal').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}
function closeModal() {
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
const CATS = ['all', 'Моторное масло', 'Трансмиссионное масло', 'Гидравлическое масло', 'Другое'];
const CATL = { all: 'Все', 'Моторное масло': 'Моторные', 'Трансмиссионное масло': 'Трансмиссионные', 'Гидравлическое масло': 'Гидравлические', 'Другое': 'Другое' };
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
      <h1>Оригинальное масло<br>из Кореи — Carmon Oil</h1>
      <p>Прямые поставки Hyundai XTeer, SK ZIC, Nexus, Apex, Autous и Kixx из Южной Кореи. Доставка по Узбекистану и странам СНГ.</p>
      <div class="hero-badges">
        <span class="hero-badge">🇰🇷 Импорт из Кореи</span>
        <span class="hero-badge">✅ Сертификаты качества</span>
        <span class="hero-badge">🚚 Доставка по СНГ</span>
      </div>
      <div class="hero-actions">
        <a class="btn-primary" href="#catalog-section">Смотреть каталог</a>
        <a class="btn-tg" href="https://t.me/hyundaixteeroilbot" target="_blank" rel="noopener">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248-1.97 9.289c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.48 14.013 4.52 13.1c-.658-.205-.67-.658.137-.975l10.84-4.179c.548-.2 1.027.12.85.975-.002.003-.005.003.005-.003l-.79-.67z"/></svg>
          Написать эксперту
        </a>
      </div>
    </div>
    <img class="hero-logo" src="/assets/logo.png" alt="" onerror="this.style.display='none'">
  </div></section>

  <section class="brands-strip">
    <div class="wrap">
      <p class="brands-strip-label">Мы работаем с ведущими корейскими брендами</p>
      <div class="brands-strip-logos">
        ${BRANDS.slice(1).map(b => `<div class="brands-strip-logo anim"><img src="${esc(b.logo)}" alt="${esc(b.label)}"></div>`).join('')}
      </div>
    </div>
  </section>

  <section class="about-strip wrap">
    <div class="about-strip-tag anim">О компании</div>
    <h2 class="about-big-title anim">Мы везём масло прямо<br>из сердца Кореи.</h2>
    <p class="about-big-lead anim">Carmon Lubricants базируется в Гояне, Южная Корея — в нескольких километрах от заводов, которые производят масла Hyundai XTeer, SK ZIC, Kixx и других ведущих брендов. Мы не посредники: мы сами отбираем продукцию, проверяем сертификаты и отправляем её напрямую в страны СНГ. Без лишних наценок, без подделок.</p>
    <div class="about-facts anim">
      <div class="about-fact"><span class="about-fact-n">6</span><span>брендов</span></div>
      <div class="about-fact"><span class="about-fact-n">🇰🇷</span><span>Корея, Гоян</span></div>
      <div class="about-fact"><span class="about-fact-n">СНГ</span><span>доставка</span></div>
    </div>
  </section>

  <section class="delivery-section">
    <div class="delivery-inner">
      <div class="delivery-header anim">
        <div class="delivery-label">Зона доставки</div>
        <h2 class="delivery-title">Доставляем в страны СНГ</h2>
      </div>
      <div class="delivery-stage">
        <canvas id="delivery-canvas"></canvas>
        <div class="delivery-country-overlay">
          <div id="delivery-flag" class="delivery-flag">🇺🇿</div>
          <div id="delivery-name" class="delivery-name">Узбекистан</div>
        </div>
        <button class="delivery-arrow delivery-arrow-l" id="delivery-prev">‹</button>
        <button class="delivery-arrow delivery-arrow-r" id="delivery-next">›</button>
      </div>
      <div class="delivery-dots" id="delivery-dots"></div>
    </div>
  </section>

  <div class="wrap" id="catalog-section">
    <div class="catalog-head anim">
      <h2 class="catalog-title">Каталог масел</h2>
    </div>
    <div class="toolbar">
      <div class="search">
        <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input id="q" type="search" placeholder="Поиск по названию или вязкости…" value="${esc(S.q)}">
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
    (b.logo ? `<img src="${esc(b.logo)}" alt="${esc(b.label)}">` : `<span>${esc(b.label)}</span>`) +
    `</button>`
  ).join('');
  $$('#brand-pills .brand-pill').forEach(btn => btn.onclick = () => {
    S.brand = btn.dataset.b; paintBrandPills(); paintGrid();
  });
}

function paintPills() {
  $('#pills').innerHTML = CATS.map(c => `<button class="pill${S.cat === c ? ' on' : ''}" data-c="${esc(c)}">${CATL[c]}</button>`).join('');
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
    g.innerHTML = `<div class="empty" style="grid-column:1/-1"><div class="empty-i">🔍</div><h3>Ничего не найдено</h3><p>Попробуйте изменить запрос или категорию</p></div>`;
    return;
  }
  g.innerHTML = list.map(cardHTML).join('');
  $$('#grid .card').forEach(c => c.onclick = () => openProduct(+c.dataset.id));
  $$('#grid .card-add').forEach(b => b.onclick = e => {
    e.stopPropagation();
    const p = S.products.find(x => x.id === +b.dataset.id);
    if (p?.quantity > 0) { Cart.add(p); toast(`«${p.name}» в корзине`); }
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
    { name: 'Узбекистан', flag: '🇺🇿',
      pts: [[100,105],[175,72],[275,78],[335,105],[375,132],[415,142],[455,168],[448,222],[415,258],[368,272],[298,278],[238,262],[178,272],[128,252],[88,212],[80,158]] },
    { name: 'Кыргызстан', flag: '🇰🇬',
      pts: [[58,152],[118,112],[198,97],[310,108],[418,128],[508,152],[542,188],[526,228],[478,248],[388,238],[308,250],[208,238],[128,218],[68,192]] },
    { name: 'Казахстан', flag: '🇰🇿',
      pts: [[42,62],[162,42],[322,47],[458,68],[538,98],[558,148],[552,198],[528,248],[488,292],[418,318],[338,328],[258,318],[188,288],[128,252],[68,202],[44,152]] },
    { name: 'Россия', flag: '🇷🇺',
      pts: [[28,52],[102,32],[222,27],[382,32],[522,47],[576,82],[580,132],[565,178],[545,218],[528,258],[508,292],[468,318],[418,332],[358,342],[288,337],[228,322],[168,297],[108,272],[62,237],[32,192],[18,142],[24,92]] },
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

  function makePath(pts) {
    const scale = Math.min(canvas.width / BASE_W, canvas.height / BASE_H) * 0.82;
    const ox = (canvas.width - BASE_W * scale) / 2;
    const oy = (canvas.height - BASE_H * scale) / 2;
    const p = new Path2D();
    pts.forEach(([px, py], i) => {
      const x = px * scale + ox, y = py * scale + oy;
      i === 0 ? p.moveTo(x, y) : p.lineTo(x, y);
    });
    p.closePath();
    return p;
  }

  function goTo(idx) {
    currentIdx = idx;
    const path = makePath(DELIVERY_COUNTRIES[idx].pts);
    dots.forEach(d => {
      d.active = ctx.isPointInPath(path, d.x, d.y);
      d.targetR = d.active ? 5.5 : 1.5;
    });
    const flagEl = document.getElementById('delivery-flag');
    const nameEl = document.getElementById('delivery-name');
    if (flagEl) flagEl.textContent = DELIVERY_COUNTRIES[idx].flag;
    if (nameEl) nameEl.textContent = DELIVERY_COUNTRIES[idx].name;
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
      const alpha = 0.08 + Math.max(0, (d.r - 1.5) / (5.5 - 1.5)) * 0.92;
      ctx.fillStyle = 'rgba(255,255,255,' + alpha.toFixed(2) + ')';
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
    <div class="card-img">${img}${ok ? '' : '<span class="tag-out">Нет в наличии</span>'}</div>
    <div class="card-b">
      <div class="card-n">${esc(p.name)}</div>
      <div class="card-s">${esc(sub)}</div>
      <div class="card-f">
        <div class="card-p">${fmt(p.price)} <span>${esc(S.cur)}</span></div>
        ${ok ? `<button class="card-add" data-id="${p.id}" aria-label="В корзину"><svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></button>` : ''}
      </div>
    </div>
  </article>`;
}

// ── Product modal ──
function openProduct(id) {
  const p = S.products.find(x => x.id === id); if (!p) return;
  const imgs = p.images?.length ? p.images : [];
  const ok = p.quantity > 0;
  const chips = [p.category, p.viscosity, p.litres].filter(Boolean).map(t => `<span class="chip">${esc(t)}</span>`).join('');

  openModal(`
    <button class="modal-x" id="mx" aria-label="Закрыть"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
    <div class="pd">
      <div class="pd-media">
        <div class="pd-main" id="pdm">${imgs.length ? `<img src="${esc(imgs[0])}" alt="${esc(p.name)}">` : `<div class="ph">🛢</div>`}</div>
        ${imgs.length > 1 ? `<div class="pd-thumbs">${imgs.map((im, i) => `<div class="pd-thumb${i === 0 ? ' on' : ''}" data-i="${i}"><img src="${esc(im)}" alt=""></div>`).join('')}</div>` : ''}
      </div>
      <div class="pd-info">
        <div class="pd-cat">${esc(p.category || '')}</div>
        <h2 class="pd-title">${esc(p.name)}</h2>
        <div class="pd-brand">${esc(p.brand || '')}</div>
        <div class="pd-tags">${chips}</div>
        <div class="pd-price">${fmt(p.price)} <span>${esc(S.cur)}</span></div>
        <div class="pd-stock">${ok ? `✅ В наличии: ${p.quantity} шт.` : '😔 Нет в наличии'}</div>
        ${p.description ? `<div class="pd-desc">${esc(p.description)}</div>` : ''}
        ${ok ? `
        <div class="qty">
          <div class="qbox">
            <button id="qm" aria-label="Меньше">−</button>
            <input id="qv" type="text" inputmode="numeric" value="1" aria-label="Количество">
            <button id="qp" aria-label="Больше">+</button>
          </div>
          <button class="btn btn-p" id="addc" style="flex:1">В корзину</button>
        </div>` : ''}
      </div>
    </div>`);

  $('#mx').onclick = closeModal;
  imgs.length > 1 && $$('.pd-thumb').forEach(t => t.onclick = () => {
    $$('.pd-thumb').forEach(x => x.classList.remove('on')); t.classList.add('on');
    $('#pdm').innerHTML = `<img src="${esc(imgs[+t.dataset.i])}" alt="">`;
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
      if (parseInt(qi.value, 10) > p.quantity) toast(`Доступно только ${p.quantity} шт.`);
      qi.value = n;
    };
    qi.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); qi.blur(); } };
    $('#qm').onclick = () => { qi.value = clamp(clamp(qi.value) - 1); };
    $('#qp').onclick = () => {
      const cur = clamp(qi.value);
      if (cur >= p.quantity) return toast(`Доступно только ${p.quantity} шт.`);
      qi.value = cur + 1;
    };
    $('#addc').onclick = () => {
      Cart.add(p, clamp(qi.value));
      toast(`«${p.name}» в корзине`);
      closeModal();
    };
  }
}

// ═══ CART DRAWER ═══
function openCart() {
  if (!S.cart.length) {
    openDrawer('Корзина', `<div class="empty"><div class="empty-i">🛒</div><h3>Корзина пуста</h3><p>Добавьте товары из каталога</p></div>`, '');
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
              <button data-m="${i.product_id}" aria-label="Меньше">−</button>
              <input type="text" inputmode="numeric" data-q="${i.product_id}" value="${i.quantity}" aria-label="Количество">
              <button data-p="${i.product_id}" aria-label="Больше">+</button>
            </div>
            <button class="ci-x" data-x="${i.product_id}" aria-label="Удалить"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
          </div>
        </div>
      </div>
    </div>`).join('');

  const foot = `
    <div class="sum"><span>Товаров</span><span>${Cart.count()} шт.</span></div>
    <div class="sum-t"><span>Итого</span><span>${fmt(Cart.total())} ${esc(S.cur)}</span></div>
    <button class="btn btn-p btn-full" id="tocheck">Оформить заказ</button>`;

  openDrawer('Корзина', body, foot);

  $$('#drawer [data-m]').forEach(b => b.onclick = () => { const i = S.cart.find(x => x.product_id === +b.dataset.m); Cart.set(+b.dataset.m, i.quantity - 1); openCart(); });
  $$('#drawer [data-p]').forEach(b => b.onclick = () => {
    const i = S.cart.find(x => x.product_id === +b.dataset.p);
    if (i.quantity >= (i.max || 999)) return toast(`Доступно только ${i.max} шт.`);
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
      if (v > (it.max || 999)) { v = it.max; toast(`Доступно только ${it.max} шт.`); }
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
    ? `<div class="note">
         <b>Войдите через Telegram</b>, чтобы получать уведомления о статусе заказа и видеть историю покупок.
         Или просто оформите заказ как гость — мы свяжемся с вами по телефону.
         <div id="tglogin" style="margin-top:12px"></div>
       </div>` : '';

  const body = `
    ${authed ? `<div class="note">Вы вошли как <b>${esc(S.me.first_name || '')} ${esc(S.me.last_name || '')}</b>. Подтверждение придёт в Telegram.</div>` : loginBtn}
    <form id="ckf">
      <div class="f"><label>ФИО *</label><input name="full_name" required value="${esc(p.full_name || [S.me?.first_name, S.me?.last_name].filter(Boolean).join(' ') || '')}" placeholder="Иванов Иван"></div>
      <div class="f"><label>Телефон *</label><input name="phone" required type="tel" value="${esc(p.phone || '')}" placeholder="+998 90 123 45 67"></div>
      <div class="f-row">
        <div class="f"><label>Город *</label><input name="city" required value="${esc(p.city || '')}" placeholder="Ташкент"></div>
        <div class="f"><label>Адрес *</label><input name="address" required value="${esc(p.address || '')}" placeholder="ул. Амира Темура, 1"></div>
      </div>
      <div class="f"><label>Комментарий</label><textarea name="notes" placeholder="Например: позвонить за час до доставки"></textarea></div>
      <div class="f-err hidden" id="ckerr"></div>
    </form>`;

  const foot = `
    <div class="sum"><span>Товаров</span><span>${Cart.count()} шт.</span></div>
    <div class="sum-t"><span>К оплате</span><span>${fmt(Cart.total())} ${esc(S.cur)}</span></div>
    <button class="btn btn-p btn-full" id="place">Подтвердить заказ</button>
    <button class="btn btn-s btn-full" id="backcart" style="margin-top:8px">Назад в корзину</button>`;

  openDrawer('Оформление', body, foot);
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
    err.textContent = 'Заполните все обязательные поля'; err.classList.remove('hidden'); return;
  }
  if (g.phone.replace(/\D/g, '').length < 7) {
    err.textContent = 'Введите корректный номер телефона'; err.classList.remove('hidden'); return;
  }
  err.classList.add('hidden');
  btn.disabled = true; btn.textContent = 'Оформляем…';

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
        <h2 style="font-size:23px;font-weight:700;margin:14px 0 8px">Заказ #${r.order_id} принят!</h2>
        <p style="color:var(--tx2);font-size:15px;line-height:1.6;max-width:34ch;margin:0 auto 22px">
          Мы свяжемся с вами по телефону <b>${esc(g.phone)}</b> для подтверждения доставки.
          ${S.me?.authenticated ? 'Подтверждение также отправлено в ваш Telegram.' : ''}
        </p>
        <button class="btn btn-p" id="okd">Отлично</button>
      </div>`);
    $('#okd').onclick = () => { closeModal(); if (S.me?.authenticated) location.hash = '#/orders'; else router(); };
  } catch (e) {
    err.textContent = e.message; err.classList.remove('hidden');
    btn.disabled = false; btn.textContent = 'Подтвердить заказ';
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
  host.appendChild(s);
}

// ═══ ORDERS ═══
async function ordersPage() {
  if (!S.me?.authenticated) {
    $('#main').innerHTML = `<div class="wrap"><div class="empty">
      <div class="empty-i">🔒</div><h3>Войдите, чтобы увидеть заказы</h3>
      <p>История заказов доступна после входа через Telegram. Гостевые заказы отслеживаются по телефону — мы позвоним вам.</p>
      <div id="tgl2" style="margin-top:10px"></div></div></div>`;
    mountTelegramLogin($('#tgl2'));
    return;
  }
  $('#main').innerHTML = `<div class="wrap"><div class="sec-head"><h1>Мои заказы</h1></div><div class="spin"></div></div>`;
  try {
    S.orders = await api('/api/orders');
    const list = S.orders.length ? `<div class="olist">${S.orders.map(oCard).join('')}</div>`
      : `<div class="empty"><div class="empty-i">📋</div><h3>Заказов пока нет</h3><p>Оформите первый заказ в каталоге</p><a class="btn btn-p" href="#/">В каталог</a></div>`;
    $('#main').innerHTML = `<div class="wrap"><div class="sec-head"><h1>Мои заказы</h1><p>${S.orders.length} заказ(ов)</p></div>${list}</div>`;
  } catch (e) {
    $('#main').innerHTML = `<div class="wrap"><div class="empty"><div class="empty-i">⚠️</div><h3>Ошибка загрузки</h3><p>${esc(e.message)}</p></div></div>`;
  }
}

function oCard(o) {
  return `<div class="ocard">
    <div class="ocard-h">
      <div><div class="ocard-id">Заказ #${o.id}</div><div class="ocard-d">${fmtDate(o.created_at)}</div></div>
      <span class="st st-${o.status}">${ST[o.status]}</span>
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
  const faqs = [
    ['Откуда привозите масло?', 'Мы импортируем оригинальное масло Hyundai Xteer напрямую из Южной Кореи. Вся продукция имеет сертификаты качества.'],
    ['Как быстро доставят заказ?', 'По Ташкенту — 1–2 рабочих дня. По регионам Узбекистана — 3–5 дней. Другие страны СНГ — уточняйте у менеджера.'],
    ['Как оплатить заказ?', 'Оплата при получении. Также возможна предоплата — уточните при подтверждении заказа.'],
    ['Можно ли вернуть товар?', 'Возврат возможен в течение 7 дней при сохранении оригинальной упаковки. Свяжитесь с нами в Telegram.'],
    ['В какие страны доставляете?', 'Узбекистан, Кыргызстан, Казахстан и другие страны СНГ. Уточните доставку в вашу страну через @r1m_nightrider.'],
    ['Нужен ли Telegram для заказа?', 'Нет. Вы можете оформить заказ как гость — достаточно имени, телефона и адреса. Вход через Telegram даёт историю заказов и уведомления о статусе.']
  ];
  $('#main').innerHTML = `<div class="wrap">
    <div class="sec-head"><h1>Помощь</h1><p>Свяжитесь с нами — ответим быстро</p></div>
    <div class="help-g">
      <a class="help-c" href="https://t.me/r1m_nightrider" target="_blank" rel="noopener">
        <div class="help-i">✈️</div><div><div class="help-l">Telegram</div><div class="help-v">@r1m_nightrider</div></div>
      </a>
      <a class="help-c" href="tel:+821037682270">
        <div class="help-i">📞</div><div><div class="help-l">Телефон</div><div class="help-v">+82 10 3768 2270</div></div>
      </a>
    </div>
    <div class="sec-head" style="padding-top:8px"><h1 style="font-size:22px">Частые вопросы</h1></div>
    <div class="faq">${faqs.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div>
  </div>`;
}

// ═══ ADMIN ═══
function adminPage() {
  if (!S.me?.is_admin) {
    $('#main').innerHTML = `<div class="wrap"><div class="empty"><div class="empty-i">🔒</div><h3>Доступ только для администраторов</h3><p>Войдите через Telegram с аккаунта администратора.</p><div id="tgl3" style="margin-top:10px"></div></div></div>`;
    mountTelegramLogin($('#tgl3'));
    return;
  }
  const tabs = [['stats', 'Статистика'], ['products', 'Товары'], ['orders', 'Заказы'], ['settings', 'Настройки']];
  $('#main').innerHTML = `<div class="wrap">
    <div class="sec-head"><h1>Панель управления</h1></div>
    <div class="atabs">${tabs.map(([k, l]) => `<button class="atab${S.adminTab === k ? ' on' : ''}" data-t="${k}">${l}</button>`).join('')}</div>
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
    ac.innerHTML = `<div class="empty"><div class="empty-i">⚠️</div><h3>Ошибка</h3><p>${esc(e.message)}</p></div>`;
  }
}

async function aStats(ac) {
  const s = await api('/api/admin/stats');
  ac.innerHTML = `<div class="stats">
    <div class="stat"><div class="stat-v">${s.totalOrders}</div><div class="stat-l">Всего заказов</div></div>
    <div class="stat"><div class="stat-v" style="color:var(--warn)">${s.pendingOrders}</div><div class="stat-l">Ожидают</div></div>
    <div class="stat"><div class="stat-v" style="color:var(--info)">${s.confirmedOrders}</div><div class="stat-l">В работе</div></div>
    <div class="stat"><div class="stat-v" style="color:var(--ok)">${s.deliveredOrders}</div><div class="stat-l">Доставлены</div></div>
    <div class="stat"><div class="stat-v">${fmt(s.totalRevenue)} ${esc(s.currency)}</div><div class="stat-l">Выручка</div></div>
    <div class="stat"><div class="stat-v">${s.totalProducts}</div><div class="stat-l">Товаров</div></div>
    <div class="stat"><div class="stat-v">${s.totalCustomers}</div><div class="stat-l">Покупателей</div></div>
    <div class="stat"><div class="stat-v" style="color:var(--tx2)">${s.cancelledOrders}</div><div class="stat-l">Отменены</div></div>
  </div>`;
}

async function aProducts(ac) {
  const ps = await api('/api/admin/products');
  ac.innerHTML = `
    <div style="margin-bottom:18px"><button class="btn btn-p" id="addp">+ Добавить товар</button></div>
    <div class="tbl-wrap"><table class="tbl">
      <thead><tr><th></th><th>Название</th><th>Характеристики</th><th>Цена</th><th>Остаток</th><th></th></tr></thead>
      <tbody>${ps.map(p => `<tr>
        <td>${p.images?.[0] ? `<img class="pimg" src="${esc(p.images[0])}" alt="">` : `<div class="pimg ph" style="font-size:18px">🛢</div>`}</td>
        <td><b>${esc(p.name)}</b>${p.is_active ? '' : '<span class="badge-off">скрыт</span>'}<div class="src">${esc(p.brand || '')}</div></td>
        <td class="src">${esc([p.category, p.viscosity, p.litres].filter(Boolean).join(' · '))}</td>
        <td><b>${fmt(p.price)}</b> ${esc(S.cur)}</td>
        <td>${p.quantity} шт.</td>
        <td><div class="row-acts">
          <button class="mini" data-tg="${p.id}" title="${p.is_active ? 'Скрыть' : 'Показать'}">${p.is_active ? '👁' : '🙈'}</button>
          <button class="mini" data-ed="${p.id}" title="Изменить">✏️</button>
          <button class="mini mini-d" data-dl="${p.id}" title="Удалить">🗑</button>
        </div></td>
      </tr>`).join('')}</tbody>
    </table></div>`;

  $('#addp').onclick = () => productForm(null);
  $$('[data-ed]').forEach(b => b.onclick = () => productForm(ps.find(x => x.id === +b.dataset.ed)));
  $$('[data-tg]').forEach(b => b.onclick = async () => {
    const p = ps.find(x => x.id === +b.dataset.tg);
    const fd = new FormData(); fd.append('is_active', p.is_active ? '0' : '1'); fd.append('keep_images', 'true');
    await api(`/api/products/${p.id}`, { method: 'PUT', body: fd });
    toast(p.is_active ? 'Товар скрыт' : 'Товар показан'); adminSection();
  });
  $$('[data-dl]').forEach(b => b.onclick = async () => {
    if (!confirm('Удалить товар из каталога?')) return;
    await api(`/api/products/${b.dataset.dl}`, { method: 'DELETE' });
    toast('Товар удалён'); adminSection();
  });
}

function productForm(p) {
  const ed = !!p; p = p || {}; S.newImgs = [];
  const cats = ['Моторное масло', 'Трансмиссионное масло', 'Гидравлическое масло', 'Другое'];
  openModal(`
    <button class="modal-x" id="mx"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
    <div style="padding:30px">
      <h2 style="font-size:21px;font-weight:700;margin-bottom:20px">${ed ? 'Редактировать товар' : 'Новый товар'}</h2>
      <form id="pf">
        <div class="f"><label>Название *</label><input name="name" required value="${esc(p.name || '')}" placeholder="Hyundai XTeer Gasoline G700"></div>
        <div class="f-row">
          <div class="f"><label>Бренд</label><select name="brand">${BRAND_IDS.map(b => `<option${(p.brand || 'Hyundai XTeer') === b ? ' selected' : ''}>${b}</option>`).join('')}</select></div>
          <div class="f"><label>Категория</label><select name="category">${cats.map(c => `<option${(p.category || cats[0]) === c ? ' selected' : ''}>${c}</option>`).join('')}</select></div>
        </div>
        <div class="f-row">
          <div class="f"><label>Вязкость</label><input name="viscosity" value="${esc(p.viscosity || '')}" placeholder="5W-30"></div>
          <div class="f"><label>Объём</label><input name="litres" value="${esc(p.litres || '')}" placeholder="4 л"></div>
        </div>
        <div class="f-row">
          <div class="f"><label>Цена *</label><input name="price" type="number" min="0" step="0.01" required value="${p.price ?? ''}"></div>
          <div class="f"><label>Остаток (шт.)</label><input name="quantity" type="number" min="0" value="${p.quantity ?? 0}"></div>
        </div>
        <div class="f"><label>Описание</label><textarea name="description" placeholder="Синтетическое моторное масло…">${esc(p.description || '')}</textarea></div>
        ${ed && p.images?.length ? `<div class="f"><label>Текущие фото</label><div class="ups" id="exi">${p.images.map(i => `<div class="upi" data-img="${esc(i)}"><img src="${esc(i)}"><button type="button" data-rm="${esc(i)}">✕</button></div>`).join('')}</div></div>` : ''}
        <div class="f"><label>Добавить фото</label>
          <label class="up" for="fi"><div style="font-size:26px">📷</div><div style="font-size:14px;font-weight:600;margin-top:4px">Выбрать изображения</div><div class="src">До 10 файлов · JPEG, PNG, WEBP</div><input type="file" id="fi" multiple accept="image/*"></label>
          <div class="ups" id="nip"></div>
        </div>
        <div class="f-err hidden" id="pfe"></div>
        <button type="submit" class="btn btn-p btn-full">${ed ? 'Сохранить' : 'Добавить товар'}</button>
      </form>
    </div>`);

  $('#mx').onclick = closeModal;
  $$('[data-rm]').forEach(b => b.onclick = async () => {
    if (!confirm('Удалить изображение?')) return;
    await api(`/api/products/${p.id}/image`, { method: 'DELETE', body: JSON.stringify({ image: b.dataset.rm }) });
    b.closest('.upi').remove(); toast('Фото удалено');
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
    btn.disabled = true; btn.textContent = 'Сохраняем…';
    try {
      await api(ed ? `/api/products/${p.id}` : '/api/products', { method: ed ? 'PUT' : 'POST', body: fd });
      toast(ed ? 'Товар обновлён' : 'Товар добавлен');
      closeModal();
      S.products = await api('/api/products').catch(() => S.products);
      adminSection();
    } catch (er) {
      err.textContent = er.message; err.classList.remove('hidden');
      btn.disabled = false; btn.textContent = ed ? 'Сохранить' : 'Добавить товар';
    }
  };
}

async function aOrders(ac) {
  const os = await api('/api/orders?all=true');
  const fl = [['all', 'Все'], ['pending', 'Ожидают'], ['confirmed', 'Принятые'], ['shipped', 'В пути'], ['delivered', 'Доставлены'], ['cancelled', 'Отменены']];
  const list = S.orderFilter === 'all' ? os : os.filter(o => o.status === S.orderFilter);
  const SRC = { 'miniapp': '📱 Telegram', 'web': '🌐 Сайт', 'web-guest': '🌐 Гость' };

  ac.innerHTML = `
    <div class="pills" style="margin-bottom:18px">${fl.map(([k, l]) => `<button class="pill${S.orderFilter === k ? ' on' : ''}" data-f="${k}">${l}</button>`).join('')}</div>
    ${list.length ? `<div class="tbl-wrap"><table class="tbl">
      <thead><tr><th>#</th><th>Покупатель</th><th>Состав</th><th>Сумма</th><th>Статус</th><th></th></tr></thead>
      <tbody>${list.map(o => `<tr>
        <td><b>#${o.id}</b><div class="src">${fmtDate(o.created_at)}</div></td>
        <td><b>${esc(o.full_name || 'Неизвестен')}</b>
          <div class="src">${esc(o.phone || '')}</div>
          <div class="src">${SRC[o.source] || ''}${o.user_username ? ` · @${esc(o.user_username)}` : ''}</div></td>
        <td class="src">${o.items.map(i => `${esc(i.name)} × ${i.quantity}`).join('<br>')}<div class="src">📍 ${esc(o.city || '')}, ${esc(o.address || '')}</div></td>
        <td><b>${fmt(o.total_price)}</b> ${esc(o.currency)}</td>
        <td><span class="st st-${o.status}">${ST[o.status]}</span></td>
        <td><div class="row-acts">
          <select class="mini" style="width:auto;padding:6px 8px;font-size:12px" data-st="${o.id}">
            ${Object.entries(ST).map(([k, v]) => `<option value="${k}"${o.status === k ? ' selected' : ''}>${v}</option>`).join('')}
          </select>
          ${o.user_username ? `<a class="mini" href="https://t.me/${esc(o.user_username)}" target="_blank" title="Написать">💬</a>` : `<a class="mini" href="tel:${esc(o.phone || '')}" title="Позвонить">📞</a>`}
        </div></td>
      </tr>`).join('')}</tbody></table></div>`
      : `<div class="empty"><div class="empty-i">📋</div><h3>Нет заказов</h3></div>`}`;

  $$('[data-f]').forEach(b => b.onclick = () => { S.orderFilter = b.dataset.f; adminSection(); });
  $$('[data-st]').forEach(s => s.onchange = async () => {
    try {
      await api(`/api/orders/${s.dataset.st}/status`, { method: 'PUT', body: JSON.stringify({ status: s.value }) });
      toast('Статус обновлён'); adminSection();
    } catch (e) { toast(e.message); }
  });
}

function aSettings(ac) {
  ac.innerHTML = `<div style="max-width:420px">
    <div class="f"><label>Код валюты (3 буквы)</label>
      <input id="cur" maxlength="3" value="${esc(S.cur)}" style="text-transform:uppercase" placeholder="UZS">
      <div class="src" style="margin-top:6px">Примеры: UZS, USD, RUB, KGS. Отображается рядом с каждой ценой.</div>
    </div>
    <div class="f-err hidden" id="ce"></div>
    <button class="btn btn-p" id="sc">Сохранить</button>
  </div>`;
  const inp = $('#cur');
  inp.oninput = () => inp.value = inp.value.toUpperCase().replace(/[^A-Z]/g, '');
  $('#sc').onclick = async () => {
    const v = inp.value.trim();
    const e = $('#ce');
    if (!/^[A-Z]{3}$/.test(v)) { e.textContent = 'Введите ровно 3 латинские буквы'; e.classList.remove('hidden'); return; }
    e.classList.add('hidden');
    try {
      const s = await api('/api/settings', { method: 'PUT', body: JSON.stringify({ currency: v }) });
      S.cur = s.currency; toast(`Валюта: ${S.cur}`);
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
      if (!confirm('Выйти из аккаунта?')) return;
      await api('/auth/logout', { method: 'POST' });
      location.reload();
    };
    $('#nav-admin').hidden = !S.me.is_admin;
  } else {
    slot.innerHTML = S.cfg.telegram_login_enabled ? `<button class="btn btn-s btn-sm" id="lb">Войти</button>` : '';
    const lb = $('#lb');
    if (lb) lb.onclick = () => {
      openModal(`<button class="modal-x" id="mx"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
        <div style="padding:40px 32px;text-align:center">
          <div style="font-size:46px">✈️</div>
          <h2 style="font-size:21px;font-weight:700;margin:12px 0 8px">Вход через Telegram</h2>
          <p style="color:var(--tx2);font-size:14px;line-height:1.6;max-width:32ch;margin:0 auto 20px">
            Войдите, чтобы видеть историю заказов и получать уведомления о статусе доставки.
          </p>
          <div id="tglm" style="display:flex;justify-content:center"></div>
          <p style="color:var(--tx3);font-size:12px;margin-top:18px">Заказ можно оформить и без входа — как гость.</p>
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
  $('#modal').onclick = e => { if (e.target.id === 'modal') closeModal(); };
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeModal(); closeDrawer(); } });
  window.addEventListener('hashchange', router);

  const [me, st, cfg] = await Promise.all([
    api('/api/me').catch(() => ({ authenticated: false })),
    api('/api/settings').catch(() => ({ currency: 'UZS' })),
    api('/api/config').catch(() => ({}))
  ]);
  S.me = me; S.cur = st.currency || 'UZS'; S.cfg = cfg;
  paintAuth();

  S.products = await api('/api/products').catch(() => []);
  router();
}
init();
