// Uji kontrak JangkarEdge di EVM NYATA Polygon Amoy — TANPA deploy, TANPA gas.
// Memakai eth_simulateV1 (RPC publik): bytecode hasil kompilasi (contracts/build/JangkarEdge.json,
// SAMA dengan yang akan di-deploy lewat Remix) di-deploy di dalam simulasi, lalu dijalankan
// berurutan dengan state yang terbawa antar-panggilan. Tidak ada yang tersimpan di blockchain.
// Jalankan setelah `npm run kompilasi-kontrak`.   Pemakaian: npm run uji-kontrak
import { readFileSync, existsSync } from 'node:fs';
import { JsonRpcProvider, Interface, Wallet, SigningKey, getCreateAddress, keccak256, toUtf8Bytes,
         ZeroHash, toBeHex, zeroPadValue, AbiCoder, computeAddress, getAddress } from 'ethers';
import { digestJangkar, cariV, teksDaun, rantaiDariDaun } from '../lib/jangkar.mjs';

const RPC = process.env.AMOY_RPC_UJI || 'https://polygon-amoy-bor-rpc.publicnode.com';
const build = JSON.parse(readFileSync(new URL('../contracts/build/JangkarEdge.json', import.meta.url), 'utf8'));
const iface = new Interface(build.abi);
const p = new JsonRpcProvider(RPC, 80002, { staticNetwork: true });
const N = 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n;

let gagal = 0, nomor = 0;
const cek = (nama, ok, ket = '') => { nomor++; if (!ok) gagal++; console.log(`${ok ? 'OK   ' : 'GAGAL'} ${String(nomor).padStart(2)}. ${nama}${ket ? '  — ' + ket : ''}`); };

// --- pelaku ---
const PEMILIK = Wallet.createRandom().address, PENYERANG = Wallet.createRandom().address;
const RELAYER = Wallet.createRandom().address, PEMILIK_BARU = Wallet.createRandom().address;
const ALAT = Wallet.createRandom(), ALAT2 = Wallet.createRandom();
const KONTRAK = getCreateAddress({ from: PEMILIK, nonce: 0 });

const ttd = (kunci, d) => new SigningKey(kunci).sign(d);
const dg = (perangkat, jam, jumlah, rantai, opsi = {}) =>
  digestJangkar({ chainId: opsi.chainId ?? 80002, kontrak: opsi.kontrak ?? KONTRAK, perangkat, jam, jumlah, rantai });
const panggil = (dari, fungsi, arg) => ({ from: dari, to: KONTRAK, data: iface.encodeFunctionData(fungsi, arg) });
const catat = (perangkat, jam, jumlah, rantai, s) => panggil(RELAYER, 'catatJangkar', [perangkat, jam, jumlah, rantai, s.v, s.r, s.s]);

// rantai nyata dari 3 catatan contoh
const RANTAI = rantaiDariDaun([
  teksDaun(Date.now() - 7200e3, [30.5, 1002.4, 70.6, 45.8, 54, 1436, 29.8, 1.191]),
  teksDaun(Date.now() - 7140e3, [30.6, 1002.4, 70.2, 46.0, 54, 1435, 29.9, 1.215]),
  teksDaun(Date.now() - 7080e3, [30.6, 1002.3, 70.1, 46.6, 54, 1435, 29.9, 1.221]),
]);

// --- waktu blok: batas tepat aturan "jam harus sudah berakhir" ---
const J = Math.floor(Date.now() / 3600e3) + 2;            // jam di masa depan, dipakai menguji batas
const T1 = (J + 1) * 3600 - 301;                           // 1 detik SEBELUM batas toleransi
const T2 = (J + 1) * 3600 - 300;                           // TEPAT di batas -> boleh
const JAM = J - 3;                                         // jam yang sudah lama berakhir

