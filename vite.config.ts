import fs from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-extension-manifest',
      writeBundle() {
        fs.copyFileSync('manifest.json', 'dist/manifest.json');
      },
    },
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        sidepanel: 'src/sidepanel/index.html',
        serviceWorker: 'src/background/serviceWorker.ts',
      },
      output: {
        entryFileNames: (chunkInfo) => (chunkInfo.name === 'serviceWorker' ? 'serviceWorker.js' : 'assets/[name]-[hash].js'),
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
});
