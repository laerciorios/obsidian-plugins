/**
 * Project → spec → task relations between cards. Pure: built from plain
 * records and a link resolver, so it runs (and is tested) without Obsidian.
 */

/** Frontmatter keys and values the graph reads. */
export interface GraphKeys {
	title: string;
	status: string;
	doneValue: string;
	type: string;
	specValue: string;
	project: string;
	parent: string;
	order: string;
	blockedBy: string;
}

/** One card as read from the metadata cache. */
export interface CardRecord {
	path: string;
	basename: string;
	frontmatter: Record<string, unknown>;
	/** Inside an archive folder of the profile. */
	archived: boolean;
}

export interface CardNode {
	path: string;
	title: string;
	/** Raw status value, as written in the note. */
	status: string;
	done: boolean;
	type: string;
	/** Numeric `order`, or null when missing or not a number. */
	order: number | null;
	archived: boolean;
	/** Resolved path of the parent card (any note the link points to). */
	parent: string | null;
	/** Resolved path of the project note: own link, else inherited from the parent chain. */
	project: string | null;
	/** Resolved paths of the blockers (unresolved links are dropped). */
	blockedBy: string[];
}

/** Status of a note that is not a card of the profile (e.g. a blocker elsewhere). */
export interface NoteStatus {
	title: string;
	done: boolean;
}

export interface Graph {
	nodes: ReadonlyMap<string, CardNode>;
	/** Parent path → direct children (archived included), sorted by order then title. */
	children: ReadonlyMap<string, CardNode[]>;
	/** Project path → the cards of the project (archived included). */
	projects: ReadonlyMap<string, CardNode[]>;
	/** Blockers that are not cards of the profile, by path. */
	outside: ReadonlyMap<string, NoteStatus>;
}

/** Resolve a link text from a source note to a vault path, or null. */
export type LinkResolver = (linktext: string, sourcePath: string) => string | null;

const WIKILINK = /\[\[([^\]|#^]+)(?:[#^][^\]|]*)?(?:\|[^\]]*)?\]\]/g;

function scalar(value: unknown): string {
	if (typeof value === 'string') return value.trim();
	if (typeof value === 'number' || typeof value === 'boolean') return String(value);
	return '';
}

function firstText(value: unknown): string {
	return scalar(Array.isArray(value) ? (value[0] as unknown) : value);
}

/** Link texts in a frontmatter value: wikilinks, or a bare path. Lists allowed. */
export function linkTexts(value: unknown): string[] {
	const items: unknown[] = Array.isArray(value) ? value : [value];
	const out: string[] = [];
	for (const item of items) {
		const text = scalar(item);
		if (!text) continue;
		const matches = [...text.matchAll(WIKILINK)].map((match) => (match[1] ?? '').trim()).filter(Boolean);
		if (matches.length > 0) out.push(...matches);
		else if (!text.includes('[[')) out.push(text);
	}
	return out;
}

export function parseOrder(value: unknown): number | null {
	const raw = Array.isArray(value) ? (value[0] as unknown) : value;
	if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
	if (typeof raw === 'string' && raw.trim() !== '') {
		const n = Number(raw.trim());
		return Number.isFinite(n) ? n : null;
	}
	return null;
}

/** Order ascending (missing last), then title, then path: stable across renders. */
export function compareChildren(a: CardNode, b: CardNode): number {
	if (a.order !== null && b.order !== null && a.order !== b.order) return a.order - b.order;
	if (a.order === null && b.order !== null) return 1;
	if (a.order !== null && b.order === null) return -1;
	return a.title.localeCompare(b.title) || a.path.localeCompare(b.path);
}

const MAX_DEPTH = 20;

export function buildGraph(
	records: readonly CardRecord[],
	keys: GraphKeys,
	resolve: LinkResolver,
	/** Status of notes outside the profile (blockers); null when not a note. */
	lookup: (path: string) => NoteStatus | null,
): Graph {
	const nodes = new Map<string, CardNode>();
	const firstLink = (record: CardRecord, key: string): string | null => {
		if (!key) return null;
		const [text] = linkTexts(record.frontmatter[key]);
		const path = text ? resolve(text, record.path) : null;
		return path && path !== record.path ? path : null;
	};

	for (const record of records) {
		const fm = record.frontmatter;
		const status = firstText(fm[keys.status]);
		const blockedBy = keys.blockedBy
			? linkTexts(fm[keys.blockedBy])
					.map((text) => resolve(text, record.path))
					.filter((path): path is string => path !== null && path !== record.path)
			: [];
		nodes.set(record.path, {
			path: record.path,
			title: firstText(fm[keys.title]) || record.basename,
			status,
			done: status !== '' && status === keys.doneValue,
			type: firstText(fm[keys.type]),
			order: keys.order ? parseOrder(fm[keys.order]) : null,
			archived: record.archived,
			parent: firstLink(record, keys.parent),
			project: firstLink(record, keys.project),
			blockedBy: [...new Set(blockedBy)],
		});
	}

	const children = new Map<string, CardNode[]>();
	for (const node of nodes.values()) {
		if (!node.parent) continue;
		const list = children.get(node.parent);
		if (list) list.push(node);
		else children.set(node.parent, [node]);
	}
	for (const list of children.values()) list.sort(compareChildren);

	// A card without its own project inherits the first one up the parent chain.
	const projects = new Map<string, CardNode[]>();
	for (const node of nodes.values()) {
		let project = node.project;
		let current = node;
		const seen = new Set<string>([node.path]);
		for (let depth = 0; !project && current.parent && depth < MAX_DEPTH; depth++) {
			if (seen.has(current.parent)) break;
			seen.add(current.parent);
			const parent = nodes.get(current.parent);
			if (!parent) break;
			project = parent.project;
			current = parent;
		}
		if (!project || project === node.path) continue;
		node.project = project;
		const list = projects.get(project);
		if (list) list.push(node);
		else projects.set(project, [node]);
	}

	const outside = new Map<string, NoteStatus>();
	for (const node of nodes.values()) {
		for (const path of node.blockedBy) {
			if (nodes.has(path) || outside.has(path)) continue;
			const status = lookup(path);
			if (status) outside.set(path, status);
		}
	}

	return { nodes, children, projects, outside };
}
