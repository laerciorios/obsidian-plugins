import { Modal, Notice, Setting, TFile, normalizePath } from 'obsidian';
import type { App, ButtonComponent } from 'obsidian';
import { exportConfig } from '../config/io';
import type { GraphKitConfig } from '../config/types';
import { t } from '../i18n';
import { suggestJsonFiles } from './suggest';

const DEFAULT_PATH = 'graph-kit-config.json';

/** The config as JSON: copy it, or save it as a file in the vault ("Overwrite" and a warning when it exists). */
export class ExportModal extends Modal {
	private path = DEFAULT_PATH;
	private saveButton: ButtonComponent | null = null;
	private messageEl: HTMLElement | null = null;

	constructor(
		app: App,
		private readonly config: GraphKitConfig,
	) {
		super(app);
	}

	onOpen(): void {
		this.setTitle(t('export.title'));
		this.modalEl.addClass('gk-io-modal');
		const json = exportConfig(this.config);
		const { contentEl } = this;

		const area = contentEl.createEl('textarea', { cls: 'gk-json', attr: { readonly: 'true', spellcheck: 'false', rows: '14' } });
		area.value = json;
		new Setting(contentEl).addButton((button) =>
			button.setButtonText(t('export.copy')).onClick(async () => {
				await navigator.clipboard.writeText(json);
				new Notice(t('export.copied'));
			}),
		);

		new Setting(contentEl)
			.setName(t('export.path.name'))
			.setDesc(t('export.path.desc'))
			.addText((text) => {
				text.setPlaceholder(DEFAULT_PATH).setValue(this.path).onChange((value) => {
					this.path = value.trim();
					this.refresh();
				});
				suggestJsonFiles(this.app, text.inputEl);
			})
			.addButton((button) => {
				this.saveButton = button;
				button.setCta().onClick(() => void this.save(json));
			});
		this.messageEl = contentEl.createDiv({ cls: 'gk-warning' });
		this.refresh();
	}

	onClose(): void {
		this.contentEl.empty();
	}

	private target(): string {
		return normalizePath(this.path || DEFAULT_PATH);
	}

	private refresh(): void {
		const exists = this.app.vault.getAbstractFileByPath(this.target()) !== null;
		this.saveButton?.setButtonText(exists ? t('export.overwrite') : t('export.save'));
		this.messageEl?.setText(exists ? t('export.exists') : '');
	}

	private async save(json: string): Promise<void> {
		const path = this.target();
		const existing = this.app.vault.getAbstractFileByPath(path);
		try {
			if (existing instanceof TFile) await this.app.vault.process(existing, () => json);
			else if (existing) throw new Error(path);
			else await this.app.vault.create(path, json);
			new Notice(t('export.saved', { path }));
			this.close();
		} catch (error) {
			new Notice(t('export.failed', { error: error instanceof Error ? error.message : String(error) }));
		}
	}
}
