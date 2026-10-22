import { isRecord } from '../../config/reader';
import { firstMatch } from '../../rules/evaluate';
import type { NoteFacts } from '../../rules/types';
import { propertyValue } from '../../rules/values';
import type { IconSpec, IconsConfig } from './config';

/** Longest text (in characters, not UTF-16 units) still read as an icon rather than a word. */
export const MAX_TEXT_ICON = 3;

/** Whether an id names an icon Obsidian ships (Lucide), with or without the `lucide-` prefix. */
export type IsLucide = (id: string) => boolean;

/**
 * An icon from a property value: a Lucide id (`book-open`, `lucide-book-open`, `lucide:book-open`)
 * or a short text (an emoji, one to three characters). Lists use their first icon.
 */
export function iconFromValue(value: unknown, isLucide: IsLucide): IconSpec | null {
	const items = Array.isArray(value) ? value : [value];
	for (const item of items) {
		if (typeof item !== 'string') continue;
		const text = item.trim();
		if (text === '') continue;
		const id = text.replace(/^lucide[-:]/i, '').toLowerCase();
		if (/^[a-z0-9-]+$/.test(id) && isLucide(id)) return { kind: 'lucide', value: id };
		if (graphemes(text) <= MAX_TEXT_ICON) return { kind: 'text', value: text };
	}
	return null;
}

/** Characters as people count them (an emoji with modifiers is one). */
export function graphemes(text: string): number {
	const Segmenter = (Intl as { Segmenter?: new (locale?: string, options?: { granularity: 'grapheme' }) => { segment(text: string): Iterable<unknown> } }).Segmenter;
	return Segmenter ? [...new Segmenter(undefined, { granularity: 'grapheme' }).segment(text)].length : Array.from(text).length;
}

/** Folder Style's symbols by folder path, from its data.json; null when the format is not recognized. */
export type FolderSymbols = Record<string, IconSpec>;

export function readFolderStyleSymbols(data: unknown): FolderSymbols | null {
	if (!isRecord(data) || !isRecord(data.folders)) return null;
	const symbols: FolderSymbols = {};
	for (const [path, style] of Object.entries(data.folders)) {
		if (!isRecord(style) || !isRecord(style.symbol)) continue;
		const { kind, value } = style.symbol;
		if ((kind === 'text' || kind === 'lucide') && typeof value === 'string' && value.trim() !== '') symbols[path] = { kind, value: value.trim() };
	}
	return symbols;
}

/** The symbol of the nearest folder (the note's own, then its parents) that has one. */
export function folderSymbol(folder: string, symbols: FolderSymbols): IconSpec | null {
	let path = folder;
	while (path !== '') {
		const symbol = symbols[path];
		if (symbol) return symbol;
		const slash = path.lastIndexOf('/');
		path = slash === -1 ? '' : path.slice(0, slash);
	}
	return null;
}

/** A note's icon: a matching rule first, then the icon property, then (optionally) its folder's symbol. */
export function iconFor(config: IconsConfig, facts: NoteFacts, isLucide: IsLucide, folders: FolderSymbols | null): IconSpec | null {
	const rule = firstMatch(config.rules, facts);
	if (rule) {
		if ('none' in rule.effect) return null;
		if ('icon' in rule.effect) return rule.effect.icon;
		return iconFromValue(propertyValue(facts.frontmatter, rule.effect.property), isLucide);
	}
	const own = iconFromValue(propertyValue(facts.frontmatter, config.property), isLucide);
	if (own) return own;
	return config.useFolderStyle && folders ? folderSymbol(facts.folder, folders) : null;
}
