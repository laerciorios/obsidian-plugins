/**
 * A small Markdown reader for card text: enough to draw notes in an SVG, not a full CommonMark
 * parser. Blocks: paragraphs (single newlines break lines, as in Obsidian), headings, lists and
 * tasks, quotes and callouts, fenced code, rules and table rows. Inline: bold, italic, strike,
 * highlight, code, links, wikilinks, bare URLs, tags. Embeds show their name; HTML tags are dropped.
 */

export interface InlineStyle {
	bold?: boolean;
	italic?: boolean;
	strike?: boolean;
	highlight?: boolean;
	code?: boolean;
	/** Link target: a URL, or a note for internal links. */
	link?: string;
	internal?: boolean;
	tag?: boolean;
	/** Text standing for something not drawn (embeds). */
	muted?: boolean;
}

export interface Run {
	text: string;
	style: InlineStyle;
}

export type BlockKind = 'paragraph' | 'heading' | 'item' | 'code' | 'rule' | 'table';

export interface Block {
	kind: BlockKind;
	runs: Run[];
	/** Heading level (1–6). */
	level?: number;
	/** List nesting, from 0. */
	depth?: number;
	/** List marker as drawn: "•", "1.", "☐", "☑". */
	marker?: string;
	checked?: boolean;
	/** Blockquote nesting (0 outside quotes). */
	quote?: number;
	/** Lines of a code block. */
	lines?: string[];
}

/** A newline inside a paragraph (Obsidian keeps single line breaks). */
export const BREAK = '\n';

