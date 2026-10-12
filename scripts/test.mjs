// Unit tests of a plugin. Run from the plugin folder (cwd = plugins/<id>), like the build:
//   node ../../scripts/test.mjs        (pnpm --filter <id> test, or pnpm test for every plugin)
//
// Every test/**/*.test.ts is bundled by esbuild, so plugin imports resolve as in the build, with
// `obsidian` replaced by scripts/test-obsidian.mjs (Obsidian only exists inside the app), then run
// by Node's own test runner (node:test, node:assert). No test dependencies. A plugin without a
// test folder passes with nothing to run.
import esbuild from 'esbuild';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import process from 'node:process';
import { ROOT } from './lib.mjs';

const cwd = process.cwd();
const testDir = join(cwd, 'test');
const files = existsSync(testDir)
	? readdirSync(testDir, { recursive: true })
			.filter((name) => name.endsWith('.test.ts'))
			.sort()
			.map((name) => join(testDir, name))
	: [];
if (files.length === 0) {
	console.log('No tests (test/**/*.test.ts).');
	process.exit(0);
}

const outdir = mkdtempSync(join(tmpdir(), 'obsidian-plugins-test-'));
try {
	await esbuild.build({
		entryPoints: files,
		outdir,
		outbase: testDir,
		outExtension: { '.js': '.mjs' },
		bundle: true,
		platform: 'node',
		format: 'esm',
		target: 'node22',
		sourcemap: 'inline',
		alias: { obsidian: join(ROOT, 'scripts', 'test-obsidian.mjs') },
		logLevel: 'warning',
	});
	const outputs = files.map((file) => join(outdir, relative(testDir, file).replace(/\.ts$/, '.mjs')));
	const run = spawnSync(process.execPath, ['--enable-source-maps', '--test', '--test-reporter=spec', ...outputs], { stdio: 'inherit' });
	process.exitCode = run.status ?? 1;
} finally {
	rmSync(outdir, { recursive: true, force: true });
}
