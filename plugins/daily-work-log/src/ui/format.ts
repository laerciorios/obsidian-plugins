import { t } from '../i18n';
import type { Project } from '../types';

/** Lowercase, without accents: "Irrigação" → "irrigacao". */
export function fold(text: string): string {
	return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
}

/** Every word of the query appears in the name, context, path or one of the project's names. */
export function matchesQuery(project: Project, query: string): boolean {
	const words = fold(query).split(/\s+/).filter((word) => word.length > 0);
	if (words.length === 0) return true;
	const haystack = fold([project.name, project.context, project.path, ...project.keys].join(' '));
	return words.every((word) => haystack.includes(word));
}

export function statusText(status: string): string {
	return status || t('project.noStatus');
}

export function countText(count: number): string {
	if (count === 0) return t('modal.count.none');
	return count === 1 ? t('modal.count.one') : t('modal.count.other', { count });
}

export function daysText(count: number): string {
	return count === 1 ? t('summary.days.one') : t('summary.days.other', { count });
}
