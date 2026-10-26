'use client';
// Verifikasi: data ThingSpeak tiap jam dirangkai ulang di server dApp dan dicocokkan dengan
// jangkar yang DITANDATANGANI ALAT di kontrak JangkarEdge (Polygon Amoy).
import { useCallback, useEffect, useState } from 'react';
import { waktu, jamMenit } from '@/lib/format.mjs';

const LABEL = {
  cocok:           { teks: 'cocok',            ikon: '✓', kelas: 'bg-baik-tua text-baik' },
  beda:            { teks: 'tidak cocok',      ikon: '✗', kelas: 'bg-gagal-tua text-gagal' },
  data_hilang:     { teks: 'data hilang',      ikon: '✗', kelas: 'bg-gagal-tua text-gagal' },
  belum_dijangkar: { teks: 'belum ada jangkar', ikon: '–', kelas: 'bg-netral/40 text-redup' },
  kosong:          { teks: 'tidak ada data',   ikon: '·', kelas: 'text-redup/60' },
};

function hariIniWib() {
  return new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);
}

function pendek(h) { return h ? `${h.slice(0, 10)}…${h.slice(-6)}` : '—'; }

export default function Verifikasi() {
  const [tanggal, setTanggal] = useState(hariIniWib());
  const [isi, setIsi] = useState(null);
  const [galat, setGalat] = useState(null);
  const [memuat, setMemuat] = useState(false);
  const [buka, setBuka] = useState(null);

  const jalankan = useCallback(async t => {
    setMemuat(true); setGalat(null); setBuka(null);
    try {
      const r = await fetch(`/api/verifikasi?tanggal=${t}`, { cache: 'no-store' });
      const j = await r.json();
      if (!r.ok) throw new Error(j.galat || `HTTP ${r.status}`);
      setIsi(j);
    } catch (e) { setGalat(e.message); }
    finally { setMemuat(false); }
  }, []);

  useEffect(() => { jalankan(hariIniWib()); }, [jalankan]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-emas">Verifikasi</h1>
        <p className="text-sm text-redup mt-1 max-w-3xl">
          Tiap jam, ESP32 merangkai semua catatannya menjadi satu sidik jari (keccak256) dan menandatanganinya dengan
          kunci yang hanya ada di alat. Halaman ini merangkai ulang data yang ada di ThingSpeak lalu mencocokkannya
          dengan sidik jari di blockchain. <strong className="text-teks">Cocok</strong> berarti data jam itu sama persis
          dengan yang dicatat alat — tidak ada nilai yang diubah, ditambah, atau dihapus.
        </p>
      </div>

      <form className="flex flex-wrap items-end gap-3" onSubmit={e => { e.preventDefault(); jalankan(tanggal); }}>
        <label className="text-sm text-redup flex flex-col gap-1">Tanggal (WIB)
          <input type="date" value={tanggal} onChange={e => setTanggal(e.target.value)}
                 className="min-h-[44px] rounded-md border border-garis bg-latar px-3 text-teks" />
        </label>
        <button type="submit" disabled={memuat}
                className="min-h-[44px] rounded-md bg-emas px-5 text-sm font-semibold text-[#1E1A10] disabled:opacity-50">
          {memuat ? 'Memeriksa…' : 'Periksa'}
        </button>
      </form>

      {galat && <p className="text-sm text-gagal">{galat}</p>}
      {!isi && !galat && <p className="text-redup py-12 text-center">Mengambil data & jangkar…</p>}

      {isi && (
        <div className={`space-y-5 transition-opacity ${memuat ? 'opacity-60' : ''}`}>
          <section className="rounded-xl border border-garis bg-panel p-4 grid sm:grid-cols-4 gap-4">
            {[['cocok', isi.ringkasan.cocok, 'text-baik'], ['tidak cocok', isi.ringkasan.beda, isi.ringkasan.beda ? 'text-gagal' : ''],
              ['data hilang', isi.ringkasan.dataHilang, isi.ringkasan.dataHilang ? 'text-gagal' : ''], ['belum ada jangkar', isi.ringkasan.belumDijangkar, '']]
              .map(([label, n, warna]) => (
                <div key={label}><div className="text-xs text-redup">jam {label}</div><div className={`text-3xl font-semibold ${warna}`}>{n}</div></div>
              ))}
            <div className="sm:col-span-4 text-xs text-redup space-y-1 break-all">
              {!isi.siapBanding && (
                <p className="rounded-md border border-netral bg-netral/20 px-3 py-2 text-sm text-teks">
                  Kontrak atau alamat alat belum diatur (AMOY_KONTRAK / PERANGKAT_ALAT). Rantai tetap dihitung dari
                  ThingSpeak, tetapi belum ada jangkar untuk dibandingkan.
                </p>
              )}
              <div>Alat: <span className="font-mono text-teks">{isi.perangkat || '—'}</span></div>
              <div>Kontrak: {isi.kontrak
                ? <a className="font-mono text-emas underline" href={`${isi.penjelajah}/address/${isi.kontrak}#events`} target="_blank" rel="noreferrer">{isi.kontrak}</a>
                : '—'}</div>
              {isi.relayer && <div>Relayer: <span className="font-mono">{isi.relayer.alamat}</span> · saldo {isi.relayer.saldoPol.toFixed(4)} POL</div>}
            </div>
          </section>

          <section className="rounded-xl border border-garis bg-panel overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-redup border-b border-garis">
                {['Jam (WIB)', 'Data', 'Status', 'Rantai dari ThingSpeak', 'Jangkar di blockchain', ''].map(h => <th key={h} className="px-4 py-2 font-normal">{h}</th>)}
              </tr></thead>
              <tbody className="angka">
                {isi.jam.map(j => {
                  const l = LABEL[j.status];
                  return (
                    <FragmentBaris key={j.jam} j={j} l={l} buka={buka === j.jam} setBuka={() => setBuka(buka === j.jam ? null : j.jam)} />
                  );
                })}
              </tbody>
            </table>
          </section>

          <p className="text-xs text-redup max-w-3xl">
            <strong>Belum ada jangkar</strong> wajar untuk jam yang sedang berjalan, jam sebelum firmware v2.0, atau saat
            jangkar masih menunggu dikirim alat. <strong>Tidak cocok</strong> dapat berarti data di ThingSpeak berbeda dari
            yang dicatat alat, atau sebagian catatan jam itu belum sampai ke ThingSpeak (antrean alat). Klik baris untuk
            melihat teks setiap catatan yang dirangkai, sehingga perhitungan dapat diulang secara mandiri.
          </p>
        </div>
      )}
    </div>
  );
}

