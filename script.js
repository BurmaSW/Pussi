const videoInput = document.getElementById('videoInput');
const subtitleInput = document.getElementById('subtitleInput');
const video = document.getElementById('video');
const subtitleOverlay = document.getElementById('subtitleOverlay');
const cueForm = document.getElementById('cueForm');
const startTimeInput = document.getElementById('startTime');
const endTimeInput = document.getElementById('endTime');
const cueTextInput = document.getElementById('cueText');
const cueList = document.getElementById('cueList');
const downloadBtn = document.getElementById('downloadBtn');

let cues = [];

function parseTimestamp(value) {
  const pattern = /^(\d{2}):(\d{2}):(\d{2})[.,](\d{3})$/;
  const match = value.trim().match(pattern);
  if (!match) return null;
  const [, h, m, s, ms] = match.map(Number);
  return h * 3600 + m * 60 + s + ms / 1000;
}

function formatTimestamp(seconds) {
  const totalMs = Math.round(seconds * 1000);
  const ms = totalMs % 1000;
  const totalSeconds = Math.floor(totalMs / 1000);
  const s = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const m = totalMinutes % 60;
  const h = Math.floor(totalMinutes / 60);

  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
}

function sortCues() {
  cues.sort((a, b) => a.start - b.start);
}

function renderCueList() {
  cueList.innerHTML = '';

  if (!cues.length) {
    cueList.innerHTML = '<li>No subtitles loaded yet.</li>';
    return;
  }

  cues.forEach((cue, index) => {
    const li = document.createElement('li');
    li.className = 'cue-item';

    const info = document.createElement('div');
    info.innerHTML = `<small>${formatTimestamp(cue.start)} → ${formatTimestamp(cue.end)}</small>${cue.text}`;

    const deleteButton = document.createElement('button');
    deleteButton.className = 'delete-btn';
    deleteButton.type = 'button';
    deleteButton.textContent = 'Delete';
    deleteButton.addEventListener('click', () => {
      cues.splice(index, 1);
      renderCueList();
    });

    li.append(info, deleteButton);
    cueList.appendChild(li);
  });
}

function updateSubtitleOverlay() {
  const current = video.currentTime;
  const activeCue = cues.find((cue) => current >= cue.start && current <= cue.end);
  subtitleOverlay.textContent = activeCue ? activeCue.text : '';
}

function parseVtt(vttText) {
  const lines = vttText.split(/\r?\n/);
  const parsed = [];

  for (let i = 0; i < lines.length; i += 1) {
    if (!lines[i].includes('-->')) continue;

    const [startRaw, endRaw] = lines[i].split('-->').map((x) => x.trim());
    const start = parseTimestamp(startRaw);
    const end = parseTimestamp(endRaw);

    if (start === null || end === null) continue;

    let text = '';
    i += 1;
    while (i < lines.length && lines[i].trim() !== '') {
      text += (text ? '\n' : '') + lines[i];
      i += 1;
    }

    if (text) parsed.push({ start, end, text });
  }

  return parsed;
}

function exportVtt() {
  const body = cues
    .map((cue, i) => `${i + 1}\n${formatTimestamp(cue.start)} --> ${formatTimestamp(cue.end)}\n${cue.text}\n`)
    .join('\n');

  return `WEBVTT\n\n${body}`;
}

videoInput.addEventListener('change', (event) => {
  const [file] = event.target.files;
  if (!file) return;

  video.src = URL.createObjectURL(file);
  video.load();
});

subtitleInput.addEventListener('change', async (event) => {
  const [file] = event.target.files;
  if (!file) return;

  const text = await file.text();
  cues = parseVtt(text);
  sortCues();
  renderCueList();
});

cueForm.addEventListener('submit', (event) => {
  event.preventDefault();

  const start = parseTimestamp(startTimeInput.value);
  const end = parseTimestamp(endTimeInput.value);
  const text = cueTextInput.value.trim();

  if (start === null || end === null || start >= end || !text) {
    alert('Please enter valid times and subtitle text.');
    return;
  }

  cues.push({ start, end, text });
  sortCues();
  renderCueList();

  cueForm.reset();
  startTimeInput.focus();
});

video.addEventListener('timeupdate', updateSubtitleOverlay);
video.addEventListener('seeked', updateSubtitleOverlay);
video.addEventListener('pause', updateSubtitleOverlay);

downloadBtn.addEventListener('click', () => {
  if (!cues.length) {
    alert('There are no subtitle cues to download.');
    return;
  }

  const blob = new Blob([exportVtt()], { type: 'text/vtt' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = 'subtitles.vtt';
  link.click();

  URL.revokeObjectURL(url);
});

renderCueList();
