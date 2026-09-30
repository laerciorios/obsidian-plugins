/** Variables of the name pattern. Saved in data.json by the user: never rename. */
export const VARIABLES = ['note', 'date', 'name', 'n'] as const;

export interface PatternValues {
	/** Slug of the note the attachment belongs to (the date when there is none). */
	note: string;
	/** Today, YYYY-MM-DD. */
	date: string;
	/** Slug of the original name. */
	name: string;
}

const COUNTER = '{n}';
/** Stands for the counter while the rest of the pattern is cleaned. */
const SLOT = '\u0000';

/** Names inside `{…}` that are not variables, e.g. ["nota"] for "{nota}-{n}". */
export function unknownVariables(pattern: string): string[] {
	const names = [...pattern.matchAll(/\{([^{}]*)\}/g)].map((match) => match[1] ?? '');
	return [...new Set(names.filter((name) => !(VARIABLES as readonly string[]).includes(name)))];
}

/** Characters that break file names or links (`#`, `^`, `[`, `]`, `|`). */
const ILLEGAL = /[\\/:*?"<>|#^[\]]+/g;

/**
 * A name safe for files and links: illegal characters turned into spaces,
 * runs of spaces collapsed, no leading dot (it would hide the file).
 */
export function cleanName(text: string): string {
	return text
		.replace(ILLEGAL, ' ')
		.replace(/\s+/g, ' ')
		.replace(/^[\s.]+|[\s.]+$/g, '');
}

/**
 * The pattern with every variable but `{n}` filled in and cleaned, split
 * around the counter: "{note}-{n}" → ["relatorio-", ""]. One piece when the
 * pattern has no counter. Separators left dangling at the ends are dropped.
 */
export function patternPieces(pattern: string, values: PatternValues): string[] {
	const filled = pattern
		.split(COUNTER)
		.map((piece) => piece.replace(/\{(note|date|name)\}/g, (_match, name: keyof PatternValues) => values[name]))
		.join(SLOT);
	return filled
		.replace(ILLEGAL, ' ')
		.replace(/\s+/g, ' ')
		.replace(/^[\s._-]+|[\s._-]+$/g, '')
		.split(SLOT);
}

function escapeRegex(text: string): string {
	return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Matches base names produced by the pieces, capturing the counter. */
export function counterRegex(pieces: readonly string[]): RegExp {
	const [first = '', ...rest] = pieces.map(escapeRegex);
	const body = rest.reduce((source, piece, index) => `${source}${index === 0 ? '(\\d+)' : '\\1'}${piece}`, first);
	return new RegExp(`^${body}$`, 'i');
}

/**
 * The counter to use: one more than the highest already used by these pieces
 * (gaps are not filled, so a new file never lands between older ones).
 */
export function nextCounter(pieces: readonly string[], basenames: Iterable<string>): number {
	const regex = counterRegex(pieces);
	let highest = 0;
	for (const basename of basenames) {
		const match = regex.exec(basename);
		if (match?.[1]) highest = Math.max(highest, Number(match[1]));
	}
	return highest + 1;
}
