// INI ADALAH LOGIKA UTAMA APLIKASI

let logsData = JSON.parse(localStorage.getItem('logs_data')) || [];
let todayTaskContent = localStorage.getItem('today_task') || '';
let startTimeTracker = null;

// Initialization
document.addEventListener('DOMContentLoaded', () => {
  initDropdowns();
  loadSavedData();
  setupEventListeners();
  renderLogs();
  calculateProgress();
});

// Populate Dropdown dari config.js
function initDropdowns() {
  const selectA = document.getElementById('select-dropdown-a');
  const selectB = document.getElementById('select-dropdown-b');

  selectA.innerHTML = CONFIG.DROPDOWN_A.map(item => `<option value="${item}">${item}</option>`).join('');
  
  selectB.innerHTML = Object.keys(CONFIG.DROPDOWN_B).map(key => {
    const type = CONFIG.DROPDOWN_B[key].type;
    const label = type === 'murni' ? `[Murni] ${key}` : key;
    return `<option value="${key}">${label}</option>`;
  }).join('');
}

// Format Command Toolbar Today Task
function execCmd(command) {
  document.execCommand(command, false, null);
  saveTodayTask();
}

// Auto-Calculate Durasi & Poles dari Input Waktu
document.getElementById('input-waktu').addEventListener('input', function(e) {
  const val = e.target.value.trim();
  // Format diharapkan: 08.00 - 09.30 atau 08:00 - 09:30
  const times = val.split('-').map(t => t.trim());

  if (times.length === 2) {
    const mins = calculateMinutesBetween(times[0], times[1]);
    if (!isNaN(mins) && mins > 0) {
      document.getElementById('calc-durasi').value = `${mins} Menit`;
      
      const selectedB = document.getElementById('select-dropdown-b').value;
      const divider = CONFIG.DROPDOWN_B[selectedB]?.divider || 15;
      const poles = mins / divider;
      
      document.getElementById('calc-poles').value = poles;
    }
  }
});

// Helper Menghitung Selisih Menit
function calculateMinutesBetween(startStr, endStr) {
  const parseTime = (str) => {
    const parts = str.replace('.', ':').split(':');
    return parseInt(parts[0]) * 60 + parseInt(parts[1]);
  };
  try {
    return parseTime(endStr) - parseTime(startStr);
  } catch (err) {
    return 0;
  }
}

// Tambah Log Baru
document.getElementById('btn-add-log').addEventListener('click', () => {
  const waktu = document.getElementById('input-waktu').value;
  const job = document.getElementById('input-job').value;
  const dropdownA = document.getElementById('select-dropdown-a').value;
  const dropdownB = document.getElementById('select-dropdown-b').value;
  const durasiText = document.getElementById('calc-durasi').value;
  const poles = parseFloat(document.getElementById('calc-poles').value);

  if (!waktu || !job || isNaN(poles)) {
    alert("Lengkapi semua field input waktu dan Job ID dengan benar!");
    return;
  }

  const mins = parseInt(durasiText);
  const taskType = CONFIG.DROPDOWN_B[dropdownB].type; // 'murni' atau 'sekunder'

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
  
  // Reset Form
  document.getElementById('input-waktu').value = '';
  document.getElementById('input-job').value = '';
  document.getElementById('calc-durasi').value = '';
  document.getElementById('calc-poles').value = '';
});

// Render Log List
function renderLogs() {
  const container = document.getElementById('notes-list');
  container.innerHTML = logsData.map(log => `
    <div class="note-item">
      <span><strong>${log.waktu}</strong> | ${log.job} | ${log.dropdownA} ${log.dropdownB} (${log.mins} Menit) <strong>${log.poles}</strong></span>
      <button onclick="deleteLog(${log.id})" style="color:red; border:none; background:none; cursor:pointer;">❌</button>
    </div>
  `).join('');
}

// Hapus Log
function deleteLog(id) {
  logsData = logsData.filter(item => item.id !== id);
  saveAndRender();
}

// Hitung Progress Bar (Target Murni vs Sekunder)
function calculateProgress() {
  let totalPolesMurni = 0;
  let totalPolesSekunder = 0;
  let totalMinutes = 0;

  logsData.forEach(item => {
    totalMinutes += item.mins;
    if (item.taskType === 'murni') {
      totalPolesMurni += item.poles;
    } else {
      totalPolesSekunder += item.poles;
    }
  });

  const totalPoles = totalPolesMurni + totalPolesSekunder;
  const targetBase = CONFIG.DEFAULT_TARGET_POLES; // 32 poles

  const percentSekunder = ((totalPolesSekunder / targetBase) * 100).toFixed(2);
  const percentMurni = ((totalPolesMurni / targetBase) * 100).toFixed(2);
  const totalPercent = ((totalPoles / targetBase) * 100).toFixed(2);

  // Update UI Labels
  document.getElementById('total-minutes-label').innerText = totalMinutes;
  document.getElementById('total-poles-label').innerText = totalPoles;
  document.getElementById('total-percent-label').innerText = `${totalPercent}%`;

  // Update Progress Bars Width & Text
  const barSekunder = document.getElementById('bar-sekunder');
  const barMurni = document.getElementById('bar-murni');

  barSekunder.style.width = `${percentSekunder}%`;
  document.getElementById('label-sekunder').innerText = percentSekunder > 0 ? `${percentSekunder}%` : '';

  barMurni.style.width = `${percentMurni}%`;
  document.getElementById('label-murni').innerText = percentMurni > 0 ? `${percentMurni}%` : '';
}

function saveAndRender() {
  localStorage.setItem('logs_data', JSON.stringify(logsData));
  renderLogs();
  calculateProgress();
}

// Autosave Today Task Editor
const editor = document.getElementById('today-task-editor');
editor.addEventListener('input', () => {
  localStorage.setItem('today_task', editor.innerHTML);
  detectJobIDs(editor.innerText);
});

function loadSavedData() {
  if (todayTaskContent) {
    editor.innerHTML = todayTaskContent;
  }
}

// Fitur Deteksi Otomatis Job ID dari Text Editor Today Task
function detectJobIDs(text) {
  // Mencari pola kode seperti A0566Y8, A056FWX (Pola: Huruf A diikuti 3 angka & 3 alfanumerik)
  const regex = /\bA\d{3}[A-Z0-9]{3}\b/g;
  const matches = text.match(regex);
  if (matches && matches.length > 0) {
    // Otomatis isi field Job ID jika kosong
    const jobInput = document.getElementById('input-job');
    if (!jobInput.value) {
      jobInput.value = matches[matches.length - 1]; // Ambil yang paling terakhir ditemukan
    }
  }
}

// Quick Clock Button Logic
document.getElementById('btn-clock').addEventListener('click', () => {
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}.${String(now.getMinutes()).padStart(2, '0')}`;

  if (!startTimeTracker) {
    startTimeTracker = timeStr;
    alert(`Waktu mulai dicatat: ${startTimeTracker}`);
  } else {
    document.getElementById('input-waktu').value = `${startTimeTracker} - ${timeStr}`;
    // Trigger event kalkulasi
    document.getElementById('input-waktu').dispatchEvent(new Event('input'));
    startTimeTracker = null;
  }
});