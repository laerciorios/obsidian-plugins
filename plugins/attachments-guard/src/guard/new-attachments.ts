import { NOTE_EXTENSIONS } from '../constants';
import type { GuardHost } from '../host';
import { ensureFolder, logError } from '../vault/files';
import { hookAttachmentPath } from './path-hook';

/**
 * Names attachments when Obsidian creates them: the path hook answers with
 * the attachments folder and the vault's naming rule, so the link Obsidian
 * inserts right after is already the final one.
 */
export function guardNewAttachments(host: GuardHost): void {
	const hooked = hookAttachmentPath(host, async (basename, extension, source, original) => {
		const { settings, rules, planner, app } = host;
		if (!settings.organize || !extension || NOTE_EXTENSIONS.has(extension.toLowerCase())) {
			return original(basename, extension, source);
		}
		// "Save image" has no source file; the attachment belongs to the note on screen.
		const note = source ?? app.workspace.getActiveFile();
		if (note && rules.isIgnored(note.path)) return original(basename, extension, source);
		try {
			const target = planner.plan({ basename, extension, note });
			await ensureFolder(app, target.folder);
			planner.reserve(target);
			return target.path;
		} catch (error) {
			logError(error);
			return original(basename, extension, source);
		}
	});
	if (!hooked) {
		console.warn('Attachments Guard: this Obsidian version has no attachment path hook; new attachments are only moved after they are created.');
	}
}
