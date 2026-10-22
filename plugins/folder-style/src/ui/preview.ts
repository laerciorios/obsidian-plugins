import { setIcon } from 'obsidian';
import { CLS } from '../constants';
import { folderCss } from '../css/folder-css';
import { t } from '../i18n';
import { lucideSvg } from '../icons';
import { FolderStyleSheet } from '../style-sheet';
import type { FolderStyle, FolderStyleSettings, FolderStyles } from '../types';

/** Not a possible folder path (":" is not allowed in file names), so no real folder matches. */
const PREVIEW_PATH = 'folder-style:preview';

/**
 * A folder row with two notes inside, built with the file explorer's own classes and styled by
 * the same generated CSS as the real explorer, in a stylesheet of its own.
 */
export class FolderPreview {
	private readonly sheet = new FolderStyleSheet();

	constructor(
		parent: HTMLElement,
		name: string,
		private readonly settings: () => FolderStyleSettings,
	) {
		const container = parent.createDiv({ cls: ['nav-files-container', CLS.modalPreview] });
		const folder = container.createDiv({ cls: 'tree-item nav-folder' });
		const title = folder.createDiv({
			cls: 'tree-item-self nav-folder-title is-clickable mod-collapsible',
			attr: { 'data-path': PREVIEW_PATH },
		});
		setIcon(title.createDiv({ cls: 'tree-item-icon collapse-icon' }), 'right-triangle');
		title.createDiv({ cls: 'tree-item-inner nav-folder-title-content', text: name });
		const children = folder.createDiv({ cls: 'tree-item-children nav-folder-children' });
		for (const note of [t('modal.preview.note'), t('modal.preview.other')]) {
			const fileTitle = children.createDiv({ cls: 'tree-item nav-file' }).createDiv({ cls: 'tree-item-self nav-file-title' });
			fileTitle.createDiv({ cls: 'tree-item-inner nav-file-title-content', text: note });
		}
		this.sheet.attach(parent.doc);
	}

	show(style: FolderStyle | null): void {
		const folders: FolderStyles = style ? { [PREVIEW_PATH]: style } : {};
		this.sheet.update(folderCss({ ...this.settings(), folders }, lucideSvg).css);
	}

	remove(): void {
		this.sheet.remove();
	}
}
