import { getLinkpath } from 'obsidian';
import type { App, TFile } from 'obsidian';

/** Files whose links (body, embeds, frontmatter) resolve to `file`, sorted by path. */
export function linkingFiles(app: App, file: TFile): TFile[] {
	const sources: string[] = [];
	for (const [source, targets] of Object.entries(app.metadataCache.resolvedLinks)) {
		if (targets[file.path]) sources.push(source);
	}
	return sources
		.sort((a, b) => a.localeCompare(b))
		.map((path) => app.vault.getFileByPath(path))
		.filter((source): source is TFile => source !== null);
}

/**
 * The file the note's cover property links to (`cover: "[[x.png]]"`), or null.
 * Plain text and URLs are not links: `renameFile` would not update them.
 */
export function coverTarget(app: App, note: TFile, property: string): TFile | null {
	if (!property) return null;
	const links = app.metadataCache.getFileCache(note)?.frontmatterLinks ?? [];
	// A list property stores its links as "cover.0", "cover.1"…
	const link = links.find((item) => item.key === property || item.key.startsWith(`${property}.`));
	if (!link) return null;
	return app.metadataCache.getFirstLinkpathDest(getLinkpath(link.link), note.path);
}

/** The note whose cover is `file`, when no other file links to it. */
export function coverOwner(app: App, file: TFile, property: string): TFile | null {
	if (!property) return null;
	const sources = linkingFiles(app, file);
	const [note] = sources;
	if (sources.length !== 1 || !note) return null;
	return coverTarget(app, note, property)?.path === file.path ? note : null;
}

/** The note an attachment belongs to: the first note or canvas that links to it. */
export function owningNote(app: App, file: TFile): TFile | null {
	return linkingFiles(app, file).find((source) => source.extension === 'md' || source.extension === 'canvas') ?? null;
}
