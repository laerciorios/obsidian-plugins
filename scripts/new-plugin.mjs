// Scaffold a new plugin from templates/plugin:
//   pnpm new-plugin <id> "Nome do plugin" ["Descrição curta"]
import { cpSync, existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ID_PATTERN, ROOT, fail, pluginDir } from './lib.mjs';

const [id, name, description = ''] = process.argv.slice(2);
if (!id || !name) fail('Uso: pnpm new-plugin <id> "Nome" ["Descrição"]');
if (!ID_PATTERN.test(id)) fail(`Id inválido "${id}": use kebab-case minúsculo (ex.: bases-board).`);
if (/obsidian/.test(id)) fail('O id não pode conter "obsidian" (regra do Obsidian para ids de plugin).');

const dest = pluginDir(id);
if (existsSync(dest)) fail(`plugins/${id} já existe.`);

const className = id
	.split('-')
	.map((part) => part[0].toUpperCase() + part.slice(1))
	.join('') + 'Plugin';

const replacements = {
	__ID__: id,
	__NAME__: name,
	__CLASS__: className,
	__DESCRIPTION__: description || name,
};

cpSync(join(ROOT, 'templates', 'plugin'), dest, { recursive: true });

function walk(dir) {
	for (const entry of readdirSync(dir)) {
		const path = join(dir, entry);
		if (statSync(path).isDirectory()) {
			walk(path);
			continue;
		}
		let text = readFileSync(path, 'utf8');
		for (const [key, value] of Object.entries(replacements)) text = text.replaceAll(key, value);
		writeFileSync(path, text);
	}
}
walk(dest);

// Add a row to the plugin table in the root README (between the markers).
const readmePath = join(ROOT, 'README.md');
const readme = readFileSync(readmePath, 'utf8');
const marker = '<!-- plugins:end -->';
if (readme.includes(marker)) {
	const row = `| [${name}](plugins/${id}) | \`${id}\` | ideia | ${description || '—'} |\n`;
	writeFileSync(readmePath, readme.replace(marker, row + marker));
}

console.log(`✔ plugins/${id} criado (${className}).`);
console.log('  Próximos passos:');
console.log('    pnpm install');
console.log(`    pnpm --filter ${id} dev      # build em watch, copia para o dev-vault`);
console.log('    Abra dev-vault/ no Obsidian e habilite o plugin em Community plugins.');
