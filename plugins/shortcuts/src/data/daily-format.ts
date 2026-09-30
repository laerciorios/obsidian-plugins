import { DAILY_NOTES_DEFAULTS, readDailyNotesSettings } from '@obsidian-plugins/core-plugins';
import type { App } from 'obsidian';
import { DAILY_FORMAT_TTL_MS } from '../constants';

/**
 * Date format of the Daily notes core plugin, read from its config file in
 * the vault config folder. Cached: `get()` never waits on disk, it returns the
 * last value and refreshes in the background when the cache is old.
 */
export class DailyNotesFormat {
	private format = DAILY_NOTES_DEFAULTS.format;
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
		this.format = (await readDailyNotesSettings(this.app)).format;
	}
}
