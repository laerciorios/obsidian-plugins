/** Reading frontmatter values the way a person reads them: links by their text, lists by their items. */

/** The value of a property: exact key first, then ignoring case (Obsidian keys are case-insensitive). */
export function propertyValue(frontmatter: Record<string, unknown>, key: string): unknown {
	if (Object.prototype.hasOwnProperty.call(frontmatter, key)) return frontmatter[key];
	const wanted = key.toLowerCase();
	const found = Object.keys(frontmatter).find((name) => name.toLowerCase() === wanted);
	return found === undefined ? undefined : frontmatter[found];
}

/** Text of one scalar value, or null when it has none (empty, object, NaN). */
export function scalarText(value: unknown): string | null {
	if (typeof value === 'string') {
		const text = linkText(value.replace(/\s+/g, ' ').trim());
		return text === '' ? null : text;
	}
	if (typeof value === 'number') return Number.isFinite(value) ? String(value) : null;
	if (typeof value === 'boolean') return String(value);
	return null;
}

/** First non-empty text of a value; lists give their first non-empty item. */
export function firstText(value: unknown): string | null {
	if (!Array.isArray(value)) return scalarText(value);
	for (const item of value) {
		const text = scalarText(item);
		if (text !== null) return text;
	}
	return null;
}

/** Every non-empty text of a value (one per list item). */
export function allTexts(value: unknown): string[] {
	const items = Array.isArray(value) ? value : [value];
	return items.map(scalarText).filter((text): text is string => text !== null);
}

export interface ParsedLink {
	target: string;
	alias: string | null;
}

/** `[[target|alias]]` or `[[target]]` (the whole value), else null. */
export function parseWikiLink(text: string): ParsedLink | null {
	const match = /^!?\[\[([^\]|]+)(?:\|([^\]]*))?\]\]$/.exec(text.trim());
	if (!match) return null;
	const alias = match[2]?.trim();
	return { target: (match[1] ?? '').trim(), alias: alias ? alias : null };
}

/** Name a link target shows: last path segment, without heading/block and ".md". */
export function targetName(target: string): string {
	const path = target.split('#')[0] ?? target;
	const name = path.split('/').pop() ?? path;
	return name.replace(/\.md$/i, '');
}

/** What a link reads as: `[[a/b|Alias]]` → "Alias", `[[a/b]]` → "b", `[text](url)` → "text". */
export function linkText(text: string): string {
	const wiki = parseWikiLink(text);
	if (wiki) return wiki.alias ?? targetName(wiki.target);
	const markdown = /^!?\[([^\]]*)\]\([^)]*\)$/.exec(text);
	if (markdown) return (markdown[1] ?? '').trim();
	return text;
}

/** A property counts as present when it has at least one non-empty text. */
export function hasValue(value: unknown): boolean {
	return allTexts(value).length > 0;
}

/**
 * Comparable forms of one raw value, lowercase: the text itself and, for a link, its target,
 * the target's name and the alias. `[[Projects/Alpha/index|alpha]]` equals "alpha" and "Projects/Alpha/index".
 */
export function comparableForms(value: unknown): string[] {
	const items = Array.isArray(value) ? value : [value];
	const forms = new Set<string>();
	for (const item of items) {
		if (typeof item === 'string') {
			const raw = item.trim();
			const wiki = parseWikiLink(raw);
			if (wiki) {
				forms.add(wiki.target.toLowerCase());
				forms.add(targetName(wiki.target).toLowerCase());
				if (wiki.alias) forms.add(wiki.alias.toLowerCase());
				continue;
			}
		}
		const text = scalarText(item);
		if (text !== null) forms.add(text.toLowerCase());
	}
	return [...forms];
}
