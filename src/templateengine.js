const PLACEHOLDER = /\{([a-zA-Z0-9_]+)\}/g;

// "Nama Toko" -> "nama_toko"
function normKey(k) {
  return String(k || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function extractVariables(body) {
  const vars = new Set();
  let m;
  PLACEHOLDER.lastIndex = 0;
  while ((m = PLACEHOLDER.exec(body)) !== null) vars.add(m[1]);
  return [...vars];
}

function render(body, data) {
  // bikin lookup huruf kecil supaya {Nama} / {nama} / {NAMA} sama saja
  const lookup = {};
  for (const [k, v] of Object.entries(data || {})) lookup[normKey(k)] = v;

  return body.replace(PLACEHOLDER, (_, key) => {
    const val = lookup[normKey(key)];
    if (val == null || String(val).trim() === '') return '';
    return String(val);
  });
}

module.exports = { extractVariables, render, normKey };
