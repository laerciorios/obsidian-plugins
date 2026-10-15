import { TextFileView } from 'obsidian';
import type { App, TFile, View } from 'obsidian';
import type { ShapesController } from '../canvas/controller';
import { CANVAS_VIEW } from '../canvas/controller';

/**
 * Where an export reads the canvas from: the live canvas when the plugin is attached to it (so
 * unsaved changes are included), the view's text (public TextFileView API) otherwise, or the
 * file. Never the screen: export works even when the adapter is off.
 */

export interface CanvasSource {
	file: TFile;
	data: unknown;
	/** Ids selected in the open canvas (empty when unknown). */
	selection: string[];
}

export async function readCanvas(app: App, controller: ShapesController, file: TFile, view?: View | null): Promise<CanvasSource> {
	const session = view ? controller.sessionFor(view) : null;
	if (session) {
		const selection = [...session.canvas.selection].map((item) => item.id);
		return { file, data: session.canvas.getData(), selection };
	}
	if (view instanceof TextFileView && view.getViewType() === CANVAS_VIEW && view.file === file) {
		return { file, data: JSON.parse(view.getViewData()) as unknown, selection: [] };
	}
	return { file, data: JSON.parse(await app.vault.read(file)) as unknown, selection: [] };
}

/** The open view of a canvas file, if any (the active one first). */
export function canvasViewOf(app: App, file: TFile): View | null {
	const active = app.workspace.getActiveViewOfType(TextFileView);
	if (active?.file === file && active.getViewType() === CANVAS_VIEW) return active;
	for (const leaf of app.workspace.getLeavesOfType(CANVAS_VIEW)) {
		if (leaf.view instanceof TextFileView && leaf.view.file === file) return leaf.view;
	}
	return null;
}
