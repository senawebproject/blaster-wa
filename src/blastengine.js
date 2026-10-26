const db = require('../db');
const { render } = require('./templateEngine');
const { getQueue } = require('./queueManager');
const { getSocket, getState, updateState } = require('./waManager');

const DELAY_MIN = parseInt(process.env.BLAST_DELAY_MIN_MS || '15000', 10);
const DELAY_MAX = parseInt(process.env.BLAST_DELAY_MAX_MS || '45000', 10);
const BATCH_SIZE = parseInt(process.env.BLAST_BATCH_SIZE || '20', 10);
const BATCH_MIN = parseInt(process.env.BLAST_BATCH_PAUSE_MIN_MS || '120000', 10);
const BATCH_MAX = parseInt(process.env.BLAST_BATCH_PAUSE_MAX_MS || '300000', 10);

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function getJob(jobId) {
  return db.prepare('SELECT * FROM blast_jobs WHERE id = ?').get(jobId);
}

function setJobStatus(jobId, status, extra = {}) {
  const fields = ['status = ?'];
  const values = [status];
  for (const [k, v] of Object.entries(extra)) {
    fields.push(`${k} = ?`);
    values.push(v);
  }
  values.push(jobId);
  db.prepare(`UPDATE blast_jobs SET ${fields.join(', ')} WHERE id = ?`).run(...values);
}

async function runJob(jobId) {
  const job = getJob(jobId);
  if (!job) return;
  if (job.status !== 'running' && job.status !== 'paused') return;

  const userState = getState(job.user_id);
  if (!userState || userState.state !== 'connected') {
    setJobStatus(jobId, 'paused', { last_error: 'session_down' });
    return;
  }

  const sock = getSocket(job.user_id);
  if (!sock) {
    setJobStatus(jobId, 'paused', { last_error: 'session_down' });
    return;
  }

  const recipients = db.prepare(
    "SELECT * FROM blast_recipients WHERE job_id = ? AND status = 'pending' AND is_valid = 1 ORDER BY id ASC"
  ).all(jobId);

  let attempts = 0;
  for (const r of recipients) {
    const current = getJob(jobId);
    if (!current) return;
    if (current.status === 'stopping') break;
    while (current.status === 'paused') {
      await sleep(2000);
      const c = getJob(jobId);
      if (c.status !== 'paused') break;
    }
    const fresh = getJob(jobId);
    if (!fresh || fresh.status !== 'running') return;

    const st = getState(job.user_id);
    if (!st || st.state !== 'connected') {
      setJobStatus(jobId, 'paused', { last_error: 'session_down' });
      return;
    }

    const message = render(job.template_body, { ...r, nama: r.name_raw, name: r.name_raw });
    attempts += 1;

    try {
      await sock.sendMessage(`${r.phone_normalized}@s.whatsapp.net`, { text: message });
      db.prepare("UPDATE blast_recipients SET status='sent', sent_at=datetime('now'), attempts=?, rendered_message=? WHERE id=?")
        .run(attempts, message, r.id);
      db.prepare('UPDATE blast_jobs SET sent = sent + 1 WHERE id = ?').run(jobId);
    } catch (err) {
      const reason = classify(err);
      db.prepare("UPDATE blast_recipients SET status='failed', error_reason=?, attempts=?, rendered_message=? WHERE id=?")
        .run(reason, attempts, message, r.id);
      db.prepare('UPDATE blast_jobs SET failed = failed + 1 WHERE id = ?').run(jobId);
    }

    let delay = rand(DELAY_MIN, DELAY_MAX);
    if (attempts % BATCH_SIZE === 0) delay += rand(BATCH_MIN, BATCH_MAX);
    await sleep(delay);
  }

  const final = getJob(jobId);
  if (final.status === 'stopping') setJobStatus(jobId, 'cancelled', { finished_at: new Date().toISOString() });
  else if (final.status === 'running') setJobStatus(jobId, 'done', { finished_at: new Date().toISOString() });
}

function classify(err) {
  const msg = String(err?.message || '').toLowerCase();
  if (msg.includes('not on whatsapp') || msg.includes('not registered')) return 'not_on_whatsapp';
  if (msg.includes('timeout')) return 'timeout';
  if (msg.includes('connection') || msg.includes('closed')) return 'session_down';
  return 'unknown';
}

function enqueueJob(jobId) {
  const job = getJob(jobId);
  if (!job) return;
  const q = getQueue(job.user_id);
  q.add(() => runJob(jobId)).catch(() => {});
}

module.exports = { enqueueJob, runJob, setJobStatus, getJob };
