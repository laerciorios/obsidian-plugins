import { Modal, Setting } from 'obsidian';
import type { App, ButtonComponent, TextComponent } from 'obsidian';
import { CLS, INDEX_NAME } from '../constants';
import { describeFolders } from '../format';
import { t } from '../i18n';
import { isTitleCase, titleCase } from '../naming/case';
import type { VaultRules } from '../types';
import type { ParentOption } from '../vault/areas';
import { nameError } from './name-field';

export interface NewAreaRequest {
	parent: string;
	name: string;
}

/** Name and parent of a new area or topic. Resolves null when cancelled. */
export class NewAreaModal extends Modal {
	private parent: string;
	private name = '';
	private input: TextComponent | null = null;
	private hintEl: HTMLElement | null = null;
	private createButton: ButtonComponent | null = null;
	private resolve: (request: NewAreaRequest | null) => void = () => {};
	private result: NewAreaRequest | null = null;

	constructor(
		app: App,
		private readonly rules: VaultRules,
		private readonly options: ParentOption[],
		initial: string,
	) {
		super(app);
		this.parent = initial;
	}

	choose(): Promise<NewAreaRequest | null> {
		return new Promise((resolve) => {
			this.resolve = resolve;
			this.open();
		});
	}

	onOpen(): void {
		const { contentEl } = this;
		this.setTitle(t('newArea.title'));

		new Setting(contentEl).setName(t('newArea.name')).addText((text) => {
			this.input = text;
			text.setPlaceholder(t('newArea.name.placeholder')).onChange((value) => {
				this.name = value;
				this.refresh();
			});
			text.inputEl.addEventListener('keydown', (event) => {
				if (event.key === 'Enter' && !event.isComposing) {
					event.preventDefault();
					this.submit();
				}
			});
		});
		this.hintEl = contentEl.createDiv({ cls: CLS.hint });

		new Setting(contentEl).setName(t('newArea.parent')).addDropdown((dropdown) => {
			for (const option of this.options) {
				const key = option.level === 0 ? 'newArea.parent.area' : 'newArea.parent.topic';
				dropdown.addOption(option.path, t(key, { path: option.path }));
			}
			dropdown.setValue(this.parent).onChange((value) => {
				this.parent = value;
				this.refresh();
			});
		});

		const scaffold = describeFolders(this.rules.scaffold);
		contentEl.createEl('p', {
			cls: CLS.desc,
			text: scaffold
				? t('newArea.desc', { index: INDEX_NAME, scaffold })
				: t('newArea.desc.empty', { index: INDEX_NAME }),
		});

		new Setting(contentEl)
			.addButton((button) => button.setButtonText(t('modal.cancel')).onClick(() => this.close()))
			.addButton((button) => {
				this.createButton = button;
				button
					.setButtonText(t('newArea.create'))
					.setCta()
					.onClick(() => this.submit());
			});
		this.refresh();
		this.input?.inputEl.focus();
	}

	onClose(): void {
		this.contentEl.empty();
		this.resolve(this.result);
	}

	private error(): string | null {
		return nameError(this.name, this.app.vault.getFolderByPath(this.parent));
	}

	/** Errors only after typing; the Title Case hint is advice, not a block (proper names). */
	private refresh(): void {
		const hint = this.hintEl;
		if (!hint) return;
		hint.empty();
		const error = this.name ? this.error() : null;
		this.createButton?.setDisabled(!this.name.trim() || error !== null);
		if (error) {
			hint.createSpan({ cls: CLS.warning, text: error });
			return;
		}
		const minorWords = new Set(this.rules.minorWords);
		const name = this.name.trim();
		if (!name || isTitleCase(name, minorWords)) return;
		const suggestion = titleCase(name, minorWords);
		hint.createSpan({ text: t('newArea.titleCase', { name: suggestion }) });
		const use = hint.createEl('button', { text: t('newArea.useSuggestion') });
		use.addEventListener('click', () => {
			this.input?.setValue(suggestion);
			this.name = suggestion;
			this.refresh();
			this.input?.inputEl.focus();
		});
	}

	private submit(): void {
		if (this.error()) {
			this.refresh();
			return;
		}
		this.result = { parent: this.parent, name: this.name.trim() };
		this.close();
	}
}
