require('dotenv').config();
const express  = require('express');
const path     = require('path');
const crypto   = require('crypto');
const multer   = require('multer');
const fs       = require('fs');
const sharp    = require('sharp');
const TelegramBot = require('node-telegram-bot-api');
const db       = require('./db');

const app      = express();
const PORT     = process.env.PORT || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN;

// Admins: comma-separated ADMIN_IDS (falls back to legacy single ADMIN_ID)
const ADMIN_IDS = (process.env.ADMIN_IDS || process.env.ADMIN_ID || '')
  .split(',')
  .map(s => parseInt(s.trim()))
  .filter(Boolean);
const isAdminId = id => ADMIN_IDS.includes(Number(id));

// Escapes user-supplied text for Telegram's HTML parse mode. Names, usernames
// and addresses routinely contain characters that break Markdown parsing
// (e.g. the underscores in "@r1m_nightrider"), which rejects the entire message.
const esc = s => String(s ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');
const WEBAPP_URL = process.env.WEBAPP_URL || `http://localhost:${PORT}`;
// Local testing shortcut that lets a request claim any user id via a header.
// Gated behind its own explicit opt-in rather than NODE_ENV, so that simply
// forgetting to set NODE_ENV=production on a server cannot expose admin access.
const DEV_AUTH  = process.env.DEV_AUTH === '1';
const BOT_USERNAME = process.env.BOT_USERNAME || '';

// Production layout: website at "/", Mini App at "/app".
const WEB_AT_ROOT = process.env.WEB_AT_ROOT === '1';
const SHOP_PATH   = WEB_AT_ROOT ? '/' : '/shop/';
const MINIAPP_URL = WEB_AT_ROOT ? `${WEBAPP_URL.replace(/\/$/, '')}/app` : WEBAPP_URL;

// ─── Web sessions ─────────────────────────────────────────────────────────────
// The Mini App authenticates per-request with Telegram initData, but a browser
// has no such thing. Web visitors get a signed, stateless cookie instead.
const SESSION_SECRET = crypto.createHash('sha256').update(BOT_TOKEN + '|session').digest();
const SESSION_DAYS   = 30;

function signSession(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig  = crypto.createHmac('sha256', SESSION_SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}

function verifySession(token) {
  if (!token) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = crypto.createHmac('sha256', SESSION_SECRET).update(body).digest('base64url');
  const a = Buffer.from(sig), b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch { return null; }
}

function readCookie(req, name) {
  const raw = req.headers.cookie;
  if (!raw) return null;
  for (const part of raw.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === name) return decodeURIComponent(part.slice(idx + 1));
  }
  return null;
}

function setSessionCookie(req, res, user) {
  const token = signSession({
    id: user.id, first_name: user.first_name, last_name: user.last_name || '',
    username: user.username || '', exp: Date.now() + SESSION_DAYS * 864e5
  });
  const secure = req.secure || req.headers['x-forwarded-proto'] === 'https';
  res.setHeader('Set-Cookie',
    `sid=${encodeURIComponent(token)}; HttpOnly; Path=/; Max-Age=${SESSION_DAYS * 86400}; SameSite=Lax${secure ? '; Secure' : ''}`);
}

// Telegram Login Widget uses a different signing scheme than Mini App initData:
// the secret is a plain SHA-256 of the bot token, not an HMAC keyed by "WebAppData".
function validateLoginWidget(query) {
  const { hash, ...rest } = query;
  if (!hash) return null;
  const checkString = Object.keys(rest).sort().map(k => `${k}=${rest[k]}`).join('\n');
  const secret = crypto.createHash('sha256').update(BOT_TOKEN).digest();
  const expected = crypto.createHmac('sha256', secret).update(checkString).digest('hex');
  if (expected !== hash) return null;
  // Reject stale logins (replay protection)
  if (Date.now() / 1000 - Number(rest.auth_date || 0) > 86400) return null;
  return { id: Number(rest.id), first_name: rest.first_name, last_name: rest.last_name, username: rest.username };
}

// ─── Bot setup ───────────────────────────────────────────────────────────────
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// ─── Uploads directory ───────────────────────────────────────────────────────
// Product photos follow the database: on a volume when DATA_DIR is set,
// otherwise in public/uploads for local development.
const DATA_DIR = process.env.DATA_DIR || '';
const uploadsDir = DATA_DIR
  ? path.join(DATA_DIR, 'uploads')
  : path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Uploads are held in memory so they can be re-encoded before ever touching disk.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only images allowed'));
  }
});

