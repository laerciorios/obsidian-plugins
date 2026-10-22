import { TFolder } from 'obsidian';
import type { Plugin } from 'obsidian';
import { t } from '../i18n';
import { FolderStyleModal } from './folder-style-modal';
import type { ModalHost } from './folder-style-modal';

/** "Customize folder…" in a folder's context menu (file explorer, desktop and mobile). */
export function registerFolderMenu(plugin: Plugin & ModalHost): void {
	plugin.registerEvent(
		plugin.app.workspace.on('file-menu', (menu, file) => {
			if (!(file instanceof TFolder) || file.isRoot()) return;
			menu.addItem((item) =>
				item
					.setTitle(t('menu.customize'))
					.setIcon('palette')
					.onClick(() => new FolderStyleModal(plugin.app, plugin, file.path).open()),
			);
		}),
	);
}
