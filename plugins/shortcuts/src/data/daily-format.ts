import { normalizePath } from 'obsidian';
import type { App } from 'obsidian';
import { DAILY_FORMAT_FALLBACK, DAILY_FORMAT_TTL_MS } from '../constants';
import { isRecord } from './text';

/**
 * Date format of the Daily notes core plugin, read from its config file in
 * the vault config folder. Cached: `get()` never waits on disk, it returns the
 * last value and refreshes in the background when the cache is old.
 */
export class DailyNotesFormat {
	private format = DAILY_FORMAT_FALLBACK;
	private readAt = 0;
	private pending: Promise<void> | null = null;

	constructor(private readonly app: App) {}

	get(): string {
		if (Date.now() - this.readAt > DAILY_FORMAT_TTL_MS) void this.refresh();
		return this.format;
	}

	refresh(): Promise<void> {
		this.pending ??= this.read().finally(() => {
			this.pending = null;
		});
		return this.pending;
	}

	private async read(): Promise<void> {
		this.readAt = Date.now();
		const path = normalizePath(`${this.app.vault.configDir}/daily-notes.json`);
		try {
			if (!(await this.app.vault.adapter.exists(path))) {
				this.format = DAILY_FORMAT_FALLBACK;
				return;
			}
			const data: unknown = JSON.parse(await this.app.vault.adapter.read(path));
			const format = isRecord(data) && typeof data.format === 'string' ? data.format.trim() : '';
			this.format = format || DAILY_FORMAT_FALLBACK;
		} catch {
			this.format = DAILY_FORMAT_FALLBACK;
		}
	}
}
