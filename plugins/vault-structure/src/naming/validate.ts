import { FORBIDDEN_NAME_CHARS } from '../constants';

export type NameProblem = { kind: 'empty' } | { kind: 'chars'; chars: string } | { kind: 'dot' };

/** What is wrong with a folder name typed by the user, or null when Obsidian accepts it and links keep working. */
export function nameProblem(value: string): NameProblem | null {
	const name = value.trim();
	if (!name) return { kind: 'empty' };
	const chars = [...new Set(name.match(FORBIDDEN_NAME_CHARS) ?? [])];
	if (chars.length > 0) return { kind: 'chars', chars: chars.join(' ') };
	if (name.startsWith('.')) return { kind: 'dot' };
	return null;
}
