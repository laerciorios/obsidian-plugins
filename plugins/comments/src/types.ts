export interface CommentsSettings {
	version: 1;
	/** Vault folder with one comments file per note. */
	folder: string;
	/** Author written on the user's comments. */
	author: string;
	/** Highlight commented passages in the editor. */
	highlight: boolean;
	/** Open comments count in the status bar. */
	statusBar: boolean;
	/** The panel hides resolved conversations. */
	onlyOpen: boolean;
}
