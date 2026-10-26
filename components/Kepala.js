'use client';
// Kepala halaman: logo, nama alat, navigasi. Halaman tahap B/C ditandai, belum bisa dibuka.
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Logo from './Logo';

const MENU = [
  { href: '/', label: 'Dashboard' },
  { href: '/mutu', label: 'Mutu Data' },
  { href: '/verifikasi', label: 'Verifikasi' },
  { label: 'Prakiraan', tahap: 'C' },
];

export default function Kepala() {
  const lokasi = usePathname();
  return (
    <header className="border-b border-garis bg-panel/80 backdrop-blur sticky top-0 z-20">
      <div className="mx-auto max-w-6xl px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-2">
        <Link href="/" className="flex items-center gap-3 min-h-[44px]">
          <Logo lebar={56} />
          <span>
            <span className="block font-semibold tracking-wide text-emas">EDGE COMPUTING</span>
            <span className="block text-xs text-redup">Verifiable Edge Blockchain · Proyek 9</span>
          </span>
        </Link>
        <nav className="flex flex-wrap gap-1 sm:ml-auto" aria-label="Navigasi utama">
          {MENU.map(m => m.href ? (
            <Link key={m.label} href={m.href}
                  className={`px-3 min-h-[44px] inline-flex items-center rounded-md text-sm ${
                    lokasi === m.href ? 'bg-emas text-[#1E1A10] font-semibold' : 'text-teks hover:bg-garis'}`}>
              {m.label}
            </Link>
          ) : (
            <span key={m.label} title={`Dibuat pada tahap ${m.tahap}`}
                  className="px-3 min-h-[44px] inline-flex items-center gap-1.5 rounded-md text-sm text-redup/60 cursor-not-allowed">
              {m.label}
              <span className="text-[10px] rounded border border-garis px-1 py-px">tahap {m.tahap}</span>
            </span>
          ))}
        </nav>
      </div>
    </header>
  );
}
