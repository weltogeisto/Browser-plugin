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
