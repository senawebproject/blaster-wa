function normalizePhone(raw) {
  if (raw == null) return { valid: false, normalized: null, reason: 'empty' };
  let s = String(raw).trim().replace(/[^\d+]/g, '');
  if (!s) return { valid: false, normalized: null, reason: 'empty' };

  if (s.startsWith('+')) s = s.slice(1);
  if (s.startsWith('0')) s = '62' + s.slice(1);
  else if (s.startsWith('8')) s = '62' + s;
  else if (!s.startsWith('62')) s = '62' + s;

  if (!/^62\d{8,13}$/.test(s)) return { valid: false, normalized: null, reason: 'invalid_format' };
  if (s[2] !== '8') return { valid: false, normalized: null, reason: 'not_mobile' };

  return { valid: true, normalized: s, reason: null };
}

module.exports = { normalizePhone };
