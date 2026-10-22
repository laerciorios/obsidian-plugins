/** What a rule can see of a note, built from the metadata cache (never from the file). */
export interface NoteFacts {
	path: string;
	/** File name without extension. */
	basename: string;
	/** Parent folder path, "" for the vault root. */
	folder: string;
	/** Lowercase, without "#", from the frontmatter and the body. */
	tags: string[];
	frontmatter: Record<string, unknown>;
}

interface ConditionBase {
	/** Negates the condition ("status is not done"). */
	not: boolean;
}

export interface FolderCondition extends ConditionBase {
	type: 'folder';
	/** "" is the vault root. */
	path: string;
	subfolders: boolean;
}

export interface TagCondition extends ConditionBase {
	type: 'tag';
	tag: string;
	/** "project" also matches "project/active". */
	nested: boolean;
}

export interface FilenameCondition extends ConditionBase {
	type: 'filename';
	/** File name without extension; "*" is a wildcard. */
	value: string;
}

export interface PropertyExistsCondition extends ConditionBase {
	type: 'propertyExists';
	key: string;
}

export interface PropertyEqualsCondition extends ConditionBase {
	type: 'propertyEquals';
	key: string;
	value: string;
}

export type Condition = FolderCondition | TagCondition | FilenameCondition | PropertyExistsCondition | PropertyEqualsCondition;
export type ConditionType = Condition['type'];

export const CONDITION_TYPES: readonly ConditionType[] = ['folder', 'tag', 'filename', 'propertyExists', 'propertyEquals'];

export type MatchMode = 'all' | 'any';

/** Condition → effect. The effect type belongs to each feature. */
export interface Rule<E> {
	id: string;
	name: string;
	enabled: boolean;
	match: MatchMode;
	conditions: Condition[];
	effect: E;
}
