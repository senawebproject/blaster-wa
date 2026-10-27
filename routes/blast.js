const express = require('express');
const multer = require('multer');
const path = require('path');
const db = require('../db');
const { requireAuth, requireAuthApi, verifyCsrf } = require('../src/middleware');
const { parseBuffer } = require('../src/uploadparser');
const { enqueueJob } = require('../src/blastengine');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: parseInt(process.env.UPLOAD_MAX_BYTES || '5242880', 10) } });
const mediaUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: parseInt(process.env.MEDIA_UPLOAD_MAX_BYTES || String(16 * 1024 * 1024), 10), files: 1 } });

const pendingUploads = new Map();
const pendingMedia = new Map();
const blockedExtensions = new Set(['.exe', '.bat', '.cmd', '.com', '.msi', '.mjs', '.js', '.sh', '.ps1', '.apk', '.scr', '.dll']);
const knownMimeByExt = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif',
  '.mp4': 'video/mp4', '.mov': 'video/quicktime', '.3gp': 'video/3gpp',
  '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.aac': 'audio/aac', '.ogg': 'audio/ogg', '.opus': 'audio/ogg', '.wav': 'audio/wav',
  '.pdf': 'application/pdf', '.doc': 'application/msword', '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel', '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.ppt': 'application/vnd.ms-powerpoint', '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.txt': 'text/plain', '.csv': 'text/csv', '.zip': 'application/zip', '.rar': 'application/vnd.rar',
  '.odt': 'application/vnd.oasis.opendocument.text', '.ods': 'application/vnd.oasis.opendocument.spreadsheet', '.odp': 'application/vnd.oasis.opendocument.presentation', '.epub': 'application/epub+zip'
};

function cleanFilename(filename) {
  return path.basename(String(filename || 'attachment')).replace(/[\\\/\x00-\x1f]/g, '_').slice(0, 180) || 'attachment';
}

function mediaKind(mimetype) {
  if (mimetype && mimetype.startsWith('image/')) return 'image';
  if (mimetype && mimetype.startsWith('video/')) return 'video';
  if (mimetype && mimetype.startsWith('audio/')) return 'audio';
  return 'document';
} 

router.get('/dashboard', requireAuth, (req, res) => {
  // PERBAIKAN: 'updated_at' diganti jadi 'id' biar gak error
  const templates = db.prepare('SELECT id, title, body FROM templates WHERE user_id = ? ORDER BY id DESC').all(req.session.userId);
  
  const history = db.prepare('SELECT id, status, total, sent, failed, created_at FROM blast_jobs WHERE user_id = ? ORDER BY id DESC LIMIT 10').all(req.session.userId);
  res.render('dashboard', { templates, history, username: req.session.username });
});

router.post('/api/upload', requireAuthApi, verifyCsrf, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'no_file' });
  const name = req.file.originalname.toLowerCase();
  if (!name.endsWith('.xlsx') && !name.endsWith('.csv')) return res.status(400).json({ error: 'invalid_type' });
  try {
    const parsed = parseBuffer(req.file.buffer, name);
    
    pendingUploads.set(req.session.userId, {
      rows: parsed.rows,
      phoneColumn: parsed.phoneColumn,
      headers: parsed.headers,
      summary: parsed.summary,
    });

    res.json({
      phoneColumn: parsed.phoneColumn,
      headers: parsed.headers,
      summary: parsed.summary,
      preview: parsed.rows.slice(0, 10),
    });
  } catch (err) {
    res.status(400).json({ error: 'parse_failed', message: err.message });
  }
});

router.post('/api/media/upload', requireAuthApi, verifyCsrf, (req, res, next) => {
  mediaUpload.single('file')(req, res, err => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'file_too_large', message: 'File terlalu besar. Maksimal 16 MB secara default.' });
      }
      return res.status(400).json({ error: 'upload_failed', message: err.message || 'Upload gagal.' });
    }
    next();
  });
}, (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'no_file', message: 'Pilih file terlebih dahulu.' });

  const name = cleanFilename(req.file.originalname);
  const ext = path.extname(name).toLowerCase();
  if (blockedExtensions.has(ext)) {
    return res.status(415).json({ error: 'blocked_file_type', message: 'Tipe file executable tidak diizinkan.' });
  }

  // Prefer a known MIME type from the extension, then the browser-supplied MIME type.
  let mimetype = knownMimeByExt[ext] || req.file.mimetype || 'application/octet-stream';
  // SVGs are safer and more consistently delivered as generic documents than as inline images.
  if (ext === '.svg') mimetype = 'application/octet-stream';
  pendingMedia.set(req.session.userId, {
    name,
    mimetype,
    kind: mediaKind(mimetype),
    buffer: req.file.buffer,
    size: req.file.size,
    uploadedAt: Date.now(),
  });

  res.json({ ok: true, name, mimetype, kind: mediaKind(mimetype), size: req.file.size });
});

