import { Plugin, debounce } from 'obsidian';
import { PseudocodeBlock } from './block';
import { registerCommands } from './commands';
import { PseudocodeSuggest } from './editor/suggest';
import { refreshReferences, registerReferences } from './references';
import type { ReferenceChild } from './references';
import { BLOCK_LANGUAGE } from './render/numbering';
import { PseudocodeSettingTab } from './settings/settings-tab';
import { defaultSettings, normalizeSettings } from './settings/settings';
import type { PseudocodeSettings } from './settings/settings';

const SAVE_DEBOUNCE_MS = 500;

export default class PseudocodePlugin extends Plugin {
	settings: PseudocodeSettings = defaultSettings();
	readonly blocks = new Set<PseudocodeBlock>();
	readonly references = new Set<ReferenceChild>();
	private readonly saveSoon = debounce(() => void this.saveData(this.settings), SAVE_DEBOUNCE_MS, true);

	async onload(): Promise<void> {
		this.settings = normalizeSettings(await this.loadData());

		// The community Pseudocode plugin registers the same block: disable it before enabling this one.
		this.registerMarkdownCodeBlockProcessor(BLOCK_LANGUAGE, (source, el, ctx) => {
			ctx.addChild(new PseudocodeBlock(el, this, source, ctx));
		});
		registerReferences(this);
		registerCommands(this);
		this.registerEditorSuggest(new PseudocodeSuggest(this));
		this.addSettingTab(new PseudocodeSettingTab(this.app, this));
	}

	onunload(): void {
		this.saveSoon.run();
	}

	settingsChanged(): void {
		this.saveSoon();
		for (const block of this.blocks) block.refresh();
		refreshReferences(this.app, this);
	}
}
