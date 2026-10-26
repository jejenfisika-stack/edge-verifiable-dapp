// Audit mutu data uji coba — port JavaScript dari notebook Colab
// analisis/Audit_Data_Uji_Coba_Proyek9.ipynb (Langkah 3-10).
// Definisi setiap kriteria SENGAJA dibuat identik; kecocokan diuji oleh
// scripts/uji_audit.mjs terhadap hasil Colab pada data nyata.
//
// Masukan: array catatan { t: ms UTC, id: entry_id, v: {kolom: angka|null}, status: string|null }
import { TS_DETIK, ZONA_DETIK, AMBANG, BATAS, SENSOR } from './konstanta.mjs';

const ZONA_MS = ZONA_DETIK * 1000;
const tanggalWIB = t => new Date(t + ZONA_MS).toISOString().slice(0, 10);
const jamWIB = t => new Date(t + ZONA_MS).getUTCHours();
const ada = x => x !== null && x !== undefined && !Number.isNaN(x);
const sahKolom = (r, k) => ada(r.v[k]) && r.v[k] >= BATAS[k][0] && r.v[k] <= BATAS[k][1];

function rataRata(a) { return a.reduce((s, x) => s + x, 0) / a.length; }
function simpanganBaku(a) {                                   // ddof = 1, sama dengan pandas
  const m = rataRata(a);
  return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1));
}
function median(a) {
  const s = [...a].sort((x, y) => x - y), n = s.length;
  if (!n) return NaN;
  return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
}
function korelasiPearson(x, y) {
  const mx = rataRata(x), my = rataRata(y);
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < x.length; i++) {
    sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; syy += (y[i] - my) ** 2;
  }
  return sxy / Math.sqrt(sxx * syy);
}

// Saring rentang waktu (WIB, inklusif) lalu urutkan menurut waktu
export function saringRentang(data, mulaiMs = null, akhirMs = null) {
  return data.filter(r => (mulaiMs === null || r.t >= mulaiMs) && (akhirMs === null || r.t <= akhirMs))
             .sort((a, b) => a.t - b.t);
}

// ---------------- Kriteria 1: kelengkapan (berbasis slot) ----------------
function kriteria1(d) {
  const ts = TS_DETIK * 1000, t0 = d[0].t, t1 = d[d.length - 1].t;
  const slotTotal = Math.floor((t1 - t0) / ts) + 1;
  const terisiSet = new Set(d.map(r => Math.floor((r.t - t0) / ts)));
  const perHari = new Map();                                   // tanggal awal slot -> {seharusnya, terisi}
  for (let i = 0; i < slotTotal; i++) {
    const tgl = tanggalWIB(t0 + i * ts);
    const h = perHari.get(tgl) || { tanggal: tgl, seharusnya: 0, terisi: 0 };
    h.seharusnya++;
    if (terisiSet.has(i)) h.terisi++;
    perHari.set(tgl, h);
  }
  const hari = [...perHari.values()].map(h => ({ ...h, persen: 100 * h.terisi / h.seharusnya }));
  const batasCelah = AMBANG.celah_kali_jeda * TS_DETIK;
  const celah = [];
  for (let i = 1; i < d.length; i++) {
    const detik = (d[i].t - d[i - 1].t) / 1000;
    if (detik > batasCelah)
      celah.push({ dari: d[i - 1].t, sampai: d[i].t, durasiJam: detik / 3600, dataHilang: Math.round(detik / TS_DETIK) - 1 });
  }
  const hariPenuh = hari.filter(h => h.seharusnya >= 1300);
  return {
    slotTotal, slotTerisi: terisiSet.size, slotKosong: slotTotal - terisiSet.size,
    persen: 100 * terisiSet.size / slotTotal, jumlahData: d.length,
    perHari: hari, celah,
    hariPenuh: hariPenuh.length, hariPenuhLulus: hariPenuh.filter(h => h.persen >= AMBANG.kelengkapan_persen).length,
  };
}

