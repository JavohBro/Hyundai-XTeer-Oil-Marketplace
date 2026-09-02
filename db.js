const Database = require('better-sqlite3');
const path = require('path');
const fs   = require('fs');

// On hosts with ephemeral filesystems (Railway, Fly, containers) the database
// must live on a mounted volume, or it is wiped on every deploy.
const DATA_DIR = process.env.DATA_DIR || __dirname;
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'oil_bot.db'));

db.exec(`PRAGMA journal_mode=WAL;`);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    telegram_id INTEGER PRIMARY KEY,
    first_name  TEXT,
    last_name   TEXT,
    username    TEXT,
    full_name   TEXT,
    phone       TEXT,
    city        TEXT,
    address     TEXT,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS products (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    description TEXT DEFAULT '',
    litres      TEXT DEFAULT '',
    price       REAL NOT NULL,
    quantity    INTEGER DEFAULT 0,
    images      TEXT DEFAULT '[]',
    brand       TEXT DEFAULT 'Hyundai XTeer',
    viscosity   TEXT DEFAULT '',
    category    TEXT DEFAULT 'Моторное масло',
    is_active   INTEGER DEFAULT 1,
    sort_order  INTEGER DEFAULT 0,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS orders (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL,
    items      TEXT NOT NULL,
    total_price REAL NOT NULL,
    currency   TEXT DEFAULT 'UZS',
    status     TEXT DEFAULT 'pending',
    city       TEXT,
    address    TEXT,
    phone      TEXT,
    notes      TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

// ─── Migrations ──────────────────────────────────────────────────────────────
// Tracks the admin notification messages per order so every admin's inline
// keyboard can be updated when any one of them accepts/cancels.
const orderCols = db.prepare('PRAGMA table_info(orders)').all().map(c => c.name);
if (!orderCols.includes('admin_msgs')) {
  db.exec(`ALTER TABLE orders ADD COLUMN admin_msgs TEXT DEFAULT '[]'`);
}
// Web guest orders have no Telegram account, so the customer's name is stored
// on the order itself rather than looked up from the users table.
if (!orderCols.includes('customer_name')) {
  db.exec(`ALTER TABLE orders ADD COLUMN customer_name TEXT DEFAULT ''`);
}
if (!orderCols.includes('is_guest')) {
  db.exec(`ALTER TABLE orders ADD COLUMN is_guest INTEGER DEFAULT 0`);
}
if (!orderCols.includes('source')) {
  db.exec(`ALTER TABLE orders ADD COLUMN source TEXT DEFAULT 'miniapp'`);
}

const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
insertSetting.run('currency', 'UZS');

module.exports = db;
