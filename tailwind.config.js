/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        cream: {
          50: '#fcfbfa',
          100: '#faf8f5',
          200: '#f4f0eb',
          300: '#eadecf',
          400: '#dec7b0',
        },
        stonecard: {
          bg: '#ffffff',
          border: '#f1ede8',
          subtle: '#faf8f5',
          text: '#1c1917',
          muted: '#78716c',
        },
        electric: {
          phase: '#dc2626',
          neutral: '#2563eb',
          earth: '#16a34a',
          switched: '#d97706',
          busbar: '#ca8a04',
          trip: '#e11d48'
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        serif: ['Charter', 'Georgia', 'Cambria', 'serif']
      }
    },
  },
  plugins: [],
}
