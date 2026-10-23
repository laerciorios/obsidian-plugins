import { Modal, Setting, setIcon } from 'obsidian';
import type { App, ButtonComponent, ColorComponent, EventRef, TextComponent } from 'obsidian';
import { CLS, HEX_PICKER_DEFAULT, HEX_PLACEHOLDER, PRESET_COLORS, PREVIEW_COLOR_VAR, SYMBOL_TEXT_MAX_LENGTH } from '../constants';
import { normalizeHex, presetChannels } from '../css/color';
import { isInside } from '../folders';
import { t } from '../i18n';
import type { VaultSvgs } from '../svg-files';
import type { FolderStyle, FolderStyleSettings, PresetColor } from '../types';
import { draftFromStyle, styleFromDraft } from './draft';
import type { Draft } from './draft';
import { IconPicker } from './icon-picker';
import { FolderPreview } from './preview';
import { SvgPicker } from './svg-picker';

export interface ModalHost {
	settings: FolderStyleSettings;
	/** Vault SVGs read so far; the picker reads the ones it shows. */
	svgs: VaultSvgs;
	/** Customize one folder; null removes its customization. */
	setFolderStyle(path: string, style: FolderStyle | null): void;
}

type ChipKey = 'none' | PresetColor;

/** "Customize folder…": symbol and color of one folder, with a live preview. */
export class FolderStyleModal extends Modal {
	private readonly draft: Draft;
	private preview: FolderPreview | null = null;
	private textSetting: Setting | null = null;
	private iconPicker: IconPicker | null = null;
	private svgPicker: SvgPicker | null = null;
	private readonly chips = new Map<ChipKey, HTMLButtonElement>();
	private hexError: HTMLElement | null = null;
	private saveButton: ButtonComponent | null = null;
	private readonly vaultEvents: EventRef[] = [];

	constructor(
		app: App,
		private readonly host: ModalHost,
		private readonly path: string,
	) {
		super(app);
		this.draft = draftFromStyle(host.settings.folders[path]);
	}

	onOpen(): void {
		const name = this.path.split('/').pop() ?? this.path;
		this.setTitle(t('modal.title', { name }));
		this.modalEl.addClass(CLS.modal);
		const { contentEl } = this;

		this.preview = new FolderPreview(contentEl, name, () => this.host.settings, this.host.svgs.lookup);
		this.renderSymbol(contentEl);
		this.renderColor(contentEl);
		this.renderButtons(contentEl);
		this.refresh();

		// Saving would write to a path that is gone: close instead (the style already moved or went).
		const closeIfAffected = (path: string) => {
			if (isInside(this.path, path)) this.close();
		};
		this.vaultEvents.push(
			this.app.vault.on('rename', (file, oldPath) => {
				closeIfAffected(oldPath);
				// The chosen SVG moved: follow it, as the saved styles do.
				if (oldPath === this.draft.svg) this.setSvg(file.path, this.draft.tint);
			}),
			this.app.vault.on('delete', (file) => closeIfAffected(file.path)),
		);
		// A saved SVG not read yet (or changed since): read it for the picker and the preview.
		if (this.draft.svg) void this.host.svgs.load([this.draft.svg]).then(() => this.setSvg(this.draft.svg, this.draft.tint));
	}

	onClose(): void {
		for (const ref of this.vaultEvents.splice(0)) this.app.vault.offref(ref);
		this.preview?.remove();
		this.contentEl.empty();
	}

	private renderSymbol(parent: HTMLElement): void {
		new Setting(parent)
			.setName(t('modal.symbol.name'))
			.setDesc(t('modal.symbol.desc'))
			.addDropdown((dropdown) =>
				dropdown
					.addOptions({ none: t('modal.symbol.none'), text: t('modal.symbol.text'), lucide: t('modal.symbol.lucide'), svg: t('modal.symbol.svg') })
					.setValue(this.draft.symbolKind)
					.onChange((value) => {
						this.draft.symbolKind = value === 'text' || value === 'lucide' || value === 'svg' ? value : 'none';
						this.refresh();
					}),
			);
		this.textSetting = new Setting(parent)
			.setName(t('modal.text.name'))
			.setDesc(t('modal.text.desc'))
			.addText((text) => {
				text.inputEl.maxLength = SYMBOL_TEXT_MAX_LENGTH;
				text.setValue(this.draft.text).onChange((value) => {
					this.draft.text = value;
					this.refresh();
				});
			});
		this.iconPicker = new IconPicker(parent, this.draft.icon, (icon) => {
			this.draft.icon = icon;
			this.refresh();
		});
		this.svgPicker = new SvgPicker(this.app, parent, this.host.svgs, this.draft.svg, this.draft.tint, (path, tint) => {
			this.draft.svg = path;
			this.draft.tint = tint;
			this.refresh();
		});
	}

