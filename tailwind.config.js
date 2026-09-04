/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
        },
        profit: {
          DEFAULT: '#10b981',
          light: '#34d399',
          dark: '#059669',
          bg: 'rgba(16, 185, 129, 0.12)',
        },
        loss: {
          DEFAULT: '#f43f5e',
          light: '#fb7185',
          dark: '#e11d48',
          bg: 'rgba(244, 63, 94, 0.12)',
        },
      },
      boxShadow: {
        'glow-profit': '0 0 20px -5px rgba(16, 185, 129, 0.3)',
        'glow-loss': '0 0 20px -5px rgba(244, 63, 94, 0.3)',
        'glow-brand': '0 0 25px -5px rgba(99, 102, 241, 0.35)',
      }
    },
  },
  plugins: [],
}
