import { Plugin } from 'obsidian';
import { ShapesController } from './canvas/controller';
import { registerEditCommands, registerExportCommands } from './commands';
import { addExportItems } from './export/entry';
import type { CanvasSession, SessionUi } from './canvas/session';
import type { PluginHost } from './host';
import { CanvasShapesSettingTab } from './settings-tab';
import { defaultSettings, normalizeSettings } from './settings';
import type { CanvasShapesSettings } from './settings';
import { registerMenus } from './ui/menus';
import { createSessionUi } from './ui/session-ui';

export default class CanvasShapesPlugin extends Plugin implements PluginHost {
	settings: CanvasShapesSettings = defaultSettings();
	readonly shapes: ShapesController = new ShapesController(this, (session: CanvasSession): SessionUi[] => createSessionUi(session, this));

	async onload(): Promise<void> {
		this.settings = normalizeSettings(await this.loadData());
		this.shapes.load();
		registerEditCommands(this, this.shapes);
		registerExportCommands(this, this);
		registerMenus(this, this.shapes);
		this.registerEvent(this.app.workspace.on('file-menu', (menu, file) => addExportItems(this, menu, file)));
		this.addSettingTab(new CanvasShapesSettingTab(this, this));
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}
}
