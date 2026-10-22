const LUCIDE_PREFIX = 'lucide-';

/**
 * Lucide icons among Obsidian's icon ids (`getIconIds()`), without the `lucide-` prefix, whose
 * name contains the query: names starting with it first, then alphabetical. Spaces in the
 * query match the hyphens of the names ("folder heart" → `folder-heart`).
 */
export function searchIcons(ids: readonly string[], query: string, limit: number): string[] {
	const wanted = query.trim().toLowerCase().replace(/\s+/g, '-');
	const names = ids.filter((id) => id.startsWith(LUCIDE_PREFIX)).map((id) => id.slice(LUCIDE_PREFIX.length));
	const matches = names.filter((name) => name.includes(wanted));
	const starts = (name: string) => (name.startsWith(wanted) ? 0 : 1);
	return matches.sort((a, b) => starts(a) - starts(b) || a.localeCompare(b)).slice(0, limit);
}
