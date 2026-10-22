import { Modal, Setting } from 'obsidian';
import type { App, ButtonComponent } from 'obsidian';
import { t } from '../../i18n';
import { colorSetting } from '../../ui/color-setting';
import { suggestProperties } from '../../ui/suggest';
import { LINE_STYLES } from './config';
import type { LineStyle, LinkType } from './config';

/** New or existing link type: where links come from, color, line style, shown or hidden. */
export class LinkTypeModal extends Modal {
	private readonly draft: LinkType;
	private keySetting: Setting | null = null;
	private saveButton: ButtonComponent | null = null;

	constructor(
		app: App,
		type: LinkType,
		private readonly isNew: boolean,
		private readonly taken: (draft: LinkType) => boolean,
		private readonly save: (type: LinkType) => void,
	) {
		super(app);
		this.draft = structuredClone(type);
	}

	onOpen(): void {
		this.setTitle(t(this.isNew ? 'linkTypes.modal.titleNew' : 'linkTypes.modal.titleEdit'));
		const { contentEl } = this;
		let key = this.draft.source.kind === 'property' ? this.draft.source.key : '';

		new Setting(contentEl).setName(t('linkTypes.modal.source.name')).addDropdown((dropdown) =>
			dropdown
				.addOptions({ property: t('linkTypes.modal.source.property'), body: t('linkTypes.modal.source.body') })
				.setValue(this.draft.source.kind)
				.onChange((value) => {
					this.draft.source = value === 'body' ? { kind: 'body' } : { kind: 'property', key };
					this.refresh();
				}),
		);
		this.keySetting = new Setting(contentEl)
			.setName(t('linkTypes.modal.key.name'))
			.setDesc(t('linkTypes.modal.key.desc'))
			.addText((text) => {
				text.setPlaceholder(t('linkTypes.modal.key.placeholder')).setValue(key).onChange((value) => {
					key = value.trim();
					if (this.draft.source.kind === 'property') this.draft.source = { kind: 'property', key };
					this.refresh();
				});
				suggestProperties(this.app, text.inputEl);
			});
		colorSetting(contentEl, t('linkTypes.modal.color'), this.draft.color, (color) => (this.draft.color = color));
		new Setting(contentEl).setName(t('linkTypes.modal.style')).addDropdown((dropdown) => {
			for (const style of LINE_STYLES) dropdown.addOption(style, t(`linkTypes.style.${style}`));
			dropdown.setValue(this.draft.style).onChange((value) => {
				this.draft.style = LINE_STYLES.find((style): style is LineStyle => style === value) ?? 'solid';
			});
		});
		new Setting(contentEl)
			.setName(t('linkTypes.modal.visible.name'))
			.setDesc(t('linkTypes.modal.visible.desc'))
			.addToggle((toggle) => toggle.setValue(this.draft.visible).onChange((value) => (this.draft.visible = value)));
		new Setting(contentEl)
			.addButton((button) => button.setButtonText(t('modal.rule.cancel')).onClick(() => this.close()))
			.addButton((button) => {
				this.saveButton = button;
				button
					.setButtonText(t('modal.rule.save'))
					.setCta()
					.onClick(() => {
						this.save(this.draft);
						this.close();
					});
			});
		this.refresh();
	}

	onClose(): void {
		this.contentEl.empty();
	}

	private refresh(): void {
		const property = this.draft.source.kind === 'property';
		this.keySetting?.settingEl.toggle(property);
		const valid = (!property || (this.draft.source.kind === 'property' && this.draft.source.key !== '')) && !this.taken(this.draft);
		this.saveButton?.setDisabled(!valid);
	}
}
