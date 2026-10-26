import './globals.css';
import Kepala from '@/components/Kepala';

export const metadata = {
  title: 'Edge Computing — Verifiable Edge Blockchain',
  description: 'Monitoring mikroklimat kopi dari ESP32: data sensor, audit mutu data, dan (tahap berikut) bukti di blockchain.',
};

export const viewport = { width: 'device-width', initialScale: 1, themeColor: '#0F0D08' };

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body className="min-h-screen font-sans antialiased">
        <Kepala />
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
        <footer className="mx-auto max-w-6xl px-4 pb-8 pt-2 text-xs text-redup border-t border-garis mt-8">
          <p className="pt-4">
            Dikembangkan oleh Dr. Zainur Rasyid Ridlo, S.Pd., M.Pd. · Universitas Jember ·
            data: ThingSpeak channel 3516633 (ESP32 + BMP280, DHT22, BH1750, sensor tanah kapasitif, RTC DS3231)
          </p>
        </footer>
      </body>
    </html>
  );
}
