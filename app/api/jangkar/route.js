// RELAYER: menerima jangkar bertanda tangan dari ESP32, memeriksanya, lalu mencatatnya
// ke kontrak JangkarEdge dengan dompet relayer (yang hanya membayar gas).
// Relayer TIDAK dapat memalsukan data: kontrak memeriksa tanda tangan alat sendiri.
//
// Balasan (dipakai firmware v2.0 untuk memutuskan buang / coba lagi):
//   200 {status:'tercatat'|'sudah_ada'}  -> alat membuang jangkar dari antrean
//   409 {status:'bentrok'}                -> blockchain sudah berisi rantai LAIN untuk jam itu
//   400 / 403 / 429 / 5xx                 -> alat mencoba lagi 5 menit kemudian
import { NextResponse } from 'next/server';
import { ZeroHash, getAddress } from 'ethers';
import { digestJangkar, cariV } from '@/lib/jangkar.mjs';
import { CHAIN_ID, alamatKontrak, kontrakBaca, kontrakTulis, namaGalat } from '@/lib/rantaiblok.mjs';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const HEX32 = /^0x[0-9a-fA-F]{64}$/;
const SETENGAH_N = 0x7fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a0n;
const sedangDiproses = new Set();                 // cegah dua transaksi untuk jangkar yang sama
const jejakIp = new Map();                        // pembatas laju sederhana per IP (per instans)

function balas(kode, isi) { return NextResponse.json(isi, { status: kode }); }

function terlaluSering(ip) {
  const kini = Date.now(), daftar = (jejakIp.get(ip) || []).filter(t => kini - t < 60000);
  daftar.push(kini);
  jejakIp.set(ip, daftar);
  if (jejakIp.size > 500) jejakIp.clear();
  return daftar.length > 30;
}

export async function POST(req) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'lokal';
  if (terlaluSering(ip)) return balas(429, { status: 'terlalu_sering' });

  let b;
  try { b = await req.json(); } catch { return balas(400, { status: 'json_tidak_sah' }); }

  // 1. Bentuk data. Jam harus sudah berakhir (toleransi 300 dtk, sama dengan kontrak), maks. 90 hari lalu
  const detikKini = Math.floor(Date.now() / 1000), jamKini = Math.floor(detikKini / 3600);
  const sah = b && /^0x[0-9a-fA-F]{40}$/.test(b.perangkat)
    && Number.isInteger(b.jam) && b.jam > 0 && (b.jam + 1) * 3600 <= detikKini + 300 && b.jam >= jamKini - 24 * 90
    && Number.isInteger(b.jumlah) && b.jumlah >= 1 && b.jumlah <= 3600
    && HEX32.test(b.rantai) && b.rantai !== ZeroHash && HEX32.test(b.r) && HEX32.test(b.s);
  if (!sah) return balas(400, { status: 'data_tidak_sah' });
  if (BigInt(b.s) > SETENGAH_N) return balas(400, { status: 's_tinggi' });

  let kontrak;
  try { kontrak = alamatKontrak(); } catch (e) { return balas(503, { status: 'relayer_belum_diatur', pesan: e.message }); }
  const perangkat = getAddress(b.perangkat);

  // 2. Tanda tangan (tanpa gas): v dicari dengan mencoba 27 & 28
  const digest = digestJangkar({ chainId: CHAIN_ID, kontrak, perangkat, jam: b.jam, jumlah: b.jumlah, rantai: b.rantai });
  const v = cariV(digest, b.r, b.s, perangkat);
  if (v === null) return balas(400, { status: 'tanda_tangan_tidak_sah', digest });

  const kunci = `${perangkat}:${b.jam}`;
  if (sedangDiproses.has(kunci)) return balas(503, { status: 'sedang_diproses' });
  sedangDiproses.add(kunci);
  try {
    // 3. Keadaan kontrak
    const k = kontrakBaca();
    if (!(await k.perangkatTerdaftar(perangkat))) return balas(403, { status: 'perangkat_belum_didaftarkan', perangkat });
    const tersimpan = await k.rantaiJangkar(perangkat, b.jam);
    if (tersimpan !== ZeroHash) {
      return tersimpan.toLowerCase() === b.rantai.toLowerCase()
        ? balas(200, { status: 'sudah_ada' })
        : balas(409, { status: 'bentrok', tersimpan });
    }

    // 4. Simulasi dulu (tanpa gas), baru kirim
    const kt = kontrakTulis();
    const arg = [perangkat, b.jam, b.jumlah, b.rantai, v, b.r, b.s];
    try { await kt.catatJangkar.staticCall(...arg); }
    catch (e) { return balas(400, { status: 'ditolak_kontrak', alasan: namaGalat(e) }); }
    const tx = await kt.catatJangkar(...arg);
    const struk = await tx.wait(1, 25000);
    if (!struk || struk.status !== 1) return balas(502, { status: 'transaksi_gagal', tx: tx.hash });
    console.log(`jangkar ${perangkat} jam ${b.jam} (${b.jumlah} data) -> ${tx.hash}`);
    return balas(200, { status: 'tercatat', tx: tx.hash, blok: struk.blockNumber, gas: struk.gasUsed.toString() });
  } catch (e) {
    // pesan galat ethers tidak memuat kunci; tetap dipendekkan
    return balas(502, { status: 'galat_relayer', alasan: String(namaGalat(e)).slice(0, 200) });
  } finally {
    sedangDiproses.delete(kunci);
  }
}
