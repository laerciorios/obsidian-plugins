import type { TFolder } from 'obsidian';
import { t } from '../i18n';
import { nameProblem } from '../naming/validate';
import { hasChild } from '../vault/files';

/** The message for a folder name typed by the user, or null when it can be used. */
export function nameError(value: string, parent: TFolder | null, self?: TFolder): string | null {
	const problem = nameProblem(value);
	if (problem?.kind === 'empty') return t('name.empty');
	if (problem?.kind === 'chars') return t('name.chars', { chars: problem.chars });
	if (problem?.kind === 'dot') return t('name.dot');
	const name = value.trim();
	if (parent && hasChild(parent, name, self)) return t('name.exists', { name });
	return null;
}
