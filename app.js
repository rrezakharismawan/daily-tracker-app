// ============================================================
// DAILY WORKLOG & PROGRESS TRACKER
// LOGIKA UTAMA APLIKASI
// ============================================================

let logsData = JSON.parse(localStorage.getItem('logs_data')) || [];
let todayTaskContent = localStorage.getItem('today_task') || '';
let dailyHistory = JSON.parse(localStorage.getItem('daily_history')) || [];
let startTimeTracker = null;


// ============================================================
// INITIALIZATION
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  initDropdowns();
  loadSavedData();
  renderLogs();
  calculateProgress();
  renderHistory();

  // Jalankan jam desktop
  updateDesktopClock();
  setInterval(updateDesktopClock, 1000);
});


// ============================================================
// POPULATE DROPDOWN
// ============================================================

function initDropdowns() {
  const selectA = document.getElementById('select-dropdown-a');
  const selectB = document.getElementById('select-dropdown-b');

  if (!selectA || !selectB) {
    console.error('Dropdown tidak ditemukan.');
    return;
  }

  // Dropdown A
  selectA.innerHTML = CONFIG.DROPDOWN_A
    .map(item => `<option value="${item}">${item}</option>`)
    .join('');

  // =========================================================
  // DROPDOWN B DENGAN GROUP / SEPARATOR
  // =========================================================

  const options = Object.entries(CONFIG.DROPDOWN_B);

  let html = `
    <option value="" selected disabled>
      -- Pilih Task Terlebih Dahulu --
    </option>
  `;
  let currentGroup = null;

  options.forEach(([key, data]) => {

    // Jika task adalah separator
    if (key.startsWith('---')) {

      // Tutup group sebelumnya
      if (currentGroup !== null) {
        html += '</optgroup>';
      }

      currentGroup = key;

      // Buat group baru
      html += `<optgroup label="${key.replace(/-/g, '').trim()}">`;

      return;
    }

    const label =
      data.type === 'murni'
        ? `[Murni] ${key}`
        : key;

    html += `
      <option value="${key}">
        ${label}
      </option>
    `;
  });

  // Tutup group terakhir
  if (currentGroup !== null) {
    html += '</optgroup>';
  }

  selectB.innerHTML = html;
}


// ============================================================
// TODAY TASK EDITOR
// ============================================================

function execCmd(command) {
  document.execCommand(command, false, null);
  saveTodayTask();
}

const editor = document.getElementById('today-task-editor');

if (editor) {
  editor.addEventListener('input', () => {
    localStorage.setItem('today_task', editor.innerHTML);
    detectJobIDs(editor.innerText);
  });
}

function saveTodayTask() {
  if (editor) {
    localStorage.setItem('today_task', editor.innerHTML);
  }
}

function loadSavedData() {
  if (editor && todayTaskContent) {
    editor.innerHTML = todayTaskContent;
  }
}


// ============================================================
// DETEKSI OTOMATIS JOB ID
// ============================================================

function detectJobIDs(text) {
  // Contoh:
  // A0566Y8
  // A056FWX

  const regex = /\bA\d{3}[A-Z0-9]{3}\b/g;
  const matches = text.match(regex);

  if (matches && matches.length > 0) {
    const jobInput = document.getElementById('input-job');

    if (jobInput && !jobInput.value) {
      jobInput.value = matches[matches.length - 1];
    }
  }
}


// ============================================================
// HITUNG SELISIH WAKTU
// ISTIRAHAT 12.00 - 13.00 TIDAK DIHITUNG
// ============================================================

function calculateMinutesBetween(startStr, endStr) {

  function parseTime(str) {

    if (!str) {
      return NaN;
    }

    const normalized = str
      .trim()
      .replace('.', ':');

    const parts = normalized.split(':');

    if (parts.length < 2) {
      return NaN;
    }

    const hour = parseInt(parts[0], 10);
    const minute = parseInt(parts[1], 10);

    if (
      isNaN(hour) ||
      isNaN(minute) ||
      hour < 0 ||
      hour > 23 ||
      minute < 0 ||
      minute > 59
    ) {
      return NaN;
    }

    return hour * 60 + minute;
  }

  try {

    const start = parseTime(startStr);
    const end = parseTime(endStr);

    if (isNaN(start) || isNaN(end)) {
      return 0;
    }

    // Selisih waktu dasar
    let totalMinutes = end - start;

    // Jika melewati tengah malam
    if (totalMinutes < 0) {
      totalMinutes += 24 * 60;
    }

    // ==========================================
    // ISTIRAHAT 12.00 - 13.00
    // ==========================================

    const BREAK_START = 12 * 60; // 720
    const BREAK_END = 13 * 60;   // 780

    let breakMinutes = 0;

    // Hitung overlap antara waktu kerja dan waktu istirahat
    if (start < BREAK_END && end > BREAK_START) {

      const overlapStart =
        Math.max(start, BREAK_START);

      const overlapEnd =
        Math.min(end, BREAK_END);

      breakMinutes =
        Math.max(0, overlapEnd - overlapStart);
    }

    // Kurangi waktu istirahat
    totalMinutes -= breakMinutes;

    return Math.max(0, totalMinutes);

  } catch (err) {

    console.error(
      'Error menghitung waktu:',
      err
    );

    return 0;
  }
}


