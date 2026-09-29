import { t } from '../i18n';

/** Base class, so callers can tell expected failures from bugs. */
export class CatalogError extends Error {}

/** The server answered with status >= 400. */
export class HttpError extends CatalogError {
	constructor(
		readonly host: string,
		readonly status: number,
	) {
		super(`${host} answered ${status}`);
	}
}

/** No answer at all (offline, DNS, TLS…). */
export class NetworkError extends CatalogError {
	constructor(
		readonly host: string,
		readonly original: unknown,
	) {
		super(`${host} did not answer`);
	}
}

/** The URL is not https or its host is not in the allow-list. */
export class BlockedHostError extends CatalogError {
	constructor(readonly host: string) {
		super(`${host || 'URL'} is not allowed`);
	}
}

/** The body is not the JSON shape the provider expects. */
export class UnexpectedResponseError extends CatalogError {
	constructor(readonly host: string) {
		super(`unexpected response from ${host}`);
	}
}

/** A provider that needs an API key has none configured. */
export class MissingCredentialsError extends CatalogError {
	constructor(readonly source: string) {
		super(`${source} has no credentials`);
	}
}

/**
 * Sources that use an API key (the `name` of providers/google-books.ts and
 * providers/igdb.ts): only for them does a 401/403 point to the key.
 */
const KEYED_SOURCES: ReadonlySet<string> = new Set(['Google Books', 'IGDB']);

/** User-facing message for a failed search or download. */
export function describeError(error: unknown, source: string): string {
	if (error instanceof MissingCredentialsError) return t('error.credentials', { source: error.source });
	if (error instanceof HttpError) {
		const denied = error.status === 401 || error.status === 403;
		if (denied && KEYED_SOURCES.has(source)) return t('error.denied', { source });
		if (error.status === 429) return t('error.rateLimit', { source });
		return t('error.http', { host: error.host, status: error.status });
	}
	if (error instanceof NetworkError) return t('error.network', { host: error.host });
	if (error instanceof BlockedHostError) return t('error.blocked', { host: error.host });
	if (error instanceof UnexpectedResponseError) return t('error.unexpected', { source });
	return t('error.unknown', { source });
}
