// Verifikasi satu hari (WIB): untuk tiap jam, rantai dihitung ulang dari data ThingSpeak
// lalu dibandingkan dengan jangkar yang ditandatangani alat di kontrak JangkarEdge.
// GET /api/verifikasi?tanggal=2026-10-26[&perangkat=0x...]
import { NextResponse } from 'next/server';
import { ZeroHash, getAddress, isAddress } from 'ethers';
import { ambilRentang } from '@/lib/thingspeak.mjs';
import { teksDaun, rantaiDariDaun, jamDari } from '@/lib/jangkar.mjs';
import { KOLOM } from '@/lib/konstanta.mjs';
import { PENJELAJAH, alamatKontrak, kontrakBaca, infoRelayer } from '@/lib/rantaiblok.mjs';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req) {
  const q = new URL(req.url).searchParams;
  const tanggal = q.get('tanggal');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal || '')) return NextResponse.json({ galat: 'tanggal harus YYYY-MM-DD' }, { status: 400 });
  const p = q.get('perangkat') || process.env.PERANGKAT_ALAT;
  const perangkat = p && isAddress(p) ? getAddress(p) : null;
  let kontrak = null;
  try { kontrak = alamatKontrak(); } catch { /* belum di-deploy: rantai tetap dihitung, tanpa pembanding */ }
  const siapBanding = Boolean(perangkat && kontrak);

  try {
    const mulai = Date.parse(`${tanggal}T00:00:00+07:00`), akhir = mulai + 86400e3 - 1;
    const data = await ambilRentang(mulai, akhir);

    // kelompokkan per jam UTC (WIB = UTC+7 jam bulat, jadi 24 jam WIB = 24 jam UTC)
    const perJam = new Map();
    for (const r of data) {
      const j = jamDari(r.t);
      if (!perJam.has(j)) perJam.set(j, []);
      perJam.get(j).push(teksDaun(r.t, KOLOM.map(k => r.v[k])));
    }

    const jamAwal = jamDari(mulai);
    const daftarJam = Array.from({ length: 24 }, (_, i) => jamAwal + i);
    const onchain = Array(24).fill(ZeroHash);
    if (siapBanding) {
      const k = kontrakBaca();
      for (let i = 0; i < 24; i += 6) {                           // 6 panggilan sekaligus (sopan ke RPC)
        const hasil = await Promise.all(daftarJam.slice(i, i + 6).map(j => k.rantaiJangkar(perangkat, j)));
        hasil.forEach((h, n) => { onchain[i + n] = h; });
      }
    }

    const jam = daftarJam.map((j, i) => {
      const daun = perJam.get(j) || [];
      const hitung = daun.length ? rantaiDariDaun(daun) : null;
      const tersimpan = onchain[i] === ZeroHash ? null : onchain[i];
      const status = tersimpan && hitung ? (tersimpan === hitung ? 'cocok' : 'beda')
                   : tersimpan ? 'data_hilang'
                   : hitung ? 'belum_dijangkar' : 'kosong';
      return { jam: j, mulai: j * 3600e3, jumlahData: daun.length, rantaiHitung: hitung, rantaiTersimpan: tersimpan, status, daun };
    });
    const hitungStatus = s => jam.filter(x => x.status === s).length;
    let relayer = null;
    if (siapBanding) {
      try { relayer = await infoRelayer(); } catch { /* relayer belum diatur: halaman tetap bisa verifikasi */ }
    }
    return NextResponse.json({
      tanggal, perangkat, kontrak, siapBanding, penjelajah: PENJELAJAH, relayer,
      ringkasan: { cocok: hitungStatus('cocok'), beda: hitungStatus('beda'), dataHilang: hitungStatus('data_hilang'), belumDijangkar: hitungStatus('belum_dijangkar') },
      jam,
    });
  } catch (e) {
    return NextResponse.json({ galat: e.message }, { status: 502 });
  }
}
