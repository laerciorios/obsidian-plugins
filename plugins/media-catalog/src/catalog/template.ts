import { getFrontMatterInfo, moment, normalizePath } from 'obsidian';
import type { App } from 'obsidian';
import { DEFAULT_TEMPLATE_NAME } from '../constants';
import { isRecord } from '../providers/guards';
import type { CatalogDraft, CatalogSettings } from '../types';
import { joinPath } from './paths';

/** Settings of the core Templates plugin that matter here. */
export interface TemplatesConfig {
	folder: string;
	dateFormat: string;
	timeFormat: string;
}

/** Defaults of the core Templates plugin. */
const DATE_FORMAT = 'YYYY-MM-DD';
const TIME_FORMAT = 'HH:mm';

function configText(data: Record<string, unknown>, key: string): string {
	const value = data[key];
	return typeof value === 'string' ? value.trim() : '';
}

/** `<config folder>/templates.json`, read from disk (it is not a vault file). Missing or broken → defaults. */
export async function readTemplatesConfig(app: App): Promise<TemplatesConfig> {
	const fallback: TemplatesConfig = { folder: '', dateFormat: DATE_FORMAT, timeFormat: TIME_FORMAT };
	const path = normalizePath(`${app.vault.configDir}/templates.json`);
	try {
		if (!(await app.vault.adapter.exists(path))) return fallback;
		const data: unknown = JSON.parse(await app.vault.adapter.read(path));
		if (!isRecord(data)) return fallback;
		return {
			folder: configText(data, 'folder'),
			dateFormat: configText(data, 'dateFormat') || DATE_FORMAT,
			timeFormat: configText(data, 'timeFormat') || TIME_FORMAT,
		};
	} catch {
		return fallback;
	}
}

/** The template setting, or `<core Templates folder>/media.md` when it is empty. */
export function templatePath(settings: CatalogSettings, config: TemplatesConfig): string {
	const custom = settings.templateFile.trim();
	return custom ? normalizePath(custom) : joinPath(config.folder, DEFAULT_TEMPLATE_NAME);
}

/**
 * Expand the variables of the core Templates plugin: `{{title}}`, `{{date}}`,
 * `{{time}}`, `{{date:FMT}}` and `{{time:FMT}}` (case-insensitive, one clock
 * reading for the whole template, as the core plugin does).
 */
export function expandTemplate(body: string, title: string, config: TemplatesConfig, now = moment()): string {
	return body
		.replace(/{{title}}/gi, () => title)
		.replace(/{{(date|time)(?::(.*?))?}}/gi, (_match, name: string, format: string | undefined) => {
			if (format) return now.format(format);
			return now.format(name.toLowerCase() === 'date' ? config.dateFormat : config.timeFormat);
		});
}

/** `- IMDb: https://…`, or null when there is no source URL. */
export function sourceLine(draft: CatalogDraft): string | null {
	const url = draft.source.url?.trim();
	return url ? `- ${draft.source.name}: ${url}` : null;
}

/** Body text of the template (after its frontmatter). Missing template → "". */
async function templateBody(app: App, path: string): Promise<string> {
	const file = app.vault.getFileByPath(path);
	if (!file) return '';
	const content = await app.vault.cachedRead(file);
	return content.slice(getFrontMatterInfo(content).contentStart);
}

/**
 * Body of a new catalog note: the template body with its variables expanded
 * (`basename` is the new note's name, like the core plugin's `{{title}}`),
 * then the source line after one blank line when enabled. Ends with a single
 * newline, or is "" when there is nothing to write.
 */
export async function noteBody(app: App, settings: CatalogSettings, draft: CatalogDraft, basename: string): Promise<string> {
	const config = await readTemplatesConfig(app);
	const body = expandTemplate(await templateBody(app, templatePath(settings, config)), basename, config).trimEnd();
	const source = settings.addSourceLink ? sourceLine(draft) : null;
	const parts = [body, source].filter((part): part is string => !!part);
	return parts.length > 0 ? `${parts.join('\n\n')}\n` : '';
}
