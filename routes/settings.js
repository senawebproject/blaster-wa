const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../db');
const { requireAuth, requireAuthApi, verifyCsrf } = require('../src/middleware');
const { requestPairing, disconnect, getState } = require('../src/wamanager');
const { normalizePhone } = require('../src/normalizer');
const { postToSheet } = require('../src/syncservice');

const router = express.Router();

router.get('/settings', requireAuth, (req, res) => {
  // Pastikan session gak undefined biar EJS gak error
  const session = getState(req.session.userId) || {};
  res.render('settings', { session, username: req.session.username });
});

router.get('/api/session/status', requireAuthApi, (req, res) => {
  const s = getState(req.session.userId) || {};
  res.json({
    state: s.state,
    waNumber: s.wa_number,
    pairingCode: s.pairing_code,
    pairingExpires: s.pairing_expires,
    lastConnectedAt: s.last_connected_at,
    lastError: s.last_error,
  });
});

router.post('/settings/pairing', requireAuthApi, verifyCsrf, async (req, res) => {
  const { phone } = req.body;
  const { valid, normalized } = normalizePhone(phone);
  if (!valid) return res.status(400).json({ error: 'invalid_phone' });
  
  try {
    // requestPairing sekarang gak langsung return kode, kodenya nongol via polling status
    await requestPairing(req.session.userId, normalized);
    res.json({ ok: true }); 
  } catch (err) {
    res.status(500).json({ error: 'pairing_failed', message: err.message });
  }
});

router.post('/settings/disconnect', requireAuthApi, verifyCsrf, async (req, res) => {
  await disconnect(req.session.userId);
  res.json({ ok: true });
});

router.post('/api/settings/change-password', requireAuthApi, verifyCsrf, async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
  
  if (!bcrypt.compareSync(oldPassword, user.password_hash)) {
    return res.status(400).json({ error: 'Password lama salah' });
  }
  
  const hash = bcrypt.hashSync(newPassword, parseInt(process.env.BCRYPT_COST || '10', 10));
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, user.id);
  
  try {
    await postToSheet({ action: 'change_password', username: user.username, newPassword });
  } catch (err) {
    console.error('Gagal sync ke Sheets:', err.message);
  }
  
  res.json({ ok: true });
});

module.exports = router;
