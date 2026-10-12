import { MAX_RESULTS, TOKEN_MARGIN_MS } from '../constants';
import type { AliasCountry } from '../constants';
import type { Provider, SearchResult } from '../types';
import { HttpError, MissingCredentialsError, UnexpectedResponseError } from './errors';
import { isRecord, num, records, str } from './guards';
import { postJson } from './http';
import { cleanQuery, credentialRefused, finalize, imageUrl, joinNames } from './results';

/**
 * Games from IGDB (Twitch). The app token comes from the client credentials
 * flow and lives only in memory, renewed before it expires or after a 401.
 * The name of a game in a country comes from its `game_localizations`, asked
 * apart from the search (one call, after the pick).
 */

export interface IgdbCredentials {
	clientId: string;
	clientSecret: string;
}

const NAME = 'IGDB';
const TOKEN_URL = 'https://id.twitch.tv/oauth2/token';
const GAMES_URL = 'https://api.igdb.com/v4/games';
const IMAGE_URL = 'https://images.igdb.com/igdb/image/upload';
const FIELDS = 'name,slug,first_release_date,cover.image_id,platforms.name,involved_companies.company.name,involved_companies.developer';
const LOCALIZATION_FIELDS = 'game_localizations.name,game_localizations.region.identifier,game_localizations.region.name';

/**
 * IGDB regions of a country, the most specific first: the country's own
 * region (a "locale"), then its continent. IGDB has locales only for these
 * countries (and New Zealand); North America and Europe stand in for the
 * others there. Countries in neither keep the title only.
 */
const LOCALE_REGIONS: Partial<Record<AliasCountry, string>> = {
	AU: 'australia',
	BR: 'brazil',
	CN: 'china',
	JP: 'japan',
	KR: 'korea',
};
const CONTINENT_REGIONS: Partial<Record<AliasCountry, string>> = {
	CA: 'north_america',
	MX: 'north_america',
	US: 'north_america',
	AT: 'europe',
	CZ: 'europe',
	DE: 'europe',
	DK: 'europe',
	ES: 'europe',
	FI: 'europe',
	FR: 'europe',
	GB: 'europe',
	GR: 'europe',
	HU: 'europe',
	IT: 'europe',
	NL: 'europe',
	NO: 'europe',
	PL: 'europe',
	PT: 'europe',
	RO: 'europe',
	RU: 'europe',
	SE: 'europe',
	TR: 'europe',
	UA: 'europe',
	TW: 'asia',
};

/** A game's name in one IGDB region. */
export interface GameLocalization {
	name: string;
	/** Keys of the region (its identifier and name, see regionKey). */
	regions: string[];
}

interface Token {
	clientId: string;
	value: string;
	expiresAt: number;
}

/** Apicalypse string literal: escape backslashes and double quotes. */
export function gamesQuery(query: string): string {
	const literal = query.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
	return `search "${literal}"; fields ${FIELDS}; limit ${MAX_RESULTS};`;
}

function cover(imageId: string | undefined, size: 't_cover_big_2x' | 't_cover_small'): string | undefined {
	if (imageId === undefined || !/^\w+$/.test(imageId)) return undefined;
	return imageUrl(`${IMAGE_URL}/${size}/${imageId}.jpg`);
}

/** `first_release_date` is unix seconds. */
function releaseYear(seconds: number | undefined): number | undefined {
	return seconds === undefined ? undefined : new Date(seconds * 1000).getUTCFullYear();
}

function developers(companies: unknown): string[] {
	return records(companies)
		.filter((entry) => entry.developer === true)
		.map((entry) => (isRecord(entry.company) ? str(entry.company.name) : undefined))
		.filter((name): name is string => name !== undefined);
}

export function parseIgdb(json: unknown): SearchResult[] {
	const results: SearchResult[] = [];
	for (const game of records(json)) {
		const id = num(game.id);
		const title = str(game.name);
		if (id === undefined || !title) continue;
		const slug = str(game.slug);
		const imageId = isRecord(game.cover) ? str(game.cover.image_id) : undefined;
		const platforms = records(game.platforms)
			.map((platform) => str(platform.name))
			.filter((name): name is string => name !== undefined);
		results.push({
			provider: 'igdb',
			externalId: String(id),
			kind: 'game',
			title,
			year: releaseYear(num(game.first_release_date)),
			subtitle: joinNames(developers(game.involved_companies)) ?? joinNames(platforms),
			coverUrl: cover(imageId, 't_cover_big_2x'),
			thumbUrl: cover(imageId, 't_cover_small'),
			sourceUrl: slug ? `https://www.igdb.com/games/${encodeURIComponent(slug)}` : undefined,
			details: { platforms },
		});
	}
	return finalize(results);
}

