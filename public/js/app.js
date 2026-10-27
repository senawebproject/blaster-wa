const $ = selector => document.querySelector(selector);
const templateSelect = $('#templateSelect');
const templateBody = $('#templateBody');
const startBtn = $('#startBtn');

let currentJobId = null;
let pollHandle = null;
let mediaReady = false;
let mediaUploading = false;
let selectedMedia = null;
let contactUploading = false;
let currentContactSummary = null;
let localMediaUrl = null;

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function setStatus(element, message, kind = '') {
  if (!element) return;
  element.textContent = message;
  element.classList.remove('is-error', 'is-success');
  if (kind) element.classList.add(`is-${kind}`);
}

function updateMessagePreview() {
  const text = templateBody?.value || '';
  const preview = $('#messagePreview');
  if (preview) preview.textContent = text.trim() || 'Your message will appear here as you write.';
  const chars = $('#charCount');
  if (chars) chars.textContent = `${text.length} character${text.length === 1 ? '' : 's'}`;
  const delivery = document.querySelector('input[name="mode"]:checked')?.value;
  if ($('#deliverySummary')) $('#deliverySummary').textContent = delivery === 'scheduled' ? 'Scheduled' : 'Send now';
}

templateSelect?.addEventListener('change', () => {
  const option = templateSelect.selectedOptions[0];
  if (option?.dataset.body) templateBody.value = option.dataset.body.replace(/&quot;/g, '"');
  updateMessagePreview();
});
templateBody?.addEventListener('input', updateMessagePreview);

document.querySelectorAll('input[name="mode"]').forEach(radio => {
  radio.addEventListener('change', () => {
    const scheduled = document.querySelector('input[name="mode"]:checked')?.value === 'scheduled';
    $('#scheduleField')?.classList.toggle('hidden', !scheduled);
    updateMessagePreview();
  });
});

// Connection status
async function refreshWaBadge() {
  const badge = $('#waBadge');
  if (!badge) return;
  try {
    const response = await fetch('/api/session/status');
    if (!response.ok) throw new Error('status unavailable');
    const data = await response.json();
    const labels = {
      connected: 'WhatsApp connected',
      disconnected: 'WhatsApp disconnected',
      awaiting_pairing: 'Pairing needed',
      pairing_code_issued: 'Pairing code active',
      logged_out: 'WhatsApp logged out',
      banned: 'Account unavailable'
    };
    badge.className = `status-pill is-${String(data.state || 'checking').replace(/[^a-z_]/g, '')}`;
    badge.innerHTML = '<span class="status-dot"></span><span></span>';
    badge.querySelector('span:last-child').textContent = labels[data.state] || 'WhatsApp status unknown';
  } catch {
    badge.className = 'status-pill is-checking';
    badge.textContent = 'WhatsApp status unavailable';
  }
}
refreshWaBadge();
setInterval(refreshWaBadge, 8000);

// Contact spreadsheet upload and preview.
const fileInput = $('#fileInput');
fileInput?.addEventListener('change', async event => {
  const file = event.target.files?.[0];
  if (!file) return;
  contactUploading = true;
  updateLaunchState();
  setStatus($('#uploadInfo'), `Processing ${file.name}…`);
  const formData = new FormData();
  formData.append('file', file);
  try {
    const response = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'X-CSRF-Token': window.CSRF },
      body: formData
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || data.error || 'Upload failed');
    currentContactSummary = data.summary;
    const summary = data.summary || {};
    setStatus($('#uploadInfo'), `${file.name} · ${summary.total} contacts · ${summary.valid} valid · ${summary.invalid} invalid · ${summary.duplicates} duplicates`, 'success');
    $('#previewSummary').textContent = `Phone column: ${data.phoneColumn || 'not detected'} · Showing ${data.preview.length} rows`;
    const head = $('#previewHead');
    head.innerHTML = '<tr><th>Name</th><th>Phone number</th><th>Status</th></tr>';
    const body = $('#previewBody');
    body.replaceChildren();
    (data.preview || []).forEach(row => {
      const tr = document.createElement('tr');
      const addCell = (value, className = '') => {
        const td = document.createElement('td');
        td.textContent = value == null || value === '' ? '—' : String(value);
        if (className) td.className = className;
        tr.appendChild(td);
      };
      addCell(row.name || '-');
      addCell(row.phoneNormalized || row.phoneRaw || '-', 'phone-cell');
      addCell(row.status, row.status === 'ok' ? 'cell-valid' : 'cell-invalid');
      body.appendChild(tr);
    });
    $('#previewWrap').classList.remove('hidden');
    $('#audienceSummary').textContent = `${summary.valid || 0} valid contacts`;
  } catch (error) {
    currentContactSummary = null;
    setStatus($('#uploadInfo'), `Upload failed: ${error.message}`, 'error');
    $('#audienceSummary').textContent = 'No list uploaded';
  } finally {
    contactUploading = false;
    updateLaunchState();
  }
});

