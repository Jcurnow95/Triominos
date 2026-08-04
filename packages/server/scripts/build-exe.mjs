/**
 * Packages the server into a standalone Windows .exe using Node's built-in Single
 * Executable Application (SEA) support, with the built client shipped alongside it as a
 * `client/` folder (see findClientDist() in src/index.ts).
 *
 * Run `npm run build` at the repo root first -- this script does not build the client or
 * type-check the server, it only bundles+packages what's already in packages/client/dist.
 */
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { copyFileSync, cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.join(__dirname, '..');
const repoRoot = path.join(serverRoot, '..', '..');

const workDir = path.join(serverRoot, 'dist-exe');
const bundlePath = path.join(workDir, 'server.cjs');
const seaConfigPath = path.join(workDir, 'sea-config.json');
const blobPath = path.join(workDir, 'sea-prep.blob');

const releaseDir = path.join(repoRoot, 'release');
const exePath = path.join(releaseDir, 'Triominos.exe');
const clientDistPath = path.join(repoRoot, 'packages', 'client', 'dist');
const clientReleasePath = path.join(releaseDir, 'client');

// The sentinel fuse Node's SEA loader looks for to confirm the blob was actually
// injected (not just a guessed value -- this exact string is part of the SEA API).
const SENTINEL_FUSE = 'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2';

function step(label, fn) {
  process.stdout.write(`${label}... `);
  fn();
  console.log('done');
}

if (!existsSync(clientDistPath)) {
  console.error(`Client build not found at ${clientDistPath}.\nRun "npm run build" at the repo root first.`);
  process.exit(1);
}

step('Bundling server into a single CommonJS file', () => {
  rmSync(workDir, { recursive: true, force: true });
  mkdirSync(workDir, { recursive: true });
});

await build({
  entryPoints: [path.join(serverRoot, 'src', 'index.ts')],
  outfile: bundlePath,
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node20',
  legalComments: 'none',
});

step('Writing SEA config', () => {
  writeFileSync(
    seaConfigPath,
    JSON.stringify({ main: bundlePath, output: blobPath, disableExperimentalSEAWarning: true }, null, 2),
  );
});

step('Generating SEA blob', () => {
  execFileSync(process.execPath, ['--experimental-sea-config', seaConfigPath], { stdio: 'inherit' });
});

step('Copying the node binary to release/Triominos.exe', () => {
  mkdirSync(releaseDir, { recursive: true });
  copyFileSync(process.execPath, exePath);
});

step('Injecting the bundle into the executable', () => {
  const postjectCli = path.join(repoRoot, 'node_modules', 'postject', 'dist', 'cli.js');
  execFileSync(
    process.execPath,
    [postjectCli, exePath, 'NODE_SEA_BLOB', blobPath, '--sentinel-fuse', SENTINEL_FUSE],
    { stdio: 'inherit' },
  );
});

step('Copying the built client next to the executable', () => {
  rmSync(clientReleasePath, { recursive: true, force: true });
  cpSync(clientDistPath, clientReleasePath, { recursive: true });
});

console.log(`\nBuilt ${exePath}`);
console.log('Double-click it to start the server and open the game in your browser.');