// ---------------- Kriteria 2: pembacaan sensor sah ----------------
function kriteria2(d) {
  const sensor = Object.entries(SENSOR).map(([nama, kolom]) => {
    const sah = d.filter(r => kolom.every(k => sahKolom(r, k))).length;
    return { sensor: nama, kolom, sah, gagal: d.length - sah, persen: 100 * sah / d.length };
  });
  // rangkaian gagal DHT22
  const rangkaian = [];
  let mulai = -1;
  for (let i = 0; i <= d.length; i++) {
    const gagal = i < d.length && !(sahKolom(d[i], 'rh') && sahKolom(d[i], 'suhu_dht'));
    if (gagal && mulai < 0) mulai = i;
    if (!gagal && mulai >= 0) {
      const sesudah = d[i];                                       // data pertama setelah rangkaian (bisa undefined)
      rangkaian.push({
        dari: d[mulai].t, sampai: d[i - 1].t, jumlah: i - mulai,
        statusBerikutnya: sesudah ? sesudah.status : null,
        pulihSetelahRestart: !!(sesudah && sesudah.status && sesudah.status.includes('menyala')),
      });
      mulai = -1;
    }
  }
  return {
    sensor,
    dht: {
      jumlahRangkaian: rangkaian.length,
      terpanjang: rangkaian.reduce((m, r) => Math.max(m, r.jumlah), 0),
      tunggal: rangkaian.filter(r => r.jumlah === 1).length,
      panjang: rangkaian.filter(r => r.jumlah >= 5),
    },
  };
}

// ---------------- Kriteria 3: nilai macet ----------------
function kriteria3(d) {
  const batasCelahMs = AMBANG.celah_kali_jeda * TS_DETIK * 1000;
  const temuan = [], terpanjang = {};
  for (const [kolom, ambang] of Object.entries(AMBANG.macet_menit)) {
    let s = d.filter(r => ada(r.v[kolom]));
    if (kolom === 'lux') s = s.filter(r => r.v.lux > AMBANG.lux_rendah_wajar);   // malam wajar konstan
    terpanjang[kolom] = { menit: 0, nilai: null };
    if (!s.length) continue;
    let awal = 0;
    for (let i = 1; i <= s.length; i++) {
      // rangkaian putus bila nilai berubah ATAU ada jeda > batas celah
      const putus = i === s.length || s[i].v[kolom] !== s[i - 1].v[kolom] || s[i].t - s[i - 1].t > batasCelahMs;
      if (!putus) continue;
      const menit = (s[i - 1].t - s[awal].t) / 60000;
      if (menit > terpanjang[kolom].menit) terpanjang[kolom] = { menit, nilai: s[awal].v[kolom] };
      if (menit >= ambang) temuan.push({ kolom, nilai: s[awal].v[kolom], dari: s[awal].t, sampai: s[i - 1].t, menit: Math.round(menit), ambangMenit: ambang });
      awal = i;
    }
  }
  return { temuan, terpanjang };
}

// ---------------- Kriteria 4: pola harian ----------------
function kriteria4(d) {
  const perJam = Array.from({ length: 24 }, (_, jam) => ({ jam, suhu: [], rh: [], lux: [], vpd: [] }));
  for (const r of d) {
    const p = perJam[jamWIB(r.t)];
    for (const k of ['suhu', 'rh', 'lux', 'vpd']) if (ada(r.v[k])) p[k].push(r.v[k]);
  }
  const rataJam = perJam.map(p => ({
    jam: p.jam,
    suhu: p.suhu.length ? rataRata(p.suhu) : null, rh: p.rh.length ? rataRata(p.rh) : null,
    lux: p.lux.length ? rataRata(p.lux) : null, vpd: p.vpd.length ? rataRata(p.vpd) : null,
  }));
  let jamPuncak = null;                                           // idxmax: maksimum pertama
  for (const p of rataJam) if (p.suhu !== null && (jamPuncak === null || p.suhu > rataJam[jamPuncak].suhu)) jamPuncak = p.jam;
  const luxMalam = median(d.filter(r => { const h = jamWIB(r.t); return (h >= 22 || h <= 4) && ada(r.v.lux); }).map(r => r.v.lux));
  const pasangan = d.filter(r => ada(r.v.suhu) && ada(r.v.rh));
  const korelasi = korelasiPearson(pasangan.map(r => r.v.suhu), pasangan.map(r => r.v.rh));
  const luxMaks = Math.max(...d.filter(r => ada(r.v.lux)).map(r => r.v.lux));
  return { rataJam, jamPuncak, luxMalam, korelasi, luxMaks };
}

// ---------------- Kriteria 5: konsistensi dua sensor suhu ----------------
function kriteria5(d) {
  const selisih = d.filter(r => ada(r.v.suhu) && ada(r.v.suhu_dht)).map(r => r.v.suhu - r.v.suhu_dht);
  return {
    rata: rataRata(selisih), sb: simpanganBaku(selisih), n: selisih.length,
    persenLuar: 100 * selisih.filter(x => Math.abs(x) > AMBANG.selisih_suhu_wajar).length / selisih.length,
  };
}