// Attachment upload. The file is stored server-side and tied to the user's next campaign.
const mediaInput = $('#mediaInput');
const mediaSelected = $('#mediaSelected');
const mediaStatus = $('#mediaStatus');

function renderMediaPreview(file, data = {}) {
  selectedMedia = data;
  const name = data.name || file?.name || 'Attachment';
  const size = data.size ?? file?.size;
  const mime = data.mimetype || file?.type || 'File';
  $('#mediaName').textContent = name;
  $('#mediaDetails').textContent = `${mime} · ${formatBytes(size)}`;
  const thumb = $('#mediaThumb');
  thumb.replaceChildren();
  if (file && file.type.startsWith('image/') && localMediaUrl) {
    const image = document.createElement('img');
    image.src = localMediaUrl;
    image.alt = '';
    thumb.appendChild(image);
  } else {
    const type = String(data.kind || (mime.startsWith('video/') ? 'video' : mime.startsWith('audio/') ? 'audio' : mime.startsWith('image/') ? 'image' : 'document')).toUpperCase();
    const label = document.createElement('span');
    label.textContent = type === 'DOCUMENT' ? (name.split('.').pop() || 'FILE').slice(0, 5).toUpperCase() : type;
    thumb.appendChild(label);
  }
  mediaSelected.classList.remove('hidden');
  $('#attachmentSummary').textContent = name;
  const previewMedia = $('#previewMedia');
  previewMedia.textContent = `Attachment · ${name}`;
  previewMedia.classList.remove('hidden');
}

