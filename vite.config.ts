import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        'src/sidepanel/index': 'src/sidepanel/index.html',
        serviceWorker: 'src/background/serviceWorker.ts',
      },
      output: {
        entryFileNames: (chunkInfo) =>
          chunkInfo.name === 'serviceWorker' ? 'serviceWorker.js' : 'assets/[name]-[hash].js',
      },
    },
  },
});
