import { TFile } from 'obsidian';
import type { App, Plugin } from 'obsidian';
import type { NotesSourceConfig, SourceConfig, Suggestion } from '../types';
import { matchesSource } from './matcher';
import { noteSuggestion, noteTitle } from './notes';

export interface SourcePreview {
	count: number;
	examples: string[];
}

/**
 * Suggestions of every enabled note source, keyed by source id and file path.
 * Built lazily on the first query after a change to the settings or a rename
 * (a folder rename moves many files at once); single-file edits and deletions
 * are applied in place, so typing never rescans the vault.
 */
export class NoteIndex {
	private readonly entries = new Map<string, Map<string, Suggestion>>();
	private dirty = true;

	constructor(
		private readonly app: App,
		private readonly sources: () => SourceConfig[],
	) {}

	register(plugin: Plugin): void {
		const { metadataCache, vault } = this.app;
		plugin.registerEvent(metadataCache.on('changed', (file) => this.update(file)));
		plugin.registerEvent(metadataCache.on('deleted', (file) => this.remove(file.path)));
		plugin.registerEvent(vault.on('rename', () => this.invalidate()));
		plugin.registerEvent(
			vault.on('delete', (file) => {
				if (file instanceof TFile) this.remove(file.path);
				else this.invalidate();
			}),
		);
	}

	invalidate(): void {
		this.dirty = true;
	}

	suggestions(): Suggestion[] {
		this.ensure();
		const all: Suggestion[] = [];
		for (const bySource of this.entries.values()) all.push(...bySource.values());
		return all;
	}

	/** How many notes a source matches right now, enabled or not (for the settings page). */
	preview(source: NotesSourceConfig, limit: number): SourcePreview {
		const titles: string[] = [];
		for (const file of this.app.vault.getMarkdownFiles()) {
			const cache = this.app.metadataCache.getFileCache(file);
			if (matchesSource(file, cache, source)) titles.push(noteTitle(file, cache, source));
		}
		titles.sort((a, b) => a.localeCompare(b));
		return { count: titles.length, examples: titles.slice(0, limit) };
	}

	private enabled(): { source: NotesSourceConfig; order: number }[] {
		return this.sources()
			.map((source, order) => ({ source, order }))
			.filter(({ source }) => source.enabled);
	}

	private ensure(): void {
		if (!this.dirty) return;
		this.entries.clear();
		const enabled = this.enabled();
		for (const { source } of enabled) this.entries.set(source.id, new Map());
		for (const file of this.app.vault.getMarkdownFiles()) this.index(file, enabled);
		this.dirty = false;
	}

	private update(file: TFile): void {
		if (!this.dirty) this.index(file, this.enabled());
	}

	private remove(path: string): void {
		for (const bySource of this.entries.values()) bySource.delete(path);
	}

	private index(file: TFile, enabled: { source: NotesSourceConfig; order: number }[]): void {
		const cache = this.app.metadataCache.getFileCache(file);
		for (const { source, order } of enabled) {
			const bySource = this.entries.get(source.id);
			if (!bySource) continue;
			if (matchesSource(file, cache, source)) {
				bySource.set(file.path, noteSuggestion(this.app, file, cache, source, order));
			} else {
				bySource.delete(file.path);
			}
		}
	}
}
