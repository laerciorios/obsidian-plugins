import { getIcon, getIconIds, normalizePath } from 'obsidian';
import type { App } from 'obsidian';
import { parseHex } from '../../colors';
import { openGraphs, pixi, rebuildNodes, requestFrame } from '../../graph-internals';
import type { NodeRef, OpenGraph } from '../../graph-internals';
import type { NoteFactsCache } from '../../note-facts';
import type { PixiSprite, PixiText, PixiTexture } from '../../pixi';
import { GraphFeature } from '../feature';
import { PerNote } from '../per-note';
import { RebuildGate } from '../rebuild-gate';
import type { IconsConfig } from './config';
import { folderSvgPaths, iconFor, readFolderStyleSymbols, svgIconMarkup } from './resolve';
import type { FolderSymbols, NodeIconSpec } from './resolve';

/** Icon size relative to the node's diameter. */
const ICON_SCALE = 0.62;
/** Pixels the icon texture or font is drawn at before scaling down. */
const ICON_PX = 64;
/** Largest Folder Style SVG drawn in nodes, as Folder Style itself accepts. */
const SVG_MAX_BYTES = 100 * 1024;

export type FolderStyleState = 'off' | 'loaded' | 'missing' | 'unknown';

interface NodeIcon {
	display: PixiSprite | PixiText;
	/** Text icons own their texture; Lucide and SVG ones share it. */
	ownsTexture: boolean;
}

/**
 * An emoji, a character or a Lucide icon in the middle of note nodes, by rule or from a property;
 * or the folder's Folder Style symbol, which can also be an SVG file of the vault.
 */
export class IconsFeature extends GraphFeature {
	readonly id = 'icons';
	readonly requires = ['nodeGraphics', 'pixi'] as const;
	readonly hooks = ['nodeInit', 'nodeRender', 'nodeClear'] as const;
	private readonly icons: PerNote<NodeIconSpec | null>;
	private readonly drawn = new Map<NodeRef, NodeIcon>();
	private readonly lucideTextures = new Map<string, PixiTexture>();
	/** Folder Style SVGs by `tint|path`, built from `folderSvgs`. */
	private readonly svgTextures = new Map<string, PixiTexture>();
	/** Markup of the SVG files Folder Style's symbols use, read with its data.json; unreadable ones are left out. */
	private folderSvgs = new Map<string, string>();
	private readonly gate = new RebuildGate();
	private lucideIds: Set<string> | null = null;
	private folders: FolderSymbols | null = null;
	private foldersState: FolderStyleState = 'off';
	private running = false;

	constructor(
		private readonly app: App,
		facts: NoteFactsCache,
		private readonly config: () => IconsConfig,
	) {
		super();
		this.icons = new PerNote((path) => {
			const note = facts.get(path);
			return note ? iconFor(this.config(), note, (id) => this.isLucide(id), this.folders) : null;
		});
	}

	/** How reading Folder Style's symbols went (for the settings). */
	folderStyleState(): FolderStyleState {
		return this.foldersState;
	}

	onload(): void {
		this.running = true;
		this.gate.reset();
		void this.loadFolderStyle();
	}

	onunload(): void {
		this.running = false;
		for (const icon of this.drawn.values()) this.destroy(icon);
		this.drawn.clear();
		for (const texture of this.lucideTextures.values()) texture.destroy(true);
		this.lucideTextures.clear();
		this.clearSvgTextures();
	}

	private clearSvgTextures(): void {
		for (const texture of this.svgTextures.values()) texture.destroy(true);
		this.svgTextures.clear();
	}

	invalidate(paths: ReadonlySet<string> | null): void {
		this.icons.invalidate(paths);
	}

	redraw(graph: OpenGraph, paths: ReadonlySet<string> | null): void {
		if (!this.running) return requestFrame(graph.renderer);
		for (const [node, icon] of this.drawn) if (icon.display.destroyed) this.nodeClear(node);
		const wantsFolders = this.config().useFolderStyle;
		if (wantsFolders !== (this.foldersState !== 'off')) void this.loadFolderStyle();
		if (this.gate.needed(graph.renderer, this.config(), paths)) rebuildNodes(graph.renderer, paths);
		else requestFrame(graph.renderer);
	}

	nodeInit(node: NodeRef): void {
		if (!node.isNote) return;
		const spec = this.icons.get(node.id);
		const lib = pixi();
		const layer = node.layer;
		if (!spec || !lib || !layer) return;
		let icon: NodeIcon | null = null;
		if (spec.kind === 'text') {
			const text = new lib.Text(spec.value, { fontSize: ICON_PX, fill: this.color() });
			icon = { display: text, ownsTexture: true };
		} else if (spec.kind === 'lucide') {
			const texture = this.lucideTexture(spec.value);
			if (!texture) return;
			const sprite = new lib.Sprite(texture);
			sprite.tint = this.color();
			icon = { display: sprite, ownsTexture: false };
		} else {
			// A file that could not be read is no icon (the node stays plain).
			const texture = this.svgTexture(spec.value, spec.tint);
			if (!texture) return;
			const sprite = new lib.Sprite(texture);
			if (spec.tint) sprite.tint = this.color();
			icon = { display: sprite, ownsTexture: false };
		}
		const { display } = icon;
		display.anchor.set(0.5);
		display.eventMode = 'none';
		display.zIndex = 1.6;
		display.visible = false;
		layer.addChild(display);
		this.drawn.set(node, icon);
	}

