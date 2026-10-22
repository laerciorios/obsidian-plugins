import type { PixiContainer, PixiGraphics, PixiSprite, PixiText } from '../pixi';
import { bag, call, isRenderer, num, rawOf } from './raw';
import type { Bag, GraphRenderer } from './raw';

/** Node types that are notes: "" and "focused" (the center of the local graph, or the active file). */
const NOTE_NODE_TYPES = ['', 'focused'];

const nodeRefs = new WeakMap<Bag, NodeRef>();
const linkRefs = new WeakMap<Bag, LinkRef>();

/**
 * A graph node as features see it: typed, checked accessors over the internal object.
 * The circle is a PIXI.Graphics drawn as `drawCircle(100, 100, 100)` with its pivot at the
 * center, scaled by `getSize() / 100 * nodeScale` every frame.
 */
export class NodeRef {
	private constructor(readonly raw: Bag) {}

	static of(raw: Bag): NodeRef {
		let ref = nodeRefs.get(raw);
		if (!ref) {
			ref = new NodeRef(raw);
			nodeRefs.set(raw, ref);
		}
		return ref;
	}

	get id(): string {
		return typeof this.raw.id === 'string' ? this.raw.id : '';
	}

	get type(): string {
		return typeof this.raw.type === 'string' ? this.raw.type : '';
	}

	/** A Markdown note (not a tag, attachment or unresolved link). */
	get isNote(): boolean {
		return NOTE_NODE_TYPES.includes(this.type);
	}

	get renderer(): GraphRenderer | null {
		return isRenderer(this.raw.renderer) ? this.raw.renderer : null;
	}

	get x(): number {
		return num(this.raw.x, 0);
	}

	get y(): number {
		return num(this.raw.y, 0);
	}

	get rendered(): boolean {
		return this.raw.rendered === true;
	}

	get circle(): PixiGraphics | null {
		return (bag(this.raw.circle) as PixiGraphics | null) ?? null;
	}

	get text(): PixiText | null {
		return (bag(this.raw.text) as PixiText | null) ?? null;
	}

	/** The hover ring, only while the node is highlighted. */
	get ring(): PixiGraphics | null {
		return (bag(this.raw.highlight) as PixiGraphics | null) ?? null;
	}

	/** The container circles, texts and links are drawn in. */
	get layer(): PixiContainer | null {
		const renderer = this.renderer;
		return renderer ? ((bag(rawOf(renderer).hanger) as PixiContainer | null) ?? null) : null;
	}

	get highlighted(): boolean {
		const renderer = this.renderer;
		return !!renderer && call(rawOf(renderer), 'getHighlightNode') === this.raw;
	}

	/** Size before the zoom-independent node scale (what `getSize()` returns). */
	size(): number {
		return num(call(this.raw, 'getSize'), 8);
	}

	/** Radius in graph units, as drawn this frame. */
	radius(): number {
		const renderer = this.renderer;
		return this.size() * (renderer ? num(rawOf(renderer).nodeScale, 1) : 1);
	}

	/** The text style depends on the size: recompute it on the next frame. */
	markFontDirty(): void {
		if ('fontDirty' in this.raw) this.raw.fontDirty = true;
	}
}

/**
 * A graph link as features see it. `line` is a PIXI.Sprite (Texture.WHITE) stretched and
 * rotated every frame inside `container`; `arrow` is a PIXI.Graphics in the node layer.
 */
export class LinkRef {
	private constructor(readonly raw: Bag) {}

	static of(raw: Bag): LinkRef {
		let ref = linkRefs.get(raw);
		if (!ref) {
			ref = new LinkRef(raw);
			linkRefs.set(raw, ref);
		}
		return ref;
	}

	get source(): NodeRef | null {
		const raw = bag(this.raw.source);
		return raw ? NodeRef.of(raw) : null;
	}

	get target(): NodeRef | null {
		const raw = bag(this.raw.target);
		return raw ? NodeRef.of(raw) : null;
	}

	get renderer(): GraphRenderer | null {
		return isRenderer(this.raw.renderer) ? this.raw.renderer : null;
	}

	get rendered(): boolean {
		return this.raw.rendered === true;
	}

	get line(): PixiSprite | null {
		return (bag(this.raw.line) as PixiSprite | null) ?? null;
	}

	/** Holds the line; its alpha multiplies the line's (which the graph animates every frame). */
	get container(): PixiContainer | null {
		return (bag(this.raw.px) as PixiContainer | null) ?? null;
	}

	get arrow(): PixiGraphics | null {
		return (bag(this.raw.arrow) as PixiGraphics | null) ?? null;
	}

	/** Target also links back to the source: the graph draws only one line for the pair. */
	get mutual(): boolean {
		const source = bag(this.raw.source);
		const target = bag(this.raw.target);
		const reverse = bag(source?.reverse);
		return !!reverse && !!target && typeof target.id === 'string' && Object.prototype.hasOwnProperty.call(reverse, target.id);
	}

	/** Swap the line sprite (e.g. for a tiling one); the native render keeps placing it. */
	replaceLine(next: PixiSprite): void {
		const line = this.line;
		const container = bag(this.raw.px) as PixiContainer | null;
		if (!line || !container) return;
		next.eventMode = 'none';
		next.alpha = line.alpha;
		next.tint = line.tint;
		line.removeFromParent();
		line.destroy();
		container.addChild(next);
		this.raw.line = next;
	}
}

/** Zoom of a renderer (1 = 100 %). */
export function rendererScale(renderer: GraphRenderer): number {
	return num(rawOf(renderer).scale, 1);
}

/** Extra scale the graph applies to nodes at some zoom levels (`renderer.nodeScale`). */
export function nodeScale(renderer: GraphRenderer): number {
	return num(rawOf(renderer).nodeScale, 1);
}

/** The "Line thickness" multiplier of the graph's display options. */
export function lineSizeMultiplier(renderer: GraphRenderer): number {
	return num(rawOf(renderer).fLineSizeMult, 1);
}

/** The "Node size" multiplier of the graph's display options. */
export function nodeSizeMultiplier(renderer: GraphRenderer): number {
	return num(rawOf(renderer).fNodeSizeMult, 1);
}

/** Theme color the graph uses for a role ("text", "circle", "fill"...), as `{ rgb, a }`. */
export function themeColor(renderer: GraphRenderer, role: string): { rgb: number; a: number } {
	const color = bag(bag(rawOf(renderer).colors)?.[role]);
	return { rgb: num(color?.rgb, 0x888888), a: num(color?.a, 1) };
}