// Phone cameras produce 4000px, multi-megabyte files. Customers browse this shop
// on mobile data, so every upload is downscaled and re-encoded as WebP.
const IMG_MAX_SIDE = 1400;
const IMG_QUALITY  = 82;

async function processImage(file) {
  const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}.webp`;
  const dest = path.join(uploadsDir, name);
  await sharp(file.buffer)
    .rotate()                       // honour EXIF orientation before stripping it
    .resize(IMG_MAX_SIDE, IMG_MAX_SIDE, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: IMG_QUALITY })
    .toFile(dest);
  return `/uploads/${name}`;
}

// Returns web paths for every uploaded file, skipping any that fail to decode
// rather than failing the whole product save.
async function processUploads(files) {
  const out = [];
  for (const f of files || []) {
    try { out.push(await processImage(f)); }
    catch (e) { console.error('Image processing failed:', f.originalname, e.message); }
  }
  return out;
}

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(express.json());
// Shared assets, reachable from both surfaces regardless of layout
app.use('/uploads', express.static(uploadsDir, { maxAge: '1y', immutable: true }));
app.use('/assets',  express.static(path.join(__dirname, 'assets')));

// Layout: in production the public website owns "/" and the Mini App moves to
// "/app". Locally the original layout is kept so nothing breaks mid-session.
if (WEB_AT_ROOT) {
  app.use('/app', express.static(path.join(__dirname, 'public')));
  app.use('/shop', express.static(path.join(__dirname, 'public', 'web'))); // legacy alias
  app.use(express.static(path.join(__dirname, 'public', 'web')));
} else {
  app.use(express.static(path.join(__dirname, 'public')));
  app.use('/shop', express.static(path.join(__dirname, 'public', 'web')));
}

// ─── Auth ────────────────────────────────────────────────────────────────────
function validateInitData(initData) {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return null;
    params.delete('hash');
    const dataCheck = [...params.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('\n');
    const secret = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
    const expected = crypto.createHmac('sha256', secret).update(dataCheck).digest('hex');
    if (hash !== expected) return null;
    const userStr = params.get('user');
    return userStr ? JSON.parse(userStr) : null;
  } catch { return null; }
}

// Resolves the caller's identity from any supported source, or null for a guest.
function resolveUser(req) {
  // Dev bypass
  if (DEV_AUTH && req.headers['x-dev-user-id']) {
    const devId = parseInt(req.headers['x-dev-user-id']);
    return { id: devId, first_name: 'Dev', last_name: 'User', username: 'devuser', src: 'dev' };
  }
  // Telegram Mini App
  const initData = req.headers['x-init-data'];
  if (initData) {
    const user = validateInitData(initData);
    if (user) return { ...user, src: 'miniapp' };
  }
  // Web session cookie
  const sess = verifySession(readCookie(req, 'sid'));
  if (sess) return { id: sess.id, first_name: sess.first_name, last_name: sess.last_name, username: sess.username, src: 'web' };
  return null;
}

// Attaches identity when present, but allows guests through (public browsing).
function optionalAuth(req, _res, next) {
  const user = resolveUser(req);
  req.tgUser  = user;
  req.isAdmin = !!user && isAdminId(user.id);
  next();
}

// Requires a signed-in identity.
function authMiddleware(req, res, next) {
  const user = resolveUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  req.tgUser  = user;
  req.isAdmin = isAdminId(user.id);
  next();
}

function adminOnly(req, res, next) {
  if (!req.isAdmin) return res.status(403).json({ error: 'Admin only' });
  next();
}

// ─── Settings ────────────────────────────────────────────────────────────────
function getSettings() {
  const rows = db.prepare('SELECT * FROM settings').all();
  return Object.fromEntries(rows.map(r => [r.key, r.value]));
}

// ─── Web auth routes ──────────────────────────────────────────────────────────
app.get('/auth/telegram', (req, res) => {
  const user = validateLoginWidget(req.query);
  if (!user) return res.status(401).send('Ошибка авторизации. Попробуйте ещё раз.');

  db.prepare(`
    INSERT INTO users (telegram_id, first_name, last_name, username)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(telegram_id) DO UPDATE SET
      first_name = excluded.first_name,
      last_name  = excluded.last_name,
      username   = excluded.username,
      updated_at = CURRENT_TIMESTAMP
  `).run(user.id, user.first_name || '', user.last_name || '', user.username || '');

  setSessionCookie(req, res, user);
  res.redirect(SHOP_PATH);
});

app.post('/auth/logout', (req, res) => {
  const secure = req.secure || req.headers['x-forwarded-proto'] === 'https';
  res.setHeader('Set-Cookie', `sid=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax${secure ? '; Secure' : ''}`);
  res.json({ success: true });
});

// Platform health probe (Railway, load balancers). Cheap and unauthenticated.
app.get('/healthz', (_req, res) => res.json({ ok: true, uptime: process.uptime() }));

app.get('/api/config', (_req, res) => res.json({
  bot_username: BOT_USERNAME,
  telegram_login_enabled: !!BOT_USERNAME
}));

app.get('/api/settings', (_req, res) => res.json(getSettings()));

app.put('/api/settings', authMiddleware, adminOnly, (req, res) => {
  const { currency } = req.body;
  if (currency && /^[A-Z]{3}$/.test(currency)) {
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('currency', currency);
  }
  res.json(getSettings());
});

// ─── Profile ─────────────────────────────────────────────────────────────────
app.get('/api/me', optionalAuth, (req, res) => {
  const u = req.tgUser;
  if (!u) return res.json({ authenticated: false, is_admin: false, profile: null });
  const profile = db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(u.id);
  res.json({
    authenticated: true,
    telegram_id: u.id,
    first_name:  u.first_name,
    last_name:   u.last_name  || '',
    username:    u.username   || '',
    is_admin:    req.isAdmin,
    profile:     profile || null
  });
});

app.post('/api/profile', authMiddleware, (req, res) => {
  const u = req.tgUser;
  const { full_name, phone, city, address } = req.body;
  if (!full_name || !phone || !city || !address)
    return res.status(400).json({ error: 'Заполните все поля' });

  db.prepare(`
    INSERT INTO users (telegram_id, first_name, last_name, username, full_name, phone, city, address)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(telegram_id) DO UPDATE SET
      first_name = excluded.first_name,
      last_name  = excluded.last_name,
      username   = excluded.username,
      full_name  = excluded.full_name,
      phone      = excluded.phone,
      city       = excluded.city,
      address    = excluded.address,
      updated_at = CURRENT_TIMESTAMP
  `).run(u.id, u.first_name, u.last_name || '', u.username || '', full_name, phone, city, address);

  res.json(db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(u.id));
});

// ─── Products ─────────────────────────────────────────────────────────────────
function parseProduct(p) {
  p.images = JSON.parse(p.images || '[]');
  return p;
}

app.get('/api/products', optionalAuth, (req, res) => {
  const { category, search } = req.query;
  let q = 'SELECT * FROM products WHERE is_active = 1';
  const params = [];
  if (category && category !== 'all') { q += ' AND category = ?'; params.push(category); }
  if (search) { q += ' AND (name LIKE ? OR viscosity LIKE ? OR brand LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
  q += ' ORDER BY sort_order ASC, id DESC';
  res.json(db.prepare(q).all(...params).map(parseProduct));
});

app.get('/api/admin/products', authMiddleware, adminOnly, (_req, res) => {
  res.json(db.prepare('SELECT * FROM products ORDER BY id DESC').all().map(parseProduct));
});

app.get('/api/products/:id', optionalAuth, (req, res) => {
  const p = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!p) return res.status(404).json({ error: 'Not found' });
  res.json(parseProduct(p));
});

app.post('/api/products', authMiddleware, adminOnly, upload.array('images', 10), async (req, res) => {
  const { name, description, litres, price, quantity, brand, viscosity, category, sort_order } = req.body;
  if (!name || !price) return res.status(400).json({ error: 'Название и цена обязательны' });
  const images = await processUploads(req.files);
  const r = db.prepare(`
    INSERT INTO products (name, description, litres, price, quantity, images, brand, viscosity, category, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(name, description || '', litres || '', parseFloat(price), parseInt(quantity) || 0,
    JSON.stringify(images), brand || 'Hyundai Xteer', viscosity || '',
    category || 'Моторное масло', parseInt(sort_order) || 0);
  res.json(parseProduct(db.prepare('SELECT * FROM products WHERE id = ?').get(r.lastInsertRowid)));
});

