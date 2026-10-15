import { extractSubpath, linkTitle, stripFrontmatter } from '@obsidian-plugins/json-canvas-render';
import { extensionOf, imageType, isMarkdown } from './plan';

/**
 * Turns a canvas into a self-contained one for the web export: every file it points to is
 * copied to `assets/` (paths rewritten), notes become text cards (their text, or a link to them),
 * and links and embeds inside text are rewritten the same way. Nothing in the result points
 * outside the export folder. Pure: the vault is reached through the callbacks.
 */

export type NotesAs = 'text' | 'link';

export interface PortableOptions {
	notes: NotesAs;
	/** URL of a note when notes are links. */
	noteUrl: (path: string) => string;
	/** Vault path of a link target written in `from` (Obsidian's link resolution), or null. */
	resolve: (target: string, from: string) => string | null;
	/** Text of every note the canvas shows (read beforehand). */
	noteText: (path: string) => string | null;
}

export interface Portable {
	canvas: Record<string, unknown>;
	/** Vault path → path inside the export folder (`assets/...`). */
	assets: Map<string, string>;
}

type Data = Record<string, unknown>;

const isRecord = (value: unknown): value is Data => typeof value === 'object' && value !== null && !Array.isArray(value);

/** URL-safe file name: no accents, spaces or punctuation besides `.`, `-` and `_`. */
export function assetFileName(path: string): string {
	const name = path.split('/').pop() ?? path;
	const extension = extensionOf(name);
	const stem = extension ? name.slice(0, -(extension.length + 1)) : name;
	const clean = (text: string): string =>
		text
			.normalize('NFD')
			.replace(/[̀-ͯ]/g, '')
			.replace(/[^A-Za-z0-9._-]+/g, '-')
			.replace(/-+/g, '-')
			.replace(/^-|-$/g, '');
	const base = clean(stem) || 'file';
	return extension ? `${base}.${clean(extension).toLowerCase()}` : base;
}

const isExternal = (target: string): boolean => /^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith('#');

function noteName(path: string): string {
	return linkTitle(path);
}

class Builder {
	readonly assets = new Map<string, string>();
	private readonly used = new Set<string>();

	constructor(private readonly options: PortableOptions) {}

	/** The export path of a vault file, copying it to assets/ (once). */
	asset(path: string): string {
		const known = this.assets.get(path);
		if (known) return known;
		const name = assetFileName(path);
		const extension = extensionOf(name);
		const stem = extension ? name.slice(0, -(extension.length + 1)) : name;
		let candidate = `assets/${name}`;
		for (let n = 2; this.used.has(candidate.toLowerCase()); n++) candidate = `assets/${stem}-${n}${extension ? `.${extension}` : ''}`;
		this.used.add(candidate.toLowerCase());
		this.assets.set(path, candidate);
		return candidate;
	}

	/** Markdown link to a note, or its title as plain text when notes are shown as text. */
	private noteReference(path: string, title: string): string {
		return this.options.notes === 'link' ? `[${title}](${this.options.noteUrl(path)})` : title;
	}

	/** Rewrite links and embeds of a Markdown text written in `from`. Code blocks are left alone. */
	markdown(text: string, from: string): string {
		const parts = text.split(/(^(?:```|~~~)[^\n]*\n[\s\S]*?^(?:```|~~~)[ \t]*$)/m);
		return parts.map((part, index) => (index % 2 === 1 ? part : this.inline(part, from))).join('');
	}

