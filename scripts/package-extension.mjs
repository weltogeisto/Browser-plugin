import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const projectRoot = process.cwd();
const distDir = path.resolve(projectRoot, 'dist');
const outputFileName = 'model-judge-mvp-extension.zip';
const outputPath = path.resolve(projectRoot, outputFileName);

if (!fs.existsSync(distDir)) {
  console.error('dist/ not found. Run `npm run build` before packaging.');
  process.exit(1);
}

const filesInDist = fs.readdirSync(distDir);
if (filesInDist.length === 0) {
  console.error('dist/ is empty. Run `npm run build` before packaging.');
  process.exit(1);
}

if (fs.existsSync(outputPath)) {
  fs.rmSync(outputPath, { force: true });
}

const zipCheck = spawnSync('zip', ['-v'], { stdio: 'ignore' });
if (zipCheck.status !== 0) {
  console.error('`zip` command not found. Install zip and re-run `npm run release:package-extension`.');
  process.exit(1);
}

const zipResult = spawnSync('zip', ['-r', outputPath, '.'], {
  cwd: distDir,
  stdio: 'inherit',
});

if (zipResult.status !== 0) {
  process.exit(zipResult.status ?? 1);
}

console.log(`Created ${outputFileName} from dist/.`);
