// Data terbaru (maks. 1.440 entri = 24 jam) untuk Dashboard.
import { NextResponse } from 'next/server';
import { ambilTerbaru } from '@/lib/thingspeak.mjs';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;     // ThingSpeak kadang butuh > 10 detik (batas bawaan Vercel)

export async function GET() {
  try {
    const { channel, data } = await ambilTerbaru(1440);
    return NextResponse.json({ channel, data, sekarang: Date.now() });
  } catch (e) {
    return NextResponse.json({ galat: e.message }, { status: 502 });
  }
}
