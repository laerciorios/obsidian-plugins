import { TFile, TFolder } from 'obsidian';
import type { Plugin, TAbstractFile } from 'obsidian';
import { appendMessage, appendThread, newCommentsFile, setStatus } from '../model/edit';
import type { NewMessage, NoteTarget } from '../model/edit';
import { findThread, parseComments } from '../model/format';
import type { CommentsDoc, Thread, ThreadStatus } from '../model/format';
import { slugify } from '../model/slug';
import type { CommentsSettings } from '../types';

export interface StoreHost extends Plugin {
	settings: CommentsSettings;
}

interface Entry {
	/** Path of the note the file belongs to; null when its `note` link does not resolve. */
	note: string | null;
	doc: CommentsDoc;
}

/** Thrown when a write targets a thread that is no longer in the file. */
export class ThreadMissingError extends Error {}

function targetOf(note: TFile): NoteTarget {
	return { path: note.path.replace(/\.md$/i, ''), name: note.basename };
}

/**
 * The comments files of the vault, parsed and indexed by note. The link is the
 * `note` property, not the file name: Obsidian updates it when the note is
 * renamed. Files changed outside the plugin (by hand, an AI agent, sync) are
 * re-read on `modify`.
 */
export class CommentStore {
	private readonly entries = new Map<string, Entry>();
	private readonly byNote = new Map<string, string>();
	private readonly listeners = new Set<() => void>();
	private ready = false;

	constructor(private readonly plugin: StoreHost) {}

	private get folder(): string {
		return this.plugin.settings.folder;
	}

	register(): void {
		const { vault, workspace } = this.plugin.app;
		// Vault events fire for every file while the vault loads: listen after the layout is ready.
		workspace.onLayoutReady(() => {
			this.plugin.registerEvent(vault.on('create', (file) => void this.changed(file)));
			this.plugin.registerEvent(vault.on('modify', (file) => void this.changed(file)));
			this.plugin.registerEvent(vault.on('delete', (file) => this.deleted(file.path)));
			this.plugin.registerEvent(vault.on('rename', (file, oldPath) => void this.renamed(file, oldPath)));
			void this.reload();
		});
	}

