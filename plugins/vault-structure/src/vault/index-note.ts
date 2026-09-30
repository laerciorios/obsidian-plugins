import { fillTemplate } from '@obsidian-plugins/core-plugins';
import { Notice, moment } from 'obsidian';
import type { App } from 'obsidian';
import { DEFAULT_INDEX_TEMPLATE } from '../constants';
import { t } from '../i18n';
import type { VaultRules } from '../types';

/** Content of a new `index.md`: the template of the rules, or the built-in one. */
export async function indexContent(app: App, rules: VaultRules, title: string): Promise<string> {
	let template = DEFAULT_INDEX_TEMPLATE;
	if (rules.indexTemplate) {
		const file = app.vault.getFileByPath(rules.indexTemplate);
		if (file) template = await app.vault.cachedRead(file);
		else new Notice(t('notice.template.missing', { path: rules.indexTemplate }));
	}
	return fillTemplate(template, { title, date: moment() });
}
