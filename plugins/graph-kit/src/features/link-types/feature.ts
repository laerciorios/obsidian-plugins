import { getLinkpath } from 'obsidian';
import type { App } from 'obsidian';
import { colorNumber } from '../../colors';
import type { GraphKind } from '../../config/types';
import { lineSizeMultiplier, pixi, rebuildLinks, rendererScale } from '../../graph-internals';
import type { LinkRef, OpenGraph } from '../../graph-internals';
import type { PixiSprite, PixiTexture } from '../../pixi';
import { GraphFeature } from '../feature';
import { kindsByTarget, typeForLink } from './classify';
import type { LinkKinds } from './classify';
import type { LineStyle, LinkType, LinkTypesConfig } from './config';
import { LinkLegend } from './legend';

interface LinkStyle {
	type: LinkType;
	color: number | null;
	/** Dashed or dotted line: a sprite showing part of a long pattern texture of its own. */
	dashed: { sprite: PixiSprite; texture: PixiTexture } | null;
}

/** One period of a dashed or dotted line, in texture pixels (2 px tall). */
const PATTERNS: Record<Exclude<LineStyle, 'solid'>, { width: number; on: number }> = {
	dashed: { width: 20, on: 12 },
	dotted: { width: 8, on: 2 },
};

/**
 * Length of the shared pattern texture. Each dashed line shows the first part of it, as long
 * as the line is on screen, so dashes keep their size; lines longer than this on screen
 * stretch their dashes. Plain sprites sharing one texture batch into a single draw call
 * (tiling sprites did not, and slowed the graph down with many dashed links).
 */
const PATTERN_LENGTH = 4096;

/** Color, dash and visibility of each link from the frontmatter property it comes from (or the body). */
export class LinkTypesFeature extends GraphFeature {
	readonly id = 'link-types';
	readonly requires = ['linkGraphics', 'pixi'] as const;
	readonly hooks = ['linkInit', 'linkRender'] as const;
	private readonly outgoing = new Map<string, Map<string, LinkKinds>>();
	private readonly styles = new WeakMap<LinkRef, LinkStyle | null>();
	private readonly textures = new Map<string, PixiTexture>();
	private readonly legend: LinkLegend;
	private running = false;

	constructor(
		private readonly app: App,
		private readonly config: () => LinkTypesConfig,
		toggleHidden: (kind: GraphKind, typeId: string) => void,
	) {
		super();
		this.legend = new LinkLegend(config, toggleHidden);
	}

	onload(): void {
		this.running = true;
	}

	onunload(): void {
		this.running = false;
		this.legend.removeAll();
		for (const texture of this.textures.values()) texture.destroy(true);
		this.textures.clear();
	}

	invalidate(paths: ReadonlySet<string> | null): void {
		if (!paths) this.outgoing.clear();
		else for (const path of paths) this.outgoing.delete(path);
	}

	/** Lines are styled when created: rebuild the affected ones (every one when turned off). */
	redraw(graph: OpenGraph, paths: ReadonlySet<string> | null): void {
		rebuildLinks(graph.renderer, paths);
		if (this.running && this.config().graphs[graph.kind]) this.legend.show(graph);
		else this.legend.remove(graph);
	}

	linkInit(link: LinkRef): void {
		const style = this.resolve(link);
		this.styles.set(link, style);
		if (!style || style.type.style === 'solid') return;
		const lib = pixi();
		const pattern = this.texture(style.type.style);
		if (!lib || !pattern) return;
		const texture = new lib.Texture(pattern.baseTexture, new lib.Rectangle(0, 0, PATTERN_LENGTH, 2));
		const sprite = new lib.Sprite(texture);
		link.replaceLine(sprite);
		style.dashed = { sprite, texture };
	}

	linkRender(link: LinkRef, kind: GraphKind): void {
		const style = this.styles.get(link);
		const line = link.line;
		if (!style || !line) return;
		const arrow = link.arrow;
		if (!style.type.visible || this.config().hidden[kind].includes(style.type.id)) {
			line.visible = false;
			if (arrow) arrow.visible = false;
			return;
		}
		if (style.color !== null) {
			line.tint = style.color;
			if (arrow) arrow.tint = style.color;
		}
		const renderer = link.renderer;
		if (style.dashed && renderer && !style.dashed.sprite.destroyed) this.fitDashes(style.dashed, renderer);
	}

	private resolve(link: LinkRef): LinkStyle | null {
		const source = link.source;
		const target = link.target;
		if (!source || !target || !source.isNote) return null;
		const forward = this.kinds(source.id).get(target.id);
		const backward = link.mutual && target.isNote ? this.kinds(target.id).get(source.id) : undefined;
		const type = typeForLink(forward, backward, this.config().types);
		if (!type) return null;
		return { type, color: type.color ? colorNumber(type.color) : null, dashed: null };
	}

	/**
	 * Show as much of the pattern as the line is long on screen, so one texture pixel stays
	 * half a line thickness long whatever the zoom. The graph has already set the sprite's
	 * size for this frame; it is set again because the frame is also the sprite's original size.
	 */
	private fitDashes(dashed: { sprite: PixiSprite; texture: PixiTexture }, renderer: NonNullable<LinkRef['renderer']>): void {
		const { sprite, texture } = dashed;
		const width = sprite.width;
		const height = sprite.height;
		const pixelsPerTexel = lineSizeMultiplier(renderer) / 2;
		const length = Math.min(PATTERN_LENGTH, Math.max(1, (width * rendererScale(renderer)) / pixelsPerTexel));
		if (Math.abs(texture.frame.width - length) > 0.5) {
			texture.frame.width = length;
			texture.updateUvs();
		}
		sprite.width = width;
		sprite.height = height;
	}

	/** Outgoing links of a note by target, from the metadata cache. */
	private kinds(path: string): Map<string, LinkKinds> {
		const cached = this.outgoing.get(path);
		if (cached) return cached;
		const cache = this.app.metadataCache.getCache(path);
		const resolve = (link: string) => {
			const linkpath = getLinkpath(link);
			return this.app.metadataCache.getFirstLinkpathDest(linkpath, path)?.path ?? linkpath;
		};
		const kinds = kindsByTarget({
			frontmatter: (cache?.frontmatterLinks ?? []).map((link) => ({ key: link.key, target: resolve(link.link) })),
			body: [...(cache?.links ?? []), ...(cache?.embeds ?? [])].map((link) => resolve(link.link)),
		});
		this.outgoing.set(path, kinds);
		return kinds;
	}

	private texture(style: Exclude<LineStyle, 'solid'>): PixiTexture | null {
		const cached = this.textures.get(style);
		if (cached) return cached;
		const lib = pixi();
		if (!lib) return null;
		const { width, on } = PATTERNS[style];
		const canvas = createEl('canvas');
		canvas.width = PATTERN_LENGTH;
		canvas.height = 2;
		const context = canvas.getContext('2d');
		if (!context) return null;
		context.fillStyle = '#ffffff';
		for (let x = 0; x < PATTERN_LENGTH; x += width) context.fillRect(x, 0, on, 2);
		const texture = lib.Texture.from(canvas);
		this.textures.set(style, texture);
		return texture;
	}
}
