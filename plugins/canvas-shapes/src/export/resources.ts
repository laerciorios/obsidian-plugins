import { TFile } from 'obsidian';
import type { App } from 'obsidian';
import type { FileResource } from '@obsidian-plugins/json-canvas-render';
import { bytesToBase64, imageType, isMarkdown, referencedFiles } from './plan';

/**
 * Files of a canvas for a standalone SVG/PNG: images inlined as data URIs (an SVG used as an
 * image cannot load anything else), notes as their text. Missing files resolve to undefined and
 * are drawn as their path.
 */

export function vaultFile(app: App, path: string, from: string): TFile | null {
	const exact = app.vault.getAbstractFileByPath(path);
	if (exact instanceof TFile) return exact;
	return app.metadataCache.getFirstLinkpathDest(path, from);
}

/** Natural size of an image, to tile repeated group backgrounds. */
export function imageSize(src: string): Promise<{ width: number; height: number } | null> {
	return new Promise((resolve) => {
		const img = createEl('img');
		img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
		img.onerror = () => resolve(null);
		img.src = src;
	});
}

export async function inlineResources(app: App, data: unknown, canvasPath: string): Promise<Map<string, FileResource>> {
	const resources = new Map<string, FileResource>();
	for (const path of referencedFiles(data)) {
		const file = vaultFile(app, path, canvasPath);
		if (!file) continue;
		const type = imageType(file.path);
		if (type) {
			const href = `data:${type};base64,${bytesToBase64(await app.vault.readBinary(file))}`;
			const size = await imageSize(href);
			resources.set(path, size ? { kind: 'image', href, ...size } : { kind: 'image', href });
		} else if (isMarkdown(file.path)) {
			resources.set(path, { kind: 'markdown', text: await app.vault.cachedRead(file) });
		} else {
			resources.set(path, { kind: 'other' });
		}
	}
	return resources;
}
