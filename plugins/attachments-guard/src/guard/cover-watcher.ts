import { Notice, TFile } from 'obsidian';
import type { TAbstractFile } from 'obsidian';
import type { GuardHost } from '../host';
import { t } from '../i18n';
import { isCoverName } from '../naming/names';
import { noteSlug } from '../naming/slug';
import { logError, moveFile } from '../vault/files';
import { coverTarget, linkingFiles } from '../vault/references';

/** After a note is renamed, give the metadata cache time to move its links. */
const RENAME_DELAY_MS = 1000;

/**
 * Covers follow the vault rule `<slug>-cover.<ext>`: when a note's cover
 * property links to an attachment with another name, the attachment is renamed.
 * Only notes that changed are checked (not the whole vault at startup), and
 * only once their links are resolved, so `renameFile` rewrites the new link too.
 */
export class CoverWatcher {
	private readonly changed = new Set<string>();
	private readonly busy = new Set<string>();
	private readonly timers = new Set<number>();

	constructor(private readonly host: GuardHost) {}

	register(): void {
		const { app } = this.host;
		this.host.register(() => {
			for (const timer of this.timers) window.clearTimeout(timer);
		});
		app.workspace.onLayoutReady(() => {
			this.host.registerEvent(
				app.metadataCache.on('changed', (file) => {
					if (file.extension === 'md') this.changed.add(file.path);
				}),
			);
			this.host.registerEvent(
				app.metadataCache.on('resolve', (file) => {
					if (this.changed.delete(file.path)) void this.check(file);
				}),
			);
			this.host.registerEvent(
				app.vault.on('rename', (file: TAbstractFile) => {
					if (!(file instanceof TFile) || file.extension !== 'md') return;
					const timer = window.setTimeout(() => {
						this.timers.delete(timer);
						void this.check(file);
					}, RENAME_DELAY_MS);
					this.timers.add(timer);
				}),
			);
		});
	}

	private async check(note: TFile): Promise<void> {
		const { app, settings, rules, planner } = this.host;
		const property = settings.coverProperty;
		if (!settings.organize || !property || rules.isIgnored(note.path)) return;
		const cover = coverTarget(app, note, property);
		if (!rules.isAttachment(cover) || rules.isIgnored(cover.path) || this.busy.has(cover.path)) return;
		const slug = noteSlug(note.path);
		if (!slug || (isCoverName(cover.basename, slug) && rules.isGuarded(cover.path))) return;
		// Two notes with the same cover would rename it back and forth.
		if (linkingFiles(app, cover).some((source) => source.path !== note.path)) return;

		const target = planner.plan({ basename: cover.basename, extension: cover.extension, note, cover: true, self: cover });
		if (target.path === cover.path) return;
		this.busy.add(cover.path);
		try {
			await moveFile(app, cover, target.path);
			new Notice(t('notice.cover', { name: target.name }));
		} catch (error) {
			logError(error);
		} finally {
			this.busy.delete(cover.path);
		}
	}
}
