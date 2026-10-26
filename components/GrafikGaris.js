'use client';
// Grafik garis deret waktu (SVG murni, tanpa pustaka).
// - garis 2 px, garis putus pada celah data > 150 detik (alat mati / data hilang)
// - crosshair + tooltip yang menampilkan semua seri pada waktu terdekat
// - satu sumbu Y saja; legenda hanya bila >= 2 seri
// Warna seri (tervalidasi untuk latar #1A1710): biru #3987e5, oranye #d95926
import { useEffect, useMemo, useRef, useState } from 'react';
import { angka, jamMenit, tanggalPendek, waktu } from '@/lib/format.mjs';

export const WARNA_SERI = ['#3987e5', '#d95926'];
const CELAH_MS = 150 * 1000;
const TINGGI = 180, KIRI = 44, KANAN = 12, ATAS = 10, BAWAH = 24;

function skalaRapi(min, maks) {                     // 4-5 garis bantu dengan langkah "bulat"
  if (min === maks) { min -= 1; maks += 1; }
  const kasar = (maks - min) / 4, p = 10 ** Math.floor(Math.log10(kasar));
  const langkah = [1, 2, 2.5, 5, 10].map(k => k * p).find(k => k >= kasar);
  const awal = Math.floor(min / langkah) * langkah, akhir = Math.ceil(maks / langkah) * langkah;
  const tik = [];
  for (let v = awal; v <= akhir + langkah / 2; v += langkah) tik.push(+v.toFixed(10));
  return { awal, akhir, tik, desimal: Math.max(0, -Math.floor(Math.log10(langkah))) };
}

