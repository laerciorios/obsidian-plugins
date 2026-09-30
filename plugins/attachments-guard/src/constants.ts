export const SAVE_DEBOUNCE_MS = 400;
/** Files that appear outside the attachments folder are moved this long after the last one (a folder copy arrives file by file). */
export const CREATE_BATCH_MS = 2000;
/** Bulk moves: update the progress notice and yield to the UI every this many files. */
export const BULK_BATCH = 10;
/** A path handed out by the path hook stays reserved this long, until the caller creates the file. */
export const RESERVATION_MS = 30_000;
/** Moves listed in the confirmation modal; the rest is summarized. */
export const MAX_LISTED = 50;

export const MAX_SIZE_MB = 10_000;

/** Files that are notes, not attachments. */
export const NOTE_EXTENSIONS: ReadonlySet<string> = new Set(['md', 'canvas', 'base']);
/** Attachments shown as thumbnails in the orphan list. */
export const IMAGE_EXTENSIONS: ReadonlySet<string> = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'avif']);

/** Obsidian's local trash. The vault rule is to keep the original path inside it. */
export const TRASH_FOLDER = '.trash';

export const DEFAULT_FOLDER = 'Attachments';
export const DEFAULT_PATTERN = '{note}-{n}';
export const DEFAULT_COVER_PROPERTY = 'cover';
export const DEFAULT_AI_TAG = 'ai-generated';
export const DEFAULT_AI_FOLDER = 'Attachments/AI Generated';
export const DEFAULT_MAX_SIZE_MB = 10;

/**
 * Names that say nothing about a file: what Obsidian, cameras, phones and
 * screenshot tools call them, in English and Portuguese. Matched in file
 * names, so they are data and never translated.
 */
export const DEFAULT_GENERIC_NAMES = [
	'image',
	'imagem',
	'img',
	'pasted image',
	'screenshot',
	'screen shot',
	'captura de tela',
	'photo',
	'foto',
	'picture',
	'pic',
	'logo',
	'whatsapp image',
	'whatsapp video',
	'whatsapp audio',
	'video',
	'audio',
	'recording',
	'gravação',
	'dsc',
	'dscn',
	'pxl',
	'mvimg',
	'scan',
	'download',
	'file',
	'arquivo',
	'attachment',
	'anexo',
	'document',
	'documento',
	'untitled',
	'sem título',
	'unnamed',
	'blob',
];

export const CLS = {
	list: 'ag-list',
	listItem: 'ag-list-item',
	arrow: 'ag-arrow',
	muted: 'ag-muted',
	orphans: 'ag-orphans',
	orphan: 'ag-orphan',
	thumb: 'ag-thumb',
	thumbEmpty: 'ag-thumb-empty',
	orphanName: 'ag-orphan-name',
	orphanMeta: 'ag-orphan-meta',
	toolbar: 'ag-toolbar',
	example: 'ag-example',
} as const;
