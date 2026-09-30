import { getAllTags, moment } from 'obsidian';
import type { App, TFile } from 'obsidian';
import { RESERVATION_MS } from '../constants';
import { genericKeys } from '../naming/generic';
import { attachmentName, coverName } from '../naming/names';
import type { Taken } from '../naming/names';
import { basenameOf, noteSlug } from '../naming/slug';
import type { AttachmentsGuardSettings } from '../types';
import { joinPath } from './files';
import { coverOwner, owningNote } from './references';

export interface PlannerHost {
	app: App;
	settings: AttachmentsGuardSettings;
}

export interface PlanInput {
	/** Original base name, without extension. */
	basename: string;
	extension: string;
	/** Note (or canvas) the attachment belongs to. */
	note: TFile | null;
	/** Name it as the note's cover. */
	cover?: boolean;
	/** The file being moved, when it already exists: its own name is not taken. */
	self?: TFile;
}

export interface Target {
	folder: string;
	/** File name with extension. */
	name: string;
	path: string;
}

/** Where an attachment goes and what it is called. */
export class Planner {
	/** Lowercase file names handed out by the path hook, until the caller creates them. */
	private readonly reserved = new Map<string, number>();

	constructor(private readonly host: PlannerHost) {}

	/** Attachments of notes tagged as AI-generated go to their own folder. */
	folderFor(note: TFile | null): string {
		const { folder, aiFolder } = this.host.settings;
		return aiFolder && this.isAiNote(note) ? aiFolder : folder;
	}

	isAiNote(note: TFile | null): boolean {
		const tag = this.host.settings.aiTag.toLowerCase();
		if (!tag || note?.extension !== 'md') return false;
		const cache = this.host.app.metadataCache.getFileCache(note);
		const tags = cache ? (getAllTags(cache) ?? []) : [];
		return tags.some((item) => item.replace(/^#/, '').toLowerCase() === tag);
	}

	/**
	 * Target of an attachment. `batch` collects the names planned in one run
	 * (a bulk move plans every file before moving any).
	 */
	plan(input: PlanInput, batch?: Set<string>): Target {
		const { settings } = this.host;
		const folder = this.folderFor(input.note);
		const { taken, basenames } = this.names(input.self, batch);
		const slug = input.note ? noteSlug(input.note.path) || null : null;
		const base =
			input.cover && slug
				? coverName(slug, input.extension, taken)
				: attachmentName({
						basename: input.basename,
						extension: input.extension,
						note: slug,
						date: moment().format('YYYY-MM-DD'),
						pattern: settings.pattern,
						genericKeys: genericKeys(settings.genericNames),
						taken,
						basenames,
					});
		const name = `${base}.${input.extension}`;
		batch?.add(name.toLowerCase());
		return { folder, name, path: joinPath(folder, name) };
	}

	/**
	 * Target of an existing file outside the attachments folder: the cover name
	 * when it is a note's cover, otherwise named after the first note that links to it.
	 */
	planExisting(file: TFile, batch?: Set<string>): Target {
		const { app, settings } = this.host;
		const owner = coverOwner(app, file, settings.coverProperty);
		const input = { basename: file.basename, extension: file.extension, self: file };
		if (owner) return this.plan({ ...input, note: owner, cover: true }, batch);
		return this.plan({ ...input, note: owningNote(app, file) }, batch);
	}

	/** Keep a path handed to Obsidian free until the file is created. */
	reserve(target: Target): void {
		this.reserved.set(target.name.toLowerCase(), Date.now() + RESERVATION_MS);
	}

	/** Names in use: every file of the vault (names are unique vault-wide, so `[[name]]` stays short), plus reservations. */
	private names(self: TFile | undefined, batch: Set<string> | undefined): { taken: Taken; basenames: string[] } {
		const now = Date.now();
		for (const [name, until] of this.reserved) if (until < now) this.reserved.delete(name);
		const used = new Set<string>();
		for (const file of this.host.app.vault.getFiles()) {
			if (file !== self) used.add(file.name.toLowerCase());
		}
		for (const name of this.reserved.keys()) used.add(name);
		for (const name of batch ?? []) used.add(name);
		return {
			taken: (fileName) => used.has(fileName.toLowerCase()),
			basenames: [...used].map(basenameOf),
		};
	}
}
