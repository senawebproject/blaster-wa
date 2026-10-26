const path = require('path');
const fs = require('fs');
const baileys = require('@whiskeysockets/baileys');
const makeWASocket = baileys.default;
const { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = baileys;
const db = require('../db');

const SESSIONS_DIR = process.env.SESSIONS_DIR || './data/sessions';
fs.mkdirSync(SESSIONS_DIR, { recursive: true });

const sockets = new Map(); 

function updateState(userId, patch) {
  const keys = Object.keys(patch);
  const fields = keys.map(k => `${k} = ?`).join(', ');
  db.prepare(`UPDATE wa_sessions SET ${fields}, updated_at = datetime('now') WHERE user_id = ?`)
    .run(...keys.map(k => patch[k]), userId);
}

function getState(userId) {
  return db.prepare('SELECT * FROM wa_sessions WHERE user_id = ?').get(userId);
}

async function startSession(userId, phone) {
  const sessionDir = path.join(SESSIONS_DIR, String(userId));
  fs.mkdirSync(sessionDir, { recursive: true, mode: 0o700 });

  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    syncFullHistory: false,
    markOnlineOnConnect: false,
    browser: ['WA Blaster', 'Chrome', '1.0.0'],
    keepAliveIntervalMs: 30000, // <-- Nahan koneksi biar gak gampang putus
    connectTimeoutMs: 60000,
  });

  const entry = { sock, reconnectAttempts: 0 };
  sockets.set(userId, entry);

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === 'open') {
      entry.reconnectAttempts = 0;
      const wid = sock.user?.id?.split(':')[0] || null;
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

      if (code === DisconnectReason.loggedOut) {
        updateState(userId, { state: 'logged_out', last_error: reason });
        sockets.delete(userId);
        return;
      }
      
      // Jika lagi proses pairing, JANGAN auto-reconnect (biar kode gak ilang)
      const currentState = getState(userId);
      if (currentState.state === 'pairing_code_issued') {
        console.log(`[WA Close] Pairing terputus, kode mungkin expired.`);
        return; 
      }

      if (entry.reconnectAttempts < 5) {
        entry.reconnectAttempts += 1;
        const delay = Math.min(32000, 2000 * Math.pow(2, entry.reconnectAttempts - 1));
        setTimeout(() => startSession(userId).catch(err => {
          updateState(userId, { state: 'disconnected', last_error: err.message });
        }), delay);
      } else {
        updateState(userId, { state: 'disconnected', last_error: 'reconnect_exhausted' });
        sockets.delete(userId);
      }
    }
  });

  if (phone) {
    try {
      const code = await sock.requestPairingCode(phone);
      const expires = new Date(Date.now() + 60000).toISOString();
      updateState(userId, {
        state: 'pairing_code_issued',
        wa_number: phone,
        pairing_code: code,
        pairing_expires: expires,
      });
      return { code, expires };
    } catch (err) {
      console.error('[Pairing Error]', err.message);
      updateState(userId, { state: 'disconnected', last_error: err.message });
      throw err;
    }
  }

  updateState(userId, { state: 'awaiting_pairing' });
  return null;
}

async function requestPairing(userId, phone) {
  const existing = sockets.get(userId);
  if (existing) {
    try { existing.sock.end(undefined); } catch {}
    sockets.delete(userId);
  }
  return startSession(userId, phone);
}

async function disconnect(userId) {
  const entry = sockets.get(userId);
  if (entry) {
    try { await entry.sock.logout(); } catch {}
    sockets.delete(userId);
  }
  updateState(userId, { state: 'disconnected', pairing_code: null, pairing_expires: null });
}

function getSocket(userId) {
  const entry = sockets.get(userId);
  if (!entry) return null;
  return entry.sock;
}

async function bootAllSessions() {
  const rows = db.prepare("SELECT user_id, state FROM wa_sessions WHERE state = 'connected'").all();
  for (const row of rows) {
    const sessionDir = path.join(SESSIONS_DIR, String(row.user_id));
    if (fs.existsSync(path.join(sessionDir, 'creds.json'))) {
      try { await startSession(row.user_id); } catch (err) {
        updateState(row.user_id, { state: 'disconnected', last_error: err.message });
      }
    }
  }
}

module.exports = { requestPairing, disconnect, getSocket, getState, bootAllSessions, updateState };
