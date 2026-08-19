// CONFIGURATION FILE - Edit nilai di sini secara bebas

const CONFIG = {
  // Target Default Harian
  DEFAULT_WORK_MINUTES: 480, // 8 jam
  DEFAULT_TARGET_POLES: 32,  // Target 100%

  // Dropdown Menu A
  DROPDOWN_A: [
    "---Select Client---",
    "AT&T",
    "SPECTRUM",
    "SONIC",
    "WYYERD"
  ],

  // Dropdown Menu B beserta nilai pembagi (Target Menit per Pole) dan Tipe Target
  // 'murni'    = Warna Bar Putih (QC, CSQ)
  // 'sekunder' = Warna Bar Kuning (Sisa Tugas Lainnya)
  DROPDOWN_B: {
    "---Select Task QC---":                     { divider: 0, type: "separator" },
    "OCALC Update KMZ/DWG":                     { divider: 15, type: "sekunder" },
    "OCALC Revision":                           { divider: 15, type: "sekunder" },
    "Email Request Update":                     { divider: 15, type: "sekunder" },
    "Email Request Revision":                   { divider: 15, type: "sekunder" },
    "Overcapacity":                             { divider: 15, type: "sekunder" },
    "Overcapacity - Create RCMD":     { divider: 15, type: "sekunder" },

        "---Select Task Other---":              { divider: 0, type: "separator" },
    "Administration dan Finalize":    { divider: 15, type: "sekunder" },
    "Meeting dan Info rules baru":    { divider: 15, type: "sekunder" },
    "Create Attachment for Email":    { divider: 15, type: "sekunder" },
    "Custom Task":                    { divider: 15, type: "sekunder" },

        "---Select Task Analyze---":      { divider: 0, type: "separator" },
    "New Job Analysis Process":           { divider: 15, type: "sekunder" },  
    "Extra Difficulty (A2U/RELOC/BAU)":   { divider: 15, type: "sekunder" },
    "Doublecheck and track request":      { divider: 15, type: "sekunder" },

    "---Select Task Pure Poles---":   { divider: 0, type: "separator" },
    "QC":                             { divider: 15, type: "murni" },
    "CSQ":                            { divider: 30, type: "murni" }
  }
};