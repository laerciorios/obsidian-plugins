import { Notice, moment } from 'obsidian';
import type { Editor } from 'obsidian';
import { BUTTONS_BLOCK, SUMMARY_BLOCK } from './constants';
import type { WorkLogHost } from './host';
import { t } from './i18n';
import { LogModal } from './ui/log-modal';

/** Open (or create) today's daily note and the window to mark its projects. */
export async function logToday(host: WorkLogHost): Promise<void> {
	try {
		const file = await host.daily.today();
		if (host.settings.openDaily) await host.daily.open(file);
		new LogModal(host, file, moment()).open();
	} catch (error) {
		console.error('Daily Work Log: could not open the daily note', error);
		new Notice(error instanceof Error && error.message ? error.message : t('notice.dailyFailed'));
	}
}

/** Put a code block at the cursor, after a blank line when the cursor is in the middle of text. */
function insertBlock(editor: Editor, language: string): void {
	const cursor = editor.getCursor();
	const before = cursor.ch > 0 ? '\n\n' : '';
	editor.replaceRange(`${before}\`\`\`${language}\n\`\`\`\n`, cursor);
	editor.setCursor({ line: cursor.line + before.length + 2, ch: 0 });
}

/** Command ids are stable API (hotkeys are saved by id): never rename them. */
export function registerCommands(host: WorkLogHost): void {
	host.addCommand({
		id: 'log-today',
		name: t('command.logToday'),
		icon: 'calendar-check',
		callback: () => void logToday(host),
	});
	host.addCommand({
		id: 'insert-buttons',
		name: t('command.insertButtons'),
		icon: 'toggle-right',
		editorCallback: (editor) => insertBlock(editor, BUTTONS_BLOCK),
	});
	host.addCommand({
		id: 'insert-summary',
		name: t('command.insertSummary'),
		icon: 'calendar-range',
		editorCallback: (editor) => insertBlock(editor, SUMMARY_BLOCK),
	});
	host.addRibbonIcon('calendar-check', t('command.logToday'), () => void logToday(host));
}
