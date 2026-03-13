import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const packageJsonPath = path.resolve(projectRoot, 'package.json');
const manifestPath = path.resolve(projectRoot, 'manifest.json');

if (!fs.existsSync(packageJsonPath) || !fs.existsSync(manifestPath)) {
  console.error('package.json or manifest.json not found.');
  process.exit(1);
}

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

const packageVersion = packageJson.version;
const manifestVersion = manifest.version;

if (!packageVersion || !manifestVersion) {
  console.error('Missing version in package.json or manifest.json.');
  process.exit(1);
}

if (packageVersion !== manifestVersion) {
  console.error('Version mismatch detected:');
  console.error(`- package.json: ${packageVersion}`);
  console.error(`- manifest.json: ${manifestVersion}`);
  console.error('Update both to the same version before release.');
  process.exit(1);
}

console.log(`Version sync OK: ${manifestVersion}`);
