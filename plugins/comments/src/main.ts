import { Plugin, debounce } from 'obsidian';
import { CommentActions } from './actions';
import { registerCommands } from './commands';
import { ICON, RELOAD_DEBOUNCE_MS, SAVE_DEBOUNCE_MS, VIEW_TYPE } from './constants';
import { commentDecorations, refreshEditors } from './editor/decorations';
import { t } from './i18n';
import { defaultSettings, isOwnData, normalizeSettings } from './settings/settings';
import { CommentsSettingTab } from './settings/settings-tab';
import { CommentStore } from './store/store';
import type { CommentsSettings } from './types';
import { registerEditorMenu } from './ui/editor-menu';
import { CommentsView } from './ui/panel';
import { CommentCounter } from './ui/status-bar';

export default class CommentsPlugin extends Plugin {
	settings: CommentsSettings = defaultSettings();
	readonly store = new CommentStore(this);
	readonly actions = new CommentActions(this);
	private readonly counter = new CommentCounter(this);
	private folder = '';
	private readonly saveSoon = debounce(() => void this.saveData(this.settings), SAVE_DEBOUNCE_MS, true);
	private readonly reloadSoon = debounce(() => void this.store.reload(), RELOAD_DEBOUNCE_MS, true);

	async onload(): Promise<void> {
		const saved: unknown = await this.loadData();
		this.settings = normalizeSettings(saved);
		// First run: save right away, so the author keeps the language it was created in.
		if (!isOwnData(saved)) await this.saveData(this.settings);
		this.folder = this.settings.folder;

		this.registerView(VIEW_TYPE, (leaf) => new CommentsView(leaf, this));
		this.store.register();
		this.register(this.store.onChange(() => refreshEditors()));
		this.registerEditorExtension(commentDecorations(this));
		// The same editor is reused when a tab opens another note.
		this.registerEvent(this.app.workspace.on('file-open', () => refreshEditors()));
		this.counter.register();
		registerCommands(this);
		registerEditorMenu(this);
		this.addRibbonIcon(ICON, t('command.openPanel'), () => void this.openPanel());
		this.addSettingTab(new CommentsSettingTab(this.app, this));
	}

	onunload(): void {
		this.reloadSoon.cancel();
		this.saveSoon.run();
	}

	settingsChanged(): void {
		this.saveSoon();
		if (this.settings.folder !== this.folder) {
			this.folder = this.settings.folder;
			this.reloadSoon();
		}
		refreshEditors();
		this.counter.refresh();
		for (const view of this.panels()) view.refresh();
	}

	/** Open (or reveal) the panel in the right sidebar, without taking the focus. */
	async openPanel(): Promise<CommentsView | null> {
		const leaf = await this.app.workspace.ensureSideLeaf(VIEW_TYPE, 'right', { active: false, reveal: true });
		await leaf.loadIfDeferred();
		return leaf.view instanceof CommentsView ? leaf.view : null;
	}

	async revealThread(notePath: string, anchor: string): Promise<void> {
		(await this.openPanel())?.focusThread(notePath, anchor);
	}

	private panels(): CommentsView[] {
		return this.app.workspace
			.getLeavesOfType(VIEW_TYPE)
			.map((leaf) => leaf.view)
			.filter((view): view is CommentsView => view instanceof CommentsView);
	}
}