	private setSvg(path: string, tint: boolean): void {
		this.draft.svg = path;
		this.draft.tint = tint;
		this.svgPicker?.setPath(path);
		this.refresh();
	}

	private renderColor(parent: HTMLElement): void {
		const setting = new Setting(parent).setName(t('modal.color.name')).setDesc(t('modal.color.desc')).setClass(CLS.colorSetting);
		const chips = setting.controlEl.createDiv({ cls: CLS.chips });
		setIcon(this.addChip(chips, 'none', t('modal.color.none')), 'ban');
		for (const preset of PRESET_COLORS) {
			const chip = this.addChip(chips, preset, t(`color.${preset}`));
			chip.createSpan({ cls: CLS.swatch }).setCssProps({ [PREVIEW_COLOR_VAR]: presetChannels(preset) });
		}

		let hexText: TextComponent | null = null;
		let picker: ColorComponent | null = null;
		const hexSetting = new Setting(parent)
			.setName(t('modal.hex.name'))
			.setDesc(t('modal.hex.desc', { example: HEX_PLACEHOLDER }))
			.addText((text) => {
				hexText = text;
				text.setPlaceholder(HEX_PLACEHOLDER).setValue(this.draft.hex);
				text.onChange((value) => {
					this.draft.hex = value;
					const hex = normalizeHex(value);
					if (hex) picker?.setValue(hex);
					// Clearing the field means no custom color, not an invalid one.
					this.setColor(value.trim() ? { kind: 'hex' } : { kind: 'none' });
				});
			})
			.addColorPicker((component) => {
				picker = component;
				component.setValue(normalizeHex(this.draft.hex) ?? HEX_PICKER_DEFAULT).onChange((value) => {
					this.draft.hex = value;
					hexText?.setValue(value);
					this.setColor({ kind: 'hex' });
				});
			});
		this.hexError = hexSetting.descEl.createDiv({ cls: CLS.warning });
	}

	private addChip(parent: HTMLElement, key: ChipKey, label: string): HTMLButtonElement {
		const chip = parent.createEl('button', { cls: ['clickable-icon', CLS.chip], attr: { 'aria-label': label } });
		chip.addEventListener('click', () => this.setColor(key === 'none' ? { kind: 'none' } : { kind: 'preset', value: key }));
		this.chips.set(key, chip);
		return chip;
	}

	private renderButtons(parent: HTMLElement): void {
		const buttons = new Setting(parent);
		if (this.host.settings.folders[this.path]) {
			buttons.addButton((button) => button.setButtonText(t('modal.remove')).setDestructive().onClick(() => this.save(null)));
		}
		buttons
			.addButton((button) => button.setButtonText(t('modal.cancel')).onClick(() => this.close()))
			.addButton((button) => {
				button.setButtonText(t('modal.save')).setCta().onClick(() => {
					const result = styleFromDraft(this.draft);
					if (result.ok) this.save(result.style);
				});
				this.saveButton = button;
			});
	}

	private setColor(color: Draft['color']): void {
		this.draft.color = color;
		this.refresh();
	}

	/** Show what matches the draft: fields of the chosen symbol kind, chosen color, preview, errors. */
	private refresh(): void {
		this.textSetting?.settingEl.toggle(this.draft.symbolKind === 'text');
		this.iconPicker?.el.toggle(this.draft.symbolKind === 'lucide');
		this.svgPicker?.el.toggle(this.draft.symbolKind === 'svg');
		const color = this.draft.color;
		const activeChip = color.kind === 'preset' ? color.value : color.kind;
		for (const [key, chip] of this.chips) {
			chip.toggleClass('is-active', key === activeChip);
			chip.setAttr('aria-pressed', String(key === activeChip));
		}

		const result = styleFromDraft(this.draft);
		this.hexError?.setText(result.ok ? '' : t('modal.hex.invalid', { example: HEX_PLACEHOLDER }));
		this.saveButton?.setDisabled(!result.ok);
		// While the hex is being typed, the preview keeps the symbol and leaves the color out.
		const previewResult = result.ok ? result : styleFromDraft({ ...this.draft, color: { kind: 'none' } });
		this.preview?.show(previewResult.ok ? previewResult.style : null);
	}

	/** Null removes the customization. */
	private save(style: FolderStyle | null): void {
		this.host.setFolderStyle(this.path, style);
		this.close();
	}
}
