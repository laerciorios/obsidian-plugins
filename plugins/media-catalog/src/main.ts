import { Notice, Plugin, debounce } from 'obsidian';
import { readCatalogNote } from './catalog/catalog-note';
import { markFinished } from './catalog/updates';
import { COMMAND_IDS, SAVE_DEBOUNCE_MS } from './constants';
import { t } from './i18n';
import { CatalogModal } from './modal/catalog-modal';
import { askRating } from './modal/rating-modal';
import { createProviders } from './providers';
import { googleBooksKey, igdbCredentials } from './settings/secrets';
import { defaultSettings, normalizeSettings } from './settings/settings';
import { MediaCatalogSettingTab } from './settings/settings-tab';
import type { CatalogContext, CatalogNoteInfo, CatalogSettings, Provider } from './types';

export default class MediaCatalogPlugin extends Plugin implements CatalogContext {
	settings: CatalogSettings = defaultSettings();
	providers: Provider[] = [];
	private readonly saveSoon = debounce(() => void this.saveData(this.settings), SAVE_DEBOUNCE_MS, true);

	async onload(): Promise<void> {
		this.settings = normalizeSettings(await this.loadData());
		// Secrets are read at call time, so a key added in the settings works at once.
		this.providers = createProviders({
			igdbCredentials: () => igdbCredentials(this.app, this.settings),
			googleBooksKey: () => googleBooksKey(this.app, this.settings),
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
