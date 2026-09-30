import type { Plugin, TFile, Vault } from 'obsidian';

/**
 * `vault.getAvailablePathForAttachments(basename, extension, sourceFile)`:
 * internal, but the one place every Obsidian flow that creates an attachment
 * asks for its path (paste and drop in the editor, canvas, audio recorder,
 * "save image", and the public `fileManager.getAvailablePathForAttachment`).
 */
export type AttachmentPath = (basename: string, extension: string, source: TFile | null) => Promise<string>;

const METHOD = 'getAvailablePathForAttachments';

type HookedVault = Vault & { [METHOD]?: AttachmentPath };

/**
 * Wrap the method so `handler` decides the path; `original` is Obsidian's.
 * Undone on unload. When another plugin wrapped it after us, our wrapper is
 * left in place but passes straight through. Returns false when the method
 * does not exist (a future Obsidian version).
 */
export function hookAttachmentPath(
	plugin: Plugin,
	handler: (basename: string, extension: string, source: TFile | null, original: AttachmentPath) => Promise<string>,
): boolean {
	const vault = plugin.app.vault as HookedVault;
	const original = vault[METHOD];
	if (typeof original !== 'function') return false;
	const hadOwn = Object.prototype.hasOwnProperty.call(vault, METHOD);
	let active = true;

	const wrapper: AttachmentPath = function (this: Vault, basename, extension, source) {
		const call: AttachmentPath = (...args) => original.apply(this, args);
		return active ? handler(basename, extension, source, call) : call(basename, extension, source);
	};
	vault[METHOD] = wrapper;

	plugin.register(() => {
		active = false;
		if (vault[METHOD] !== wrapper) return;
		if (hadOwn) vault[METHOD] = original;
		else delete vault[METHOD];
	});
	return true;
}