// ---------------- Kriteria 6: respons sensor tanah ----------------
function kriteria6(d) {
  const mv = [];
  for (const r of d) if (ada(r.v.tanah_mv) && (!mv.length || mv[mv.length - 1].t !== r.t)) mv.push({ t: r.t, v: r.v.tanah_mv });
  const wajar = mv.filter(x => x.v >= AMBANG.tanah_mv_min_wajar);
  const dicelup = mv.length - wajar.length;
  const peristiwa = [];
  const jendela = 15 * 60000, toleransi = 3 * 60000;
  let j = 0;
  for (let i = 0; i < wajar.length; i++) {
    const target = wajar[i].t - jendela;
    // tetangga terdekat; seri -> yang lebih akhir (sama dengan pandas reindex method="nearest")
    while (j < wajar.length - 1 && Math.abs(wajar[j + 1].t - target) <= Math.abs(wajar[j].t - target)) j++;
    if (Math.abs(wajar[j].t - target) > toleransi) continue;
    const turun = wajar[i].v - wajar[j].v;
    if (turun > -AMBANG.penurunan_siram_mv) continue;
    if (peristiwa.length && wajar[i].t - peristiwa[peristiwa.length - 1].waktu <= 3600e3) continue;
    peristiwa.push({
      waktu: wajar[i].t, sebelumMv: wajar[j].v, penurunanMv: turun,
      jenis: wajar[j].v >= AMBANG.tanah_mv_udara ? 'pemasangan sensor' : 'penyiraman',
    });
  }
  return {
    peristiwa, penyiraman: peristiwa.filter(p => p.jenis === 'penyiraman').length,
    pemasangan: peristiwa.filter(p => p.jenis === 'pemasangan sensor').length,
    dicelup, minWajar: wajar.length ? Math.min(...wajar.map(x => x.v)) : null,
    maksWajar: wajar.length ? Math.max(...wajar.map(x => x.v)) : null,
  };
}

// ---------------- Pemeriksaan pendukung ----------------
function pendukung(d) {
  const jarak = [];
  for (let i = 1; i < d.length; i++) jarak.push((d[i].t - d[i - 1].t) / 1000);
  const urutId = [...d].sort((a, b) => a.id - b.id);
  let mundur = 0;
  for (let i = 1; i < urutId.length; i++) if (urutId[i].t < urutId[i - 1].t) mundur++;
  let kembar = 0;
  for (let i = 1; i < d.length; i++) if (d[i].t === d[i - 1].t) kembar++;

  let cocok = 0, total = 0, bedaMaks = 0;
  for (const r of d) {
    const T = r.v.suhu_dht, RH = r.v.rh;
    if (!ada(T) || !ada(RH) || !ada(r.v.vpd)) continue;
    const es = 0.6108 * Math.exp(17.27 * T / (T + 237.3));
    const beda = Math.abs(es * (1 - RH / 100) - r.v.vpd);
    total++; if (beda <= AMBANG.vpd_toleransi_kpa) cocok++;
    bedaMaks = Math.max(bedaMaks, beda);
  }

  const kejadian = d.filter(r => r.status).map(r => ({ t: r.t, status: r.status }));
  const restart = kejadian.filter(k => k.status.includes('menyala'));
  const alasan = {};
  for (const k of restart) { const m = k.status.match(/\(([^)]+)\)/); if (m) alasan[m[1]] = (alasan[m[1]] || 0) + 1; }
  const ke = restart.map(k => k.status.match(/restart ke-(\d+)/)).filter(Boolean).map(m => Number(m[1]));
  let takTercatat = 0;
  for (let i = 1; i < ke.length; i++) takTercatat += Math.max(0, ke[i] - ke[i - 1] - 1);
  const bermasalah = restart.filter(k => /tegangan turun|program macet|program hang/.test(k.status)).length;
  return {
    jarakMedian: median(jarak), persen55_65: 100 * jarak.filter(x => x >= 55 && x <= 65).length / jarak.length,
    jarakPendek: jarak.filter(x => x < 55).length, jarakPanjang: jarak.filter(x => x > 65).length,
    mundur, kembar,
    vpd: { persenCocok: 100 * cocok / total, bedaMaks, n: total },
    kejadian, restart: restart.length, alasan, restartTakTercatat: ke.length >= 2 ? takTercatat : null,
    gagalBaca: kejadian.filter(k => k.status.includes('gagal baca')).length,
    pulih: kejadian.filter(k => k.status.includes('pulih')).length,
    restartBermasalah: bermasalah,
  };
}

