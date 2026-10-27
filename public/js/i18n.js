(() => {
  'use strict';

  const STORAGE_KEY = 'blaster-language';
  const translations = {
    'Campaign studio': 'Kampanye',
    'Templates': 'Templat',
    'Settings': 'Pengaturan',
    'Main navigation': 'Navigasi utama',
    'Choose language': 'Pilih bahasa',
    'Blaster dashboard': 'Dasbor Blaster',
    'Checking WhatsApp': 'Memeriksa WhatsApp',
    'WhatsApp connected': 'WhatsApp terhubung',
    'WhatsApp disconnected': 'WhatsApp terputus',
    'Pairing needed': 'Perlu penautan',
    'Pairing code active': 'Kode penautan aktif',
    'WhatsApp logged out': 'WhatsApp keluar',
    'Account unavailable': 'Akun tidak tersedia',
    'WhatsApp status unknown': 'Status WhatsApp tidak diketahui',
    'WhatsApp status unavailable': 'Status WhatsApp tidak tersedia',
    'WORKSPACE': 'RUANG KERJA',
    'CAMPAIGNS': 'KAMPANYE',
    'LIBRARY': 'PUSTAKA',
    'PREFERENCES': 'PREFERENSI',
    'YOUR WORKSPACE': 'RUANG KERJA ANDA',
    'Compose a message, choose your audience, and send it with care.': 'Susun pesan, pilih penerima, lalu kirim dengan mudah.',
    'Built for thoughtful outreach': 'Dirancang untuk komunikasi yang terarah',
    'Compose message': 'Susun pesan',
    'Start from a saved template or write something new.': 'Mulai dari templat tersimpan atau tulis pesan baru.',
    'Saved template': 'Templat tersimpan',
    'OPTIONAL': 'OPSIONAL',
    'FILE': 'BERKAS',
    'CAMPAIGN STUDIO': 'STUDIO KAMPANYE',
    'TEMPLATES': 'TEMPLAT',
    'SETTINGS': 'PENGATURAN',
    'Choose a template…': 'Pilih templat…',
    'Message': 'Pesan',
    'Write your message here…': 'Tulis pesan di sini…',
    'Personalize with': 'Personalisasikan dengan',
    'and other contact columns.': 'serta kolom kontak lainnya.',
    'Manage templates': 'Kelola templat',
    'Add an attachment': 'Tambahkan lampiran',
    'Optional · Add a photo, video, PDF, or document to your message.': 'Opsional · Tambahkan foto, video, PDF, atau dokumen ke pesan.',
    'Choose a file to attach': 'Pilih file untuk dilampirkan',
    'Images, video, audio, PDF and common documents · Up to 16 MB': 'Gambar, video, audio, PDF, dan dokumen umum · Maks. 16 MB',
    'Browse files': 'Telusuri file',
    'Remove': 'Hapus',
    'Remove attachment': 'Hapus lampiran',
    'Images and videos appear with your caption. Other file types are sent as WhatsApp documents.': 'Gambar dan video akan menyertai teks pesan. Jenis file lainnya dikirim sebagai dokumen WhatsApp.',
    'Choose your audience': 'Pilih penerima',
    'Import contacts from a spreadsheet. Phone numbers are checked before sending.': 'Impor kontak dari spreadsheet. Nomor telepon akan diperiksa sebelum dikirim.',
    'Upload your contact list': 'Unggah daftar kontak',
    'CSV or Excel workbook · Include a phone number column': 'File CSV atau Excel · Sertakan kolom nomor telepon',
    'Choose list': 'Pilih daftar',
    'Contact preview': 'Pratinjau kontak',
    'Name': 'Nama',
    'Phone number': 'Nomor telepon',
    'Status': 'Status',
    'Delivery': 'Pengiriman',
    'Send now or choose a time for this campaign.': 'Kirim sekarang atau jadwalkan waktu pengiriman.',
    'Send now': 'Kirim sekarang',
    'Start once you launch the campaign.': 'Mulai setelah kampanye dijalankan.',
    'Schedule': 'Jadwalkan',
    'Queue the campaign for a later time.': 'Antrekan kampanye untuk waktu mendatang.',
    'Scheduled date and time': 'Tanggal dan waktu terjadwal',
    'LIVE PREVIEW': 'PRATINJAU LANGSUNG',
    'Message preview': 'Pratinjau pesan',
    'DRAFT': 'DRAF',
    'WHATSAPP MESSAGE': 'PESAN WHATSAPP',
    'Your message will appear here as you write.': 'Pesan akan terlihat di sini saat Anda mengetik.',
    'now': 'sekarang',
    'Message sent': 'Pesan terkirim',
    'Preview shows the message structure. Contact variables are filled for each recipient.': 'Pratinjau menampilkan bentuk pesan. Variabel kontak akan diisi untuk setiap penerima.',
    'Audience': 'Penerima',
    'No list uploaded': 'Belum ada daftar',
    'Attachment': 'Lampiran',
    'None': 'Tidak ada',
    'Launch campaign': 'Jalankan kampanye',
    'Launching campaign…': 'Menjalankan kampanye…',
    'Only message people who have agreed to receive your updates.': 'Kirim pesan hanya kepada orang yang setuju menerima informasi dari Anda.',
    'Campaign progress': 'Progres kampanye',
    'Waiting to start…': 'Menunggu untuk dimulai…',
    'Pause': 'Jeda',
    'Resume': 'Lanjutkan',
    'Stop': 'Hentikan',
    'Download failed contacts CSV ↗': 'Unduh CSV kontak gagal ↗',
    'Recent campaigns': 'Kampanye terbaru',
    'Your latest activity.': 'Aktivitas terbaru Anda.',
    'No campaigns yet.': 'Belum ada kampanye.',
    'Your campaign history will appear here.': 'Riwayat kampanye Anda akan muncul di sini.',
    'sent': 'terkirim',
    'Made for deliberate communication.': 'Dibuat untuk komunikasi yang terarah.',
    'Message templates': 'Templat pesan',
    'Reusable words, ready when you need them.': 'Pesan siap pakai kapan pun dibutuhkan.',
    'Create a template': 'Buat templat',
    'Save a message you use more than once.': 'Simpan pesan yang sering Anda gunakan.',
    'Template name': 'Nama templat',
    'e.g. Product announcement': 'mis. Pengumuman produk',
    'Message content': 'Isi pesan',
    'Hello {nama}, …': 'Halo {nama}, …',
    'Use variables such as': 'Gunakan variabel seperti',
    ', and other contact columns.': ', serta kolom kontak lainnya.',
    ', or any column from your contact list.': ', atau kolom apa pun dari daftar kontak.',
    'Save template': 'Simpan templat',
    'Your library': 'Pustaka Anda',
    'No templates yet.': 'Belum ada templat.',
    'Your saved messages will appear here.': 'Pesan tersimpan Anda akan muncul di sini.',
    'TEMPLATE': 'TEMPLAT',
    'Delete': 'Hapus',
    'Saved message': 'Pesan tersimpan',
    'Use in campaign ↗': 'Gunakan di kampanye ↗',
    'Write once. Use thoughtfully.': 'Tulis sekali. Gunakan dengan tepat.',
    'Manage the connection and security for your workspace.': 'Kelola koneksi dan keamanan ruang kerja Anda.',
    'WhatsApp connection': 'Koneksi WhatsApp',
    'Check the current linked device and connection status.': 'Periksa perangkat tertaut dan status koneksi saat ini.',
    'Loading connection status…': 'Memuat status koneksi…',
    'DEVICE PAIRING': 'PENYAUTAN PERANGKAT',
    'Your pairing code': 'Kode penautan Anda',
    'On your phone, open WhatsApp → Linked devices → Link a device → Link with phone number, then enter this code.': 'Di ponsel, buka WhatsApp → Perangkat tertaut → Tautkan perangkat → Tautkan dengan nomor telepon, lalu masukkan kode ini.',
    'Link a phone number': 'Tautkan nomor telepon',
    'Generate a pairing code for the WhatsApp account you want to use.': 'Buat kode penautan untuk akun WhatsApp yang ingin digunakan.',
    'e.g. 08123456789': 'mis. 08123456789',
    'Generate code': 'Buat kode',
    'Generate Pairing Code': 'Buat Kode Penautan',
    'Change password': 'Ganti kata sandi',
    'Use a strong password that you do not reuse elsewhere.': 'Gunakan kata sandi kuat yang tidak dipakai di tempat lain.',
    'Current password': 'Kata sandi saat ini',
    'New password': 'Kata sandi baru',
    'Save new password': 'Simpan kata sandi baru',
    'Disconnect WhatsApp': 'Putuskan WhatsApp',
    'Disconnect the linked WhatsApp session on this server. You will need to pair again before sending campaigns.': 'Putuskan sesi WhatsApp yang tertaut di server ini. Anda perlu menautkan ulang sebelum mengirim kampanye.',
    'Disconnect device': 'Putuskan perangkat',
    'ACCOUNT': 'AKUN',
    'This workspace is private to your signed-in account.': 'Ruang kerja ini hanya untuk akun Anda yang masuk.',
    'Sign out': 'Keluar',
    'Keep your workspace secure.': 'Jaga keamanan ruang kerja Anda.',
    'Welcome back': 'Selamat datang kembali',
    'Invalid username or password.': 'Nama pengguna atau kata sandi salah.',
    'Sign in': 'Masuk',
    'Sign in to continue to your campaign studio.': 'Masuk untuk melanjutkan ke studio kampanye Anda.',
    'Username': 'Nama pengguna',
    'Your username': 'Nama pengguna Anda',
    'Password': 'Kata sandi',
    'Your password': 'Kata sandi Anda',
    'A considered space for customer communication.': 'Ruang yang dirancang untuk komunikasi pelanggan.',
    'BLASTER / PRIVATE WORKSPACE': 'BLASTER / RUANG KERJA PRIBADI',
    'INDONESIA · UTC+7': 'INDONESIA · UTC+7',
    'Account': 'Akun',
    'Campaign studio — Blaster': 'Kampanye — Blaster',
    'Templates — Blaster': 'Templat — Blaster',
    'Settings — Blaster': 'Pengaturan — Blaster',
    'Sign in — Blaster': 'Masuk — Blaster',
    'Write a message before launching the campaign.': 'Tulis pesan sebelum menjalankan kampanye.',
    'Please wait for uploads to finish.': 'Tunggu hingga proses unggah selesai.',
    'The attachment did not upload successfully. Remove it or try again.': 'Lampiran gagal diunggah. Hapus lampiran atau coba lagi.',
    'Choose a scheduled date and time.': 'Pilih tanggal dan waktu pengiriman.',
    'Upload a contact list with at least one valid phone number first.': 'Unggah daftar kontak dengan minimal satu nomor telepon valid terlebih dahulu.',
    'Stop this campaign after the current message?': 'Hentikan kampanye setelah pesan saat ini?',
    'Could not save the template.': 'Templat tidak dapat disimpan.',
    'Could not delete the template.': 'Templat tidak dapat dihapus.',
    'Delete this template?': 'Hapus templat ini?',
    'Enter a phone number': 'Masukkan nomor telepon',
    'Processing…': 'Memproses…',
    'Pairing failed: ': 'Penautan gagal: ',
    'Disconnect the WhatsApp session?': 'Putuskan sesi WhatsApp?',
    'Fill in all fields': 'Isi semua kolom',
    'Password changed successfully!': 'Kata sandi berhasil diubah!',
    'Failed: ': 'Gagal: ',
    '🟢 Connected': '🟢 Terhubung',
    '🔴 Disconnected': '🔴 Terputus',
    '🟡 Waiting for pairing': '🟡 Menunggu penautan',
    '🟡 Pairing code active': '🟡 Kode penautan aktif',
    '🔴 Logged out': '🔴 Keluar',
    '⛔ Blocked': '⛔ Diblokir',
    'Number: ': 'Nomor: ',
    'Connected': 'Terhubung',
    'Disconnected': 'Terputus',
    'Waiting for pairing': 'Menunggu penautan',
    'Logged out': 'Keluar',
    'Blocked': 'Diblokir',
    'No phone number connected': 'Belum ada nomor terhubung',
    'Waiting for code...': 'Menunggu kode…',
    'Time remaining: ': 'Sisa waktu: ',
    ' seconds': ' detik',
    'Code expired — generate a new one': 'Kode kedaluwarsa — buat kode baru',
    'Current password': 'Kata sandi saat ini',
    'New password': 'Kata sandi baru',
    'ok': 'valid',
    'invalid': 'tidak valid',
    'duplicate': 'duplikat',
    'Sending pace': 'Ritme pengiriman',
    'Choose a conservative sending rhythm for new campaigns.': 'Pilih ritme pengiriman yang lebih hati-hati untuk kampanye baru.',
    'Only send to people who agreed to receive your messages. Timing cannot guarantee an account will avoid restrictions.': 'Kirim hanya kepada orang yang setuju menerima pesan Anda. Pengaturan jeda tidak menjamin akun bebas pembatasan.',
    'These settings apply to new campaigns only; existing campaigns are not changed.': 'Pengaturan ini hanya berlaku untuk kampanye baru; kampanye yang sudah ada tidak diubah.',
    'Recommended': 'Rekomendasi',
    'RECOMMENDED': 'DISARANKAN',
    '15–45 seconds between messages; pause 2–5 minutes after every 20 messages. This is the current default.': 'Jeda 15–45 detik antar pesan; istirahat 2–5 menit setiap 20 pesan. Ini pengaturan bawaan saat ini.',
    'More cautious': 'Lebih hati-hati',
    '30–60 seconds between messages; pause 5–10 minutes after every 10 messages.': 'Jeda 30–60 detik antar pesan; istirahat 5–10 menit setiap 10 pesan.',
    'Save sending settings': 'Simpan pengaturan pengiriman',
    'Saving sending settings…': 'Menyimpan pengaturan pengiriman…',
    'Sending settings saved. New campaigns will use this pace.': 'Pengaturan tersimpan. Kampanye baru akan menggunakan ritme ini.',
    'Could not save sending settings.': 'Pengaturan pengiriman tidak dapat disimpan.'
  };

  const patterns = [
    [/^(\d+) character(s?)$/, (_, n) => `${n} karakter`],
    [/^Number: (.+)$/, (_, number) => `Nomor: ${number}`],
    [/^Could not (save|delete|pause|resume|stop) the template\.$/, (_, action) => `Tidak dapat ${({save:'menyimpan',delete:'menghapus',pause:'menjeda',resume:'melanjutkan',stop:'menghentikan'})[action]} templat.`],
    [/^Could not (pause|resume|stop)$/, (_, action) => `Tidak dapat ${{pause:'menjeda',resume:'melanjutkan',stop:'menghentikan'}[action]}`],
    [/^Wait for uploads to finish$/, () => 'Tunggu hingga proses unggah selesai'],
    [/^(\d+) valid contacts$/, (_, n) => `${n} kontak valid`],
    [/^(\d+) saved template(s?)$/, (_, n) => `${n} templat tersimpan`],
    [/^Campaign #(\d+)$/, (_, n) => `Kampanye #${n}`],
    [/^Processing (.+)…$/, (_, file) => `Memproses ${file}…`],
    [/^Uploading (.+)…$/, (_, file) => `Mengunggah ${file}…`],
    [/^Attachment · (.+)$/, (_, file) => `Lampiran · ${file}`],
    [/^Attachment ready to send with this campaign\.$/, () => 'Lampiran siap dikirim bersama kampanye ini.'],
    [/^Attachment failed: (.+)$/, (_, error) => `Lampiran gagal: ${error}`],
    [/^Upload failed: (.+)$/, (_, error) => `Unggah gagal: ${error}`],
    [/^Upload failed$/, () => 'Unggah gagal'],
    [/^(.+) · (\d+) contacts · (\d+) valid · (\d+) invalid · (\d+) duplicates$/, (_, name, total, valid, invalid, dup) => `${name} · ${total} kontak · ${valid} valid · ${invalid} tidak valid · ${dup} duplikat`],
    [/^Phone column: (.+) · Showing (\d+) rows$/, (_, col, count) => `Kolom telepon: ${col} · Menampilkan ${count} baris`],
    [/^Upload failed: (.+)$/, (_, error) => `Unggah gagal: ${error}`],
    [/^Could not launch campaign: (.+)$/, (_, error) => `Kampanye tidak dapat dijalankan: ${error}`],
    [/^Unable to refresh status: (.+)$/, (_, error) => `Tidak dapat memperbarui status: ${error}`],
    [/^Stop requested…$/, () => 'Permintaan berhenti dikirim…'],
    [/^(.+) of (.+) processed · (.+) sent · (.+) failed$/, (_, processed, total, sent, failed) => `${processed} dari ${total} diproses · ${sent} terkirim · ${failed} gagal`],
    [/^Paused · (.+) of (.+) processed$/, (_, processed, total) => 'Dijeda · ' + processed + ' dari ' + total + ' diproses'],
    [/^Complete · (.+) sent · (.+) failed$/, (_, sent, failed) => `Selesai · ${sent} terkirim · ${failed} gagal`],
    [/^Stopped · (.+) sent · (.+) failed$/, (_, sent, failed) => `Dihentikan · ${sent} terkirim · ${failed} gagal`],
    [/^Scheduled and waiting to start$/, () => 'Terjadwal dan menunggu dimulai'],
    [/^Stopping after the current message…$/, () => 'Akan berhenti setelah pesan saat ini…'],
    [/^Campaign failed$/, () => 'Kampanye gagal'],
    [/^(pending|running|paused|stopping|done|cancelled|failed) · (Scheduled|Immediate)$/, (_, status, mode) => `${({pending:'Menunggu',running:'Berjalan',paused:'Dijeda',stopping:'Menghentikan',done:'Selesai',cancelled:'Dibatalkan',failed:'Gagal'})[status]} · ${mode === 'Scheduled' ? 'Terjadwal' : 'Langsung'}`],
    [/^([a-z_]+) · (\d+)\/(\d+)$/, (_, status, sent, total) => `${({pending:'Menunggu',running:'Berjalan',paused:'Dijeda',stopping:'Menghentikan',done:'Selesai',cancelled:'Dibatalkan',failed:'Gagal'})[status] || status} · ${sent}/${total}`],
    [/^Launch this campaign to (\d+) valid contacts( with an attachment)?\?$/, (_, n, attachment) => `Jalankan kampanye ini ke ${n} kontak valid${attachment ? ' dengan lampiran' : ''}?`],
    [/^Could not launch campaign: (.+)$/, (_, error) => `Kampanye tidak dapat dijalankan: ${error}`],
    [/^Pairing failed: (.+)$/, (_, error) => `Penautan gagal: ${error}`],
    [/^Failed: (.+)$/, (_, error) => `Gagal: ${error}`],
    [/^Time remaining: (\d+) seconds$/, (_, seconds) => `Sisa waktu: ${seconds} detik`],
    [/^Failed: (.+) — generate a new code$/, (_, error) => `Gagal: ${error} — buat kode baru`],
    [/^Could not save sending settings: (.+)$/, (_, error) => `Pengaturan pengiriman tidak dapat disimpan: ${error}`]
  ];

  let language = 'en';
  try { language = localStorage.getItem(STORAGE_KEY) === 'id' ? 'id' : 'en'; } catch {}
  const originalText = new WeakMap();
  const originalAttributes = new WeakMap();

  function translated(source, requestedLanguage = language) {
    const raw = String(source);
    if (requestedLanguage !== 'id') return raw;
    const leading = raw.match(/^\s*/)?.[0] || '';
    const trailing = raw.match(/\s*$/)?.[0] || '';
    const end = trailing.length ? raw.length - trailing.length : raw.length;
    const core = raw.slice(leading.length, end);
    if (!core) return raw;
    if (Object.prototype.hasOwnProperty.call(translations, core)) {
      return leading + translations[core] + trailing;
    }
    for (const [regex, replace] of patterns) {
      if (regex.test(core)) return leading + core.replace(regex, replace) + trailing;
    }
    return raw;
  }

  function translateTextNode(node) {
    if (!originalText.has(node)) originalText.set(node, node.nodeValue);
    const original = originalText.get(node);
    const next = translated(original);
    if (node.nodeValue !== next) node.nodeValue = next;
  }

  const translatableAttributes = ['placeholder', 'aria-label', 'title'];
  function translateAttributes(element) {
    let originals = originalAttributes.get(element);
    if (!originals) {
      originals = {};
      originalAttributes.set(element, originals);
    }
    for (const attr of translatableAttributes) {
      if (!element.hasAttribute?.(attr)) continue;
      if (!(attr in originals)) originals[attr] = element.getAttribute(attr);
      const next = translated(originals[attr]);
      if (element.getAttribute(attr) !== next) element.setAttribute(attr, next);
    }
  }

  function scan(root = document) {
    if (root.nodeType === Node.TEXT_NODE) {
      const parentTag = root.parentElement?.tagName;
      if (parentTag !== 'SCRIPT' && parentTag !== 'STYLE' && !root.parentElement?.closest('[data-no-translate]')) translateTextNode(root);
      return;
    }
    if (root.nodeType === Node.ELEMENT_NODE) {
      translateAttributes(root);
      if (root.matches?.('input[placeholder], textarea[placeholder], button[aria-label]')) {
        // Attributes are handled above; do not translate user-entered values.
      }
    }
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const tag = node.parentElement?.tagName;
        if (tag === 'SCRIPT' || tag === 'STYLE') return NodeFilter.FILTER_REJECT;
        if (node.parentElement?.closest('[data-no-translate]')) return NodeFilter.FILTER_REJECT;
        if (tag === 'TEXTAREA') return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    let node;
    while ((node = walker.nextNode())) translateTextNode(node);
    if (root.querySelectorAll) root.querySelectorAll('*').forEach(translateAttributes);
  }

  function updateSwitcher() {
    document.querySelectorAll('[data-language-choice]').forEach(button => {
      const active = button.dataset.languageChoice === language;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }

  function setLanguage(nextLanguage) {
    language = nextLanguage === 'id' ? 'id' : 'en';
    try { localStorage.setItem(STORAGE_KEY, language); } catch {}
    document.documentElement.lang = language;
    scan(document.body);
    updateSwitcher();
    // The title uses its original, language-neutral value as the translation source.
    if (!documentTitleOriginal) documentTitleOriginal = document.title;
    document.title = translated(documentTitleOriginal, language);
    window.dispatchEvent(new CustomEvent('blaster-language-change', { detail: { language } }));
  }

  let documentTitleOriginal = document.title;
  document.querySelectorAll('[data-language-choice]').forEach(button => {
    button.addEventListener('click', () => setLanguage(button.dataset.languageChoice));
  });

  // Make user-facing native dialogs respect the selected language too.
  const nativeAlert = window.alert.bind(window);
  const nativeConfirm = window.confirm.bind(window);
  window.alert = message => nativeAlert(translated(String(message)));
  window.confirm = message => nativeConfirm(translated(String(message)));

  const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.TEXT_NODE || node.nodeType === Node.ELEMENT_NODE) scan(node);
        });
      } else if (mutation.type === 'attributes' && mutation.target instanceof Element) {
        translateAttributes(mutation.target);
      }
    }
    updateSwitcher();
  });
  observer.observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: translatableAttributes });

  window.blasterI18n = {
    getLanguage: () => language,
    setLanguage,
    translate: value => translated(String(value))
  };

  document.documentElement.lang = language;
  scan(document.body);
  updateSwitcher();
  document.title = translated(documentTitleOriginal, language);
})();
