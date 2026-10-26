// Audit mutu data pada rentang tanggal (WIB). Definisi = notebook Colab audit.
// GET /api/audit?mulai=2026-10-03&akhir=2026-10-12   (keduanya opsional, inklusif)
import { NextResponse } from 'next/server';
import { ambilSemua } from '@/lib/thingspeak.mjs';
import { audit, saringRentang } from '@/lib/audit.mjs';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;     // unduh seluruh data (2 x 8.000 entri) dari ThingSpeak bisa ±30 detik

const POLA_TANGGAL = /^\d{4}-\d{2}-\d{2}$/;
const awalHariWIB = s => Date.parse(`${s}T00:00:00+07:00`);
const akhirHariWIB = s => Date.parse(`${s}T23:59:59+07:00`);

export async function GET(req) {
  const q = new URL(req.url).searchParams;
  const mulai = q.get('mulai') || null, akhir = q.get('akhir') || null;
  if ((mulai && !POLA_TANGGAL.test(mulai)) || (akhir && !POLA_TANGGAL.test(akhir)))
    return NextResponse.json({ galat: 'Format tanggal harus YYYY-MM-DD' }, { status: 400 });
  const mulaiMs = mulai ? awalHariWIB(mulai) : null, akhirMs = akhir ? akhirHariWIB(akhir) : null;
  if (mulaiMs !== null && akhirMs !== null && mulaiMs > akhirMs)
    return NextResponse.json({ galat: 'Tanggal mulai melewati tanggal akhir' }, { status: 400 });
  try {
    const { channel, data, integritas } = await ambilSemua(mulaiMs);
    const d = saringRentang(data, mulaiMs, akhirMs);
    if (!d.length) return NextResponse.json({ galat: 'Tidak ada data pada rentang ini' }, { status: 404 });
    return NextResponse.json({ channel, integritas, rentangDiminta: { mulai, akhir }, hasil: audit(d) });
  } catch (e) {
    return NextResponse.json({ galat: e.message }, { status: 502 });
  }
}
