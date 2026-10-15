import type { Plugin } from 'obsidian';
import type { ShapesController } from './canvas/controller';
import type { CanvasSession } from './canvas/session';
import { activeCanvasFile, openImageExport, startWebExport } from './export/entry';
import type { PluginHost } from './host';
import { t } from './i18n';
import { LINE_OPTIONS, SHAPE_OPTIONS, WIDTH_OPTIONS } from './options';

/**
 * Commands that edit the selection of the active canvas. Ids are stable API (hotkeys are saved
 * by id): never rename them. They only show up when the active canvas has a session and the
 * selection has something they apply to.
 */
export function registerEditCommands(plugin: Plugin, controller: ShapesController): void {
	const withSelection = (kind: 'nodes' | 'edges', run: (session: CanvasSession) => void) => (checking: boolean) => {
		const session = controller.activeSession();
		if (!session || session.canvas.readonly || session.editor.selected()[kind].length === 0) return false;
		if (!checking) run(session);
		return true;
	};

	for (const shape of SHAPE_OPTIONS) {
		plugin.addCommand({
			id: `shape-${shape}`,
			name: t(`command.shape.${shape}`),
			checkCallback: withSelection('nodes', (session) => {
				session.edit((editor) => editor.setShape(editor.selected().nodes, shape));
			}),
		});
	}
	for (const line of LINE_OPTIONS) {
		plugin.addCommand({
			id: `line-${line}`,
			name: t(`command.line.${line}`),
			checkCallback: withSelection('edges', (session) => {
				session.edit((editor) => editor.setLineStyle(editor.selected().edges, line));
			}),
		});
	}
	for (const { name, width } of WIDTH_OPTIONS) {
		plugin.addCommand({
			id: `line-width-${name}`,
			name: t(`command.width.${name}`),
			checkCallback: withSelection('edges', (session) => {
				session.edit((editor) => editor.setLineWidth(editor.selected().edges, width));
			}),
		});
	}
}

/** Export commands: available on any canvas tab, even when the toolbar is off. */
export function registerExportCommands(plugin: Plugin, host: PluginHost): void {
	plugin.addCommand({
		id: 'export-image',
		name: t('command.exportImage'),
		icon: 'image-down',
		checkCallback: (checking) => {
			const file = activeCanvasFile(host);
			if (!file) return false;
			if (!checking) void openImageExport(host, file);
			return true;
		},
	});
	plugin.addCommand({
		id: 'export-web',
		name: t('command.exportWeb'),
		icon: 'globe',
		checkCallback: (checking) => {
			const file = activeCanvasFile(host);
			if (!file) return false;
			if (!checking) void startWebExport(host, file);
			return true;
		},
	});
}
