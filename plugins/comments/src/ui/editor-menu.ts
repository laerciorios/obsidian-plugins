import type { Plugin } from 'obsidian';
import type { CommentActions } from '../actions';
import { ICON } from '../constants';
import { t } from '../i18n';
import type { CommentStore } from '../store/store';

export interface MenuHost extends Plugin {
	store: CommentStore;
	actions: CommentActions;
}

/** Right-click on a selection: "Comment". */
export function registerEditorMenu(plugin: MenuHost): void {
	plugin.registerEvent(
		plugin.app.workspace.on('editor-menu', (menu, editor, info) => {
			if (!editor.somethingSelected() || !info.file || plugin.store.isCommentsFile(info.file.path)) return;
			menu.addItem((item) =>
				item
					.setTitle(t('menu.comment'))
					.setIcon(ICON)
					.setSection('selection')
					.onClick(() => plugin.actions.commentSelection(editor, info)),
			);
		}),
	);
}
