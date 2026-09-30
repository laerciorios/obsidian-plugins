/**
 * The `projects` list of a note, as data. Pure: the caller says which project
 * (by path) an item stands for, so these work inside `processFrontMatter`.
 */

/** Project path an item stands for, or null (unresolved link to something else, plain text, number). */
export type ItemProject = (item: unknown) => string | null;

/** The property value as a list: missing → [], a single value → [value]. */
export function toList(value: unknown): unknown[] {
	if (value === undefined || value === null) return [];
	return Array.isArray(value) ? [...(value as unknown[])] : [value];
}

/** Paths of the projects a property value mentions. */
export function loggedPaths(value: unknown, projectOf: ItemProject): Set<string> {
	const paths = new Set<string>();
	for (const item of toList(value)) {
		const path = projectOf(item);
		if (path) paths.add(path);
	}
	return paths;
}

export interface Change {
	path: string;
	link: string;
	on: boolean;
}

/**
 * Apply changes to a property value. Marking appends the link unless an item
 * already stands for the project; unmarking removes every item that does.
 * Other items keep their value and order; a single value becomes a list.
 * Returns null when nothing changes, so the note is not rewritten.
 */
export function applyChanges(value: unknown, changes: readonly Change[], projectOf: ItemProject): unknown[] | null {
	let list = toList(value);
	let changed = false;
	for (const change of changes) {
		const present = list.some((item) => projectOf(item) === change.path);
		if (change.on && !present) {
			list.push(change.link);
			changed = true;
		} else if (!change.on && present) {
			list = list.filter((item) => projectOf(item) !== change.path);
			changed = true;
		}
	}
	return changed ? list : null;
}
