import { Setting } from 'obsidian';
import type { App } from 'obsidian';
import { t } from '../i18n';
import { CONDITION_TYPES } from '../rules/types';
import type { Condition, ConditionType } from '../rules/types';
import { suggestFolders, suggestProperties } from './suggest';

/** A new condition of a type, keeping "not" from the one it replaces. */
export function blankCondition(type: ConditionType, not = false): Condition {
	switch (type) {
		case 'folder':
			return { type, path: '', subfolders: true, not };
		case 'tag':
			return { type, tag: '', nested: true, not };
		case 'filename':
			return { type, value: '', not };
		case 'propertyExists':
			return { type, key: '', not };
		case 'propertyEquals':
			return { type, key: '', value: '', not };
	}
}

/** Required fields filled in (a folder may be empty: the vault root). */
export function isComplete(condition: Condition): boolean {
	switch (condition.type) {
		case 'folder':
			return true;
		case 'tag':
			return condition.tag.trim().replace(/^#/, '') !== '';
		case 'filename':
			return condition.value.trim() !== '';
		case 'propertyExists':
			return condition.key.trim() !== '';
		case 'propertyEquals':
			return condition.key.trim() !== '' && condition.value.trim() !== '';
	}
}

export interface ConditionRowEvents {
	/** A field changed; the row stays as it is. */
	edited(condition: Condition): void;
	/** The type changed: the list re-renders with the new blank condition. */
	replaced(condition: Condition): void;
	removed(): void;
}

/** One condition: type, its fields, "not" and remove. */
export function renderCondition(app: App, parent: HTMLElement, condition: Condition, events: ConditionRowEvents): void {
	const setting = new Setting(parent).setClass('gk-condition');
	setting.addDropdown((dropdown) => {
		for (const type of CONDITION_TYPES) dropdown.addOption(type, t(`condition.${type}`));
		dropdown.setValue(condition.type).onChange((value) => {
			const type = CONDITION_TYPES.find((option) => option === value);
			if (type) events.replaced(blankCondition(type, condition.not));
		});
	});

	const text = (placeholder: string, value: string, set: (value: string) => void, suggest?: (input: HTMLInputElement) => void) =>
		setting.addText((input) => {
			input.setPlaceholder(placeholder).setValue(value).onChange((next) => {
				set(next);
				events.edited(condition);
			});
			suggest?.(input.inputEl);
		});
	const flag = (label: string, value: boolean, set: (value: boolean) => void) => {
		setting.controlEl.createSpan({ cls: 'gk-flag-label', text: label });
		setting.addToggle((toggle) =>
			toggle
				.setTooltip(label)
				.setValue(value)
				.onChange((next) => {
					set(next);
					events.edited(condition);
				}),
		);
	};

	switch (condition.type) {
		case 'folder':
			text(t('modal.condition.path'), condition.path, (value) => (condition.path = value), (input) => suggestFolders(app, input));
			flag(t('modal.condition.subfolders'), condition.subfolders, (value) => (condition.subfolders = value));
			break;
		case 'tag':
			text(t('modal.condition.tag'), condition.tag, (value) => (condition.tag = value));
			flag(t('modal.condition.nested'), condition.nested, (value) => (condition.nested = value));
			break;
		case 'filename':
			text(t('modal.condition.filename'), condition.value, (value) => (condition.value = value));
			break;
		case 'propertyExists':
			text(t('modal.condition.key'), condition.key, (value) => (condition.key = value), (input) => suggestProperties(app, input));
			break;
		case 'propertyEquals':
			text(t('modal.condition.key'), condition.key, (value) => (condition.key = value), (input) => suggestProperties(app, input));
			text(t('modal.condition.value'), condition.value, (value) => (condition.value = value));
			break;
	}

	flag(t('modal.condition.not'), condition.not, (value) => (condition.not = value));
	setting.addExtraButton((button) => button.setIcon('x').setTooltip(t('modal.rule.removeCondition')).onClick(() => events.removed()));
}
