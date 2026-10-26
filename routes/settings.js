const express = require('express');
const { requireAuth, requireAuthApi, verifyCsrf } = require('../src/middleware');
const { requestPairing, disconnect, getState } = require('../src/wamanager');
const { normalizePhone } = require('../src/normalizer');

const router = express.Router();

router.get('/settings', requireAuth, (req, res) => {
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
    const result = await requestPairing(req.session.userId, normalized);
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(500).json({ error: 'pairing_failed', message: err.message });
  }
});

router.post('/settings/disconnect', requireAuthApi, verifyCsrf, async (req, res) => {
  await disconnect(req.session.userId);
  res.json({ ok: true });
});

module.exports = router;
