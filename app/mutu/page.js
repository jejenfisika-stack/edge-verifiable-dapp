'use client';
// Mutu Data: audit kriteria K1-K6 + pemeriksaan pendukung pada rentang tanggal pilihan.
// Definisi identik dengan notebook Colab analisis/Audit_Data_Uji_Coba_Proyek9.ipynb
// (diuji: scripts/uji_audit.mjs, hasil sama persis pada data 2-20 Okt 2026).
import { useCallback, useEffect, useState } from 'react';
import { AMBANG } from '@/lib/konstanta.mjs';
import { angka, durasi, tanggalPendek, waktu } from '@/lib/format.mjs';

function Lencana({ lulus }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${
      lulus ? 'bg-baik-tua text-baik' : 'bg-gagal-tua text-gagal'}`}>
      <span aria-hidden="true">{lulus ? '✓' : '✗'}</span>{lulus ? 'LULUS' : 'PERLU PERBAIKAN'}
    </span>
  );
}

function Bagian({ judul, children, keterangan }) {
  return (
    <section className="rounded-xl border border-garis bg-panel p-4">
      <h2 className="font-semibold text-emas">{judul}</h2>
      {keterangan && <p className="text-sm text-redup mt-1">{keterangan}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Tabel({ kepala, baris }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr className="text-left text-redup border-b border-garis">{kepala.map(k => <th key={k} className="py-2 pr-4 font-normal">{k}</th>)}</tr></thead>
        <tbody className="angka">{baris.map((b, i) => <tr key={i} className="border-b border-garis/60 last:border-0">{b.map((s, j) => <td key={j} className="py-2 pr-4 align-top">{s}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

// Batang kelengkapan per hari (satu bar per hari; nilai juga tertulis, jadi tidak bergantung warna)
function BatangHarian({ hari }) {
  const [sorot, setSorot] = useState(null);
  return (
    <div>
      <div className="flex items-end gap-[2px] h-40 border-b border-[#383835]" role="img"
           aria-label="Kelengkapan data per hari (persen slot terisi)">
        {hari.map((h, i) => {
          const lulus = h.persen >= AMBANG.kelengkapan_persen;
          return (
            <div key={h.tanggal} className="relative flex-1 h-full flex items-end"
                 onPointerEnter={() => setSorot(i)} onPointerLeave={() => setSorot(null)}>
              <div className={`w-full rounded-t ${lulus ? 'bg-[#3987e5]' : 'bg-[#d95926]'} ${sorot === i ? 'brightness-125' : ''}`}
                   style={{ height: `${Math.max(h.persen, 0.5)}%` }} />
              {sorot === i && (
                <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 z-10 whitespace-nowrap rounded-md border border-garis bg-latar px-2 py-1 text-xs">
                  <strong className="angka">{angka(h.persen, 1)} %</strong> <span className="text-redup">{tanggalPendek(h.tanggal)} · {h.terisi}/{h.seharusnya} slot</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex gap-[2px] mt-1 text-[10px] text-redup">
        {hari.map((h, i) => (
          <div key={h.tanggal} className="flex-1 text-center overflow-hidden">{i % Math.ceil(hari.length / 10) === 0 ? tanggalPendek(h.tanggal) : ''}</div>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-4 text-xs text-redup">
        <span className="inline-flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm bg-[#3987e5]" />≥ {AMBANG.kelengkapan_persen} % (lulus)</span>
        <span className="inline-flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm bg-[#d95926]" />di bawah ambang</span>
      </div>
    </div>
  );
}

export default function MutuData() {
  const [mulai, setMulai] = useState('');
  const [akhir, setAkhir] = useState('');
  const [isi, setIsi] = useState(null);
  const [galat, setGalat] = useState(null);
  const [memuat, setMemuat] = useState(false);

  const jalankan = useCallback(async (m, a) => {
    setMemuat(true); setGalat(null);
    try {
      const q = new URLSearchParams();
      if (m) q.set('mulai', m);
      if (a) q.set('akhir', a);
      const r = await fetch(`/api/audit?${q}`, { cache: 'no-store' });
      const j = await r.json();
      if (!r.ok) throw new Error(j.galat || `HTTP ${r.status}`);
      setIsi(j);
    } catch (e) { setGalat(e.message); }
    finally { setMemuat(false); }
  }, []);

  useEffect(() => { jalankan('', ''); }, [jalankan]);

  const h = isi?.hasil;
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-emas">Mutu Data</h1>
        <p className="text-sm text-redup mt-1 max-w-3xl">
          Enam kriteria untuk menilai apakah sistem sensor berfungsi baik. Definisi dan ambangnya sama persis dengan notebook
          audit di Colab, sehingga angka di halaman ini dapat dicocokkan langsung dengan hasil notebook.
        </p>
      </div>

      <form className="flex flex-wrap items-end gap-3" onSubmit={e => { e.preventDefault(); jalankan(mulai, akhir); }}>
        <button type="button" onClick={() => { setMulai(''); setAkhir(''); jalankan('', ''); }}
                className="min-h-[44px] rounded-md border border-garis px-4 text-sm hover:bg-garis">Semua data</button>
        <label className="text-sm text-redup flex flex-col gap-1">Mulai (WIB)
          <input type="date" value={mulai} onChange={e => setMulai(e.target.value)}
                 className="min-h-[44px] rounded-md border border-garis bg-latar px-3 text-teks" />
        </label>
        <label className="text-sm text-redup flex flex-col gap-1">Akhir (WIB, termasuk)
          <input type="date" value={akhir} onChange={e => setAkhir(e.target.value)}
                 className="min-h-[44px] rounded-md border border-garis bg-latar px-3 text-teks" />
        </label>
        <button type="submit" disabled={memuat}
                className="min-h-[44px] rounded-md bg-emas px-5 text-sm font-semibold text-[#1E1A10] disabled:opacity-50">
          {memuat ? 'Menghitung…' : 'Audit rentang ini'}
        </button>
      </form>

      {galat && <p className="text-sm text-gagal">{galat}</p>}
      {!h && !galat && <p className="text-redup py-12 text-center">Mengunduh seluruh data & menghitung audit…</p>}

      {h && (
        <div className={`space-y-5 transition-opacity ${memuat ? 'opacity-60' : ''}`}>
          <section className="rounded-xl border border-garis bg-panel p-4 flex flex-wrap items-center gap-x-8 gap-y-2">
            <div>
              <div className="text-xs text-redup">Kriteria utama lulus</div>
              <div className="text-4xl font-semibold">{h.lulusUtama} <span className="text-redup text-2xl">/ {h.totalUtama}</span></div>
            </div>
            <div className="text-sm space-y-0.5">
              <div>{waktu(h.rentang.dari)} – {waktu(h.rentang.sampai)} WIB</div>
              <div className="text-redup">{h.rentang.jumlah.toLocaleString('id-ID')} data · rentang {durasi((h.rentang.sampai - h.rentang.dari) / 1000)}</div>
              <div className={isi.integritas.lengkap ? 'text-redup' : 'text-gagal'}>
                Integritas unduhan: entry_id {isi.integritas.idAwal}–{isi.integritas.idAkhir}, lompatan {isi.integritas.lompatan}
                {isi.integritas.lengkap ? ' (utuh)' : ' — ada entri yang tidak terunduh'}
              </div>
            </div>
            <p className="text-sm basis-full">
              {h.lulusUtama === h.totalUtama
                ? 'Kesimpulan: sistem berfungsi baik pada rentang ini.'
                : 'Kesimpulan: masih ada kriteria berstatus PERLU PERBAIKAN pada rentang ini.'}
            </p>
          </section>

          <Bagian judul="Ringkasan kriteria">
            <Tabel kepala={['No', 'Kriteria', 'Nilai', 'Ambang', 'Status', 'Keterangan']}
                   baris={h.ringkas.map(r => [r.no, r.kriteria, r.nilai, r.ambang, <Lencana key="l" lulus={r.lulus} />, <span key="k" className="text-redup">{r.ket}</span>])} />
          </Bagian>

          <Bagian judul="K1 · Kelengkapan per hari"
                  keterangan={`Slot ${h.k1.slotTerisi.toLocaleString('id-ID')} terisi dari ${h.k1.slotTotal.toLocaleString('id-ID')} (1 slot = 60 detik, termasuk saat alat mati).`}>
            <BatangHarian hari={h.k1.perHari} />
            {h.k1.celah.length > 0 && (
              <div className="mt-4">
                <Tabel kepala={['Celah dari', 'sampai', 'Lama', 'Data hilang']}
                       baris={[...h.k1.celah].sort((a, b) => b.durasiJam - a.durasiJam).slice(0, 10)
                         .map(c => [waktu(c.dari), waktu(c.sampai), durasi(c.durasiJam * 3600), c.dataHilang.toLocaleString('id-ID')])} />
              </div>
            )}
          </Bagian>

          <Bagian judul="K2 · Kegagalan DHT22"
                  keterangan={`${h.k2.dht.jumlahRangkaian} rangkaian gagal; ${h.k2.dht.tunggal} hanya 1 data (wajar); terpanjang ${h.k2.dht.terpanjang} data.`}>
            {h.k2.dht.panjang.length === 0 ? <p className="text-sm text-redup">Tidak ada rangkaian gagal ≥ 5 data.</p> : (
              <Tabel kepala={['Dari', 'Sampai', 'Data', 'Pulih karena']}
                     baris={h.k2.dht.panjang.map(r => [waktu(r.dari), waktu(r.sampai), r.jumlah,
                       r.pulihSetelahRestart ? <span key="p" className="text-gagal">restart alat</span> : 'pulih sendiri / pemulihan firmware'])} />
            )}
          </Bagian>

          <Bagian judul="K6 · Respons sensor tanah"
                  keterangan={`Penurunan ≥ ${AMBANG.penurunan_siram_mv} mV dalam 15 menit. Dari ≥ ${AMBANG.tanah_mv_udara} mV (sensor masih di udara) = pemasangan, bukan penyiraman.`}>
            {h.k6.peristiwa.length === 0 ? <p className="text-sm text-redup">Tidak ada penurunan tajam.</p> : (
              <Tabel kepala={['Waktu', 'Sebelum', 'Penurunan', 'Jenis']}
                     baris={h.k6.peristiwa.map(p => [waktu(p.waktu), `${p.sebelumMv} mV`, `${p.penurunanMv} mV`, p.jenis])} />
            )}
            {h.k6.dicelup > 0 && <p className="text-sm text-redup mt-2">{h.k6.dicelup} data &lt; {AMBANG.tanah_mv_min_wajar} mV (kemungkinan sensor dicelup air) tidak ikut dinilai.</p>}
          </Bagian>

          <Bagian judul="Catatan kejadian & restart"
                  keterangan={`${h.pendukung.restart} restart (${Object.entries(h.pendukung.alasan).map(([k, v]) => `${k}: ${v}`).join(', ') || '—'})`
                    + (h.pendukung.restartTakTercatat !== null ? ` · ${h.pendukung.restartTakTercatat} restart tidak tercatat di ThingSpeak` : '')
                    + ` · sensor gagal baca ${h.pendukung.gagalBaca}, pulih ${h.pendukung.pulih}`}>
            <ul className="max-h-72 overflow-y-auto divide-y divide-garis text-sm">
              {[...h.pendukung.kejadian].reverse().map(k => (
                <li key={k.t} className="py-2 flex flex-wrap gap-x-4"><span className="text-redup angka">{waktu(k.t, true)}</span><span>{k.status}</span></li>
              ))}
            </ul>
          </Bagian>
        </div>
      )}
    </div>
  );
}