// ============================================================
// INPUT WAKTU
// AUTO CALCULATE DURASI & POLES
// ============================================================

const inputWaktu = document.getElementById('input-waktu');

if (inputWaktu) {

  inputWaktu.oninput = function(e) {

    const val = e.target.value.trim();

    // Format:
    // 08.00 - 09.30
    // atau
    // 08:00 - 09:30

    const times = val
      .split('-')
      .map(t => t.trim());

    if (times.length !== 2) {
      return;
    }

    const mins = calculateMinutesBetween(
      times[0],
      times[1]
    );

    if (!isNaN(mins) && mins > 0) {

      const durasiField =
        document.getElementById('calc-durasi');

      const polesField =
        document.getElementById('calc-poles');

      if (durasiField) {
        durasiField.value = `${mins} Menit`;
      }

      const selectB =
        document.getElementById('select-dropdown-b');

      // Task wajib dipilih sebelum Pole bisa dihitung.
      if (!selectB || !selectB.value) {

        if (polesField) {
          polesField.value = '';
        }

        return;
      }

      const taskConfig =
        CONFIG.DROPDOWN_B[selectB.value];

      if (
        !taskConfig ||
        taskConfig.type === 'separator' ||
        !taskConfig.divider ||
        taskConfig.divider <= 0
      ) {

        if (polesField) {
          polesField.value = '';
        }

        return;
      }

      const poles =
        mins / taskConfig.divider;

      if (polesField) {
        polesField.value = poles;
      }
    }
  };
}


// ============================================================
// TASK BERUBAH → HITUNG ULANG OTOMATIS
// ============================================================

const selectTask =
  document.getElementById('select-dropdown-b');

if (selectTask) {

  selectTask.onchange = () => {

    if (inputWaktu) {
      inputWaktu.dispatchEvent(new Event('input'));
    }

  };
}


// ============================================================
// TAMBAH LOG
// ============================================================

const btnAddLog =
  document.getElementById('btn-add-log');

if (btnAddLog) {

  btnAddLog.onclick = () => {

    const waktu =
      document.getElementById('input-waktu')?.value.trim();

    const job =
      document.getElementById('input-job')?.value.trim();

    const dropdownA =
      document.getElementById('select-dropdown-a')?.value;

    const dropdownB =
      document.getElementById('select-dropdown-b')?.value;

    const durasiText =
      document.getElementById('calc-durasi')?.value;

    // Task wajib dipilih terlebih dahulu.
    const taskConfig =
      CONFIG.DROPDOWN_B[dropdownB];

    if (
      !dropdownB ||
      !taskConfig ||
      taskConfig.type === 'separator'
    ) {
      alert('Silakan pilih Task terlebih dahulu.');
      return;
    }

    const poles =
      parseFloat(
        document.getElementById('calc-poles')?.value
      );

    if (!waktu || !job || isNaN(poles)) {

      alert(
        'Lengkapi semua field input waktu dan Job ID dengan benar!'
      );

      return;
    }

    const mins = parseInt(durasiText);

    const taskType =
      CONFIG.DROPDOWN_B[dropdownB]?.type || 'sekunder';

    const newLog = {

      id: Date.now(),

      waktu,

      job,

      dropdownA,

      dropdownB,

      mins,

      poles,

      taskType
    };

    logsData.push(newLog);

    saveAndRender();

    // Reset form

    document.getElementById('input-waktu').value = '';
    document.getElementById('input-job').value = '';
    document.getElementById('calc-durasi').value = '';
    document.getElementById('calc-poles').value = '';
  };
}


// ============================================================
// MENENTUKAN GROUP TASK
// ============================================================

function getTaskGroup(taskName) {

  let currentGroup = 'TASK OTHER';

  for (const [key, data] of Object.entries(CONFIG.DROPDOWN_B)) {

    if (data.type === 'separator') {

      let groupName = key
        .replace(/^---/, '')
        .replace(/---$/, '')
        .trim();

      groupName = groupName.replace(/^Select\s+/i, '');
      currentGroup = groupName.toUpperCase();
      continue;
    }

    if (key === taskName) {
      return currentGroup;
    }
  }

  return currentGroup;
}


// ============================================================
// RENDER LOG DENGAN GROUP
// ============================================================

// ============================================================
// RENDER LOG DENGAN GROUP
// ============================================================

