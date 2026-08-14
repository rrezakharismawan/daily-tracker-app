// ============================================================
// DAILY WORKLOG & PROGRESS TRACKER
// LOGIKA UTAMA APLIKASI
// ============================================================

let logsData = JSON.parse(localStorage.getItem('logs_data')) || [];
let todayTaskContent = localStorage.getItem('today_task') || '';
let startTimeTracker = null;


// ============================================================
// INITIALIZATION
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  initDropdowns();
  loadSavedData();
  renderLogs();
  calculateProgress();

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

  let html = '';
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

    const hour = parseInt(parts[0]);
    const minute = parseInt(parts[1]);

    if (isNaN(hour) || isNaN(minute)) {
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

    let difference = end - start;

    // Jika melewati tengah malam
    if (difference < 0) {
      difference += 24 * 60;
    }

    return difference;

  } catch (err) {
    console.error('Error menghitung waktu:', err);
    return 0;
  }
}


// ============================================================
// INPUT WAKTU
// AUTO CALCULATE DURASI & POLES
// ============================================================

const inputWaktu = document.getElementById('input-waktu');

if (inputWaktu) {

  inputWaktu.addEventListener('input', function(e) {

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

      if (selectB && CONFIG.DROPDOWN_B[selectB.value]) {

        const selectedB = selectB.value;

        const divider =
          CONFIG.DROPDOWN_B[selectedB]?.divider || 15;

        const poles = mins / divider;

        if (polesField) {
          polesField.value = poles;
        }
      }
    }
  });
}


// ============================================================
// TAMBAH LOG
// ============================================================

const btnAddLog =
  document.getElementById('btn-add-log');

if (btnAddLog) {

  btnAddLog.addEventListener('click', () => {

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
  });
}


// ============================================================
// RENDER LOG
// ============================================================

function renderLogs() {

  const container =
    document.getElementById('notes-list');

  if (!container) {
    return;
  }

  container.innerHTML = logsData.map(log => `

    <div class="note-item">

      <span>

        <strong>${log.waktu}</strong>
        |
        ${log.job}
        |
        ${log.dropdownA}
        ${log.dropdownB}

        (${log.mins} Menit)

        <strong>${log.poles}</strong>

      </span>

      <button
        onclick="deleteLog(${log.id})"
        style="
          color:red;
          border:none;
          background:none;
          cursor:pointer;
        "
      >
        ❌
      </button>

    </div>

  `).join('');
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