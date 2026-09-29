import type { BasesPropertyId } from 'obsidian';

/** Bases view id. Stored as `type:` in .base files — never rename. */
export const VIEW_TYPE = 'bases-board';
export const HOVER_SOURCE = 'bases-board';

/** Column key for entries whose value is not in the configured column list. */
export const OTHER_KEY = '__other__';

/** How long an optimistic move overrides stale query results. */
export const PENDING_TTL_MS = 4000;
export const PENDING_SWEEP_MS = 1000;

export const OPTION = {
	columnProperty: 'columnProperty',
	columns: 'columns',
	otherLabel: 'otherLabel',
	hideEmptyOther: 'hideEmptyOther',
	doneValue: 'doneValue',
	completedProperty: 'completedProperty',
	setCompleted: 'setCompleted',
	titleProperty: 'titleProperty',
	typeProperty: 'typeProperty',
	projectProperty: 'projectProperty',
	executorProperty: 'executorProperty',
	aiValue: 'aiValue',
	dueProperty: 'dueProperty',
} as const;

/**
 * Defaults applied in code. Column values are data (they are written to notes)
 * and never translated; labels are UI and follow the app language.
 */
export const DEFAULTS = {
	columnProperty: 'note.status' as BasesPropertyId,
	columnValues: ['todo', 'doing', 'review', 'done'] as const,
	hideEmptyOther: true,
	doneValue: 'done',
	completedProperty: 'note.completed' as BasesPropertyId,
	setCompleted: true,
	titleProperty: 'note.title' as BasesPropertyId,
	typeProperty: 'note.type' as BasesPropertyId,
	projectProperty: 'note.project' as BasesPropertyId,
	executorProperty: 'note.executor' as BasesPropertyId,
	aiValue: 'ai',
	dueProperty: 'note.due' as BasesPropertyId,
};

/** Card types that are shown but cannot be dragged (they are not board cards). */
export const LOCKED_TYPES = new Set(['project']);

export const CLS = {
	root: 'bb-root',
	notes: 'bb-notes',
	note: 'bb-note',
	board: 'bb-board',
	column: 'bb-column',
	columnDone: 'bb-column-done',
	columnOther: 'bb-column-other',
	columnHeader: 'bb-column-header',
	columnTitle: 'bb-column-title',
	count: 'bb-count',
	columnBody: 'bb-column-body',
	dropTarget: 'bb-drop-target',
	card: 'bb-card',
	cardLocked: 'bb-card-locked',
	cardDragging: 'bb-card-dragging',
	cardTitle: 'bb-card-title',
	cardMeta: 'bb-card-meta',
	badge: 'bb-badge',
	chip: 'bb-chip',
	chipProject: 'bb-chip-project',
	chipAi: 'bb-chip-ai',
	due: 'bb-due',
	dueOverdue: 'bb-due-overdue',
	dragging: 'bb-is-dragging',
} as const;
