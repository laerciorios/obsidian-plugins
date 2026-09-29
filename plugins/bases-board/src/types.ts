import type { BasesEntry, BasesPropertyId } from 'obsidian';
import type { GraphKeys } from './hierarchy/graph';
import type { CardRelations, HierarchyDisplay } from './hierarchy/relations';
import type { BoardProfile } from './settings/model';

export interface ColumnSpec {
	value: string;
	label: string;
}

export interface BoardConfig {
	/** Profile of the view (option "profile", else the first profile). */
	profile: BoardProfile;
	/** False when the view's `profile` option names a profile that no longer exists. */
	profileFound: boolean;
	hideArchived: boolean;
	columnProperty: BasesPropertyId;
	/** False when the column property is a formula/file property (cannot be written). */
	columnWritable: boolean;
	columns: ColumnSpec[];
	otherLabel: string;
	hideEmptyOther: boolean;
	doneValue: string;
	completedProperty: BasesPropertyId | null;
	setCompleted: boolean;
	titleProperty: BasesPropertyId | null;
	typeProperty: BasesPropertyId | null;
	projectProperty: BasesPropertyId | null;
	executorProperty: BasesPropertyId | null;
	aiValue: string;
	dueProperty: BasesPropertyId | null;
	/** What the cards show about project → spec → task relations. */
	hierarchy: HierarchyDisplay;
	/** Frontmatter keys the relation index reads for this view. */
	graphKeys: GraphKeys;
}

export interface Column {
	key: string;
	label: string;
	isDone: boolean;
	isOther: boolean;
	entries: BasesEntry[];
}

export interface LinkTarget {
	label: string;
	/** Link path to open, or null when the value is plain text. */
	linkpath: string | null;
}

export interface CardModel {
	path: string;
	title: string;
	/** Raw type value (e.g. "task"), or null when not shown. */
	type: string | null;
	project: LinkTarget | null;
	isAi: boolean;
	/** YYYY-MM-DD */
	due: string | null;
	isOverdue: boolean;
	draggable: boolean;
	relations: CardRelations | null;
}

export interface PendingMove {
	toKey: string;
	expires: number;
}
