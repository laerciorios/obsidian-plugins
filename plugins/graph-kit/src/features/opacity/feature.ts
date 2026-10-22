import { rebuildLinks, requestFrame } from '../../graph-internals';
import type { LinkRef, NodeRef, OpenGraph } from '../../graph-internals';
import type { NoteFactsCache } from '../../note-facts';
import { firstMatch } from '../../rules/evaluate';
import { GraphFeature } from '../feature';
import { PerNote } from '../per-note';
import type { OpacityConfig } from './config';

/** Fades nodes (and optionally their links) by rule, e.g. finished cards or paused projects. */
export class OpacityFeature extends GraphFeature {
	readonly id = 'opacity';
	readonly requires = ['nodeGraphics', 'linkGraphics'] as const;
	readonly hooks = ['nodeRender', 'linkRender'] as const;
	/** Before images and icons, which copy the node's alpha. */
	readonly order = 0;
	private readonly opacity: PerNote<number>;
	private running = false;

	constructor(
		facts: NoteFactsCache,
		private readonly config: () => OpacityConfig,
	) {
		super();
		this.opacity = new PerNote((path) => {
			const note = facts.get(path);
			return (note && firstMatch(this.config().rules, note)?.effect.opacity) ?? 1;
		});
	}

	onload(): void {
		this.running = true;
	}

	onunload(): void {
		this.running = false;
	}

	invalidate(paths: ReadonlySet<string> | null): void {
		this.opacity.invalidate(paths);
	}

	/** Alphas are set every frame; turning off rebuilds links to reset their containers. */
	redraw(graph: OpenGraph): void {
		if (this.running) requestFrame(graph.renderer);
		else rebuildLinks(graph.renderer, null);
	}

	nodeRender(node: NodeRef): void {
		const opacity = this.of(node);
		if (opacity >= 1) return;
		const circle = node.circle;
		const text = node.text;
		// The graph only resets alphas of what is on screen: multiplying hidden ones would compound.
		if (circle?.visible) circle.alpha *= opacity;
		if (text?.visible) text.alpha *= opacity;
	}

	/**
	 * The graph eases the line's own alpha from frame to frame, so multiplying it would
	 * compound; the line's container alpha multiplies it once instead.
	 */
	linkRender(link: LinkRef): void {
		const container = link.container;
		if (!container) return;
		const source = link.source;
		const target = link.target;
		container.alpha = this.config().fadeLinks && source && target ? Math.min(this.of(source), this.of(target)) : 1;
	}

	private of(node: NodeRef): number {
		return node.isNote ? this.opacity.get(node.id) : 1;
	}
}
