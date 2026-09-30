/** Stable API: the workspace layout stores it. Never rename. */
export const VIEW_TYPE = 'comments-panel';
export const ICON = 'message-square';

export const DEFAULT_FOLDER = 'Attachments/Comments';
/** Authors shown with the AI badge. */
export const AI_AUTHORS = ['ia', 'ai'];
/** Written in the comments file: data, the same in every language. */
export const DATE_FORMAT = 'YYYY-MM-DD HH:mm';

export const ID_PREFIX = 'c-';
export const ID_LENGTH = 4;
export const ID_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';

export const SAVE_DEBOUNCE_MS = 400;
/** Typing a new folder name in the settings: rescan once typing stops. */
export const RELOAD_DEBOUNCE_MS = 800;
/** Editing a note: recheck which threads lost their block. */
export const EDIT_DEBOUNCE_MS = 500;

export const CLS = {
	panel: 'cmt-panel',
	header: 'cmt-header',
	title: 'cmt-title',
	summary: 'cmt-summary',
	toolbar: 'cmt-toolbar',
	filter: 'cmt-filter',
	list: 'cmt-list',
	empty: 'cmt-empty',
	thread: 'cmt-thread',
	threadResolved: 'is-resolved',
	threadOrphan: 'is-orphan',
	threadFocused: 'is-focused',
	quote: 'cmt-quote',
	badges: 'cmt-badges',
	badge: 'cmt-badge',
	badgeOrphan: 'cmt-badge-orphan',
	badgeResolved: 'cmt-badge-resolved',
	badgeAi: 'cmt-badge-ai',
	message: 'cmt-message',
	messageHeader: 'cmt-message-header',
	author: 'cmt-author',
	date: 'cmt-date',
	messageQuote: 'cmt-message-quote',
	body: 'cmt-body',
	actions: 'cmt-actions',
	reply: 'cmt-reply',
	input: 'cmt-input',
	hint: 'cmt-hint',
	modalQuote: 'cmt-modal-quote',
	modalNote: 'cmt-modal-note',
	highlight: 'cmt-highlight',
	anchorIcon: 'cmt-anchor-icon',
	status: 'cmt-status',
} as const;
