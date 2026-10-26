require('dotenv').config();
const bcrypt = require('bcrypt');
const db = require('./db');

const [, , username, password, role = 'user'] = process.argv;

if (!username || !password) {
  console.error('Usage: node seed.js <username> <password> [role]');
  process.exit(1);
}

const hash = bcrypt.hashSync(password, parseInt(process.env.BCRYPT_COST || '10', 10));

const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
if (existing) {
  db.prepare('UPDATE users SET password_hash = ?, role = ? WHERE id = ?')
    .run(hash, role, existing.id);
  console.log(`Updated user: ${username}`);
} else {
  const info = db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)')
    .run(username, hash, role);
  db.prepare('INSERT INTO wa_sessions (user_id) VALUES (?)').run(info.lastInsertRowid);
  console.log(`Created user: ${username} (id=${info.lastInsertRowid})`);
}
