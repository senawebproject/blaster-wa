const express = require('express');
const multer = require('multer');
const db = require('../db');
const { requireAuth, requireAuthApi, verifyCsrf } = require('../src/middleware');
const { parseBuffer } = require('../src/uploadParser');
const { enqueueJob } = require('../src/blastEngine');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: parseInt(process.env.UPLOAD_MAX_BYTES || '5242880', 10) } });

router.get('/dashboard', requireAuth, (req, res) => {
  const templates = db.prepare('SELECT id, title, body FROM templates WHERE user_id = ? ORDER BY updated_at DESC').all(req.session.userId);
  const history = db.prepare('SELECT id, status, total, sent, failed, created_at FROM blast_jobs WHERE user_id = ? ORDER BY id DESC LIMIT 10').all(req.session.userId);
  res.render('dashboard', { templates, history, username: req.session.username });
});

router.post('/api/upload', requireAuthApi, verifyCsrf, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'no_file' });
  const name = req.file.originalname.toLowerCase();
  if (!name.endsWith('.xlsx') && !name.endsWith('.csv')) return res.status(400).json({ error: 'invalid_type' });
  try {
    const parsed = parseBuffer(req.file.buffer, name);
    // store parsed data in session for the "start" step
    req.session.pendingUpload = {
      rows: parsed.rows,
      phoneColumn: parsed.phoneColumn,
      headers: parsed.headers,
      summary: parsed.summary,
    };
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

router.post('/api/blast/start', requireAuthApi, verifyCsrf, (req, res) => {
  const { templateBody, mode, scheduledAt } = req.body;
  const pending = req.session.pendingUpload;
  if (!pending || !pending.rows) return res.status(400).json({ error: 'no_upload' });
  if (!templateBody) return res.status(400).json({ error: 'no_template' });

  const isImmediate = mode !== 'scheduled';
  if (!isImmediate && !scheduledAt) return res.status(400).json({ error: 'scheduled_at_required' });

  const validRows = pending.rows.filter(r => r.status === 'ok');
  if (!validRows.length) return res.status(400).json({ error: 'no_valid_recipients' });

  const sessionId = req.session.userId;
  const scheduledIso = isImmediate ? null : new Date(scheduledAt).toISOString();

  const insertJob = db.prepare(`
    INSERT INTO blast_jobs (user_id, template_body, mode, scheduled_at, status, total)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const insertRecipient = db.prepare(`
    INSERT INTO blast_recipients (job_id, name_raw, phone_raw, phone_normalized, is_valid, status)
    VALUES (?, ?, ?, ?, 1, 'pending')
  `);

  const tx = db.transaction(() => {
    const jobStatus = isImmediate ? 'running' : 'pending';
    const info = insertJob.run(
      sessionId, templateBody,
      isImmediate ? 'immediate' : 'scheduled',
      scheduledIso, jobStatus, validRows.length
    );
    for (const r of validRows) {
      insertRecipient.run(info.lastInsertRowid, r.name, r.phoneRaw, r.phoneNormalized);
    }
    return info.lastInsertRowid;
  });

  const jobId = tx();
  delete req.session.pendingUpload;

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
  const job = db.prepare("SELECT * FROM blast_jobs WHERE id=? AND user_id=?").get(req.params.id, req.session.userId);
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