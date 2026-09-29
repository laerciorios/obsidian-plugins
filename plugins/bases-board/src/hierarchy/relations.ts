import type { CardNode, Graph } from './graph';

/** What the view shows, after profile and view options are merged. */
export interface HierarchyDisplay {
	/** Child lists on specs, spec lists on projects and the "↑ parent" chip. */
	children: boolean;
	/** Progress bars and the project summary. */
	progress: boolean;
	/** Lock on cards with blockers that are not done. */
	blocked: boolean;
	/** Summary and spec list on project cards. */
	projects: boolean;
	countArchived: boolean;
	collapseAbove: number;
	specValue: string;
}

export interface Progress {
	done: number;
	total: number;
}

export interface RelationRow {
	path: string;
	title: string;
	status: string;
	done: boolean;
	archived: boolean;
	/** Progress of a spec row (project lists only). */
	progress?: Progress;
}

export interface RelationList {
	rows: RelationRow[];
	/** Start collapsed (more rows than collapseAbove). */
	collapsed: boolean;
}

export interface ProjectSummary {
	specs: number;
	tasks: number;
	/** Tasks done / total; null when progress is hidden (then the summary line is too). */
	progress: Progress | null;
	list: RelationList | null;
}

export interface CardRelations {
	parent: { path: string; title: string } | null;
	/** Titles of blockers not done yet (empty = not blocked). */
	blockers: string[];
	/** Spec: progress and list of its direct children. */
	progress: Progress | null;
	children: RelationList | null;
	project: ProjectSummary | null;
}

const EMPTY: CardRelations = { parent: null, blockers: [], progress: null, children: null, project: null };

function counted(nodes: readonly CardNode[] | undefined, display: HierarchyDisplay): CardNode[] {
	if (!nodes) return [];
	return display.countArchived ? [...nodes] : nodes.filter((node) => !node.archived);
}

function progressOf(nodes: readonly CardNode[]): Progress {
	return { done: nodes.filter((node) => node.done).length, total: nodes.length };
}

function row(node: CardNode): RelationRow {
	return { path: node.path, title: node.title, status: node.status, done: node.done, archived: node.archived };
}

function list(rows: RelationRow[], display: HierarchyDisplay): RelationList {
	return { rows, collapsed: rows.length > display.collapseAbove };
}

/** A spec: typed as one, or has children (archived ones count, even when hidden). */
export function isSpec(graph: Graph, node: CardNode, specValue: string): boolean {
	return (specValue !== '' && node.type === specValue) || (graph.children.get(node.path)?.length ?? 0) > 0;
}

function blockerTitles(graph: Graph, node: CardNode): string[] {
	const titles: string[] = [];
	for (const path of node.blockedBy) {
		const blocker = graph.nodes.get(path) ?? graph.outside.get(path);
		if (blocker && !blocker.done) titles.push(blocker.title);
	}
	return titles;
}

/** Everything the card of `path` shows about its relations. */
export function relationsOf(graph: Graph, path: string, display: HierarchyDisplay): CardRelations {
	if (!display.children && !display.progress && !display.blocked) return EMPTY;
	const node = graph.nodes.get(path);
	const relations: CardRelations = { ...EMPTY, blockers: [] };

	if (node) {
		if (display.children && node.parent) {
			const parent = graph.nodes.get(node.parent);
			if (parent) relations.parent = { path: parent.path, title: parent.title };
		}
		if (display.blocked) relations.blockers = blockerTitles(graph, node);
	}

	const kids = counted(graph.children.get(path), display);
	if (kids.length > 0) {
		if (display.progress) relations.progress = progressOf(kids);
		if (display.children) relations.children = list(kids.map(row), display);
	}

	const members = display.projects ? graph.projects.get(path) : undefined;
	if (members && (display.progress || display.children)) {
		const cards = counted(members, display);
		const specs = cards.filter((card) => isSpec(graph, card, display.specValue));
		const tasks = cards.filter((card) => !isSpec(graph, card, display.specValue));
		const specRows = specs.sort((a, b) => a.title.localeCompare(b.title)).map((spec) => ({
			...row(spec),
			progress: progressOf(counted(graph.children.get(spec.path), display)),
		}));
		relations.project = {
			specs: specs.length,
			tasks: tasks.length,
			progress: display.progress ? progressOf(tasks) : null,
			list: display.children && specRows.length > 0 ? list(specRows, display) : null,
		};
	}
	return relations;
}
