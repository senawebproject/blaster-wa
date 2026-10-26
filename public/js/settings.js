const $ = s => document.querySelector(s);
const badge = $('#stateBadge');
const info = $('#waInfo');
const pairingBox = $('#pairingBox');
const codeEl = $('#pairingCode');
const countdownEl = $('#countdown');

let countdownHandle = null;
let lastCode = null;

async function refresh() {
  try {
    const r = await fetch('/api/session/status');
    const j = await r.json();
    const map = { connected: '🟢 Connected', disconnected: '🔴 Terputus', awaiting_pairing: '🟡 Menunggu', pairing_code_issued: '🟡 Kode aktif', logged_out: '🔴 Logout', banned: '⛔ Diblokir' };
    badge.textContent = map[j.state] || '—';
    info.textContent = j.waNumber ? `Nomor: ${j.waNumber}` : 'Belum ada nomor terhubung';

    if (j.pairingCode) {
      // kode aktif -> tampilkan
      if (lastCode !== j.pairingCode) {
        lastCode = j.pairingCode;
        pairingBox.classList.remove('hidden');
        codeEl.textContent = j.pairingCode;
        startCountdown(j.pairingExpires);
      }
    } else if (j.state === 'connected') {
      // sukses konek -> sembunyikan kotak kode
      pairingBox.classList.add('hidden');
      lastCode = null;
      if (countdownHandle) clearInterval(countdownHandle);
    } else if (j.state === 'awaiting_pairing') {
      // lagi nunggu kode dibuat server
      pairingBox.classList.remove('hidden');
      codeEl.textContent = '⏳ Menunggu kode...';
      countdownEl.textContent = '';
    } else if (j.state === 'disconnected' || j.state === 'logged_out') {
      // gagal / expired -> tampilkan alasan kalau ada
      if (lastCode || j.lastError) {
        if (countdownHandle) clearInterval(countdownHandle);
        lastCode = null;
        if (j.lastError) {
          pairingBox.classList.remove('hidden');
          codeEl.textContent = '—';
          countdownEl.textContent = 'Gagal: ' + j.lastError + ' — generate ulang';
        } else {
          pairingBox.classList.add('hidden');
        }
      }
    }
  } catch (err) {
    console.error('Gagal refresh status', err);
  }
}

function startCountdown(expiresIso) {
  if (countdownHandle) clearInterval(countdownHandle);
  if (!expiresIso) return;

  const target = new Date(expiresIso).getTime();
  const tick = () => {
    const left = Math.max(0, Math.round((target - Date.now()) / 1000));
    countdownEl.textContent = left > 0 ? `Sisa waktu: ${left} detik` : 'Kode kedaluwarsa — generate ulang';
    if (left <= 0) clearInterval(countdownHandle);
  };
  tick();
  countdownHandle = setInterval(tick, 1000);
}

$('#pairBtn').addEventListener('click', async () => {
  const phone = $('#phone').value.trim();
  if (!phone) return alert('Masukkan nomor');

  $('#pairBtn').textContent = 'Memproses...';
  $('#pairBtn').disabled = true;
  lastCode = null;

  try {
    const r = await fetch('/settings/pairing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': window.CSRF },
      body: JSON.stringify({ phone })
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || j.message);

    // kode belum ada di sini, nanti diisi otomatis oleh refresh()
    pairingBox.classList.remove('hidden');
    codeEl.textContent = '⏳ Menunggu kode...';
    countdownEl.textContent = '';
  } catch (err) {
    alert('Gagal pairing: ' + err.message);
  } finally {
    $('#pairBtn').textContent = 'Generate Pairing Code';
    $('#pairBtn').disabled = false;
    refresh();
  }
});

$('#disconnectBtn').addEventListener('click', async () => {
  if (!confirm('Putuskan sesi WhatsApp?')) return;
  await fetch('/settings/disconnect', { method: 'POST', headers: { 'X-CSRF-Token': window.CSRF } });
  pairingBox.classList.add('hidden');
  lastCode = null;
  if (countdownHandle) clearInterval(countdownHandle);
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
setInterval(refresh, 2000);
