// Akses Polygon Amoy di SERVER: baca kontrak JangkarEdge & kirim transaksi relayer.
// Kunci relayer (RELAYER_PRIVATE_KEY) hanya ada di environment server.
import { Contract, FallbackProvider, JsonRpcProvider, Network, Wallet, formatEther, isAddress } from 'ethers';
import ABI from './JangkarEdge.abi.mjs';

export const CHAIN_ID = 80002;
export const PENJELAJAH = 'https://amoy.polygonscan.com';
// rpc-amoy.polygon.technology sudah tidak aktif (pelajaran Proyek 2) -> beberapa RPC cadangan
const RPC_BAWAAN = [
  'https://polygon-amoy-bor-rpc.publicnode.com',
  'https://polygon-amoy.drpc.org',
  'https://80002.rpc.thirdweb.com',
];
const JARINGAN = Network.from(CHAIN_ID);

let penyedia = null;
export function provider() {
  if (!penyedia) {
    const daftar = (process.env.AMOY_RPC ? [process.env.AMOY_RPC] : RPC_BAWAAN).map((url, i) => ({
      // staticNetwork: tanpa ini ethers mengulang deteksi jaringan tanpa henti saat RPC mati
      provider: new JsonRpcProvider(url, JARINGAN, { staticNetwork: JARINGAN }),
      priority: i + 1, stallTimeout: 2500, weight: 1,
    }));
    penyedia = new FallbackProvider(daftar, JARINGAN, { quorum: 1 });
  }
  return penyedia;
}

export function alamatKontrak() {
  const a = process.env.AMOY_KONTRAK;
  if (!a || !isAddress(a)) throw new Error('AMOY_KONTRAK belum diisi di environment');
  return a;
}

export function kontrakBaca() {
  return new Contract(alamatKontrak(), ABI, provider());
}

let dompet = null;
export function dompetRelayer() {
  const k = process.env.RELAYER_PRIVATE_KEY;
  if (!k) throw new Error('RELAYER_PRIVATE_KEY belum diisi di environment');
  if (!dompet) dompet = new Wallet(k, provider());
  return dompet;
}

export function kontrakTulis() {
  return new Contract(alamatKontrak(), ABI, dompetRelayer());
}

// Ringkasan relayer untuk ditampilkan (alamat & saldo; kunci TIDAK pernah keluar)
export async function infoRelayer() {
  const w = dompetRelayer();
  const saldo = await provider().getBalance(w.address);
  return { alamat: w.address, saldoPol: Number(formatEther(saldo)) };
}

// Nama galat kontrak (custom error) dari objek galat ethers, bila ada
export function namaGalat(e) {
  return e?.revert?.name || e?.info?.error?.message || e?.shortMessage || e?.message || 'galat tidak dikenal';
}