function renderLogs() {

  const container =
    document.getElementById('notes-list');

  if (!container) {
    return;
  }

  // ==========================================================
  // EMPTY STATE
  // ==========================================================

  if (logsData.length === 0) {

    container.innerHTML = `
      <div class="empty-state">

        <div class="empty-state-title">
          Belum ada aktivitas hari ini
        </div>

        <div class="empty-state-subtitle">
          Tambahkan log pekerjaan untuk mulai mencatat.
        </div>

      </div>
    `;

    return;
  }


  // ==========================================================
  // BUAT 4 KELOMPOK
  // ==========================================================

  const groupedLogs = {};


  // ==========================================================
  // MASUKKAN LOG KE GROUP SECARA DINAMIS
  // ==========================================================

  logsData.forEach(log => {

    const group =
      getTaskGroup(log.dropdownB);

    if (!groupedLogs[group]) {
      groupedLogs[group] = [];
    }

    groupedLogs[group].push(log);

  });


  // ==========================================================
  // RENDER
  // ==========================================================

  let html = '';


  Object.entries(groupedLogs).forEach(
    ([groupName, logs]) => {

      // Group kosong tidak ditampilkan
      if (logs.length === 0) {
        return;
      }


      // ======================================================
      // TOTAL GROUP
      // ======================================================

      const totalMinutes =
        logs.reduce(
          (sum, log) =>
            sum + (Number(log.mins) || 0),
          0
        );


      const totalPoles =
        logs.reduce(
          (sum, log) =>
            sum + (Number(log.poles) || 0),
          0
        );


      // ======================================================
      // HEADER GROUP
      // ======================================================

      html += `
        <div class="notes-group">

          <div class="notes-group-title">

            <span class="group-name">
              ${groupName}
            </span>

            <span class="notes-group-count">
              ${logs.length}
            </span>

            <span class="group-summary">
              ${totalMinutes} Menit
            </span>

            <span class="group-summary">
              ${totalPoles} Poles
            </span>

          </div>


          <div class="notes-group-list">
      `;


      // ======================================================
      // LOG
      // ======================================================

      logs.forEach(log => {

        html += `
          <div class="note-item">

            <span>

              <strong>${log.waktu}</strong>
              |
              ${log.job}
              |
              ${log.dropdownA}
              ${log.dropdownB}
              (${log.mins} Menit)

              <strong>
                ${log.poles}
              </strong>

            </span>


            <button
              onclick="deleteLog(${log.id})"
              class="delete-log-btn"
              title="Hapus log"
            >
              ❌
            </button>

          </div>
        `;
      });


      html += `
          </div>

        </div>
      `;
    }
  );


  container.innerHTML = html;
}
// ============================================================
// HAPUS LOG
// ============================================================

function deleteLog(id) {

  logsData =
    logsData.filter(item => item.id !== id);

  saveAndRender();
}


