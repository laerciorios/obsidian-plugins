/**
 * The naming rules of the vault: folders in Title Case with spaces, notes in
 * kebab-case. Pure functions, no Obsidian API.
 */

/**
 * File-name slug: lowercase, accents removed, every run of other characters
 * turned into "-", no "-" at the ends. Letters of other scripts are kept.
 * "Notas Soltas" → "notas-soltas"; "pendências" → "pendencias".
 */
export function kebabCase(text: string): string {
	return text
		.normalize('NFD')
		.replace(/\p{M}/gu, '')
		.toLowerCase()
		.replace(/[^\p{L}\p{N}]+/gu, '-')
		.replace(/^-+|-+$/g, '');
}

export function isKebabCase(basename: string): boolean {
	return basename !== '' && kebabCase(basename) === basename;
}

/** "laerciorios.com" and other domains stay as they are. */
const DOMAIN = /[\p{L}\p{N}]\.[\p{L}\p{N}]/u;
const FIRST_ALNUM = /[\p{L}\p{N}]/u;

function isUpper(char: string): boolean {
	return char !== char.toLowerCase() && char === char.toUpperCase();
}

/** A word is fine when its first letter is uppercase, it starts with a number, it is a domain or an allowed minor word. */
function wordOk(word: string, first: boolean, minorWords: ReadonlySet<string>): boolean {
	if (DOMAIN.test(word)) return true;
	const char = FIRST_ALNUM.exec(word)?.[0];
	if (char === undefined || /\p{N}/u.test(char) || isUpper(char)) return true;
	return !first && minorWords.has(word.toLowerCase());
}

/** The "_" of vocabulary folders (`_Discovery`) is not part of the name. */
function splitPrefix(name: string): [string, string] {
	const prefix = /^_*/.exec(name)?.[0] ?? '';
	return [prefix, name.slice(prefix.length)];
}

/**
 * Title Case with spaces: `Software Development`, `Data Structures & Algorithms`,
 * `PGCC006 - Análise e Projeto de Algoritmos`, `_References`, `laerciorios.com`.
 * Not: `bird watching`, `Pest_Control`, `v4`.
 */
export function isTitleCase(name: string, minorWords: ReadonlySet<string>): boolean {
	const [, rest] = splitPrefix(name);
	if (rest.includes('_')) return false;
	const words = rest.split(' ').filter(Boolean);
	return words.every((word, index) => wordOk(word, index === 0, minorWords));
}

function capitalize(word: string): string {
	const index = word.search(FIRST_ALNUM);
	if (index < 0) return word;
	return word.slice(0, index) + word.charAt(index).toUpperCase() + word.slice(index + 1);
}

/**
 * The closest Title Case name: words that already pass are kept, the others
 * get an uppercase first letter. "_" (and "-" in names without spaces)
 * become spaces: `pest_control` → `Pest Control`, `bird-watching` → `Bird Watching`.
 */
export function titleCase(name: string, minorWords: ReadonlySet<string>): string {
	const [prefix, rest] = splitPrefix(name);
	const separator = rest.includes(' ') ? /[\s_]+/ : /[\s_-]+/;
	const words = rest.split(separator).filter(Boolean);
	const fixed = words.map((word, index) => (wordOk(word, index === 0, minorWords) ? word : capitalize(word)));
	return prefix + fixed.join(' ');
}