app.put('/api/products/:id', authMiddleware, adminOnly, upload.array('images', 10), async (req, res) => {
  const p = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!p) return res.status(404).json({ error: 'Not found' });

  const { name, description, litres, price, quantity, brand, viscosity, category, sort_order, is_active, keep_images } = req.body;
  let images = JSON.parse(p.images || '[]');

  if (req.files && req.files.length > 0) {
    const newImgs = await processUploads(req.files);
    images = keep_images === 'true' ? [...images, ...newImgs] : newImgs;
  }

  db.prepare(`
    UPDATE products SET name=?, description=?, litres=?, price=?, quantity=?, images=?,
      brand=?, viscosity=?, category=?, sort_order=?, is_active=?, updated_at=CURRENT_TIMESTAMP
    WHERE id=?
  `).run(
    name ?? p.name, description ?? p.description, litres ?? p.litres,
    price ? parseFloat(price) : p.price,
    quantity !== undefined ? parseInt(quantity) : p.quantity,
    JSON.stringify(images), brand ?? p.brand, viscosity ?? p.viscosity,
    category ?? p.category,
    sort_order !== undefined ? parseInt(sort_order) : p.sort_order,
    is_active !== undefined ? parseInt(is_active) : p.is_active,
    req.params.id
  );
  res.json(parseProduct(db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id)));
});

