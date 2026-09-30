export interface AttachmentsGuardSettings {
	version: 1;
	/** Name and place new attachments (the path hook and the create watcher). */
	organize: boolean;
	/** Vault path of the attachments folder, without slashes at the ends. */
	folder: string;
	/** Name for generic files; variables in naming/pattern.ts. */
	pattern: string;
	/** Generic names, as the user typed them (compared by naming/generic.ts). Data, not UI. */
	genericNames: string[];
	/** Folders whose attachments are never touched, without slashes at the ends. */
	ignoredFolders: string[];
	/** Frontmatter key of the cover (data, not UI); empty turns cover names off. */
	coverProperty: string;
	/** Tag of AI-generated notes, without "#". Data, not UI. */
	aiTag: string;
	/** Folder for attachments of AI-generated notes; empty keeps them in `folder`. */
	aiFolder: string;
	/** Warn above this size, in MB; 0 turns the warning off. */
	maxSizeMb: number;
}
