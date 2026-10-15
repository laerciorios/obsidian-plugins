import { Modal, Notice, Setting } from 'obsidian';
import type { App } from 'obsidian';
import type { PluginHost } from '../host';
import { t } from '../i18n';
import { SCALES } from '../settings';
import type { ImageExportChoices } from '../settings';
import { browserMeasurer, drawSvg, svgToPng } from './image';
import { safeFileName, selectionIds } from './plan';
import { inlineResources } from './resources';
import { saveFile } from './save';
import type { CanvasSource } from './source';

/** Export a canvas (or its selection) as an SVG or PNG file. */
export async function exportImage(host: PluginHost, source: CanvasSource, choices: ImageExportChoices): Promise<void> {
	const progress = new Notice(t('notice.exporting'), 0);
	try {
		const { app } = host;
		const only = choices.scope === 'selection' && source.selection.length > 0 ? selectionIds(source.data, source.selection) : undefined;
		const resources = await inlineResources(app, source.data, source.file.path);
		const drawing = drawSvg(source.data, {
			theme: choices.theme,
			background: choices.background,
			only,
			resources,
			measure: browserMeasurer(),
			title: source.file.basename,
		});
		const name = safeFileName(source.file.basename);
		let saved;
		if (choices.format === 'svg') {
			saved = await saveFile(app, source.file, host.settings.exportFolder, name, 'svg', `<?xml version="1.0" encoding="UTF-8"?>\n${drawing.svg}\n`);
		} else {
			const png = await svgToPng(drawing.svg, drawing.width, drawing.height, choices.scale);
			if (png.scale < choices.scale) new Notice(t('notice.scaleReduced', { scale: Math.floor(png.scale * 100) / 100 }));
			saved = await saveFile(app, source.file, host.settings.exportFolder, name, 'png', png.data);
		}
		progress.hide();
		if (saved) new Notice(t('notice.exported', { location: saved.location }));
	} catch (error) {
		progress.hide();
		console.error('Canvas Shapes: export failed', error);
		new Notice(t('notice.exportFailed', { error: error instanceof Error ? error.message : String(error) }));
	}
}

/** Format, scope, theme, background and scale; remembers the last choices. */
export class ImageExportModal extends Modal {
	private readonly choices: ImageExportChoices;

	constructor(
		app: App,
		private readonly host: PluginHost,
		private readonly source: CanvasSource,
	) {
		super(app);
		this.choices = { ...host.settings.image };
		if (source.selection.length === 0) this.choices.scope = 'canvas';
	}

	onOpen(): void {
		this.setTitle(t('export.image.title'));
		this.render();
	}

	private render(): void {
		const { contentEl, choices } = this;
		contentEl.empty();
		new Setting(contentEl).setName(t('export.format')).addDropdown((dropdown) =>
			dropdown
				.addOptions({ png: t('export.format.png'), svg: t('export.format.svg') })
				.setValue(choices.format)
				.onChange((value) => {
					choices.format = value === 'svg' ? 'svg' : 'png';
					this.render();
				}),
		);
		const hasSelection = this.source.selection.length > 0;
		new Setting(contentEl)
			.setName(t('export.scope'))
			.setDesc(hasSelection ? '' : t('export.scope.noSelection'))
			.addDropdown((dropdown) =>
				dropdown
					.addOptions({ canvas: t('export.scope.canvas'), selection: t('export.scope.selection') })
					.setValue(choices.scope)
					.setDisabled(!hasSelection)
					.onChange((value) => (choices.scope = value === 'selection' ? 'selection' : 'canvas')),
			);
		new Setting(contentEl).setName(t('export.theme')).addDropdown((dropdown) =>
			dropdown
				.addOptions({ light: t('export.theme.light'), dark: t('export.theme.dark') })
				.setValue(choices.theme)
				.onChange((value) => (choices.theme = value === 'dark' ? 'dark' : 'light')),
		);
		new Setting(contentEl).setName(t('export.background')).addDropdown((dropdown) =>
			dropdown
				.addOptions({ solid: t('export.background.solid'), transparent: t('export.background.transparent') })
				.setValue(choices.background)
				.onChange((value) => (choices.background = value === 'transparent' ? 'transparent' : 'solid')),
		);
		if (choices.format === 'png') {
			new Setting(contentEl)
				.setName(t('export.scale'))
				.setDesc(t('export.scale.desc'))
				.addDropdown((dropdown) =>
					dropdown
						.addOptions(Object.fromEntries(SCALES.map((scale) => [String(scale), t('export.scale.option', { scale })])))
						.setValue(String(choices.scale))
						.onChange((value) => (choices.scale = Number(value))),
				);
		}
		new Setting(contentEl)
			.addButton((button) => button.setButtonText(t('export.cancel')).onClick(() => this.close()))
			.addButton((button) =>
				button
					.setButtonText(t('export.confirm'))
					.setCta()
					.onClick(() => void this.confirm()),
			);
	}

	private async confirm(): Promise<void> {
		this.host.settings.image = { ...this.choices };
		await this.host.saveSettings();
		this.close();
		await exportImage(this.host, this.source, this.choices);
	}
}