function FragmentBaris({ j, l, buka, setBuka }) {
  return (
    <>
      <tr className={`border-b border-garis/60 ${j.jumlahData ? 'cursor-pointer hover:bg-garis/40' : ''}`} onClick={j.jumlahData ? setBuka : undefined}>
        <td className="px-4 py-2 whitespace-nowrap">{jamMenit(j.mulai)}</td>
        <td className="px-4 py-2">{j.jumlahData || '—'}</td>
        <td className="px-4 py-2"><span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${l.kelas}`}><span aria-hidden="true">{l.ikon}</span>{l.teks}</span></td>
        <td className="px-4 py-2 font-mono text-xs">{pendek(j.rantaiHitung)}</td>
        <td className="px-4 py-2 font-mono text-xs">{pendek(j.rantaiTersimpan)}</td>
        <td className="px-4 py-2 text-redup">{j.jumlahData ? (buka ? '▴' : '▾') : ''}</td>
      </tr>
      {buka && (
        <tr className="border-b border-garis/60 bg-latar/60">
          <td colSpan={6} className="px-4 py-3">
            <div className="text-xs text-redup mb-2">
              rantai₀ = 0x00…00 · rantaiᵢ = keccak256(rantaiᵢ₋₁ ‖ keccak256(teks catatan ke-i)) · {waktu(j.mulai)} WIB
            </div>
            <pre className="max-h-64 overflow-auto text-[11px] leading-5 font-mono text-teks/90">{j.daun.join('\n')}</pre>
            <div className="mt-2 text-xs font-mono break-all">hasil: {j.rantaiHitung}<br />blockchain: {j.rantaiTersimpan || '—'}</div>
          </td>
        </tr>
      )}
    </>
  );
}
