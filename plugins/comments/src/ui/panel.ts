import { Component, ItemView, MarkdownView, Scope, TFile, debounce, setIcon, setTooltip } from 'obsidian';
import type { Plugin, WorkspaceLeaf } from 'obsidian';
import type { CommentActions } from '../actions';
import { locate } from '../anchor/locate';
import { CLS, EDIT_DEBOUNCE_MS, ICON, VIEW_TYPE } from '../constants';
import { plural, t } from '../i18n';
import { sameAnchor } from '../model/format';
import type { Thread } from '../model/format';
import { locateRequest, openThreads } from '../model/threads';
import type { CommentStore } from '../store/store';
import type { CommentsSettings } from '../types';
import { renderThread, sendFocusedReply } from './thread-card';

export interface PanelHost extends Plugin {
	settings: CommentsSettings;
	store: CommentStore;
	actions: CommentActions;
	settingsChanged(): void;
}

interface Focus {
	notePath: string;
	anchor: string;
}

/**
 * The conversations of the active note, in the order of their passages; orphans
 * (block deleted) at the end. Follows the active note like the backlinks pane,
 * keeping the last note while a sidebar has focus.
 */
export class CommentsView extends ItemView {
	private notePath: string | null = null;
	private focus: Focus | null = null;
	private readonly drafts = new Map<string, string>();
	private readonly replying = new Set<string>();
	private renderScope: Component | null = null;
	private generation = 0;
	private readonly refreshSoon = debounce(() => void this.render(), EDIT_DEBOUNCE_MS, true);

	constructor(
		leaf: WorkspaceLeaf,
		private readonly plugin: PanelHost,
	) {
		super(leaf);
		// Obsidian's hotkeys take Mod+Enter before a text box sees it: claim it while the panel is active.
		this.scope = new Scope(this.app.scope);
		this.scope.register(['Mod'], 'Enter', () => !sendFocusedReply(activeDocument.activeElement));
	}

	getViewType(): string {
		return VIEW_TYPE;
	}

	getDisplayText(): string {
		return t('view.title');
	}

	getIcon(): string {
		return ICON;
	}

	onOpen(): Promise<void> {
		this.contentEl.addClass(CLS.panel);
		const { workspace, vault } = this.app;
		this.registerEvent(workspace.on('active-leaf-change', () => this.follow()));
		this.registerEvent(workspace.on('file-open', () => this.follow()));
		// Deleting a block makes its conversation an orphan: recheck while typing (debounced).
		this.registerEvent(
			workspace.on('editor-change', (_editor, info) => {
				if (info.file?.path === this.notePath) this.refreshSoon();
			}),
		);
		this.registerEvent(
			vault.on('modify', (file) => {
				if (file.path === this.notePath) this.refreshSoon();
			}),
		);
		this.registerEvent(vault.on('rename', () => this.follow(true)));
		this.register(this.plugin.store.onChange(() => void this.render()));
		this.follow(true);
		return Promise.resolve();
	}

	onClose(): Promise<void> {
		this.refreshSoon.cancel();
		return Promise.resolve();
	}

	/** Show a conversation: switch to its note, include it even if resolved, scroll to it. */
	focusThread(notePath: string, anchor: string): void {
		this.focus = { notePath, anchor };
		this.notePath = notePath;
		void this.render();
	}

	refresh(): void {
		void this.render();
	}

	private follow(force = false): void {
		const file = this.app.workspace.getActiveFile();
		const path = file ? this.plugin.store.noteOf(file.path) ?? file.path : null;
		if (!force && path === this.notePath) return;
		if (path !== this.notePath) this.focus = null;
		this.notePath = path;
		void this.render();
	}

	/** The note text now: from the editor when it is open (unsaved edits count), else from disk. */
	private async noteText(file: TFile): Promise<string> {
		for (const leaf of this.app.workspace.getLeavesOfType('markdown')) {
			const view = leaf.view;
			if (view instanceof MarkdownView && view.file?.path === file.path) return view.getViewData();
		}
		return this.app.vault.cachedRead(file);
	}

