/**
 * Reduce markdown prose to the text a reader sees. Marks without letters
 * (`#`, `-`, `>`, `|`, `==`, `**`) need no rule: the word counter skips them.
 */

/** "[[folder/note#Heading]]" reads as "note Heading"; block references are not shown. */
function linkText(target: string): string {
	const [path = '', ...subpaths] = target.split('#');
	const name = path.split('/').pop() ?? '';
	const headings = subpaths.filter((part) => !part.startsWith('^'));
	return [name, ...headings].join(' ');
}

type Replacer = string | ((match: string, ...groups: string[]) => string);

const RULES: [RegExp, Replacer][] = [
	// Embeds and images show their content, not words: ![[note]], ![alt](image.png).
	[/!\[\[[^\]\n]*\]\]/g, ' '],
	[/!\[[^\]\n]*\]\([^)\n]*\)/g, ' '],
	// Links count by their visible text.
	[/\[\[([^\]|\n]*)(?:\|([^\]\n]*))?\]\]/g, (_match, target = '', alias?: string) => ` ${alias ?? linkText(target)} `],
	[/\[([^\]\n]*)\]\([^)\n]*\)/g, ' $1 '],
	[/\b(?:https?|ftp|file|obsidian):\/\/[^\s<>)\]]+/gi, ' '],
	[/\bwww\.[^\s<>)\]]+/gi, ' '],
	// HTML tags and entities; the text between tags stays.
	[/<\/?[a-z][^>\n]*>/gi, ' '],
	[/&(?:#\d+|#x[\da-f]+|[a-z]+);/gi, ' '],
	// Callout type ("> [!note]- Title" keeps the title), footnote markers, block ids, task boxes.
	[/\[![^\]\n]*\][+-]?/g, ' '],
	[/\[\^[^\]\n]*\]:?/g, ' '],
	[/(^|\s)\^[\w-]+[ \t]*$/gm, '$1'],
	[/^([ \t>]*(?:[-*+]|\d+[.)])[ \t]+)\[.\]/gm, '$1'],
];

export function cleanProse(text: string): string {
	let out = text;
	for (const [pattern, replacer] of RULES) {
		out = out.replace(pattern, replacer as string);
	}
	return out;
}
