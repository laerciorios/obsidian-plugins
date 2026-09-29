import type { App, TFile } from 'obsidian';
import { KINDS } from '../constants';
import type { CatalogNoteInfo, MediaKind } from '../types';

const KIND_SET: ReadonlySet<string> = new Set<string>(KINDS);

export function isKind(value: unknown): value is MediaKind {
	return typeof value === 'string' && KIND_SET.has(value);
}

/** Frontmatter number: 3 or "3" → 3; anything else → null. */
export function numberOf(value: unknown): number | null {
	if (typeof value === 'number') return Number.isFinite(value) ? value : null;
	if (typeof value === 'string' && /^\s*-?\d+(?:\.\d+)?\s*$/.test(value)) return Number(value);
	return null;
}

/** Frontmatter text: trimmed string (numbers too, e.g. `title: 1917`), or null when empty. */
export function textOf(value: unknown): string | null {
	if (typeof value === 'number' && Number.isFinite(value)) return String(value);
	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	return trimmed ? trimmed : null;
}

/**
 * `cover` as text. An unquoted `cover: [[x.jpg]]` parses as a list inside a
 * list; it is read back as the link it was meant to be.
 */
export function coverOf(value: unknown): string | null {
	if (Array.isArray(value) && value.length === 1) {
		const inner: unknown = value[0];
		if (Array.isArray(inner) && inner.length === 1) {
			const name = textOf(inner[0]);
			return name ? `[[${name}]]` : null;
		}
	}
	return textOf(value);
}

/** Frontmatter of a file from the metadata cache (no disk read). */
export function frontmatterOf(app: App, file: TFile): Record<string, unknown> | null {
	const frontmatter: Record<string, unknown> | undefined = app.metadataCache.getFileCache(file)?.frontmatter;
	return frontmatter ?? null;
}

/** Null unless the file is markdown and frontmatter.kind ∈ KINDS (any folder). */
export function readCatalogNote(app: App, file: TFile | null): CatalogNoteInfo | null {
	if (!file || file.extension !== 'md') return null;
	const frontmatter = frontmatterOf(app, file);
	const kind = frontmatter?.kind;
	if (!frontmatter || !isKind(kind)) return null;
	return {
		file,
		kind,
		title: textOf(frontmatter.title) ?? file.basename,
		season: numberOf(frontmatter.season),
		year: numberOf(frontmatter.year),
		cover: coverOf(frontmatter.cover),
	};
}