const s1 = ttd(ALAT.privateKey, dg(ALAT.address, JAM, 60, RANTAI));
const sJ = ttd(ALAT.privateKey, dg(ALAT.address, J, 60, RANTAI));
const sTinggi = { r: s1.r, s: toBeHex(N - BigInt(s1.s), 32), v: s1.v === 27 ? 28 : 27 };   // pasangan malleable
const RANTAI_PALSU = keccak256(toUtf8Bytes('data diubah'));
const sNol = ttd(ALAT.privateKey, dg(ALAT.address, JAM + 1, 60, ZeroHash));
const sJml0 = ttd(ALAT.privateKey, dg(ALAT.address, JAM + 1, 0, RANTAI));
const sChainLain = ttd(ALAT.privateKey, dg(ALAT.address, JAM + 1, 60, RANTAI, { chainId: 137 }));
const sKontrakLain = ttd(ALAT.privateKey, dg(ALAT.address, JAM + 1, 60, RANTAI, { kontrak: PENYERANG }));
const sPenyerang = ttd(Wallet.createRandom().privateKey, dg(ALAT.address, JAM + 1, 60, RANTAI));
const sAlat2 = ttd(ALAT2.privateKey, dg(ALAT2.address, JAM, 60, RANTAI));
const sSetelahCabut = ttd(ALAT.privateKey, dg(ALAT.address, JAM + 2, 60, RANTAI));

const blok1 = [
  { from: PEMILIK, data: build.bytecode },                                    // 0 deploy (konstruktor sungguhan)
  panggil(PENYERANG, 'pemilik', []),                                          // 1
  panggil(PENYERANG, 'VERSI', []),                                            // 2
  panggil(PENYERANG, 'daftarkanPerangkat', [ALAT.address, 'uji']),            // 3 bukan pemilik
  panggil(PEMILIK, 'daftarkanPerangkat', [ALAT.address, 'EDGE uji']),         // 4
  panggil(PEMILIK, 'daftarkanPerangkat', ['0x' + '00'.repeat(20), 'nol']),   // 5 alamat nol
  panggil(PENYERANG, 'perangkatTerdaftar', [ALAT.address]),                   // 6
  panggil(PENYERANG, 'digestJangkar', [ALAT.address, JAM, 60, RANTAI]),       // 7
  catat(ALAT.address, JAM, 60, RANTAI, s1),                                   // 8 sah
  panggil(PENYERANG, 'rantaiJangkar', [ALAT.address, JAM]),                   // 9
  panggil(PENYERANG, 'totalJangkar', []),                                     // 10
  catat(ALAT.address, JAM, 60, RANTAI, s1),                                   // 11 ganda
  catat(ALAT.address, JAM + 1, 60, RANTAI_PALSU, s1),                         // 12 rantai diubah
  catat(ALAT.address, JAM + 1, 60, RANTAI, sTinggi),                          // 13 s tinggi (pakai jam lain)
  catat(ALAT.address, JAM + 1, 60, RANTAI, { r: s1.r, s: s1.s, v: 29 }),      // 14 v salah
  catat(ALAT2.address, JAM, 60, RANTAI, sAlat2),                              // 15 tak terdaftar
  catat(ALAT.address, JAM + 1, 60, ZeroHash, sNol),                           // 16 rantai nol
  catat(ALAT.address, JAM + 1, 0, RANTAI, sJml0),                             // 17 jumlah nol
  catat(ALAT.address, JAM + 1, 60, RANTAI, sChainLain),                       // 18 chain lain
  catat(ALAT.address, JAM + 1, 60, RANTAI, sKontrakLain),                     // 19 kontrak lain
  catat(ALAT.address, JAM + 1, 60, RANTAI, sPenyerang),                       // 20 kunci lain
  catat(ALAT.address, J, 60, RANTAI, sJ),                                     // 21 jam belum berakhir (1 dtk)
];
const blok2 = [
  catat(ALAT.address, J, 60, RANTAI, sJ),                                     // 0 tepat di batas toleransi
  panggil(PENYERANG, 'cabutPerangkat', [ALAT.address]),                       // 1 bukan pemilik
  panggil(PEMILIK, 'cabutPerangkat', [ALAT.address]),                         // 2
  catat(ALAT.address, JAM + 2, 60, RANTAI, sSetelahCabut),                    // 3 setelah dicabut
  panggil(PENYERANG, 'rantaiJangkar', [ALAT.address, JAM]),                   // 4 jangkar lama tetap
  panggil(PEMILIK, 'gantiPemilik', ['0x' + '00'.repeat(20)]),                 // 5 nol
  panggil(PEMILIK, 'gantiPemilik', [PEMILIK_BARU]),                           // 6
  panggil(PEMILIK, 'daftarkanPerangkat', [ALAT.address, 'x']),                // 7 pemilik lama
  panggil(PENYERANG, 'pemilik', []),                                          // 8
  panggil(PENYERANG, 'totalJangkar', []),                                     // 9
];

