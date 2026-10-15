import { normalizeCanvas } from '@obsidian-plugins/json-canvas-render';

/** Pure parts of the exports: which files a canvas uses, what a selection covers, sizes. */

const IMAGE_TYPES: Record<string, string> = {
	png: 'image/png',
	jpg: 'image/jpeg',
	jpeg: 'image/jpeg',
	gif: 'image/gif',
	webp: 'image/webp',
	svg: 'image/svg+xml',
	bmp: 'image/bmp',
	avif: 'image/avif',
};

export function extensionOf(path: string): string {
	const name = path.split('/').pop() ?? path;
	const dot = name.lastIndexOf('.');
	return dot > 0 ? name.slice(dot + 1).toLowerCase() : '';
}

/** MIME type of an image file, or null when the file is not an image the browser draws. */
export function imageType(path: string): string | null {
	return IMAGE_TYPES[extensionOf(path)] ?? null;
}

export function isMarkdown(path: string): boolean {
	return extensionOf(path) === 'md';
}

/** Vault paths used by file nodes and group backgrounds, without duplicates. */
export function referencedFiles(data: unknown): string[] {
	const files = new Set<string>();
	for (const node of normalizeCanvas(data).nodes) {
		if (node.type === 'file' && node.file) files.add(node.file);
		if (node.type === 'group' && node.background) files.add(node.background);
	}
	return [...files];
}

/**
 * Ids to draw for a selection: the selected nodes and edges, plus everything inside a selected
 * group (exporting a group means exporting what it holds).
 */
export function selectionIds(data: unknown, selected: Iterable<string>): string[] {
	const ids = new Set(selected);
	const { nodes } = normalizeCanvas(data);
	for (const group of nodes) {
		if (group.type !== 'group' || !ids.has(group.id)) continue;
		for (const node of nodes) {
			if (
				node.x >= group.x &&
				node.y >= group.y &&
				node.x + node.width <= group.x + group.width &&
				node.y + node.height <= group.y + group.height
			) {
				ids.add(node.id);
			}
		}
	}
	return [...ids];
}

/** Browsers refuse canvases above ~16k px per side or ~268M px: the largest scale that fits. */
export const MAX_SIDE = 16384;
export const MAX_AREA = 268_000_000;

export function fitScale(width: number, height: number, scale: number): number {
	const bySide = MAX_SIDE / Math.max(1, width, height);
	const byArea = Math.sqrt(MAX_AREA / Math.max(1, width * height));
	return Math.min(scale, bySide, byArea);
}

/** A file name without characters that file systems refuse. */
export function safeFileName(name: string): string {
	const clean = name.replace(/[\\/:*?"<>|#^[\]]+/g, ' ').replace(/\s+/g, ' ').trim();
	return clean || 'canvas';
}

export function bytesToBase64(bytes: ArrayBuffer): string {
	const view = new Uint8Array(bytes);
	let binary = '';
	const chunk = 0x8000;
	for (let i = 0; i < view.length; i += chunk) binary += String.fromCharCode(...view.subarray(i, i + chunk));
	return btoa(binary);
}