// ============================================================
// HITUNG PROGRESS
// ============================================================
function calculateProgress() {

  let totalPoles = 0;
  let totalMinutes = 0;

  // =========================
  // POLE BERDASARKAN TARGET ROLE
  // =========================

  let totalPolesQC = 0;
  let totalPolesCSQ = 0;

  // =========================
  // POLE BERDASARKAN JENIS TASK
  // =========================

  let totalPolesMurni = 0;
  let totalPolesSekunder = 0;


  logsData.forEach(item => {

    totalMinutes += item.mins;
    totalPoles += item.poles;


    // ---------------------------------
    // Hitung berdasarkan standard task
    // 15 menit = QC
    // 30 menit = CSQ
    // ---------------------------------

    const taskConfig =
      CONFIG.DROPDOWN_B[item.dropdownB];

    if (taskConfig) {

      const divider = taskConfig.divider;

      if (divider === 15) {

        totalPolesQC += item.poles;

      } else if (divider === 30) {

        totalPolesCSQ += item.poles;

      }
    }


    // ---------------------------------
    // Hitung jenis task untuk warna bar
    // ---------------------------------

    if (item.taskType === 'murni') {

      totalPolesMurni += item.poles;

    } else {

      totalPolesSekunder += item.poles;
    }
  });


  // =========================================================
  // TARGET ROLE
  // =========================================================

  const TARGET_QC = 32;
  const TARGET_CSQ = 16;


  // =========================================================
  // KONTRIBUSI MASING-MASING ROLE
  // =========================================================

  const percentQC =
    (totalPolesQC / TARGET_QC) * 100;

  const percentCSQ =
    (totalPolesCSQ / TARGET_CSQ) * 100;


  // =========================================================
  // TOTAL PROGRESS
  //
  // QC 16 / 32 = 50%
  // CSQ 8 / 16 = 50%
  // TOTAL = 100%
  // =========================================================

  const totalPercent =
    percentQC + percentCSQ;


  // =========================================================
  // UPDATE INFORMASI ATAS
  // =========================================================

  const totalMinutesLabel =
    document.getElementById('total-minutes-label');

  const totalPolesLabel =
    document.getElementById('total-poles-label');

  const totalPercentLabel =
    document.getElementById('total-percent-label');


  if (totalMinutesLabel) {

    totalMinutesLabel.innerText =
      totalMinutes;
  }


  if (totalPolesLabel) {

    totalPolesLabel.innerText =
      totalPoles;
  }


  if (totalPercentLabel) {

    totalPercentLabel.innerText =
      `${totalPercent.toFixed(2)}%`;
  }


  // =========================================================
  // PROGRESS BAR
  // =========================================================

  const barSekunder =
    document.getElementById('bar-sekunder');

  const barMurni =
    document.getElementById('bar-murni');


  const labelSekunder =
    document.getElementById('label-sekunder');

  const labelMurni =
    document.getElementById('label-murni');


  // ---------------------------------------------------------
  // Secondary tetap menggunakan bobot role
  // ---------------------------------------------------------

  let percentSekunder = 0;


  logsData.forEach(item => {

    if (item.taskType !== 'murni') {

      const taskConfig =
        CONFIG.DROPDOWN_B[item.dropdownB];

      if (!taskConfig) {
        return;
      }

      if (taskConfig.divider === 15) {

        percentSekunder +=
          (item.poles / TARGET_QC) * 100;

      } else if (taskConfig.divider === 30) {

        percentSekunder +=
          (item.poles / TARGET_CSQ) * 100;
      }
    }
  });


  // ---------------------------------------------------------
  // Pure Pole
  // ---------------------------------------------------------

  let percentMurni = 0;


  logsData.forEach(item => {

    if (item.taskType === 'murni') {

      const taskConfig =
        CONFIG.DROPDOWN_B[item.dropdownB];

      if (!taskConfig) {
        return;
      }

      if (taskConfig.divider === 15) {

        percentMurni +=
          (item.poles / TARGET_QC) * 100;

      } else if (taskConfig.divider === 30) {

        percentMurni +=
          (item.poles / TARGET_CSQ) * 100;
      }
    }
  });


  // =========================================================
  // UPDATE BAR
  // =========================================================

  if (barSekunder) {

    barSekunder.style.width =
      `${Math.min(percentSekunder, 100)}%`;
  }


  if (labelSekunder) {

    labelSekunder.innerText =
      percentSekunder > 0
        ? `${percentSekunder.toFixed(2)}%`
        : '';
  }


  if (barMurni) {

    barMurni.style.width =
      `${Math.min(percentMurni, 100)}%`;
  }


  if (labelMurni) {

    labelMurni.innerText =
      percentMurni > 0
        ? `${percentMurni.toFixed(2)}%`
        : '';
  }
}

// ============================================================
// SAVE & RENDER
// ============================================================

function saveAndRender() {

  localStorage.setItem(
    'logs_data',
    JSON.stringify(logsData)
  );

  renderLogs();

  calculateProgress();
}



// ============================================================
// DAILY HISTORY / LOCAL ARCHIVE
// ============================================================

function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDailySummary(sourceLogs = logsData) {
  let totalMinutes = 0;
  let totalPoles = 0;
  let polesQC = 0;
  let polesCSQ = 0;

  sourceLogs.forEach(item => {
    totalMinutes += Number(item.mins) || 0;
    totalPoles += Number(item.poles) || 0;

    const taskConfig = CONFIG.DROPDOWN_B[item.dropdownB];

    if (!taskConfig) return;

    if (taskConfig.divider === 15) {
      polesQC += Number(item.poles) || 0;
    } else if (taskConfig.divider === 30) {
      polesCSQ += Number(item.poles) || 0;
    }
  });

  const percentQC = (polesQC / 32) * 100;
  const percentCSQ = (polesCSQ / 16) * 100;
  const totalPercent = percentQC + percentCSQ;

  return {
    totalMinutes,
    totalPoles,
    polesQC,
    polesCSQ,
    progress: Number(totalPercent.toFixed(2)),
    logCount: sourceLogs.length
  };
}

function saveHistory() {
  localStorage.setItem('daily_history', JSON.stringify(dailyHistory));
}

