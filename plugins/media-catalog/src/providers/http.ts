import { requestUrl } from 'obsidian';
import type { RequestUrlResponse } from 'obsidian';
import { API_HOSTS, IMAGE_HOSTS, IMAGE_HOST_SUFFIXES } from '../constants';
import { BlockedHostError, HttpError, NetworkError, UnexpectedResponseError } from './errors';

/**
 * The only module that touches the network. Every URL the plugin requests must
 * be https and go to a host in API_HOSTS or IMAGE_HOSTS (images also accept
 * the IMAGE_HOST_SUFFIXES); it only runs from what the user triggers (search,
 * picking a result, cover download). Obsidian's requestUrl has no CORS limits.
 *
 * The allow-list is checked on every URL the plugin requests. Redirects are
 * followed by Obsidian itself (its main process calls net.request with
 * redirect: "follow"), and by <img> alike, so the hops cannot be checked per
 * request. The redirect chains the plugin relies on stay on the list: Open
 * Library covers (covers.openlibrary.org → archive.org) and the Cover Art
 * Archive (coverartarchive.org → archive.org → a *.archive.org node). The
 * plugin never requests a URL taken from a redirect.
 */

const ALLOWED_HOSTS: ReadonlySet<string> = new Set<string>([...API_HOSTS, ...IMAGE_HOSTS]);
const IMAGE_HOST_SET: ReadonlySet<string> = new Set<string>(IMAGE_HOSTS);

/** Headers added to every request to a host (the User-Agent MusicBrainz asks for). */
const hostHeaders = new Map<string, Record<string, string>>();

export function hostOf(url: string): string {
	try {
		return new URL(url).hostname;
	} catch {
		return '';
	}
}

function httpsHost(url: string): string | null {
	try {
		const parsed = new URL(url);
		return parsed.protocol === 'https:' ? parsed.hostname : null;
	} catch {
		return null;
	}
}

/** API calls: exact hosts only. */
export function isAllowedUrl(url: string): boolean {
	const host = httpsHost(url);
	return host !== null && ALLOWED_HOSTS.has(host);
}

/** True for covers the UI may show in an <img> or download: exact image hosts, or a subdomain of IMAGE_HOST_SUFFIXES. */
export function isImageUrl(url: string): boolean {
	const host = httpsHost(url);
	if (host === null) return false;
	return IMAGE_HOST_SET.has(host) || IMAGE_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix));
}

/**
 * Sends `headers` on every later request to these hosts, whoever makes it
 * (search, cover probe, cover download). Set once when the providers are created.
 */
export function setHostHeaders(hosts: readonly string[], headers: Record<string, string>): void {
	for (const host of hosts) hostHeaders.set(host, { ...headers });
}

export interface RequestOptions {
	method?: 'GET' | 'POST';
	headers?: Record<string, string>;
	body?: string;
	contentType?: string;
}

/** Any status: callers decide what an error status means. */
async function sendRaw(url: string, allowed: (url: string) => boolean, options: RequestOptions = {}): Promise<RequestUrlResponse> {
	const host = hostOf(url);
	if (!allowed(url)) throw new BlockedHostError(host);
	try {
		return await requestUrl({
			url,
			method: options.method ?? 'GET',
			headers: { ...hostHeaders.get(host), ...options.headers },
			body: options.body,
			contentType: options.contentType,
			throw: false,
		});
	} catch (error) {
		throw new NetworkError(host, error);
	}
}

async function send(url: string, allowed: (url: string) => boolean, options?: RequestOptions): Promise<RequestUrlResponse> {
	const response = await sendRaw(url, allowed, options);
	if (response.status >= 400) throw new HttpError(hostOf(url), response.status);
	return response;
}

function parseJson(response: RequestUrlResponse, host: string): unknown {
	try {
		return response.json as unknown;
	} catch {
		throw new UnexpectedResponseError(host);
	}
}

/** GET and parse JSON. The result is `unknown`: narrow it with ./guards. */
export async function getJson(url: string, headers?: Record<string, string>): Promise<unknown> {
	return parseJson(await send(url, isAllowedUrl, { headers }), hostOf(url));
}

/** POST a text body (form-encoded or IGDB's Apicalypse) and parse JSON. */
export async function postJson(
	url: string,
	body: string,
	contentType: string,
	headers?: Record<string, string>,
): Promise<unknown> {
	return parseJson(await send(url, isAllowedUrl, { method: 'POST', body, contentType, headers }), hostOf(url));
}

export interface BinaryResponse {
	data: ArrayBuffer;
	/** Lowercased content-type without parameters ("image/jpeg"), or "" when missing. */
	contentType: string;
}

function contentTypeOf(response: RequestUrlResponse): string {
	const header = Object.entries(response.headers).find(([name]) => name.toLowerCase() === 'content-type')?.[1] ?? '';
	return header.split(';')[0]?.trim().toLowerCase() ?? '';
}

/** Download a cover. Only image hosts are accepted. */
export async function getBinary(url: string): Promise<BinaryResponse> {
	const response = await send(url, isImageUrl);
	return { data: response.arrayBuffer, contentType: contentTypeOf(response) };
}

/**
 * Status of an image URL after Obsidian followed its redirects (200, 404…),
 * without throwing on error statuses. A GET, since a small image is cheap and
 * HEAD is not guaranteed on every platform. Only image hosts are accepted.
 */
export async function imageStatus(url: string): Promise<number> {
	return (await sendRaw(url, isImageUrl)).status;
}
