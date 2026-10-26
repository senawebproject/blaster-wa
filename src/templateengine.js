const PLACEHOLDER = /\{([a-zA-Z0-9_]+)\}/g;

function extractVariables(body) {
  const vars = new Set();
  let m;
  while ((m = PLACEHOLDER.exec(body)) !== null) vars.add(m[1]);
  return [...vars];
}

function render(body, data) {
  return body.replace(PLACEHOLDER, (_, key) => {
    const val = data[key];
    if (val == null || String(val).trim() === '') return '';
    return String(val);
  });
}

module.exports = { extractVariables, render };
