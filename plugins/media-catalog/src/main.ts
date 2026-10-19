import { Notice, Plugin, debounce } from 'obsidian';
import { isInFolder } from './catalog/backlog';
import { readCatalogNote } from './catalog/catalog-note';
import { markFinished } from './catalog/updates';
import { COMMAND_IDS, SAVE_DEBOUNCE_MS } from './constants';
import { t } from './i18n';
import { CatalogModal } from './modal/catalog-modal';
import { newRun } from './modal/new-run';
import { askRating } from './modal/rating-modal';
import { startBacklogItem } from './modal/start-item';
import { updateEstimate } from './modal/update-estimate';
import { updateNoteAliases } from './modal/update-aliases';
import { createProviders, userAgentFor } from './providers';
import { createHltb } from './providers/hltb';
import type { HltbClient } from './providers/hltb';
import { googleBooksKey, igdbCredentials } from './settings/secrets';
import { defaultSettings, normalizeSettings } from './settings/settings';
import { MediaCatalogSettingTab } from './settings/settings-tab';
import type { CatalogContext, CatalogNoteInfo, CatalogSettings, Provider } from './types';

export default class MediaCatalogPlugin extends Plugin implements CatalogContext {
	settings: CatalogSettings = defaultSettings();
	providers: Provider[] = [];
	readonly hltb: HltbClient = createHltb();
	private readonly saveSoon = debounce(() => void this.saveData(this.settings), SAVE_DEBOUNCE_MS, true);

	async onload(): Promise<void> {
		this.settings = normalizeSettings(await this.loadData());
		// Secrets and album options are read at call time, so a change in the settings works at once.
		this.providers = createProviders({
			igdbCredentials: () => igdbCredentials(this.app, this.settings),
			googleBooksKey: () => googleBooksKey(this.app, this.settings),
			userAgent: userAgentFor(this.manifest),
			albumOptions: () => ({
				includeEps: this.settings.albumIncludeEps,
				includeSecondary: this.settings.albumIncludeSecondary,
				itunesFallback: this.settings.albumItunesFallback,
			}),
		});

		this.addCommand({
			id: COMMAND_IDS.add,
			name: t('command.add'),
			icon: 'clapperboard',
			callback: () => new CatalogModal(this, { mode: 'create' }).open(),
		});
		this.addCommand({
			id: COMMAND_IDS.changeCover,
			name: t('command.changeCover'),
			icon: 'image',
			checkCallback: (checking) => {
				const note = this.activeNote();
				if (!note) return false;
				if (!checking) new CatalogModal(this, { mode: 'cover', note }).open();
				return true;
			},
		});
		this.addCommand({
			id: COMMAND_IDS.updateTracks,
			name: t('command.updateTracks'),
			icon: 'list-music',
			checkCallback: (checking) => {
				const note = this.activeNote();
				if (note?.kind !== 'album') return false;
				if (!checking) new CatalogModal(this, { mode: 'tracks', note }).open();
				return true;
			},
		});
		this.addCommand({
			id: COMMAND_IDS.updateAliases,
			name: t('command.updateAliases'),
			icon: 'tags',
			checkCallback: (checking) => {
				const note = this.activeNote();
				if (!note) return false;
				if (!checking) updateNoteAliases(this, note);
				return true;
			},
		});
		this.addCommand({
			id: COMMAND_IDS.markFinished,
			name: t('command.markFinished'),
			icon: 'circle-check',
			checkCallback: (checking) => {
				const note = this.activeNote();
				if (!note) return false;
				if (!checking) void this.finish(note);
				return true;
			},
		});
		this.addCommand({
			id: COMMAND_IDS.newRun,
			name: t('command.newRun'),
			icon: 'repeat',
			checkCallback: (checking) => {
				const note = this.activeNote();
				if (!note) return false;
				// Only done notes start a new run: the others get a notice (see newRun).
				if (!checking) void newRun(this, note.file);
				return true;
			},
		});
		this.addCommand({
			id: COMMAND_IDS.startBacklogItem,
			name: t('command.startBacklogItem'),
			icon: 'play',
			checkCallback: (checking) => {
				const note = this.activeNote();
				if (!note || !isInFolder(note.file.path, this.settings.backlogFolder)) return false;
				if (!checking) void this.start(note);
				return true;
			},
		});
		this.addCommand({
			id: COMMAND_IDS.updateEstimate,
			name: t('command.updateEstimate'),
			icon: 'timer',
			checkCallback: (checking) => {
				const note = this.activeNote();
				if (note?.kind !== 'game') return false;
				if (!checking) void updateEstimate(this, note);
				return true;
			},
		});

		this.addSettingTab(new MediaCatalogSettingTab(this.app, this));
	}

	onunload(): void {
		this.saveSoon.run();
	}

	/** Called after every settings edit (and when the modal remembers the last kind). */
	settingsChanged(): void {
		this.saveSoon();
	}

	private activeNote(): CatalogNoteInfo | null {
		return readCatalogNote(this.app, this.app.workspace.getActiveFile());
	}

	private async start(note: CatalogNoteInfo): Promise<void> {
		if (await startBacklogItem(this, note.file)) void this.app.workspace.getLeaf(false).openFile(note.file);
	}

	private async finish(note: CatalogNoteInfo): Promise<void> {
		const answer = await askRating(this.app, note.title);
		if (!answer) return;
		try {
			await markFinished(this.app, note.file, answer.rating);
			new Notice(t('notice.finished', { name: note.title }));
		} catch (error) {
			console.error('Media Catalog: could not mark as finished', error);
			new Notice(t('notice.finishFailed', { name: note.title }));
		}
	}
}
