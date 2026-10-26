# dApp Proyek 9 — Verifiable Edge Blockchain

Dashboard dan audit mutu data dari alat ESP32 "EDGE COMPUTING" (ThingSpeak channel 3516633).
Terpisah dari dApp Proyek 2 (io-t-kopi-web3).

| Tahap | Isi | Status |
|---|---|---|
| A | Dashboard (nilai terakhir, grafik 24 jam, kejadian) + Mutu Data (kriteria K1–K6) | selesai |
| B | Kontrak Polygon Amoy, firmware v2.0 menandatangani data, relayer, halaman Verifikasi | kode selesai; menunggu deploy kontrak — lihat `PANDUAN_TAHAP_B.md` |
| C | ANN di ESP32, commit-reveal prakiraan, halaman Prakiraan (MAE) | belum |

## Menjalankan di komputer

```bash
npm install
cp .env.local.example .env.local   # lalu isi THINGSPEAK_READ_KEY
npm run dev                        # http://localhost:3009
```

## Deploy ke Vercel

1. Unggah folder ini ke repo GitHub baru (`.env.local` tidak ikut — sudah di `.gitignore`).
2. Vercel → Add New Project → pilih repo → Framework: Next.js.
3. Settings → Environment Variables: `THINGSPEAK_CHANNEL_ID` dan `THINGSPEAK_READ_KEY`.

Read key hanya dipakai di API route (`app/api/*`) dan tidak pernah dikirim ke browser.
Cache data bawaan Next.js sengaja tidak dipakai untuk ThingSpeak: halaman 8.000 entri > 2 MB,
dan saat gagal menyimpan cache Next.js menulis URL lengkap (beserta key) ke log server.

## Kecocokan dengan notebook Colab

`lib/audit.mjs` adalah port dari `analisis/Audit_Data_Uji_Coba_Proyek9.ipynb` dengan definisi identik.
Uji kecocokan pada data nyata (unduhan feeds.json 2–20 Okt 2026):

```bash
npm run uji-audit -- <folder berisi ts_sampel.json & ts_sampel2.json>
```

Hasil 25 Okt 2026: semua 36 pembanding cocok (seluruh data = hasil Colab; 3–12 Okt = kunci jawaban independen).
Bila definisi audit diubah, ubah notebook DAN `lib/audit.mjs` bersamaan, lalu jalankan uji ini lagi.
