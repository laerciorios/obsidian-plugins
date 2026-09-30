/**
 * The structure rules of the vault. They live in the properties of the rules
 * note (rules/rules-file.ts); every value is data, never translated.
 */
export interface VaultRules {
	/** Folders whose subfolders are areas and topics (`1 - Knowledge`). */
	indexRoots: string[];
	/** Levels below each root that need an `index.md`: 1 = areas, 2 = areas and topics. */
	indexDepth: number;
	/** Note used as the template of new `index.md` files; empty = the built-in one. */
	indexTemplate: string;
	/** Subfolders created in every new area or topic, relative to it. */
	scaffold: string[];
	/** Folder names that are never areas or topics (besides the ones starting with "_"). */
	vocabulary: string[];
	/** Words that may stay lowercase in Title Case, except as the first word. Lowercase. */
	minorWords: string[];
	/** Tag of AI-generated notes, without "#"; empty turns the check off. */
	aiTag: string;
	/** Where AI-generated notes go inside their area; empty turns the check off. */
	aiFolder: string;
	/** Folders and files the check never looks at. */
	ignore: string[];
}

export interface VaultStructureSettings {
	version: 1;
	/** Vault path of the rules note. */
	rulesPath: string;
}

/** Report groups, in display order. */
export const RULE_IDS = ['readme', 'missing-index', 'ai-outside', 'file-case', 'folder-case'] as const;
export type RuleId = (typeof RULE_IDS)[number];

export type Fix =
	/** Rename or move a note (`fileManager.renameFile`, links updated). */
	| { kind: 'move'; to: string }
	/** Create the `index.md` of a folder from the template. */
	| { kind: 'create-index'; to: string }
	/** Rename a folder; the user edits the suggested name first. */
	| { kind: 'rename-folder'; suggestion: string };

/** Why a finding has no automatic fix. */
export type NoFixReason = 'index-exists' | 'root' | 'no-name';

export interface Finding {
	rule: RuleId;
	/** The file or folder that breaks the rule. */
	path: string;
	fix: Fix | null;
	reason?: NoFixReason;
}

export interface ScanResult {
	findings: Finding[];
	folders: number;
	notes: number;
}
