import { Plugin, debounce } from 'obsidian';
import { registerCommands } from './commands';
import { defaultConfig, normalizeConfig } from './config/normalize';
import type { FeatureId, GraphKitConfig } from './config/types';
import { createFeatures } from './features/registry';
import { GraphHost } from './graph-host';
import type { FeatureStatus } from './graph-host';
import { isGraphPluginEnabled } from './graph-internals';
import { NoteFactsCache } from './note-facts';
import { GraphKitSettingTab } from './settings/settings-tab';
import { ExportModal } from './ui/export-modal';
import { ImportModal } from './ui/import-modal';

const SAVE_DEBOUNCE_MS = 400;

export default class GraphKitPlugin extends Plugin {
	config: GraphKitConfig = defaultConfig();
	private host: GraphHost | null = null;
	private settingTab: GraphKitSettingTab | null = null;
	private readonly saveSoon = debounce(() => void this.saveData(this.config), SAVE_DEBOUNCE_MS, true);

	async onload(): Promise<void> {
		this.config = normalizeConfig(await this.loadData()).config;
		const facts = new NoteFactsCache(this.app);
		this.host = this.addChild(
			new GraphHost({
				app: this.app,
				features: createFeatures(facts, () => this.config),
				config: () => this.config,
				facts,
				statusChanged: () => this.settingTab?.update(),
			}),
		);
		registerCommands(this);
		this.settingTab = new GraphKitSettingTab(this.app, this);
		this.addSettingTab(this.settingTab);
	}

	onunload(): void {
		this.saveSoon.run();
	}

	/** data.json changed on disk (e.g. synced from another device): use it instead of overwriting it. */
	async onExternalSettingsChange(): Promise<void> {
		this.saveSoon.cancel();
		this.config = normalizeConfig(await this.loadData()).config;
		this.host?.sync();
		this.settingTab?.update();
	}

	featureStatus(id: FeatureId): FeatureStatus {
		return this.host?.featureStatus(id) ?? { state: 'unchecked' };
	}

	graphPluginEnabled(): boolean | null {
		return isGraphPluginEnabled(this.app);
	}

	/** Apply and save the config; `rerender` also redraws an open settings tab (changes made outside it). */
	configChanged(rerender = false): void {
		this.host?.sync();
		this.saveSoon();
		if (rerender) this.settingTab?.update();
	}

	replaceConfig(config: GraphKitConfig): void {
		this.config = config;
		this.configChanged(true);
	}

	openExport(): void {
		new ExportModal(this.app, this.config).open();
	}

	openImport(): void {
		new ImportModal(this.app, (config) => this.replaceConfig(config)).open();
	}
}
