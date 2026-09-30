import { isGeneric } from './generic';
import { cleanName, nextCounter, patternPieces } from './pattern';
import type { PatternValues } from './pattern';
import { slugify } from './slug';

/** Longest base name produced; long originals are cut. */
const MAX_LENGTH = 200;
/** Suffix of cover names: "<slug>-cover.jpg". Data, not UI. */
export const COVER_SUFFIX = '-cover';

/** Whether "<base name>.<extension>" is already used (the caller compares case-insensitively). */
export type Taken = (fileName: string) => boolean;

export interface NameRequest {
	/** Original base name, without extension ("Pasted image 20260930101010"). */
	basename: string;
	extension: string;
	/** Slug of the note the attachment belongs to, or null when there is none. */
	note: string | null;
	/** Today, YYYY-MM-DD. */
	date: string;
	pattern: string;
	genericKeys: ReadonlySet<string>;
	taken: Taken;
	/** Base names already in the vault, for the counter. */
	basenames: Iterable<string>;
}

/** `base`, or `base-2`, `base-3`… when that name is taken. */
export function uniqueName(base: string, extension: string, taken: Taken): string {
	if (!taken(`${base}.${extension}`)) return base;
	for (let index = 2; ; index++) {
		const candidate = `${base}-${index}`;
		if (!taken(`${candidate}.${extension}`)) return candidate;
	}
}

/** The pattern name: "{note}-{n}" → "relatorio-trimestral-3". */
export function patternName(request: NameRequest): string {
	const values: PatternValues = {
		note: request.note || request.date,
		date: request.date,
		name: slugify(request.basename),
	};
	const pieces = patternPieces(request.pattern, values).map((piece) => piece.slice(0, MAX_LENGTH));
	if (pieces.length === 1) return uniqueName(pieces[0] || request.date, request.extension, request.taken);
	let counter = nextCounter(pieces, request.basenames);
	const build = (value: number) => pieces.join(String(value));
	while (request.taken(`${build(counter)}.${request.extension}`)) counter++;
	return build(counter);
}

/**
 * Base name for a new attachment: a descriptive original name is kept (only
 * characters that break links are removed); a generic one follows the pattern.
 */
export function attachmentName(request: NameRequest): string {
	const original = cleanName(request.basename).slice(0, MAX_LENGTH);
	if (original && !isGeneric(original, request.genericKeys)) {
		return uniqueName(original, request.extension, request.taken);
	}
	return patternName(request);
}

/** Whether a base name is already the cover name of the note ("<slug>-cover" or "<slug>-cover-2"). */
export function isCoverName(basename: string, slug: string): boolean {
	const prefix = `${slug}${COVER_SUFFIX}`.toLowerCase();
	const name = basename.toLowerCase();
	return name === prefix || new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-\\d+$`).test(name);
}

/** "<slug>-cover", or "-cover-2"… when taken. */
export function coverName(slug: string, extension: string, taken: Taken): string {
	return uniqueName(`${slug}${COVER_SUFFIX}`, extension, taken);
}
