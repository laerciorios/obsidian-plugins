import { t } from '../i18n';
import type { Condition, Rule } from './types';

/** One line for the rule list: "When named "index" and not in "Archive" → label from title". */
export function ruleSummary<E>(rule: Rule<E>, effect: (effect: E) => string): string {
	const conditions =
		rule.conditions.length === 0 ? t('rules.allNotes') : rule.conditions.map(conditionSummary).join(rule.match === 'any' ? t('rules.or') : t('rules.and'));
	return t('rules.summary', { conditions, effect: effect(rule.effect) });
}

export function conditionSummary(condition: Condition): string {
	const text = rawSummary(condition);
	return condition.not ? t('condition.summary.not', { condition: text }) : text;
}

function rawSummary(condition: Condition): string {
	switch (condition.type) {
		case 'folder':
			if (condition.path.trim() === '' && !condition.subfolders) return t('condition.summary.root');
			return t(condition.subfolders ? 'condition.summary.folderTree' : 'condition.summary.folder', { path: condition.path || '/' });
		case 'tag':
			return t(condition.nested ? 'condition.summary.tagTree' : 'condition.summary.tag', { tag: condition.tag });
		case 'filename':
			return t('condition.summary.filename', { value: condition.value });
		case 'propertyExists':
			return t('condition.summary.propertyExists', { key: condition.key });
		case 'propertyEquals':
			return t('condition.summary.propertyEquals', { key: condition.key, value: condition.value });
	}
}