app.delete('/api/products/:id/image', authMiddleware, adminOnly, (req, res) => {
  const { image } = req.body;
  const p = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!p) return res.status(404).json({ error: 'Not found' });
  let images = JSON.parse(p.images || '[]').filter(i => i !== image);
  // basename() keeps a crafted path from escaping the uploads directory
  const fp = path.join(uploadsDir, path.basename(String(image || '')));
  if (fs.existsSync(fp)) fs.unlinkSync(fp);
  db.prepare('UPDATE products SET images=? WHERE id=?').run(JSON.stringify(images), req.params.id);
  res.json({ images });
});

app.delete('/api/products/:id', authMiddleware, adminOnly, (req, res) => {
  db.prepare('DELETE FROM products WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// ─── Orders ──────────────────────────────────────────────────────────────────
// Validates and trims guest contact details; returns null if anything is missing.
function normalizeGuest(g) {
  if (!g) return null;
  const full_name = String(g.full_name || '').trim();
  const phone     = String(g.phone || '').trim();
  const city      = String(g.city || '').trim();
  const address   = String(g.address || '').trim();
  if (!full_name || !phone || !city || !address) return null;
  if (phone.replace(/\D/g, '').length < 7) return null;
  return { full_name, phone, city, address };
}

function formatOrderText(order, profile, items, currency, orderId) {
  const lines = items.map(i =>
    `• ${esc(i.name)}${i.litres ? ` (${esc(i.litres)})` : ''}${i.viscosity ? ` ${esc(i.viscosity)}` : ''} × ${i.quantity} шт. = ${i.subtotal.toLocaleString('ru')} ${esc(currency)}`
  ).join('\n');
  return { lines, total: `${order.total_price.toLocaleString('ru')} ${esc(currency)}` };
}

app.post('/api/orders', optionalAuth, async (req, res) => {
  const u = req.tgUser;
  const { items, notes, guest } = req.body;

  if (!items || !items.length) return res.status(400).json({ error: 'Корзина пуста' });

  // Signed-in customers order against their saved profile; web visitors may
  // check out as guests by supplying contact details with the order.
  let profile, isGuest = false;
  if (u) {
    profile = db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(u.id);
    // A web visitor logged in via Telegram may not have filled a profile yet;
    // fall back to details sent with this order.
    if ((!profile?.full_name || !profile?.phone) && guest) {
      const g = normalizeGuest(guest);
      if (!g) return res.status(400).json({ error: 'Заполните имя, телефон, город и адрес' });
      db.prepare(`
        INSERT INTO users (telegram_id, first_name, last_name, username, full_name, phone, city, address)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(telegram_id) DO UPDATE SET
          full_name=excluded.full_name, phone=excluded.phone,
          city=excluded.city, address=excluded.address, updated_at=CURRENT_TIMESTAMP
      `).run(u.id, u.first_name || '', u.last_name || '', u.username || '', g.full_name, g.phone, g.city, g.address);
      profile = db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(u.id);
    }
    if (!profile?.full_name || !profile?.phone)
      return res.status(400).json({ error: 'profile_required' });
  } else {
    const g = normalizeGuest(guest);
    if (!g) return res.status(400).json({ error: 'Заполните имя, телефон, город и адрес' });
    profile = g;
    isGuest = true;
  }

  const currency = db.prepare("SELECT value FROM settings WHERE key='currency'").get()?.value || 'UZS';

  let totalPrice = 0;
  const orderItems = [];

  for (const item of items) {
    const product = db.prepare('SELECT * FROM products WHERE id=? AND is_active=1').get(item.product_id);
    if (!product) return res.status(400).json({ error: `Товар #${item.product_id} не найден` });
    if (product.quantity < item.quantity)
      return res.status(400).json({ error: `Недостаточно товара: ${product.name}` });
    const subtotal = product.price * item.quantity;
    totalPrice += subtotal;
    orderItems.push({ product_id: product.id, name: product.name, litres: product.litres, viscosity: product.viscosity, price: product.price, quantity: item.quantity, subtotal });
  }

  const source = isGuest ? 'web-guest' : (u.src === 'web' ? 'web' : 'miniapp');
  const r = db.prepare(`
    INSERT INTO orders (user_id, items, total_price, currency, city, address, phone, notes, customer_name, is_guest, source)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(isGuest ? 0 : u.id, JSON.stringify(orderItems), totalPrice, currency,
    profile.city, profile.address, profile.phone, notes || '',
    profile.full_name, isGuest ? 1 : 0, source);

  const orderId = r.lastInsertRowid;

  for (const item of orderItems)
    db.prepare('UPDATE products SET quantity=quantity-? WHERE id=?').run(item.quantity, item.product_id);

  const { lines, total } = formatOrderText({ total_price: totalPrice }, profile, orderItems, currency, orderId);
  const dateStr = new Date().toLocaleString('ru-RU', { timeZone: 'Asia/Tashkent', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const userMsg =
    `✅ <b>Ваш заказ принят!</b>\n\n` +
    `📋 Заказ <b>#${orderId}</b>\n📅 ${esc(dateStr)}\n\n` +
    `📦 <b>Состав:</b>\n${lines}\n\n` +
    `💰 <b>Итого: ${total}</b>\n\n` +
    `📍 <b>Доставка:</b>\n🏙 ${esc(profile.city)}\n🏠 ${esc(profile.address)}\n📞 ${esc(profile.phone)}\n\n` +
    `⏳ Мы свяжемся с вами для подтверждения.`;

  const SOURCE_LABEL = { 'miniapp': '📱 Telegram', 'web': '🌐 Сайт', 'web-guest': '🌐 Сайт (гость)' };
  const adminMsg =
    `🛍 <b>Новый заказ #${orderId}</b>\n\n` +
    `👤 <b>${esc(profile.full_name)}</b>${!isGuest && u.username ? ` (@${esc(u.username)})` : ''}\n` +
    `📞 ${esc(profile.phone)}\n🏙 ${esc(profile.city)}\n🏠 ${esc(profile.address)}\n` +
    `🔗 ${SOURCE_LABEL[source]}\n\n` +
    `📦 <b>Состав:</b>\n${lines}\n\n` +
    `💰 <b>Итого: ${total}</b>\n📅 ${esc(dateStr)}` +
    (notes ? `\n\n💬 <b>Примечание:</b> ${esc(notes)}` : '') +
    (isGuest ? `\n\n⚠️ <i>Гость без Telegram — свяжитесь по телефону.</i>` : '');

  // Guests have no Telegram chat, so only signed-in customers get a confirmation
  if (!isGuest) {
    try { await bot.sendMessage(u.id, userMsg, { parse_mode: 'HTML' }); }
    catch (e) { console.error('User msg failed:', e.message); }
  }

  const adminButtons = [[
    { text: '✅ Принять', callback_data: `accept_${orderId}` },
    { text: '❌ Отменить', callback_data: `cancel_${orderId}` }
  ]];
  if (!isGuest) {
    const contactUrl = u.username ? `https://t.me/${u.username}` : `tg://user?id=${u.id}`;
    adminButtons.push([{ text: '💬 Написать покупателю', url: contactUrl }]);
  }
  const adminKeyboard = { inline_keyboard: adminButtons };

  // Notify every admin, remembering each message so they can all be updated later
  const sentMsgs = [];
  for (const adminId of ADMIN_IDS) {
    try {
      const sent = await bot.sendMessage(adminId, adminMsg, {
        parse_mode: 'HTML',
        reply_markup: adminKeyboard
      });
      sentMsgs.push({ chat_id: adminId, message_id: sent.message_id });
    } catch (e) { console.error(`Admin ${adminId} msg failed:`, e.message); }
  }
  db.prepare('UPDATE orders SET admin_msgs=? WHERE id=?').run(JSON.stringify(sentMsgs), orderId);

  res.json({ success: true, order_id: orderId, total_price: totalPrice, currency });
});

app.get('/api/orders', authMiddleware, (req, res) => {
  let orders;
  if (req.isAdmin && req.query.all === 'true') {
    orders = db.prepare(`
      SELECT o.*,
             COALESCE(NULLIF(o.customer_name,''), u.full_name) AS full_name,
             u.username as user_username
      FROM orders o LEFT JOIN users u ON o.user_id = u.telegram_id
      ORDER BY o.created_at DESC
    `).all();
  } else {
    orders = db.prepare('SELECT * FROM orders WHERE user_id=? ORDER BY created_at DESC').all(req.tgUser.id);
  }
  orders.forEach(o => { o.items = JSON.parse(o.items); });
  res.json(orders);
});

app.get('/api/orders/:id', authMiddleware, (req, res) => {
  const o = db.prepare('SELECT * FROM orders WHERE id=?').get(req.params.id);
  if (!o) return res.status(404).json({ error: 'Not found' });
  if (o.user_id !== req.tgUser.id && !req.isAdmin) return res.status(403).json({ error: 'Forbidden' });
  o.items = JSON.parse(o.items);
  res.json(o);
});

app.put('/api/orders/:id/status', authMiddleware, adminOnly, async (req, res) => {
  const { status } = req.body;
  const valid = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
  if (!valid.includes(status)) return res.status(400).json({ error: 'Invalid status' });

  const o = db.prepare('SELECT * FROM orders WHERE id=?').get(req.params.id);
  if (!o) return res.status(404).json({ error: 'Not found' });

  db.prepare("UPDATE orders SET status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?").run(status, req.params.id);

  if (status === 'cancelled') {
    const items = JSON.parse(o.items);
    for (const item of items)
      db.prepare('UPDATE products SET quantity=quantity+? WHERE id=?').run(item.quantity, item.product_id);
  }

  const msgs = {
    confirmed: '✅ Ваш заказ подтверждён! Готовим к отправке.',
    shipped:   '🚚 Ваш заказ отправлен и в пути!',
    delivered: '🎉 Заказ доставлен. Спасибо за покупку!',
    cancelled: '❌ Заказ отменён. Свяжитесь с нами для уточнения.'
  };
  // Guest orders have no Telegram chat to notify
  if (msgs[status] && !o.is_guest && o.user_id) {
    try { await bot.sendMessage(o.user_id, `📋 <b>Заказ #${o.id}</b>\n\n${msgs[status]}`, { parse_mode: 'HTML' }); }
    catch (e) { console.error('Status notify failed:', e.message); }
  }
  res.json({ success: true, status });
});

// ─── Admin stats ─────────────────────────────────────────────────────────────
app.get('/api/admin/stats', authMiddleware, adminOnly, (_req, res) => {
  const currency = db.prepare("SELECT value FROM settings WHERE key='currency'").get()?.value || 'UZS';
  res.json({
    totalOrders:     db.prepare('SELECT COUNT(*) c FROM orders').get().c,
    pendingOrders:   db.prepare("SELECT COUNT(*) c FROM orders WHERE status='pending'").get().c,
    confirmedOrders: db.prepare("SELECT COUNT(*) c FROM orders WHERE status IN ('confirmed','shipped')").get().c,
    deliveredOrders: db.prepare("SELECT COUNT(*) c FROM orders WHERE status='delivered'").get().c,
    cancelledOrders: db.prepare("SELECT COUNT(*) c FROM orders WHERE status='cancelled'").get().c,
    totalRevenue:    db.prepare("SELECT COALESCE(SUM(total_price),0) t FROM orders WHERE status!='cancelled'").get().t,
    totalProducts:   db.prepare("SELECT COUNT(*) c FROM products WHERE is_active=1").get().c,
    totalCustomers:  db.prepare('SELECT COUNT(*) c FROM users').get().c,
    currency
  });
});

// ─── Bot handlers ─────────────────────────────────────────────────────────────
bot.onText(/\/start/, async (msg) => {
  const { chat, from } = msg;
  db.prepare(`
    INSERT OR IGNORE INTO users (telegram_id, first_name, last_name, username)
    VALUES (?, ?, ?, ?)
  `).run(chat.id, from.first_name, from.last_name || '', from.username || '');

  await bot.sendMessage(chat.id,
    `Добро пожаловать в <b>Hyundai Xteer Oil</b>, ${esc(from.first_name)}! 🛢\n\n` +
    `Мы предлагаем оригинальные масла Hyundai Xteer из Кореи.\n\n` +
    `Нажмите кнопку ниже, чтобы открыть магазин 👇`,
    {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [[{ text: '🛍 Открыть магазин', web_app: { url: MINIAPP_URL } }]]
      }
    }
  );
});

// Lets a prospective admin look up their own Telegram ID for ADMIN_IDS
bot.onText(/\/id/, async (msg) => {
  await bot.sendMessage(msg.chat.id,
    `🆔 Ваш Telegram ID: <code>${msg.from.id}</code>\n\n` +
    (isAdminId(msg.from.id)
      ? '✅ У вас есть права администратора.'
      : 'Передайте этот ID владельцу магазина, чтобы получить доступ администратора.'),
    { parse_mode: 'HTML' }
  );
});

bot.on('callback_query', async (query) => {
  const { data, message, from } = query;
  if (!isAdminId(from.id)) return bot.answerCallbackQuery(query.id);

  const match = data.match(/^(accept|cancel)_(\d+)$/);
  if (!match) return bot.answerCallbackQuery(query.id);

  const [, action, orderId] = match;
  const order = db.prepare('SELECT * FROM orders WHERE id=?').get(orderId);
  if (!order) return bot.answerCallbackQuery(query.id, { text: 'Заказ не найден' });

  // Another admin may have already handled this order
  if (order.status !== 'pending') {
    return bot.answerCallbackQuery(query.id, {
      text: `Заказ уже обработан: ${order.status === 'cancelled' ? 'отменён' : 'принят'}`,
      show_alert: true
    });
  }

  const newStatus = action === 'accept' ? 'confirmed' : 'cancelled';
  db.prepare("UPDATE orders SET status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?").run(newStatus, orderId);

  if (action === 'cancel') {
    const items = JSON.parse(order.items);
    for (const item of items)
      db.prepare('UPDATE products SET quantity=quantity+? WHERE id=?').run(item.quantity, item.product_id);
  }

  const notifyMsg = action === 'accept'
    ? `✅ <b>Заказ #${orderId} подтверждён!</b>\n\nСкоро свяжемся с вами для уточнения доставки.`
    : `❌ <b>Заказ #${orderId} отменён.</b>\n\nСвяжитесь с нами: @r1m_nightrider или +82 10 3768 2270`;

  if (!order.is_guest && order.user_id) {
    try { await bot.sendMessage(order.user_id, notifyMsg, { parse_mode: 'HTML' }); }
    catch (e) { console.error('Customer notify failed:', e.message); }
  }

  // Show who handled it, so the other admins see it was already dealt with
  const who = from.username ? `@${from.username}` : from.first_name;
  const label = `${action === 'accept' ? '✅ Принят' : '❌ Отменён'} · ${who}`;

  // Update the inline keyboard for every admin that was notified
  let targets = [];
  try { targets = JSON.parse(order.admin_msgs || '[]'); } catch {}
  if (targets.length === 0) targets = [{ chat_id: message.chat.id, message_id: message.message_id }];

  for (const t of targets) {
    try {
      await bot.editMessageReplyMarkup(
        { inline_keyboard: [[{ text: label, callback_data: 'noop' }]] },
        { chat_id: t.chat_id, message_id: t.message_id }
      );
    } catch {}
  }

  bot.answerCallbackQuery(query.id, { text: label });
});

bot.on('polling_error', err => console.error('Bot polling error:', err.message));

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🛢  Hyundai Xteer Oil Bot running`);
  console.log(`📡  Server: http://localhost:${PORT}`);
  console.log(`🤖  Bot: polling mode`);
  console.log(`👤  Admins (${ADMIN_IDS.length}): ${ADMIN_IDS.join(', ') || 'НЕ НАСТРОЕНЫ'}`);
  console.log(`🛒  Website: ${WEBAPP_URL.replace(/\/$/, '')}${SHOP_PATH}`);
  console.log(`📱  Mini App: ${MINIAPP_URL}  ← этот URL укажите в BotFather`);
  if (!BOT_USERNAME) console.log(`⚠️   BOT_USERNAME не задан — вход через Telegram на сайте отключён (гостевой заказ работает)`);
  if (DEV_AUTH) console.log(`🚨  DEV_AUTH=1 — заголовок X-Dev-User-Id даёт доступ админа. НИКОГДА не включайте на публичном сервере!`);
  console.log(`🌐  Mini App URL: ${WEBAPP_URL}\n`);
});
