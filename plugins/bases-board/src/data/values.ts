import { parsePropertyId } from 'obsidian';
import type { App, BasesEntry, BasesPropertyId, TFile, Value } from 'obsidian';
import type { LinkTarget } from '../types';

const ISO_DATE = /\d{4}-\d{2}-\d{2}/;
const WIKILINK = /\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]+))?\]\]/;

interface ListLike {
	length(): number;
	get(index: number): Value;
}

/** Duck-typed ListValue check (avoids relying on runtime class exports). */
function isListValue(value: Value): value is Value & ListLike {
	const candidate = value as unknown as Partial<ListLike>;
	return typeof candidate.length === 'function' && typeof candidate.get === 'function';
}

/** Plain text of a Bases value; lists use their first item; empty/null → ''. */
export function valueText(value: Value | null): string {
	if (!value) return '';
	if (isListValue(value)) return value.length() > 0 ? valueText(value.get(0)) : '';
	if (!value.isTruthy()) return '';
	const text = value.toString().trim();
	return text === 'null' ? '' : text;
}

/** Raw frontmatter value of a note property (first item when it is a list). */
function rawFrontmatter(app: App, file: TFile, propId: BasesPropertyId): unknown {
	const { type, name } = parsePropertyId(propId);
	if (type !== 'note') return undefined;
	const raw: unknown = app.metadataCache.getFileCache(file)?.frontmatter?.[name];
	return Array.isArray(raw) ? (raw[0] as unknown) : raw;
}

/** Local date as YYYY-MM-DD. */
export function todayIso(date: Date = new Date()): string {
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${date.getFullYear()}-${month}-${day}`;
}

/** A date property as YYYY-MM-DD, from the Bases value or the raw frontmatter. */
export function dateIsoOf(app: App, entry: BasesEntry, propId: BasesPropertyId): string | null {
	const fromValue = ISO_DATE.exec(valueText(entry.getValue(propId)))?.[0];
	if (fromValue) return fromValue;
	const raw = rawFrontmatter(app, entry.file, propId);
	return typeof raw === 'string' ? (ISO_DATE.exec(raw)?.[0] ?? null) : null;
}

function lastSegment(path: string): string {
	const parts = path.split('/').filter((part) => part !== '');
	const last = parts.at(-1) ?? path;
	// Folder notes (".../Project/index") read better as the folder name.
	return last === 'index' && parts.length > 1 ? (parts.at(-2) ?? last) : last;
}

/**
 * A link property as { label, linkpath }. Prefers the alias written in the
 * wikilink ("[[path/index|slug]]" → "slug"); falls back to the target note.
 */
export function linkTargetOf(app: App, entry: BasesEntry, propId: BasesPropertyId): LinkTarget | null {
	const raw = rawFrontmatter(app, entry.file, propId);
	const text = typeof raw === 'string' && raw.trim() !== '' ? raw.trim() : valueText(entry.getValue(propId));
	if (text === '') return null;

	const match = WIKILINK.exec(text);
	const linkpath = match?.[1]?.trim();
	if (!linkpath) return { label: text, linkpath: null };

	const alias = match?.[2]?.trim();
	if (alias) return { label: alias, linkpath };

	const dest = app.metadataCache.getFirstLinkpathDest(linkpath, entry.file.path);
	return { label: lastSegment(dest ? dest.path.replace(/\.md$/, '') : linkpath), linkpath };
}
