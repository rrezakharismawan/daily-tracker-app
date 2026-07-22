// CONFIGURATION FILE - Edit nilai di sini secara bebas

const CONFIG = {
  // Target Default Harian
  DEFAULT_WORK_MINUTES: 480, // 8 jam
  DEFAULT_TARGET_POLES: 32,  // Target 100%

  // Dropdown Menu A
  DROPDOWN_A: [
    "AT&T",
    "SPECTRUM",
    "WYYERD"
  ],

  // Dropdown Menu B beserta nilai pembagi (Target Menit per Pole) dan Tipe Target
  // 'murni'    = Warna Bar Putih (QC, CSQ)
  // 'sekunder' = Warna Bar Kuning (Sisa Tugas Lainnya)
  DROPDOWN_B: {
    "Overcapacity":                   { divider: 15, type: "sekunder" },
    "Overcapacity - Recommendation":  { divider: 15, type: "sekunder" },
    "Update":                         { divider: 15, type: "sekunder" },
    "Revision":                       { divider: 15, type: "sekunder" },
    "PPT":                            { divider: 15, type: "sekunder" },
    "Administration dan Finalize":    { divider: 15, type: "sekunder" },
    "Email Request Update":           { divider: 15, type: "sekunder" },
    "Email Request Revision":         { divider: 15, type: "sekunder" },
    "QC":                             { divider: 15, type: "murni" },
    "CSQ":                            { divider: 15, type: "murni" },
    "Doublecheck and track request":  { divider: 15, type: "sekunder" }
  }
};