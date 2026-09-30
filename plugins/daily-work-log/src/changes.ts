import { debounce } from 'obsidian';
import type { Plugin } from 'obsidian';
import { REFRESH_DEBOUNCE_MS } from './constants';

/**
 * One signal for "something the blocks show may have changed": any note's
 * metadata, a rename or deletion, the settings. Batched, so a burst of edits
 * redraws once; each block then skips the redraw if its content is the same.
 */
export class Changes {
	private readonly listeners = new Set<() => void>();
	private readonly notifySoon = debounce(() => this.notify(), REFRESH_DEBOUNCE_MS, false);

	register(plugin: Plugin): void {
		const { metadataCache, vault } = plugin.app;
		plugin.registerEvent(metadataCache.on('changed', () => this.notifySoon()));
		plugin.registerEvent(metadataCache.on('deleted', () => this.notifySoon()));
		plugin.registerEvent(vault.on('rename', () => this.notifySoon()));
		plugin.register(() => {
			this.notifySoon.cancel();
			this.listeners.clear();
		});
	}

	/** Returns the function that stops listening. */
	on(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	}

	changed(): void {
		this.notifySoon();
	}

	private notify(): void {
		for (const listener of [...this.listeners]) listener();
	}
}