/** Regions to look for, in order, for `country`. */
export function igdbRegions(country: AliasCountry): string[] {
	return [LOCALE_REGIONS[country], CONTINENT_REGIONS[country]].filter((region): region is string => region !== undefined);
}

/** "North America", "north_america" or "north-america" → "north_america". */
export function regionKey(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '_')
		.replace(/^_+|_+$/g, '');
}

/** Body asking the localizations of one game (`id` is a checked number). */
export function localizationsQuery(id: string): string {
	return `fields ${LOCALIZATION_FIELDS}; where id = ${id};`;
}

/** `game_localizations` of the first game of the answer. */
export function parseLocalizations(json: unknown): GameLocalization[] {
	const game = records(json)[0];
	if (!game) return [];
	const localizations: GameLocalization[] = [];
	for (const entry of records(game.game_localizations)) {
		const name = str(entry.name);
		const region = isRecord(entry.region) ? entry.region : null;
		const keys = region ? [str(region.identifier), str(region.name)].filter((key): key is string => key !== undefined).map(regionKey) : [];
		if (name && keys.length > 0) localizations.push({ name, regions: keys });
	}
	return localizations;
}

/** Name in the first of `regions` the game has a localization for, or null. */
export function pickLocalization(localizations: readonly GameLocalization[], regions: readonly string[]): string | null {
	for (const region of regions) {
		const found = localizations.find((localization) => localization.regions.includes(region));
		if (found) return found.name;
	}
	return null;
}

export function createIgdb(credentials: () => IgdbCredentials | null): Provider {
	let token: Token | null = null;
	let pending: Promise<Token> | null = null;

	async function requestToken(creds: IgdbCredentials): Promise<Token> {
		const body = new URLSearchParams({
			client_id: creds.clientId,
			client_secret: creds.clientSecret,
			grant_type: 'client_credentials',
		}).toString();
		let json: unknown;
		try {
			json = await postJson(TOKEN_URL, body, 'application/x-www-form-urlencoded');
		} catch (error) {
			throw credentialRefused(error);
		}
		const value = isRecord(json) ? str(json.access_token) : undefined;
		const expiresIn = isRecord(json) ? num(json.expires_in) : undefined;
		if (!value || expiresIn === undefined) throw new UnexpectedResponseError('id.twitch.tv');
		return { clientId: creds.clientId, value, expiresAt: Date.now() + expiresIn * 1000 - TOKEN_MARGIN_MS };
	}

	/** Cached token for these credentials; one request at a time when it has to be renewed. */
	async function currentToken(creds: IgdbCredentials): Promise<string> {
		if (token && token.clientId === creds.clientId && token.expiresAt > Date.now()) return token.value;
		pending ??= requestToken(creds).finally(() => {
			pending = null;
		});
		token = await pending;
		return token.value;
	}

	async function queryGames(creds: IgdbCredentials, body: string): Promise<unknown> {
		const headers = {
			'Client-ID': creds.clientId,
			Authorization: `Bearer ${await currentToken(creds)}`,
			Accept: 'application/json',
		};
		return postJson(GAMES_URL, body, 'text/plain', headers);
	}

	/** POST to /games with the configured credentials; a 401 gets a new token and one more try. */
	async function games(body: string): Promise<unknown> {
		const raw = credentials();
		const creds = raw ? { clientId: raw.clientId.trim(), clientSecret: raw.clientSecret.trim() } : null;
		if (!creds?.clientId || !creds.clientSecret) throw new MissingCredentialsError(NAME);
		try {
			return await queryGames(creds, body);
		} catch (error) {
			// Token revoked or expired early: get a new one and try once more.
			if (!(error instanceof HttpError) || error.status !== 401 || error.host !== 'api.igdb.com') throw error;
			token = null;
			return queryGames(creds, body);
		}
	}

	return {
		id: 'igdb',
		name: NAME,
		kinds: ['game'],
		async search(query: string): Promise<SearchResult[]> {
			const cleaned = cleanQuery(query);
			if (cleaned === null) return [];
			return parseIgdb(await games(gamesQuery(cleaned)));
		},
		async localizedTitle(result: SearchResult, country: AliasCountry): Promise<string | null> {
			const regions = igdbRegions(country);
			if (regions.length === 0 || !/^\d+$/.test(result.externalId)) return null;
			return pickLocalization(parseLocalizations(await games(localizationsQuery(result.externalId))), regions);
		},
	};
}
