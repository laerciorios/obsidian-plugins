import type { HltbMeasure } from '../types';
import { foldName } from './albums';
import { CatalogError, HttpError } from './errors';
import { isRecord } from './guards';
import { getJson, getText, postJson } from './http';
import { PromiseCache } from './memo';
import { HltbSession, SITE_HEADERS } from './hltb-session';
import type { SearchAuth } from './hltb-session';

/**
 * HowLongToBeat: hours to beat a game, for `estimated_hours` of backlog
 * games. Search by title, pick the game by name (or alias) and year, and
 * read its three times. The endpoint and token live in ./hltb-session; this
 * module only builds the query and reads the answer.
 */

/** One game of the search, times in hours (null when HowLongToBeat has none). */
export interface HltbGame {
	id: number;
	name: string;
	/** Other names, as HowLongToBeat lists them ("Fern Road: Director's Cut, Fern Road DC"). */
	aliases: string[];
	year: number | null;
	/** "game", "dlc"…; "" when missing. */
	type: string;
	main: number | null;
	mainExtra: number | null;
	completionist: number | null;
}

/** found: one game; ambiguous: several equally good; none: no game with the title. */
export type HltbMatch = { status: 'found'; game: HltbGame } | { status: 'ambiguous'; games: HltbGame[] } | { status: 'none' };

/** A time of the answer (seconds) in hours; 0, missing and odd values are null. */
function hoursOf(seconds: unknown): number | null {
	return typeof seconds === 'number' && Number.isFinite(seconds) && seconds > 0 ? seconds / 3600 : null;
}

function textOf(value: unknown): string {
	return typeof value === 'string' ? value.trim() : '';
}

/** The games of a search answer (`data`), in its order. Entries without an id or name are skipped. */
export function parseHltb(json: unknown): HltbGame[] {
	if (!isRecord(json) || !Array.isArray(json.data)) return [];
	const games: HltbGame[] = [];
	for (const item of json.data as unknown[]) {
		if (!isRecord(item)) continue;
		const id = item.game_id;
		const name = textOf(item.game_name);
		if (typeof id !== 'number' || !name) continue;
		const year = item.release_world;
		games.push({
			id,
			name,
			aliases: textOf(item.game_alias)
				.split(',')
				.map((alias) => alias.trim())
				.filter(Boolean),
			year: typeof year === 'number' && year > 0 ? year : null,
			type: textOf(item.game_type),
			main: hoursOf(item.comp_main),
			mainExtra: hoursOf(item.comp_plus),
			completionist: hoursOf(item.comp_100),
		});
	}
	return games;
}

/** Body of the search request: the words of the title, the first page of games. */
export function searchBody(title: string, extra: Record<string, string> = {}): string {
	return JSON.stringify({
		searchType: 'games',
		searchTerms: title.trim().split(/\s+/),
		searchPage: 1,
		size: 20,
		searchOptions: {
			games: {
				userId: 0,
				platform: '',
				sortCategory: 'popular',
				rangeCategory: 'main',
				rangeTime: { min: 0, max: 0 },
				gameplay: { perspective: '', flow: '', genre: '' },
				year: '',
				modifier: '',
			},
			users: { sortCategory: 'postcount' },
			lists: { sortCategory: 'follows' },
			filter: '',
			sort: 0,
			randomizer: 0,
		},
		useCache: true,
		...extra,
	});
}

