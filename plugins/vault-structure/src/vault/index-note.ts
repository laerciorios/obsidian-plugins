import { Notice, moment } from 'obsidian';
import type { App } from 'obsidian';
import { DEFAULT_INDEX_TEMPLATE } from '../constants';
import { t } from '../i18n';
import type { VaultRules } from '../types';

const VARIABLE = /\{\{\s*(title|date|time)\s*(?::([^}]*))?\}\}/gi;
const DEFAULT_FORMAT: Record<string, string> = { date: 'YYYY-MM-DD', time: 'HH:mm' };

/**
 * The variables of the core Templates plugin: `{{title}}`, `{{date}}`,
 * `{{time}}`, `{{date:FORMAT}}` and `{{time:FORMAT}}` (moment formats).
 */
export function fillTemplate(template: string, title: string, now: moment.Moment): string {
	return template.replace(VARIABLE, (_match, name: string, format: string | undefined) => {
		const variable = name.toLowerCase();
		if (variable === 'title') return title;
		return now.format(format?.trim() || DEFAULT_FORMAT[variable]);
	});
}

/** Content of a new `index.md`: the template of the rules, or the built-in one. */
export async function indexContent(app: App, rules: VaultRules, title: string): Promise<string> {
	let template = DEFAULT_INDEX_TEMPLATE;
	if (rules.indexTemplate) {
		const file = app.vault.getFileByPath(rules.indexTemplate);
		if (file) template = await app.vault.cachedRead(file);
		else new Notice(t('notice.template.missing', { path: rules.indexTemplate }));
	}
	return fillTemplate(template, title, moment());
}
