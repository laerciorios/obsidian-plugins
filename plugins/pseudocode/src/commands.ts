import { Notice } from 'obsidian';
import type { Editor, Plugin } from 'obsidian';
import { blockAt } from './editor/blocks';
import { copySource } from './export/clipboard';
import { t } from './i18n';
import { BLOCK_LANGUAGE } from './render/numbering';
import type { PseudocodeSettings } from './settings/settings';

export interface CommandsHost extends Plugin {
	settings: PseudocodeSettings;
}

/** Skeleton of the course template: caption, Require/Ensure and one statement. */
const ALGORITHMIC_SKELETON = [
	'\\begin{algorithm}',
	'\\caption{}',
	'\\begin{algorithmic}',
	'\\Require ',
	'\\Ensure ',
	'\\State ',
	'\\end{algorithmic}',
	'\\end{algorithm}',
];

/** The same skeleton in algorithm2e, as in the LaTeX version of the template. */
const ALGORITHM2E_SKELETON = [
	'\\begin{algorithm}',
	'\\caption{}',
	'\\SetAlgoLined',
	'\\SetKwInOut{Input}{input}',
	'\\SetKwInOut{Output}{output}',
	'\\Input{}',
	'\\Output{}',
	'\\;',
	'\\end{algorithm}',
];

/** Insert a block on its own lines and put the cursor inside `\caption{}`. */
function insertBlock(editor: Editor, body: string[]): void {
	const cursor = editor.getCursor();
	const before = cursor.ch > 0 ? '\n' : '';
	const text = `${before}\`\`\`${BLOCK_LANGUAGE}\n${body.join('\n')}\n\`\`\`\n`;
	editor.replaceSelection(text);
	const captionLine = cursor.line + (before ? 1 : 0) + 2;
	editor.setCursor({ line: captionLine, ch: '\\caption{'.length });
}

/** Command ids are stable API (hotkeys are saved by id): never rename them. */
export function registerCommands(host: CommandsHost): void {
	host.addCommand({
		id: 'insert-block',
		name: t('command.insert'),
		icon: 'square-function',
		editorCallback: (editor) => insertBlock(editor, ALGORITHMIC_SKELETON),
	});
	host.addCommand({
		id: 'insert-block-algorithm2e',
		name: t('command.insertAlgorithm2e'),
		icon: 'square-function',
		editorCallback: (editor) => insertBlock(editor, ALGORITHM2E_SKELETON),
	});
	host.addCommand({
		id: 'copy-latex',
		name: t('command.copyLatex'),
		icon: 'clipboard-copy',
		editorCallback: (editor) => {
			const found = blockAt(editor, editor.getCursor().line, true);
			if (!found) {
				new Notice(t('notice.noBlock'));
				return;
			}
			void copySource(found.source, host.settings);
		},
	});
}
