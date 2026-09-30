import type { CachedMetadata, Plugin, TFile } from 'obsidian';
import { countText } from '../count';
import { estimate, wholeMinutes } from '../estimate';
import type { PropertyMode, ReadingTimeSettings } from '../types';

export interface WriterHost extends Plugin {
	settings: ReadingTimeSettings;
}

export type UpdateResult = 'written' | 'unchanged' | 'skipped';

interface Known {
	data: string;
	cache: CachedMetadata;
}

export function logError(error: unknown): void {
	console.error('[reading-time]', error);
}

/**
 * Keeps the reading time property (whole minutes, a number) in step with each
 * note. The note open in the editor is written when the user leaves it, never
 * while typing; other notes when their content changes (sync, other plugins).
 * Frontmatter does not count as words, so writing the property does not change
 * the value and cannot loop.
 */
export class PropertyWriter {
	/** The active note, checked when the user leaves it. */
	private pending: TFile | null = null;
	private readonly writing = new Set<string>();

	constructor(private readonly plugin: WriterHost) {}

	register(): void {
		const { workspace, metadataCache } = this.plugin.app;
		this.plugin.registerEvent(workspace.on('file-open', (file) => this.opened(file)));
		this.plugin.registerEvent(metadataCache.on('changed', (file, data, cache) => this.changed(file, { data, cache })));
		workspace.onLayoutReady(() => this.opened(workspace.getActiveFile()));
	}

	/** Whether the automatic mode would write this note (the bulk update passes its own mode). */
	eligible(file: TFile, cache: CachedMetadata | null, mode: PropertyMode = this.plugin.settings.property.mode): boolean {
		const { name, excludeFolders } = this.plugin.settings.property;
		if (mode === 'off' || file.extension !== 'md') return false;
		if (excludeFolders.some((folder) => file.path.startsWith(`${folder}/`))) return false;
		const frontmatter: Record<string, unknown> | undefined = cache?.frontmatter;
		// Excalidraw drawings are markdown files, but not notes.
		if (frontmatter && 'excalidraw-plugin' in frontmatter) return false;
		return mode === 'all' || (!!frontmatter && Object.prototype.hasOwnProperty.call(frontmatter, name));
	}

	minutesOf(text: string): number {
		const settings = this.plugin.settings;
		return wholeMinutes(estimate(countText(text, new Set(settings.code.skipLanguages)), settings));
	}

	/** The value the note should have, and whether its frontmatter holds another one. */
	async check(file: TFile, known?: Known): Promise<{ minutes: number; stale: boolean }> {
		const { vault, metadataCache } = this.plugin.app;
		const cache = known?.cache ?? metadataCache.getFileCache(file);
		const minutes = this.minutesOf(known?.data ?? (await vault.cachedRead(file)));
		const current: unknown = cache?.frontmatter?.[this.plugin.settings.property.name];
		return { minutes, stale: current !== minutes };
	}

	/**
	 * Write the property when the value is stale. `force` skips the mode and the
	 * ignored folders: the user asked for this note.
	 */
	async update(file: TFile, force = false, known?: Known): Promise<UpdateResult> {
		const { vault, metadataCache, fileManager } = this.plugin.app;
		if (file.extension !== 'md' || !vault.getFileByPath(file.path)) return 'skipped';
		if (!force && !this.eligible(file, known?.cache ?? metadataCache.getFileCache(file))) return 'skipped';
		const { minutes, stale } = await this.check(file, known);
		if (!stale) return 'unchanged';
		if (this.writing.has(file.path)) return 'skipped';
		const name = this.plugin.settings.property.name;
		this.writing.add(file.path);
		try {
			await fileManager.processFrontMatter(file, (frontmatter: Record<string, unknown>) => {
				frontmatter[name] = minutes;
			});
		} finally {
			this.writing.delete(file.path);
		}
		return 'written';
	}

	private get automatic(): boolean {
		return this.plugin.settings.property.mode !== 'off';
	}

	private opened(file: TFile | null): void {
		const left = this.pending;
		this.pending = this.automatic ? file : null;
		if (left && left !== file) this.update(left).catch(logError);
	}

	private changed(file: TFile, known: Known): void {
		if (!this.automatic) return;
		if (file === this.pending || file === this.plugin.app.workspace.getActiveFile()) {
			this.pending = file;
			return;
		}
		this.update(file, false, known).catch(logError);
	}
}
