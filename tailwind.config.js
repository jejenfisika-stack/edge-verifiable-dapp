/** @type {import('tailwindcss').Config} */
// Warna mengikuti layar ESP32 (monitor_slide): kepala emas #C9A84C, latar gelap hangat
module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        latar:  '#0F0D08',
        panel:  '#1A1710',
        garis:  '#2E2A1E',
        teks:   '#EDE6D3',
        redup:  '#A89F88',
        emas:   { DEFAULT: '#C9A84C', tua: '#8C6E2A', terang: '#FFD98A' },
        baik:   { DEFAULT: '#4ADE80', tua: '#14532D' },
        gagal:  { DEFAULT: '#F87171', tua: '#8B1A1A' },
        netral: '#5C4A1E',
      },
      fontFamily: {
        sans: ['"Segoe UI"', 'system-ui', '-apple-system', 'Roboto', 'Arial', 'sans-serif'],
        mono: ['"Cascadia Mono"', 'Consolas', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
}