console.log(`RPC ${RPC}\nkontrak simulasi ${KONTRAK} | jam uji ${JAM} | batas jam ${J}\n`);
const hasil = await p.send('eth_simulateV1', [{
  blockStateCalls: [
    { blockOverrides: { time: toBeHex(T1) }, calls: blok1 },
    { blockOverrides: { time: toBeHex(T2) }, calls: blok2 },
  ],
  validation: false,
}, 'latest']);
const [b1, b2] = hasil.map(b => b.calls);

const ok = c => c.status === '0x1';
const galat = c => { try { return iface.parseError(c.error?.data || c.returnData)?.name; } catch { return c.error?.message || '?'; } };
const balik = (c, f) => iface.decodeFunctionResult(f, c.returnData);
const ditolak = (c, nama) => !ok(c) && galat(c) === nama;
const log = c => (c.logs || []).map(l => iface.parseLog(l));

// --- penerapan & pengelolaan ---
cek('deploy: konstruktor jalan & kode sama dengan build (EVM Amoy menerima, termasuk opcode cancun)',
    ok(b1[0]) && b1[0].returnData.toLowerCase() === build.deployedBytecode.toLowerCase());
cek('pemilik = akun yang men-deploy', balik(b1[1], 'pemilik')[0] === PEMILIK);
cek('VERSI', balik(b1[2], 'VERSI')[0] === 'JangkarEdge 1.0', balik(b1[2], 'VERSI')[0]);
cek('bukan pemilik tidak bisa mendaftarkan alat', ditolak(b1[3], 'BukanPemilik'), galat(b1[3]));
cek('pemilik mendaftarkan alat + event PerangkatDidaftarkan', ok(b1[4]) && log(b1[4])[0]?.name === 'PerangkatDidaftarkan');
cek('alamat nol ditolak', ditolak(b1[5], 'AlamatNol'), galat(b1[5]));
cek('perangkatTerdaftar = true', balik(b1[6], 'perangkatTerdaftar')[0] === true);
cek('digestJangkar kontrak = lib/jangkar.mjs (chainid + alamat kontrak + encodePacked)',
    balik(b1[7], 'digestJangkar')[0] === dg(ALAT.address, JAM, 60, RANTAI));

// --- jangkar sah ---
const ev = log(b1[8])[0];
cek('jangkar sah dicatat oleh relayer (siapa pun boleh mengirim)', ok(b1[8]), `gas ${BigInt(b1[8].gasUsed)}`);
cek('event JangkarDicatat lengkap (alat, jam, jumlah, rantai, pengirim)',
    ev?.name === 'JangkarDicatat' && ev.args.perangkat === ALAT.address && Number(ev.args.jam) === JAM &&
    Number(ev.args.jumlah) === 60 && ev.args.rantai === RANTAI && ev.args.pengirim === RELAYER);
cek('rantai tersimpan = rantai yang ditandatangani', balik(b1[9], 'rantaiJangkar')[0] === RANTAI);
cek('totalJangkar = 1', balik(b1[10], 'totalJangkar')[0] === 1n);

// --- serangan / kesalahan ---
cek('jangkar ganda untuk jam yang sama ditolak (JangkarSudahAda)', ditolak(b1[11], 'JangkarSudahAda'), galat(b1[11]));
cek('rantai diubah dengan tanda tangan lama ditolak', ditolak(b1[12], 'TandaTanganTidakSah'), galat(b1[12]));
cek('tanda tangan s tinggi (malleable) ditolak', ditolak(b1[13], 'TandaTanganTidakSah'), galat(b1[13]));
cek('v selain 27/28 ditolak', ditolak(b1[14], 'TandaTanganTidakSah'), galat(b1[14]));
cek('alat tidak terdaftar ditolak', ditolak(b1[15], 'PerangkatTidakTerdaftar'), galat(b1[15]));
cek('rantai nol ditolak', ditolak(b1[16], 'JangkarKosong'), galat(b1[16]));
cek('jumlah nol ditolak', ditolak(b1[17], 'JangkarKosong'), galat(b1[17]));
cek('tanda tangan untuk chain lain tidak berlaku', ditolak(b1[18], 'TandaTanganTidakSah'), galat(b1[18]));
cek('tanda tangan untuk kontrak lain tidak berlaku', ditolak(b1[19], 'TandaTanganTidakSah'), galat(b1[19]));
cek('kunci lain atas nama alat ditolak (relayer tak bisa memalsukan)', ditolak(b1[20], 'TandaTanganTidakSah'), galat(b1[20]));
cek('jam belum berakhir ditolak (1 detik sebelum batas)', ditolak(b1[21], 'JamBelumBerakhir'), galat(b1[21]));
cek('jam diterima tepat di batas toleransi 5 menit', ok(b2[0]), ok(b2[0]) ? '' : galat(b2[0]));

