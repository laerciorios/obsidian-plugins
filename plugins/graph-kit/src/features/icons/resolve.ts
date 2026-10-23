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

/** A vault SVG file (Folder Style's third kind of symbol): its own colors, or one color with `tint`. */
export type SvgIcon = { kind: 'svg'; value: string; tint: boolean };

/** What a node can show: an icon of the rules and properties, or a Folder Style SVG. */
export type NodeIconSpec = IconSpec | SvgIcon;

/** Folder Style's symbols by folder path, from its data.json; null when the format is not recognized. */
export type FolderSymbols = Record<string, NodeIconSpec>;

export function readFolderStyleSymbols(data: unknown): FolderSymbols | null {
	if (!isRecord(data) || !isRecord(data.folders)) return null;
	const symbols: FolderSymbols = {};
	for (const [path, style] of Object.entries(data.folders)) {
		if (!isRecord(style) || !isRecord(style.symbol)) continue;
		const { kind, value, tint } = style.symbol;
		if (typeof value !== 'string' || value.trim() === '') continue;
		if (kind === 'text' || kind === 'lucide') symbols[path] = { kind, value: value.trim() };
		// The path is kept as written: it is a vault path, not trimmed text.
		else if (kind === 'svg') symbols[path] = { kind, value, tint: tint === true };
	}
	return symbols;
}

/** The SVG files the symbols use, once each. */
export function folderSvgPaths(symbols: FolderSymbols): string[] {
	return [...new Set(Object.values(symbols).flatMap((symbol) => (symbol.kind === 'svg' ? [symbol.value] : [])))];
}

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

/**
 * A vault SVG as a square `size` image for a node texture: the file goes in an `<image>` (so its
 * own size and viewBox do not matter) and, with `tint`, through a filter that turns every drawn
 * pixel white, for the sprite to tint like a Lucide icon.
 */
export function svgIconMarkup(svg: string, size: number, tint: boolean): string {
	const root = /<svg\b[^>]*>/i.exec(svg);
	const file = root && !/\sxmlns\s*=/.test(root[0]) ? `${svg.slice(0, root.index + 4)} xmlns="${SVG_NAMESPACE}"${svg.slice(root.index + 4)}` : svg;
	const href = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(file)}`;
	const filter = tint
		? '<defs><filter id="white"><feFlood flood-color="#ffffff"/><feComposite in2="SourceAlpha" operator="in"/></filter></defs>'
		: '';
	const image = `<image href="${href}" width="${size}" height="${size}" preserveAspectRatio="xMidYMid meet"${tint ? ' filter="url(#white)"' : ''}/>`;
	return `<svg xmlns="${SVG_NAMESPACE}" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${filter}${image}</svg>`;
}

/** The symbol of the nearest folder (the note's own, then its parents) that has one. */
export function folderSymbol(folder: string, symbols: FolderSymbols): NodeIconSpec | null {
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
export function iconFor(config: IconsConfig, facts: NoteFacts, isLucide: IsLucide, folders: FolderSymbols | null): NodeIconSpec | null {
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
