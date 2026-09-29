import { requestUrl } from 'obsidian';
import type { RequestUrlResponse } from 'obsidian';
import { API_HOSTS, IMAGE_HOSTS } from '../constants';
import { BlockedHostError, HttpError, NetworkError, UnexpectedResponseError } from './errors';

/**
 * The only module that touches the network. Every request must be https and
 * go to a host in API_HOSTS or IMAGE_HOSTS; it only runs from commands the user
 * triggers (search, cover download). Obsidian's requestUrl has no CORS limits.
 *
 * The allow-list checks the URL that is requested. Redirects are followed
 * without a second check, by requestUrl and by <img> alike: Open Library
 * covers (covers.openlibrary.org) answer with a redirect to archive.org.
 */

const ALLOWED_HOSTS: ReadonlySet<string> = new Set<string>([...API_HOSTS, ...IMAGE_HOSTS]);
const IMAGE_HOST_SET: ReadonlySet<string> = new Set<string>(IMAGE_HOSTS);

export function hostOf(url: string): string {
	try {
		return new URL(url).hostname;
	} catch {
		return '';
	}
}

function isHttpsOn(url: string, hosts: ReadonlySet<string>): boolean {
	try {
		const parsed = new URL(url);
		return parsed.protocol === 'https:' && hosts.has(parsed.hostname);
	} catch {
		return false;
	}
}

export function isAllowedUrl(url: string): boolean {
	return isHttpsOn(url, ALLOWED_HOSTS);
}

/** True for covers the UI may show in an <img> or download. */
export function isImageUrl(url: string): boolean {
	return isHttpsOn(url, IMAGE_HOST_SET);
}

export interface RequestOptions {
	method?: 'GET' | 'POST';
	headers?: Record<string, string>;
	body?: string;
	contentType?: string;
}

async function send(url: string, options: RequestOptions = {}): Promise<RequestUrlResponse> {
	const host = hostOf(url);
	if (!isAllowedUrl(url)) throw new BlockedHostError(host);
	let response: RequestUrlResponse;
	try {
		response = await requestUrl({
			url,
			method: options.method ?? 'GET',
			headers: options.headers,
			body: options.body,
			contentType: options.contentType,
			throw: false,
		});
	} catch (error) {
		throw new NetworkError(host, error);
	}
	if (response.status >= 400) throw new HttpError(host, response.status);
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
	return parseJson(await send(url, { headers }), hostOf(url));
}

/** POST a text body (form-encoded or IGDB's Apicalypse) and parse JSON. */
export async function postJson(
	url: string,
	body: string,
	contentType: string,
	headers?: Record<string, string>,
): Promise<unknown> {
	return parseJson(await send(url, { method: 'POST', body, contentType, headers }), hostOf(url));
}

export interface BinaryResponse {
	data: ArrayBuffer;
	/** Lowercased content-type without parameters ("image/jpeg"), or "" when missing. */
	contentType: string;
}

/** Download a cover. Only image hosts are accepted. */
export async function getBinary(url: string): Promise<BinaryResponse> {
	if (!isImageUrl(url)) throw new BlockedHostError(hostOf(url));
	const response = await send(url);
	const header = Object.entries(response.headers).find(([name]) => name.toLowerCase() === 'content-type')?.[1] ?? '';
	return { data: response.arrayBuffer, contentType: header.split(';')[0]?.trim().toLowerCase() ?? '' };
}