// --- pencabutan & kepemilikan ---
cek('bukan pemilik tidak bisa mencabut alat', ditolak(b2[1], 'BukanPemilik'), galat(b2[1]));
cek('pemilik mencabut alat', ok(b2[2]) && log(b2[2])[0]?.name === 'PerangkatDicabut');
cek('alat yang dicabut tidak bisa menambah jangkar', ditolak(b2[3], 'PerangkatTidakTerdaftar'), galat(b2[3]));
cek('jangkar lama tetap tersimpan setelah dicabut', balik(b2[4], 'rantaiJangkar')[0] === RANTAI);
cek('ganti pemilik ke alamat nol ditolak', ditolak(b2[5], 'AlamatNol'), galat(b2[5]));
cek('ganti pemilik', ok(b2[6]) && balik(b2[8], 'pemilik')[0] === PEMILIK_BARU);
cek('pemilik lama kehilangan hak', ditolak(b2[7], 'BukanPemilik'), galat(b2[7]));
cek('totalJangkar = 2 (hanya jangkar sah yang dihitung)', balik(b2[9], 'totalJangkar')[0] === 2n);

// --- firmware: vektor uji yang tertanam di monitor_slide.ino diterima EVM nyata ---
const ino = new URL('../../monitor_slide/monitor_slide.ino', import.meta.url);
if (existsSync(ino)) {
  const src = readFileSync(ino, 'utf8');
  const hx = nama => '0x' + [...src.match(new RegExp(`${nama}\\[\\d+\\]\\s*=\\s*\\{([^}]*)\\}`))[1].matchAll(/0x([0-9a-f]{2})/gi)].map(m => m[1]).join('');
  const UJI_ALAMAT = getAddress(hx('UJI_ALAMAT')), UJI_KONTRAK = getAddress(hx('UJI_KONTRAK'));
  const UJI_JAM = Number(src.match(/UJI_JAM\s*=\s*(\d+)/)[1]);
  const [UJI_RANTAI, UJI_DIGEST, UJI_R, UJI_S] = ['UJI_RANTAI', 'UJI_DIGEST', 'UJI_R', 'UJI_S'].map(hx);
  cek('UJI_ALAMAT firmware = alamat dari kunci uji', UJI_ALAMAT === computeAddress(new SigningKey(keccak256(toUtf8Bytes('EDGE-UJI-KUNCI-v1'))).publicKey));
  const slotTerdaftar = keccak256(AbiCoder.defaultAbiCoder().encode(['address', 'uint256'], [UJI_ALAMAT, 1]));
  const ovr = { [UJI_KONTRAK]: { code: build.deployedBytecode, stateDiff: { [slotTerdaftar]: zeroPadValue('0x01', 32) } } };
  const v = cariV(UJI_DIGEST, UJI_R, UJI_S, UJI_ALAMAT);
  const fw = (await p.send('eth_simulateV1', [{ blockStateCalls: [{ stateOverrides: ovr, calls: [
    { from: RELAYER, to: UJI_KONTRAK, data: iface.encodeFunctionData('digestJangkar', [UJI_ALAMAT, UJI_JAM, 2, UJI_RANTAI]) },
    { from: RELAYER, to: UJI_KONTRAK, data: iface.encodeFunctionData('catatJangkar', [UJI_ALAMAT, UJI_JAM, 2, UJI_RANTAI, v ?? 27, UJI_R, UJI_S]) },
  ] }], validation: false }, 'latest']))[0].calls;
  cek('digest kontrak = UJI_DIGEST firmware', iface.decodeFunctionResult('digestJangkar', fw[0].returnData)[0] === UJI_DIGEST);
  cek('tanda tangan vektor firmware (UJI_R, UJI_S) diterima kontrak', v !== null && ok(fw[1]), ok(fw[1]) ? `v=${v}` : galat(fw[1]));
} else {
  console.log('     (monitor_slide.ino tidak ditemukan: uji vektor firmware dilewati)');
}

console.log(`\ngas: jangkar pertama ${BigInt(b1[8].gasUsed)}, jangkar berikutnya ${BigInt(b2[0].gasUsed)}`);
console.log(gagal ? `\n${gagal} GAGAL dari ${nomor}` : `\nSEMUA ${nomor} UJI OK`);
p.destroy();
process.exit(gagal ? 1 : 0);
