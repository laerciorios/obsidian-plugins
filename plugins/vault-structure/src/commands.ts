import { TFolder } from 'obsidian';
import type { Actions } from './actions';
import type { StructureHost } from './host';
import { t } from './i18n';
import { parentLevel } from './vault/areas';

export interface CommandsHost extends StructureHost {
	actions: Actions;
}

/** Command ids are stable API (hotkeys are saved by id): never rename them. */
export function registerCommands(host: CommandsHost): void {
	host.addCommand({
		id: 'new-area',
		name: t('command.newArea'),
		icon: 'folder-plus',
		callback: () => void host.actions.newArea(),
	});
	host.addCommand({
		id: 'check-structure',
		name: t('command.check'),
		icon: 'folder-check',
		callback: () => host.actions.check(),
	});
	host.addCommand({
		id: 'open-rules',
		name: t('command.openRules'),
		icon: 'scroll-text',
		callback: () => void host.actions.openRules(),
	});
}

/** "New area here" / "New topic here" on folders that can receive a new level. */
export function registerFolderMenu(host: CommandsHost): void {
	host.registerEvent(
		host.app.workspace.on('file-menu', (menu, file) => {
			if (!(file instanceof TFolder)) return;
			const level = parentLevel(file.path, host.rules.current());
			if (level === null) return;
			menu.addItem((item) =>
				item
					.setTitle(t(level === 0 ? 'menu.newArea' : 'menu.newTopic'))
					.setIcon('folder-plus')
					.onClick(() => void host.actions.newArea(file.path)),
			);
		}),
	);
}
