# Panduan Tahap B — Jangkar bertanda tangan alat

Alur: ESP32 merangkai catatan per menit → tiap jam ditandatangani kunci milik alat →
`POST /api/jangkar` (relayer) → kontrak `JangkarEdge` di Polygon Amoy → halaman **Verifikasi**
mencocokkan data ThingSpeak dengan jangkar.

Langkah yang harus Anda lakukan sendiri ditandai **(Anda)**.

## 1. Deploy kontrak (Anda) — Remix + MetaMask

1. Buka remix.ethereum.org → buat file `JangkarEdge.sol` → tempel isi `contracts/JangkarEdge.sol`.
2. Tab *Solidity compiler*: versi **0.8.26**, *Advanced*: **Optimization ON, 200 runs**, EVM **cancun**
   (setelan ini sama dengan `npm run kompilasi-kontrak`, penting untuk verifikasi kode di Polygonscan).
3. Tab *Deploy*: Environment **Injected Provider – MetaMask**, jaringan **Polygon Amoy (80002)** → Deploy.
4. Catat **alamat kontrak**. Akun MetaMask yang men-deploy menjadi `pemilik`.

## 2. Dompet relayer (Anda)

Buat akun MetaMask **baru, khusus testnet** (mis. "Relayer Proyek 9"). Jangan memakai akun yang
menyimpan aset sungguhan. Isi saldo POL Amoy dari faucet.
Perkiraan biaya: ±55–60 ribu gas per jangkar → 24 jangkar per hari. Angka gas nyata dikembalikan
relayer pada tiap jangkar (`gas` di balasan) dan saldo relayer tampil di halaman Verifikasi.

## 3. Firmware v2.0 (Anda: upload)

Di `monitor_slide.ino`, bagian KONFIGURASI:

```cpp
const char* URL_RELAYER    = "https://<alamat-dapp>.vercel.app/api/jangkar";
const char* ALAMAT_KONTRAK = "0x...";   // dari langkah 1
```

Upload, lalu buka Serial Monitor (115200). Harus muncul:

```
Uji kripto: LULUS (10 langkah, cocok dengan ethers)
Alamat alat: 0x....  (daftarkan di kontrak: daftarkanPerangkat)
```

Bila muncul `Uji kripto: GAGAL di langkah N`, **jangan dipakai** — kirimkan nomor langkahnya.
Alat tidak akan menandatangani apa pun selama swa-uji gagal.

Catatan:
- Wiring v1.4 berlaku: VCC DHT22 di **S baris P27**.
- Kunci alat dibuat sekali saat pertama menyala dan disimpan di NVS (tetap ada setelah upload ulang).
  Bila flash dihapus total (*Erase All Flash*), kunci baru dibuat → alamat baru → daftarkan ulang.
- Alamat alat juga tampil di slide **BUKTI** (slide 5).

## 4. Daftarkan alat (Anda) — Remix

Di Remix (kontrak yang sudah di-deploy, akun pemilik): `daftarkanPerangkat(<alamat alat>, "EDGE COMPUTING uji")`.

## 5. Environment dApp

`.env.local` (lokal) **dan** Vercel → Settings → Environment Variables:

```
AMOY_KONTRAK=0x...          # alamat kontrak
PERANGKAT_ALAT=0x...        # alamat alat (dari Serial / slide BUKTI)
RELAYER_PRIVATE_KEY=0x...   # kunci privat akun relayer (langkah 2) — isi sendiri, jangan dibagikan
```

Lalu uji tanpa gas: `npm run uji-integrasi` → harus `SEMUA OK`
(memeriksa digest kontrak = digest dApp/firmware, tanda tangan palsu ditolak, s tinggi ditolak).

## 6. Pengamatan

Jangkar pertama terbentuk saat jam berganti (catatan pertama jam berikutnya), lalu dikirim
±5 detik kemudian. Setelah 1–2 jam, buka **Verifikasi** → jam tersebut harus berstatus **cocok**.

| Status di Verifikasi | Arti |
|---|---|
| cocok | data ThingSpeak jam itu sama persis dengan yang dicatat & ditandatangani alat |
| tidak cocok | data berbeda, atau sebagian catatan jam itu belum terkirim ke ThingSpeak |
| data hilang | ada jangkar tetapi tidak ada data di ThingSpeak (mis. channel dibersihkan) |
| belum ada jangkar | jam berjalan, jam sebelum v2.0, atau jangkar masih antre di alat |

## Uji yang sudah dijalankan (25–26 Okt 2026)

| Uji | Hasil |
|---|---|
| `npm run kompilasi-kontrak` | solc 0.8.26, 0 peringatan, 2.162 byte |
| `npm run uji-jangkar <folder data>` | 125.125 nilai nyata: teks kanonik tidak mengubah nilai; perubahan/hapus/tukar/sisip data dan tanda tangan palsu terdeteksi |
| `npm run vektor-uji` | keccak256("") dan ("abc") = nilai baku; vektor ditanam di firmware |
| Firmware v2.0 | compile tanpa peringatan, 1.162.187 byte (88 %) |
| `/api/verifikasi` | rantai per jam dari ThingSpeak; batas hari WIB tepat (5 Okt = 1.439 data, sama dengan unduhan penuh) |
| Belum: | swa-uji kripto di ESP32, kontrak di Amoy (`uji-integrasi`), jangkar pertama end-to-end |