mediaInput?.addEventListener('change', async event => {
  const file = event.target.files?.[0];
  if (!file) return;
  if (localMediaUrl) URL.revokeObjectURL(localMediaUrl);
  localMediaUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : null;
  mediaReady = false;
  mediaUploading = true;
  renderMediaPreview(file, { name: file.name, size: file.size, mimetype: file.type || 'File', kind: file.type.split('/')[0] || 'document' });
  setStatus(mediaStatus, `Uploading ${file.name}…`);
  updateLaunchState();

  const formData = new FormData();
  formData.append('file', file);
  try {
    const response = await fetch('/api/media/upload', {
      method: 'POST', headers: { 'X-CSRF-Token': window.CSRF }, body: formData
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || data.error || 'Upload failed');
    mediaReady = true;
    renderMediaPreview(file, data);
    setStatus(mediaStatus, 'Attachment ready to send with this campaign.', 'success');
  } catch (error) {
    mediaReady = false;
    setStatus(mediaStatus, `Attachment failed: ${error.message}`, 'error');
  } finally {
    mediaUploading = false;
    updateLaunchState();
  }
});

$('#removeMediaBtn')?.addEventListener('click', async () => {
  try {
    await fetch('/api/media/pending', { method: 'DELETE', headers: { 'X-CSRF-Token': window.CSRF } });
  } catch {}
  clearMediaUi();
});

function clearMediaUi() {
  if (localMediaUrl) URL.revokeObjectURL(localMediaUrl);
  localMediaUrl = null;
  selectedMedia = null;
  mediaReady = false;
  mediaUploading = false;
  if (mediaInput) mediaInput.value = '';
  mediaSelected?.classList.add('hidden');
  $('#previewMedia')?.classList.add('hidden');
  $('#attachmentSummary').textContent = 'None';
  setStatus(mediaStatus, '');
  updateLaunchState();
}

// Allow dropping a file on either upload region while keeping the native file input as the source.
for (const [dropzone, input] of [[$('#mediaDropzone'), mediaInput], [$('#contactDropzone'), fileInput]]) {
  if (!dropzone || !input) continue;
  dropzone.addEventListener('dragover', event => { event.preventDefault(); dropzone.classList.add('is-dragging'); });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('is-dragging'));
  dropzone.addEventListener('drop', event => {
    event.preventDefault();
    dropzone.classList.remove('is-dragging');
    const file = event.dataTransfer?.files?.[0];
    if (!file) return;
    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

function updateLaunchState() {
  if (!startBtn) return;
  startBtn.disabled = mediaUploading || contactUploading;
  startBtn.title = mediaUploading || contactUploading ? 'Wait for uploads to finish' : '';
}

// Start campaign, storing the selected attachment in the job on the server.
startBtn?.addEventListener('click', async () => {
  const body = templateBody.value.trim();
  if (!body) return alert('Write a message before launching the campaign.');
  if (mediaUploading || contactUploading) return alert('Please wait for uploads to finish.');
  if (selectedMedia && !mediaReady) return alert('The attachment did not upload successfully. Remove it or try again.');
  const mode = document.querySelector('input[name="mode"]:checked')?.value || 'immediate';
  const scheduledAt = mode === 'scheduled' ? $('#scheduledAt').value : null;
  if (mode === 'scheduled' && !scheduledAt) return alert('Choose a scheduled date and time.');
  if (!currentContactSummary?.valid) return alert('Upload a contact list with at least one valid phone number first.');
  if (!confirm(`Launch this campaign to ${currentContactSummary.valid} valid contacts${selectedMedia ? ' with an attachment' : ''}?`)) return;

  startBtn.disabled = true;
  startBtn.querySelector('span:first-child').textContent = 'Launching campaign…';
  try {
    const response = await fetch('/api/blast/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': window.CSRF },
      body: JSON.stringify({ templateBody: body, mode, scheduledAt })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || data.error || 'Campaign could not start');
    currentJobId = data.jobId;
    $('#progressCard').classList.remove('hidden');
    $('#progressCard').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    if (selectedMedia) clearMediaUi();
    startPolling(currentJobId);
  } catch (error) {
    alert(`Could not launch campaign: ${error.message}`);
  } finally {
    startBtn.querySelector('span:first-child').textContent = 'Launch campaign';
    updateLaunchState();
  }
});

function startPolling(id) {
  if (pollHandle) clearInterval(pollHandle);
  const poll = async () => {
    try {
      const response = await fetch(`/api/blast/${id}/status`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Status unavailable');
      renderProgress(data);
      if (data.status === 'pending' && data.mode === 'scheduled') {
        clearInterval(pollHandle);
        pollHandle = null;
        return;
      }
      if (['done', 'cancelled', 'failed'].includes(data.status)) {
        clearInterval(pollHandle);
        pollHandle = null;
      }
    } catch (error) {
      setStatus($('#progressText'), `Unable to refresh status: ${error.message}`, 'error');
    }
  };
  poll();
  pollHandle = setInterval(poll, 2500);
}

function renderProgress(job) {
  const finished = (job.sent || 0) + (job.failed || 0);
  const percent = job.total ? Math.round((finished / job.total) * 100) : 0;
  $('#progressBar').style.width = `${percent}%`;
  const stateText = {
    pending: 'Scheduled and waiting to start', running: `${finished} of ${job.total} processed · ${job.sent} sent · ${job.failed} failed`,
    paused: `Paused · ${finished} of ${job.total} processed`, stopping: 'Stopping after the current message…',
    done: `Complete · ${job.sent} sent · ${job.failed} failed`, cancelled: `Stopped · ${job.sent} sent · ${job.failed} failed`,
    failed: 'Campaign failed'
  };
  $('#progressText').textContent = job.current || stateText[job.status] || `${job.status} · ${finished}/${job.total}`;
  if (job.failed > 0) {
    const link = $('#failedLink');
    link.href = `/api/blast/${job.id}/failed.csv`;
    link.classList.remove('hidden');
  }
}

['pause', 'resume', 'stop'].forEach(action => {
  $(`#${action}Btn`)?.addEventListener('click', async () => {
    if (!currentJobId) return;
    if (action === 'stop' && !confirm('Stop this campaign after the current message?')) return;
    try {
      const response = await fetch(`/api/blast/${currentJobId}/${action}`, {
        method: 'POST', headers: { 'X-CSRF-Token': window.CSRF }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `Could not ${action}`);
      if (action === 'stop') setStatus($('#progressText'), 'Stop requested…');
    } catch (error) {
      alert(error.message);
    }
  });
});

try {
  const savedDraft = sessionStorage.getItem('blasterDraft');
  if (savedDraft) { templateBody.value = savedDraft.replace(/&quot;/g, '"'); sessionStorage.removeItem('blasterDraft'); }
} catch {}
updateMessagePreview();
updateLaunchState();
