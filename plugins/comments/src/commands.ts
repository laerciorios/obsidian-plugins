import type { Plugin } from 'obsidian';
import type { CommentActions } from './actions';
import { ICON } from './constants';
import { t } from './i18n';
import type { CommentStore } from './store/store';

export interface CommandsHost extends Plugin {
	store: CommentStore;
	actions: CommentActions;
	openPanel(): Promise<unknown>;
}

/** Command ids are stable API (hotkeys are saved by id): never rename them. */
export function registerCommands(host: CommandsHost): void {
	host.addCommand({
		id: 'comment-selection',
		name: t('command.commentSelection'),
		icon: ICON,
		editorCheckCallback: (checking, editor, info) => {
			if (info.file?.extension !== 'md') return false;
			if (!checking) host.actions.commentSelection(editor, info);
			return true;
		},
	});
	host.addCommand({
		id: 'open-panel',
		name: t('command.openPanel'),
		icon: ICON,
		callback: () => void host.openPanel(),
	});
	host.addCommand({
		id: 'open-file',
		name: t('command.openFile'),
		icon: 'file-text',
		checkCallback: (checking) => {
			const file = host.app.workspace.getActiveFile();
			if (!file || !host.store.fileOf(file.path)) return false;
			if (!checking) host.actions.openCommentsFile(file.path);
			return true;
		},
	});
}
