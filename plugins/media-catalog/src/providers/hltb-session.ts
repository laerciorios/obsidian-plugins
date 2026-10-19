import { HLTB_TOKEN_TTL_MS } from '../constants';
import { isRecord } from './guards';

/**
 * The fragile part of HowLongToBeat, in one place. The site has no public
 * API: its own search page posts to an internal endpoint, with a token it
 * gets from `<endpoint>/init` first. Both have changed over time (the
 * endpoint path, and extra key/value pairs next to the token), so everything
 * that depends on them lives here, and the rest of the plugin only sees
 * `SearchAuth`. Checked against the site on 2026-10-19 (and against the
 * howlongtobeatpy library, which follows the same steps):
 *
 * 1. `GET /api/search/site/init?t=<ms>` → `{"token": "…"}`. The token is tied
 *    to the client (IP and User-Agent), so the same client must search.
 * 2. `POST /api/search/site` with `x-auth-token: <token>`. 403 means the token
 *    expired: the site gets a new one and tries once more; so does the plugin.
 * 3. When `init` stops answering on the known path, the path is read from the
 *    site's scripts: the `fetch("/api/…", {method: "POST"})` that searches.
 *
 * Earlier versions of `init` also answered key/value pairs (`hpKey`,
 * `hpVal`) that went into the headers and the body: they are passed on when
 * they come back.
 */

export const HLTB_ORIGIN = 'https://howlongtobeat.com';
/** The search endpoint as of 2026-10; found again in the scripts when it moves. */
export const DEFAULT_SEARCH_PATH = '/api/search/site';

/** What a search request needs besides the query. */
export interface SearchAuth {
	/** Full URL of the search endpoint. */
	url: string;
	headers: Record<string, string>;
	/** Extra fields of the request body (the key/value pairs of older versions of `init`). */
	body: Record<string, string>;
}

/** The network calls the session makes (./http in the plugin, fakes in tests). */
export interface SessionTransport {
	getJson(url: string): Promise<unknown>;
	getText(url: string): Promise<string>;
}

/** Headers of every request to the site: it checks where the request comes from. */
export const SITE_HEADERS: Readonly<Record<string, string>> = { Referer: `${HLTB_ORIGIN}/`, Origin: HLTB_ORIGIN };

/**
 * The `init` answer as SearchAuth for the endpoint `url`, or null without a token. Fields named
 * like a key and a value (`hpKey`/`hpVal`) become `x-hp-key`/`x-hp-val` and
 * a `<key>: <value>` field of the body.
 */
export function parseInit(json: unknown, url: string): SearchAuth | null {
	if (!isRecord(json) || typeof json.token !== 'string' || json.token === '') return null;
	const headers: Record<string, string> = { ...SITE_HEADERS, 'x-auth-token': json.token };
	let key: string | null = null;
	let value: string | null = null;
	for (const [name, field] of Object.entries(json)) {
		if (typeof field !== 'string' || name === 'token') continue;
		if (/key/i.test(name)) key = field;
		else if (/val/i.test(name)) value = field;
	}
	const body: Record<string, string> = {};
	if (key && value) {
		headers['x-hp-key'] = key;
		headers['x-hp-val'] = value;
		body[key] = value;
	}
	return { url, headers, body };
}

const POST_FETCH = /fetch\s*\(\s*["'`](\/api\/[A-Za-z0-9_/]+)[^"'`]*["'`]\s*,\s*\{[^}]*?method\s*:\s*["']POST["']/g;

/**
 * The search endpoint in one of the site's scripts: the paths of
 * `fetch("/api/…", {method: "POST"})`, a path with "search" first (the same
 * scripts also post errors and reports). Null when there is none.
 */
export function searchPathIn(script: string): string | null {
	const paths = [...script.matchAll(POST_FETCH)].map((match) => (match[1] ?? '').replace(/\/+$/, ''));
	return paths.find((path) => path.includes('search')) ?? null;
}

/** Script chunks the home page loads (`/_next/static/chunks/….js`), in page order. */
export function scriptsIn(html: string): string[] {
	const found = html.match(/\/_next\/static\/chunks\/[A-Za-z0-9_./-]+\.js/g) ?? [];
	return [...new Set(found)];
}

/**
 * Keeps the search endpoint and token, renewing them when they expire.
 * `auth()` never rejects with a stale value: a failed `init` throws (the
 * caller turns it into "HowLongToBeat unavailable").
 */
export class HltbSession {
	private path = DEFAULT_SEARCH_PATH;
	private current: { auth: SearchAuth; at: number } | null = null;
	private pending: Promise<SearchAuth> | null = null;

	constructor(
		private readonly transport: SessionTransport,
		private readonly now: () => number = Date.now,
	) {}

	/** Endpoint and token, reused for HLTB_TOKEN_TTL_MS. */
	auth(): Promise<SearchAuth> {
		const current = this.current;
		if (current && this.now() - current.at < HLTB_TOKEN_TTL_MS) return Promise.resolve(current.auth);
		this.pending ??= this.renew().finally(() => {
			this.pending = null;
		});
		return this.pending;
	}

	/** The token was refused (403): the next auth() gets a new one. */
	invalidate(): void {
		this.current = null;
	}

	private async renew(): Promise<SearchAuth> {
		let auth: SearchAuth | null = null;
		try {
			auth = await this.init(this.path);
		} catch {
			// The endpoint moved (404) or broke: look for it in the scripts below.
		}
		if (!auth) {
			const path = await this.discover();
			if (path === null || path === this.path) throw new Error('HowLongToBeat: no search endpoint');
			this.path = path;
			auth = await this.init(path);
		}
		if (!auth) throw new Error('HowLongToBeat: no search token');
		this.current = { auth, at: this.now() };
		return auth;
	}

	private async init(path: string): Promise<SearchAuth | null> {
		const url = `${HLTB_ORIGIN}${path}`;
		return parseInit(await this.transport.getJson(`${url}/init?t=${this.now()}`), url);
	}

	private async discover(): Promise<string | null> {
		const html = await this.transport.getText(`${HLTB_ORIGIN}/`);
		for (const script of scriptsIn(html)) {
			try {
				const path = searchPathIn(await this.transport.getText(`${HLTB_ORIGIN}${script}`));
				if (path) return path;
			} catch {
				// One script failing does not stop the others.
			}
		}
		return null;
	}
}
