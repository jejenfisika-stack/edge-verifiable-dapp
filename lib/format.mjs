// Format angka & waktu untuk tampilan (bahasa Indonesia, zona WIB)
import { ZONA_DETIK } from './konstanta.mjs';

const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

export function angka(x, desimal = 1) {
  if (x === null || x === undefined || Number.isNaN(x)) return '—';
  return x.toLocaleString('id-ID', { minimumFractionDigits: desimal, maximumFractionDigits: desimal });
}

// "25 Okt 2026 13:05" (WIB) — dihitung manual agar sama di server & browser
export function waktu(t, denganDetik = false) {
  const d = new Date(t + ZONA_DETIK * 1000);
  const dua = n => String(n).padStart(2, '0');
  const jam = `${dua(d.getUTCHours())}:${dua(d.getUTCMinutes())}${denganDetik ? ':' + dua(d.getUTCSeconds()) : ''}`;
  return `${d.getUTCDate()} ${BULAN[d.getUTCMonth()]} ${d.getUTCFullYear()} ${jam}`;
}

export function jamMenit(t) {
  const d = new Date(t + ZONA_DETIK * 1000);
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}

export function tanggalPendek(tgl) {             // "2026-10-05" -> "5 Okt"
  const [, b, h] = tgl.split('-').map(Number);
  return `${h} ${BULAN[b - 1]}`;
}

export function durasi(detik) {
  if (detik < 90) return `${Math.round(detik)} detik`;
  if (detik < 5400) return `${Math.round(detik / 60)} menit`;
  if (detik < 172800) return `${angka(detik / 3600, 1)} jam`;
  return `${angka(detik / 86400, 1)} hari`;
}

// Titik embun (Magnus, sama dengan firmware) dari suhu & RH DHT22
export function titikEmbun(T, RH) {
  if (T === null || RH === null || RH <= 0) return null;
  const g = Math.log(RH / 100) + 17.27 * T / (T + 237.3);
  return 237.3 * g / (17.27 - g);
}

// Kategori VPD (ambang sama dengan firmware)
export function kategoriVpd(v) {
  if (v === null) return null;
  if (v < 0.4) return { teks: 'sangat lembap', nada: 'netral' };
  if (v <= 1.2) return { teks: 'ideal', nada: 'baik' };
  if (v <= 1.5) return { teks: 'tinggi', nada: 'netral' };
  return { teks: 'stres air', nada: 'gagal' };
}
