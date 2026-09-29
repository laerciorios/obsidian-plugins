import { debounce } from 'obsidian';
import type { App, CachedMetadata, Plugin, TFile } from 'obsidian';
import { folderOf } from '../patterns/pattern';
import { archiveMatcherOf, fmText, hasProfileTag, isProfileCard } from '../profiles/matcher';
import type { BoardProfile } from '../settings/model';
import { buildGraph } from './graph';
import type { CardRecord, Graph, GraphKeys, NoteStatus } from './graph';

/** Wait after the last relevant change before re-rendering the boards. */
const REFRESH_DELAY_MS = 300;

interface CachedGraph {
	graph: Graph;
	profile: BoardProfile;
	/** Paths whose change can alter this graph besides its own cards (projects, parents, blockers). */
	related: Set<string>;
}

/**
 * In-memory index of card relations, one graph per board profile (and per set
 * of property keys). Built lazily from the metadata cache — no file is read —
 * from every card of the profile in the vault, archived ones included, so a
 * spec's progress does not depend on what the view happens to show.
 */
export class HierarchyIndex {
	private readonly graphs = new Map<string, CachedGraph>();
	/** A file was created or renamed: links may resolve differently after the next 'resolved'. */
	private linksPending = false;

	constructor(private readonly app: App) {}

	/** Graph for a profile and keys; built on first use after any relevant change. */
	graph(profile: BoardProfile, keys: GraphKeys): Graph {
		const id = JSON.stringify([profile.cardTag, profile.includeFolders, profile.excludeFolders, profile.archive.folderPattern, keys]);
		const cached = this.graphs.get(id);
		if (cached) return cached.graph;
		const built = this.build(profile, keys);
		this.graphs.set(id, built);
		return built.graph;
	}

	/**
	 * Watch the vault. `onStale` runs (debounced) after a change that may alter
	 * a graph in use, so open boards re-render without reloading the app.
	 */
	start(plugin: Plugin, onStale: () => void): void {
		const notify = debounce(onStale, REFRESH_DELAY_MS, true);
		const stale = (): void => {
			if (this.graphs.size === 0) return;
			this.graphs.clear();
			notify();
		};
		const { metadataCache, vault } = this.app;
		plugin.registerEvent(
			metadataCache.on('changed', (file, _data, cache) => {
				if (this.affects(file, cache)) stale();
			}),
		);
		plugin.registerEvent(
			metadataCache.on('resolved', () => {
				if (!this.linksPending) return;
				this.linksPending = false;
				stale();
			}),
		);
		plugin.registerEvent(
			vault.on('create', () => {
				this.linksPending = true;
			}),
		);
		plugin.registerEvent(
			vault.on('rename', () => {
				this.linksPending = true;
				stale();
			}),
		);
		plugin.registerEvent(vault.on('delete', () => stale()));
		plugin.register(() => {
			notify.cancel();
			this.graphs.clear();
		});
	}

	/** Forget every graph (settings changed). */
	clear(): void {
		this.graphs.clear();
	}

	private affects(file: TFile, cache: CachedMetadata): boolean {
		for (const entry of this.graphs.values()) {
			if (entry.graph.nodes.has(file.path) || entry.related.has(file.path)) return true;
			if (this.isCard(file, cache, entry.profile)) return true;
		}
		return false;
	}

	/** A card of the profile, active or in one of its archive folders. */
	private isCard(file: TFile, cache: CachedMetadata | null, profile: BoardProfile): boolean {
		if (!cache || file.extension !== 'md') return false;
		if (isProfileCard(file, cache, profile)) return true;
		if (profile.cardTag && !hasProfileTag(cache, profile.cardTag)) return false;
		return archiveMatcherOf(profile)?.test(folderOf(file.path)) ?? false;
	}

	private build(profile: BoardProfile, keys: GraphKeys): CachedGraph {
		const { metadataCache, vault } = this.app;
		const archived = archiveMatcherOf(profile);
		const records: CardRecord[] = [];
		for (const file of vault.getMarkdownFiles()) {
			const cache = metadataCache.getFileCache(file);
			if (!this.isCard(file, cache, profile)) continue;
			records.push({
				path: file.path,
				basename: file.basename,
				frontmatter: cache?.frontmatter ?? {},
				archived: archived?.test(folderOf(file.path)) ?? false,
			});
		}

		const resolve = (linktext: string, sourcePath: string): string | null =>
			metadataCache.getFirstLinkpathDest(linktext, sourcePath)?.path ?? null;
		// Blockers outside the profile count only when they look like cards (have a status).
		const lookup = (path: string): NoteStatus | null => {
			const file = vault.getFileByPath(path);
			if (!file || file.extension !== 'md') return null;
			const fm = metadataCache.getFileCache(file)?.frontmatter ?? {};
			const status = fmText(fm, keys.status);
			if (!status) return null;
			return { title: fmText(fm, keys.title) || file.basename, done: status === keys.doneValue };
		};

		const graph = buildGraph(records, keys, resolve, lookup);
		const related = new Set<string>(graph.projects.keys());
		for (const node of graph.nodes.values()) {
			if (node.parent) related.add(node.parent);
			for (const blocker of node.blockedBy) related.add(blocker);
		}
		return { graph, profile, related };
	}
}
