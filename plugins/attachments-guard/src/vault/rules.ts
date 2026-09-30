import { TFile } from 'obsidian';
import type { App, TAbstractFile } from 'obsidian';
import { NOTE_EXTENSIONS } from '../constants';
import type { AttachmentsGuardSettings } from '../types';

export interface RulesHost {
	app: App;
	settings: AttachmentsGuardSettings;
}

/** Whether a vault path is the folder itself or anything below it. */
export function isInside(path: string, folder: string): boolean {
	return folder !== '' && (path === folder || path.startsWith(`${folder}/`));
}

/** Which files are attachments, and where they belong. */
export class Rules {
	constructor(private readonly host: RulesHost) {}

	/** Any file that is not a note, canvas or base, outside hidden and config folders. */
	isAttachment(file: TAbstractFile | null): file is TFile {
		if (!(file instanceof TFile) || !file.extension) return false;
		if (NOTE_EXTENSIONS.has(file.extension.toLowerCase())) return false;
		if (isInside(file.path, this.host.app.vault.configDir)) return false;
		return !file.path.split('/').some((part) => part.startsWith('.'));
	}

	isIgnored(path: string): boolean {
		return this.host.settings.ignoredFolders.some((folder) => isInside(path, folder));
	}

	/** Inside the attachments folder (subfolders included) or the folder of AI-generated notes. */
	isGuarded(path: string): boolean {
		const { folder, aiFolder } = this.host.settings;
		return isInside(path, folder) || isInside(path, aiFolder);
	}

	/** An attachment outside the attachments folder that the plugin may move. */
	isLoose(file: TAbstractFile | null): file is TFile {
		return this.isAttachment(file) && !this.isGuarded(file.path) && !this.isIgnored(file.path);
	}

	/** Every attachment of the vault outside ignored folders. */
	attachments(): TFile[] {
		return this.host.app.vault.getFiles().filter((file) => this.isAttachment(file) && !this.isIgnored(file.path));
	}
}
