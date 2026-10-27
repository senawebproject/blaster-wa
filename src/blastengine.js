const db = require('../db');
const { render } = require('./templateengine');
const { getQueue } = require('./queuemanager');
const { getSocket, getState } = require('./wamanager');

const DELAY_MIN = parseInt(process.env.BLAST_DELAY_MIN_MS || '15000', 10);
const DELAY_MAX = parseInt(process.env.BLAST_DELAY_MAX_MS || '45000', 10);
const BATCH_SIZE = parseInt(process.env.BLAST_BATCH_SIZE || '20', 10);
const BATCH_MIN = parseInt(process.env.BLAST_BATCH_PAUSE_MIN_MS || '120000', 10);
const BATCH_MAX = parseInt(process.env.BLAST_BATCH_PAUSE_MAX_MS || '300000', 10);

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function getJob(jobId) {
  // Keep the potentially large media BLOB out of the per-recipient status polling query.
  return db.prepare(`SELECT id, user_id, template_body, mode, scheduled_at, status, total, sent, failed,
    locked_by, locked_at, started_at, finished_at, created_at, last_error, media_name, media_mimetype,
    send_delay_min_ms, send_delay_max_ms, batch_size, batch_pause_min_ms, batch_pause_max_ms
    FROM blast_jobs WHERE id = ?`).get(jobId);
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
  const storedMedia = db.prepare('SELECT media_name, media_mimetype, media_data FROM blast_jobs WHERE id = ?').get(jobId);
  if (storedMedia) Object.assign(job, storedMedia);

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

  // Enforce a hard floor of 2 seconds; configured fast profiles may use this floor.
  const delayMin = Math.max(2000, Number(job.send_delay_min_ms) || DELAY_MIN);
  const delayMax = Math.max(delayMin, Number(job.send_delay_max_ms) || DELAY_MAX);
  const batchSize = Math.max(5, Math.min(100, Number(job.batch_size) || BATCH_SIZE));
  const batchPauseMin = Math.max(120000, Number(job.batch_pause_min_ms) || BATCH_MIN);
  const batchPauseMax = Math.max(batchPauseMin, Number(job.batch_pause_max_ms) || BATCH_MAX);

  let attempts = 0;
  for (const r of recipients) {
    const current = getJob(jobId);
    if (!current) return;
    
    if (current.status === 'stopping') {
      setJobStatus(jobId, 'cancelled', { finished_at: new Date().toISOString() });
      return;
    }

    while (current.status === 'paused') {
      await sleep(2000);
      const c = getJob(jobId);
      if (c.status === 'stopping') {
        setJobStatus(jobId, 'cancelled', { finished_at: new Date().toISOString() });
        return;
      }
      if (c.status !== 'paused') break;
    }

    const fresh = getJob(jobId);
    if (!fresh || fresh.status !== 'running') return;

    const st = getState(job.user_id);
    if (!st || st.state !== 'connected') {
      setJobStatus(jobId, 'paused', { last_error: 'session_down' });
      return;
    }

    // Semua kolom dari file upload jadi variabel template: {nama}, {kota}, {nama_toko}, dst
    let extra = {};
    try { extra = r.data_json ? JSON.parse(r.data_json) : {}; } catch {}
    const message = render(job.template_body, {
      ...extra,
      nama: extra.nama || extra.Nama || extra.name || extra.Name || r.name_raw,
      name: extra.name || extra.Name || extra.nama || extra.Nama || r.name_raw,
      nomor: r.phone_raw,
      phone: r.phone_normalized,
    });
    attempts += 1;

    try {
      await sendRecipientMessage(sock, `${r.phone_normalized}@s.whatsapp.net`, message, job);
      db.prepare("UPDATE blast_recipients SET status='sent', sent_at=datetime('now'), attempts=?, rendered_message=? WHERE id=?")
        .run(attempts, message, r.id);
      db.prepare('UPDATE blast_jobs SET sent = sent + 1 WHERE id = ?').run(jobId);
    } catch (err) {
      const reason = classify(err);
      db.prepare("UPDATE blast_recipients SET status='failed', error_reason=?, attempts=?, rendered_message=? WHERE id=?")
        .run(reason, attempts, message, r.id);
      db.prepare('UPDATE blast_jobs SET failed = failed + 1 WHERE id = ?').run(jobId);
    }

    let delay = rand(delayMin, delayMax);
    if (attempts % batchSize === 0) delay += rand(batchPauseMin, batchPauseMax);
    await sleep(delay);
  }

  const final = getJob(jobId);
  if (final.status === 'stopping') setJobStatus(jobId, 'cancelled', { finished_at: new Date().toISOString() });
  else if (final.status === 'running') setJobStatus(jobId, 'done', { finished_at: new Date().toISOString() });
}

async function sendRecipientMessage(sock, jid, message, job) {
  if (!job.media_data) return sock.sendMessage(jid, { text: message });

  const media = Buffer.isBuffer(job.media_data) ? job.media_data : Buffer.from(job.media_data);
  const mimetype = job.media_mimetype || 'application/octet-stream';
  if (mimetype.startsWith('image/')) {
    return sock.sendMessage(jid, { image: media, caption: message });
  }
  if (mimetype.startsWith('video/')) {
    return sock.sendMessage(jid, { video: media, mimetype, caption: message });
  }
  if (mimetype.startsWith('audio/')) {
    // WhatsApp voice/audio messages do not reliably support captions, so send the text first.
    if (message && message.trim()) await sock.sendMessage(jid, { text: message });
    return sock.sendMessage(jid, { audio: media, mimetype, ptt: false });
  }
  return sock.sendMessage(jid, {
    document: media,
    mimetype,
    fileName: job.media_name || 'attachment',
    caption: message,
  });
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
