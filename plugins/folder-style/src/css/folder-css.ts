import { ACTIVE_OPACITY_STEP, HOVER_OPACITY_STEP } from '../constants';
import type { FolderStyle, FolderStyleSettings, IconLookup } from '../types';
import { colorChannels, cssAlpha } from './color';
import { cssString } from './escape';
import { symbolDeclarations } from './symbol';

export interface FolderCss {
	css: string;
	/** Folders whose Lucide icon Obsidian does not have (any more): their symbol is skipped. */
	missingIcons: string[];
}

/** Settings → the whole stylesheet. Pure: Obsidian's icons come in through `iconSvg`. */
export function folderCss(settings: FolderStyleSettings, iconSvg: IconLookup): FolderCss {
	const rules: string[] = [];
	const missingIcons: string[] = [];
	for (const [path, style] of Object.entries(settings.folders)) {
		if (isRoot(path)) continue;
		const folder = folderRules(path, style, settings, iconSvg);
		rules.push(...folder.rules);
		if (folder.missingIcon) missingIcons.push(path);
	}
	return { css: rules.join('\n'), missingIcons };
}

function isRoot(path: string): boolean {
	return path === '' || path === '/';
}

function folderRules(
	path: string,
	style: FolderStyle,
	settings: FolderStyleSettings,
	iconSvg: IconLookup,
): { rules: string[]; missingIcon: boolean } {
	// `.nav-files-container` keeps it to the file explorer and outweighs the core
	// `body:not(.is-grabbing) .tree-item-self.is-clickable:hover` (0,4,1).
	const title = `.nav-files-container .nav-folder-title[data-path=${cssString(path)}]`;
	const channels = style.color ? colorChannels(style.color) : null;
	const rules: string[] = [];

	if (channels) {
		const tint = (opacity: number) => `background-color: rgba(${channels}, ${cssAlpha(opacity)});`;
		// Dragging a folder, or over it as a drop target, keeps the core highlight.
		const row = `${title}:not(.is-being-dragged, .is-being-dragged-over)`;
		rules.push(`${row} { ${tint(settings.opacity)} }`);
		rules.push(`@media (hover: hover) { ${row}:hover { ${tint(settings.opacity + HOVER_OPACITY_STEP)} } }`);
		rules.push(`${row}.is-active, ${row}.is-selected { ${tint(settings.opacity + ACTIVE_OPACITY_STEP)} }`);
		if (settings.tintChildren) rules.push(`${title} + .nav-folder-children { ${tint(settings.opacity / 2)} }`);
	}

	const symbol = symbolDeclarations(style.symbol, channels, settings.symbolSize, iconSvg);
	if (symbol.kind === 'ok') {
		// Hidden while the name is being edited, like the core rule for the title content.
		const name = `${title} > .nav-folder-title-content:not([contenteditable="true"])`;
		rules.push(`${name}::before { ${symbol.declarations} }`);
	}
	return { rules, missingIcon: symbol.kind === 'missing-icon' };
}
