import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist-standalone',
    emptyOutDir: true,
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        format: 'iife',
        name: 'VoltLabApp',
        inlineDynamicImports: true,
      },
    },
  },
});
