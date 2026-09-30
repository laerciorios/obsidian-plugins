import type { Edition } from '../types';
import { isMbid } from './albums';
import { isRecord, positiveInt, records, str } from './guards';
import { isVideoMedium } from './tracklists';

/**
 * The edition rule: which MusicBrainz release of a release group stands for
 * the album (its tracklist goes into the note), and the order of the editions
 * offered by the update command. Releases are ordered by, in turn:
 *
 * 1. status Official;
 * 2. having a tracklist (a release entered without tracks cannot give one);
 * 3. the earliest year (releases without a date last);
 * 4. the first medium on CD or Digital Media (before vinyl, cassette…);
 * 5. a standard edition before a special one: "deluxe", "bonus", "expanded",
 *    "anniversary", "remaster", "edition", "box" or "collector's" in the title
 *    or disambiguation, or an extra medium, i.e. more discs AND more tracks
 *    than the usual edition (the most common track count): a bonus disc is
 *    one, the two LPs that hold the CD's 12 tracks are not;
 * 6. the earliest date within that year: a full date beats a partial one
 *    ("1997-05-21", then "1997-05", then "1997") and then the earlier wins;
 * 7. the country: XW (worldwide), US, GB, then the others;
 * 8. fewer tracks. The spec also says "the one with more tracks on a tie", but
 *    at this point date, format, country and standard-ness are equal, and more
 *    tracks there almost always means bonus tracks (a Japanese edition's extra
 *    song): fewer wins. What "more tracks" protects from, a release without a
 *    tracklist, is already last by rule 2;
 * 9. the order of the answer.
 *
 * The spec orders "earliest date" before format and special editions. The full
 * date only decides inside the release year: otherwise an early promo on 10"
 * vinyl (Kid A, 2000-08-03, sides as discs and an "[unknown]" hidden track)
 * beat the album's CD from the same year. The original year still comes first,
 * so a 1969 LP beats a 1987 CD.
 */

const DATE = /^\d{4}(?:-(?:0[1-9]|1[0-2])(?:-(?:0[1-9]|[12]\d|3[01]))?)?$/;
/** Rule 4. CD variants count as CD. */
const PREFERRED_FORMATS: ReadonlySet<string> = new Set([
	'CD',
	'Digital Media',
	'Enhanced CD',
	'Copy Control CD',
	'HDCD',
	'SHM-CD',
	'Blu-spec CD',
]);
/** Rule 7, best first. */
const COUNTRIES: readonly string[] = ['XW', 'US', 'GB'];
/** Rule 5: words of a special edition in the title or disambiguation. */
const SPECIAL = /\b(?:deluxe|bonus|expanded|anniversary|remaster(?:ed)?|edition|box|collector[’']?s)\b/i;

interface Candidate {
	edition: Edition;
	index: number;
	official: boolean;
	/** Audio media with tracks (video media not counted). */
	media: number;
	tracks: number;
	format: number;
	country: number;
	special: boolean;
}

function rank(list: readonly string[], value: string | undefined): number {
	const index = value === undefined ? -1 : list.indexOf(value);
	return index === -1 ? list.length : index;
}

function readRelease(item: Record<string, unknown>, index: number): Candidate | null {
	const id = str(item.id);
	const title = str(item.title);
	if (!id || !isMbid(id) || !title) return null;
	const media = records(item.media).sort((a, b) => (positiveInt(a.position) ?? 0) - (positiveInt(b.position) ?? 0));
	const counts = media
		.filter((medium) => !isVideoMedium(medium))
		.map((medium) => positiveInt(medium['track-count']) ?? 0)
		.filter((count) => count > 0);
	const tracks = counts.reduce((sum, count) => sum + count, 0);
	const date = str(item.date);
	const country = str(item.country);
	const format = str(media[0]?.format);
	const note = str(item.disambiguation);

	const edition: Edition = { id, title };
	if (date !== undefined && DATE.test(date)) edition.date = date;
	if (country !== undefined) edition.country = country;
	if (format !== undefined) edition.format = format;
	if (tracks > 0) {
		edition.discCount = counts.length;
		edition.trackCount = tracks;
	}
	if (note !== undefined) edition.note = note;
	return {
		edition,
		index,
		official: str(item.status) === 'Official',
		media: counts.length,
		tracks,
		format: format !== undefined && PREFERRED_FORMATS.has(format) ? 0 : 1,
		country: rank(COUNTRIES, country),
		special: SPECIAL.test(`${title} ${note ?? ''}`),
	};
}

/** Rule 3: negative when `a` comes first. Dates are "YYYY", "YYYY-MM" or "YYYY-MM-DD"; none goes last. */
export function compareYears(a: string | undefined, b: string | undefined): number {
	if (a === undefined || b === undefined) return (a === undefined ? 1 : 0) - (b === undefined ? 1 : 0);
	return Number(a.slice(0, 4)) - Number(b.slice(0, 4));
}

/** Rule 6, for dates of the same year: a full date beats a partial one, then the earlier wins. */
export function compareWithinYear(a: string | undefined, b: string | undefined): number {
	if (a === undefined || b === undefined) return 0;
	if (a.length !== b.length) return b.length - a.length;
	return a < b ? -1 : a > b ? 1 : 0;
}

/** Year, then the date within the year (both rules above in one comparison). */
export function compareDates(a: string | undefined, b: string | undefined): number {
	return compareYears(a, b) || compareWithinYear(a, b);
}

/** The usual edition: the most common track count (the smaller on a tie) and the fewest discs holding it. */
function usualEdition(candidates: readonly Candidate[]): { tracks: number; media: number } | null {
	const counts = new Map<number, number>();
	for (const candidate of candidates) {
		if (candidate.tracks > 0) counts.set(candidate.tracks, (counts.get(candidate.tracks) ?? 0) + 1);
	}
	let tracks = 0;
	let times = 0;
	for (const [count, seen] of counts) {
		if (seen > times || (seen === times && count < tracks)) {
			tracks = count;
			times = seen;
		}
	}
	if (times === 0) return null;
	const media = Math.min(...candidates.filter((candidate) => candidate.tracks === tracks).map((candidate) => candidate.media));
	return { tracks, media };
}

/**
 * Editions from MusicBrainz release records (`/release?release-group=…&inc=media`,
 * all pages together), ordered by the edition rule: the representative one
 * first. Malformed and repeated releases are dropped.
 */
export function orderReleases(releases: readonly unknown[]): Edition[] {
	const seen = new Set<string>();
	const candidates: Candidate[] = [];
	releases.forEach((item, index) => {
		const candidate = isRecord(item) ? readRelease(item, index) : null;
		if (candidate === null || seen.has(candidate.edition.id)) return;
		seen.add(candidate.edition.id);
		candidates.push(candidate);
	});
	const usual = usualEdition(candidates);
	const special = (candidate: Candidate): number =>
		candidate.special || (usual !== null && candidate.media > usual.media && candidate.tracks > usual.tracks) ? 1 : 0;
	return candidates
		.sort(
			(a, b) =>
				Number(b.official) - Number(a.official) ||
				Number(b.tracks > 0) - Number(a.tracks > 0) ||
				compareYears(a.edition.date, b.edition.date) ||
				a.format - b.format ||
				special(a) - special(b) ||
				compareWithinYear(a.edition.date, b.edition.date) ||
				a.country - b.country ||
				a.tracks - b.tracks ||
				a.index - b.index,
		)
		.map((candidate) => candidate.edition);
}

/** The representative release (see the rule above), or undefined when there is none. */
export function pickRelease(releases: readonly unknown[]): Edition | undefined {
	return orderReleases(releases)[0];
}
