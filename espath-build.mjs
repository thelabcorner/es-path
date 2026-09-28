#!/usr/bin/env node
// Build the Node ESM entry, declaration files, and the single ESTC-validated
// ExtendScript artifact. ESPATH's runtime source itself has no I/O dependency.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

var ROOT = dirname(fileURLToPath(import.meta.url));
var DIST = join(ROOT, 'dist');
var ESTC = join(ROOT, '..', 'extendscript-toolchain', 'bin', 'estc.mjs');
var ENTRY = join(ROOT, 'src', 'index.ts');
var OUTFILE = join(DIST, 'espath-core.esm.mjs');

function esbuildPath() {
  var configured = process.env.ESBUILD_PATH;
  var local = join(ROOT, 'node_modules', 'esbuild', 'bin', 'esbuild');
  if (configured && existsSync(configured)) { return configured; }
  if (existsSync(local)) { return local; }
  throw new Error('esbuild not found; run npm install or set ESBUILD_PATH');
}

function runEsbuild() {
  execFileSync(process.execPath, [
    esbuildPath(), ENTRY, '--bundle', '--outfile=' + OUTFILE,
    '--format=esm', '--platform=node', '--target=es2019', '--log-level=warning'
  ], { cwd: ROOT, stdio: 'inherit' });
}

function runTypeDeclarations() {
  execFileSync(process.execPath, [
    join(ROOT, 'node_modules', 'typescript', 'bin', 'tsc'),
    '--project', join(ROOT, 'tsconfig.declarations.json')
  ], { cwd: ROOT, stdio: 'inherit' });
}

function runEstc() {
  if (!existsSync(ESTC)) {
    throw new Error('canonical ESTC not found at ' + ESTC);
  }
  execFileSync(process.execPath, [ESTC, 'build', '--config', './extendscript.estc.config.mjs'], {
    cwd: ROOT,
    stdio: 'inherit'
  });
}

mkdirSync(DIST, { recursive: true });
runEsbuild();
runTypeDeclarations();
runEstc();
console.log('[espath-build] ESM, declarations, and ESTC ExtendScript output are current');