	/** One pass over inline code, embeds, wikilinks and Markdown links, so output is never read again. */
	private inline(text: string, from: string): string {
		const pattern = /(`[^`\n]*`)|!\[\[([^\]]+)\]\]|\[\[([^\]]*)\]\]|(!?)\[([^\]]*)\]\(<?([^)>\s]+)>?\)/g;
		return text.replace(pattern, (match, code?: string, embed?: string, wiki?: string, bang?: string, label?: string, target?: string) => {
			if (code) return code;
			if (embed !== undefined) return this.embed(embed, from) ?? match;
			if (wiki !== undefined) return this.wikilink(wiki, from);
			return this.markdownLink(match, bang === '!', label ?? '', target ?? '', from);
		});
	}

	private split(inner: string): { target: string; subpath: string; alias: string | undefined } {
		const [link = '', alias] = inner.split('|');
		const hash = link.indexOf('#');
		return {
			target: (hash >= 0 ? link.slice(0, hash) : link).trim(),
			subpath: hash >= 0 ? link.slice(hash) : '',
			alias: alias?.trim() || undefined,
		};
	}

	private embed(inner: string, from: string): string | null {
		const { target, alias } = this.split(inner);
		const path = target ? this.options.resolve(target, from) : null;
		if (!path) return null;
		// `|300` or `|300x200` is a size, not a title.
		const title = alias && !/^\d+(x\d+)?$/.test(alias) ? alias : (path.split('/').pop() ?? path);
		if (imageType(path)) return `![${title}](${this.asset(path)})`;
		if (isMarkdown(path)) return this.noteReference(path, alias && title === alias ? alias : noteName(path));
		return `[${title}](${this.asset(path)})`;
	}

	private wikilink(inner: string, from: string): string {
		const { target, subpath, alias } = this.split(inner);
		const title = alias ?? linkTitle(`${target}${subpath}`);
		const path = target ? this.options.resolve(target, from) : null;
		if (!path) return title;
		if (isMarkdown(path)) return this.noteReference(path, title);
		return `[${title}](${this.asset(path)})`;
	}

	private markdownLink(match: string, image: boolean, label: string, target: string, from: string): string {
		if (isExternal(target)) return match;
		let decoded = target;
		try {
			decoded = decodeURI(target);
		} catch {
			// Keep the raw target.
		}
		const path = this.options.resolve(decoded, from);
		if (!path) return label;
		if (isMarkdown(path)) return this.noteReference(path, label || noteName(path));
		return `${image ? '!' : ''}[${label}](${this.asset(path)})`;
	}

	node(node: Data, canvasPath: string): Data {
		const next: Data = { ...node };
		if (node.type === 'text' && typeof node.text === 'string') {
			next.text = this.markdown(node.text, canvasPath);
		} else if (node.type === 'group' && typeof node.background === 'string') {
			const path = this.options.resolve(node.background, canvasPath);
			if (path) next.background = this.asset(path);
			else delete next.background;
		} else if (node.type === 'file' && typeof node.file === 'string') {
			const path = this.options.resolve(node.file, canvasPath);
			if (!path) return this.textCard(next, `*${node.file.split('/').pop() ?? node.file}*`);
			if (isMarkdown(path)) {
				const subpath = typeof node.subpath === 'string' ? node.subpath : undefined;
				if (this.options.notes === 'link') {
					const title = subpath ? linkTitle(`${path}${subpath}`) : noteName(path);
					return this.textCard(next, this.noteReference(path, title));
				}
				const text = this.options.noteText(path);
				const body = text === null ? `*${noteName(path)}*` : this.markdown(extractSubpath(stripFrontmatter(text), subpath), path);
				return this.textCard(next, body);
			}
			next.file = this.asset(path);
		}
		return next;
	}

	/** The node as a text card (same id, position, size, color and extensions). */
	private textCard(node: Data, text: string): Data {
		const card: Data = { ...node, type: 'text', text };
		delete card.file;
		delete card.subpath;
		return card;
	}
}

export function makePortable(data: unknown, canvasPath: string, options: PortableOptions): Portable {
	const builder = new Builder(options);
	const source = isRecord(data) ? data : {};
	const canvas: Data = { ...source };
	canvas.nodes = (Array.isArray(source.nodes) ? source.nodes : []).filter(isRecord).map((node) => builder.node(node, canvasPath));
	canvas.edges = (Array.isArray(source.edges) ? source.edges : []).filter(isRecord).map((edge) => ({ ...edge }));
	return { canvas, assets: builder.assets };
}

/** Notes a canvas shows as file cards (to read before `makePortable`). */
export function notesToRead(data: unknown, canvasPath: string, resolve: PortableOptions['resolve']): string[] {
	const notes = new Set<string>();
	const source = isRecord(data) ? data : {};
	for (const node of Array.isArray(source.nodes) ? source.nodes : []) {
		if (!isRecord(node) || node.type !== 'file' || typeof node.file !== 'string') continue;
		const path = resolve(node.file, canvasPath);
		if (path && isMarkdown(path)) notes.add(path);
	}
	return [...notes];
}
