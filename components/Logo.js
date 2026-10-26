// Logo "chip dalam rantai" — koordinat & warna sama dengan gambarLogo() di firmware
// (layar pembuka ESP32). Chip = perangkat edge, simbol sinyal = IoT, rantai = blockchain.
export default function Logo({ lebar = 64, className = '' }) {
  const emas = '#F2B33D', terang = '#FFD98A', tua = '#B07A1E';
  const cincin = x => (
    <g key={x}>
      <rect x={x + 2} y={45} width={36} height={16} rx={8} fill="none" stroke={emas} strokeWidth={4} />
      <rect x={x + 8} y={44} width={24} height={1} fill={terang} />
      <rect x={x + 8} y={61} width={24} height={1} fill={tua} />
    </g>
  );
  const batang = x => (
    <g key={x}>
      <rect x={x} y={40} width={8} height={26} rx={3} fill={emas} />
      <rect x={x + 1} y={44} width={1} height={18} fill={terang} />
      <rect x={x + 6} y={44} width={1} height={18} fill={tua} />
    </g>
  );
  return (
    <svg viewBox="62 28 116 52" width={lebar} height={(lebar * 52) / 116} className={className}
         role="img" aria-label="Logo chip dalam rantai">
      {cincin(72)}{cincin(128)}{batang(66)}{batang(166)}
      {[108, 115, 122, 129].map(x => (
        <g key={x} fill="#CFD8DC"><rect x={x} y={32} width={3} height={6} /><rect x={x} y={70} width={3} height={6} /></g>
      ))}
      <rect x={104} y={37} width={32} height={34} rx={4} fill="#37474F" />
      <rect x={105.5} y={38.5} width={29} height={31} fill="none" stroke="#78909C" strokeWidth={1} />
      <rect x={111} y={44} width={18} height={20} rx={3} fill="#00897B" />
      <path d="M116.5 59 A3.5 3.5 0 0 1 123.5 59 M112.5 59 A7.5 7.5 0 0 1 127.5 59"
            fill="none" stroke="#fff" strokeWidth={1.6} />
      <circle cx={120} cy={59} r={1.5} fill="#fff" />
      <rect x={108} y={41} width={3} height={3} fill="#66BB6A" />
    </svg>
  );
}
