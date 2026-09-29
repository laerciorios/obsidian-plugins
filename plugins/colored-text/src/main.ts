import type { Extension } from '@codemirror/state';
import { MarkdownView, Plugin, debounce } from 'obsidian';
import { ColorActions } from './actions';
import { ColorCommands } from './commands';
import { REFRESH_DEBOUNCE_MS, SAVE_DEBOUNCE_MS } from './constants';
import { colorDecorations } from './editor/decorations';
import { Palette } from './palette';
import { colorMarks } from './render/reading-view';
import { defaultSettings, isOwnData, normalizeSettings } from './settings/settings';
import { ColoredTextSettingTab } from './settings/settings-tab';
import type { ColoredTextSettings } from './types';
import { registerEditorMenu } from './ui/editor-menu';

export default class ColoredTextPlugin extends Plugin {
	settings: ColoredTextSettings = defaultSettings();
	palette = new Palette([]);
	readonly actions = new ColorActions(this);
	private readonly commands = new ColorCommands(this, this.actions);
	/** Registered once and replaced in place when the palette changes (see refresh). */
	private readonly editorExtensions: Extension[] = [];
	private readonly saveSoon = debounce(() => void this.saveData(this.settings), SAVE_DEBOUNCE_MS, true);
	private readonly refreshSoon = debounce(() => this.refresh(), REFRESH_DEBOUNCE_MS, true);

	async onload(): Promise<void> {
		const saved: unknown = await this.loadData();
		this.settings = normalizeSettings(saved);
		// First run, or data.json left by the community plugin with the same id: save the
		// palette right away, so its names (typed in notes) keep the language they were created in.
		if (!isOwnData(saved)) await this.saveData(this.settings);
		this.palette = new Palette(this.settings.colors);

		this.editorExtensions.push(colorDecorations(this.palette));
		this.registerEditorExtension(this.editorExtensions);
		this.registerMarkdownPostProcessor(colorMarks(() => this.palette));
		this.commands.register();
		this.commands.sync(this.settings.colors);
		registerEditorMenu(this);
		this.addSettingTab(new ColoredTextSettingTab(this.app, this));
	}

	onunload(): void {
		this.refreshSoon.cancel();
		this.saveSoon.run();
	}

	settingsChanged(): void {
		this.saveSoon();
	}

	paletteChanged(): void {
		this.palette = new Palette(this.settings.colors);
		this.saveSoon();
		this.refreshSoon();
	}

	rememberColor(token: string): void {
		const memory = this.palette.memoryFor(token);
		if (!memory || memory === this.settings.lastColor) return;
		this.settings.lastColor = memory;
		this.saveSoon();
	}

	/** Apply a new palette to the per-color commands, open editors and reading views. */
	private refresh(): void {
		this.commands.sync(this.settings.colors);
		this.editorExtensions.splice(0, this.editorExtensions.length, colorDecorations(this.palette));
		this.app.workspace.updateOptions();
		for (const leaf of this.app.workspace.getLeavesOfType('markdown')) {
			const view = leaf.view;
			if (view instanceof MarkdownView && view.getMode() === 'preview') view.previewMode.rerender(true);
		}
	}
}
