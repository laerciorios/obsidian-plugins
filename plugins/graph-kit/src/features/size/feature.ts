import type { App } from 'obsidian';
import { nodeSizeMultiplier, refreshNodeSizes } from '../../graph-internals';
import type { NodeRef, OpenGraph } from '../../graph-internals';
import type { NoteFactsCache } from '../../note-facts';
import { propertyValue } from '../../rules/values';
import { GraphFeature } from '../feature';
import { PerNote } from '../per-note';
import type { SizeConfig } from './config';
import { autoDomain, numericValue, scaleSize, sizeProperty } from './scale';
import type { Range } from './scale';

/** Node size from a numeric property (e.g. rating) instead of the number of links. */
export class SizeFeature extends GraphFeature {
	readonly id = 'size';
	readonly requires = ['nodeSize'] as const;
	readonly hooks = ['nodeSize'] as const;
	/** Base size per note (before the graph's "Node size" multiplier); null keeps the native one. */
	private readonly sizes: PerNote<number | null>;
	/** Lowest and highest value of each property in the vault, for the "auto" domain. */
	private readonly domains = new Map<string, Range | null>();

	constructor(
		private readonly app: App,
		private readonly facts: NoteFactsCache,
		private readonly config: () => SizeConfig,
	) {
		super();
		this.sizes = new PerNote((path) => this.compute(path));
	}

	invalidate(paths: ReadonlySet<string> | null): void {
		// With the "auto" domain, any note may hold a new lowest or highest value.
		this.domains.clear();
		this.sizes.invalidate(this.autoDomain() ? null : paths);
	}

	/** getSize() is read every frame: only text styles need a nudge. */
	redraw(graph: OpenGraph, paths: ReadonlySet<string> | null): void {
		refreshNodeSizes(graph.renderer, this.autoDomain() ? null : paths);
	}

	private autoDomain(): boolean {
		return this.config().domain.kind === 'auto';
	}

	nodeSize(node: NodeRef): number | null {
		if (!node.isNote) return null;
		const base = this.sizes.get(node.id);
		const renderer = node.renderer;
		return base === null || !renderer ? null : base * nodeSizeMultiplier(renderer);
	}

	private compute(path: string): number | null {
		const facts = this.facts.get(path);
		if (!facts) return null;
		const config = this.config();
		const property = sizeProperty(config, facts);
		if (!property) return null;
		const value = numericValue(propertyValue(facts.frontmatter, property));
		if (value === null) return null;
		const domain = config.domain.kind === 'fixed' ? config.domain : this.domain(property);
		return domain ? scaleSize(value, domain, config, config.scale) : null;
	}

	private domain(property: string): Range | null {
		if (this.domains.has(property)) return this.domains.get(property) ?? null;
		const values: number[] = [];
		for (const file of this.app.vault.getMarkdownFiles()) {
			const frontmatter: unknown = this.app.metadataCache.getFileCache(file)?.frontmatter;
			if (!frontmatter || typeof frontmatter !== 'object') continue;
			const value = numericValue(propertyValue(frontmatter as Record<string, unknown>, property));
			if (value !== null) values.push(value);
		}
		const domain = autoDomain(values);
		this.domains.set(property, domain);
		return domain;
	}
}
