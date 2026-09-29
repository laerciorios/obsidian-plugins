import { TFile } from 'obsidian';
import type { App } from 'obsidian';
import { COVER_SUFFIX } from '../constants';
import { UnexpectedResponseError } from '../providers/errors';
import { getBinary, hostOf } from '../providers/http';
import { folderAt, parentPath } from './paths';

/** Image types a cover may have, by content-type. */
const TYPE_EXTENSIONS: ReadonlyMap<string, string> = new Map([
	['image/jpeg', 'jpg'],
	['image/jpg', 'jpg'],
	['image/pjpeg', 'jpg'],
	['image/png', 'png'],
	['image/webp', 'webp'],
	['image/gif', 'gif'],
]);
const URL_EXTENSIONS: ReadonlySet<string> = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif']);
const FALLBACK_EXTENSION = 'jpg';

function urlExtension(url: string): string | null {
	try {
		const match = /\.([a-z0-9]+)$/i.exec(new URL(url).pathname);
		const extension = match?.[1]?.toLowerCase();
		return extension && URL_EXTENSIONS.has(extension) ? extension : null;
	} catch {
		return null;
	}
}

/**
 * The content-type says what the bytes are, so it wins; the URL is the
 * fallback for servers that send none, then "jpg".
 */
function extensionFor(url: string, contentType: string): string {
	return TYPE_EXTENSIONS.get(contentType) ?? urlExtension(url) ?? FALLBACK_EXTENSION;
}

/**
 * Obsidian resolves relative attachment folders ("./", "./assets") from the
 * parent of `sourcePath`, and only when that file exists. A new note does not
 * exist yet, so any file already in its folder stands in for it.
 */
function attachmentSource(app: App, notePath: string): string {
	if (app.vault.getFileByPath(notePath)) return notePath;
	const sibling = folderAt(app, parentPath(notePath))?.children.find((child) => child instanceof TFile);
	return sibling?.path ?? notePath;
}

async function attachmentPath(app: App, name: string, notePath: string): Promise<string> {
	try {
		return await app.fileManager.getAvailablePathForAttachment(name, attachmentSource(app, notePath));
	} catch {
		return app.fileManager.getAvailablePathForAttachment(name);
	}
}

/**
 * Downloads to fileManager.getAvailablePathForAttachment(`${slug}-cover.${ext}`, notePath)
 * and returns the frontmatter value `[[<file name>]]`. Throws on failure
 * (blocked host, HTTP error, not an image).
 */
export async function downloadCover(app: App, url: string, slug: string, notePath: string): Promise<string> {
	const { data, contentType } = await getBinary(url);
	if ((contentType && !TYPE_EXTENSIONS.has(contentType)) || data.byteLength === 0) {
		throw new UnexpectedResponseError(hostOf(url));
	}
	const name = `${slug}${COVER_SUFFIX}.${extensionFor(url, contentType)}`;
	const file = await app.vault.createBinary(await attachmentPath(app, name, notePath), data);
	return `[[${file.name}]]`;
}
