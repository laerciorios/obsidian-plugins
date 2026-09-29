import { moment, normalizePath } from 'obsidian';

/**
 * Path patterns with {tokens}, used for archive folders, new card folders and
 * new card file names. Parsing validates the tokens allowed in each context;
 * resolving never produces a broken path: any token that cannot be resolved
 * (e.g. {projectFolder} for a card without project) is reported instead.
 */

export type TokenName =
	| 'cardFolder'
	| 'projectFolder'
	| 'projectSlug'
	| 'projectName'
	| 'date'
	| 'year'
	| 'month'
	| 'slug'
	| 'title';

export type PatternKind = 'archiveFolder' | 'newCardFolder' | 'fileName';

const ALL: TokenName[] = ['cardFolder', 'projectFolder', 'projectSlug', 'projectName', 'date', 'year', 'month', 'slug', 'title'];

export const ALLOWED_TOKENS: Record<PatternKind, readonly TokenName[]> = {
	archiveFolder: ALL,
	newCardFolder: ALL.filter((token) => token !== 'cardFolder'),
	fileName: ['projectSlug', 'projectName', 'date', 'year', 'month', 'slug', 'title'],
};

/** Tokens whose value is a folder path (may contain "/"). */
const PATH_TOKENS = new Set<TokenName>(['cardFolder', 'projectFolder']);

export type PatternPart = { kind: 'text'; text: string } | { kind: 'token'; name: TokenName; format?: string };

export type PatternErrorCode =
	| 'empty'
	| 'unclosed'
	| 'unknownToken'
	| 'notAllowed'
	| 'dateFormat'
	| 'parentDir'
	| 'slash'
	/** Archive folder pattern made only of tokens (no fixed folder name). */
	| 'noLiteral'
	/** Profile-level: no card tag and no include folders (would match every note). */
	| 'noCriteria';

export interface PatternError {
	code: PatternErrorCode;
	token?: string;
}

export interface ParsedPattern {
	source: string;
	kind: PatternKind;
	parts: PatternPart[];
}

export type ParseResult = { ok: true; pattern: ParsedPattern } | { ok: false; error: PatternError };

const TOKEN = /\{([^{}]*)\}/g;

/**
 * Same cleanup resolvePattern applies to its output: "\" → "/", no empty or "."
 * segments, spaces trimmed around "/", Unicode NFC. The archive matcher is
 * built from this text, so it recognizes exactly the folders the pattern makes.
 */
function normalizeSource(source: string): string {
	return normalizePath(source.trim())
		.split('/')
		.map((segment) => segment.trim())
		.filter((segment) => segment !== '' && segment !== '.')
		.join('/');
}

const hasToken = (text: string): boolean => /\{[^{}]*\}/.test(text);

export function parsePattern(source: string, kind: PatternKind): ParseResult {
	if (source.trim() === '') return { ok: false, error: { code: 'empty' } };
	const text = normalizeSource(source);
	if (text === '') return { ok: false, error: { code: 'empty' } };

	const parts: PatternPart[] = [];
	let last = 0;
	for (const match of text.matchAll(TOKEN)) {
		const index = match.index ?? 0;
		if (index > last) parts.push({ kind: 'text', text: text.slice(last, index) });
		const inner = (match[1] ?? '').trim();
		const [rawName = '', ...formatParts] = inner.split(':');
		const name = rawName.trim();
		if (!(ALL as string[]).includes(name)) return { ok: false, error: { code: 'unknownToken', token: `{${inner}}` } };
		const token = name as TokenName;
		if (!ALLOWED_TOKENS[kind].includes(token)) return { ok: false, error: { code: 'notAllowed', token: `{${name}}` } };
		const format = formatParts.join(':').trim();
		if (token === 'date' && format === '') return { ok: false, error: { code: 'dateFormat', token: '{date}' } };
		parts.push(format ? { kind: 'token', name: token, format } : { kind: 'token', name: token });
		last = index + match[0].length;
	}
	if (last < text.length) parts.push({ kind: 'text', text: text.slice(last) });

	const literal = parts.map((part) => (part.kind === 'text' ? part.text : '')).join('');
	if (/[{}]/.test(literal)) return { ok: false, error: { code: 'unclosed' } };
	if (text.split('/').some((segment) => segment === '..')) return { ok: false, error: { code: 'parentDir' } };
	if (kind === 'fileName' && literal.includes('/')) return { ok: false, error: { code: 'slash' } };
	// An archive folder needs a fixed name ("Archived"): with only tokens, ordinary
	// folders would look like archives and their cards would be hidden, never archived.
	if (kind === 'archiveFolder' && text.split('/').every(hasToken)) return { ok: false, error: { code: 'noLiteral' } };
	return { ok: true, pattern: { source: text, kind, parts } };
}

export interface ProjectInfo {
	/** Path of the project note (e.g. "Work/Acme/Projects/Site/index.md"). */
	path: string;
	/** Folder of the project note. */
	folder: string;
	/** `slug` property, or the project name in kebab-case. */
	slug: string;
	/** Folder name for folder notes (index.md), otherwise the note name. */
	name: string;
}

export interface PatternContext {
	/** Current folder of the card ({cardFolder}). */
	cardFolder?: string;
	project?: ProjectInfo | null;
	/** Card title ({title}, {slug}). */
	title?: string;
	now: Date;
}

export type ResolveResult = { ok: true; value: string } | { ok: false; missing: TokenName };

/**
 * Lowercase, no accents, words joined by "-": "Tela de Início" → "tela-de-inicio".
 * Letters of any script are kept ("Задача" → "задача").
 */
