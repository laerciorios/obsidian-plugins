import type { Edition, SearchResult, Track } from '../types';
import { isRecord, num, positiveInt, records, str } from './guards';

/**
 * Tracklists from the album sources, as `Track[]` sorted by disc and
 * position. Titles are kept as the source gives them; a length the source
 * does not know is left out (the note shows the title only). Videos are never
 * tracks: MusicBrainz video recordings and video media (the DVD of a
 * collector's edition), iTunes music videos.
 */

/** MusicBrainz medium formats that hold videos, not the album's audio. */
const VIDEO_FORMATS: ReadonlySet<string> = new Set(['DVD', 'DVD-Video', 'Blu-ray', 'HD-DVD', 'VHS', 'VCD', 'SVCD', 'LaserDisc']);

/** True for a MusicBrainz medium that holds videos (left out of tracklists and track counts). */
export function isVideoMedium(medium: Record<string, unknown>): boolean {
	const format = str(medium.format);
	return format !== undefined && VIDEO_FORMATS.has(format);
}

/** Length in milliseconds when the source knows it. */
function lengthOf(value: unknown): number | undefined {
	const ms = num(value);
	return ms !== undefined && ms > 0 ? Math.round(ms) : undefined;
}

function track(disc: number, position: number, title: string, lengthMs: number | undefined): Track {
	return lengthMs === undefined ? { disc, position, title } : { disc, position, title, lengthMs };
}

/** Sorted by disc, then position; a repeated disc and position keeps the first. */
function sortTracks(tracks: Track[]): Track[] {
	const seen = new Set<string>();
	return tracks
		.sort((a, b) => a.disc - b.disc || a.position - b.position)
		.filter((item) => {
			const key = `${item.disc}:${item.position}`;
			if (seen.has(key)) return false;
			seen.add(key);
			return true;
		});
}

/**
 * Tracks of a MusicBrainz release (`/release/<id>?inc=recordings`): disc is
 * the medium position, position the track's position in its medium (not the
 * printed "A1"/"B2" number). The length is the track's, else its recording's.
 */
export function parseMusicBrainzTracks(json: unknown): Track[] {
	if (!isRecord(json)) return [];
	const tracks: Track[] = [];
	records(json.media).forEach((medium, index) => {
		if (isVideoMedium(medium)) return;
		const disc = positiveInt(medium.position) ?? index + 1;
		for (const item of records(medium.tracks)) {
			const recording = isRecord(item.recording) ? item.recording : {};
			if (recording.video === true) continue;
			const position = positiveInt(item.position);
			const title = str(item.title) ?? str(recording.title);
			if (position === undefined || title === undefined) continue;
			tracks.push(track(disc, position, title, lengthOf(item.length) ?? lengthOf(recording.length)));
		}
	});
	return sortTracks(tracks);
}

/** The items of an iTunes lookup, without the ones of another collection (defensive). */
function lookupItems(json: unknown, collectionId: string | undefined): Record<string, unknown>[] {
	return records(isRecord(json) ? json.results : undefined).filter((item) => {
		const id = num(item.collectionId);
		return collectionId === undefined || id === undefined || String(id) === collectionId;
	});
}

/**
 * Songs of an iTunes lookup (`/lookup?id=<collectionId>&entity=song`): the
 * first item is the collection itself, then its tracks; music videos are
 * dropped. `discNumber` defaults to 1.
 */
export function parseItunesTracks(json: unknown, collectionId?: string): Track[] {
	const tracks: Track[] = [];
	for (const item of lookupItems(json, collectionId)) {
		if (item.wrapperType !== 'track' || item.kind !== 'song') continue;
		const position = positiveInt(item.trackNumber);
		const title = str(item.trackName);
		if (position === undefined || title === undefined) continue;
		tracks.push(track(positiveInt(item.discNumber) ?? 1, position, title, lengthOf(item.trackTimeMillis)));
	}
	return sortTracks(tracks);
}

/** "1997-05-21" from Apple's "1997-05-21T07:00:00Z" (the date of the release, midnight Pacific time). */
function dayOf(value: unknown): string | undefined {
	return typeof value === 'string' ? /^(\d{4}-\d{2}-\d{2})T/.exec(value)?.[1] : undefined;
}

/**
 * The iTunes collection as an Edition, from its lookup: name, release date,
 * discs and songs (videos not counted). Without the collection in the lookup
 * (not in this store), it is built from the search result.
 */
export function itunesEdition(json: unknown, result: SearchResult): Edition {
	const items = lookupItems(json, result.externalId);
	const collection = items.find((item) => item.wrapperType === 'collection');
	const tracks = parseItunesTracks(json, result.externalId);
	const edition: Edition = {
		id: result.externalId,
		title: str(collection?.collectionName) ?? result.title,
		format: 'Digital Media',
	};
	const date = dayOf(collection?.releaseDate) ?? (result.year === undefined ? undefined : String(result.year));
	if (date !== undefined) edition.date = date;
	if (tracks.length > 0) {
		edition.discCount = new Set(tracks.map((item) => item.disc)).size;
		edition.trackCount = tracks.length;
	}
	return edition;
}
