const db = require('../db');
const { enqueueJob } = require('./blastEngine');
const { getState } = require('./waManager');

const POLL_MS = parseInt(process.env.SCHEDULER_POLL_MS || '30000', 10);
const INSTANCE_ID = `inst-${process.pid}-${Date.now()}`;

function tick() {
  try {
    const nowIso = new Date().toISOString();
    const cutoff = new Date(Date.now() - parseInt(process.env.SCHEDULER_LOCK_TTL_MS || '120000', 10)).toISOString();

    const jobs = db.prepare(`
      SELECT * FROM blast_jobs
      WHERE status = 'pending'
        AND scheduled_at <= ?
        AND (locked_by IS NULL OR locked_at < ?)
      ORDER BY scheduled_at ASC
      LIMIT 10
    `).all(nowIso, cutoff);

    for (const job of jobs) {
      const st = getState(job.user_id);
      if (!st || st.state !== 'connected') continue;

      const running = db.prepare(
        "SELECT id FROM blast_jobs WHERE user_id = ? AND status IN ('running','stopping') AND id <> ?"
      ).get(job.user_id, job.id);
      if (running) continue;

      const acquired = db.prepare(`
        UPDATE blast_jobs SET locked_by = ?, locked_at = ?, status = 'running', started_at = ?
        WHERE id = ? AND status = 'pending' AND (locked_by IS NULL OR locked_at < ?)
      `).run(INSTANCE_ID, nowIso, nowIso, job.id, cutoff);

      if (acquired.changes === 1) {
        db.prepare('UPDATE blast_jobs SET locked_by = NULL, locked_at = NULL WHERE id = ?').run(job.id);
        enqueueJob(job.id);
      }
    }
  } catch (err) {
    console.error('[scheduler] error:', err.message);
  }
}

function recoverRunningJobs() {
  const recovery = db.prepare(`
    UPDATE blast_jobs SET status = 'paused'
    WHERE status = 'running' AND (locked_by IS NULL OR locked_by <> ?)
  `).run(INSTANCE_ID);
  if (recovery.changes > 0) console.log(`[scheduler] recovered ${recovery.changes} job(s) to paused`);
}

function start() {
  recoverRunningJobs();
  setInterval(tick, POLL_MS);
  console.log('[scheduler] started, poll =', POLL_MS, 'ms');
}

module.exports = { start, tick };