export function slugify(text: string, maxLength = 80): string {
	return text
		.normalize('NFD')
		.replace(/\p{M}+/gu, '')
		.toLowerCase()
		.replace(/[^\p{L}\p{N}]+/gu, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, maxLength)
		.replace(/-+$/, '')
		.normalize('NFC');
}

/** Characters Obsidian does not accept in file names, plus link syntax. */
const ILLEGAL = /[\\/:*?"<>|#^[\]]/g;

function segmentSafe(value: string): string {
	return value.replace(ILLEGAL, '-').trim();
}

function tokenValue(name: TokenName, format: string | undefined, ctx: PatternContext): string | null {
	const m = moment(ctx.now);
	switch (name) {
		case 'cardFolder':
			return ctx.cardFolder !== undefined ? ctx.cardFolder : null;
		case 'projectFolder':
			return ctx.project ? ctx.project.folder : null;
		case 'projectSlug':
			return ctx.project ? segmentSafe(ctx.project.slug) || null : null;
		case 'projectName':
			return ctx.project ? segmentSafe(ctx.project.name) || null : null;
		case 'date':
			return segmentSafe(m.format(format ?? 'YYYY-MM-DD')) || null;
		case 'year':
			return m.format('YYYY');
		case 'month':
			return m.format('MM');
		case 'slug': {
			const slug = ctx.title !== undefined ? slugify(ctx.title) : '';
			return slug || null;
		}
		case 'title':
			return ctx.title !== undefined ? segmentSafe(ctx.title) || null : null;
	}
}

export function resolvePattern(pattern: ParsedPattern, ctx: PatternContext): ResolveResult {
	let out = '';
	for (const part of pattern.parts) {
		if (part.kind === 'text') {
			out += part.text;
			continue;
		}
		const value = tokenValue(part.name, part.format, ctx);
		// "." or ".." from a title would climb out of the folder: treat as unresolved.
		if (value === null || (!PATH_TOKENS.has(part.name) && /^\.{1,2}$/.test(value.trim()))) {
			return { ok: false, missing: part.name };
		}
		// Path tokens keep their "/", other values are single segments.
		out += PATH_TOKENS.has(part.name) ? value : value.replace(/\//g, '-');
	}

	if (pattern.kind === 'fileName') {
		const name = segmentSafe(out).replace(/\.md$/i, '');
		return name && !/^\.+$/.test(name) ? { ok: true, value: name } : { ok: false, missing: 'title' };
	}
	const folder = out
		.split('/')
		.map((segment) => segment.trim())
		.filter((segment) => segment !== '' && segment !== '.')
		.join('/');
	return { ok: true, value: folder === '' ? '' : normalizePath(folder) };
}

const escapeRegex = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function tokenRegex(name: TokenName): string {
	switch (name) {
		case 'cardFolder':
		case 'projectFolder':
			return '.+';
		case 'year':
			return '\\d{4}';
		case 'month':
			return '\\d{2}';
		default:
			return '[^/]+';
	}
}

/**
 * Regex matching the folders a folder pattern produces. Path tokens may be
 * empty (a card or project at the vault root: "{cardFolder}/Archived" gives
 * "Archived"), so "{cardFolder}/" becomes an optional prefix. With
 * `captureCardFolder`, {cardFolder} is capture group 1. Case-insensitive,
 * like the macOS and Windows file systems.
 */
export function patternRegex(pattern: ParsedPattern, captureCardFolder = false): RegExp {
	let source = '';
	const parts = pattern.parts;
	let skipSlash = false;
	for (let i = 0; i < parts.length; i++) {
		const part = parts[i] as PatternPart;
		if (part.kind === 'text') {
			const text = skipSlash ? part.text.replace(/^\//, '') : part.text;
			skipSlash = false;
			source += escapeRegex(text);
			continue;
		}
		const isPath = PATH_TOKENS.has(part.name);
		const inner = part.name === 'cardFolder' && captureCardFolder ? `(${tokenRegex(part.name)})` : `(?:${tokenRegex(part.name)})`;
		const next = parts[i + 1];
		if (isPath && next?.kind === 'text' && next.text.startsWith('/')) {
			source += `(?:${inner}/)?`;
			skipSlash = true;
		} else if (isPath && i === parts.length - 1 && source.endsWith('/')) {
			source = `${source.slice(0, -1)}(?:/${inner})?`;
		} else {
			source += inner;
		}
	}
	return new RegExp(`^${source}$`, 'i');
}

/** Recognizes archive folders of one pattern (also in NFC form). */
export interface ArchiveMatcher {
	test(folder: string): boolean;
	/**
	 * The folder {cardFolder} stood for ("" at the vault root), or null when the
	 * pattern has no {cardFolder} or the folder does not match.
	 */
	cardFolderOf(folder: string): string | null;
}

export function archiveMatcher(pattern: ParsedPattern): ArchiveMatcher {
	const plain = patternRegex(pattern);
	const capture = patternRegex(pattern, true);
	const hasCardFolder = pattern.parts.some((part) => part.kind === 'token' && part.name === 'cardFolder');
	const forms = (folder: string): string[] => {
		const nfc = folder.normalize('NFC');
		return nfc === folder ? [folder] : [folder, nfc];
	};
	return {
		test: (folder) => forms(folder).some((form) => plain.test(form)),
		cardFolderOf: (folder) => {
			if (!hasCardFolder) return null;
			for (const form of forms(folder)) {
				const match = capture.exec(form);
				if (match) return match[1] ?? '';
			}
			return null;
		},
	};
}

/** Folder path of a file path ("" for the vault root). */
export function folderOf(path: string): string {
	const index = path.lastIndexOf('/');
	return index < 0 ? '' : path.slice(0, index);
}
