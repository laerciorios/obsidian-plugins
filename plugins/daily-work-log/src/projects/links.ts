/** Lowercase, trimmed, NFC: the form names are compared in. */
export function nameKey(text: string): string {
	return text.normalize('NFC').trim().toLowerCase();
}

function withoutSubpath(target: string): string {
	const hash = target.indexOf('#');
	return (hash === -1 ? target : target.slice(0, hash)).trim();
}

/**
 * What a frontmatter list item points to: `"[[a/b|c]]"` → link `a/b`,
 * `"[c](a/b.md)"` → link `a/b.md`, `"portagro"` → text `portagro`.
 * Anything else (numbers, empty items) is null.
 */
export type ItemTarget = { kind: 'link'; linkpath: string } | { kind: 'text'; text: string };

export function itemTarget(item: unknown): ItemTarget | null {
	if (typeof item !== 'string') return null;
	const value = item.trim();
	if (!value) return null;
	const wiki = /^!?\[\[([^\]]+)\]\]$/.exec(value);
	if (wiki?.[1] !== undefined) {
		const linkpath = withoutSubpath(wiki[1].split('|')[0] ?? '');
		return linkpath ? { kind: 'link', linkpath } : null;
	}
	const markdown = /^!?\[[^\]]*\]\(([^)]+)\)$/.exec(value);
	if (markdown?.[1] !== undefined) {
		let target = markdown[1].trim();
		if (target.startsWith('<') && target.endsWith('>')) target = target.slice(1, -1);
		try {
			target = decodeURI(target);
		} catch {
			// Keep the raw target when it is not valid URI encoding.
		}
		const linkpath = withoutSubpath(target);
		return linkpath ? { kind: 'link', linkpath } : null;
	}
	return { kind: 'text', text: value };
}

/** The last segment of a link path, without ".md": `Projects/Garden App/index.md` → `index`. */
export function linkBasename(linkpath: string): string {
	const name = linkpath.slice(linkpath.lastIndexOf('/') + 1);
	return name.replace(/\.md$/i, '');
}

function cleanAlias(alias: string): string {
	return alias.replace(/[[\]|\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
}

/** `"[[<path without .md>|<alias>]]"`, always by full path: many projects are `index.md`. */
export function projectLink(path: string, alias: string): string {
	const target = path.replace(/\.md$/i, '');
	const clean = cleanAlias(alias);
	return clean && clean !== target ? `[[${target}|${clean}]]` : `[[${target}]]`;
}