/** A title as compared: foldName, apostrophes dropped first ("Director's" = "Directors"). */
function foldTitle(title: string): string {
	return foldName(title.replace(/['’]/g, ''));
}

/**
 * The game of `title`: its name or one of its aliases equal to the title
 * once folded (case, accents and punctuation ignored: "Fern Road: Director's
 * Cut" = "Fern Road - Directors Cut"). DLCs only count without a game of
 * that title. Several left: the one of `year` when exactly one is;
 * otherwise ambiguous.
 */
export function pickGame(games: readonly HltbGame[], title: string, year: number | null): HltbMatch {
	const wanted = foldTitle(title);
	if (!wanted) return { status: 'none' };
	const named = games.filter((game) => [game.name, ...game.aliases].some((name) => foldTitle(name) === wanted));
	const full = named.filter((game) => game.type === '' || game.type === 'game');
	const candidates = full.length > 0 ? full : named;
	if (candidates.length === 0) return { status: 'none' };
	const [only] = candidates;
	if (only && candidates.length === 1) return { status: 'found', game: only };
	const ofYear = year === null ? [] : candidates.filter((game) => game.year === year);
	const [dated] = ofYear;
	if (dated && ofYear.length === 1) return { status: 'found', game: dated };
	return { status: 'ambiguous', games: candidates };
}

/** Hours of the measure chosen in the settings; null when the game has none or the setting is off. */
export function measureHours(game: HltbGame, measure: HltbMeasure): number | null {
	if (measure === 'main') return game.main;
	if (measure === 'main-extra') return game.mainExtra;
	if (measure === 'completionist') return game.completionist;
	return null;
}

/** Hours rounded to the nearest half hour (33.32 → 33.5, 33.2 → 33); null stays null. Never below 0.5. */
export function roundHalfHour(hours: number | null): number | null {
	if (hours === null || !Number.isFinite(hours) || hours <= 0) return null;
	return Math.max(0.5, Math.round(hours * 2) / 2);
}

/** The value for `estimated_hours`: measure, then rounding. */
export function estimatedHours(game: HltbGame, measure: HltbMeasure): number | null {
	return roundHalfHour(measureHours(game, measure));
}

export interface HltbClient {
	/**
	 * The game of `title` (see pickGame). Rejects on network errors
	 * (CatalogError) and a broken session. Answers are kept for 10 minutes;
	 * failures are retried.
	 */
	find(title: string, year: number | null): Promise<HltbMatch>;
}

/** The HowLongToBeat client: one session (endpoint and token) for the whole plugin. */
export function createHltb(): HltbClient {
	const session = new HltbSession({
		getJson: (url) => getJson(url, { ...SITE_HEADERS }),
		getText: (url) => getText(url, { ...SITE_HEADERS }),
	});
	const answers = new PromiseCache<HltbGame[]>({ max: 50, ttlMs: 10 * 60_000 });

	async function post(auth: SearchAuth, title: string): Promise<HltbGame[]> {
		return parseHltb(await postJson(auth.url, searchBody(title, auth.body), 'application/json', auth.headers));
	}

	async function search(title: string): Promise<HltbGame[]> {
		try {
			return await post(await session.auth(), title);
		} catch (error) {
			// An expired token: a new one, and one more try (as the site does).
			if (!(error instanceof HttpError) || error.status !== 403) throw error;
			session.invalidate();
			return post(await session.auth(), title);
		}
	}

	return {
		async find(title, year) {
			return pickGame(await answers.get(foldTitle(title), () => search(title)), title, year);
		},
	};
}

/** found with hours / none / ambiguous / failed (network, session, a game without that time). */
export type EstimateOutcome =
	| { status: 'found'; hours: number; game: HltbGame }
	| { status: 'none' }
	| { status: 'ambiguous' }
	| { status: 'no-time'; game: HltbGame }
	| { status: 'failed' };

/**
 * `estimated_hours` of a game: never rejects. Unexpected errors go to the
 * console; network errors and a broken session are "failed".
 */
export async function lookupEstimate(client: HltbClient, title: string, year: number | null, measure: HltbMeasure): Promise<EstimateOutcome> {
	try {
		const match = await client.find(title, year);
		if (match.status !== 'found') return { status: match.status };
		const hours = estimatedHours(match.game, measure);
		return hours === null ? { status: 'no-time', game: match.game } : { status: 'found', hours, game: match.game };
	} catch (error) {
		if (!(error instanceof CatalogError)) console.error('Media Catalog: HowLongToBeat lookup failed', error);
		return { status: 'failed' };
	}
}
