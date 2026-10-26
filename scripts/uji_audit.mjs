// Uji kecocokan lib/audit.mjs dengan hasil notebook Colab pada data NYATA.
// Pemakaian: node scripts/uji_audit.mjs <folder berisi ts_sampel.json & ts_sampel2.json>
// (dua berkas = unduhan feeds.json channel 3516633, 2-20 Okt 2026, 15.746 entri)
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { normalisasi } from '../lib/thingspeak.mjs';
import { audit, saringRentang } from '../lib/audit.mjs';

const folder = process.argv[2];
if (!folder) { console.error('Pemakaian: node scripts/uji_audit.mjs <folder>'); process.exit(2); }
const feeds = ['ts_sampel2.json', 'ts_sampel.json'].flatMap(f => JSON.parse(readFileSync(join(folder, f), 'utf8')).feeds);
const data = saringRentang(normalisasi(feeds));
const wib = s => Date.parse(s.replace(' ', 'T') + '+07:00');

let gagal = 0;
function sama(nama, hasil, harapan) {
  const ok = typeof harapan === 'number' && !Number.isInteger(harapan)
    ? Math.abs(hasil - harapan) < 5e-4 : hasil === harapan;
  if (!ok) gagal++;
  console.log(`${ok ? 'OK   ' : 'BEDA '} ${nama.padEnd(34)} hasil ${String(hasil).padEnd(22)} harapan ${harapan}`);
}

// --- A. Seluruh data: harapan = ringkasan_audit.csv & data_uji_bersih.csv dari Colab (24 Okt 2026)
let a = audit(data);
console.log('== A. Seluruh data (pembanding: hasil Colab)');
sama('jumlah data', a.rentang.jumlah, 15746);
sama('K1 persen (2 desimal)', a.k1.persen.toFixed(2), '62.09');
sama('K1 slot kosong', a.k1.slotKosong, 9615);
sama('K1 celah', a.k1.celah.length, 2);
sama('K1 hari penuh lulus', `${a.k1.hariPenuhLulus}/${a.k1.hariPenuh}`, '10/17');
const s = Object.fromEntries(a.k2.sensor.map(x => [x.sensor, x]));
sama('K2 BMP280 %', s.BMP280.persen.toFixed(2), '100.00');
sama('K2 DHT22 %', s.DHT22.persen.toFixed(2), '98.22');
sama('K2 DHT22 gagal', s.DHT22.gagal, 281);
sama('K2 BH1750 %', s.BH1750.persen.toFixed(2), '100.00');
sama('K2 Soil %', s.Soil.persen.toFixed(2), '100.00');
sama('K2 DHT rangkaian terpanjang', a.k2.dht.terpanjang, 159);
sama('K3 temuan macet', a.k3.temuan.length, 0);
sama('K4 jam puncak', a.k4.jamPuncak, 13);
sama('K4 lux malam', a.k4.luxMalam.toFixed(1), '0.0');
sama('K4 korelasi (2 desimal)', a.k4.korelasi.toFixed(2), '-0.67');
sama('K4 korelasi (3 desimal, kunci)', a.k4.korelasi.toFixed(3), '-0.672');
sama('K5 simpangan baku', a.k5.sb.toFixed(2), '0.26');
sama('K5 rata-rata', a.k5.rata.toFixed(2), '0.55');
sama('K6 penyiraman', a.k6.penyiraman, 2);
sama('K6 pemasangan', a.k6.pemasangan, 1);
sama('+ mundur / kembar', `${a.pendukung.mundur}/${a.pendukung.kembar}`, '0/0');
sama('+ VPD cocok %', a.pendukung.vpd.persenCocok.toFixed(2), '100.00');
sama('+ restart', a.pendukung.restart, 13);
sama('+ restart tak tercatat', a.pendukung.restartTakTercatat, 4);
sama('lulus utama', `${a.lulusUtama}/${a.totalUtama}`, '15/17');   // CSV Colab: 17 baris utama, 2 PERLU PERBAIKAN

// --- B. Periode stabil 3-12 Okt: harapan = kunci jawaban independen (kunci_audit.js)
a = audit(saringRentang(data, wib('2026-10-03 00:00:00'), wib('2026-10-12 23:59:59')));
console.log('\n== B. 3-12 Okt 2026 (pembanding: kunci jawaban independen)');
sama('jumlah data', a.rentang.jumlah, 14400);
sama('K1 slot terisi/total', `${a.k1.slotTerisi}/${a.k1.slotTotal}`, '14396/14399');
sama('K1 celah', a.k1.celah.length, 0);
sama('K2 DHT22 %', a.k2.sensor[1].persen.toFixed(2), '98.05');
sama('K4 korelasi', a.k4.korelasi.toFixed(3), '-0.715');
sama('K5 simpangan baku', a.k5.sb.toFixed(3), '0.261');
sama('K5 rata-rata', a.k5.rata.toFixed(3), '0.548');
sama('K6 penyiraman', a.k6.penyiraman, 2);
sama('K6 waktu siram 1', new Date(a.k6.peristiwa[0].waktu + 7 * 3600e3).toISOString().slice(0, 16), '2026-10-05T19:46');
sama('K6 waktu siram 2', new Date(a.k6.peristiwa[1].waktu + 7 * 3600e3).toISOString().slice(0, 16), '2026-10-09T17:21');
sama('+ restart', a.pendukung.restart, 5);

console.log(gagal ? `\n${gagal} BEDA` : '\nSEMUA COCOK');
process.exit(gagal ? 1 : 0);
