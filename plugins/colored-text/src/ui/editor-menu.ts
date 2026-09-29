import type { Plugin } from 'obsidian';
import type { ColorActions } from '../actions';
import { t } from '../i18n';
import type { ColoredTextSettings } from '../types';

export interface MenuHost extends Plugin {
	settings: ColoredTextSettings;
	actions: ColorActions;
}

/** Right-click in the editor: the last color, the picker and, over color, remove. */
export function registerEditorMenu(plugin: MenuHost): void {
	plugin.registerEvent(
		plugin.app.workspace.on('editor-menu', (menu, editor) => {
			if (!plugin.settings.editorMenu) return;
			const { actions } = plugin;
			const last = actions.lastToken();
			if (last) {
				menu.addItem((item) =>
					item
						.setTitle(t('menu.colorWith', { name: last }))
						.setIcon('palette')
						.onClick(() => actions.apply(editor, last)),
				);
			}
			menu.addItem((item) =>
				item
					.setTitle(t('menu.chooseColor'))
					.setIcon('palette')
					.onClick(() => actions.choose(editor)),
			);
			if (actions.canRemove(editor)) {
				menu.addItem((item) =>
					item
						.setTitle(t('menu.removeColor'))
						.setIcon('eraser')
						.onClick(() => actions.remove(editor)),
				);
			}
		}),
	);
}
