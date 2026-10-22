import { Modal, Notice, Setting, normalizePath } from 'obsidian';
import type { App, ButtonComponent } from 'obsidian';
import { parseImport } from '../config/io';
import type { ImportResult } from '../config/io';
import type { GraphKitConfig } from '../config/types';
import { t } from '../i18n';
import { suggestJsonFiles } from './suggest';

/** Paste or load a JSON, see what it holds, then replace the whole config. Invalid JSON changes nothing. */
export class ImportModal extends Modal {
	private area: HTMLTextAreaElement | null = null;
	private summaryEl: HTMLElement | null = null;
	private importButton: ButtonComponent | null = null;
	private result: ImportResult = { ok: false, error: 'empty' };
	private filePath = '';

	constructor(
		app: App,
		private readonly apply: (config: GraphKitConfig) => void,
	) {
		super(app);
	}

	onOpen(): void {
		this.setTitle(t('import.title'));
		this.modalEl.addClass('gk-io-modal');
		const { contentEl } = this;

		new Setting(contentEl)
			.setName(t('import.file.name'))
			.setDesc(t('import.file.desc'))
			.addText((text) => {
				text.setPlaceholder('graph-kit-config.json').onChange((value) => (this.filePath = value.trim()));
				suggestJsonFiles(this.app, text.inputEl, (value) => (this.filePath = value));
			})
			.addButton((button) => button.setButtonText(t('import.load')).onClick(() => void this.load()));

		const area = (this.area = contentEl.createEl('textarea', { cls: 'gk-json', attr: { spellcheck: 'false', rows: '14', placeholder: t('import.paste') } }));
		area.addEventListener('input', () => this.check());
		this.summaryEl = contentEl.createDiv({ cls: 'gk-import-summary' });

		new Setting(contentEl)
			.setDesc(t('import.replace'))
			.addButton((button) => button.setButtonText(t('import.cancel')).onClick(() => this.close()))
			.addButton((button) => {
				this.importButton = button;
				button
					.setButtonText(t('import.apply'))
					.setCta()
					.onClick(() => {
						if (!this.result.ok) return;
						this.apply(this.result.config);
						new Notice(t('import.done'));
						this.close();
					});
			});
		this.check();
	}

	onClose(): void {
		this.contentEl.empty();
	}

	private async load(): Promise<void> {
		const path = normalizePath(this.filePath);
		const file = this.app.vault.getFileByPath(path);
		if (!file || !this.area) {
			new Notice(t('import.notFound', { path }));
			return;
		}
		this.area.value = await this.app.vault.cachedRead(file);
		this.check();
	}

	private check(): void {
		this.result = parseImport(this.area?.value ?? '');
		this.importButton?.setDisabled(!this.result.ok);
		const el = this.summaryEl;
		if (!el) return;
		el.empty();
		if (!this.result.ok) {
			el.createDiv({ cls: this.result.error === 'empty' ? 'setting-item-description' : 'gk-warning', text: t(`import.error.${this.result.error}`) });
			return;
		}
		const { summary, warnings } = this.result;
		const features = summary.featuresOn.map((id) => t(`feature.${id}.name`)).join(', ') || t('import.summary.none');
		el.createDiv({ text: t(summary.enabled ? 'import.summary.on' : 'import.summary.off', { features }) });
		el.createDiv({ text: t('import.summary.rules', { count: summary.rules }) });
		if (warnings.length > 0) el.createDiv({ cls: 'gk-warning', text: t('import.warnings', { paths: warnings.join(', ') }) });
	}
}
