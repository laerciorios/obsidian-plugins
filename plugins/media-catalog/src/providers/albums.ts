/** Helpers shared by the album sources (MusicBrainz, iTunes). */

/** Album search options, read from the settings at call time. */
export interface AlbumOptions {
	/** Include EPs besides albums. */
	includeEps: boolean;
	/** MusicBrainz: include compilations, live albums, remixes, DJ mixes and demos. */
	includeSecondary: boolean;
	/** MusicBrainz: when the Cover Art Archive has no front cover, look for one on iTunes. */
	itunesFallback: boolean;
}

/**
 * Name folded for comparisons: no accents, case or punctuation, "&" read as
 * "and", no leading "the" ("The Beatles" = "beatles", "Lô Borges" = "lo borges").
 */
export function foldName(name: string): string {
	return name
		.normalize('NFKD')
		.replace(/\p{M}/gu, '')
		.toLowerCase()
		.replace(/&/g, ' and ')
		.replace(/[^\p{L}\p{N}]+/gu, ' ')
		.trim()
		.replace(/^the /, '');
}

const TRAILING_BRACKETS = /\s*(?:\([^()]*\)|\[[^[\]]*\])\s*$/;

/** Title without trailing edition notes: "Weezer (Red Album) [Deluxe Edition]" → "Weezer". */
export function baseTitle(title: string): string {
	let base = title.trim();
	for (let match = TRAILING_BRACKETS.exec(base); match && match.index > 0; match = TRAILING_BRACKETS.exec(base)) {
		base = base.slice(0, match.index);
	}
	return base;
}

/** Same artist: equal once folded, or one credit starts with the other ("Milton Nascimento & Lô Borges" / "Milton Nascimento"). */
export function sameArtist(a: string, b: string): boolean {
	const x = foldName(a);
	const y = foldName(b);
	if (x === '' || y === '') return false;
	return x === y || x.startsWith(`${y} `) || y.startsWith(`${x} `);
}

/** 2 for the same title, 1 for the same title without edition notes, 0 otherwise. */
export function titleMatch(a: string, b: string): number {
	const x = foldName(a);
	if (x !== '' && x === foldName(b)) return 2;
	const base = foldName(baseTitle(a));
	return base !== '' && base === foldName(baseTitle(b)) ? 1 : 0;
}
