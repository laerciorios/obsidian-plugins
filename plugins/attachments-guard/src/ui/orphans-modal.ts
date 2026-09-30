import { ButtonComponent, Modal, Setting } from 'obsidian';
import type { App, TFile } from 'obsidian';
import { CLS, IMAGE_EXTENSIONS } from '../constants';
import { formatSize } from '../format';
import { t } from '../i18n';
import { parentPath } from '../vault/files';

/** Orphan attachments with a checkbox each; resolves with the ones to move to `.trash/`. */
export class OrphansModal extends Modal {
	private readonly selected: Set<TFile>;
	private readonly checkboxes = new Map<TFile, HTMLInputElement>();
	private confirmButton: ButtonComponent | null = null;
	private resolve: (files: TFile[]) => void = () => {};
	private confirmed = false;

	constructor(
		app: App,
		private readonly files: TFile[],
	) {
		super(app);
		this.selected = new Set(files);
	}

	choose(): Promise<TFile[]> {
		return new Promise((resolve) => {
			this.resolve = resolve;
			this.open();
		});
	}

	onOpen(): void {
		const { contentEl, files } = this;
		this.setTitle(t('modal.orphans.title'));
		const size = formatSize(files.reduce((total, file) => total + file.stat.size, 0));
		contentEl.createEl('p', {
			text: t(files.length === 1 ? 'modal.orphans.message.one' : 'modal.orphans.message.other', { count: files.length, size }),
		});

		const toolbar = contentEl.createDiv({ cls: CLS.toolbar });
		new ButtonComponent(toolbar).setButtonText(t('modal.orphans.all')).onClick(() => this.selectAll(true));
		new ButtonComponent(toolbar).setButtonText(t('modal.orphans.none')).onClick(() => this.selectAll(false));

		const list = contentEl.createEl('ul', { cls: CLS.orphans });
		for (const file of files) this.renderRow(list, file);

		new Setting(contentEl)
			.addButton((button) => button.setButtonText(t('modal.cancel')).onClick(() => this.close()))
			.addButton((button) => {
				this.confirmButton = button;
				button.setCta().onClick(() => {
					this.confirmed = true;
					this.close();
				});
			});
		this.refresh();
	}

	onClose(): void {
		this.contentEl.empty();
		this.resolve(this.confirmed ? this.files.filter((file) => this.selected.has(file)) : []);
	}

	private renderRow(list: HTMLElement, file: TFile): void {
		const row = list.createEl('li', { cls: CLS.orphan });
		const label = row.createEl('label');
		const checkbox = label.createEl('input', {
			type: 'checkbox',
			attr: { 'aria-label': t('modal.orphans.select', { name: file.name }) },
		});
		checkbox.checked = true;
		checkbox.addEventListener('change', () => {
			if (checkbox.checked) this.selected.add(file);
			else this.selected.delete(file);
			this.refresh();
		});
		this.checkboxes.set(file, checkbox);

		if (IMAGE_EXTENSIONS.has(file.extension.toLowerCase())) {
			label.createEl('img', { cls: CLS.thumb, attr: { src: this.app.vault.getResourcePath(file), alt: '', loading: 'lazy' } });
		} else {
			label.createDiv({ cls: CLS.thumbEmpty, text: file.extension.toUpperCase() });
		}

		// Inside the label: clicking the name or the thumbnail toggles the checkbox.
		const text = label.createDiv();
		text.createDiv({ cls: CLS.orphanName, text: file.name });
		text.createDiv({ cls: CLS.orphanMeta, text: `${parentPath(file.path) || '/'} · ${formatSize(file.stat.size)}` });
	}

	private selectAll(checked: boolean): void {
		for (const [file, checkbox] of this.checkboxes) {
			checkbox.checked = checked;
			if (checked) this.selected.add(file);
			else this.selected.delete(file);
		}
		this.refresh();
	}

	private refresh(): void {
		const count = this.selected.size;
		this.confirmButton?.setButtonText(t('modal.orphans.confirm', { count })).setDisabled(count === 0);
	}
}