	/** Listen to any change of any comments file. Returns the unsubscribe function. */
	onChange(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	get isReady(): boolean {
		return this.ready;
	}

	isCommentsFile(path: string): boolean {
		return path.startsWith(`${this.folder}/`) && path.toLowerCase().endsWith('.md');
	}

	threads(notePath: string): Thread[] {
		return this.entryOf(notePath)?.doc.threads ?? [];
	}

	thread(notePath: string, anchor: string): Thread | null {
		const entry = this.entryOf(notePath);
		return entry ? findThread(entry.doc, anchor) : null;
	}

	fileOf(notePath: string): TFile | null {
		const path = this.byNote.get(notePath);
		const file = path ? this.plugin.app.vault.getAbstractFileByPath(path) : null;
		return file instanceof TFile ? file : null;
	}

	/** The note a comments file belongs to. */
	noteOf(commentsPath: string): string | null {
		return this.entries.get(commentsPath)?.note ?? null;
	}

	/** Rescan the comments folder (on load and when the folder setting changes). */
	async reload(): Promise<void> {
		this.entries.clear();
		this.byNote.clear();
		const files = this.plugin.app.vault.getMarkdownFiles().filter((file) => this.isCommentsFile(file.path));
		await Promise.all(files.map((file) => this.read(file)));
		this.ready = true;
		this.emit();
	}

	/** Add a comment on `anchor`: a new thread, or a message in the existing one (reopened if resolved). */
	async comment(note: TFile, anchor: string, quote: string, message: NewMessage): Promise<void> {
		const file = this.fileOf(note.path);
		if (!file) {
			const created = await this.create(note, anchor, quote, message);
			await this.read(created);
			this.emit();
			return;
		}
		await this.plugin.app.vault.process(file, (text) => {
			const thread = findThread(parseComments(text), anchor);
			if (!thread) return appendThread(text, targetOf(note), anchor, quote, message);
			const otherPassage = quote && quote !== thread.quote ? quote : '';
			const added = appendMessage(text, anchor, { ...message, quote: otherPassage }) ?? text;
			return thread.status === 'resolved' ? setStatus(added, anchor, 'open') ?? added : added;
		});
		await this.read(file);
		this.emit();
	}

	async reply(notePath: string, anchor: string, message: NewMessage): Promise<void> {
		await this.edit(notePath, (text) => appendMessage(text, anchor, message));
	}

	async setStatus(notePath: string, anchor: string, status: ThreadStatus): Promise<void> {
		await this.edit(notePath, (text) => setStatus(text, anchor, status));
	}

	private async edit(notePath: string, change: (text: string) => string | null): Promise<void> {
		const file = this.fileOf(notePath);
		if (!file) throw new ThreadMissingError();
		let missing = false;
		await this.plugin.app.vault.process(file, (text) => {
			const changed = change(text);
			missing = changed === null;
			return changed ?? text;
		});
		await this.read(file);
		this.emit();
		if (missing) throw new ThreadMissingError();
	}

	private entryOf(notePath: string): Entry | null {
		const path = this.byNote.get(notePath);
		return path ? this.entries.get(path) ?? null : null;
	}

	private emit(): void {
		for (const listener of this.listeners) listener();
	}

	private async read(file: TFile): Promise<void> {
		const doc = parseComments(await this.plugin.app.vault.read(file));
		const target = doc.note ? this.plugin.app.metadataCache.getFirstLinkpathDest(doc.note, file.path) : null;
		const note = target?.extension === 'md' ? target.path : null;
		this.forget(file.path);
		this.entries.set(file.path, { note, doc });
		// Two files for the same note (a copy made by hand): the first one read wins.
		if (note && !this.byNote.has(note)) this.byNote.set(note, file.path);
	}

	private forget(path: string): void {
		const note = this.entries.get(path)?.note;
		if (note && this.byNote.get(note) === path) this.byNote.delete(note);
		this.entries.delete(path);
	}

	private async changed(file: TAbstractFile): Promise<void> {
		if (!(file instanceof TFile) || !this.isCommentsFile(file.path)) return;
		await this.read(file);
		this.emit();
	}

	private deleted(path: string): void {
		if (!this.entries.has(path)) return;
		this.forget(path);
		this.emit();
	}

	private async renamed(file: TAbstractFile, oldPath: string): Promise<void> {
		if (this.entries.has(oldPath)) {
			this.forget(oldPath);
			if (file instanceof TFile && this.isCommentsFile(file.path)) await this.read(file);
			this.emit();
			return;
		}
		if (file instanceof TFile && this.isCommentsFile(file.path)) {
			await this.read(file);
			this.emit();
			return;
		}
		// A note with comments was renamed. Obsidian rewrites the `note` link, which triggers
		// `modify` and a re-read; until then, follow the note here.
		const path = this.byNote.get(oldPath);
		const entry = path ? this.entries.get(path) : undefined;
		if (!path || !entry) return;
		this.byNote.delete(oldPath);
		this.byNote.set(file.path, path);
		entry.note = file.path;
		this.emit();
	}

	private async create(note: TFile, anchor: string, quote: string, message: NewMessage): Promise<TFile> {
		await this.ensureFolder();
		const path = this.pathFor(note);
		return this.plugin.app.vault.create(path, newCommentsFile(targetOf(note), anchor, quote, message));
	}

	private async ensureFolder(): Promise<void> {
		const { vault } = this.plugin.app;
		let path = '';
		for (const part of this.folder.split('/')) {
			path = path ? `${path}/${part}` : part;
			const existing = vault.getAbstractFileByPath(path);
			if (existing instanceof TFolder) continue;
			if (existing) throw new Error(`"${path}" is a file, not a folder`);
			await vault.createFolder(path);
		}
	}

	/** "<folder>/<slug>.md"; with several notes of the same name, the parent folder or a number. */
	private pathFor(note: TFile): string {
		const { vault } = this.plugin.app;
		const free = (name: string) => !vault.getAbstractFileByPath(`${this.folder}/${name}.md`);
		const base = slugify(note.basename) || 'note';
		const parent = note.parent && !note.parent.isRoot() ? slugify(note.parent.name) : '';
		const candidates = [base, parent ? `${parent}-${base}` : ''].filter(Boolean);
		const name = candidates.find(free);
		if (name) return `${this.folder}/${name}.md`;
		for (let n = 2; ; n++) {
			if (free(`${base}-${n}`)) return `${this.folder}/${base}-${n}.md`;
		}
	}
}
