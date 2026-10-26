const XLSX = require('xlsx');
const { parse } = require('csv-parse/sync');
const { normalizePhone } = require('./normalizer');

const PHONE_HINTS = ['nomor', 'phone', 'hp', 'wa', 'whatsapp', 'telp', 'telepon'];

function detectPhoneColumn(headers) {
  const lower = headers.map(h => String(h || '').toLowerCase());
  for (let i = 0; i < lower.length; i++) {
    if (PHONE_HINTS.some(h => lower[i].includes(h))) return headers[i];
  }
  return null;
}

function parseBuffer(buffer, filename) {
  const ext = filename.split('.').pop().toLowerCase();
  let rows = [];

  if (ext === 'csv') {
    rows = parse(buffer, { columns: true, skip_empty_lines: true, trim: true });
  } else {
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  }

  if (!rows.length) return { headers: [], rows: [], summary: { total: 0, valid: 0, invalid: 0, duplicates: 0 } };

  const headers = Object.keys(rows[0]);
  const phoneCol = detectPhoneColumn(headers);

  const seen = new Set();
  let valid = 0, invalid = 0, duplicates = 0;
  const normalized = rows.map(r => {
    const rawPhone = phoneCol ? r[phoneCol] : '';
    const { valid: ok, normalized: phone, reason } = normalizePhone(rawPhone);
    let status = 'ok', note = null;

    if (!ok) { invalid++; status = 'invalid'; note = reason; }
    else if (seen.has(phone)) { duplicates++; status = 'duplicate'; note = 'duplicate'; }
    else { seen.add(phone); valid++; }

    return {
      raw: r,
      name: r.nama ?? r.name ?? r.Nama ?? '',
      phoneRaw: rawPhone,
      phoneNormalized: phone || '',
      status,
      note,
    };
  });

  return {
    headers,
    phoneColumn: phoneCol,
    rows: normalized,
    summary: { total: rows.length, valid, invalid, duplicates },
  };
}

module.exports = { parseBuffer, detectPhoneColumn };
