import { requestUrl } from 'obsidian';
import type { App } from 'obsidian';
import { pixi, rebuildNodes, requestFrame } from '../../graph-internals';
import type { GraphRenderer, NodeRef, OpenGraph } from '../../graph-internals';
import type { NoteFactsCache } from '../../note-facts';
import type { PixiGraphics, PixiSprite, PixiTexture } from '../../pixi';
import { GraphFeature } from '../feature';
import type { ImagesConfig } from './config';
import { centerSquare, imageSourceFor } from './source';
import type { ImageSource } from './source';
import { TextureCache } from './textures';

/** Most textures kept loaded at once (unused ones beyond this are freed). */
const CACHE_LIMIT = 400;
/** The picture fills this share of the node, so its color stays around it as a ring. */
const FILL = 0.84;

interface NodeImage {
	key: string;
	sprite: PixiSprite;
	mask: PixiGraphics;
	loaded: boolean;
}

/** A picture inside note nodes, from a property such as `cover` (vault image, or URL when allowed). */
export class ImagesFeature extends GraphFeature {
	readonly id = 'images';
	readonly requires = ['nodeGraphics', 'pixi'] as const;
	readonly hooks = ['nodeInit', 'nodeRender', 'nodeClear'] as const;
	private readonly sources = new Map<string, ImageSource | null>();
	private readonly images = new Map<NodeRef, NodeImage>();
	private readonly textures = new TextureCache(CACHE_LIMIT);
	/** Graphs already rebuilt with the current config. */
	private drawn = new WeakSet<GraphRenderer>();
	private applied = '';
	private running = false;

	constructor(
		private readonly app: App,
		private readonly facts: NoteFactsCache,
		private readonly config: () => ImagesConfig,
	) {
		super();
	}

	onload(): void {
		this.running = true;
		this.applied = JSON.stringify(this.config());
		this.drawn = new WeakSet();
	}

	onunload(): void {
		this.running = false;
		for (const image of this.images.values()) this.destroy(image);
		this.images.clear();
		this.textures.clear();
	}

	invalidate(paths: ReadonlySet<string> | null): void {
		if (!paths) this.sources.clear();
		else for (const path of paths) this.sources.delete(path);
	}

	/** Pictures are added when a node is created: rebuild the affected nodes (skipped when nothing about images changed). */
	redraw(graph: OpenGraph, paths: ReadonlySet<string> | null): void {
		if (!this.running) return requestFrame(graph.renderer);
		// Closed graphs destroy their stage with our sprites in it.
		for (const [node, image] of this.images) if (image.sprite.destroyed) this.nodeClear(node);
		const fingerprint = JSON.stringify(this.config());
		if (paths === null && fingerprint === this.applied && this.drawn.has(graph.renderer)) return requestFrame(graph.renderer);
		this.applied = fingerprint;
		this.drawn.add(graph.renderer);
		rebuildNodes(graph.renderer, paths);
	}

	nodeInit(node: NodeRef): void {
		if (!node.isNote) return;
		const source = this.sourceFor(node.id);
		const lib = pixi();
		const layer = node.layer;
		if (!source || !lib || !layer) return;
		const key = this.keyOf(source, node.id);
		if (!key) return;
		const sprite = layer.addChild(new lib.Sprite());
		const mask = layer.addChild(new lib.Graphics());
		mask.beginFill(0xffffff).drawCircle(0, 0, 100).endFill();
		sprite.anchor.set(0.5);
		sprite.eventMode = mask.eventMode = 'none';
		sprite.zIndex = 1.5;
		sprite.mask = mask;
		sprite.visible = false;
		const image: NodeImage = { key, sprite, mask, loaded: false };
		this.images.set(node, image);
		void this.textures.acquire(key, () => this.loadTexture(source, node.id)).then((texture) => {
			if (!texture || sprite.destroyed || this.images.get(node) !== image) return;
			sprite.texture = texture;
			image.loaded = true;
			const renderer = node.renderer;
			if (renderer) requestFrame(renderer);
		});
	}

	nodeRender(node: NodeRef): void {
		const image = this.images.get(node);
		const circle = node.circle;
		if (!image || !circle) return;
		const { sprite, mask } = image;
		sprite.visible = image.loaded && circle.visible;
		if (!sprite.visible) return;
		const radius = node.radius() * FILL;
		sprite.x = mask.x = node.x;
		sprite.y = mask.y = node.y;
		sprite.width = sprite.height = radius * 2;
		mask.scale.set(radius / 100);
		sprite.alpha = circle.alpha;
	}

	nodeClear(node: NodeRef): void {
		const image = this.images.get(node);
		if (!image) return;
		this.destroy(image);
		this.images.delete(node);
	}

	private destroy(image: NodeImage): void {
		if (!image.sprite.destroyed) {
			image.sprite.mask = null;
			image.sprite.destroy();
		}
		if (!image.mask.destroyed) image.mask.destroy();
		this.textures.release(image.key);
	}

	private sourceFor(path: string): ImageSource | null {
		const cached = this.sources.get(path);
		if (cached !== undefined) return cached;
		const facts = this.facts.get(path);
		const source = facts ? imageSourceFor(this.config(), facts) : null;
		this.sources.set(path, source);
		return source;
	}

	/** Cache key, or null when the image is not allowed (missing, too large, remote while off). */
	private keyOf(source: ImageSource, notePath: string): string | null {
		const { allowRemote, maxFileSizeKb, textureSize } = this.config();
		if (source.kind === 'url') return allowRemote ? `${source.url}@${textureSize}` : null;
		const file = this.app.metadataCache.getFirstLinkpathDest(source.linkpath, notePath);
		if (!file || file.stat.size > maxFileSizeKb * 1024) return null;
		return `${file.path}:${file.stat.mtime}@${textureSize}`;
	}

	private async loadTexture(source: ImageSource, notePath: string): Promise<PixiTexture | null> {
		const { maxFileSizeKb } = this.config();
		let bitmap: ImageBitmap | HTMLImageElement;
		if (source.kind === 'url') {
			const response = await requestUrl({ url: source.url });
			if (response.arrayBuffer.byteLength > maxFileSizeKb * 1024) return null;
			bitmap = await createImageBitmap(new Blob([response.arrayBuffer]));
		} else {
			const file = this.app.metadataCache.getFirstLinkpathDest(source.linkpath, notePath);
			if (!file) return null;
			const element = new Image();
			element.src = this.app.vault.getResourcePath(file);
			await element.decode();
			bitmap = element;
		}
		return this.toTexture(bitmap);
	}

	/** Scale down to a square `textureSize` canvas, cropping the middle. */
	private toTexture(image: ImageBitmap | HTMLImageElement): PixiTexture | null {
		const lib = pixi();
		const width = image instanceof HTMLImageElement ? image.naturalWidth : image.width;
		const height = image instanceof HTMLImageElement ? image.naturalHeight : image.height;
		if (!lib || width === 0 || height === 0) return null;
		const size = this.config().textureSize;
		const canvas = createEl('canvas');
		canvas.width = canvas.height = size;
		const context = canvas.getContext('2d');
		if (!context) return null;
		const crop = centerSquare(width, height);
		context.drawImage(image, crop.x, crop.y, crop.size, crop.size, 0, 0, size, size);
		if (image instanceof ImageBitmap) image.close();
		return lib.Texture.from(canvas);
	}
}