function formatHistoryDate(dateKey) {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

function getHistoryPeriodSummary(days) {
  const now = new Date();

  let filtered = [];

  if (days === 'week') {
    const start = new Date(now);
    const day = start.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    start.setDate(start.getDate() + diffToMonday);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(end.getDate() + 7);

    filtered = dailyHistory.filter(item => {
      const d = new Date(`${item.dateKey}T00:00:00`);
      return d >= start && d < end;
    });
  } else {
    const year = now.getFullYear();
    const month = now.getMonth();

    filtered = dailyHistory.filter(item => {
      const [y, m] = item.dateKey.split('-').map(Number);
      return y === year && m === month + 1;
    });
  }

  const totalMinutes = filtered.reduce((sum, item) => sum + (Number(item.totalMinutes) || 0), 0);
  const totalPoles = filtered.reduce((sum, item) => sum + (Number(item.totalPoles) || 0), 0);
  const totalLogs = filtered.reduce((sum, item) => sum + (Number(item.logCount) || 0), 0);
  const avgProgress = filtered.length
    ? filtered.reduce((sum, item) => sum + (Number(item.progress) || 0), 0) / filtered.length
    : 0;

  return {
    days: filtered.length,
    totalMinutes,
    totalPoles,
    totalLogs,
    avgProgress: Number(avgProgress.toFixed(2))
  };
}

function renderHistory() {
  const container = document.getElementById('history-list');
  const weekSummary = getHistoryPeriodSummary('week');
  const monthSummary = getHistoryPeriodSummary('month');

  const weekEl = document.getElementById('history-week-summary');
  const monthEl = document.getElementById('history-month-summary');

  if (weekEl) {
    weekEl.innerHTML = `
      <strong>${weekSummary.days}</strong> Hari &nbsp;|&nbsp;
      <strong>${weekSummary.totalMinutes}</strong> Menit &nbsp;|&nbsp;
      <strong>${weekSummary.totalPoles}</strong> Pole &nbsp;|&nbsp;
      Rata-rata <strong>${weekSummary.avgProgress}%</strong>
    `;
  }

  if (monthEl) {
    monthEl.innerHTML = `
      <strong>${monthSummary.days}</strong> Hari &nbsp;|&nbsp;
      <strong>${monthSummary.totalMinutes}</strong> Menit &nbsp;|&nbsp;
      <strong>${monthSummary.totalPoles}</strong> Pole &nbsp;|&nbsp;
      Rata-rata <strong>${monthSummary.avgProgress}%</strong>
    `;
  }

  if (!container) return;

  if (!dailyHistory.length) {
    container.innerHTML = `<div class="history-empty">Belum ada hari yang disimpan.</div>`;
    return;
  }

  const sorted = [...dailyHistory].sort((a, b) => b.dateKey.localeCompare(a.dateKey));

  container.innerHTML = sorted.map(item => `
    <div class="history-item">
      <div class="history-date">
        <strong>${formatHistoryDate(item.dateKey)}</strong>
        <span>${item.logCount} Log</span>
      </div>

      <div class="history-metric">
        <span>MENIT</span>
        <strong>${item.totalMinutes}</strong>
      </div>

      <div class="history-metric">
        <span>POLES</span>
        <strong>${item.totalPoles}</strong>
      </div>

      <div class="history-metric history-progress">
        <span>PROGRESS</span>
        <strong>${item.progress}%</strong>
      </div>

      <button class="history-delete-btn" onclick="deleteHistoryDay('${item.dateKey}')" title="Hapus hari ini">🗑</button>
    </div>
  `).join('');
}

function saveCurrentDay() {
  if (!logsData.length && !todayTaskContent.trim()) {
    alert('Belum ada data hari ini untuk disimpan.');
    return;
  }

  const dateKey = getLocalDateKey();
  const existingIndex = dailyHistory.findIndex(item => item.dateKey === dateKey);

  if (existingIndex !== -1) {
    const overwrite = confirm(
      'Hari ini sudah pernah disimpan. Timpa arsip hari ini dengan data terbaru?'
    );

    if (!overwrite) return;
  }

  const summary = getDailySummary(logsData);

  const snapshot = {
    dateKey,
    savedAt: new Date().toISOString(),
    logs: JSON.parse(JSON.stringify(logsData)),
    todayTask: todayTaskContent,
    ...summary
  };

  if (existingIndex === -1) {
    dailyHistory.push(snapshot);
  } else {
    dailyHistory[existingIndex] = snapshot;
  }

  saveHistory();

  // Mulai hari baru setelah data benar-benar tersimpan
  logsData = [];
  todayTaskContent = '';
  startTimeTracker = null;

  localStorage.removeItem('logs_data');
  localStorage.removeItem('today_task');

  if (editor) {
    editor.innerHTML = '';
  }

  const inputWaktu = document.getElementById('input-waktu');
  const inputJob = document.getElementById('input-job');
  const calcDurasi = document.getElementById('calc-durasi');
  const calcPoles = document.getElementById('calc-poles');

  if (inputWaktu) inputWaktu.value = '';
  if (inputJob) inputJob.value = '';
  if (calcDurasi) calcDurasi.value = '';
  if (calcPoles) calcPoles.value = '';

  renderLogs();
  calculateProgress();
  renderHistory();

  alert(`Hari ${formatHistoryDate(dateKey)} berhasil disimpan ke History.`);
}

// ============================================================
// HAPUS SATU HISTORY
// ============================================================

function deleteHistoryDay(dateKey) {
  const target = dailyHistory.find(item => item.dateKey === dateKey);
  if (!target) return;

  const confirmed = confirm(
    `Hapus history ${formatHistoryDate(dateKey)}?\n\nData hari ini tidak dapat dikembalikan setelah dihapus.`
  );

  if (!confirmed) return;

  dailyHistory = dailyHistory.filter(item => item.dateKey !== dateKey);
  saveHistory();
  renderHistory();
}


// ============================================================
// HAPUS SEMUA HISTORY
// ============================================================

function deleteAllHistory() {
  if (!dailyHistory.length) {
    alert('Belum ada history yang tersimpan.');
    return;
  }

  const confirmed = confirm(
    'HAPUS SEMUA HISTORY?\n\nSemua arsip hari yang tersimpan di PC ini akan dihapus dan tidak dapat dikembalikan.'
  );

  if (!confirmed) return;

  dailyHistory = [];
  saveHistory();
  renderHistory();
}


// ============================================================
// EXPORT HISTORY KE XLSX (valid Excel Open XML)
// Offline, tanpa internet dan tanpa library eksternal.
// ============================================================

function escapeXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function columnLetter(n) {
  let s = '';
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function makeInlineCell(ref, value, style = 0) {
  return `<c r="${ref}" t="inlineStr" s="${style}"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`;
}

function makeNumberCell(ref, value, style = 0) {
  const num = Number(value);
  const safe = Number.isFinite(num) ? num : 0;
  return `<c r="${ref}" s="${style}"><v>${safe}</v></c>`;
}

function makeRow(rowNumber, cells) {
  return `<row r="${rowNumber}">${cells.join('')}</row>`;
}

function makeSheetXml(rows, widths = []) {
  const cols = widths.length
    ? `<cols>${widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>`
    : '';

  const lastCol = columnLetter(Math.max(1, widths.length));
  const lastRow = Math.max(1, rows.length);

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  ${cols}
  <sheetData>
    ${rows.join('')}
  </sheetData>
  <pageMargins left="0.3" right="0.3" top="0.5" bottom="0.5" header="0.2" footer="0.2"/>
</worksheet>`;
}

function crc32(bytes) {
  let crc = 0xFFFFFFFF;

  for (let i = 0; i < bytes.length; i++) {
    crc ^= bytes[i];

    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (0xEDB88320 & -(crc & 1));
    }
  }

  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function writeU16(view, offset, value) {
  view.setUint16(offset, value, true);
}

function writeU32(view, offset, value) {
  view.setUint32(offset, value >>> 0, true);
}

function dosDateTime(date) {
  const year = Math.max(1980, date.getFullYear());
  const dosDate = ((year - 1980) << 9)
    | ((date.getMonth() + 1) << 5)
    | date.getDate();

  const dosTime = (date.getHours() << 11)
    | (date.getMinutes() << 5)
    | Math.floor(date.getSeconds() / 2);

  return { dosDate, dosTime };
}

function createStoredZip(files) {
  const encoder = new TextEncoder();
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  const now = dosDateTime(new Date());

  files.forEach(file => {
    const nameBytes = encoder.encode(file.name);
    const dataBytes = encoder.encode(file.content);
    const crc = crc32(dataBytes);

    const local = new Uint8Array(30 + nameBytes.length + dataBytes.length);
    const lv = new DataView(local.buffer);

    writeU32(lv, 0, 0x04034b50);
    writeU16(lv, 4, 20);
    writeU16(lv, 6, 0);
    writeU16(lv, 8, 0); // store, no compression
    writeU16(lv, 10, now.dosTime);
    writeU16(lv, 12, now.dosDate);
    writeU32(lv, 14, crc);
    writeU32(lv, 18, dataBytes.length);
    writeU32(lv, 22, dataBytes.length);
    writeU16(lv, 26, nameBytes.length);
    writeU16(lv, 28, 0);
    local.set(nameBytes, 30);
    local.set(dataBytes, 30 + nameBytes.length);

    localParts.push(local);

    const central = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(central.buffer);

    writeU32(cv, 0, 0x02014b50);
    writeU16(cv, 4, 20);
    writeU16(cv, 6, 20);
    writeU16(cv, 8, 0);
    writeU16(cv, 10, 0);
    writeU16(cv, 12, now.dosTime);
    writeU16(cv, 14, now.dosDate);
    writeU32(cv, 16, crc);
    writeU32(cv, 20, dataBytes.length);
    writeU32(cv, 24, dataBytes.length);
    writeU16(cv, 28, nameBytes.length);
    writeU16(cv, 30, 0);
    writeU16(cv, 32, 0);
    writeU16(cv, 34, 0);
    writeU16(cv, 36, 0);
    writeU32(cv, 38, 0);
    writeU32(cv, 42, offset);
    central.set(nameBytes, 46);

    centralParts.push(central);
    offset += local.length;
  });

  const centralOffset = offset;
  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);

  writeU32(ev, 0, 0x06054b50);
  writeU16(ev, 4, 0);
  writeU16(ev, 6, 0);
  writeU16(ev, 8, files.length);
  writeU16(ev, 10, files.length);
  writeU32(ev, 12, centralSize);
  writeU32(ev, 16, centralOffset);
  writeU16(ev, 20, 0);

  return new Blob([...localParts, ...centralParts, end], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
}

function buildXlsxFiles() {
  const sortedHistory = [...dailyHistory]
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey));

  // Sheet 1: Daily Summary
  const dailyRows = [];
  dailyRows.push(makeRow(1, [
    makeInlineCell('A1', 'Tanggal', 1),
    makeInlineCell('B1', 'Jumlah Log', 1),
    makeInlineCell('C1', 'Total Menit', 1),
    makeInlineCell('D1', 'Total Pole', 1),
    makeInlineCell('E1', 'Progress', 1)
  ]));

  sortedHistory.forEach((item, index) => {
    const r = index + 2;
    dailyRows.push(makeRow(r, [
      makeInlineCell(`A${r}`, item.dateKey),
      makeNumberCell(`B${r}`, item.logCount),
      makeNumberCell(`C${r}`, item.totalMinutes),
      makeNumberCell(`D${r}`, item.totalPoles),
      makeNumberCell(`E${r}`, (Number(item.progress) || 0) / 100, 2)
    ]));
  });

  // Sheet 2: Detail Logs
  const detailRows = [];
  detailRows.push(makeRow(1, [
    makeInlineCell('A1', 'Tanggal', 1),
    makeInlineCell('B1', 'Waktu', 1),
    makeInlineCell('C1', 'Job ID', 1),
    makeInlineCell('D1', 'Client', 1),
    makeInlineCell('E1', 'Task', 1),
    makeInlineCell('F1', 'Menit', 1),
    makeInlineCell('G1', 'Pole', 1),
    makeInlineCell('H1', 'Task Type', 1)
  ]));

  let detailRow = 2;
  sortedHistory.forEach(item => {
    (item.logs || []).forEach(log => {
      detailRows.push(makeRow(detailRow, [
        makeInlineCell(`A${detailRow}`, item.dateKey),
        makeInlineCell(`B${detailRow}`, log.waktu),
        makeInlineCell(`C${detailRow}`, log.job),
        makeInlineCell(`D${detailRow}`, log.dropdownA),
        makeInlineCell(`E${detailRow}`, log.dropdownB),
        makeNumberCell(`F${detailRow}`, log.mins),
        makeNumberCell(`G${detailRow}`, log.poles),
        makeInlineCell(`H${detailRow}`, log.taskType)
      ]));
      detailRow++;
    });
  });

  // Sheet 3: Today Task
  const taskRows = [
    makeRow(1, [
      makeInlineCell('A1', 'Tanggal', 1),
      makeInlineCell('B1', 'Today Task', 1)
    ])
  ];

  sortedHistory.forEach((item, index) => {
    const plainTask = String(item.todayTask || '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const r = index + 2;

    if (plainTask) {
      taskRows.push(makeRow(r, [
        makeInlineCell(`A${r}`, item.dateKey),
        makeInlineCell(`B${r}`, plainTask)
      ]));
    }
  });

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/worksheets/sheet3.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`;

  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Daily Summary" sheetId="1" r:id="rId1"/>
    <sheet name="Detail Logs" sheetId="2" r:id="rId2"/>
    <sheet name="Today Task" sheetId="3" r:id="rId3"/>
  </sheets>
</workbook>`;

  const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet3.xml"/>
  <Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="0"/>
  <fonts count="2">
    <font><sz val="11"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><name val="Calibri"/></font>
  </fonts>
  <fills count="2">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="D9EAF7"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="3">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
    <xf numFmtId="0" fontId="1" fillId="1" borderId="0" applyFont="1" applyFill="1"/>
    <xf numFmtId="10" fontId="0" fillId="0" borderId="0" applyNumberFormat="1"/>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

  return [
    { name: '[Content_Types].xml', content: contentTypes },
    { name: '_rels/.rels', content: rootRels },
    { name: 'xl/workbook.xml', content: workbook },
    { name: 'xl/_rels/workbook.xml.rels', content: workbookRels },
    { name: 'xl/styles.xml', content: styles },
    { name: 'xl/worksheets/sheet1.xml', content: makeSheetXml(dailyRows, [16, 12, 14, 12, 12]) },
    { name: 'xl/worksheets/sheet2.xml', content: makeSheetXml(detailRows, [16, 20, 18, 18, 34, 10, 10, 14]) },
    { name: 'xl/worksheets/sheet3.xml', content: makeSheetXml(taskRows, [16, 70]) }
  ];
}

function exportHistoryToExcel() {
  if (!dailyHistory.length) {
    alert('Belum ada history yang tersimpan untuk diekspor.');
    return;
  }

  try {
    const blob = createStoredZip(buildXlsxFiles());
    const url = URL.createObjectURL(blob);
    const now = new Date();
    const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const link = document.createElement('a');

    link.href = url;
    link.download = `DailyTracker_History_${stamp}.xlsx`;
    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (error) {
    console.error('Gagal membuat Excel:', error);
    alert('Gagal membuat file Excel. Silakan coba lagi.');
  }
}


// Inisialisasi history saat halaman dibuka
renderHistory();


// ============================================================
// HISTORY BUTTONS
// ============================================================

const saveDayButton = document.getElementById('btn-save-day');
const deleteAllHistoryButton = document.getElementById('btn-delete-all-history');
const exportExcelButton = document.getElementById('btn-export-excel');

if (saveDayButton) {
  saveDayButton.addEventListener('click', saveCurrentDay);
}

if (deleteAllHistoryButton) {
  deleteAllHistoryButton.addEventListener('click', deleteAllHistory);
}

if (exportExcelButton) {
  exportExcelButton.addEventListener('click', exportHistoryToExcel);
}


// ============================================================
// SAVE DAY BUTTON
// ============================================================

// ============================================================
// CLOCK START / STOP
// MENGAMBIL JAM DARI CLOCK PC
// ============================================================

const clockButton =
  document.getElementById('btn-clock');

if (clockButton) {

  clockButton.addEventListener('click', () => {

    const now = new Date();

    const timeStr =
      `${String(now.getHours()).padStart(2, '0')}.` +
      `${String(now.getMinutes()).padStart(2, '0')}`;


    if (!startTimeTracker) {

      startTimeTracker = timeStr;

      alert(
        `Waktu mulai dicatat: ${startTimeTracker}`
      );

    } else {

      const inputWaktu =
        document.getElementById('input-waktu');

      if (inputWaktu) {

        inputWaktu.value =
          `${startTimeTracker} - ${timeStr}`;

        inputWaktu.dispatchEvent(
          new Event('input')
        );
      }

      startTimeTracker = null;
    }
  });
}


// ============================================================
// JAM DESKTOP / REAL-TIME CLOCK
// MENGAMBIL WAKTU DARI PC
// ============================================================

function updateDesktopClock() {

  const clock = document.getElementById('desktop-clock');
  const date = document.getElementById('desktop-date');

  if (!clock || !date) {
    return;
  }

  const now = new Date();

  // =========================
  // JAM
  // =========================

  const hours =
    String(now.getHours()).padStart(2, '0');

  const minutes =
    String(now.getMinutes()).padStart(2, '0');

  const seconds =
    String(now.getSeconds()).padStart(2, '0');

  clock.textContent =
    `${hours}:${minutes}:${seconds}`;


  // =========================
  // TANGGAL
  // =========================

  date.textContent =
    now.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
}


// Jalankan pertama kali
// lalu update setiap 1 detik

updateDesktopClock();

setInterval(
  updateDesktopClock,
  1000
);

// ============================================================
// V5 AMBIENT BACKGROUND INTERACTION
// Mouse / pointer parallax + gentle idle movement.
// No external library required.
// ============================================================

(function initAmbientBackground() {
  const root = document.documentElement;

  // Respect reduced-motion preference and avoid running on touch-only devices.
  const reduceMotion =
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const hasFinePointer =
    window.matchMedia &&
    window.matchMedia('(pointer: fine)').matches;

  if (!root || reduceMotion || !hasFinePointer) {
    return;
  }

  let targetX = 0;
  let targetY = 0;
  let currentX = 0;
  let currentY = 0;
  let rafId = null;

  function render() {
    currentX += (targetX - currentX) * 0.055;
    currentY += (targetY - currentY) * 0.055;

    root.style.setProperty('--ambient-mx', currentX.toFixed(2));
    root.style.setProperty('--ambient-my', currentY.toFixed(2));

    if (
      Math.abs(targetX - currentX) > 0.02 ||
      Math.abs(targetY - currentY) > 0.02
    ) {
      rafId = requestAnimationFrame(render);
    } else {
      rafId = null;
    }
  }

  function wake() {
    if (rafId === null) {
      rafId = requestAnimationFrame(render);
    }
  }

  window.addEventListener('pointermove', (event) => {
    const x = (event.clientX / window.innerWidth) - 0.5;
    const y = (event.clientY / window.innerHeight) - 0.5;

    targetX = Math.max(-18, Math.min(18, x * 36));
    targetY = Math.max(-18, Math.min(18, y * 36));

    wake();
  }, { passive: true });

  window.addEventListener('pointerleave', () => {
    targetX = 0;
    targetY = 0;
    wake();
  }, { passive: true });

  // Slight settling on resize.
  window.addEventListener('resize', () => {
    targetX *= 0.5;
    targetY *= 0.5;
    wake();
  }, { passive: true });
})();
