import type { Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

/**
 * Obsidian has no event for selection changes: listen in every editor. Edits are
 * left to `editor-change`, which also fires when typing moves the selection.
 */
export function selectionListener(onChange: () => void): Extension {
	return EditorView.updateListener.of((update) => {
		if (update.selectionSet && !update.docChanged) onChange();
	});
}
