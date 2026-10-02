import { moment, normalizePath } from 'obsidian';
import type { App, TFile } from 'obsidian';
import { fillTemplate } from './templates';

/** Settings of the core Daily notes plugin (`<config dir>/daily-notes.json`). */
export interface DailyNotesSettings {
	/** Folder of the daily notes; "" = vault root. */
	folder: string;
	/** Moment format of the file name. May contain "/" (`YYYY/MM/YYYY-MM-DD`). */
	format: string;
	/** Vault path of the template, possibly without ".md"; "" = none. */
	template: string;
}

export const DAILY_NOTES_DEFAULTS: Readonly<DailyNotesSettings> = { folder: '', format: 'YYYY-MM-DD', template: '' };

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown): string {
	return typeof value === 'string' ? value.trim() : '';
}

/** "/Daily Notes/" → "Daily Notes"; "/" → "". */
function cleanFolder(folder: string): string {
	const path = normalizePath(folder);
	return path === '/' ? '' : path;
}

/** Accept whatever the config file holds: missing or empty fields get the defaults, like the core plugin. */
export function parseDailyNotesSettings(raw: unknown): DailyNotesSettings {
	if (!isRecord(raw)) return { ...DAILY_NOTES_DEFAULTS };
	return {
		folder: cleanFolder(text(raw.folder)),
		format: text(raw.format) || DAILY_NOTES_DEFAULTS.format,
		template: text(raw.template),
	};
}

/** Read the settings from disk. Never throws: an unreadable file means the defaults. */
export async function readDailyNotesSettings(app: App): Promise<DailyNotesSettings> {
	const path = normalizePath(`${app.vault.configDir}/daily-notes.json`);
	try {
		if (!(await app.vault.adapter.exists(path))) return { ...DAILY_NOTES_DEFAULTS };
		return parseDailyNotesSettings(JSON.parse(await app.vault.adapter.read(path)));
	} catch {
		return { ...DAILY_NOTES_DEFAULTS };
	}
}

/** Vault path of the daily note of a day. */
export function dailyNotePath(settings: DailyNotesSettings, date: moment.Moment): string {
	const name = `${date.format(settings.format)}.md`;
	return normalizePath(settings.folder ? `${settings.folder}/${name}` : name);
}

/**
 * The day of a daily note, or null when the path is not one: it must be inside
 * the folder and match the format exactly (strict parsing, like the core plugin).
 */
export function dailyNoteDate(settings: DailyNotesSettings, path: string): moment.Moment | null {
	if (!path.endsWith('.md')) return null;
	const prefix = settings.folder ? `${settings.folder}/` : '';
	if (prefix && !path.startsWith(prefix)) return null;
	const name = path.slice(prefix.length, -3);
	const date = moment(name, settings.format, true);
	return date.isValid() ? date : null;
}

/** Vault path of the template file, with ".md" added when the setting has no extension. */
export function dailyTemplatePath(settings: DailyNotesSettings): string {
	if (!settings.template) return '';
	const path = normalizePath(settings.template);
	return /\.md$/i.test(path) ? path : `${path}.md`;
}

/** The daily note of a day, or null when there is none (a folder at the path is none). */
export function getDailyNote(app: App, settings: DailyNotesSettings, date: moment.Moment): TFile | null {
	return app.vault.getFileByPath(dailyNotePath(settings, date));
}

/**
 * Text of the template: "" when there is no template, null when the setting
 * points to a note that does not exist. The setting may be a path or a link.
 */
export async function readDailyTemplate(app: App, settings: DailyNotesSettings): Promise<string | null> {
	const path = dailyTemplatePath(settings);
	if (!path) return '';
	const file = app.vault.getFileByPath(path) ?? app.metadataCache.getFirstLinkpathDest(settings.template, '');
	return file ? app.vault.read(file) : null;
}

/** Create a folder and its missing parents. */
export async function ensureFolder(app: App, path: string): Promise<void> {
	if (!path) return;
	let current = '';
	for (const part of path.split('/')) {
		current = current ? `${current}/${part}` : part;
		if (!app.vault.getAbstractFileByPath(current)) await app.vault.createFolder(current);
	}
}

export interface CreatedDailyNote {
	file: TFile;
	/** The template setting points to a missing note: the daily note was created empty. */
	templateMissing: boolean;
}

/**
 * Create the daily note of a day like the core plugin: missing folders first,
 * then the template with its variables filled (`{{date}}` in the daily note
 * format). Never overwrites: rejects when anything exists at the path, so
 * callers check `getDailyNote` first.
 */
export async function createDailyNote(
	app: App,
	settings: DailyNotesSettings,
	date: moment.Moment,
): Promise<CreatedDailyNote> {
	const path = dailyNotePath(settings, date);
	if (app.vault.getAbstractFileByPath(path)) throw new Error(`${path} already exists.`);
	const slash = path.lastIndexOf('/');
	await ensureFolder(app, slash === -1 ? '' : path.slice(0, slash));
	const template = await readDailyTemplate(app, settings);
	const title = path.slice(slash + 1, -'.md'.length);
	const content = fillTemplate(template ?? '', { title, date, dateFormat: settings.format });
	return { file: await app.vault.create(path, content), templateMissing: template === null };
}
