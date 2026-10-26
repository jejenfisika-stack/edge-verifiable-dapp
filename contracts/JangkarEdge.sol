// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

/**
 * ============================================================
 *  JangkarEdge — jangkar data sensor yang DITANDATANGANI ALAT
 *  Proyek 9: IoT ESP32 Verifiable Edge Blockchain
 * ============================================================
 *  Tiap jam (UTC), ESP32 merangkai semua catatan per menit yang ia buat:
 *      rantai_0 = 0x00..00
 *      rantai_i = keccak256(rantai_{i-1} || keccak256(daun_i))
 *      daun_i   = "YYYY-MM-DDTHH:MM:SSZ|f1|f2|...|f8"  (teks kanonik, lihat lib/jangkar.mjs)
 *  lalu menandatangani ringkasan jam itu dengan kunci secp256k1 miliknya
 *  (kunci dibuat & disimpan di alat, tidak pernah keluar dari alat).
 *
 *  Siapa pun boleh mengirim transaksi (biasanya relayer di server dApp), tetapi
 *  kontrak HANYA menerima jangkar yang tanda tangannya cocok dengan alamat
 *  perangkat yang didaftarkan pemilik. Relayer tidak dapat memalsukan data.
 *
 *  Yang ditandatangani alat (tanpa awalan EIP-191):
 *      keccak256(abi.encodePacked("EDGE-JANGKAR-v1", chainid, alamat kontrak,
 *                                 perangkat, jam, jumlah, rantai))
 *  chainid & alamat kontrak mencegah tanda tangan dipakai ulang di jaringan
 *  atau kontrak lain.
 *
 *  Waktu: jangkar hanya diterima untuk jam yang SUDAH BERAKHIR (toleransi
 *  5 menit untuk selisih jam alat). Dengan begitu cap waktu blok menjadi batas
 *  atas kapan data jam itu sudah ada (bukti keberadaan), dan alat tidak dapat
 *  "memesan" jam di masa depan.
 *
 *  Hemat gas: hanya `rantai` yang disimpan (1 slot). `jumlah` & pengirim ada
 *  di event; `jumlah` juga ikut ditandatangani.
 * ============================================================
 */
contract JangkarEdge {
    string public constant VERSI = "JangkarEdge 1.0";
    uint256 public constant TOLERANSI_DETIK = 300;      // selisih jam alat yang ditoleransi

    // n/2 kurva secp256k1: tanda tangan dengan s > n/2 ditolak (cegah malleability)
    uint256 private constant SETENGAH_N =
        0x7fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a0;

    address public pemilik;
    mapping(address => bool) public perangkatTerdaftar;
    // perangkat => jam (epoch UTC / 3600) => rantai; 0 = belum ada jangkar
    mapping(address => mapping(uint32 => bytes32)) public rantaiJangkar;
    uint256 public totalJangkar;

    event PemilikDiganti(address indexed lama, address indexed baru);
    event PerangkatDidaftarkan(address indexed perangkat, string nama);
    event PerangkatDicabut(address indexed perangkat);
    event JangkarDicatat(address indexed perangkat, uint32 indexed jam, uint16 jumlah, bytes32 rantai, address pengirim);

    error BukanPemilik();
    error AlamatNol();
    error PerangkatTidakTerdaftar();
    error JangkarKosong();
    error JamBelumBerakhir();
    error JangkarSudahAda(bytes32 rantaiTersimpan);
    error TandaTanganTidakSah();

    modifier hanyaPemilik() {
        if (msg.sender != pemilik) revert BukanPemilik();
        _;
    }

    constructor() {
        pemilik = msg.sender;
        emit PemilikDiganti(address(0), msg.sender);
    }

    // ── Pengelolaan (hanya pemilik) ─────────────────────────
    function gantiPemilik(address baru) external hanyaPemilik {
        if (baru == address(0)) revert AlamatNol();
        emit PemilikDiganti(pemilik, baru);
        pemilik = baru;
    }

    function daftarkanPerangkat(address perangkat, string calldata nama) external hanyaPemilik {
        if (perangkat == address(0)) revert AlamatNol();
        perangkatTerdaftar[perangkat] = true;
        emit PerangkatDidaftarkan(perangkat, nama);
    }

    // Jangkar lama tetap tersimpan; perangkat yang dicabut tidak bisa menambah jangkar baru
    function cabutPerangkat(address perangkat) external hanyaPemilik {
        perangkatTerdaftar[perangkat] = false;
        emit PerangkatDicabut(perangkat);
    }

    // ── Jangkar ─────────────────────────────────────────────
    function digestJangkar(address perangkat, uint32 jam, uint16 jumlah, bytes32 rantai)
        public view returns (bytes32)
    {
        return keccak256(abi.encodePacked("EDGE-JANGKAR-v1", block.chainid, address(this), perangkat, jam, jumlah, rantai));
    }

    function catatJangkar(
        address perangkat, uint32 jam, uint16 jumlah, bytes32 rantai,
        uint8 v, bytes32 r, bytes32 s
    ) external {
        if (!perangkatTerdaftar[perangkat]) revert PerangkatTidakTerdaftar();
        if (jumlah == 0 || rantai == bytes32(0)) revert JangkarKosong();
        // akhir jam (epoch) harus <= waktu blok + toleransi
        if ((uint256(jam) + 1) * 3600 > block.timestamp + TOLERANSI_DETIK) revert JamBelumBerakhir();
        bytes32 tersimpan = rantaiJangkar[perangkat][jam];
        if (tersimpan != bytes32(0)) revert JangkarSudahAda(tersimpan);
        if (uint256(s) > SETENGAH_N || (v != 27 && v != 28)) revert TandaTanganTidakSah();
        address penanda = ecrecover(digestJangkar(perangkat, jam, jumlah, rantai), v, r, s);
        if (penanda == address(0) || penanda != perangkat) revert TandaTanganTidakSah();

        rantaiJangkar[perangkat][jam] = rantai;
        unchecked { totalJangkar++; }
        emit JangkarDicatat(perangkat, jam, jumlah, rantai, msg.sender);
    }
}
