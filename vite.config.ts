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
        // Flatten sidepanel HTML to dist root so dist/ has no src/ subfolder.
        // This prevents accidentally loading the project root as the extension.
        const nested = 'dist/src/sidepanel/index.html';
        if (fs.existsSync(nested)) {
          fs.copyFileSync(nested, 'dist/sidepanel.html');
          fs.rmSync('dist/src', { recursive: true, force: true });
        }
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