	private async render(): Promise<void> {
		const generation = ++this.generation;
		const path = this.notePath;
		const file = path ? this.app.vault.getAbstractFileByPath(path) : null;
		const note = file instanceof TFile && file.extension === 'md' ? file : null;
		const text = note ? await this.noteText(note) : '';
		// A newer render started while reading the note.
		if (generation !== this.generation) return;

		const scrollTop = this.contentEl.scrollTop;
		if (this.renderScope) this.removeChild(this.renderScope);
		const renderScope = this.addChild(new Component());
		this.renderScope = renderScope;
		this.contentEl.empty();

		if (!note) {
			this.empty(t('panel.noNote'));
			return;
		}
		if (this.plugin.store.isCommentsFile(note.path)) {
			this.empty(t('panel.commentsFile'));
			return;
		}
		const threads = this.plugin.store.threads(note.path);
		this.header(note, threads);
		if (threads.length === 0) {
			this.empty(t('panel.none'));
			return;
		}

		const locations = locate(text, threads.map(locateRequest));
		const position = (thread: Thread) => locations.get(thread.anchor.toLowerCase())?.block.from ?? Number.MAX_SAFE_INTEGER;
		const focus = this.focus?.notePath === note.path ? this.focus.anchor : null;
		const visible = threads
			.filter((thread) => !this.plugin.settings.onlyOpen || thread.status === 'open' || (focus && sameAnchor(thread.anchor, focus)))
			.sort((a, b) => position(a) - position(b));
		if (visible.length === 0) {
			this.empty(plural('panel.allResolved', threads.length));
			return;
		}

		const list = this.contentEl.createDiv({ cls: CLS.list });
		const sourcePath = this.plugin.store.fileOf(note.path)?.path ?? note.path;
		let focusedCard: HTMLElement | null = null;
		for (const thread of visible) {
			const key = thread.anchor.toLowerCase();
			const focused = focus !== null && sameAnchor(thread.anchor, focus);
			const card = renderThread(list, thread, {
				app: this.app,
				component: renderScope,
				sourcePath,
				orphan: !locations.has(key),
				focused,
				replying: this.replying.has(key),
				draft: this.drafts.get(key) ?? '',
				goTo: () => void this.plugin.actions.goTo(note.path, thread.anchor),
				setStatus: (status) => void this.plugin.actions.setStatus(note.path, thread.anchor, status),
				toggleReply: (open) => {
					if (open) this.replying.add(key);
					else this.replying.delete(key);
					void this.render();
				},
				saveDraft: (draft) => this.drafts.set(key, draft),
				sendReply: async (body) => {
					const sent = await this.plugin.actions.reply(note.path, thread.anchor, body);
					if (sent) {
						this.replying.delete(key);
						this.drafts.delete(key);
						void this.render();
					}
					return sent;
				},
			});
			if (focused) focusedCard = card;
		}
		this.contentEl.scrollTop = scrollTop;
		focusedCard?.scrollIntoView({ block: 'nearest' });
	}

	private header(note: TFile, threads: readonly Thread[]): void {
		const header = this.contentEl.createDiv({ cls: CLS.header });
		header.createDiv({ cls: CLS.title, text: note.basename });
		if (threads.length === 0) return;
		const open = openThreads(threads).length;
		const parts = [plural('panel.open', open)];
		if (open < threads.length) parts.push(plural('panel.resolved', threads.length - open));
		header.createDiv({ cls: CLS.summary, text: parts.join(' · ') });
		const toolbar = header.createDiv({ cls: CLS.toolbar });
		const filter = toolbar.createEl('label', { cls: CLS.filter });
		const box = filter.createEl('input', { type: 'checkbox' });
		box.checked = this.plugin.settings.onlyOpen;
		filter.appendText(t('panel.onlyOpen'));
		box.addEventListener('change', () => {
			this.plugin.settings.onlyOpen = box.checked;
			this.focus = null;
			this.plugin.settingsChanged();
		});
		if (this.plugin.store.fileOf(note.path)) {
			const openFile = toolbar.createDiv({ cls: 'clickable-icon', attr: { role: 'button' } });
			setIcon(openFile, 'file-text');
			setTooltip(openFile, t('panel.openFile'));
			openFile.onClickEvent(() => this.plugin.actions.openCommentsFile(note.path));
		}
	}

	private empty(text: string): void {
		this.contentEl.createDiv({ cls: CLS.empty, text });
	}
}
