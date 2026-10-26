// Akses ThingSpeak channel Proyek 9 — HANYA dipakai di server (API route),
// karena channel privat dan Read API Key tidak boleh sampai ke browser.
import { KOLOM } from './konstanta.mjs';

const MAKS_PER_PERMINTAAN = 8000;                 // batas API ThingSpeak

// Ubah satu entri feeds.json menjadi catatan { t, id, v, status }
export function normalisasi(feeds) {
  return feeds.map(e => {
    const v = {};
    KOLOM.forEach((k, i) => {
      const x = e[`field${i + 1}`];
      v[k] = x === null || x === undefined || x === '' ? null : Number(x);
      if (Number.isNaN(v[k])) v[k] = null;
    });
    const s = typeof e.status === 'string' && e.status.length ? e.status : null;
    return { t: Date.parse(e.created_at), id: Number(e.entry_id), v, status: s };
  });
}

function pengaturan() {
  const channel = process.env.THINGSPEAK_CHANNEL_ID;
  const key = process.env.THINGSPEAK_READ_KEY;
  if (!channel || !key) throw new Error('THINGSPEAK_CHANNEL_ID / THINGSPEAK_READ_KEY belum diisi di .env.local');
  return { channel, key };
}

// Cache di memori server (per instans). Cache data bawaan Next.js SENGAJA tidak dipakai:
// halaman 8.000 entri > 2 MB, dan saat gagal menyimpan Next.js menulis URL lengkap
// (termasuk Read key) ke log server — terbukti 2026-10-25.
const cache = new Map();

async function minta(params, umurDetik) {
  const { channel, key } = pengaturan();
  const kunciCache = JSON.stringify(params);
  const ada = cache.get(kunciCache);
  if (ada && Date.now() - ada.waktu < umurDetik * 1000) return ada.isi;
  const url = new URL(`https://api.thingspeak.com/channels/${channel}/feeds.json`);
  for (const [k, v] of Object.entries({ api_key: key, status: 'true', ...params })) url.searchParams.set(k, String(v));
  let r;
  try {
    r = await fetch(url, { cache: 'no-store' });
  } catch {
    throw new Error('Tidak dapat menghubungi ThingSpeak');   // pesan asli bisa memuat URL berisi key
  }
  if (!r.ok) throw new Error(`ThingSpeak HTTP ${r.status}`);
  const j = await r.json();
  if (j === -1 || !j.feeds) throw new Error('Gagal membaca channel: cek Channel ID dan Read API Key');
  if (cache.size > 20) cache.clear();
  cache.set(kunciCache, { waktu: Date.now(), isi: j });
  return j;
}

// Info channel (tanpa Read key ikut keluar)
function infoChannel(c) {
  return { nama: c.name, lastEntryId: c.last_entry_id, diperbarui: c.updated_at,
           label: Object.fromEntries(KOLOM.map((k, i) => [k, c[`field${i + 1}`] || null])) };
}

// N entri terbaru
export async function ambilTerbaru(jumlah = 1440) {
  const j = await minta({ results: Math.min(jumlah, MAKS_PER_PERMINTAAN) }, 30);
  return { channel: infoChannel(j.channel), data: normalisasi(j.feeds) };
}

// Entri pada rentang waktu [mulaiMs, akhirMs] (UTC, inklusif). Untuk rentang <= 5 hari
// (maks. 7.200 entri) cukup satu permintaan; bila mencapai 8.000 dianggap tidak lengkap.
export async function ambilRentang(mulaiMs, akhirMs) {
  const f = ms => new Date(ms).toISOString().slice(0, 19).replace('T', ' ');
  const j = await minta({ start: f(mulaiMs), end: f(akhirMs), results: MAKS_PER_PERMINTAAN }, 60);
  if (j.feeds.length >= MAKS_PER_PERMINTAAN) throw new Error('Rentang terlalu panjang untuk satu permintaan');
  return normalisasi(j.feeds).filter(r => r.t >= mulaiMs && r.t <= akhirMs).sort((a, b) => a.t - b.t);
}

// Semua entri (mundur 8.000 per permintaan, sama seperti notebook audit),
// berhenti bila sudah melewati batasAwalMs. Integritas diperiksa lewat entry_id.
export async function ambilSemua(batasAwalMs = null) {
  let semua = [], akhir = null, channel = null;
  for (let halaman = 0; halaman < 50; halaman++) {
    const p = { results: MAKS_PER_PERMINTAAN };
    if (akhir !== null) p.end = new Date(akhir).toISOString().slice(0, 19).replace('T', ' ');   // UTC
    const j = await minta(p, 300);
    channel = channel || j.channel;
    if (!j.feeds.length) break;
    const data = normalisasi(j.feeds);
    semua = data.concat(semua);
    const tertua = data[0].t;
    if (data.length < MAKS_PER_PERMINTAAN || (batasAwalMs !== null && tertua <= batasAwalMs)) break;
    if (akhir !== null && tertua >= akhir) throw new Error('Pengunduhan tidak bergerak mundur');
    akhir = tertua - 1000;
  }
  // buang duplikat entry_id, urutkan menurut waktu
  const unik = new Map();
  for (const r of semua) unik.set(r.id, r);
  const data = [...unik.values()].sort((a, b) => a.t - b.t);
  const id = data.map(r => r.id).sort((a, b) => a - b);
  let lompatan = 0;
  for (let i = 1; i < id.length; i++) if (id[i] - id[i - 1] > 1) lompatan++;
  return {
    channel: infoChannel(channel), data,
    integritas: { idAwal: id[0] ?? null, idAkhir: id[id.length - 1] ?? null, lompatan,
                  lengkap: lompatan === 0 && (batasAwalMs !== null || (id[0] === 1 && id[id.length - 1] === channel.last_entry_id)) },
  };
}