router.delete('/api/media/pending', requireAuthApi, verifyCsrf, (req, res) => {
  pendingMedia.delete(req.session.userId);
  res.json({ ok: true });
});

router.post('/api/blast/start', requireAuthApi, verifyCsrf, (req, res) => {
  const { templateBody, mode, scheduledAt } = req.body;
  const pending = pendingUploads.get(req.session.userId);
  
  if (!pending || !pending.rows) return res.status(400).json({ error: 'no_upload' });
  if (!templateBody) return res.status(400).json({ error: 'no_template' });

  const isImmediate = mode !== 'scheduled';
  if (!isImmediate && !scheduledAt) return res.status(400).json({ error: 'scheduled_at_required' });

  const validRows = pending.rows.filter(r => r.status === 'ok');
  if (!validRows.length) return res.status(400).json({ error: 'no_valid_recipients' });

  const sessionId = req.session.userId;
  const parsedScheduledAt = isImmediate ? null : new Date(scheduledAt);
  if (!isImmediate && (!parsedScheduledAt || Number.isNaN(parsedScheduledAt.getTime()) || parsedScheduledAt.getTime() <= Date.now())) {
    return res.status(400).json({ error: 'invalid_scheduled_at', message: 'Waktu jadwal harus valid dan berada di masa depan.' });
  }
  const scheduledIso = isImmediate ? null : parsedScheduledAt.toISOString();

  const media = pendingMedia.get(req.session.userId) || null;
  const savedPreference = db.prepare('SELECT profile FROM user_send_preferences WHERE user_id = ?').get(sessionId);
  const pacingProfile = savedPreference?.profile === 'careful' ? 'careful' : 'recommended';
  // Recommended preserves the existing defaults. The cautious profile only slows campaigns further.
  const pacing = pacingProfile === 'careful'
    ? { delayMin: 30000, delayMax: 60000, batchSize: 10, pauseMin: 300000, pauseMax: 600000 }
    : { delayMin: 15000, delayMax: 45000, batchSize: 20, pauseMin: 120000, pauseMax: 300000 };
  const insertJob = db.prepare(`
    INSERT INTO blast_jobs (
      user_id, template_body, mode, scheduled_at, status, total,
      media_name, media_mimetype, media_data,
      send_delay_min_ms, send_delay_max_ms, batch_size, batch_pause_min_ms, batch_pause_max_ms
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertRecipient = db.prepare(`
    INSERT INTO blast_recipients (job_id, name_raw, phone_raw, phone_normalized, is_valid, status, data_json)
    VALUES (?, ?, ?, ?, 1, 'pending', ?)
  `);

  const tx = db.transaction(() => {
    const jobStatus = isImmediate ? 'running' : 'pending';
    const info = insertJob.run(
      sessionId, templateBody,
      isImmediate ? 'immediate' : 'scheduled',
      scheduledIso, jobStatus, validRows.length,
      media?.name || null, media?.mimetype || null, media?.buffer || null,
      pacing.delayMin, pacing.delayMax, pacing.batchSize, pacing.pauseMin, pacing.pauseMax
    );
    for (const r of validRows) {
      insertRecipient.run(
        info.lastInsertRowid,
        r.name,
        r.phoneRaw,
        r.phoneNormalized,
        JSON.stringify(r.raw || {})   // simpan SEMUA kolom dari file upload
      );
    }
    return info.lastInsertRowid;
  });

  const jobId = tx();
  
  pendingUploads.delete(req.session.userId);
  pendingMedia.delete(req.session.userId);

  if (isImmediate) {
    db.prepare("UPDATE blast_jobs SET started_at = datetime('now') WHERE id = ?").run(jobId);
    enqueueJob(jobId);
  }

  res.json({ ok: true, jobId });
});

router.post('/api/blast/:id/pause', requireAuthApi, verifyCsrf, (req, res) => {
  db.prepare("UPDATE blast_jobs SET status='paused' WHERE id=? AND user_id=? AND status='running'")
    .run(req.params.id, req.session.userId);
  res.json({ ok: true });
});

router.post('/api/blast/:id/resume', requireAuthApi, verifyCsrf, (req, res) => {
  const job = db.prepare("SELECT id, user_id, status FROM blast_jobs WHERE id=? AND user_id=?").get(req.params.id, req.session.userId);
  if (!job || job.status !== 'paused') return res.status(400).json({ error: 'not_paused' });
  db.prepare("UPDATE blast_jobs SET status='running' WHERE id=?").run(job.id);
  enqueueJob(job.id);
  res.json({ ok: true });
});

router.post('/api/blast/:id/stop', requireAuthApi, verifyCsrf, (req, res) => {
  db.prepare("UPDATE blast_jobs SET status='stopping' WHERE id=? AND user_id=? AND status IN ('running','paused')")
    .run(req.params.id, req.session.userId);
  res.json({ ok: true });
});

module.exports = router;