	nodeRender(node: NodeRef): void {
		const icon = this.drawn.get(node);
		const circle = node.circle;
		if (!icon || !circle) return;
		const { display } = icon;
		display.visible = circle.visible;
		if (!display.visible) return;
		display.x = node.x;
		display.y = node.y;
		display.scale.set((node.radius() * 2 * ICON_SCALE) / ICON_PX);
		display.alpha = circle.alpha;
	}

	nodeClear(node: NodeRef): void {
		const icon = this.drawn.get(node);
		if (!icon) return;
		this.destroy(icon);
		this.drawn.delete(node);
	}

	private destroy(icon: NodeIcon): void {
		if (!icon.display.destroyed) icon.display.destroy(icon.ownsTexture ? { texture: true, baseTexture: true } : undefined);
	}

	/** Icons are drawn in the background color, so they read on the node's fill in both themes. */
	private color(): number {
		return parseHex(getComputedStyle(document.body).getPropertyValue('--background-primary')) ?? 0x202020;
	}

	private isLucide(id: string): boolean {
		this.lucideIds ??= new Set(getIconIds().map((name) => name.replace(/^lucide-/, '')));
		return this.lucideIds.has(id);
	}

	/** White SVG of the icon as a texture (tinted per sprite), shared by id. */
	private lucideTexture(id: string): PixiTexture | null {
		const cached = this.lucideTextures.get(id);
		if (cached) return cached;
		const lib = pixi();
		const svg = getIcon(`lucide-${id}`) ?? getIcon(id);
		if (!lib || !svg) return null;
		svg.setAttribute('width', String(ICON_PX));
		svg.setAttribute('height', String(ICON_PX));
		svg.setAttribute('stroke', '#ffffff');
		svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
		const markup = new XMLSerializer().serializeToString(svg).replace(/currentColor/g, '#ffffff');
		const texture = lib.Texture.from(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`);
		this.lucideTextures.set(id, texture);
		return texture;
	}

	/** A Folder Style SVG as a texture: its own colors, or white (tinted per sprite) with `tint`. Shared by file and tint. */
	private svgTexture(path: string, tint: boolean): PixiTexture | null {
		const key = `${tint ? 'tint' : 'color'}|${path}`;
		const cached = this.svgTextures.get(key);
		if (cached) return cached;
		const lib = pixi();
		const svg = this.folderSvgs.get(path);
		if (!lib || svg === undefined) return null;
		const texture = lib.Texture.from(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgIconMarkup(svg, ICON_PX, tint))}`);
		this.svgTextures.set(key, texture);
		return texture;
	}

	/** The SVG files the symbols use, read now (the vault only; nothing is written). Unreadable, empty or large files are skipped. */
	private async readFolderSvgs(symbols: FolderSymbols | null): Promise<Map<string, string>> {
		const svgs = new Map<string, string>();
		for (const path of symbols ? folderSvgPaths(symbols) : []) {
			const file = this.app.vault.getFileByPath(path);
			if (!file || file.stat.size > SVG_MAX_BYTES) continue;
			try {
				const svg = await this.app.vault.cachedRead(file);
				if (svg.trim() !== '') svgs.set(path, svg);
			} catch {
				// Left out: the node shows no icon.
			}
		}
		return svgs;
	}

	/** Folder Style's data.json, read (not imported): its folders' symbols by path. */
	private async loadFolderStyle(): Promise<void> {
		if (!this.config().useFolderStyle) {
			this.folders = null;
			this.foldersState = 'off';
			return;
		}
		const path = normalizePath(`${this.app.vault.configDir}/plugins/folder-style/data.json`);
		try {
			const data: unknown = JSON.parse(await this.app.vault.adapter.read(path));
			this.folders = readFolderStyleSymbols(data);
			this.foldersState = this.folders ? 'loaded' : 'unknown';
		} catch {
			this.folders = null;
			this.foldersState = 'missing';
		}
		this.folderSvgs = await this.readFolderSvgs(this.folders);
		if (!this.running) return;
		// The files may have changed: rebuilt nodes make new textures from what was just read.
		this.clearSvgTextures();
		this.icons.invalidate(null);
		this.gate.reset();
		for (const graph of openGraphs(this.app)) rebuildNodes(graph.renderer, null);
	}
}
