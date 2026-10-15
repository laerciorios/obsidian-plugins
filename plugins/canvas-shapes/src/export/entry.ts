import { Notice, TFile, TextFileView } from 'obsidian';
import type { Menu, TAbstractFile } from 'obsidian';
import { CANVAS_VIEW } from '../canvas/controller';
import type { PluginHost } from '../host';
import { t } from '../i18n';
import { ImageExportModal } from './image-export';
import { canvasViewOf, readCanvas } from './source';
import { exportWeb } from './web-export';

/** The canvas file of the active tab, if it is a canvas. */
export function activeCanvasFile(host: PluginHost): TFile | null {
	const view = host.app.workspace.getActiveViewOfType(TextFileView);
	return view && view.getViewType() === CANVAS_VIEW && view.file ? view.file : null;
}

export async function openImageExport(host: PluginHost, file: TFile): Promise<void> {
	try {
		const source = await readCanvas(host.app, host.shapes, file, canvasViewOf(host.app, file));
		new ImageExportModal(host.app, host, source).open();
	} catch (error) {
		new Notice(t('notice.exportFailed', { error: error instanceof Error ? error.message : String(error) }));
	}
}

export async function startWebExport(host: PluginHost, file: TFile): Promise<void> {
	try {
		await exportWeb(host, await readCanvas(host.app, host.shapes, file, canvasViewOf(host.app, file)));
	} catch (error) {
		new Notice(t('notice.exportFailed', { error: error instanceof Error ? error.message : String(error) }));
	}
}

/** Items of the file menu of a .canvas (file explorer and the canvas tab's "more options"). */
export function addExportItems(host: PluginHost, menu: Menu, file: TAbstractFile): void {
	if (!(file instanceof TFile) || file.extension !== 'canvas') return;
	menu.addItem((item) =>
		item
			.setTitle(t('menu.exportImage'))
			.setIcon('image-down')
			.setSection('export')
			.onClick(() => void openImageExport(host, file)),
	);
	menu.addItem((item) =>
		item
			.setTitle(t('menu.exportWeb'))
			.setIcon('globe')
			.setSection('export')
			.onClick(() => void startWebExport(host, file)),
	);
}
