import type { Condition, NoteFacts, Rule } from './types';
import { comparableForms, hasValue, parseWikiLink, propertyValue } from './values';

/** First enabled rule that matches the note, in order; null when none does. */
export function firstMatch<E>(rules: readonly Rule<E>[], facts: NoteFacts): Rule<E> | null {
	return rules.find((rule) => rule.enabled && ruleMatches(rule, facts)) ?? null;
}

/** A rule without conditions matches every note (an "otherwise" rule). */
export function ruleMatches<E>(rule: Rule<E>, facts: NoteFacts): boolean {
	if (rule.conditions.length === 0) return true;
	const test = (condition: Condition) => conditionMatches(condition, facts);
	return rule.match === 'any' ? rule.conditions.some(test) : rule.conditions.every(test);
}

export function conditionMatches(condition: Condition, facts: NoteFacts): boolean {
	const result = rawMatch(condition, facts);
	return condition.not ? !result : result;
}

function rawMatch(condition: Condition, facts: NoteFacts): boolean {
	switch (condition.type) {
		case 'folder':
			return inFolder(facts.folder, condition.path, condition.subfolders);
		case 'tag':
			return hasTag(facts.tags, condition.tag, condition.nested);
		case 'filename':
			return wildcard(condition.value).test(facts.basename);
		case 'propertyExists':
			return hasValue(propertyValue(facts.frontmatter, condition.key));
		case 'propertyEquals':
			return propertyEquals(propertyValue(facts.frontmatter, condition.key), condition.value);
	}
}

export function normalizeFolder(path: string): string {
	return path.trim().replace(/\\/g, '/').replace(/\/+/g, '/').replace(/^\/|\/$/g, '');
}

export function inFolder(noteFolder: string, path: string, subfolders: boolean): boolean {
	const folder = normalizeFolder(path);
	if (noteFolder === folder) return true;
	if (!subfolders) return false;
	return folder === '' || noteFolder.startsWith(`${folder}/`);
}

export function normalizeTag(tag: string): string {
	return tag.trim().replace(/^#/, '').toLowerCase();
}

export function hasTag(tags: readonly string[], tag: string, nested: boolean): boolean {
	const wanted = normalizeTag(tag);
	if (wanted === '') return false;
	return tags.some((own) => own === wanted || (nested && own.startsWith(`${wanted}/`)));
}

/** Case-insensitive whole-name match where "*" stands for any run of characters. */
export function wildcard(pattern: string): RegExp {
	const source = pattern
		.trim()
		.split('*')
		.map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
		.join('.*');
	return new RegExp(`^${source}$`, 'i');
}

/** Lists match when any item does; links compare by target, target name and alias. */
export function propertyEquals(value: unknown, expected: string): boolean {
	const raw = expected.trim();
	const link = parseWikiLink(raw);
	const wanted = (link ? link.target : raw).toLowerCase();
	if (wanted === '') return false;
	return comparableForms(value).includes(wanted);
}
