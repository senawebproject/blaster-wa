const express = require('express');
const db = require('../db');
const { requireAuthApi } = require('../src/middleware');

const router = express.Router();

router.get('/api/blast/:id/status', requireAuthApi, (req, res) => {
  const job = db.prepare('SELECT id, user_id, status, mode, total, sent, failed, started_at, finished_at FROM blast_jobs WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.session.userId);
  if (!job) return res.status(404).json({ error: 'not_found' });

  const counts = db.prepare(`
    SELECT status, COUNT(*) as c FROM blast_recipients WHERE job_id = ? GROUP BY status
  `).all(job.id);
  const map = Object.fromEntries(counts.map(r => [r.status, r.c]));
  const pending = map.pending || 0;
  const sent = map.sent || 0;
  const failed = map.failed || 0;

  let current = null;
  if (job.status === 'running') {
    const next = db.prepare("SELECT name_raw, phone_normalized FROM blast_recipients WHERE job_id=? AND status='pending' ORDER BY id ASC LIMIT 1").get(job.id);
    if (next) current = `Mengirim ke ${next.name_raw || 'kontak'} (${next.phone_normalized})…`;
  }

  res.json({
    id: job.id,
    status: job.status,
    mode: job.mode,
    total: job.total,
    sent,
    failed,
    pending,
    current,
    startedAt: job.started_at,
    finishedAt: job.finished_at,
  });
});

router.get('/api/blast/:id/failed.csv', requireAuthApi, (req, res) => {
  const job = db.prepare('SELECT id, user_id FROM blast_jobs WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.session.userId);
  if (!job) return res.status(404).send('not found');

  const rows = db.prepare(`
    SELECT name_raw, phone_raw, phone_normalized, error_reason, sent_at
    FROM blast_recipients WHERE job_id = ? AND status = 'failed' ORDER BY id ASC
  `).all(job.id);

  const lines = ['nama,nomor_asli,nomor_normalized,alasan_gagal,waktu'];
  for (const r of rows) {
    const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    lines.push([r.name_raw, r.phone_raw, r.phone_normalized, r.error_reason, r.sent_at || '-'].map(esc).join(','));
  }
  const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 13);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="failed-job-${job.id}-${stamp}.csv"`);
  res.send(lines.join('\n'));
});

router.get('/api/blast/history', requireAuthApi, (req, res) => {
  const jobs = db.prepare('SELECT id, status, mode, total, sent, failed, created_at, finished_at FROM blast_jobs WHERE user_id = ? ORDER BY id DESC LIMIT 20').all(req.session.userId);
  res.json(jobs);
});

module.exports = router;
