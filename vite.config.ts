import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-extension-manifest',
      writeBundle() {
        const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf-8'));
        manifest.icons = {
          '16': 'icons/icon-16.png',
          '48': 'icons/icon-48.png',
          '128': 'icons/icon-128.png',
        };
        fs.writeFileSync('dist/manifest.json', JSON.stringify(manifest, null, 2));

        fs.mkdirSync('dist/icons', { recursive: true });
        for (const size of [16, 48, 128]) {
          const iconFile = `icon-${size}.png`;
          const from = path.join('src', 'icons', iconFile);
          const to = path.join('dist', 'icons', iconFile);
          if (fs.existsSync(from)) {
            fs.copyFileSync(from, to);
          }
        }

        // Flatten sidepanel HTML to dist root so dist/ has no src/ subfolder.
        // This prevents accidentally loading the project root as the extension.
        const nested = 'dist/src/sidepanel/index.html';
        if (fs.existsSync(nested)) {
          let html = fs.readFileSync(nested, 'utf-8');
          // Rewrite asset paths: the HTML was generated for dist/src/sidepanel/
          // but lives at dist/ after flattening, so fix relative refs.
          html = html.replace(/(src|href)="\.\.\/\.\.\/assets\//g, '$1="./assets/');
          html = html.replace(/(src|href)="\.\.\/\.\.\/\.\.\//g, '$1="./');
          fs.writeFileSync('dist/sidepanel.html', html);
          fs.rmSync('dist/src', { recursive: true, force: true });
        }
      },
    },
  ],
  base: './',
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
