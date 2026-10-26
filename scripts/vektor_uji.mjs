// Vektor uji untuk swa-uji kriptografi firmware v2.0 (dicetak sebagai kode C).
// Nilai harapan dihitung dengan ethers (keccak256, secp256k1 RFC 6979, s rendah);
// firmware menghitung ulang di ESP32 saat menyala dan menolak menandatangani bila ada yang beda.
// KUNCI UJI DI BAWAH BUKAN KUNCI ALAT — hanya untuk swa-uji, tidak pernah dipakai mencatat jangkar.
import { keccak256, toUtf8Bytes, SigningKey, computeAddress, getBytes, hexlify } from 'ethers';
import { teksDaun, hashDaun, rantaiDariDaun, digestJangkar } from '../lib/jangkar.mjs';

const c = hex => '{' + Array.from(getBytes(hex)).map(b => '0x' + b.toString(16).padStart(2, '0')).join(',') + '}';

// 1. keccak256: kosong, "abc", 136 byte (tepat satu blok), 200 byte (dua blok)
const k0 = keccak256(new Uint8Array(0));
const k1 = keccak256(toUtf8Bytes('abc'));
const k136 = keccak256(new Uint8Array(136).fill(0x61));
const k200 = keccak256(new Uint8Array(200).fill(0x61));

// 2. kunci uji -> alamat
const kunciUji = keccak256(toUtf8Bytes('EDGE-UJI-KUNCI-v1'));
const alamatUji = computeAddress(new SigningKey(kunciUji).publicKey);

// 3. dua daun -> rantai (nilai sengaja menguji: nol di belakang, kosong, negatif nol, 3 desimal)
const daun1 = teksDaun(1760000000000, [30.5, 1002.4, 70.6, 45.8, 54, 1436, 29.8, 1.191]);
const daun2 = teksDaun(1760000060000, [-0.001, 1002.45, null, 0, 0, 2764, null, null]);
const rantai = rantaiDariDaun([daun1, daun2]);

// 4. digest jangkar + tanda tangan
const kontrakUji = '0x00000000000000000000000000000000000E06E5';
const jam = Math.floor(1760000000 / 3600);
const digest = digestJangkar({ chainId: 80002, kontrak: kontrakUji, perangkat: alamatUji, jam, jumlah: 2, rantai });
const sig = new SigningKey(kunciUji).sign(digest);

console.log(`// ---- dibuat oleh dapp/scripts/vektor_uji.mjs (ethers) — jangan diubah tangan ----
const uint8_t UJI_K0[32]   = ${c(k0)};   // keccak256("")
const uint8_t UJI_K1[32]   = ${c(k1)};   // keccak256("abc")
const uint8_t UJI_K136[32] = ${c(k136)};   // keccak256("a" x 136)
const uint8_t UJI_K200[32] = ${c(k200)};   // keccak256("a" x 200)
const uint8_t UJI_KUNCI[32] = ${c(kunciUji)};
const uint8_t UJI_ALAMAT[20] = ${c(alamatUji)};   // ${alamatUji}
const char*   UJI_DAUN1 = "${daun1}";
const char*   UJI_DAUN2 = "${daun2}";
const uint8_t UJI_RANTAI[32] = ${c(rantai)};
const uint8_t UJI_KONTRAK[20] = ${c(kontrakUji)};
const uint32_t UJI_JAM = ${jam};
const uint8_t UJI_DIGEST[32] = ${c(digest)};
const uint8_t UJI_R[32] = ${c(sig.r)};
const uint8_t UJI_S[32] = ${c(sig.s)};   // s rendah (<= n/2)
// ---- akhir vektor uji ----`);
console.error(`daun1 = ${daun1}\ndaun2 = ${daun2}\nrantai = ${rantai}\nalamat uji = ${alamatUji}\ndigest = ${digest}\nr=${sig.r} s=${sig.s} v=${sig.v}`);
console.error(`hashDaun1 = ${hashDaun(daun1)}  keccak("") = ${k0}`);
