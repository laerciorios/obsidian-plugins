import type { Plugin } from 'obsidian';
import type { CollectLoose } from './commands/collect';
import type { ListOrphans } from './commands/orphans';
import { t } from './i18n';

export interface CommandsHost extends Plugin {
	collect: CollectLoose;
	orphans: ListOrphans;
}

/** Command ids are stable API (hotkeys are saved by id): never rename them. */
export function registerCommands(host: CommandsHost): void {
	host.addCommand({
		id: 'collect-loose',
		name: t('command.collect'),
		icon: 'folder-input',
		callback: () => void host.collect.run(),
	});
	host.addCommand({
		id: 'list-orphans',
		name: t('command.orphans'),
		icon: 'file-x',
		callback: () => void host.orphans.run(),
	});
}
