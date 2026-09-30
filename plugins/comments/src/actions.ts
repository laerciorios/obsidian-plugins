import { MarkdownView, Notice, TFile, moment } from 'obsidian';
import type { Editor, EditorPosition, MarkdownFileInfo, Plugin, WorkspaceLeaf } from 'obsidian';
import { cleanQuote, planAnchor } from './anchor/blocks';
import type { AnchorPlan } from './anchor/blocks';
import { newAnchorId } from './anchor/ids';
import { anchorsIn, locate } from './anchor/locate';
import { DATE_FORMAT } from './constants';
import { t } from './i18n';
import { sameAnchor } from './model/format';
import type { ThreadStatus } from './model/format';
import { locateRequest } from './model/threads';
import { ThreadMissingError } from './store/store';
import type { CommentStore } from './store/store';
import type { CommentsSettings } from './types';
import { CommentModal } from './ui/comment-modal';

export interface ActionsHost extends Plugin {
	settings: CommentsSettings;
	store: CommentStore;
	revealThread(notePath: string, anchor: string): Promise<void>;
}

function now(): string {
	return moment().format(DATE_FORMAT);
}

function reportError(error: unknown): void {
	if (error instanceof ThreadMissingError) {
		new Notice(t('notice.threadMissing'));
		return;
	}
	console.error('[comments]', error);
	new Notice(t('notice.saveFailed'));
}

/** What the commands, the editor menu and the panel do. */
export class CommentActions {
	constructor(private readonly plugin: ActionsHost) {}

	/** Open the comment box for the selection (or the block at the cursor). */
	commentSelection(editor: Editor, info: MarkdownView | MarkdownFileInfo): void {
		const file = info.file;
		if (!file) return;
		if (this.plugin.store.isCommentsFile(file.path)) {
			new Notice(t('notice.commentsFile'));
			return;
		}
		const from = editor.getCursor('from');
		const to = editor.getCursor('to');
		const plan = planAnchor(editor.getValue().split('\n'), from.line, to.line);
		if (!this.usable(plan)) return;
		const quote = cleanQuote(editor.getRange(from, to));
		const thread = plan.type === 'existing' ? this.plugin.store.thread(file.path, plan.id) : null;
		new CommentModal(this.plugin.app, {
			quote,
			existing: thread?.status ?? null,
			submit: (body) => void this.submit(editor, info, file, { from, to }, quote, body),
		}).open();
	}

	async reply(notePath: string, anchor: string, body: string): Promise<boolean> {
		try {
			await this.plugin.store.reply(notePath, anchor, { author: this.plugin.settings.author, date: now(), body });
			return true;
		} catch (error) {
			reportError(error);
			return false;
		}
	}

	async setStatus(notePath: string, anchor: string, status: ThreadStatus): Promise<void> {
		try {
			await this.plugin.store.setStatus(notePath, anchor, status);
		} catch (error) {
			reportError(error);
		}
	}

	/** Show the passage: selected in the editor, or the block scrolled to in reading view. */
	async goTo(notePath: string, anchor: string): Promise<void> {
		const { workspace, vault } = this.plugin.app;
		const file = vault.getAbstractFileByPath(notePath);
		if (!(file instanceof TFile)) return;
		const leaf = this.leafOf(notePath) ?? workspace.getLeaf(false);
		if (!(leaf.view instanceof MarkdownView) || leaf.view.file?.path !== notePath) await leaf.openFile(file);
		const view = leaf.view;
		if (!(view instanceof MarkdownView)) return;
		await workspace.revealLeaf(leaf);
		if (view.getMode() !== 'source') {
			await leaf.openFile(file, { active: true, eState: { subpath: `#^${anchor}` } });
			return;
		}
		workspace.setActiveLeaf(leaf, { focus: true });
		const thread = this.plugin.store.thread(notePath, anchor);
		const { editor } = view;
		const location = thread ? locate(editor.getValue(), [locateRequest(thread)]).get(anchor.toLowerCase()) : null;
		if (!location) return;
		const span = location.highlights[0] ?? location.block;
		const range = { from: editor.offsetToPos(span.from), to: editor.offsetToPos(span.to) };
		editor.setSelection(range.from, range.to);
		editor.scrollIntoView(range, true);
		editor.focus();
	}

	openCommentsFile(notePath: string): void {
		const file = this.plugin.store.fileOf(notePath);
		if (file) void this.plugin.app.workspace.getLeaf('tab').openFile(file);
		else new Notice(t('notice.noComments'));
	}

	private usable(plan: AnchorPlan): boolean {
		if (plan.type !== 'refused') return true;
		new Notice(t(plan.reason === 'frontmatter' ? 'notice.frontmatter' : 'notice.empty'));
		return false;
	}

	private async submit(
		editor: Editor,
		info: MarkdownView | MarkdownFileInfo,
		file: TFile,
		selection: { from: EditorPosition; to: EditorPosition },
		quote: string,
		body: string,
	): Promise<void> {
		if (info.file?.path !== file.path) {
			new Notice(t('notice.saveFailed'));
			return;
		}
		// Plan again: the note may have changed while the box was open (sync, another plugin).
		const text = editor.getValue();
		const plan = planAnchor(text.split('\n'), selection.from.line, selection.to.line);
		if (!this.usable(plan) || plan.type === 'refused') return;
		let anchor: string;
		if (plan.type === 'existing') {
			anchor = plan.id;
		} else {
			const inNote = anchorsIn(text);
			const threads = this.plugin.store.threads(file.path);
			anchor = newAnchorId((id) => inNote.has(id) || threads.some((thread) => sameAnchor(thread.anchor, id)));
			// Through the editor: one undoable change, and unsaved edits are kept.
			const line = editor.getLine(plan.line);
			editor.replaceRange(`${plan.before}^${anchor}${plan.after}`, { line: plan.line, ch: line.length });
		}
		try {
			await this.plugin.store.comment(file, anchor, quote, { author: this.plugin.settings.author, date: now(), body });
			await this.plugin.revealThread(file.path, anchor);
		} catch (error) {
			reportError(error);
		}
	}

	/** The leaf showing the note: the most recent one when there are several. */
	private leafOf(notePath: string): WorkspaceLeaf | null {
		const { workspace } = this.plugin.app;
		const recent = workspace.getMostRecentLeaf();
		if (recent?.view instanceof MarkdownView && recent.view.file?.path === notePath) return recent;
		return (
			workspace
				.getLeavesOfType('markdown')
				.find((leaf) => leaf.view instanceof MarkdownView && leaf.view.file?.path === notePath) ?? null
		);
	}
}
