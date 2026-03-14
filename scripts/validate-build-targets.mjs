import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const distDir = path.resolve(projectRoot, 'dist');
const manifestPath = path.resolve(projectRoot, 'manifest.json');

if (!fs.existsSync(manifestPath)) {
  console.error('manifest.json not found.');
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const requiredTargets = [
  manifest.background?.service_worker,
  manifest.side_panel?.default_path,
].filter(Boolean);

const missingTargets = requiredTargets.filter((target) => !fs.existsSync(path.resolve(distDir, target)));

if (missingTargets.length > 0) {
  console.error('Missing required extension build targets in dist/:');
  for (const target of missingTargets) {
    console.error(`- ${target}`);
  }
  process.exit(1);
}

console.log('Verified manifest build targets in dist/:');
for (const target of requiredTargets) {
  console.log(`- ${target}`);
}

// Verify sidepanel.html uses relative asset paths (absolute paths break Chrome extensions)
const sidepanelPath = path.resolve(distDir, 'sidepanel.html');
if (fs.existsSync(sidepanelPath)) {
  const html = fs.readFileSync(sidepanelPath, 'utf8');
  const absoluteRefs = html.match(/(?:src|href)=["']\/[^"']+["']/g);
  if (absoluteRefs) {
    console.error('\nFATAL: sidepanel.html contains absolute asset paths that break Chrome extensions:');
    for (const ref of absoluteRefs) {
      console.error(`  ${ref}`);
    }
    console.error('Fix: set base: "./" in vite.config.ts');
    process.exit(1);
  }
  console.log('- sidepanel.html asset paths OK (relative)');
}

// Verify dist/manifest.json exists and is valid JSON
const distManifestPath = path.resolve(distDir, 'manifest.json');
if (!fs.existsSync(distManifestPath)) {
  console.error('\nFATAL: dist/manifest.json is missing. The build plugin may have failed.');
  process.exit(1);
}
try {
  JSON.parse(fs.readFileSync(distManifestPath, 'utf8'));
  console.log('- dist/manifest.json OK');
} catch {
  console.error('\nFATAL: dist/manifest.json is not valid JSON.');
  process.exit(1);
}
