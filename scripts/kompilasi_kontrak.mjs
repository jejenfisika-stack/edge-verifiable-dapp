// Kompilasi contracts/JangkarEdge.sol dengan solc 0.8.26 (solc-js, tanpa internet).
// Hasil: lib/JangkarEdge.abi.json (dipakai dApp) dan contracts/build/JangkarEdge.json.
// Setelan HARUS sama dengan Remix saat deploy: compiler 0.8.26, optimizer ON 200 runs, EVM cancun.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
const solc = createRequire(import.meta.url)('solc');

const sumber = readFileSync(new URL('../contracts/JangkarEdge.sol', import.meta.url), 'utf8');
const masukan = {
  language: 'Solidity',
  sources: { 'JangkarEdge.sol': { content: sumber } },
  settings: {
    optimizer: { enabled: true, runs: 200 },
    evmVersion: 'cancun',
    outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object', 'evm.deployedBytecode.object', 'evm.gasEstimates', 'storageLayout'] } },
  },
};
const keluaran = JSON.parse(solc.compile(JSON.stringify(masukan)));
const pesan = keluaran.errors || [];
pesan.forEach(e => console.log(`${e.severity.toUpperCase()}: ${e.formattedMessage}`));
if (pesan.some(e => e.severity === 'error')) process.exit(1);

const k = keluaran.contracts['JangkarEdge.sol'].JangkarEdge;
mkdirSync(new URL('../contracts/build/', import.meta.url), { recursive: true });
writeFileSync(new URL('../contracts/build/JangkarEdge.json', import.meta.url),
  JSON.stringify({ compiler: solc.version(), settings: masukan.settings, abi: k.abi,
                   bytecode: '0x' + k.evm.bytecode.object, deployedBytecode: '0x' + k.evm.deployedBytecode.object,
                   storageLayout: k.storageLayout.storage.map(s => ({ label: s.label, slot: s.slot, offset: s.offset, type: s.type })) }, null, 2));
console.log('tata letak storage:', k.storageLayout.storage.map(s => `${s.label}@${s.slot}`).join(', '));
writeFileSync(new URL('../lib/JangkarEdge.abi.mjs', import.meta.url),
  `// Dibuat oleh scripts/kompilasi_kontrak.mjs — jangan diubah tangan\nexport default ${JSON.stringify(k.abi, null, 2)};\n`);
console.log(`solc ${solc.version()}`);
console.log(`peringatan: ${pesan.filter(e => e.severity === 'warning').length}`);
console.log(`ukuran bytecode runtime: ${k.evm.deployedBytecode.object.length / 2} byte (batas 24.576)`);
console.log('perkiraan gas:', JSON.stringify(k.evm.gasEstimates.external, null, 1));
