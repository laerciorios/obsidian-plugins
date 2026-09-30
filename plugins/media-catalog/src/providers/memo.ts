/**
 * Recent answers kept by key, so asking twice costs one request: the editions
 * of an album and its tracklist share the release list (MusicBrainz) or the
 * lookup (iTunes), and going back to an edition in the dropdown is instant.
 * Calls made while the first is still running share its promise. A rejected
 * promise is forgotten at once (the next call retries), entries expire after
 * `ttlMs` (a fix made on the source shows up without a restart), and only the
 * `max` most recent keys are kept.
 */

export interface PromiseCacheOptions {
	max: number;
	ttlMs: number;
	/** Clock, replaceable in tests. */
	now?: () => number;
}

interface Entry<T> {
	value: Promise<T>;
	at: number;
}

export class PromiseCache<T> {
	private readonly entries = new Map<string, Entry<T>>();
	private readonly max: number;
	private readonly ttlMs: number;
	private readonly now: () => number;

	constructor(options: PromiseCacheOptions) {
		this.max = options.max;
		this.ttlMs = options.ttlMs;
		this.now = options.now ?? (() => Date.now());
	}

	/** The cached promise for `key`, or the one `load` returns (then cached). */
	get(key: string, load: () => Promise<T>): Promise<T> {
		const now = this.now();
		const hit = this.entries.get(key);
		if (hit && now - hit.at < this.ttlMs) return hit.value;
		this.entries.delete(key);
		const value = load();
		this.entries.set(key, { value, at: now });
		void value.catch(() => {
			if (this.entries.get(key)?.value === value) this.entries.delete(key);
		});
		for (const oldest of this.entries.keys()) {
			if (this.entries.size <= this.max) break;
			this.entries.delete(oldest);
		}
		return value;
	}
}