const ESCAPABLE = /\\([!-/:-@[-`{-~])/g;
const ESCAPED = /[-]/g;

function protectEscapes(text: string): string {
	return text.replace(ESCAPABLE, (_, char: string) => String.fromCharCode(0xe000 + char.charCodeAt(0)));
}

function restoreEscapes(text: string): string {
	return text.replace(ESCAPED, (char) => String.fromCharCode(char.charCodeAt(0) - 0xe000));
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

function decodeEntities(text: string): string {
	return text.replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, (match, entity: string) => {
		if (entity.startsWith('#x') || entity.startsWith('#X')) return String.fromCodePoint(parseInt(entity.slice(2), 16));
		if (entity.startsWith('#')) return String.fromCodePoint(parseInt(entity.slice(1), 10));
		return ENTITIES[entity.toLowerCase()] ?? match;
	});
}

/** Drop HTML tags (a `<br>` becomes a line break). */
function dropHtml(text: string): string {
	return text.replace(/<br\s*\/?>/gi, BREAK).replace(/<\/?[a-z][^>]*>/gi, '');
}

/** The note title of a link target: last path segment, without ".md". */
export function linkTitle(target: string): string {
	const [path = '', ...rest] = target.split('#');
	const name = (path.split('/').pop() ?? path).replace(/\.md$/i, '');
	const heading = rest.filter(Boolean).join(' > ');
	if (!name) return heading;
	return heading ? `${name} > ${heading}` : name;
}

function fileName(target: string): string {
	const path = target.split(/[#|]/)[0] ?? target;
	return path.split('/').pop() ?? path;
}

interface Pattern {
	re: RegExp;
	make: (match: RegExpExecArray, style: InlineStyle) => Run[];
}

const PATTERNS: Pattern[] = [
	{ re: /`([^`]+)`/g, make: (m, style) => [{ text: m[1] ?? '', style: { ...style, code: true } }] },
	{
		re: /!\[\[([^\]]+)\]\]/g,
		make: (m, style) => [{ text: fileName(m[1] ?? ''), style: { ...style, muted: true, italic: true } }],
	},
	{
		re: /!\[([^\]]*)\]\(([^)]*)\)/g,
		make: (m, style) => [{ text: m[1] || fileName(m[2] ?? ''), style: { ...style, muted: true, italic: true } }],
	},
	{
		re: /\[\[([^\]]+)\]\]/g,
		make: (m, style) => {
			const [target = '', alias] = (m[1] ?? '').split('|');
			return [{ text: alias?.trim() || linkTitle(target.trim()), style: { ...style, link: target.trim(), internal: true } }];
		},
	},
	{
		re: /\[([^\]]+)\]\(<?([^)>\s]*)>?(?:\s+"[^"]*")?\)/g,
		make: (m, style) => parseRuns(m[1] ?? '', { ...style, link: m[2] ?? '' }),
	},
	{
		re: /\b(?:https?:\/\/|mailto:)[^\s<>"]+[^\s<>".,;:!?)\]'*_~]/g,
		make: (m, style) => [{ text: m[0], style: { ...style, link: m[0] } }],
	},
	{
		re: /\*\*\*(?=\S)([\s\S]*?\S)\*\*\*/g,
		make: (m, style) => parseRuns(m[1] ?? '', { ...style, bold: true, italic: true }),
	},
	{ re: /\*\*(?=\S)([\s\S]*?\S)\*\*/g, make: (m, style) => parseRuns(m[1] ?? '', { ...style, bold: true }) },
	{
		re: /(?<![\p{L}\p{N}])__(?=\S)([\s\S]*?\S)__(?![\p{L}\p{N}])/gu,
		make: (m, style) => parseRuns(m[1] ?? '', { ...style, bold: true }),
	},
	{ re: /~~(?=\S)([\s\S]*?\S)~~/g, make: (m, style) => parseRuns(m[1] ?? '', { ...style, strike: true }) },
	{ re: /==(?=\S)([\s\S]*?\S)==/g, make: (m, style) => parseRuns(m[1] ?? '', { ...style, highlight: true }) },
	{ re: /\*(?=\S)([\s\S]*?\S)\*/g, make: (m, style) => parseRuns(m[1] ?? '', { ...style, italic: true }) },
	{
		re: /(?<![\p{L}\p{N}])_(?=\S)([\s\S]*?\S)_(?![\p{L}\p{N}])/gu,
		make: (m, style) => parseRuns(m[1] ?? '', { ...style, italic: true }),
	},
	{
		re: /(?<![\p{L}\p{N}_/&#])#[\p{L}\p{N}_/-]*[\p{L}_/-][\p{L}\p{N}_/-]*/gu,
		make: (m, style) => [{ text: m[0], style: { ...style, tag: true } }],
	},
];

const sameStyle = (a: InlineStyle, b: InlineStyle): boolean => {
	const keys = new Set([...Object.keys(a), ...Object.keys(b)]) as Set<keyof InlineStyle>;
	for (const key of keys) if (a[key] !== b[key]) return false;
	return true;
};

function mergeRuns(runs: Run[]): Run[] {
	const out: Run[] = [];
	for (const run of runs) {
		if (run.text === '') continue;
		const last = out[out.length - 1];
		if (last && last.text !== BREAK && run.text !== BREAK && sameStyle(last.style, run.style)) last.text += run.text;
		else out.push({ text: run.text, style: run.style });
	}
	return out;
}

/** Inline Markdown of one piece of text (escapes already protected). */
function parseRuns(text: string, style: InlineStyle): Run[] {
	const runs: Run[] = [];
	let position = 0;
	while (position < text.length) {
		let best: { match: RegExpExecArray; pattern: Pattern } | null = null;
		for (const pattern of PATTERNS) {
			pattern.re.lastIndex = position;
			const match = pattern.re.exec(text);
			if (match && (!best || match.index < best.match.index)) best = { match, pattern };
		}
		if (!best) break;
		if (best.match.index > position) runs.push({ text: text.slice(position, best.match.index), style });
		runs.push(...best.pattern.make(best.match, style));
		position = best.match.index + best.match[0].length;
	}
	if (position < text.length) runs.push({ text: text.slice(position), style });
	return runs;
}

/** Inline Markdown of a piece of text: styled runs with escapes and entities resolved. */
export function parseInline(text: string, style: InlineStyle = {}): Run[] {
	const runs = parseRuns(protectEscapes(dropHtml(text)), style);
	return mergeRuns(runs.map((run) => ({ text: decodeEntities(restoreEscapes(run.text)), style: run.style })));
}

/** Lines of one paragraph: inline Markdown, with single newlines kept as breaks. */
function inlineLines(lines: string[]): Run[] {
	const runs: Run[] = [];
	lines.forEach((line, index) => {
		if (index > 0) runs.push({ text: BREAK, style: {} });
		runs.push(...parseInline(line));
	});
	return mergeRuns(runs);
}

/** Remove `%% comments %%` and `<!-- comments -->`. */
function dropComments(text: string): string {
	return text.replace(/%%[\s\S]*?%%/g, '').replace(/<!--[\s\S]*?-->/g, '');
}

/** The body of a note, without its YAML frontmatter. */
export function stripFrontmatter(text: string): string {
	const match = /^---\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/.exec(text);
	return match ? text.slice(match[0].length) : text;
}

/** The part of a note a subpath points to: a heading section (`#A#B`) or a block (`#^id`). */
export function extractSubpath(text: string, subpath: string | undefined): string {
	if (!subpath || subpath === '#') return text;
	const lines = text.split(/\r?\n/);
	const parts = subpath.split('#').filter(Boolean);
	const last = parts[parts.length - 1] ?? '';
	if (last.startsWith('^')) {
		const id = last.slice(1);
		const line = lines.find((candidate) => new RegExp(`\\s\\^${id.replace(/[^\w-]/g, '')}\\s*$`).test(candidate));
		return line ? line.replace(/\s\^[\w-]+\s*$/, '') : text;
	}
	const wanted = last.trim().toLowerCase();
	const start = lines.findIndex((line) => {
		const heading = /^\s{0,3}#{1,6}\s+(.*?)\s*#*\s*$/.exec(line);
		return heading?.[1]?.trim().toLowerCase() === wanted;
	});
	if (start < 0) return text;
	const level = /^\s{0,3}(#{1,6})/.exec(lines[start] ?? '')?.[1]?.length ?? 1;
	let end = lines.length;
	for (let i = start + 1; i < lines.length; i++) {
		const heading = /^\s{0,3}(#{1,6})\s/.exec(lines[i] ?? '');
		if (heading?.[1] && heading[1].length <= level) {
			end = i;
			break;
		}
	}
	return lines.slice(start, end).join('\n');
}

const BULLETS = ['•', '◦', '▪'];

function indentColumns(space: string): number {
	let columns = 0;
	for (const char of space) columns += char === '\t' ? 4 : 1;
	return columns;
}

/** Split a table row into cells (the outer pipes are optional). */
function tableCells(line: string): string[] {
	let row = line.trim();
	if (row.startsWith('|')) row = row.slice(1);
	if (row.endsWith('|') && !row.endsWith('\\|')) row = row.slice(0, -1);
	return row.split(/(?<!\\)\|/).map((cell) => cell.trim());
}

/** Blocks of a Markdown text. */
export function parseMarkdown(source: string): Block[] {
	const lines = dropComments(source.replace(/\r\n?/g, '\n')).split('\n');
	const blocks: Block[] = [];
	let paragraph: string[] | null = null;
	let paragraphQuote = 0;
	let listIndents: number[] = [];

	const flush = (): void => {
		if (paragraph && paragraph.length > 0) {
			blocks.push({ kind: 'paragraph', runs: inlineLines(paragraph), quote: paragraphQuote });
		}
		paragraph = null;
	};

	for (let i = 0; i < lines.length; i++) {
		let line = lines[i] ?? '';
		let quote = 0;
		for (let marker = /^ {0,3}>\s?/.exec(line); marker; marker = /^ {0,3}>\s?/.exec(line)) {
			quote++;
			line = line.slice(marker[0].length);
		}

		const fence = /^\s*(`{3,}|~{3,})/.exec(line);
		if (fence?.[1]) {
			flush();
			const close = new RegExp(`^\\s*${fence[1][0] === '`' ? '`' : '~'}{${fence[1].length},}\\s*$`);
			const code: string[] = [];
			for (i++; i < lines.length; i++) {
				const raw = lines[i] ?? '';
				const inner = quote > 0 ? raw.replace(/^(?: {0,3}>\s?)+/, '') : raw;
				if (close.test(inner)) break;
				code.push(inner);
			}
			blocks.push({ kind: 'code', runs: [], lines: code, quote });
			continue;
		}

		if (line.trim() === '') {
			flush();
			continue;
		}

		const callout = quote > 0 ? /^\[!([^\]]+)\][+-]?\s*(.*)$/.exec(line.trim()) : null;
		if (callout) {
			flush();
			const kind = callout[1] ?? '';
			const title = callout[2]?.trim() || kind.charAt(0).toUpperCase() + kind.slice(1);
			blocks.push({ kind: 'paragraph', runs: parseInline(title, { bold: true }), quote });
			continue;
		}

		const setext = /^\s{0,3}(=+|-+)\s*$/.exec(line);
		if (setext?.[1] && paragraph && paragraph.length > 0 && paragraphQuote === quote) {
			blocks.push({ kind: 'heading', level: setext[1].startsWith('=') ? 1 : 2, runs: inlineLines(paragraph), quote });
			paragraph = null;
			continue;
		}

		const heading = /^\s{0,3}(#{1,6})\s+(.*?)(?:\s+#+)?\s*$/.exec(line);
		if (heading?.[1]) {
			flush();
			listIndents = [];
			blocks.push({ kind: 'heading', level: heading[1].length, runs: parseInline(heading[2] ?? ''), quote });
			continue;
		}

		if (/^\s{0,3}([-*_])(\s*\1){2,}\s*$/.test(line)) {
			flush();
			blocks.push({ kind: 'rule', runs: [], quote });
			continue;
		}

		const item = /^(\s*)([-*+]|\d{1,9}[.)])\s+(.*)$/.exec(line);
		if (item) {
			flush();
			const columns = indentColumns(item[1] ?? '');
			while (listIndents.length > 0 && columns < (listIndents[listIndents.length - 1] ?? 0)) listIndents.pop();
			if (listIndents.length === 0 || columns > (listIndents[listIndents.length - 1] ?? 0)) listIndents.push(columns);
			const depth = listIndents.length - 1;
			let content = item[3] ?? '';
			let marker = /\d/.test(item[2] ?? '') ? (item[2] ?? '') : (BULLETS[depth % BULLETS.length] ?? '•');
			let checked: boolean | undefined;
			const task = /^\[([ xX/-])\]\s+(.*)$/.exec(content);
			if (task) {
				checked = task[1] !== ' ';
				marker = checked ? '☑' : '☐';
				content = task[2] ?? '';
			}
			const block: Block = { kind: 'item', depth, marker, runs: parseInline(content), quote };
			if (checked !== undefined) block.checked = checked;
			blocks.push(block);
			continue;
		}

		if (/^\s*\|.*\|\s*$/.test(line) || (line.includes('|') && /^\s*\|?\s*:?-{3,}/.test(lines[i + 1] ?? ''))) {
			flush();
			if (/^\s*\|?(\s*:?-{3,}:?\s*\|)+\s*:?-{0,}:?\s*\|?\s*$/.test(line)) continue;
			const runs: Run[] = [];
			tableCells(line).forEach((cell, index) => {
				if (index > 0) runs.push({ text: '  │  ', style: { muted: true } });
				runs.push(...parseInline(cell));
			});
			blocks.push({ kind: 'table', runs: mergeRuns(runs), quote });
			continue;
		}

		if (paragraph && paragraphQuote !== quote) flush();
		if (!paragraph) {
			paragraph = [];
			paragraphQuote = quote;
			// A line right after a list item without a blank line continues the item.
			const last = blocks[blocks.length - 1];
			if (last?.kind === 'item' && /^\s+/.test(line) && i > 0 && (lines[i - 1] ?? '').trim() !== '') {
				last.runs = mergeRuns([...last.runs, { text: BREAK, style: {} }, ...parseInline(line.trim())]);
				paragraph = null;
				continue;
			}
		}
		paragraph.push(line.trim());
	}
	flush();
	return blocks;
}
