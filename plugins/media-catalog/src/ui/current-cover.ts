import { TFile, getLinkpath } from 'obsidian';
import type { App } from 'obsidian';
import type { CatalogNoteInfo } from '../types';
import { createImgOrPlaceholder } from './cover-img';

/** Extensions Obsidian shows as images. */
const IMAGE_EXTENSIONS: ReadonlySet<string> = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'bmp', 'svg']);

function isHttpsUrl(value: string): boolean {
	try {
		return new URL(value).protocol === 'https:';
	} catch {
		return false;
	}
}

/** `[[a.jpg]]`, `![[a.jpg|alias]]` or `a.jpg` → `a.jpg`. */
function linkTarget(value: string): string {
	const inner = /^!?\[\[([^\]]*)\]\]$/.exec(value)?.[1] ?? value;
	return getLinkpath(inner.split('|')[0] ?? '').trim();
}

/**
 * Where the note's current cover can be shown from, or null for the
 * placeholder. Any https host is accepted here, since the note already points
 * to it: the image is only shown, never downloaded (downloads stay limited to
 * IMAGE_HOSTS). Links and file names resolve to a vault image.
 */
export function currentCoverSrc(app: App, note: CatalogNoteInfo): string | null {
	const value = note.cover?.trim();
	if (!value) return null;
	if (/^https?:\/\//i.test(value)) return isHttpsUrl(value) ? value : null;
	const target = linkTarget(value);
	if (!target) return null;
	const file = app.metadataCache.getFirstLinkpathDest(target, note.file.path);
	return file instanceof TFile && IMAGE_EXTENSIONS.has(file.extension.toLowerCase()) ? app.vault.getResourcePath(file) : null;
}

/** The note's current cover (cover mode), or the placeholder when it has none or it cannot be shown. */
export function renderCurrentCover(parent: HTMLElement, app: App, note: CatalogNoteInfo): HTMLElement {
	return createImgOrPlaceholder(parent, currentCoverSrc(app, note), note.title);
}
