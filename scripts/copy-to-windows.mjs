/**
 * Copies the built dist/ folder to the Windows Desktop so the user can load
 * the extension directly from Chrome without navigating the WSL filesystem.
 *
 * Auto-detects the Windows user home by scanning /mnt/c/Users/.
 * Usage: node scripts/copy-to-windows.mjs
 */

import fs from 'node:fs';
import path from 'node:path';

const PROJECT_ROOT = process.cwd();
const DIST_DIR = path.resolve(PROJECT_ROOT, 'dist');
const DEST_FOLDER_NAME = 'model-judge-mvp';

// ── helpers ──────────────────────────────────────────────────────────────────

function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function findWindowsDesktop() {
  const usersDir = '/mnt/c/Users';
  if (!fs.existsSync(usersDir)) return null;

  // Skip system accounts
  const skip = new Set(['Public', 'Default', 'Default User', 'All Users']);
  const candidates = fs.readdirSync(usersDir).filter((u) => !skip.has(u));

  for (const user of candidates) {
    const desktop = path.join(usersDir, user, 'Desktop');
    if (fs.existsSync(desktop)) return desktop;
  }
  return null;
}

// ── main ─────────────────────────────────────────────────────────────────────

if (!fs.existsSync(DIST_DIR)) {
  console.error('dist/ not found. Run `npm run build` first.');
  process.exit(1);
}

if (!fs.existsSync(path.join(DIST_DIR, 'manifest.json'))) {
  console.error('dist/manifest.json missing. The build may have failed.');
  process.exit(1);
}

const desktop = findWindowsDesktop();
if (!desktop) {
  console.error(
    'Could not find a Windows Desktop at /mnt/c/Users/*/Desktop.\n' +
    'Make sure you are running this inside WSL with the C: drive mounted.',
  );
  process.exit(1);
}

const dest = path.join(desktop, DEST_FOLDER_NAME);

// Remove stale copy so Chrome picks up the latest files
if (fs.existsSync(dest)) {
  fs.rmSync(dest, { recursive: true, force: true });
}

copyDirSync(DIST_DIR, dest);

const winPath = dest.replace('/mnt/c', 'C:').replaceAll('/', '\\');
console.log(`\nExtension copied to Windows Desktop:`);
console.log(`  ${winPath}`);
console.log(`\nIn Chrome: go to chrome://extensions → Load unpacked → select that folder.\n`);
