const express = require('express');
const db = require('../db');
const { requireAuth, requireAuthApi, verifyCsrf } = require('../src/middleware');
const { postToSheet } = require('../src/syncservice');

const router = express.Router();

router.get('/templates', requireAuth, (req, res) => {
  const items = db.prepare('SELECT * FROM templates WHERE user_id = ? ORDER BY id DESC').all(req.session.userId);
  res.render('templates', { items, username: req.session.username });
});

router.get('/api/templates', requireAuthApi, (req, res) => {
  const items = db.prepare('SELECT * FROM templates WHERE user_id = ? ORDER BY id DESC').all(req.session.userId);
  res.json(items);
});

router.post('/api/templates', requireAuthApi, verifyCsrf, async (req, res) => {
  const { title, body } = req.body;
  if (!title || !body) return res.status(400).json({ error: 'title & body required' });
  
  const info = db.prepare('INSERT INTO templates (user_id, title, body) VALUES (?, ?, ?)')
    .run(req.session.userId, title, body);
    
  // Kirim ke Google Sheets
  await postToSheet({ action: 'add_template', id: info.lastInsertRowid, user_id: req.session.userId, title, body });
  
  res.json({ id: info.lastInsertRowid });
});

router.put('/api/templates/:id', requireAuthApi, verifyCsrf, async (req, res) => {
  const { title, body } = req.body;
  const row = db.prepare('SELECT * FROM templates WHERE id = ? AND user_id = ?').get(req.params.id, req.session.userId);
  if (!row) return res.status(404).json({ error: 'not_found' });
  
  db.prepare("UPDATE templates SET title=?, body=? WHERE id=?").run(title, body, req.params.id);
  
  // Kirim ke Google Sheets
  await postToSheet({ action: 'edit_template', id: row.id, title, body });
  
  res.json({ ok: true });
});

router.delete('/api/templates/:id', requireAuthApi, verifyCsrf, async (req, res) => {
  const row = db.prepare('SELECT * FROM templates WHERE id = ? AND user_id = ?').get(req.params.id, req.session.userId);
  if (row) {
    db.prepare('DELETE FROM templates WHERE id = ?').run(req.params.id);
    // Kirim ke Google Sheets
    await postToSheet({ action: 'delete_template', id: row.id });
  }
  res.json({ ok: true });
});

module.exports = router;
