const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const { fetchFromSheet } = require('./src/syncservice');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'database.db');
const DB_DIR = path.dirname(DB_PATH);

try {
  fs.mkdirSync(DB_DIR, { recursive: true });
  console.log(`[DB Setup] Direktori database dipastikan ada: ${DB_DIR}`);
} catch (err) {
  console.error(`[DB Setup] Gagal membuat direktori: ${DB_DIR}`, err);
  process.exit(1); 
}

const db = new Database(DB_PATH);

// WAL MODE DIMATIKAN TOTAL KARENA BIKIN CRASH DI RENDER GRATISAN
// db.pragma('journal_mode = WAL'); 
db.pragma('foreign_keys = ON');
console.log(`[DB Setup] Database berhasil dibuka di: ${DB_PATH}`);

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin','user')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS wa_sessions (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  wa_number TEXT,
  state TEXT NOT NULL DEFAULT 'disconnected',
  pairing_code TEXT,
  pairing_expires TEXT,
  last_connected_at TEXT,
  last_error TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS blast_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  template_body TEXT NOT NULL,
  mode TEXT NOT NULL,
  scheduled_at TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  total INTEGER NOT NULL DEFAULT 0,
  sent INTEGER NOT NULL DEFAULT 0,
  failed INTEGER NOT NULL DEFAULT 0,
  locked_by TEXT, locked_at TEXT, started_at TEXT, finished_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS blast_recipients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL REFERENCES blast_jobs(id) ON DELETE CASCADE,
  name_raw TEXT, phone_raw TEXT NOT NULL, phone_normalized TEXT NOT NULL,
  is_valid INTEGER NOT NULL DEFAULT 1, status TEXT NOT NULL DEFAULT 'pending',
  error_reason TEXT, rendered_message TEXT, sent_at TEXT, attempts INTEGER NOT NULL DEFAULT 0
);
`);

async function autoSync() {
  try {
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    if (userCount > 0) return;
    console.log('[Sync] Database kosong. Menarik data dari Google Sheets...');
    
    const users = await fetchFromSheet('users');
    const cost = parseInt(process.env.BCRYPT_COST || '10', 10);
    const insertUser = db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)');
    const insertSession = db.prepare('INSERT INTO wa_sessions (user_id) VALUES (?)');

    for (const u of users) {
      if (!u.username || !u.password) continue;
      const hash = bcrypt.hashSync(String(u.password), cost);
      const info = insertUser.run(u.username, hash, u.role || 'user');
      insertSession.run(info.lastInsertRowid);
    }

    const templates = await fetchFromSheet('templates');
    const insertTemplate = db.prepare('INSERT INTO templates (id, user_id, title, body) VALUES (?, ?, ?, ?)');
    for (const t of templates) {
       const userExists = db.prepare('SELECT id FROM users WHERE id = ?').get(t.user_id);
       if (userExists) insertTemplate.run(t.id, t.user_id, t.title, t.body);
    }
    console.log(`[Sync] Berhasil import ${users.length} user & ${templates.length} template.`);
  } catch (err) {
    console.error('[Sync] Gagal:', err.message);
  }
}
autoSync();

module.exports = db;
