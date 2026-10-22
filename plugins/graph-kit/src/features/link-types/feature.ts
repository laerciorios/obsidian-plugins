import { getLinkpath } from 'obsidian';
import type { App } from 'obsidian';
import { colorNumber } from '../../colors';
import type { GraphKind } from '../../config/types';
import { lineSizeMultiplier, pixi, rebuildLinks, rendererScale } from '../../graph-internals';
import type { LinkRef, OpenGraph } from '../../graph-internals';
import type { PixiTexture, PixiTilingSprite } from '../../pixi';
import { GraphFeature } from '../feature';
import { kindsByTarget, typeForLink } from './classify';
import type { LinkKinds } from './classify';
import type { LineStyle, LinkType, LinkTypesConfig } from './config';
import { LinkLegend } from './legend';

interface LinkStyle {
	type: LinkType;
	color: number | null;
	tiled: PixiTilingSprite | null;
}

/** Pattern of a dashed or dotted line: a 2 px tall canvas repeated along the line. */
const PATTERNS: Record<Exclude<LineStyle, 'solid'>, { width: number; on: number }> = {
	dashed: { width: 20, on: 12 },
	dotted: { width: 8, on: 2 },
};

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
		const texture = this.texture(style.type.style);
		if (!lib || !texture) return;
		const tiled = new lib.TilingSprite(texture, 1, 1);
		link.replaceLine(tiled);
		style.tiled = tiled;
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
		// Keep dashes the same size on screen: the line is `lineSize / zoom` thick in graph units.
		const renderer = link.renderer;
		if (style.tiled && renderer) style.tiled.tileScale.set(lineSizeMultiplier(renderer) / rendererScale(renderer) / 2);
	}

	private resolve(link: LinkRef): LinkStyle | null {
		const source = link.source;
		const target = link.target;
		if (!source || !target || !source.isNote) return null;
		const forward = this.kinds(source.id).get(target.id);
		const backward = link.mutual && target.isNote ? this.kinds(target.id).get(source.id) : undefined;
		const type = typeForLink(forward, backward, this.config().types);
		if (!type) return null;
		return { type, color: type.color ? colorNumber(type.color) : null, tiled: null };
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
		canvas.width = width;
		canvas.height = 2;
		const context = canvas.getContext('2d');
		if (!context) return null;
		context.fillStyle = '#ffffff';
		context.fillRect(0, 0, on, 2);
		const texture = lib.Texture.from(canvas, { wrapMode: lib.WRAP_MODES.REPEAT });
		this.textures.set(style, texture);
		return texture;
	}
}
