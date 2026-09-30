import { setTooltip } from 'obsidian';
import type { Plugin } from 'obsidian';
import { CLS } from '../constants';
import { plural, t } from '../i18n';
import { openThreads } from '../model/threads';
import type { CommentStore } from '../store/store';
import type { CommentsSettings } from '../types';

export interface CounterHost extends Plugin {
	settings: CommentsSettings;
	store: CommentStore;
	openPanel(): Promise<unknown>;
}

/** "3 comments" in the status bar: open conversations of the active note. Click opens the panel. */
export class CommentCounter {
	private el: HTMLElement | null = null;

	constructor(private readonly plugin: CounterHost) {}

	register(): void {
		const el = this.plugin.addStatusBarItem();
		el.addClass(CLS.status, 'mod-clickable');
		setTooltip(el, t('status.tooltip'), { placement: 'top' });
		el.onClickEvent(() => void this.plugin.openPanel());
		el.hide();
		this.el = el;
		const { workspace } = this.plugin.app;
		const refresh = () => this.refresh();
		this.plugin.registerEvent(workspace.on('active-leaf-change', refresh));
		this.plugin.registerEvent(workspace.on('file-open', refresh));
		this.plugin.register(this.plugin.store.onChange(refresh));
		workspace.onLayoutReady(refresh);
	}

	refresh(): void {
		const el = this.el;
		if (!el) return;
		const file = this.plugin.app.workspace.getActiveFile();
		const store = this.plugin.store;
		const note = file ? store.noteOf(file.path) ?? file.path : null;
		const count = note && this.plugin.settings.statusBar ? openThreads(store.threads(note)).length : 0;
		if (count === 0) {
			el.hide();
			return;
		}
		el.setText(plural('status', count));
		el.show();
	}
}
