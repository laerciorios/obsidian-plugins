// Register a vault as a build target for a plugin.
//   pnpm link-plugin <id> <vault-path>            -> add target and copy current dist/
//   pnpm link-plugin <id> <vault-path> --remove   -> stop copying to that vault (files stay)
//   pnpm link-plugin --list                       -> show all targets
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { assertPlugin, expandHome, fail, pluginDir, readTargets, targetsFor, writeTargets } from './lib.mjs';

const args = process.argv.slice(2);

if (args.includes('--list')) {
	const targets = readTargets();
	if (Object.keys(targets).length === 0) console.log('Nenhum vault ligado (além do dev-vault).');
	for (const [id, paths] of Object.entries(targets)) {
		console.log(`${id}:`);
		for (const p of paths) console.log(`  - ${p}`);
	}
	process.exit(0);
}

const remove = args.includes('--remove');
const [id, vaultArg] = args.filter((a) => !a.startsWith('--'));
assertPlugin(id);
if (!vaultArg) fail('Uso: pnpm link-plugin <id> <caminho-do-vault> [--remove]');

const vault = resolve(expandHome(vaultArg));
if (!existsSync(join(vault, '.obsidian'))) fail(`"${vault}" não parece um vault (sem .obsidian/).`);

const target = join(vault, '.obsidian', 'plugins', id);
const targets = readTargets();
const list = new Set(targets[id] ?? []);

if (remove) {
	list.delete(target);
	targets[id] = [...list];
	if (targets[id].length === 0) delete targets[id];
	writeTargets(targets);
	console.log(`✔ ${id} não será mais copiado para ${target}`);
	console.log('  Os arquivos já copiados continuam lá; desative o plugin no Obsidian se quiser.');
	process.exit(0);
}

list.add(target);
targets[id] = [...list];
writeTargets(targets);
mkdirSync(target, { recursive: true });

const dist = join(pluginDir(id), 'dist');
let copied = 0;
for (const file of ['main.js', 'manifest.json', 'styles.css']) {
	if (existsSync(join(dist, file))) {
		copyFileSync(join(dist, file), join(target, file));
		copied++;
	}
}

console.log(`✔ ${id} ligado a ${target}`);
console.log(copied > 0 ? `  ${copied} arquivo(s) copiado(s) de dist/.` : '  dist/ vazio: rode `pnpm --filter ' + id + ' build`.');
console.log(`  Alvos atuais: ${targetsFor(id).length} (inclui o dev-vault).`);
console.log('  No Obsidian: Settings → Community plugins → habilite o plugin.');
