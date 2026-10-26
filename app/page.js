'use client';
// Dashboard: nilai terakhir, status alat, grafik 24 jam data terakhir, catatan kejadian.
import { useCallback, useEffect, useState } from 'react';
import GrafikGaris from '@/components/GrafikGaris';
import { INFO_KOLOM, TS_DETIK } from '@/lib/konstanta.mjs';
import { angka, durasi, kategoriVpd, titikEmbun, waktu } from '@/lib/format.mjs';

const SEGAR_DETIK = 3 * TS_DETIK;                  // lebih lama dari ini tanpa data -> alat dianggap tidak mengirim
const URUTAN_KARTU = ['suhu', 'rh', 'vpd', 'lux', 'tekanan', 'tanah_mv', 'suhu_dht', 'tanah_persen'];

function Kartu({ kolom, nilai, catatan, nada }) {
  const info = INFO_KOLOM[kolom];
  return (
    <div className="rounded-xl border border-garis bg-panel p-4">
      <div className="text-xs text-redup">{info.label} · {info.sensor}</div>
      <div className="mt-1 text-3xl font-semibold text-teks">
        {angka(nilai, info.desimal)} <span className="text-base font-normal text-redup">{info.satuan}</span>
      </div>
      {catatan && (
        <div className={`mt-1 text-xs ${nada === 'baik' ? 'text-baik' : nada === 'gagal' ? 'text-gagal' : 'text-redup'}`}>{catatan}</div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [isi, setIsi] = useState(null);
  const [galat, setGalat] = useState(null);
  const [memuat, setMemuat] = useState(false);

  const muat = useCallback(async () => {
    setMemuat(true);
    try {
      const r = await fetch('/api/terkini', { cache: 'no-store' });
      const j = await r.json();
      if (!r.ok) throw new Error(j.galat || `HTTP ${r.status}`);
      setIsi(j); setGalat(null);
    } catch (e) { setGalat(e.message); }
    finally { setMemuat(false); }
  }, []);

  useEffect(() => { muat(); const id = setInterval(muat, 60000); return () => clearInterval(id); }, [muat]);

  if (!isi) return (
    <p className="text-redup py-16 text-center">{galat ? `Gagal memuat data: ${galat}` : 'Memuat data dari ThingSpeak…'}</p>
  );

  const data = isi.data;
  const akhir = data[data.length - 1];
  const umurDetik = (isi.sekarang - akhir.t) / 1000;
  const segar = umurDetik <= SEGAR_DETIK;
  const embun = titikEmbun(akhir.v.suhu_dht, akhir.v.rh);
  const vpdKat = kategoriVpd(akhir.v.vpd);
  // jendela grafik = 24 jam BERDASARKAN WAKTU, berakhir di data terakhir
  // (1.440 entri terakhir bisa mencakup berhari-hari bila alat sempat mati)
  const data24 = data.filter(r => r.t >= akhir.t - 24 * 3600e3);
  const titik = k => data24.map(r => ({ t: r.t, v: r.v[k] }));
  const kejadian = data.filter(r => r.status).slice(-10).reverse();
  const catatanKartu = {
    vpd: vpdKat && { teks: vpdKat.teks, nada: vpdKat.nada },
    rh: embun !== null && { teks: `titik embun ${angka(embun, 1)} °C` },
    suhu_dht: akhir.v.suhu !== null && akhir.v.suhu_dht !== null &&
              { teks: `selisih BMP280 − DHT22 ${angka(akhir.v.suhu - akhir.v.suhu_dht, 2)} °C` },
    tanah_persen: { teks: 'belum dikalibrasi — pakai mV untuk analisis', nada: 'gagal' },
  };

  return (
    <div className={`space-y-6 transition-opacity ${memuat ? 'opacity-70' : ''}`}>
      <section className="flex flex-wrap items-center gap-3">
        <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${
          segar ? 'bg-baik-tua text-baik' : 'bg-gagal-tua text-gagal'}`}>
          <span aria-hidden="true">{segar ? '●' : '■'}</span>
          {segar ? 'Alat mengirim data' : `Tidak ada data baru selama ${durasi(umurDetik)}`}
        </span>
        <span className="text-sm text-redup">
          Data terakhir: {waktu(akhir.t, true)} WIB · entri #{akhir.id.toLocaleString('id-ID')}
        </span>
        <button onClick={muat} disabled={memuat}
                className="ml-auto min-h-[44px] rounded-md border border-garis px-4 text-sm hover:bg-garis disabled:opacity-50">
          {memuat ? 'Memuat…' : 'Muat ulang'}
        </button>
      </section>
      {galat && <p className="text-sm text-gagal">Pembaruan terakhir gagal: {galat} (menampilkan data sebelumnya)</p>}
      {!segar && (
        <p className="rounded-lg border border-netral bg-netral/20 px-4 py-3 text-sm">
          Angka dan grafik di bawah adalah <strong>data terakhir yang tersedia</strong>, bukan kondisi saat ini.
        </p>
      )}

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {URUTAN_KARTU.map(k => (
          <Kartu key={k} kolom={k} nilai={akhir.v[k]} catatan={catatanKartu[k]?.teks} nada={catatanKartu[k]?.nada} />
        ))}
      </section>

      <section>
        <h2 className="text-lg font-semibold text-emas mb-1">24 jam data terakhir</h2>
        <p className="text-sm text-redup mb-3">
          {data24.length.toLocaleString('id-ID')} data dari {waktu(akhir.t - 24 * 3600e3)} sampai {waktu(akhir.t)} WIB
          {data24.length < 1440 * 0.9 && ` (seharusnya ±1.440; ${data24.length < 60 ? 'alat baru menyala kembali' : 'ada data yang hilang'})`}.
          Garis terputus = tidak ada data (alat mati atau sensor gagal baca).
        </p>
        <div className="grid lg:grid-cols-2 gap-4">
          <GrafikGaris judul="Suhu udara" satuan="°C" desimal={2}
                       seri={[{ nama: 'BMP280', titik: titik('suhu') }, { nama: 'DHT22', titik: titik('suhu_dht') }]} />
          <GrafikGaris judul="Kelembapan udara (DHT22)" satuan="%" seri={[{ nama: 'RH', titik: titik('rh') }]} />
          <GrafikGaris judul="VPD udara" satuan="kPa" desimal={3} seri={[{ nama: 'VPD', titik: titik('vpd') }]}
                       catatan="Dihitung di alat dari suhu & RH DHT22 (rumus Magnus, FAO-56)." />
          <GrafikGaris judul="Cahaya (BH1750)" satuan="lux" desimal={1} seri={[{ nama: 'Cahaya', titik: titik('lux') }]} />
          <GrafikGaris judul="Tekanan udara (BMP280)" satuan="hPa" desimal={2} seri={[{ nama: 'Tekanan', titik: titik('tekanan') }]} />
          <GrafikGaris judul="Tegangan sensor tanah" satuan="mV" desimal={0} seri={[{ nama: 'Tanah', titik: titik('tanah_mv') }]}
                       catatan="Turun = tanah lebih basah. Di bawah 300 mV: kemungkinan sensor dicelup air (uji kalibrasi)." />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-emas mb-2">Catatan kejadian</h2>
        {kejadian.length === 0 ? (
          <p className="text-sm text-redup">Tidak ada kejadian pada {data.length.toLocaleString('id-ID')} data terakhir.</p>
        ) : (
          <ul className="divide-y divide-garis rounded-xl border border-garis bg-panel text-sm">
            {kejadian.map(r => (
              <li key={r.id} className="px-4 py-2.5 flex flex-wrap gap-x-4">
                <span className="text-redup angka">{waktu(r.t, true)}</span><span>{r.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
