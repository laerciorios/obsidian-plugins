import { Notice, Plugin, debounce } from 'obsidian';
import { ArchiveService } from './archive/service';
import { registerCommands } from './commands';
import { HOVER_SOURCE, VIEW_TYPE } from './constants';
import { t } from './i18n';
import { defaultSettings, normalizeSettings } from './settings/model';
import type { BoardSettings } from './settings/model';
import { BoardSettingTab } from './settings/settings-tab';
import { BoardView } from './view/board-view';
import type { RefreshableView } from './view/board-view';
import { getViewOptions } from './view/options';

export default class BasesBoardPlugin extends Plugin {
	settings: BoardSettings = defaultSettings();
	/** data.json exists but could not be read: never overwrite it, pause automatic archiving. */
	settingsBroken = false;
	archive!: ArchiveService;
	/** Open board views, re-rendered when the settings change. */
	readonly views = new Set<RefreshableView>();
	private readonly saveSoon = debounce(() => void this.saveSettings(), 500, true);

	async onload(): Promise<void> {
		await this.loadSettings();
		// Flush an edit made in the last moments before unload or hot reload.
		this.register(() => this.saveSoon.run());
		this.archive = new ArchiveService(this);
		this.addSettingTab(new BoardSettingTab(this.app, this));
		registerCommands(this);
		this.registerHoverLinkSource(HOVER_SOURCE, { display: 'Bases Board', defaultMod: true });

		const registered = this.registerBasesView(VIEW_TYPE, {
			name: t('view.name'),
			icon: 'lucide-kanban',
			factory: (controller, containerEl) => new BoardView(controller, containerEl, this),
			options: (config) => getViewOptions(this, config),
		});
		if (!registered) new Notice(t('notice.basesDisabled'));

		this.archive.start();
	}

	/**
	 * loadData() gives null when data.json is missing and undefined when it
	 * cannot be parsed (hand edit, half-synced file). Defaults are saved only in
	 * the first case: a broken file is never overwritten automatically.
	 */
	async loadSettings(saveDefaults = true): Promise<void> {
		const raw: unknown = await this.loadData();
		if (raw === undefined) {
			this.settingsBroken = true;
			new Notice(t('notice.settingsBroken'), 0);
			return;
		}
		this.settingsBroken = false;
		this.settings = normalizeSettings(raw);
		// Persist the defaults once, so the default profile name keeps the language it was created in.
		if (raw === null && saveDefaults) await this.saveSettings();
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
		// Saving from the settings tab replaces a broken file on purpose.
		this.settingsBroken = false;
	}

	/** Called by the settings tab after every edit. */
	settingsChanged(): void {
		this.saveSoon();
		this.archive.reschedule();
		this.refreshViews();
	}

	/** data.json changed on disk (sync, or the dev-vault fixture script). */
	async onExternalSettingsChange(): Promise<void> {
		await this.loadSettings(false);
		this.archive.reschedule();
		this.refreshViews();
	}

	private refreshViews(): void {
		for (const view of this.views) view.refresh();
	}
}
