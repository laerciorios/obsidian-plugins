import { Platform } from 'obsidian';
import { nodeScale, rebuildNodes, rendererScale, themeColor } from '../../graph-internals';
import type { NodeRef, OpenGraph } from '../../graph-internals';
import type { NoteFactsCache } from '../../note-facts';
import { firstMatch } from '../../rules/evaluate';
import { GraphFeature } from '../feature';
import { PerNote } from '../per-note';
import { RebuildGate } from '../rebuild-gate';
import type { ShapesConfig } from './config';
import { shapePoints } from './geometry';
import type { Shape } from './geometry';

/** Node shape by rule: the circle is redrawn as a polygon when the node is created. */
export class ShapesFeature extends GraphFeature {
	readonly id = 'shapes';
	readonly requires = ['nodeGraphics'] as const;
	readonly hooks = ['nodeInit', 'nodeRender'] as const;
	private readonly shapes: PerNote<Shape>;
	private readonly gate = new RebuildGate();
	private running = false;

	constructor(
		facts: NoteFactsCache,
		private readonly config: () => ShapesConfig,
	) {
		super();
		this.shapes = new PerNote((path) => {
			const note = facts.get(path);
			return (note && firstMatch(this.config().rules, note)?.effect.shape) ?? 'circle';
		});
	}

	onload(): void {
		this.running = true;
		this.gate.reset();
	}

	onunload(): void {
		this.running = false;
	}

	invalidate(paths: ReadonlySet<string> | null): void {
		this.shapes.invalidate(paths);
	}

	/** Shapes are drawn when a node is created; turning off recreates every node as a circle. */
	redraw(graph: OpenGraph, paths: ReadonlySet<string> | null): void {
		if (!this.running || this.gate.needed(graph.renderer, this.config(), paths)) rebuildNodes(graph.renderer, paths);
	}

	nodeInit(node: NodeRef): void {
		const shape = this.shapeOf(node);
		const circle = node.circle;
		if (shape === 'circle' || !circle) return;
		// Same box as the native circle: drawCircle(100, 100, 100) with the pivot at its center.
		circle.clear().beginFill(0xffffff).drawPolygon(shapePoints(shape, 100, 100, 100)).endFill();
		// Mobile keeps the native, larger invisible touch area.
		if (Platform.isMobile) circle.beginFill(0xffffff, 0.0001).drawCircle(100, 100, 500).endFill();
	}

	/** The hover ring follows the shape (the graph draws it as a circle every frame). */
	nodeRender(node: NodeRef): void {
		const ring = node.ring;
		const renderer = node.renderer;
		if (!ring || !renderer || !node.highlighted) return;
		const shape = this.shapeOf(node);
		if (shape === 'circle') return;
		const width = Math.max(1, 1 / rendererScale(renderer) / nodeScale(renderer));
		ring.clear().lineStyle(width, themeColor(renderer, 'circle').rgb, 1).drawPolygon(shapePoints(shape, 0, 0, node.size() + width / 2));
	}

	private shapeOf(node: NodeRef): Shape {
		return node.isNote ? this.shapes.get(node.id) : 'circle';
	}
}
