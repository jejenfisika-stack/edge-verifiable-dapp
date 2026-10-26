// Jangkar per jam — aturan yang HARUS identik dengan firmware monitor_slide v2.0
// (bagian "RANTAI JAM & TANDA TANGAN") dan kontrak contracts/JangkarEdge.sol.
//
//   daun   = "YYYY-MM-DDTHH:MM:SSZ|f1|f2|f3|f4|f5|f6|f7|f8"
//            fi = nilai dengan desimal tetap firmware {2,2,1,1,0,0,1,3}; kosong bila tidak ada.
//            ThingSpeak menyimpan field sebagai angka (nol di belakang dibuang: "30.00" -> "30.0"),
//            jadi teks dibangun ulang dengan Number(x).toFixed(desimal). "-0.00" ditulis "0.00".
//   rantai = keccak256(rantai_sebelum || keccak256(daun)), mulai dari 32 byte nol, urut waktu
//   digest = keccak256(abi.encodePacked("EDGE-JANGKAR-v1", chainId, kontrak, perangkat, jam, jumlah, rantai))
//   jam    = floor(epoch UTC detik / 3600)
import { keccak256, toUtf8Bytes, concat, solidityPackedKeccak256, recoverAddress, getAddress, ZeroHash } from 'ethers';

export const DESIMAL_FIELD = [2, 2, 1, 1, 0, 0, 1, 3];
export const DOMAIN_JANGKAR = 'EDGE-JANGKAR-v1';

export function teksField(x, desimal) {
  if (x === null || x === undefined || x === '') return '';
  const n = Number(x);
  if (!Number.isFinite(n)) return '';
  const s = n.toFixed(desimal);
  return /^-0(\.0+)?$/.test(s) ? s.slice(1) : s;
}

export function waktuIso(epochDetik) {
  return new Date(epochDetik * 1000).toISOString().slice(0, 19) + 'Z';
}

// catatan: { t: ms UTC, v: { kolom: angka|null } } dengan urutan kolom = field1..field8
export function teksDaun(t, nilaiField) {
  return [waktuIso(Math.round(t / 1000)), ...nilaiField.map((x, i) => teksField(x, DESIMAL_FIELD[i]))].join('|');
}

export function hashDaun(teks) {
  return keccak256(toUtf8Bytes(teks));
}

export function sambungRantai(rantai, hashDaunHex) {
  return keccak256(concat([rantai, hashDaunHex]));
}

// Rantai dari daftar teks daun (urut waktu)
export function rantaiDariDaun(daftarTeks) {
  let r = ZeroHash;
  for (const d of daftarTeks) r = sambungRantai(r, hashDaun(d));
  return r;
}

export const jamDari = tMs => Math.floor(tMs / 3600e3);

export function digestJangkar({ chainId, kontrak, perangkat, jam, jumlah, rantai }) {
  return solidityPackedKeccak256(
    ['string', 'uint256', 'address', 'address', 'uint32', 'uint16', 'bytes32'],
    [DOMAIN_JANGKAR, BigInt(chainId), getAddress(kontrak), getAddress(perangkat), jam, jumlah, rantai],
  );
}

// Alat hanya mengirim (r, s); v (27/28) dicari di sini dengan mencoba keduanya.
// Mengembalikan v yang memulihkan alamat perangkat, atau null bila tanda tangan tidak sah.
export function cariV(digest, r, s, perangkat) {
  const target = getAddress(perangkat);
  for (const v of [27, 28]) {
    try {
      if (recoverAddress(digest, { r, s, v }) === target) return v;
    } catch { /* r/s tidak valid untuk v ini */ }
  }
  return null;
}
