import { createRequire } from 'module';
const require = createRequire(import.meta.url);
// Token-backed colours generated from the VoltLab v2 design system (src/styles/tokens.css).
const tokenColors = require('./src/styles/tokenColors.cjs');

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
        ...tokenColors,
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', '"Segoe UI"', 'system-ui', 'sans-serif'],
        display: ['"Barlow Semi Condensed"', '"Arial Narrow"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      borderRadius: {
        xs: '2px',
        device: '3px',
        sm: '4px',
        md: '6px',
        lg: '10px',
      },
      boxShadow: {
        1: 'var(--shadow-1)',
        2: 'var(--shadow-2)',
        focus: 'var(--focus-ring)',
      },
    },
  },
  plugins: [],
}
