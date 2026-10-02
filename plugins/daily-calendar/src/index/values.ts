/** Pure readers of note facts: days in values and names, folders, tags, list items. */

const DAY_PREFIX = /^(\d{4})-(\d{2})-(\d{2})/;

/** "2026-02-30" is not a day. */
function realDay(year: number, month: number, day: number): boolean {
	const date = new Date(Date.UTC(year, month - 1, day));
	return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function dayKey(match: RegExpExecArray | null): string | null {
	if (!match) return null;
	const [key = '', year, month, day] = match;
	return realDay(Number(year), Number(month), Number(day)) ? key.slice(0, 10) : null;
}

/**
 * The day (`YYYY-MM-DD`) of a date property: `2026-09-30`, `2026-09-30T18:30`
 * or `2026-09-30 18:30`. Anything else (empty, text, numbers, lists) is null.
 */
export function dayOfValue(value: unknown): string | null {
	if (typeof value !== 'string') return null;
	const text = value.trim();
	return dayKey(/^(\d{4})-(\d{2})-(\d{2})(?=$|[T ])/.exec(text));
}

/** The day a file name starts with: `2026-09-17-mutirao` → `2026-09-17`; `20260917` or `2026-09-170` → null. */
export function dayOfName(basename: string): string | null {
	const match = DAY_PREFIX.exec(basename);
	if (!match) return null;
	const next = basename.charAt(10);
	return /\d/.test(next) ? null : dayKey(match);
}

/** Whether a path is inside a folder with this name, at any depth. */
export function inFolderNamed(path: string, name: string): boolean {
	return path.split('/').slice(0, -1).includes(name);
}

/** Whether a path is inside a folder (subfolders included); "" is the vault root. */
export function inFolder(path: string, folder: string): boolean {
	return folder === '' || path.startsWith(`${folder}/`);
}

/** `#Card` and `card` are the same tag; `card/extra` is another one. */
export function hasTag(tags: readonly string[], tag: string): boolean {
	const wanted = tag.replace(/^#/, '').toLowerCase();
	return tags.some((item) => item.replace(/^#/, '').toLowerCase() === wanted);
}

/** The property value as a list: missing → [], a single value → [value]. */
export function toList(value: unknown): unknown[] {
	if (value === undefined || value === null) return [];
	return Array.isArray(value) ? [...(value as unknown[])] : [value];
}

/** A link in the frontmatter, as the metadata cache parsed it. */
export interface FrontmatterLink {
	/** Property path: `projects` or `projects.0`. */
	key: string;
	/** Link target, possibly with `#heading`. */
	link: string;
	/** The text as written: `[[a/b|c]]`. */
	original: string;
	/** Alias, when there is one. */
	displayText?: string;
}

/** A project of a daily note: a note when the link resolves, else just a name. */
export interface ProjectItem {
	title: string;
	path: string | null;
}

/** What a link target stands for when it does not resolve: `Projects/Horta/index` → `Horta`. */
export function linkTitle(link: string): string {
	const target = link.split('#')[0]?.replace(/\.md$/i, '') ?? '';
	const parts = target.split('/').filter((part) => part.length > 0);
	const last = parts[parts.length - 1] ?? link;
	return last === 'index' && parts.length > 1 ? (parts[parts.length - 2] ?? last) : last;
}

/**
 * The items of a list property in order: links through `resolve` (null = no
 * such note), plain text as is. Repeated projects count once.
 */
export function projectItems(
	value: unknown,
	property: string,
	links: readonly FrontmatterLink[],
	resolve: (link: string) => { path: string; title: string } | null,
): ProjectItem[] {
	const own = links.filter((link) => link.key === property || link.key.startsWith(`${property}.`));
	const items: ProjectItem[] = [];
	const seen = new Set<string>();
	for (const raw of toList(value)) {
		if (typeof raw !== 'string' || !raw.trim()) continue;
		const text = raw.trim();
		const link = own.find((candidate) => candidate.original.trim() === text);
		let item: ProjectItem;
		if (link) {
			const note = resolve(link.link);
			const alias = link.displayText && link.displayText !== link.link ? link.displayText : '';
			item = note ? { title: note.title, path: note.path } : { title: alias || linkTitle(link.link), path: null };
		} else {
			item = { title: text, path: null };
		}
		const id = item.path ?? `text:${item.title.toLowerCase()}`;
		if (seen.has(id)) continue;
		seen.add(id);
		items.push(item);
	}
	return items;
}