// ---------------- Audit lengkap + ringkasan LULUS / PERLU PERBAIKAN ----------------
export function audit(dataTerurut) {
  const d = dataTerurut;
  if (!d.length) return null;
  const k1 = kriteria1(d), k2 = kriteria2(d), k3 = kriteria3(d), k4 = kriteria4(d), k5 = kriteria5(d), k6 = kriteria6(d), plus = pendukung(d);
  const f2 = x => x.toFixed(2);
  const ringkas = [];
  const catat = (no, kriteria, nilai, ambang, lulus, ket = '') => ringkas.push({ no, kriteria, nilai, ambang, lulus, ket });

  catat(1, 'Kelengkapan data', `${f2(k1.persen)} %`, `≥ ${AMBANG.kelengkapan_persen} %`, k1.persen >= AMBANG.kelengkapan_persen,
        `${k1.celah.length} celah, ${k1.slotKosong} slot kosong; ${k1.hariPenuhLulus}/${k1.hariPenuh} hari penuh lulus`);
  for (const s of k2.sensor)
    catat(2, `Sensor sah: ${s.sensor}`, `${f2(s.persen)} %`, `≥ ${AMBANG.sensor_sah_persen} %`, s.persen >= AMBANG.sensor_sah_persen, `${s.gagal} pembacaan gagal`);
  for (const [kolom, menit] of Object.entries(AMBANG.macet_menit)) {
    const n = k3.temuan.filter(t => t.kolom === kolom).length;
    catat(3, `Tidak macet: ${kolom}`, `${n} kejadian`, `0 kejadian ≥ ${menit} menit`, n === 0);
  }
  const [lo, hi] = AMBANG.suhu_puncak_jam;
  catat(4, 'Pola: suhu puncak siang', `${k4.jamPuncak}:00`, `${lo}:00–${hi}:00`, k4.jamPuncak >= lo && k4.jamPuncak <= hi);
  catat(4, 'Pola: cahaya malam ≈ 0', `${k4.luxMalam.toFixed(1)} lux`, `≤ ${AMBANG.lux_malam_maks} lux`, k4.luxMalam <= AMBANG.lux_malam_maks);
  catat(4, 'Pola: RH berlawanan suhu', `r = ${f2(k4.korelasi)}`, `≤ ${AMBANG.korelasi_suhu_rh_maks}`, k4.korelasi <= AMBANG.korelasi_suhu_rh_maks);
  catat(5, 'Konsistensi suhu: simpangan baku', `${f2(k5.sb)} °C`, `≤ ${AMBANG.selisih_suhu_std_maks} °C`, k5.sb <= AMBANG.selisih_suhu_std_maks,
        `selisih rata-rata ${k5.rata >= 0 ? '+' : ''}${f2(k5.rata)} °C (offset tetap dapat dikoreksi)`);
  catat(6, 'Respons sensor tanah', `${k6.penyiraman} penyiraman terdeteksi`, '≥ 1 respons', k6.penyiraman >= 1,
        k6.penyiraman === 0 ? 'tidak ada penurunan tajam: cek apakah tanaman disiram selama uji' : '');
  catat('+', 'Cap waktu urut & tidak kembar', `mundur ${plus.mundur}, kembar ${plus.kembar}`, '0 dan 0', plus.mundur === 0 && plus.kembar === 0);
  catat('+', 'VPD firmware = hitung ulang', `${f2(plus.vpd.persenCocok)} % cocok`, `≥ 99 % (toleransi ${AMBANG.vpd_toleransi_kpa} kPa)`, plus.vpd.persenCocok >= 99,
        'beda kecil wajar: pembulatan nilai yang dikirim ke field');
  catat('+', 'Restart karena masalah daya/program', `${plus.restartBermasalah}`, '0', plus.restartBermasalah === 0,
        `${plus.restart} restart total`);

  const utama = ringkas.filter(r => r.no !== '+');
  return {
    rentang: { dari: d[0].t, sampai: d[d.length - 1].t, jumlah: d.length },
    k1, k2, k3, k4, k5, k6, pendukung: plus, ringkas,
    lulusUtama: utama.filter(r => r.lulus).length, totalUtama: utama.length,
  };
}
