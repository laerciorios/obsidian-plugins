import type { GraphRenderer } from '../graph-internals';

/**
 * For features that draw when a node is created (shapes, images, icons): recreating every
 * node makes the graph flash, so only do it when the feature's own config changed, for a
 * graph not drawn with it yet, or for specific notes.
 */
export class RebuildGate {
	private drawn = new WeakSet<GraphRenderer>();
	private applied = '';

	reset(): void {
		this.drawn = new WeakSet();
		this.applied = '';
	}

	/** Whether nodes must be recreated; `config` is the feature's own config. */
	needed(renderer: GraphRenderer, config: unknown, paths: ReadonlySet<string> | null): boolean {
		if (paths) return true;
		const fingerprint = JSON.stringify(config);
		if (fingerprint !== this.applied) {
			this.applied = fingerprint;
			this.drawn = new WeakSet();
		}
		if (this.drawn.has(renderer)) return false;
		this.drawn.add(renderer);
		return true;
	}
}
