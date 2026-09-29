import { Modal, Notice, Setting } from 'obsidian';
import type { App, TFile } from 'obsidian';
import { describePatternError } from '../archive/describe';
import { t } from '../i18n';
import type { ProjectInfo } from '../patterns/pattern';
import { FolderSuggest } from './folder-suggest';
import { createCard, planNewCard } from './new-card';
import type { NewCardInput, NewCardPlan } from './new-card';

export interface NewCardModalOptions {
	/** Everything but what the user types. */
	base: Omit<NewCardInput, 'title' | 'project' | 'folder'>;
	columnLabel: string;
	/** Empty when the profile has no project property. */
	projects: ProjectInfo[];
	preselected: ProjectInfo | null;
	onCreated(file: TFile): void;
}

const NO_PROJECT = '';

/** "+ Add card": asks the title (and project), previews the path, creates the note. */
export class NewCardModal extends Modal {
	private title = '';
	private projectPath: string;
	private folder = '';
	private previewEl!: HTMLElement;
	private folderSetting: Setting | null = null;
	private createButton: HTMLButtonElement | null = null;
	private busy = false;

	constructor(
		app: App,
		private readonly options: NewCardModalOptions,
	) {
		super(app);
		this.projectPath = options.preselected?.path ?? NO_PROJECT;
	}

	private get project(): ProjectInfo | null {
		return this.options.projects.find((p) => p.path === this.projectPath) ?? null;
	}

	private input(): NewCardInput {
		return { ...this.options.base, title: this.title, project: this.project, folder: this.folder };
	}

	onOpen(): void {
		this.setTitle(t('newCard.title', { column: this.options.columnLabel }));
		const { contentEl } = this;

		new Setting(contentEl).setName(t('newCard.cardTitle')).addText((text) => {
			text.setPlaceholder(t('newCard.cardTitlePlaceholder')).onChange((value) => {
				this.title = value;
				this.refresh();
			});
			text.inputEl.addEventListener('keydown', (evt) => {
				if (evt.key === 'Enter' && !evt.isComposing) {
					evt.preventDefault();
					void this.submit();
				}
			});
			window.setTimeout(() => text.inputEl.focus(), 0);
		});

		if (this.options.base.keys.project) {
			new Setting(contentEl).setName(t('newCard.project')).addDropdown((dropdown) => {
				dropdown.addOption(NO_PROJECT, t('newCard.noProject'));
				for (const project of this.options.projects) dropdown.addOption(project.path, project.name);
				dropdown.setValue(this.projectPath).onChange((value) => {
					this.projectPath = value;
					this.refresh();
				});
			});
		}

		this.folderSetting = new Setting(contentEl)
			.setName(t('newCard.folder'))
			.setDesc(t('newCard.folderDesc'))
			.addText((text) => {
				text.setPlaceholder(t('newCard.folderPlaceholder')).onChange((value) => {
					this.folder = value;
					this.refresh();
				});
				new FolderSuggest(this.app, text.inputEl, (path) => {
					this.folder = path;
					this.refresh();
				});
			});

		this.previewEl = contentEl.createDiv({ cls: 'bb-new-card-preview' });

		new Setting(contentEl)
			.addButton((button) => button.setButtonText(t('newCard.cancel')).onClick(() => this.close()))
			.addButton((button) => {
				button.setButtonText(t('newCard.create')).setCta().onClick(() => void this.submit());
				this.createButton = button.buttonEl;
			});

		this.refresh();
	}

	private describe(plan: NewCardPlan): string {
		if (plan.ok) return t('newCard.willCreate', { path: `${plan.folder ? `${plan.folder}/` : ''}${plan.fileName}.md` });
		switch (plan.reason) {
			case 'noTitle':
				return t('newCard.needTitle');
			case 'askFolder':
				return t('newCard.needFolder');
			case 'unresolved':
				return t('skip.unresolved', { token: `{${plan.token}}` });
			case 'pattern':
				return t('newCard.invalidPattern', { error: describePatternError(plan.error) });
		}
	}

	private refresh(): void {
		const needsFolder = !this.project && !this.options.base.profile.newCard.fallbackFolder;
		this.folderSetting?.settingEl.toggle(needsFolder);
		const plan = planNewCard(this.input());
		this.previewEl.setText(this.describe(plan));
		this.previewEl.toggleClass('bb-new-card-preview-error', !plan.ok && plan.reason !== 'noTitle');
		if (this.createButton) this.createButton.disabled = !plan.ok || this.busy;
	}

	private async submit(): Promise<void> {
		if (this.busy || !planNewCard(this.input()).ok) return;
		this.busy = true;
		this.refresh();
		try {
			const file = await createCard(this.app, this.input());
			this.close();
			this.options.onCreated(file);
		} catch (error) {
			console.error('Bases Board: could not create card', error);
			new Notice(t('notice.createFailed', { message: error instanceof Error ? error.message : String(error) }));
			this.busy = false;
			this.refresh();
		}
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
