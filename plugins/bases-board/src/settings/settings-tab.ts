import { Notice, PluginSettingTab } from 'obsidian';
import type { App, Plugin, SettingDefinitionItem } from 'obsidian';
import type { ArchiveService } from '../archive/service';
import { t } from '../i18n';
import { criteriaProfileId, readSetting, writeSetting } from './bindings';
import { settingDefinitions } from './definitions';
import type { DefinitionContext } from './definitions';
import { defaultProfile, duplicateProfile, uniqueId } from './model';
import type { BoardSettings } from './model';

export interface SettingsHost extends Plugin {
	settings: BoardSettings;
	archive: ArchiveService;
	settingsChanged(): void;
}

/**
 * Declarative settings (Obsidian 1.13+): the app renders the list of profiles
 * with add, reorder and delete, one page per profile and inline validation.
 */
export class BoardSettingTab extends PluginSettingTab implements DefinitionContext {
	constructor(
		app: App,
		private readonly plugin: SettingsHost,
	) {
		super(app, plugin);
		this.icon = 'lucide-kanban';
	}

	get settings(): BoardSettings {
		return this.plugin.settings;
	}

	getSettingDefinitions(): SettingDefinitionItem[] {
		return settingDefinitions(this);
	}

	getControlValue(controlKey: string): unknown {
		return readSetting(this.settings, controlKey);
	}

	setControlValue(controlKey: string, value: unknown): void {
		writeSetting(this.settings, controlKey, value);
		// Different criteria may select other cards: confirm the first run again.
		const changed = criteriaProfileId(this.settings, controlKey);
		if (changed) this.settings.confirmedProfiles = this.settings.confirmedProfiles.filter((id) => id !== changed);
		this.plugin.settingsChanged();
		// Page summaries and warnings depend on the edited values.
		this.refreshDomState();
	}

	private usedIds(): Set<string> {
		return new Set(this.settings.profiles.map((profile) => profile.id));
	}

	addProfile(): void {
		const id = uniqueId('profile', this.usedIds());
		this.settings.profiles.push(defaultProfile(id, t('defaults.newProfileName')));
		this.structureChanged();
	}

	duplicateProfile(id: string): void {
		const index = this.settings.profiles.findIndex((profile) => profile.id === id);
		const source = this.settings.profiles[index];
		if (!source) return;
		this.settings.profiles.splice(index + 1, 0, duplicateProfile(source, this.usedIds()));
		this.structureChanged();
		new Notice(t('notice.profileDuplicated', { name: source.name }));
	}

	moveProfile(from: number, to: number): void {
		const profiles = this.settings.profiles;
		const [moved] = profiles.splice(from, 1);
		if (moved) profiles.splice(to, 0, moved);
		// The order decides which profile owns a card: confirm every profile again.
		this.settings.confirmedProfiles = [];
		this.structureChanged();
	}

	removeProfile(index: number): void {
		const profiles = this.settings.profiles;
		if (profiles.length <= 1) {
			new Notice(t('notice.lastProfile'));
			this.update();
			return;
		}
		const [removed] = profiles.splice(index, 1);
		if (removed) this.settings.confirmedProfiles = this.settings.confirmedProfiles.filter((id) => id !== removed.id);
		this.structureChanged();
	}

	previewArchive(): void {
		this.plugin.archive.showPreview();
	}

	archiveNow(): void {
		void this.plugin.archive.archiveNow();
	}

	private structureChanged(): void {
		this.plugin.settingsChanged();
		this.update();
	}
}
