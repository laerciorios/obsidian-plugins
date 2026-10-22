import { Modal, Setting } from 'obsidian';
import type { App, ButtonComponent } from 'obsidian';
import { t } from '../i18n';
import type { Rule } from '../rules/types';
import { blankCondition, isComplete, renderCondition } from './condition-editor';

/** The part of the rule editor that belongs to a feature: its effect. */
export interface EffectEditor<E> {
	/** Draw the effect fields; call `changed` with the new effect on every edit. */
	render(app: App, parent: HTMLElement, effect: E, changed: (effect: E) => void): void;
}

/** New or existing rule: name, on/off, all/any, conditions and the feature's effect. Saves a copy. */
export class RuleModal<E> extends Modal {
	private readonly draft: Rule<E>;
	private conditionsEl: HTMLElement | null = null;
	private errorEl: HTMLElement | null = null;
	private saveButton: ButtonComponent | null = null;

	constructor(
		app: App,
		rule: Rule<E>,
		private readonly isNew: boolean,
		private readonly effectEditor: EffectEditor<E>,
		private readonly save: (rule: Rule<E>) => void,
	) {
		super(app);
		this.draft = structuredClone(rule);
	}

	onOpen(): void {
		this.setTitle(t(this.isNew ? 'modal.rule.titleNew' : 'modal.rule.titleEdit'));
		this.modalEl.addClass('gk-rule-modal');
		const { contentEl } = this;

		new Setting(contentEl)
			.setName(t('modal.rule.name.name'))
			.setDesc(t('modal.rule.name.desc'))
			.addText((text) => text.setValue(this.draft.name).onChange((value) => (this.draft.name = value.trim())));
		new Setting(contentEl)
			.setName(t('modal.rule.enabled.name'))
			.setDesc(t('modal.rule.enabled.desc'))
			.addToggle((toggle) => toggle.setValue(this.draft.enabled).onChange((value) => (this.draft.enabled = value)));
		new Setting(contentEl).setName(t('modal.rule.match.name')).addDropdown((dropdown) =>
			dropdown
				.addOptions({ all: t('modal.rule.match.all'), any: t('modal.rule.match.any') })
				.setValue(this.draft.match)
				.onChange((value) => (this.draft.match = value === 'any' ? 'any' : 'all')),
		);

		new Setting(contentEl)
			.setName(t('modal.rule.conditions'))
			.setHeading()
			.addExtraButton((button) =>
				button
					.setIcon('plus')
					.setTooltip(t('modal.rule.addCondition'))
					.onClick(() => {
						this.draft.conditions.push(blankCondition('filename'));
						this.renderConditions();
					}),
			);
		this.conditionsEl = contentEl.createDiv({ cls: 'gk-conditions' });
		this.renderConditions();

		new Setting(contentEl).setName(t('modal.rule.effect')).setHeading();
		this.effectEditor.render(this.app, contentEl.createDiv(), this.draft.effect, (effect) => (this.draft.effect = effect));

		this.errorEl = contentEl.createDiv({ cls: 'gk-warning' });
		new Setting(contentEl)
			.addButton((button) => button.setButtonText(t('modal.rule.cancel')).onClick(() => this.close()))
			.addButton((button) => {
				this.saveButton = button;
				button
					.setButtonText(t('modal.rule.save'))
					.setCta()
					.onClick(() => {
						if (!this.valid()) return;
						this.save(this.draft);
						this.close();
					});
			});
		this.validate();
	}

	onClose(): void {
		this.contentEl.empty();
	}

	private renderConditions(): void {
		const parent = this.conditionsEl;
		if (!parent) return;
		parent.empty();
		if (this.draft.conditions.length === 0) parent.createDiv({ cls: 'setting-item-description', text: t('modal.rule.conditions.empty') });
		this.draft.conditions.forEach((condition, index) => {
			renderCondition(this.app, parent, condition, {
				edited: () => this.validate(),
				replaced: (next) => {
					this.draft.conditions[index] = next;
					this.renderConditions();
				},
				removed: () => {
					this.draft.conditions.splice(index, 1);
					this.renderConditions();
				},
			});
		});
		this.validate();
	}

	private valid(): boolean {
		return this.draft.conditions.every(isComplete);
	}

	private validate(): void {
		const ok = this.valid();
		this.errorEl?.setText(ok ? '' : t('modal.rule.invalid'));
		this.saveButton?.setDisabled(!ok);
	}
}
