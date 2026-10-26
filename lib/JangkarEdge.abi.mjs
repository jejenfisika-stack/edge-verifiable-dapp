// Dibuat oleh scripts/kompilasi_kontrak.mjs — jangan diubah tangan
export default [
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [],
    "name": "AlamatNol",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "BukanPemilik",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "JamBelumBerakhir",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "JangkarKosong",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "rantaiTersimpan",
        "type": "bytes32"
      }
    ],
    "name": "JangkarSudahAda",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "PerangkatTidakTerdaftar",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "TandaTanganTidakSah",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "perangkat",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "uint32",
        "name": "jam",
        "type": "uint32"
      },
      {
        "indexed": false,
        "internalType": "uint16",
        "name": "jumlah",
        "type": "uint16"
      },
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "rantai",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "pengirim",
        "type": "address"
      }
    ],
    "name": "JangkarDicatat",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "lama",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "baru",
        "type": "address"
      }
    ],
    "name": "PemilikDiganti",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "perangkat",
        "type": "address"
      }
    ],
    "name": "PerangkatDicabut",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "perangkat",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "nama",
        "type": "string"
      }
    ],
    "name": "PerangkatDidaftarkan",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "TOLERANSI_DETIK",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "VERSI",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "perangkat",
        "type": "address"
      }
    ],
    "name": "cabutPerangkat",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "perangkat",
        "type": "address"
      },
      {
        "internalType": "uint32",
        "name": "jam",
        "type": "uint32"
      },
      {
        "internalType": "uint16",
        "name": "jumlah",
        "type": "uint16"
      },
      {
        "internalType": "bytes32",
        "name": "rantai",
        "type": "bytes32"
      },
      {
        "internalType": "uint8",
        "name": "v",
        "type": "uint8"
      },
      {
        "internalType": "bytes32",
        "name": "r",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "s",
        "type": "bytes32"
      }
    ],
    "name": "catatJangkar",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "perangkat",
        "type": "address"
      },
      {
        "internalType": "string",
        "name": "nama",
        "type": "string"
      }
    ],
    "name": "daftarkanPerangkat",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "perangkat",
        "type": "address"
      },
      {
        "internalType": "uint32",
        "name": "jam",
        "type": "uint32"
      },
      {
        "internalType": "uint16",
        "name": "jumlah",
        "type": "uint16"
      },
      {
        "internalType": "bytes32",
        "name": "rantai",
        "type": "bytes32"
      }
    ],
    "name": "digestJangkar",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "baru",
        "type": "address"
      }
    ],
    "name": "gantiPemilik",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "pemilik",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "perangkatTerdaftar",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      },
      {
        "internalType": "uint32",
        "name": "",
        "type": "uint32"
      }
    ],
    "name": "rantaiJangkar",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalJangkar",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];
