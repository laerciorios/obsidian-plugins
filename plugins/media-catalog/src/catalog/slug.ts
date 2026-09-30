/** Used when a title has no letters or digits at all ("???"). */
const FALLBACK_SLUG = 'untitled';

/**
 * File-name slug of a title, as the catalog names its notes: lowercase,
 * accents removed, every run of other characters turned into "-", no "-" at
 * the ends. "Assassin's Creed: Renascença" → "assassin-s-creed-renascenca",
 * "2048.0" → "2048-0". Letters of other scripts are kept.
 */
export function slugify(title: string): string {
	const slug = title
		.toLowerCase()
		.normalize('NFD')
		.replace(/\p{M}/gu, '')
		.replace(/[^\p{L}\p{N}]+/gu, '-')
		.replace(/^-+|-+$/g, '');
	return slug || FALLBACK_SLUG;
}

/** True when the text has a letter or digit, i.e. its slug is not the "untitled" fallback. */
export function hasSlug(text: string): boolean {
	return /[\p{L}\p{N}]/u.test(text);
}

/** Suffix of a series note: 1 → "-s01", 12 → "-s12". */
export function seasonSuffix(season: number): string {
	return `-s${String(season).padStart(2, '0')}`;
}
