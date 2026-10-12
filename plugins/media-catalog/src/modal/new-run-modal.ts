import { ButtonComponent, Modal } from 'obsidian';
import type { App, Setting, TextComponent } from 'obsidian';
import { isIsoDate } from '../catalog/dates';
import { historyLine } from '../catalog/history';
import type { Run } from '../catalog/history';
import type { NewRunChoice } from '../catalog/runs';
import { CLS } from '../constants';
import { t } from '../i18n';
import type { MediaKind } from '../types';
import { textRow } from '../ui/form';
import { modEnterLabel, renderInstructions } from '../ui/instructions';
import { PLATFORM_DESC } from './confirm-values';

export interface NewRunPrompt {
	title: string;
	kind: MediaKind;
	/** The current run, shown as the line it leaves in the history. */
	run: Run;
	/** The history already has a line for this run: nothing is added there. */
	listed: boolean;
	defaults: NewRunChoice;
}

/**
 * "New run": start date (required) and platform, below the line the current
 * run leaves in the history. Answers the choice, or null when cancelled.
 */
class NewRunModal extends Modal {
	private readonly values: NewRunChoice;
	private answered = false;
	/** The start date showed its message: it is checked again on every edit. */
	private invalid = false;
	private started: { setting: Setting; control: TextComponent } | null = null;

	constructor(
		app: App,
		private readonly prompt: NewRunPrompt,
		private readonly resolve: (choice: NewRunChoice | null) => void,
	) {
		super(app);
		this.values = { ...prompt.defaults };
		// Always swallowed: Mod+Enter is also the default hotkey of "Toggle checkbox status".
		this.scope.register(['Mod'], 'Enter', () => {
			this.submit();
			return false;
		});
	}

	onOpen(): void {
		const { contentEl, prompt } = this;
		this.modalEl.addClass(CLS.newRun);
		this.setTitle(t('newRun.title'));
		contentEl.createEl('p', { text: t('newRun.desc', { title: prompt.title }) });

		const history = contentEl.createDiv({ cls: CLS.historyLine });
		history.createDiv({ cls: 'setting-item-name', text: t('newRun.history') });
		if (prompt.listed) history.createDiv({ cls: CLS.hint, text: t('newRun.listed') });
		else history.createEl('code', { text: historyLine(prompt.run) });

		const form = contentEl.createDiv({ cls: CLS.form });
		this.started = textRow(form, {
			name: t('field.started.name'),
			desc: t('newRun.started.desc'),
			type: 'date',
			value: this.values.started,
			onChange: (value) => {
				this.values.started = value.trim();
				if (this.invalid) this.check();
			},
		});
		this.started.control.inputEl.addEventListener('change', () => this.check());
		textRow(form, {
			name: t('field.platform.name'),
			desc: t(PLATFORM_DESC[prompt.kind]),
			value: this.values.platform,
			onChange: (value) => {
				this.values.platform = value;
			},
		});

		const actions = contentEl.createDiv({ cls: ['modal-button-container', CLS.actions] });
		new ButtonComponent(actions).setButtonText(t('modal.cancel')).onClick(() => this.close());
		new ButtonComponent(actions)
			.setButtonText(t('newRun.submit'))
			.setCta()
			.onClick(() => this.submit());
		renderInstructions(contentEl, [
			{ command: modEnterLabel(), purpose: t('modal.instructions.submit') },
			{ command: 'esc', purpose: t('modal.instructions.close') },
		]);
	}

	open(): void {
		super.open();
		this.started?.control.inputEl.focus();
	}

	onClose(): void {
		this.contentEl.empty();
		this.settle(null);
	}

	/** Shows or clears the message of the start date. */
	private check(): boolean {
		const row = this.started;
		if (!row) return false;
		const valid = isIsoDate(this.values.started) && !row.control.inputEl.validity.badInput;
		row.setting.setErrorMessage(valid ? null : t('validation.dateRequired'));
		this.invalid = !valid;
		return valid;
	}

	private submit(): void {
		if (!this.check()) {
			this.started?.control.inputEl.focus();
			return;
		}
		this.settle({ started: this.values.started, platform: this.values.platform.trim() });
		this.close();
	}

	/** Resolves exactly once, whatever comes first (a button, Mod+Enter, Esc). */
	private settle(choice: NewRunChoice | null): void {
		if (this.answered) return;
		this.answered = true;
		this.resolve(choice);
	}
}

/** Resolves the start date and platform of the new run, or null when cancelled or closed. */
export function askNewRun(app: App, prompt: NewRunPrompt): Promise<NewRunChoice | null> {
	return new Promise((resolve) => new NewRunModal(app, prompt, resolve).open());
}
