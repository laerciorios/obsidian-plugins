import { moment } from 'obsidian';
import type { App, TFile } from 'obsidian';
import { formatCompleted } from '../data/dates';
import { t } from '../i18n';
import { parsePattern, resolvePattern } from '../patterns/pattern';
import type { PatternError, ProjectInfo, TokenName } from '../patterns/pattern';
import { folderMatches, isProfileCard, projectInfo, projectLink, projectOf } from '../profiles/matcher';
import type { BoardProfile } from '../settings/model';
import { availablePath, ensureFolder } from '../vault/files';

/** Frontmatter keys the new card writes (from the view config and the profile). */
export interface NewCardKeys {
	status: string;
	title: string | null;
	type: string | null;
	project: string | null;
	completed: string | null;
}

export interface NewCardInput {
	profile: BoardProfile;
	keys: NewCardKeys;
	title: string;
	project: ProjectInfo | null;
	/** Folder typed by the user when there is no project and no fallback folder. */
	folder?: string;
	/** Column value written to the status property. */
	status: string;
	isDone: boolean;
	now?: Date;
}

export type NewCardPlan =
	| { ok: true; folder: string; fileName: string }
	| { ok: false; reason: 'pattern'; field: 'folderPattern' | 'fileNamePattern'; error: PatternError }
	| { ok: false; reason: 'unresolved'; token: TokenName }
	| { ok: false; reason: 'askFolder' }
	| { ok: false; reason: 'noTitle' };

/** Folder and file name of a new card, from the profile patterns. Pure: no file is touched. */
export function planNewCard(input: NewCardInput): NewCardPlan {
	const { profile } = input;
	const now = input.now ?? new Date();
	const title = input.title.trim();
	if (title === '') return { ok: false, reason: 'noTitle' };
	const context = { project: input.project, title, now };

	let folder: string;
	if (input.project) {
		const parsed = parsePattern(profile.newCard.folderPattern, 'newCardFolder');
		if (!parsed.ok) return { ok: false, reason: 'pattern', field: 'folderPattern', error: parsed.error };
		const resolved = resolvePattern(parsed.pattern, context);
		if (!resolved.ok) return { ok: false, reason: 'unresolved', token: resolved.missing };
		folder = resolved.value;
	} else if (profile.newCard.fallbackFolder) {
		folder = profile.newCard.fallbackFolder;
	} else if (input.folder !== undefined && input.folder.trim() !== '') {
		folder = input.folder.trim().replace(/^\/+|\/+$/g, '');
	} else {
		return { ok: false, reason: 'askFolder' };
	}

	const parsedName = parsePattern(profile.newCard.fileNamePattern, 'fileName');
	if (!parsedName.ok) return { ok: false, reason: 'pattern', field: 'fileNamePattern', error: parsedName.error };
	const name = resolvePattern(parsedName.pattern, context);
	if (!name.ok) return { ok: false, reason: 'unresolved', token: name.missing };
	return { ok: true, folder, fileName: name.value };
}

const PLACEHOLDER = /\{\{\s*(title|date|time)\s*(?::([^}]*))?\}\}/gi;

function fill(text: string, title: string, now: Date, titleText: (quote: string) => string): string {
	return text.replace(PLACEHOLDER, (match, rawName: string, format: string | undefined, offset: number) => {
		const name = rawName.toLowerCase();
		if (name === 'title') {
			const before = text[offset - 1];
			return titleText(before === '"' || before === "'" ? before : '');
		}
		const fallback = name === 'date' ? 'YYYY-MM-DD' : 'HH:mm';
		return moment(now).format(format?.trim() || fallback);
	});
}

/**
 * Core Templates syntax: {{title}}, {{date}}, {{date:FORMAT}}, {{time}},
 * {{time:FORMAT}}. Inside the frontmatter the title is escaped for YAML (a
 * title with ": ", "#" or quotes must not break the properties).
 */
export function applyTemplate(text: string, title: string, now: Date): string {
	const fm = /^---\n[\s\S]*?\n---(?:\n|$)/.exec(text);
	const head = fm ? fm[0] : '';
	const body = text.slice(head.length);
	const yamlTitle = (quote: string): string => {
		if (quote === '"') return JSON.stringify(title).slice(1, -1);
		if (quote === "'") return title.replace(/'/g, "''");
		return JSON.stringify(title);
	};
	return fill(head, title, now, yamlTitle) + fill(body, title, now, () => title);
}

function withTag(raw: unknown, tag: string): string[] {
	const tags = Array.isArray(raw)
		? raw.map((item) => String(item))
		: typeof raw === 'string'
			? raw.split(/[,\s]+/)
			: [];
	const clean = tags.map((item) => item.trim().replace(/^#/, '')).filter(Boolean);
	if (tag && !clean.some((item) => item.toLowerCase() === tag.toLowerCase())) clean.push(tag);
	return clean;
}

/** Create the card note (never overwrites) and fill its frontmatter. */
export async function createCard(app: App, input: NewCardInput): Promise<TFile> {
	const plan = planNewCard(input);
	if (!plan.ok) throw new Error(t('error.cannotPlan'));
	const now = input.now ?? new Date();
	const title = input.title.trim();
	const { profile, keys } = input;

	const templatePath = profile.newCard.templatePath;
	const template = templatePath ? app.vault.getFileByPath(templatePath) : null;
	if (templatePath && !template) throw new Error(t('error.templateNotFound', { path: templatePath }));
	const content = template ? applyTemplate(await app.vault.read(template), title, now) : '';

	await ensureFolder(app, plan.folder);
	const file = await app.vault.create(availablePath(app, plan.folder, plan.fileName), content);

	await app.fileManager.processFrontMatter(file, (fm: Record<string, unknown>) => {
		if (keys.title) fm[keys.title] = title;
		if (keys.type && profile.newCard.defaultType) fm[keys.type] = profile.newCard.defaultType;
		fm[keys.status] = input.status;
		if (keys.project && input.project) fm[keys.project] = projectLink(input.project);
		if (!template && !('created' in fm)) fm.created = formatCompleted(now, 'date');
		if (input.isDone && keys.completed) fm[keys.completed] = formatCompleted(now, profile.completedFormat);
		if (profile.cardTag) fm.tags = withTag(fm.tags, profile.cardTag);
	});
	return file;
}

/**
 * Projects offered in the "+ Add card" modal: notes already linked as project
 * by cards of the profile, plus notes with `type: project` (vault convention).
 */
export function collectProjects(app: App, profile: BoardProfile): ProjectInfo[] {
	const found = new Map<string, ProjectInfo>();
	for (const file of app.vault.getMarkdownFiles()) {
		const cache = app.metadataCache.getFileCache(file);
		if (!cache) continue;
		const folder = file.parent?.path ?? '';
		if (profile.excludeFolders.some((glob) => folderMatches(folder, glob))) continue;
		if (cache.frontmatter?.type === 'project') found.set(file.path, projectInfo(app, file));
		if (profile.projectProperty && isProfileCard(file, cache, profile)) {
			const project = projectOf(app, file, profile);
			if (project) found.set(project.path, project);
		}
	}
	return [...found.values()].sort((a, b) => a.name.localeCompare(b.name));
}
