import type { BasesEntry, BasesPropertyId } from 'obsidian';

export interface ColumnSpec {
	value: string;
	label: string;
}

export interface BoardConfig {
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
}

export interface PendingMove {
	toKey: string;
	expires: number;
}
