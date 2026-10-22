import { setIcon } from 'obsidian';
import type { Setting, SettingDefinitionRender } from 'obsidian';
import { CLS, PREVIEW_ALPHA_VAR, PREVIEW_COLOR_VAR } from '../constants';
import { colorChannels } from '../css/color';
import { t } from '../i18n';
import type { FolderStyle } from '../types';

export interface FolderRowContext {
	style(path: string): FolderStyle | undefined;
	opacity(): number;
	hasMissingIcon(path: string): boolean;
	folderExists(path: string): boolean;
	editFolder(path: string): void;
}

/** One customized folder: its symbol and color as in the explorer, the full path, and warnings. */
export function folderRow(context: FolderRowContext, path: string): SettingDefinitionRender {
	return {
		name: path,
		get aliases() {
			const style = context.style(path);
			return style ? [summary(style)] : [];
		},
		render: (setting) => renderRow(setting, context, path),
	};
}

function summary(style: FolderStyle): string {
	const parts: string[] = [];
	const { symbol, color } = style;
	if (symbol) parts.push(symbol.kind === 'text' ? t('folder.symbol.text', { text: symbol.value }) : t('folder.symbol.icon', { name: symbol.value }));
	if (color) parts.push(t('folder.color', { name: color.kind === 'preset' ? t(`color.${color.value}`) : color.value }));
	return parts.join(' · ');
}

function renderRow(setting: Setting, context: FolderRowContext, path: string): void {
	const style = context.style(path);
	if (!style) return;
	const { symbol, color } = style;
	const missingIcon = symbol?.kind === 'lucide' && context.hasMissingIcon(path);

	setting.nameEl.empty();
	const preview = setting.nameEl.createSpan({ cls: CLS.preview });
	const channels = color ? colorChannels(color) : null;
	if (channels) {
		preview.addClass(CLS.previewColored);
		preview.setCssProps({ [PREVIEW_COLOR_VAR]: channels, [PREVIEW_ALPHA_VAR]: String(context.opacity()) });
	}
	if (symbol?.kind === 'text') preview.createSpan({ cls: CLS.previewSymbol, text: symbol.value });
	else if (symbol?.kind === 'lucide' && !missingIcon) setIcon(preview.createSpan({ cls: CLS.previewSymbol }), `lucide-${symbol.value}`);
	preview.createSpan({ text: path });

	setting.descEl.empty();
	setting.descEl.createDiv({ text: summary(style) });
	if (missingIcon) setting.descEl.createDiv({ cls: CLS.warning, text: t('folder.missingIcon', { name: symbol.value }) });
	if (!context.folderExists(path)) setting.descEl.createDiv({ cls: CLS.warning, text: t('folder.missingFolder') });

	setting.addExtraButton((button) => button.setIcon('pencil').setTooltip(t('settings.folder.edit')).onClick(() => context.editFolder(path)));
}
