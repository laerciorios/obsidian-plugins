import { BOUNDARY_PATTERN, MAX_QUERY_LENGTH, QUERY_PATTERN } from '../constants';

export interface TriggerMatch {
	/** Column of the trigger in the line. */
	start: number;
	query: string;
}

function insideInlineCode(text: string): boolean {
	return (text.match(/`/g)?.length ?? 0) % 2 === 1;
}

/**
 * Find a trigger in the text before the cursor. Runs on every keypress, so it
 * only does string scans and bails out as early as possible.
 */
export function findTrigger(before: string, trigger: string): TriggerMatch | null {
	const start = before.lastIndexOf(trigger);
	if (start < 0) return null;

	const query = before.slice(start + trigger.length);
	if (query.length > MAX_QUERY_LENGTH) return null;
	if (start > 0 && !BOUNDARY_PATTERN.test(before.charAt(start - 1))) return null;
	if (query.startsWith(' ') || query.includes('  ')) return null;
	if (!QUERY_PATTERN.test(query)) return null;
	if (insideInlineCode(before.slice(0, start))) return null;
	return { start, query };
}
