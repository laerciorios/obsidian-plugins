import type { TFile, Vault } from 'obsidian';
import { SVG_MAX_BYTES } from './constants';
import type { SvgFile } from './types';

/** A file's size in bytes, then its text (read only when the size is acceptable). */
export interface SvgSource {
	size: number;
	read(): Promise<string>;
}

/** Read one SVG: no file, an empty one or one over the limit cannot be drawn. */
export async function readSvg(source: SvgSource | null): Promise<SvgFile> {
	if (!source) return { ok: false, problem: 'missing' };
	if (source.size > SVG_MAX_BYTES) return { ok: false, problem: 'too-large' };
	const svg = await source.read();
	if (!svg.trim()) return { ok: false, problem: 'empty' };
	// The size on record can be stale; the text is what goes into the stylesheet.
	if (new TextEncoder().encode(svg).length > SVG_MAX_BYTES) return { ok: false, problem: 'too-large' };
	return { ok: true, svg };
}

/** The vault's SVG files that can be a symbol (not empty, not over the limit), by path. */
export function svgFiles(files: readonly TFile[]): TFile[] {
	return files
		.filter((file) => file.extension.toLowerCase() === 'svg' && file.stat.size > 0 && file.stat.size <= SVG_MAX_BYTES)
		.sort((a, b) => a.path.localeCompare(b.path));
}

/**
 * The vault SVGs used as symbols, read once and kept by path until the file changes. The plugin
 * only reads them: nothing in the vault is written or moved.
 */
export class VaultSvgs {
	private readonly files = new Map<string, SvgFile>();
	/** Bumped by `forget`, so a read that started before a change does not store the old text. */
	private readonly versions = new Map<string, number>();

	constructor(private readonly vault: Vault) {}

	/** For `folderCss`: undefined until `load` has read the path. */
	readonly lookup = (path: string): SvgFile | undefined => this.files.get(path);

	/** Read the paths not read yet. */
	async load(paths: Iterable<string>): Promise<void> {
		const pending = [...new Set(paths)].filter((path) => !this.files.has(path));
		await Promise.all(
			pending.map(async (path) => {
				const version = this.versions.get(path);
				const file = this.vault.getFileByPath(path);
				const source = file ? { size: file.stat.size, read: () => this.vault.cachedRead(file) } : null;
				const svg = await readSvg(source).catch((): SvgFile => ({ ok: false, problem: 'missing' }));
				if (version === this.versions.get(path)) this.files.set(path, svg);
			}),
		);
	}

	/** The file changed, moved or went: read it again next time. */
	forget(path: string): void {
		this.files.delete(path);
		this.versions.set(path, (this.versions.get(path) ?? 0) + 1);
	}
}