export default function GrafikGaris({ judul, satuan, seri, desimal = 1, catatan }) {
  const wadah = useRef(null);
  const [lebar, setLebar] = useState(600);
  const [sorot, setSorot] = useState(null);         // indeks titik waktu yang disorot

  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setLebar(Math.max(260, Math.floor(e.contentRect.width))));
    if (wadah.current) ro.observe(wadah.current);
    return () => ro.disconnect();
  }, []);

  const waktuSemua = seri[0]?.titik.map(p => p.t) || [];
  const geo = useMemo(() => {
    const nilai = seri.flatMap(s => s.titik.map(p => p.v)).filter(v => v !== null);
    if (!nilai.length || waktuSemua.length < 2) return null;
    const sk = skalaRapi(Math.min(...nilai), Math.max(...nilai));
    const t0 = waktuSemua[0], t1 = waktuSemua[waktuSemua.length - 1];
    const x = t => KIRI + (t - t0) / (t1 - t0) * (lebar - KIRI - KANAN);
    const y = v => ATAS + (sk.akhir - v) / (sk.akhir - sk.awal) * (TINGGI - ATAS - BAWAH);
    const jalur = seri.map(s => {
      let d = '', sebelum = null;
      for (const p of s.titik) {
        if (p.v === null) { sebelum = null; continue; }
        const putus = !sebelum || p.t - sebelum.t > CELAH_MS;
        d += `${putus ? 'M' : 'L'}${x(p.t).toFixed(1)} ${y(p.v).toFixed(1)}`;
        sebelum = p;
      }
      return d;
    });
    // label sumbu waktu menyesuaikan rentang: <= 36 jam tiap 6 jam (00/06/12/18 WIB), lebih panjang tiap hari
    const rentang = t1 - t0, geser = 7 * 3600e3;
    const langkahX = rentang <= 36 * 3600e3 ? 6 * 3600e3 : Math.ceil(rentang / (8 * 86400e3)) * 86400e3;
    const harian = langkahX >= 86400e3;
    const tikX = [];
    for (let t = Math.ceil((t0 + geser) / langkahX) * langkahX - geser; t <= t1; t += langkahX) tikX.push(t);
    return { sk, x, y, jalur, tikX, harian };
  }, [seri, lebar, waktuSemua]);

  const ringkasan = seri.map(s => {
    const v = s.titik.map(p => p.v).filter(x => x !== null);
    return v.length ? { min: Math.min(...v), maks: Math.max(...v), rata: v.reduce((a, b) => a + b, 0) / v.length } : null;
  });

  function gerak(e) {
    if (!geo) return;
    const r = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - r.left;
    let terbaik = 0, jarak = Infinity;              // titik waktu terdekat dengan penunjuk
    for (let i = 0; i < waktuSemua.length; i++) {
      const d = Math.abs(geo.x(waktuSemua[i]) - px);
      if (d < jarak) { jarak = d; terbaik = i; }
    }
    setSorot(terbaik);
  }

  return (
    <figure className="rounded-xl border border-garis bg-panel p-4">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
        <span className="font-semibold text-teks">{judul} <span className="text-redup font-normal">({satuan})</span></span>
        {seri.length > 1 && (
          <span className="flex gap-3 text-xs text-redup">
            {seri.map((s, i) => (
              <span key={s.nama} className="inline-flex items-center gap-1.5">
                <svg width="16" height="4" aria-hidden="true"><line x1="0" y1="2" x2="16" y2="2" stroke={WARNA_SERI[i]} strokeWidth="2" /></svg>
                {s.nama}
              </span>
            ))}
          </span>
        )}
      </figcaption>
      <div ref={wadah} className="relative">
        {!geo ? (
          <p className="text-sm text-redup py-12 text-center">Belum ada data untuk grafik ini.</p>
        ) : (
          <svg width={lebar} height={TINGGI} onPointerMove={gerak} onPointerLeave={() => setSorot(null)}
               className="block touch-none" role="img" aria-label={`Grafik ${judul}`}>
            {geo.sk.tik.map(v => (
              <g key={v}>
                <line x1={KIRI} x2={lebar - KANAN} y1={geo.y(v)} y2={geo.y(v)} stroke="#2E2A1E" strokeWidth="1" />
                <text x={KIRI - 6} y={geo.y(v) + 4} textAnchor="end" fontSize="11" fill="#898781" className="angka">
                  {angka(v, geo.sk.desimal)}
                </text>
              </g>
            ))}
            {geo.tikX.map(t => (
              <text key={t} x={geo.x(t)} y={TINGGI - 6} textAnchor="middle" fontSize="11" fill="#898781" className="angka">{geo.harian ? tanggalPendek(new Date(t + 7 * 3600e3).toISOString().slice(0, 10)) : jamMenit(t)}</text>
            ))}
            {geo.jalur.map((d, i) => (
              <path key={i} d={d} fill="none" stroke={WARNA_SERI[i]} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            ))}
            {sorot !== null && (
              <g>
                <line x1={geo.x(waktuSemua[sorot])} x2={geo.x(waktuSemua[sorot])} y1={ATAS} y2={TINGGI - BAWAH} stroke="#C3C2B7" strokeWidth="1" />
                {seri.map((s, i) => s.titik[sorot]?.v !== null && s.titik[sorot] && (
                  <circle key={i} cx={geo.x(waktuSemua[sorot])} cy={geo.y(s.titik[sorot].v)} r="4.5"
                          fill={WARNA_SERI[i]} stroke="#1A1710" strokeWidth="2" />
                ))}
              </g>
            )}
          </svg>
        )}
        {geo && sorot !== null && (
          <div className="pointer-events-none absolute top-1 rounded-md border border-garis bg-latar/95 px-2.5 py-1.5 text-xs shadow-lg"
               style={{ left: Math.min(Math.max(geo.x(waktuSemua[sorot]) + 10, 0), lebar - 170) }}>
            <div className="text-redup mb-0.5">{waktu(waktuSemua[sorot])} WIB</div>
            {seri.map((s, i) => (
              <div key={s.nama} className="flex items-center gap-2">
                <svg width="12" height="4" aria-hidden="true"><line x1="0" y1="2" x2="12" y2="2" stroke={WARNA_SERI[i]} strokeWidth="2" /></svg>
                <strong className="angka text-teks">{angka(s.titik[sorot]?.v ?? null, desimal)}</strong>
                <span className="text-redup">{s.nama}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-redup angka">
        {seri.map((s, i) => ringkasan[i] && (
          <span key={s.nama}>{seri.length > 1 ? `${s.nama}: ` : ''}min {angka(ringkasan[i].min, desimal)} · rata-rata {angka(ringkasan[i].rata, desimal)} · maks {angka(ringkasan[i].maks, desimal)}</span>
        ))}
        {catatan && <span className="w-full">{catatan}</span>}
      </div>
    </figure>
  );
}
