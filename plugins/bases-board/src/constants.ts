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
	profile: 'profile',
	hideArchived: 'hideArchived',
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
	showChildren: 'showChildren',
	showProgress: 'showProgress',
	showBlocked: 'showBlocked',
} as const;

/**
 * Defaults applied in code. Column values are data (they are written to notes)
 * and never translated; labels are UI and follow the app language. Status,
 * done value, completion and project properties come from the board profile.
 */
export const DEFAULTS = {
	columnValues: ['todo', 'doing', 'review', 'done'] as const,
	hideEmptyOther: true,
	hideArchived: true,
	setCompleted: true,
	titleProperty: 'note.title' as BasesPropertyId,
	typeProperty: 'note.type' as BasesPropertyId,
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
	columnFooter: 'bb-column-footer',
	addCard: 'bb-add-card',
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
	chipParent: 'bb-chip-parent',
	blocked: 'bb-blocked',
	relations: 'bb-relations',
	summary: 'bb-summary',
	progress: 'bb-progress',
	progressTrack: 'bb-progress-track',
	progressFill: 'bb-progress-fill',
	progressLabel: 'bb-progress-label',
	progressComplete: 'bb-progress-complete',
	childList: 'bb-child-list',
	childListCollapsed: 'bb-child-list-collapsed',
	childToggle: 'bb-child-toggle',
	childRows: 'bb-child-rows',
	child: 'bb-child',
	childArchived: 'bb-child-archived',
	childTitle: 'bb-child-title',
	childProgress: 'bb-child-progress',
	status: 'bb-status',
	statusDone: 'bb-status-is-done',
} as const;
