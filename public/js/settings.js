const $ = s => document.querySelector(s);
const badge = $('#stateBadge');
const info = $('#waInfo');
const pairingBox = $('#pairingBox');
const codeEl = $('#pairingCode');
const countdownEl = $('#countdown');

let countdownHandle = null;

async function refresh() {
  try {
    const r = await fetch('/api/session/status');
    const j = await r.json();
    const map = { connected: '🟢 Connected', disconnected: '🔴 Terputus', awaiting_pairing: '🟡 Menunggu pairing', pairing_code_issued: '🟡 Kode aktif', logged_out: '🔴 Logout', banned: '⛔ Diblokir' };
    badge.textContent = map[j.state] || '—';
    info.textContent = j.waNumber ? `Nomor: ${j.waNumber}` : 'Belum ada nomor terhubung';
    
    if (j.state === 'pairing_code_issued' && j.pairingCode) {
      pairingBox.classList.remove('hidden');
      codeEl.textContent = j.pairingCode;
      startCountdown(j.pairingExpires);
    } else {
      pairingBox.classList.add('hidden');
      if (countdownHandle) clearInterval(countdownHandle);
    }
  } catch (err) {
    console.error('Gagal refresh status', err);
  }
}

function startCountdown(expiresIso) {
  if (countdownHandle) clearInterval(countdownHandle);
  const target = new Date(expiresIso).getTime();
  countdownHandle = setInterval(() => {
    const left = Math.max(0, Math.round((target - Date.now()) / 1000));
    countdownEl.textContent = left > 0 ? `Sisa waktu: ${left} detik` : 'Kode kedaluwarsa — generate ulang';
    if (left <= 0) clearInterval(countdownHandle);
  }, 1000);
}

$('#pairBtn').addEventListener('click', async () => {
  const phone = $('#phone').value.trim();
  if (!phone) return alert('Masukkan nomor');
  const r = await fetch('/settings/pairing', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': window.CSRF },
    body: JSON.stringify({ phone })
  });
  const j = await r.json();
  if (!r.ok) return alert('Gagal: ' + (j.error || j.message));
  pairingBox.classList.remove('hidden');
  codeEl.textContent = j.code;
  startCountdown(j.expires);
  refresh();
});

$('#disconnectBtn').addEventListener('click', async () => {
  if (!confirm('Putuskan sesi WhatsApp?')) return;
  await fetch('/settings/disconnect', { method: 'POST', headers: { 'X-CSRF-Token': window.CSRF } });
  refresh();
});

$('#btnChangePass')?.addEventListener('click', async () => {
  const oldPassword = $('#oldPass').value;
  const newPassword = $('#newPass').value;
  if (!oldPassword || !newPassword) return alert('Isi semua kolom');
  
  const r = await fetch('/api/settings/change-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': window.CSRF },
    body: JSON.stringify({ oldPassword, newPassword })
  });
  const j = await r.json();
  if (r.ok) {
    alert('Password berhasil diubah!');
    $('#oldPass').value = ''; $('#newPass').value = '';
  } else {
    alert('Gagal: ' + j.error);
  }
});

refresh();
setInterval(refresh, 5000);
