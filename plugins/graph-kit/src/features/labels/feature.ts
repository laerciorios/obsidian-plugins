import type { GraphRenderer } from '../../graph-internals';
import { refreshNodeLabels } from '../../graph-internals';
import type { NoteFactsCache } from '../../note-facts';
import { GraphFeature } from '../feature';
import type { LabelsConfig } from './config';
import { labelFor } from './pick-label';

/** Node text from a property (e.g. `title` instead of "index"). */
export class LabelsFeature extends GraphFeature {
	readonly id = 'labels';
	readonly requires = ['nodeText'] as const;
	readonly hooks = ['label'] as const;
	private readonly labels = new Map<string, string | null>();

	constructor(
		private readonly facts: NoteFactsCache,
		private readonly config: () => LabelsConfig,
	) {
		super();
	}

	label(path: string): string | null {
		const cached = this.labels.get(path);
		if (cached !== undefined) return cached;
		const facts = this.facts.get(path);
		const label = facts ? labelFor(this.config(), facts) : null;
		this.labels.set(path, label);
		return label;
	}

	invalidate(paths: ReadonlySet<string> | null): void {
		if (!paths) this.labels.clear();
		else for (const path of paths) this.labels.delete(path);
	}

	redraw(renderer: GraphRenderer, paths: ReadonlySet<string> | null): void {
		refreshNodeLabels(renderer, paths);
	}
}
