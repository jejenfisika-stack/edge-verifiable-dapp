// Uji integrasi kontrak JangkarEdge yang SUDAH di-deploy di Amoy — tanpa gas
// (hanya panggilan baca & simulasi staticCall). Membaca .env.local:
//   AMOY_KONTRAK (wajib), PERANGKAT_ALAT (opsional, alamat ESP32 yang sudah didaftarkan)
// Pemakaian: npm run uji-integrasi
import { readFileSync } from 'node:fs';
import { SigningKey, keccak256, toUtf8Bytes, computeAddress, ZeroHash } from 'ethers';

for (const baris of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split(/\r?\n/)) {
  const m = baris.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
const { digestJangkar, cariV } = await import('../lib/jangkar.mjs');
const { CHAIN_ID, provider, kontrakBaca, alamatKontrak } = await import('../lib/rantaiblok.mjs');

let gagal = 0;
const uji = (nama, ok, ket = '') => { if (!ok) gagal++; console.log(`${ok ? 'OK   ' : 'GAGAL'} ${nama}${ket ? '  — ' + ket : ''}`); };
async function harusRevert(nama, janji, galatHarapan) {
  try { await janji; uji(nama, false, 'tidak revert'); }
  catch (e) { const n = e?.revert?.name; uji(nama, n === galatHarapan, `revert ${n || e.shortMessage}`); }
}

const kontrak = alamatKontrak(), k = kontrakBaca(), p = provider();
console.log(`Kontrak ${kontrak} di chain ${CHAIN_ID}\n`);
uji('kode kontrak ada', (await p.getCode(kontrak)) !== '0x');
console.log(`     pemilik ${await k.pemilik()} · total jangkar ${await k.totalJangkar()}`);

// kunci UJI (bukan kunci alat): tidak terdaftar di kontrak
const kunciUji = new SigningKey(keccak256(toUtf8Bytes('EDGE-UJI-KUNCI-v1')));
const uji1 = computeAddress(kunciUji.publicKey);
const jam = Math.floor(Date.now() / 3600e3) - 1, jumlah = 60, rantai = keccak256(toUtf8Bytes('rantai uji'));

// 1. digest di kontrak == digest di dApp/firmware (abi.encodePacked, chainid, alamat kontrak)
const dLokal = digestJangkar({ chainId: CHAIN_ID, kontrak, perangkat: uji1, jam, jumlah, rantai });
uji('digestJangkar kontrak = lib/jangkar.mjs', (await k.digestJangkar(uji1, jam, jumlah, rantai)) === dLokal, dLokal);

// 2. tanda tangan sah tetapi perangkat tidak terdaftar
const sig = kunciUji.sign(dLokal);
uji('cariV menemukan v', cariV(dLokal, sig.r, sig.s, uji1) === sig.v);
await harusRevert('perangkat tak terdaftar ditolak', k.catatJangkar.staticCall(uji1, jam, jumlah, rantai, sig.v, sig.r, sig.s), 'PerangkatTidakTerdaftar');

// 3. perangkat asli terdaftar? lalu tanda tangan dari kunci LAIN atas nama alat harus ditolak
const alat = process.env.PERANGKAT_ALAT;
if (alat) {
  uji('alat terdaftar', await k.perangkatTerdaftar(alat), alat);
  const dAlat = digestJangkar({ chainId: CHAIN_ID, kontrak, perangkat: alat, jam, jumlah, rantai });
  const palsu = kunciUji.sign(dAlat);
  await harusRevert('tanda tangan palsu atas nama alat ditolak', k.catatJangkar.staticCall(alat, jam, jumlah, rantai, palsu.v, palsu.r, palsu.s), 'TandaTanganTidakSah');
  const N = 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n;
  const sTinggi = '0x' + (N - BigInt(palsu.s)).toString(16).padStart(64, '0');
  await harusRevert('s tinggi ditolak', k.catatJangkar.staticCall(alat, jam, jumlah, rantai, palsu.v === 27 ? 28 : 27, palsu.r, sTinggi), 'TandaTanganTidakSah');
  await harusRevert('rantai nol ditolak', k.catatJangkar.staticCall(alat, jam, jumlah, ZeroHash, palsu.v, palsu.r, palsu.s), 'JangkarKosong');
} else {
  console.log('     (PERANGKAT_ALAT belum diisi: uji 3 dilewati)');
}

console.log(gagal ? `\n${gagal} GAGAL` : '\nSEMUA OK');
process.exit(gagal ? 1 : 0);
