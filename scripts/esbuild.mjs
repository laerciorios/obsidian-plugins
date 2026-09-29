// Shared build for every plugin. Run from the plugin folder (cwd = plugins/<id>):
//   node ../../scripts/esbuild.mjs               -> watch mode (dev), writes .hotreload
//   node ../../scripts/esbuild.mjs --production  -> single minified build
//
// Output goes to <plugin>/dist/ (main.js + manifest.json + styles.css) and is then
// copied into every target vault: dev-vault/.obsidian/plugins/<id>/ plus whatever
// `pnpm link-plugin` registered in .dev-targets.json. Copying (instead of symlinking)
// keeps node_modules/src invisible to Obsidian and lets Hot Reload see real writes.
import esbuild from 'esbuild';
import { builtinModules } from 'node:module';
import { copyFileSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import { readJson, targetsFor } from './lib.mjs';

const prod = process.argv.includes('--production');
const cwd = process.cwd();
const manifest = readJson(join(cwd, 'manifest.json'));
if (!manifest?.id) {
	console.error('✖ manifest.json não encontrado. Rode este script a partir de plugins/<id>/.');
	process.exit(1);
}

const distDir = join(cwd, 'dist');
const banner = `/*
${manifest.name} v${manifest.version} — bundled by esbuild.
Source: obsidian-plugins/plugins/${manifest.id}
*/
`;

const ARTIFACTS = ['main.js', 'manifest.json', 'styles.css'];

function publish() {
	copyFileSync(join(cwd, 'manifest.json'), join(distDir, 'manifest.json'));
	const styles = join(cwd, 'styles.css');
	if (existsSync(styles)) copyFileSync(styles, join(distDir, 'styles.css'));

	for (const target of targetsFor(manifest.id)) {
		mkdirSync(target, { recursive: true });
		for (const file of ARTIFACTS) {
			const from = join(distDir, file);
			if (existsSync(from)) copyFileSync(from, join(target, file));
		}
		const marker = join(target, '.hotreload');
		if (prod) rmSync(marker, { force: true });
		else writeFileSync(marker, '');
	}
}

const copyPlugin = {
	name: 'copy-to-vaults',
	setup(build) {
		build.onEnd((result) => {
			if (result.errors.length > 0) return;
			publish();
			const time = new Date().toLocaleTimeString();
			console.log(`[${time}] ${manifest.id}: build ok → ${targetsFor(manifest.id).length} vault(s)`);
		});
	},
};

mkdirSync(distDir, { recursive: true });

const context = await esbuild.context({
	banner: { js: banner },
	entryPoints: ['src/main.ts'],
	bundle: true,
	external: [
		'obsidian',
		'electron',
		'@codemirror/autocomplete',
		'@codemirror/collab',
		'@codemirror/commands',
		'@codemirror/language',
		'@codemirror/lint',
		'@codemirror/search',
		'@codemirror/state',
		'@codemirror/view',
		'@lezer/common',
		'@lezer/highlight',
		'@lezer/lr',
		...builtinModules,
	],
	format: 'cjs',
	target: 'es2021',
	logLevel: 'info',
	sourcemap: prod ? false : 'inline',
	treeShaking: true,
	outfile: join(distDir, 'main.js'),
	minify: prod,
	plugins: [copyPlugin],
});

if (prod) {
	await context.rebuild();
	await context.dispose();
} else {
	await context.watch();
}
