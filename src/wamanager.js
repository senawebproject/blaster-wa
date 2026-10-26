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
    keepAliveIntervalMs: 30000,
    connectTimeoutMs: 60000,
  });

  const entry = { sock, reconnectAttempts: 0 };
  sockets.set(userId, entry);

  sock.ev.on('creds.update', saveCreds);

  // [PENTING] Bungkus logika pairing di dalam event listener
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    // [PENTING] Tunggu sinyal 'qr' muncul sebelum minta kode pairing
    if (qr && phone) {
      console.log(`[Pairing] Sinyal QR diterima, meminta kode untuk ${phone}...`);
      try {
        const code = await sock.requestPairingCode(phone);
        const expires = new Date(Date.now() + 60000).toISOString();
        updateState(userId, {
          state: 'pairing_code_issued',
          wa_number: phone,
          pairing_code: code,
          pairing_expires: expires,
        });
        console.log(`[Pairing] Kode berhasil dibuat: ${code}`);
      } catch (err) {
        console.error('[Pairing Error] Gagal meminta kode:', err.message);
        updateState(userId, { state: 'disconnected', last_error: err.message });
      }
    }

    if (connection === 'open') {
      // ... (logika 'open' tetap sama seperti sebelumnya) ...
    }

    if (connection === 'close') {
      // ... (logika 'close' tetap sama seperti sebelumnya) ...
    }
  });

  // [PENTING] Kita tidak lagi memanggil requestPairingCode di sini.
  // Cukup set state awal.
  updateState(userId, { state: 'awaiting_pairing', wa_number: phone });
  return null; // Kode akan dikirim nanti lewat event
}
