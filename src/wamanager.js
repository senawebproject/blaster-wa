const path = require('path');
const fs = require('fs');
const baileys = require('@whiskeysockets/baileys');
const makeWASocket = baileys.default;
const { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, Browsers } = baileys;
const db = require('../db');

const SESSIONS_DIR = process.env.SESSIONS_DIR || './data/sessions';
fs.mkdirSync(SESSIONS_DIR, { recursive: true });

const sockets = new Map();

function sessionPath(userId) {
  return path.join(SESSIONS_DIR, String(userId));
}

function wipeSession(userId) {
  try { fs.rmSync(sessionPath(userId), { recursive: true, force: true }); } catch {}
}

function updateState(userId, patch) {
  const keys = Object.keys(patch);
  const fields = keys.map(k => `${k} = ?`).join(', ');
  db.prepare(`UPDATE wa_sessions SET ${fields}, updated_at = datetime('now') WHERE user_id = ?`)
    .run(...keys.map(k => patch[k]), userId);
}

function getState(userId) {
  return db.prepare('SELECT * FROM wa_sessions WHERE user_id = ?').get(userId);
}

/**
 * phone  : diisi hanya saat pairing baru. Kosong kalau reconnect / boot.
 * attempt: hitungan reconnect berturut-turut (biar limit 5x beneran jalan).
 */
async function startSession(userId, phone = null, attempt = 0) {
  const sessionDir = sessionPath(userId);
  fs.mkdirSync(sessionDir, { recursive: true, mode: 0o700 });

  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    syncFullHistory: false,
    markOnlineOnConnect: false,
    browser: Browsers.macOS('Chrome'),
    keepAliveIntervalMs: 30000,
    connectTimeoutMs: 60000,
  });

  const entry = { sock, reconnectAttempts: attempt };
  sockets.set(userId, entry);

  let hasRequestedCode = false;

  const requestCode = async () => {
    if (!phone || hasRequestedCode || sock.authState.creds.registered) return;
    hasRequestedCode = true;
    try {
      await new Promise(r => setTimeout(r, 1500));
      // socket ini sudah diganti / ditutup? batal
      if (sockets.get(userId) !== entry) return;

      console.log(`[Pairing] Meminta kode untuk ${phone}...`);
      const code = await sock.requestPairingCode(phone);
      updateState(userId, {
        state: 'pairing_code_issued',
        wa_number: phone,
        pairing_code: code,
        pairing_expires: new Date(Date.now() + 60000).toISOString(),
        last_error: null,
      });
      console.log(`[Pairing] Kode berhasil dibuat: ${code}`);
    } catch (err) {
      hasRequestedCode = false;
      console.error('[Pairing Error] Gagal meminta kode:', err.message);
      updateState(userId, { state: 'disconnected', last_error: err.message });
    }
  };

  sock.ev.on('creds.update', saveCreds);

  // fallback kalau event qr telat/tidak keluar
  if (phone) setTimeout(requestCode, 8000);

  sock.ev.on('connection.update', async (update) => {
    // abaikan event dari socket lama yang sudah diganti
    if (sockets.get(userId) !== entry) return;

    const { connection, lastDisconnect, qr } = update;

    if (qr) requestCode();

    if (connection === 'open') {
      entry.reconnectAttempts = 0;
      const wid = sock.user?.id?.split(':')[0] || null;
      console.log(`[WA Open] User ${userId} connected as ${wid}`);
      updateState(userId, {
        state: 'connected',
        wa_number: wid,
        last_connected_at: new Date().toISOString(),
        last_error: null,
        pairing_code: null,
        pairing_expires: null,
      });
    }

    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode;
      const reason = lastDisconnect?.error?.message || 'unknown';
      console.log(`[WA Close] User ${userId} | Reason: ${reason} | Code: ${code}`);

      // 1) Logout / device dihapus dari HP -> bersihkan total
      if (code === DisconnectReason.loggedOut) {
        updateState(userId, {
          state: 'logged_out', last_error: reason,
          pairing_code: null, pairing_expires: null,
        });
        sockets.delete(userId);
        wipeSession(userId);
        return;
      }

      // 2) 515 = NORMAL setelah kode dimasukkan di HP. WAJIB konek ulang.
      if (code === DisconnectReason.restartRequired) {
        console.log(`[WA] Restart required, membuat socket baru untuk user ${userId}...`);
        sockets.delete(userId);
        startSession(userId).catch(err =>
          updateState(userId, { state: 'disconnected', last_error: err.message }));
        return;
      }

      // 3) Kode pairing kedaluwarsa / koneksi putus sebelum kode dipakai
      const cur = getState(userId);
      if (cur && (cur.state === 'pairing_code_issued' || cur.state === 'awaiting_pairing')) {
        updateState(userId, {
          state: 'disconnected', last_error: 'pairing_timeout',
          pairing_code: null, pairing_expires: null,
        });
        sockets.delete(userId);
        return;
      }

      // 4) Putus biasa -> reconnect dengan backoff, maksimal 5x
      if (entry.reconnectAttempts < 5) {
        const next = entry.reconnectAttempts + 1;
        const delay = Math.min(32000, 2000 * Math.pow(2, next - 1));
        sockets.delete(userId);
        setTimeout(() => {
          startSession(userId, null, next).catch(err =>
            updateState(userId, { state: 'disconnected', last_error: err.message }));
        }, delay);
      } else {
        updateState(userId, { state: 'disconnected', last_error: 'reconnect_exhausted' });
        sockets.delete(userId);
      }
    }
  });

  // hanya set awaiting_pairing kalau memang pairing baru
  if (phone) updateState(userId, { state: 'awaiting_pairing', wa_number: phone, pairing_code: null, pairing_expires: null, last_error: null });
  return null;
}

async function requestPairing(userId, phone) {
  // lepas socket lama DULU supaya event close-nya diabaikan
  const existing = sockets.get(userId);
  sockets.delete(userId);
  if (existing) { try { existing.sock.end(undefined); } catch {} }

  // mulai dari nol, jangan pakai creds sisa percobaan gagal
  wipeSession(userId);
  return startSession(userId, phone);
}

async function disconnect(userId) {
  const entry = sockets.get(userId);
  sockets.delete(userId);
  if (entry) { try { await entry.sock.logout(); } catch {} }
  wipeSession(userId);
  updateState(userId, { state: 'disconnected', pairing_code: null, pairing_expires: null });
}

function getSocket(userId) {
  const entry = sockets.get(userId);
  return entry ? entry.sock : null;
}

async function bootAllSessions() {
  // state pairing yang nyangkut dari run sebelumnya -> reset
  db.prepare(`UPDATE wa_sessions SET state = 'disconnected', pairing_code = NULL, pairing_expires = NULL
              WHERE state IN ('pairing_code_issued','awaiting_pairing')`).run();

  const rows = db.prepare("SELECT user_id FROM wa_sessions WHERE state = 'connected'").all();
  for (const row of rows) {
    if (fs.existsSync(path.join(sessionPath(row.user_id), 'creds.json'))) {
      try { await startSession(row.user_id); } catch (err) {
        updateState(row.user_id, { state: 'disconnected', last_error: err.message });
      }
    } else {
      // creds hilang (biasanya karena Render free / tanpa disk)
      updateState(row.user_id, { state: 'disconnected', last_error: 'session_files_missing' });
    }
  }
}

module.exports = { requestPairing, disconnect, getSocket, getState, bootAllSessions, updateState };
