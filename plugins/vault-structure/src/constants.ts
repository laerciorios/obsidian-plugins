export const SAVE_DEBOUNCE_MS = 400;
/** Bulk fixes: update the progress notice and yield to the UI every this many items. */
export const BULK_BATCH = 10;
/** Rows listed per report group and in the confirmation; the rest is summarized. */
export const MAX_LISTED = 100;
export const MAX_INDEX_DEPTH = 10;

export const DEFAULT_RULES_PATH = 'vault-rules.md';
/** The folder summary note. The vault convention, not a rule: never `README.md`. */
export const INDEX_BASENAME = 'index';
export const INDEX_NAME = `${INDEX_BASENAME}.md`;
export const README_BASENAME = 'readme';

/** Files checked for the kebab-case rule; attachments are Attachments Guard's. */
export const NOTE_EXTENSIONS: ReadonlySet<string> = new Set(['md', 'canvas', 'base']);

/** Characters Obsidian refuses in names or that break links. */
export const FORBIDDEN_NAME_CHARS = /[\\/:*?"<>|#^[\]]/g;

/**
 * Built-in template of `index.md`, like the vault's current indexes. Written to
 * notes, so it is data and never translated. Variables in vault/index-note.ts.
 */
export const DEFAULT_INDEX_TEMPLATE = `---
title: "{{title}}"
type: index
tags:
  - index
created: {{date}}
updated: {{date}}
---
# {{title}}
`;

export const CLS = {
	report: 'vs-report',
	summary: 'vs-summary',
	group: 'vs-group',
	row: 'vs-row',
	list: 'vs-list',
	listItem: 'vs-list-item',
	arrow: 'vs-arrow',
	muted: 'vs-muted',
	hint: 'vs-hint',
	desc: 'vs-desc',
	warning: 'vs-warning',
} as const;
