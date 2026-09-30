import { parse } from '../syntax';

/** A `pseudo` block of a note, with the numbers of its algorithms. */
export interface NoteBlock {
	/** 0-based lines of the opening and closing fences. */
	lineStart: number;
	lineEnd: number;
	/** Number of the first captioned algorithm of the block. */
	first: number;
	/** How many algorithms of the block have a caption (and so a number). */
	captions: number;
	/** `\label` → algorithm number. */
	labels: Map<string, number>;
}

export const BLOCK_LANGUAGE = 'pseudo';

const FENCE = /^[ \t]{0,3}(`{3,}|~{3,})[ \t]*([^`\s]*)/;

/** Fenced code blocks of a note: `[start, end, language, content]`. Unclosed fences run to the end. */
function fences(lines: string[]): { start: number; end: number; language: string; content: string }[] {
	const found: { start: number; end: number; language: string; content: string }[] = [];
	let i = 0;
	while (i < lines.length) {
		const open = FENCE.exec(lines[i]!);
		if (!open) {
			i++;
			continue;
		}
		const marker = open[1]!;
		const close = new RegExp(`^[ \\t]{0,3}${marker[0] === '`' ? '`' : '~'}{${marker.length},}[ \\t]*$`);
		let end = i + 1;
		while (end < lines.length && !close.test(lines[end]!)) end++;
		found.push({ start: i, end, language: open[2]!.toLowerCase(), content: lines.slice(i + 1, end).join('\n') });
		i = end + 1;
	}
	return found;
}

/** Captions and labels of a block; a block with a syntax error is read with regular expressions. */
function captionsOf(source: string): { captions: number; labels: (string | null)[] } {
	try {
		const labels: (string | null)[] = [];
		for (const algorithm of parse(source)) if (algorithm.caption) labels.push(algorithm.label);
		return { captions: labels.length, labels };
	} catch {
		const clean = source.replace(/(^|[^\\])%.*$/gm, '$1');
		const captions = (clean.match(/\\caption\b/g) ?? []).length;
		const labels = [...clean.matchAll(/\\label\s*\{([^}]*)\}/g)].map((match) => match[1]!.trim());
		return { captions, labels: labels.slice(0, captions) };
	}
}

let cache: { text: string; blocks: NoteBlock[] } | null = null;

/**
 * Number the algorithms of a note, as LaTeX does: only captioned algorithms
 * count, in the order they appear. The last note scanned is cached, since every
 * block of the note asks for the same text.
 */
export function scanNote(text: string): NoteBlock[] {
	if (cache?.text === text) return cache.blocks;
	const blocks: NoteBlock[] = [];
	let next = 1;
	for (const fence of fences(text.split('\n'))) {
		if (fence.language !== BLOCK_LANGUAGE) continue;
		const { captions, labels } = captionsOf(fence.content);
		const block: NoteBlock = { lineStart: fence.start, lineEnd: fence.end, first: next, captions, labels: new Map() };
		labels.forEach((label, index) => {
			if (label) block.labels.set(label, next + index);
		});
		next += captions;
		blocks.push(block);
	}
	cache = { text, blocks };
	return blocks;
}

/** Number and position of the algorithm with this label, if any. */
export function findLabel(text: string, label: string): { number: number; block: NoteBlock } | null {
	for (const block of scanNote(text)) {
		const number = block.labels.get(label);
		if (number !== undefined) return { number, block };
	}
	return null;
}
