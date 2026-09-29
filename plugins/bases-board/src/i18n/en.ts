import type { Messages } from '@obsidian-plugins/i18n';

/** Source catalog. Every other locale must define all of these keys. */
export const en = {
	'view.name': 'Board',

	'column.todo': 'To do',
	'column.doing': 'Doing',
	'column.review': 'To review',
	'column.done': 'Done',
	'column.other': 'Other',

	'option.group.columns': 'Columns',
	'option.columnProperty': 'Column property',
	'option.columns': 'Columns (value|label)',
	'option.otherLabel': 'Label for other values',
	'option.hideEmptyOther': 'Hide the other column when empty',
	'option.doneValue': 'Done value',
	'option.setCompleted': 'Record completion date',
	'option.completedProperty': 'Completion date property',
	'option.group.card': 'Card',
	'option.title': 'Title',
	'option.titlePlaceholder': 'File name',
	'option.type': 'Type',
	'option.project': 'Project',
	'option.executor': 'Executor',
	'option.aiValue': 'Executor value that means AI',
	'option.due': 'Due date',

	'hint.notWritable': '"{property}" is computed and cannot be written, so dragging is off. Pick a note property instead.',
	'hint.noDoneColumn': 'No column has the value "{value}", so the completion date will not be recorded.',
	'hint.groupByIgnored': 'Bases grouping is ignored in this view: columns come from the column property.',
	'hint.empty': 'No notes match the filters of this view.',

	'card.ai': 'AI',
	'card.openProject': 'Open {name}',
	'card.due': 'Due: {date}',
	'card.overdue': 'Overdue: {date}',

	'notice.basesDisabled': 'Bases Board: turn on the Bases core plugin to use the Board view.',
	'notice.fileNotFound': 'Bases Board: file not found.',
	'notice.moveFailed': 'Bases Board: could not move "{name}".',
} satisfies Messages;
