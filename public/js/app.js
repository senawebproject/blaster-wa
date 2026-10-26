const $ = s => document.querySelector(s);

const templateSelect = $('#templateSelect');
templateSelect?.addEventListener('change', () => {
  const opt = templateSelect.selectedOptions[0];
  if (opt?.dataset.body) $('#templateBody').value = opt.dataset.body.replace(/&quot;/g, '"');
});

// Mode toggle
document.querySelectorAll('input[name="mode"]').forEach(r => {
  r.addEventListener('change', () => {
    $('#scheduledAt').classList.toggle('hidden', r.value !== 'scheduled' || !r.checked);
  });
});

// WA badge
async function refreshWaBadge() {
  try {
    const r = await fetch('/api/session/status');
    const j = await r.json();
    const badge = $('#waBadge');
    if (!badge) return;
    const map = { connected: '🟢 Connected', disconnected: '🔴 Terputus', awaiting_pairing: '🟡 Pairing', pairing_code_issued: '🟡 Kode aktif', logged_out: '🔴 Logout', banned: '⛔ Diblokir' };
    badge.textContent = map[j.state] || '…';
  } catch {}
}
refreshWaBadge(); setInterval(refreshWaBadge, 5000);

// Upload
$('#fileInput')?.addEventListener('change', async e => {
  const file = e.target.files[0];
  if (!file) return;
  const fd = new FormData();
  fd.append('file', file);
  $('#uploadInfo').textContent = 'Mengunggah & memproses…';
  const r = await fetch('/api/upload', {
    method: 'POST', headers: { 'X-CSRF-Token': window.CSRF }, body: fd
  });
  const j = await r.json();
  if (!r.ok) { $('#uploadInfo').textContent = 'Gagal: ' + (j.error || 'unknown'); return; }

  const s = j.summary;
  $('#uploadInfo').textContent = `Total: ${s.total} · Valid: ${s.valid} · Invalid: ${s.invalid} · Duplikat: ${s.duplicates}`;
  $('#previewSummary').textContent = `Kolom nomor: ${j.phoneColumn || 'tidak terdeteksi'}`;

  const head = $('#previewHead');
  head.innerHTML = '<tr><th class="text-left py-1">Nama</th><th class="text-left py-1">Nomor</th><th class="text-left py-1">Status</th></tr>';
  const body = $('#previewBody');
  body.innerHTML = '';
  j.preview.forEach(row => {
    const tr = document.createElement('tr');
    const cell = (t, cls) => { const td = document.createElement('td'); td.textContent = t; if (cls) td.className = cls; return td; };
    tr.appendChild(cell(row.name || '-', 'py-1'));
    tr.appendChild(cell(row.phoneNormalized || row.phoneRaw || '-', 'py-1 text-gray-400'));
    tr.appendChild(cell(row.status, 'py-1 ' + (row.status === 'ok' ? 'text-emerald-400' : 'text-red-400')));
    body.appendChild(tr);
  });
  $('#previewWrap').classList.remove('hidden');
});

// Start blast
let currentJobId = null;
let pollHandle = null;

$('#startBtn')?.addEventListener('click', async () => {
  const templateBody = $('#templateBody').value.trim();
  if (!templateBody) return alert('Pilih template dulu');
  const mode = document.querySelector('input[name="mode"]:checked').value;
  const scheduledAt = mode === 'scheduled' ? $('#scheduledAt').value : null;
  if (mode === 'scheduled' && !scheduledAt) return alert('Pilih tanggal & jam');

  $('#startBtn').disabled = true;
  $('#startBtn').textContent = 'Memproses…';
  try {
    const r = await fetch('/api/blast/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': window.CSRF },
      body: JSON.stringify({ templateBody, mode, scheduledAt })
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || 'unknown');
    currentJobId = j.jobId;
    $('#progressCard').classList.remove('hidden');
    startPolling(currentJobId);
  } catch (err) {
    alert('Gagal start: ' + err.message);
  } finally {
    $('#startBtn').disabled = false;
    $('#startBtn').textContent = '🚀 Blast';
  }
});

function startPolling(id) {
  if (pollHandle) clearInterval(pollHandle);
  pollHandle = setInterval(async () => {
    const r = await fetch('/api/blast/' + id + '/status');
    const j = await r.json();
    renderProgress(j);
    if (['done','cancelled','failed'].includes(j.status)) {
      clearInterval(pollHandle); pollHandle = null;
    }
  }, 2000);
}

function renderProgress(j) {
  const done = j.sent + j.failed;
  const pct = j.total ? Math.round((done / j.total) * 100) : 0;
  $('#progressBar').style.width = pct + '%';
  $('#progressText').textContent = j.current || `${j.status} — ${done}/${j.total} (gagal ${j.failed})`;
  if (j.failed > 0) {
    const a = $('#failedLink');
    a.href = '/api/blast/' + j.id + '/failed.csv';
    a.classList.remove('hidden');
  }
}

['pause','resume','stop'].forEach(k => {
  const el = document.getElementById(k + 'Btn'); // <-- INI YANG DIPERBAIKI
  el?.addEventListener('click', async () => {
    if (!currentJobId) return;
    if (k === 'stop' && !confirm('Yakin stop job ini?')) return;
    await fetch('/api/blast/' + currentJobId + '/' + k, {
      method: 'POST', headers: { 'X-CSRF-Token': window.CSRF }
    });
  });
});