// Konstanta bersama: definisi field, batas fisik, dan ambang audit.
// HARUS sama dengan firmware monitor_slide v1.4 dan notebook
// analisis/Audit_Data_Uji_Coba_Proyek9.ipynb, agar hasil dApp = hasil Colab.

export const TS_DETIK = 60;                       // firmware: satu catatan tiap 60 detik
export const ZONA_DETIK = 7 * 3600;               // WIB (UTC+7, tanpa musim panas)

// field ThingSpeak -> nama kolom (urutan = field1..field8)
export const KOLOM = ['suhu', 'tekanan', 'rh', 'lux', 'tanah_persen', 'tanah_mv', 'suhu_dht', 'vpd'];

export const INFO_KOLOM = {
  suhu:         { label: 'Suhu udara',          satuan: '°C',  sensor: 'BMP280',  desimal: 1 },
  tekanan:      { label: 'Tekanan udara',       satuan: 'hPa', sensor: 'BMP280',  desimal: 1 },
  rh:           { label: 'Kelembapan udara',    satuan: '%',   sensor: 'DHT22',   desimal: 1 },
  lux:          { label: 'Cahaya',              satuan: 'lux', sensor: 'BH1750',  desimal: 0 },
  tanah_persen: { label: 'Kelembapan tanah',    satuan: '%',   sensor: 'Kapasitif', desimal: 0 },
  tanah_mv:     { label: 'Tegangan sensor tanah', satuan: 'mV', sensor: 'Kapasitif', desimal: 0 },
  suhu_dht:     { label: 'Suhu DHT22',          satuan: '°C',  sensor: 'DHT22',   desimal: 1 },
  vpd:          { label: 'VPD udara',           satuan: 'kPa', sensor: 'dihitung', desimal: 2 },
};

// Batas fisik sensor (sama dengan firmware)
export const BATAS = {
  suhu: [-40, 85], tekanan: [300, 1100], rh: [0, 100], lux: [0, 54613],
  tanah_persen: [0, 100], tanah_mv: [40, 3300], suhu_dht: [-40, 80], vpd: [0, 10],
};

// Ambang lulus (sama dengan Langkah 1 notebook audit)
export const AMBANG = {
  kelengkapan_persen: 98.0,
  sensor_sah_persen: 99.0,
  celah_kali_jeda: 2.5,
  macet_menit: { suhu: 60, tekanan: 60, rh: 120, lux: 120, tanah_mv: 180, suhu_dht: 120, vpd: 120 },
  lux_rendah_wajar: 10.0,
  suhu_puncak_jam: [10, 16],
  lux_malam_maks: 5.0,
  korelasi_suhu_rh_maks: -0.5,
  selisih_suhu_wajar: 2.0,
  selisih_suhu_std_maks: 1.0,
  penurunan_siram_mv: 80,
  tanah_mv_udara: 2300,
  tanah_mv_min_wajar: 300,
  vpd_toleransi_kpa: 0.02,
};

// Sensor -> kolom yang harus sah bersamaan (VPD bukan sensor: hasil hitung DHT22)
export const SENSOR = {
  BMP280: ['suhu', 'tekanan'],
  DHT22: ['rh', 'suhu_dht'],
  BH1750: ['lux'],
  Soil: ['tanah_mv'],
};

// Kalibrasi tanah di firmware masih perkiraan -> persen tanah belum sah untuk analisis
export const TANAH_TERKALIBRASI = false;
