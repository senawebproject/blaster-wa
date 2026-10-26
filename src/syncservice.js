async function fetchFromSheet(type) {
  const url = `${process.env.SHEET_API_URL}?type=${type}&token=${process.env.SHEET_TOKEN}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Fetch sheet failed');
  return await res.json();
}

async function postToSheet(payload) {
  const body = JSON.stringify({ ...payload, token: process.env.SHEET_TOKEN });
  await fetch(process.env.SHEET_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' }, // Apps script butuh text/plain untuk bypass CORS
    body
  });
}

module.exports = { fetchFromSheet, postToSheet };
