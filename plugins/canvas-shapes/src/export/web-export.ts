import { TFile, Notice } from 'obsidian';
import { viewerPage } from '@obsidian-plugins/json-canvas-render';
import type { FileResource } from '@obsidian-plugins/json-canvas-render';
import type { PluginHost } from '../host';
import { locale, t } from '../i18n';
import { noteLink } from '../settings';
import { browserMeasurer, drawSvg } from './image';
import { imageType, safeFileName } from './plan';
import { makePortable, notesToRead } from './portable';
import { imageSize, vaultFile } from './resources';
import { chooseFolder } from './save';
import type { FolderTarget } from './save';
import type { CanvasSource } from './source';

/** Size of an image file, read through a temporary object URL. */
async function sizeOf(bytes: ArrayBuffer, type: string): Promise<{ width: number; height: number } | null> {
	const url = URL.createObjectURL(new Blob([bytes], { type }));
	try {
		return await imageSize(url);
	} finally {
		URL.revokeObjectURL(url);
	}
}

/**
 * Write the web export of a canvas into `target`: `assets/` with the files it uses,
 * `canvas.json` (portable JSON Canvas) and `index.html` (offline viewer with both themes).
 */
export async function writeWebExport(host: PluginHost, source: CanvasSource, target: FolderTarget): Promise<void> {
	const { app, settings } = host;
	const resolve = (link: string, from: string): string | null => vaultFile(app, link, from)?.path ?? null;
	const texts = new Map<string, string>();
	for (const path of notesToRead(source.data, source.file.path, resolve)) {
		const note = app.vault.getAbstractFileByPath(path);
		if (note instanceof TFile) texts.set(path, await app.vault.cachedRead(note));
	}
	const portable = makePortable(source.data, source.file.path, {
		notes: settings.webNotes,
		noteUrl: (path) => noteLink(settings.webLinkTemplate, app.vault.getName(), path),
		resolve,
		noteText: (path) => texts.get(path) ?? null,
	});

	const resources = new Map<string, FileResource>();
	for (const [vaultPath, assetPath] of portable.assets) {
		const file = app.vault.getAbstractFileByPath(vaultPath);
		if (!(file instanceof TFile)) continue;
		const bytes = await app.vault.readBinary(file);
		await target.write(assetPath, bytes);
		const type = imageType(assetPath);
		const size = type ? await sizeOf(bytes, type) : null;
		resources.set(assetPath, type ? { kind: 'image', href: assetPath, ...(size ?? {}) } : { kind: 'other', href: assetPath });
	}

	const measure = browserMeasurer();
	const title = source.file.basename;
	const draw = (theme: 'light' | 'dark') =>
		drawSvg(portable.canvas, { theme, background: 'transparent', resources, measure, title, idPrefix: `${theme}-` });
	const light = draw('light');
	const dark = draw('dark');
	await target.write('canvas.json', `${JSON.stringify(portable.canvas, null, '\t')}\n`);
	await target.write(
		'index.html',
		viewerPage({
			title,
			lang: locale(),
			light: light.svg,
			dark: dark.svg,
			width: light.width,
			height: light.height,
			theme: settings.webTheme,
			labels: { zoomIn: t('viewer.zoomIn'), zoomOut: t('viewer.zoomOut'), fit: t('viewer.fit'), theme: t('viewer.theme') },
			generator: 'Canvas Shapes for Obsidian',
		}),
	);
}

/** Ask for the destination and export. */
export async function exportWeb(host: PluginHost, source: CanvasSource): Promise<void> {
	let target: FolderTarget | null;
	try {
		target = await chooseFolder(host.app, source.file, host.settings.exportFolder, safeFileName(source.file.basename));
	} catch (error) {
		new Notice(t('notice.exportFailed', { error: error instanceof Error ? error.message : String(error) }));
		return;
	}
	if (!target) return;
	const progress = new Notice(t('notice.exporting'), 0);
	try {
		await writeWebExport(host, source, target);
		progress.hide();
		new Notice(t('notice.exported', { location: target.location }));
	} catch (error) {
		progress.hide();
		console.error('Canvas Shapes: web export failed', error);
		new Notice(t('notice.exportFailed', { error: error instanceof Error ? error.message : String(error) }));
	}
}
