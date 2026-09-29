import type { SearchResult, SeasonInfo, SeasonProvider } from '../types';
import { isRecord, num, records, str, yearOf } from './guards';
import { getJson } from './http';
import { cleanQuery, finalize, imageUrl } from './results';

/**
 * Series from TVmaze (no key; limit of 20 calls per 10 s). A search is one call;
 * the season list is one call plus, only for seasons whose `episodeOrder` is
 * null (usually the one still airing), the calls that count their episodes.
 */

const API = 'https://api.tvmaze.com';
/** Above this many seasons without an episode count, one /shows/{id}/episodes call is cheaper. */
const MAX_SEASON_CALLS = 3;

interface Poster {
	coverUrl?: string;
	thumbUrl?: string;
}

function poster(image: unknown): Poster {
	if (!isRecord(image)) return {};
	const original = imageUrl(str(image.original));
	const medium = imageUrl(str(image.medium));
	return { coverUrl: original ?? medium, thumbUrl: medium ?? original };
}

/** "2008–2013", "2017–" while running, "2019" for a single year. */
function yearRange(show: Record<string, unknown>): string | undefined {
	const start = yearOf(show.premiered);
	if (start === undefined) return undefined;
	const end = yearOf(show.ended);
	if (end !== undefined) return end === start ? String(start) : `${start}–${end}`;
	return str(show.status) === 'Running' ? `${start}–` : String(start);
}

function channelName(show: Record<string, unknown>): string | undefined {
	const channel = isRecord(show.network) ? show.network : isRecord(show.webChannel) ? show.webChannel : null;
	return channel ? str(channel.name) : undefined;
}

export function parseShows(json: unknown): SearchResult[] {
	const results: SearchResult[] = [];
	for (const entry of records(json)) {
		const show = isRecord(entry.show) ? entry.show : null;
		const id = show ? num(show.id) : undefined;
		const title = show ? str(show.name) : undefined;
		if (!show || id === undefined || !title) continue;
		const meta = [channelName(show), yearRange(show)].filter((part) => part !== undefined);
		results.push({
			provider: 'tvmaze',
			externalId: String(id),
			kind: 'series',
			title,
			year: yearOf(show.premiered),
			subtitle: meta.length > 0 ? meta.join(' · ') : undefined,
			...poster(show.image),
			sourceUrl: `https://www.tvmaze.com/shows/${id}`,
		});
	}
	return finalize(results);
}

interface RawSeason {
	id: number;
	number: number;
	episodeOrder: number | undefined;
	premiereDate: unknown;
	image: unknown;
}

function parseSeasons(json: unknown): RawSeason[] {
	const seasons: RawSeason[] = [];
	for (const item of records(json)) {
		const id = num(item.id);
		const number = num(item.number);
		// Specials are episodes without a number, not a season 0; skip anything below 1 anyway.
		if (id === undefined || number === undefined || number < 1) continue;
		const order = num(item.episodeOrder);
		seasons.push({ id, number, episodeOrder: order && order > 0 ? order : undefined, premiereDate: item.premiereDate, image: item.image });
	}
	return seasons.sort((a, b) => a.number - b.number);
}

/** Regular episodes per season number. Specials have a null `number` and are not counted. */
function countRegular(json: unknown): Map<number, number> {
	const counts = new Map<number, number>();
	for (const episode of records(json)) {
		const season = num(episode.season);
		if (season === undefined || num(episode.number) === undefined) continue;
		counts.set(season, (counts.get(season) ?? 0) + 1);
	}
	return counts;
}

/** Episode counts (by season number) for the seasons TVmaze gives no `episodeOrder`. */
async function missingCounts(showId: string, seasons: RawSeason[]): Promise<Map<number, number>> {
	const missing = seasons.filter((season) => season.episodeOrder === undefined);
	if (missing.length === 0) return new Map();
	if (missing.length > MAX_SEASON_CALLS) {
		return countRegular(await getJson(`${API}/shows/${encodeURIComponent(showId)}/episodes`));
	}
	const counts = new Map<number, number>();
	// Sequential on purpose: keeps well under the rate limit.
	for (const season of missing) {
		const json = await getJson(`${API}/seasons/${season.id}/episodes`);
		const count = countRegular(json).get(season.number);
		if (count !== undefined) counts.set(season.number, count);
	}
	return counts;
}

/** Season poster, falling back to the show's; season year, falling back to the show's premiere. */
function toSeasonInfo(show: SearchResult, season: RawSeason, counted: Map<number, number>): SeasonInfo {
	const own = poster(season.image);
	const art = own.coverUrl !== undefined ? own : { coverUrl: show.coverUrl, thumbUrl: show.thumbUrl };
	return {
		id: String(season.id),
		number: season.number,
		episodes: season.episodeOrder ?? counted.get(season.number) ?? null,
		year: yearOf(season.premiereDate) ?? show.year,
		...art,
	};
}

export function createTvmaze(): SeasonProvider {
	return {
		id: 'tvmaze',
		name: 'TVmaze',
		kinds: ['series'],
		async search(query: string): Promise<SearchResult[]> {
			const cleaned = cleanQuery(query);
			if (cleaned === null) return [];
			return parseShows(await getJson(`${API}/search/shows?q=${encodeURIComponent(cleaned)}`));
		},
		async seasons(result: SearchResult): Promise<SeasonInfo[]> {
			const showId = result.externalId;
			const seasons = parseSeasons(await getJson(`${API}/shows/${encodeURIComponent(showId)}/seasons`));
			const counted = await missingCounts(showId, seasons);
			return seasons.map((season) => toSeasonInfo(result, season, counted));
		},
	};
}
