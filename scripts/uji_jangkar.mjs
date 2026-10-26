// Uji luring aturan jangkar (lib/jangkar.mjs) pada data NYATA ThingSpeak — tanpa blockchain.
// Pemakaian: node scripts/uji_jangkar.mjs <folder berisi ts_sampel.json & ts_sampel2.json>
//  A. teks kanonik aman pada semua nilai yang pernah tersimpan (pembulatan tidak mengubah nilai)
//  B. simulasi alat: rantai 1 jam data nyata + tanda tangan -> relayer menerima
//  C. setiap perubahan data / tanda tangan terdeteksi
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Wallet, SigningKey, ZeroHash } from 'ethers';
import { normalisasi } from '../lib/thingspeak.mjs';
import { KOLOM } from '../lib/konstanta.mjs';
import { DESIMAL_FIELD, teksField, teksDaun, rantaiDariDaun, digestJangkar, cariV, jamDari } from '../lib/jangkar.mjs';

const folder = process.argv[2];
if (!folder) { console.error('Pemakaian: node scripts/uji_jangkar.mjs <folder>'); process.exit(2); }
const mentah = ['ts_sampel2.json', 'ts_sampel.json'].flatMap(f => JSON.parse(readFileSync(join(folder, f), 'utf8')).feeds);
let gagal = 0;
const uji = (nama, ok, ket = '') => { if (!ok) gagal++; console.log(`${ok ? 'OK   ' : 'GAGAL'} ${nama}${ket ? '  — ' + ket : ''}`); };

// A. teks kanonik
let diperiksa = 0, berubah = 0, desimalSalah = 0;
for (const e of mentah) for (let f = 0; f < 8; f++) {
  const x = e[`field${f + 1}`];
  if (x === null || x === undefined || x === '') continue;
  const t = teksField(x, DESIMAL_FIELD[f]);
  diperiksa++;
  if (Number(t) !== Number(x)) berubah++;                                     // nilai tidak boleh bergeser
  if ((t.split('.')[1] || '').length !== DESIMAL_FIELD[f]) desimalSalah++;    // desimal = firmware
}
uji('teks kanonik tidak mengubah nilai', berubah === 0, `${diperiksa.toLocaleString('id-ID')} nilai, ${berubah} bergeser`);
uji('jumlah desimal = DESIMAL_FIELD firmware', desimalSalah === 0, `${desimalSalah} salah`);
uji('kosong -> ""', teksField(null, 2) === '' && teksField('', 1) === '');
uji('"-0.00" -> "0.00"', teksField('-0.0', 2) === '0.00' && teksField(-0.001, 2) === '0.00');
uji('negatif tetap negatif', teksField('-1.5', 2) === '-1.50');

// B. simulasi alat pada satu jam penuh data nyata
const data = normalisasi(mentah).sort((a, b) => a.t - b.t);
const perJam = new Map();
for (const r of data) { const j = jamDari(r.t); (perJam.get(j) || perJam.set(j, []).get(j)).push(r); }
const [jam, catatan] = [...perJam.entries()].find(([, c]) => c.length === 60);
const daun = catatan.map(r => teksDaun(r.t, KOLOM.map(k => r.v[k])));
const rantai = rantaiDariDaun(daun);
console.log(`     jam ${jam} (${new Date(jam * 3600e3).toISOString()}), ${daun.length} catatan, rantai ${rantai}`);
console.log(`     contoh daun: ${daun[0]}`);
const alat = Wallet.createRandom();                                             // kunci acak: meniru ESP32
const kontrak = '0x00000000000000000000000000000000000E06E5';
const d = digestJangkar({ chainId: 80002, kontrak, perangkat: alat.address, jam, jumlah: daun.length, rantai });
const sig = new SigningKey(alat.privateKey).sign(d);
uji('relayer menemukan v & alamat alat', cariV(d, sig.r, sig.s, alat.address) === sig.v);

// C. perubahan apa pun terdeteksi
const ubahNilai = [...daun]; ubahNilai[30] = ubahNilai[30].replace(/\|(\d+\.\d)(\d)\|/, (m, a, b) => `|${a}${(+b + 1) % 10}|`);
uji('satu nilai diubah -> rantai berbeda', ubahNilai[30] !== daun[30] && rantaiDariDaun(ubahNilai) !== rantai, ubahNilai[30]);
uji('satu catatan dihapus -> rantai berbeda', rantaiDariDaun(daun.filter((_, i) => i !== 10)) !== rantai);
uji('urutan ditukar -> rantai berbeda', rantaiDariDaun([daun[1], daun[0], ...daun.slice(2)]) !== rantai);
uji('catatan disisipkan -> rantai berbeda', rantaiDariDaun([...daun.slice(0, 5), daun[5], ...daun.slice(5)]) !== rantai);
const dLain = digestJangkar({ chainId: 80002, kontrak, perangkat: alat.address, jam, jumlah: daun.length, rantai: rantaiDariDaun(ubahNilai) });
uji('tanda tangan lama tidak berlaku untuk rantai lain', cariV(dLain, sig.r, sig.s, alat.address) === null);
uji('kunci lain tidak bisa menandatangani atas nama alat',
    cariV(d, ...(s => [s.r, s.s])(new SigningKey(Wallet.createRandom().privateKey).sign(d)), alat.address) === null);
uji('chain lain -> digest lain (cegah pakai ulang)',
    digestJangkar({ chainId: 137, kontrak, perangkat: alat.address, jam, jumlah: daun.length, rantai }) !== d);
uji('rantai kosong = 0x00..00', rantaiDariDaun([]) === ZeroHash);

console.log(gagal ? `\n${gagal} GAGAL` : '\nSEMUA OK');
process.exit(gagal ? 1 : 0);
