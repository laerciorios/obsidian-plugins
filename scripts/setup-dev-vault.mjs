// Prepare dev-vault/ for plugin development:
//   pnpm setup:dev-vault              -> enable every plugin in plugins/ + hot-reload, report what is missing
//   pnpm setup:dev-vault --download   -> also download Hot Reload (pjeby/hot-reload) from its GitHub release
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DEV_VAULT, PLUGINS_DIR, readJson, writeJson } from './lib.mjs';

const HOT_RELOAD_VERSION = '0.3.1';
const HOT_RELOAD_BASE = `https://github.com/pjeby/hot-reload/releases/download/${HOT_RELOAD_VERSION}`;

const obsidianDir = join(DEV_VAULT, '.obsidian');
const pluginsDir = join(obsidianDir, 'plugins');
mkdirSync(pluginsDir, { recursive: true });

const ids = existsSync(PLUGINS_DIR)
	? readdirSync(PLUGINS_DIR).filter((d) => existsSync(join(PLUGINS_DIR, d, 'manifest.json')))
	: [];

const communityPath = join(obsidianDir, 'community-plugins.json');
const enabled = new Set(readJson(communityPath, []));
enabled.add('hot-reload');
for (const id of ids) enabled.add(id);
writeJson(communityPath, [...enabled]);
console.log(`✔ community-plugins.json: ${[...enabled].join(', ')}`);

const hotReloadDir = join(pluginsDir, 'hot-reload');
const hasHotReload = existsSync(join(hotReloadDir, 'main.js'));

if (!hasHotReload && process.argv.includes('--download')) {
	mkdirSync(hotReloadDir, { recursive: true });
	for (const file of ['main.js', 'manifest.json']) {
		const res = await fetch(`${HOT_RELOAD_BASE}/${file}`);
		if (!res.ok) {
			console.error(`✖ Falha ao baixar ${file}: HTTP ${res.status}`);
			process.exit(1);
		}
		writeFileSync(join(hotReloadDir, file), Buffer.from(await res.arrayBuffer()));
	}
	console.log(`✔ Hot Reload ${HOT_RELOAD_VERSION} instalado em dev-vault/.obsidian/plugins/hot-reload`);
} else if (!hasHotReload) {
	console.log('• Hot Reload não instalado. Para baixar da release oficial:');
	console.log('    pnpm setup:dev-vault --download');
	console.log(`  (arquivos: ${HOT_RELOAD_BASE}/main.js e manifest.json)`);
} else {
	console.log('✔ Hot Reload já instalado.');
}

for (const id of ids) {
	const built = existsSync(join(pluginsDir, id, 'main.js'));
	console.log(`${built ? '✔' : '•'} ${id}: ${built ? 'build presente' : `rode \`pnpm --filter ${id} dev\``}`);
}
console.log('Abra dev-vault/ no Obsidian (Open another vault → Open folder as vault).');
