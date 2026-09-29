import type { App, TFile } from 'obsidian';

export type CompletedAction = 'set' | 'clear' | 'keep';

export interface MoveRequest {
	/** Frontmatter key of the column property (e.g. "status"). */
	property: string;
	value: string;
	/** `stamp` is the completion value written on 'set' (profile format). */
	completed?: { property: string; action: CompletedAction; stamp: string };
}

/** Decide what happens to the completion date when a card moves between columns. */
export function completedActionFor(fromIsDone: boolean, toIsDone: boolean): CompletedAction {
	if (toIsDone && !fromIsDone) return 'set';
	if (fromIsDone && !toIsDone) return 'clear';
	return 'keep';
}

/**
 * The only place this plugin writes to notes. A single processFrontMatter call
 * per move, which preserves the rest of the YAML.
 */
export async function moveEntry(app: App, file: TFile, request: MoveRequest): Promise<void> {
	await app.fileManager.processFrontMatter(file, (frontmatter: Record<string, unknown>) => {
		frontmatter[request.property] = request.value;

		const completed = request.completed;
		if (!completed) return;
		if (completed.action === 'set') frontmatter[completed.property] = completed.stamp;
		// null keeps the empty key ("completed:"), matching the card template.
		if (completed.action === 'clear') frontmatter[completed.property] = null;
	});
}
